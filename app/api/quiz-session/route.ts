// app/api/quiz-session/route.ts
import { NextResponse } from 'next/server';
import { 
  initializeQuizSession, 
  buildQuestionContext, 
  calculateDifficulty, 
  buildLLMPrompt,
  updatePerformanceAnalytics,
  processStudentAnswer
} from '@/lib/quizEngine';

function extractAndParseJson(text: string): any {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No valid JSON object found in the LLM response.");
    }
    const jsonString = text.substring(startIndex, endIndex + 1);
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error("Invalid JSON format in the LLM response.");
    }
}

async function callLLM(prompt: { systemPrompt: string, userPrompt: string }) {
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'system', content: prompt.systemPrompt }, { role: 'user', content: prompt.userPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Mistral API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Mistral API request failed: ${errorBody}`);
    }
    const llmResponse = await response.json();
    const content = llmResponse.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response structure from LLM: No content.");
    }
    return extractAndParseJson(content);
  } catch (error) {
    console.error('Error in callLLM:', error);
    // Fallback question logic
    return {
      isCorrect: false,
      feedback: "The AI is currently unavailable, providing a fallback question.",
      question: "What is the capital of France?",
      options: ["Berlin", "Madrid", "Paris", "Rome"],
      correctAnswer: "Paris",
      explanation: "Paris is the capital of France. This is a fallback question because the AI service failed.",
      cognitiveAnalysis: {}
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        action, studentId, assignedQuizId, sessionData, 
        questionNumber, previousAnswers, 
        currentQuestion, studentAnswer
    } = body;

    switch (action) {
      case 'initialize': {
        if (!studentId || !assignedQuizId) throw new Error("Missing studentId or assignedQuizId for initialization.");
        const initialSessionData = await initializeQuizSession(studentId, assignedQuizId);
        const context = buildQuestionContext(initialSessionData, 1, []);
        const difficulty = calculateDifficulty(context);
        const prompt = buildLLMPrompt(context, difficulty);
        const firstQuestion = await callLLM(prompt);
        return NextResponse.json({ question: firstQuestion, sessionData: initialSessionData });
      }
      case 'evaluate': {
        if (!currentQuestion || studentAnswer === undefined) throw new Error("Missing currentQuestion or studentAnswer for evaluation.");
        const evaluation = await processStudentAnswer(currentQuestion, studentAnswer, callLLM);
        return NextResponse.json({ evaluation });
      }
      case 'next': {
        if (!sessionData || !previousAnswers) throw new Error("Missing sessionData or previousAnswers for next question.");
        const context = buildQuestionContext(sessionData, questionNumber, previousAnswers);
        const difficulty = calculateDifficulty(context);
        const prompt = buildLLMPrompt(context, difficulty);
        const nextQuestion = await callLLM(prompt);
        return NextResponse.json({ question: nextQuestion });
      }
      case 'complete': {
        if (!studentId || !assignedQuizId || !sessionData || !previousAnswers) {
            throw new Error("Missing required data for quiz completion.");
        }
        const analytics = await updatePerformanceAnalytics(studentId, assignedQuizId, sessionData, previousAnswers);
        return NextResponse.json({ message: "Quiz completed and analytics saved successfully.", analytics });
      }
     default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API Error in POST route:", error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
