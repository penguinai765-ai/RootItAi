// app/api/quiz-session/route.ts
import { NextResponse } from 'next/server';
import {
  initializeQuizSession,
  buildQuestionContext,
  calculateDifficulty,
  buildLLMPrompt,
  updatePerformanceAnalytics,
  processStudentAnswer,
  getLLMQuizAnalysis
} from '@/lib/quizEngine';

function extractAndParseJson(text: string): any {
  // Remove all code block markers and language markers
  let cleaned = text.replace(/```json|```/gi, '').trim();

  // Try to parse the whole cleaned string as JSON
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions[0];
    }
    if (parsed.type && parsed.question) {
      return parsed;
    }
  } catch { }

  // Fallback: try to extract the first {...} block
  const jsonRegex = /\{[\s\S]*\}/g;
  const matches = cleaned.match(jsonRegex);
  if (matches && matches.length > 0) {
    for (let jsonString of matches) {
      jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
      try {
        const obj = JSON.parse(jsonString);
        if (obj.type && obj.question) return obj;
      } catch { }
    }
  }

  // If nothing worked, log and return fallback
  console.error("No valid JSON object found in the LLM response after all attempts.", text);
  return { error: "Failed to parse LLM JSON response", raw: text };
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
    let parsed = extractAndParseJson(content);
    // If parsed is an array, return the first object
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    // If parsed is an error object, return fallback
    if (parsed && parsed.error) {
      return {
        isCorrect: false,
        feedback: "The AI is currently unavailable, providing a fallback question.",
        question: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correctAnswer: "Paris",
        explanation: "Paris is the capital of France. This is a fallback question because the AI service failed.",
        cognitiveAnalysis: {},
        type: 'mcq'
      };
    }
    // Ensure 'type' field is present
    if (!parsed.type) {
      if (parsed.options) parsed.type = 'mcq';
      else parsed.type = 'short_answer';
    }
    return parsed;
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
      cognitiveAnalysis: {},
      type: 'mcq'
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
        const prompt = await buildLLMPrompt(context, difficulty, studentId);
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
        const prompt = await buildLLMPrompt(context, difficulty, studentId);
        const nextQuestion = await callLLM(prompt);
        return NextResponse.json({ question: nextQuestion });
      }
      case 'complete': {
        if (!studentId || !assignedQuizId || !sessionData || !previousAnswers) {
          throw new Error("Missing required data for quiz completion.");
        }
        // Save analytics as before
        const analytics = await updatePerformanceAnalytics(studentId, assignedQuizId, sessionData, previousAnswers);
        // Call LLM for cognitive analysis and performance scoring
        const quizStartTime = previousAnswers[0]?.timestamp || Date.now();
        const quizEndTime = previousAnswers[previousAnswers.length - 1]?.timestamp || Date.now();
        const context = buildQuestionContext(sessionData, previousAnswers.length, previousAnswers);
        const analysis = await getLLMQuizAnalysis(studentId, context, previousAnswers, quizStartTime, quizEndTime);
        // Save the analysis object to Firestore (merge with analytics)
        const { doc, writeBatch } = await import('firebase/firestore');
        const batch = writeBatch((await import('@/lib/firebase')).db);
        const submissionRef = doc((await import('@/lib/firebase')).db, `quizActivations/${assignedQuizId}/submissions`, studentId);
        batch.set(submissionRef, { analysis }, { merge: true });
        await batch.commit();
        return NextResponse.json({ message: "Quiz completed and analytics saved successfully.", analytics, analysis });
      }
      default:
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API Error in POST route:", error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
