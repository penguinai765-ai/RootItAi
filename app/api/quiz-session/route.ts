// app/api/quiz-session/route.ts
import { NextResponse } from 'next/server';
import { 
  initializeQuizSession, 
  buildQuestionContext, 
  calculateDifficulty, 
  buildLLMPrompt,
  updatePerformanceAnalytics
} from '@/lib/quizEngine';

/**
 * A robust function to find and parse a JSON object from a string.
 * It handles cases where the LLM might add conversational text around the JSON.
 * @param text The raw text response from the LLM.
 * @returns A parsed JSON object.
 */
function extractAndParseJson(text: string): any {
    // Find the first '{' and the last '}' to isolate the JSON object.
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error("No valid JSON object found in the LLM response.");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    
    // Now, attempt to parse the extracted string.
    return JSON.parse(jsonString);
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
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("LLM API Error:", errorBody);
      throw new Error(`Mistral API request failed with status ${response.status}`);
    }

    const llmResponse = await response.json();
    const content = llmResponse.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response structure from LLM.");
    }

    // Use the new robust parsing function instead of the simple JSON.parse()
    return extractAndParseJson(content);

  } catch (error) {
    console.error('Error in callLLM:', error);
    // Fallback to a simple question if the LLM fails for any reason
    return {
      question: "The AI is thinking... What is the capital of Canada?",
      questionType: "multiple_choice",
      options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
      correctAnswer: "Ottawa",
      explanation: "Ottawa is the capital of Canada.",
      hints: ["It's in the province of Ontario."],
      difficulty: "medium",
      conceptsFocused: ["Geography"]
    };
  }
}

// The POST handler remains exactly the same, as all logic is now encapsulated
// within the robust callLLM function.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, studentId, assignedQuizId, sessionData, questionNumber, previousAnswers } = body;

    switch (action) {
      case 'initialize': {
        const initialSessionData = await initializeQuizSession(studentId, assignedQuizId);
        const context = buildQuestionContext(initialSessionData, 1, []);
        const difficulty = calculateDifficulty(context);
        const prompt = buildLLMPrompt(context, difficulty);
        const firstQuestion = await callLLM(prompt);
        return NextResponse.json({ question: firstQuestion, sessionData: initialSessionData });
      }

      case 'next': {
        const context = buildQuestionContext(sessionData, questionNumber, previousAnswers);
        const difficulty = calculateDifficulty(context);
        const prompt = buildLLMPrompt(context, difficulty);
        const nextQuestion = await callLLM(prompt);
        return NextResponse.json({ question: nextQuestion });
      }

      case 'complete': {
        await updatePerformanceAnalytics(studentId, assignedQuizId, sessionData, previousAnswers);
        return NextResponse.json({ message: "PROCESSING_COMPLETE" });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API Error in POST route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
