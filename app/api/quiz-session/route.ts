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
import { getQuizDoc } from '@/lib/quizEngineAdmin';
import { getStudentProfile } from '@/lib/firestoreServiceAdmin';
import { adminDb } from '@/lib/firebaseAdmin';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function extractAndParseJson(text: string | undefined): any {
  if (!text) {
    return { error: "No LLM response received", raw: text };
  }
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

async function logFetchResponse(response: Response, label: string) {
  try {
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();
    console.log(`[DEBUG] ${label} status:`, response.status, 'body:', text);
  } catch (e) {
    console.log(`[DEBUG] ${label} status:`, response.status, 'body: [unreadable]');
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
    await logFetchResponse(response, 'LLM General');
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Mistral API Error: ${response.status} ${response.statusText}`, errorBody);
      return { llmUnavailable: true, error: `LLM API error: ${response.status} ${response.statusText}` };
    }
    const llmResponse = await response.json();
    const content = llmResponse.choices?.[0]?.message?.content;
    if (!content) {
      return { llmUnavailable: true, error: "No content in LLM response" };
    }
    let parsed = extractAndParseJson(content);
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
    }
    if (parsed && parsed.error) {
      return { llmUnavailable: true, error: parsed.error };
    }
    if (!parsed.type) {
      if (parsed.options) parsed.type = 'mcq';
      else parsed.type = 'short_answer';
    }
    return parsed;
  } catch (error) {
    console.error('Error in callLLM:', error);
    let message = 'Unknown LLM error';
    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      message = (error as any).message;
    }
    return { llmUnavailable: true, error: message };
  }
}

async function callLLMForHint(question: string, studentAnswer: string, context: string) {
  const systemPrompt = `You are a helpful AI tutor. The student answered the following question incorrectly. Provide a single, concise hint to help them understand or solve the question. Do not give away the answer. The hint should be actionable and relevant to the question and the student's mistake.`;
  const userPrompt = `Question: ${question}\nStudent's incorrect answer: ${studentAnswer}\nLearning Material: ${context}`;
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  await logFetchResponse(response.clone(), 'LLM Hint');
  if (!response.ok) {
    return { hint: 'No hint available.' };
  }
  const llmResponse = await response.json();
  const content = llmResponse.choices[0]?.message?.content?.trim();
  return { hint: content || 'No hint available.' };
}

export async function POST(request: Request) {
  try {
    // Validate API key exists
    if (!process.env.MISTRAL_API_KEY) {
      console.error("MISTRAL_API_KEY is not configured");
      return NextResponse.json({ error: "LLM service not configured" }, { status: 503 });
    }
    console.log("[DEBUG] quiz-session function started");
    console.log("[DEBUG] MISTRAL_API_KEY:", process.env.MISTRAL_API_KEY);
    // Parse the body as JSON (read only ONCE)
    let body;
    try {
      body = await request.json();
      console.log("[DEBUG] /api/quiz-session parsed request body:", body);
    } catch (e) {
      console.error("[DEBUG] Error parsing request body as JSON:", e);
      return NextResponse.json({ error: "Malformed JSON in request body" }, { status: 400 });
    }
    const {
      action, studentId, assignedQuizId, sessionData,
      questionNumber, previousAnswers,
      currentQuestion, studentAnswer,
      question, context
    } = body;

    console.log("[quiz-session] Action:", action);
    let result;

    // Helper to log fetch responses
    switch (action) {
      case 'initialize': {
        if (!studentId || !assignedQuizId) throw new Error("Missing studentId or assignedQuizId for initialization.");
        const initialSessionData = await initializeQuizSession(studentId, assignedQuizId);
        const context = buildQuestionContext(initialSessionData, 1, []);
        const difficulty = calculateDifficulty(context);
        const prompt = await buildLLMPrompt(context, difficulty, studentId);
        let llmResponse;
        try {
          llmResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
          await logFetchResponse(llmResponse, 'Mistral initialize');
          if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            throw new Error(`Mistral API Error: ${llmResponse.status} - ${errorText}`);
          }
          const llmJson = await llmResponse.json();
          const content = llmJson.choices?.[0]?.message?.content;
          const firstQuestion = extractAndParseJson(content);
          if (firstQuestion.llmUnavailable || firstQuestion.error) {
            return NextResponse.json({ error: firstQuestion.error || 'LLM unavailable' }, { status: 502 });
          }
          result = { question: firstQuestion, sessionData: initialSessionData };
        } catch (e) {
          console.error('[DEBUG] Error during Mistral API call:', e);
          return NextResponse.json({ error: 'Failed to generate quiz question' }, { status: 502 });
        }
        break;
      }
      case 'evaluate': {
        if (!currentQuestion || studentAnswer === undefined) throw new Error("Missing currentQuestion or studentAnswer for evaluation.");
        const evaluation = await processStudentAnswer(currentQuestion, studentAnswer, callLLM);
        console.log("[quiz-session] evaluate: evaluation:", evaluation);
        result = { evaluation };
        break;
      }
      case 'next': {
        if (!sessionData || !previousAnswers) throw new Error("Missing sessionData or previousAnswers for next question.");
        const context = buildQuestionContext(sessionData, questionNumber, previousAnswers);
        const difficulty = calculateDifficulty(context);
        const prompt = await buildLLMPrompt(context, difficulty, studentId);
        const nextQuestion = await callLLM(prompt);
        console.log("[quiz-session] next: nextQuestion:", nextQuestion);
        if (nextQuestion.llmUnavailable || nextQuestion.error) {
          return NextResponse.json({ error: nextQuestion.error || 'LLM unavailable' }, { status: 502 });
        }
        result = { question: nextQuestion };
        break;
      }
      case 'complete': {
        if (!studentId || !assignedQuizId || !sessionData || !previousAnswers) {
          throw new Error("Missing required data for quiz completion.");
        }
        const quizStartTime = previousAnswers[0]?.timestamp || Date.now();
        const quizEndTime = previousAnswers[previousAnswers.length - 1]?.timestamp || Date.now();
        const context = buildQuestionContext(sessionData, previousAnswers.length, previousAnswers);
        const analysis = await getLLMQuizAnalysis(studentId, context, previousAnswers, quizStartTime, quizEndTime);
        console.log("[quiz-session] complete: analysis:", analysis);

        // Get analytics and include analysis in the same batch operation
        const analytics = await updatePerformanceAnalytics(studentId, assignedQuizId, sessionData, previousAnswers);

        // Update the submission document to include the analysis
        const submissionRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
        await setDoc(submissionRef, { analysis }, { merge: true });

        result = { message: "Quiz completed and analytics saved successfully.", analytics, analysis };
        break;
      }
      case 'hint': {
        if (!question || !studentAnswer || !context) throw new Error('Missing data for hint generation.');
        const hintResult = await callLLMForHint(question, studentAnswer, context);
        console.log("[quiz-session] hint: hintResult:", hintResult);
        result = hintResult;
        break;
      }
      default:
        console.error("[quiz-session] Invalid action specified:", action);
        return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
    }

    // Ensure result is always a plain object
    if (typeof result !== 'object' || result === null) {
      console.error("[quiz-session] Invalid result:", result);
      throw new Error('API returned an invalid response.');
    }

    console.log("[quiz-session] Returning result:", result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("API Error in POST route:", error.message, error.stack);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
