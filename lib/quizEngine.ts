// lib/quizEngine.ts

import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { getStudentChapterQuizAttempts } from './firestoreService';

// --- Type Definitions ---

interface Answer {
    question: string;
    studentAnswer: any;
    correctAnswer: any;
    isCorrect: boolean;
    cognitiveAnalysis: {
        [key: string]: number;
    };
    timestamp: number;
}

interface StudentProfile {
    class: string;
    // other student profile fields
}

interface Assignment {
    subjectCode: string;
    chapterId: string;
    subtopicId: string;
    // other assignment fields
}

interface SessionData {
    studentProfile: StudentProfile;
    assignment: Assignment;
    subtopicContent: string;
    // other session data fields
}

// --- Fully Restored Quiz Engine Functions ---

/**
 * Initializes a quiz session by fetching student and assigned quiz data.
 * This is the first step when a student starts a quiz.
 */
export async function initializeQuizSession(studentId: string, assignedQuizId: string): Promise<SessionData> {
    const studentDocRef = doc(db, "students", studentId);
    const studentDoc = await getDoc(studentDocRef);

    if (!studentDoc.exists()) {
        throw new Error("Student not found.");
    }
    const studentData = studentDoc.data() as StudentProfile;
    if (!studentData.class) {
        throw new Error("Student class information is missing.");
    }

    const assignedQuizDocRef = doc(db, `assignedQuizzes/${studentData.class}/quizzes`, assignedQuizId);
    const assignedQuizDoc = await getDoc(assignedQuizDocRef);

    if (!assignedQuizDoc.exists()) {
        throw new Error("Assigned Quiz not found in the specified class.");
    }
    const assignmentData = assignedQuizDoc.data() as Assignment;

    // 2. NEW: Fetch the Subtopic Content from Firestore
    const { subjectCode, chapterId, subtopicId } = assignmentData;
    if (!subjectCode || !chapterId || !subtopicId) {
        throw new Error("Quiz assignment is missing necessary topic information.");
    }
    const subtopicDocRef = doc(db, `textbook/${subjectCode}/chapters/${chapterId}/subtopics`, subtopicId);
    const subtopicDoc = await getDoc(subtopicDocRef);

    if (!subtopicDoc.exists() || !subtopicDoc.data()?.content) {
        throw new Error(`Content for subtopic ${subtopicId} could not be found.`);
    }
    const subtopicContent = subtopicDoc.data()?.content;

    return {
        studentProfile: studentData,
        assignment: assignmentData,
        subtopicContent: subtopicContent,
    };
}

// Helper to summarize skill performance from answers
function summarizeSkillPerformance(answers: any[]): Record<string, { count: number, correct: number }> {
    const skills = { recall: { count: 0, correct: 0 }, conceptual: { count: 0, correct: 0 }, reasoning: { count: 0, correct: 0 } };
    for (const a of answers) {
        if (!a.cognitiveAnalysis) continue;
        // Heuristic: use the highest cognitiveAnalysis key as the skill
        const entries = Object.entries(a.cognitiveAnalysis as Record<string, number>);
        if (entries.length === 0) continue;
        const maxSkill = entries.sort((x, y) => (Number(y[1]) - Number(x[1])))[0]?.[0];
        if (maxSkill === 'memory_retrieval') {
            skills.recall.count += 1;
            if (a.isCorrect) skills.recall.correct += 1;
        } else if (maxSkill === 'problem_solving') {
            skills.reasoning.count += 1;
            if (a.isCorrect) skills.reasoning.correct += 1;
        } else if (maxSkill === 'conceptual') {
            skills.conceptual.count += 1;
            if (a.isCorrect) skills.conceptual.correct += 1;
        }
    }
    return skills;
}

/**
 * Builds the context for the next question, including performance on previous questions.
 * This helps the LLM adapt the quiz.
 */
export function buildQuestionContext(sessionData: SessionData, questionNumber: number, previousAnswers: Answer[]): object {
    const skillsCovered = summarizeSkillPerformance(previousAnswers);
    return {
        subject: sessionData.assignment.subjectCode,
        chapter: sessionData.assignment.chapterId,
        subtopic: sessionData.assignment.subtopicId,
        questionNumber: questionNumber,
        subtopicContent: sessionData.subtopicContent,
        previousAnswersSummary: previousAnswers.map(a => ({
            isCorrect: a.isCorrect,
            cognitiveAnalysis: a.cognitiveAnalysis
        })),
        previousAnswers, // Pass the full previousAnswers array for LLM prompt
        skillsCovered
    };
}

/**
 * Calculates the difficulty for the next question based on student's performance.
 * Difficulty increases with correct answers.
 */
export function calculateDifficulty(context: any): number {
    if (!context.previousAnswersSummary || context.previousAnswersSummary.length === 0) {
        return 0.3; // Starting difficulty
    }
    const correctCount = context.previousAnswersSummary.filter((a: any) => a.isCorrect).length;
    const newDifficulty = 0.3 + (correctCount * 0.1);
    return Math.min(newDifficulty, 0.9); // Cap difficulty at 0.9
}

/**
 * Constructs the prompt to be sent to the LLM for generating a new question.
 * Now includes previous quiz performance for the same chapter.
 */
export async function buildLLMPrompt(
    context: any,
    difficulty: number,
    studentId: string
): Promise<{ systemPrompt: string, userPrompt: string }> {
    // Fetch previous attempts for this chapter
    const previousAttempts = await getStudentChapterQuizAttempts(
        studentId,
        context.subject,
        context.chapter
    );
    // Summarize previous performance per skill
    const prevSkillSummary = summarizeSkillPerformance(previousAttempts);
    // Current session skill coverage
    const currSkillSummary = context.skillsCovered || {};
    // Compose a structured summary
    const skillSummary = {
        previous: prevSkillSummary,
        current: currSkillSummary
    };
    // Debug log: print previousAnswers array
    console.log('[LLM DEBUG] context.previousAnswers:', context.previousAnswers);
    // Gather all previous question texts (use actual previousAnswers if available)
    const previousAnswersArr = context.previousAnswers || [];
    const previousQuestionTexts = previousAnswersArr.length > 0
        ? previousAnswersArr.map((a: any, idx: number) => `Q${idx + 1}: ${a.question || ''}`).join('\n')
        : (context.previousAnswersSummary || []).map((a: any, idx: number) => `Q${idx + 1}: ${a.question || ''}`).join('\n');
    const systemPrompt = `
You are an expert AI tutor creating a personalized, adaptive quiz for a high-school student.
- Use the student's previous performance on this chapter (see skill summary) to adapt the quiz.
- Cycle through these cognitive skills: factual recall, conceptual understanding, and reasoning/logic. Use the skill summary to decide which skill to target next.
- You MUST ensure that in a 15-question quiz, at least one question targets each cognitive skill (recall, conceptual, reasoning/problem-solving). The rest should be balanced.
- If a skill is weak (low correct rate), ask more questions of that type. If strong, move to the next skill.
- Do NOT repeat the same or very similar questions in this session.
- Here are the questions already asked in this session:\n${previousQuestionTexts}
- You must generate at most 15 questions per quiz session. If 15 questions have been asked, the quiz must end, even if not all skills are fully mastered.
- Ensure all cognitive skills are covered and analyzed within these 15 questions. Prioritize skills that have not yet been sufficiently covered.
- End the quiz early if the student has demonstrated sufficient ability in all skills (e.g., at least 2 correct answers per skill, or clear mastery/struggle).
- Generate ONLY ONE question at a time. Do NOT generate a list or array of questions. Do NOT generate a quiz. Only a single question object per response.
- Each time you are called, generate the next best question based on the latest answer and performance so far.
- The JSON output for each question must include:
  - 'type': 'mcq' or 'short_answer'
  - 'question': the question text
  - For MCQ: 'options' (array of 4 strings), 'correctAnswer' (the exact string of the correct option)
  - For short answer: 'answerPattern' (regex or keywords for correct answer)
  - 'difficulty' (easy/medium/hard)
  - 'explanation' (a brief justification)
  - 'cognitiveAnalysis' (object with keys like 'memory_retrieval', 'problem_solving', 'conceptual')
  - 'requestConfidenceRating' boolean (true if the student should rate their confidence after this question)
- Cognitive scores should be between 0.1 and 1.0.
- Output ONLY the JSON for the single question, nothing else.
- You may use content, examples, or analogies beyond the textbook if they are relevant to the subtopic and appropriate for the student's level. The main context is the textbook, but you are encouraged to introduce real-world or applied reasoning when it helps assess deeper understanding.
- For the 'requestConfidenceRating' flag: set it to true for about 5 or 6 questions out of 15, chosen randomly. Do not set it to true for every question.
- Here is a running tally of skill coverage so far (current session): ${JSON.stringify(currSkillSummary)}
    `;
    const userPrompt = `
        Context:
        - Subject: ${context.subject}
        - Chapter: ${context.chapter}
        - Subtopic: ${context.subtopic}
        - Desired Difficulty (0.0 to 1.0): ${difficulty.toFixed(1)}
- Skill summary (previous, current): ${JSON.stringify(skillSummary)}
        
        Learning Material to Base the Question On:
        ---
        ${context.subtopicContent}
        ---
    `;
    // Detailed debug log
    console.log('[LLM PROMPT DEBUG] systemPrompt:', systemPrompt);
    console.log('[LLM PROMPT DEBUG] userPrompt:', userPrompt);
    return { systemPrompt, userPrompt };
}

/**
 * Calls the LLM to evaluate the completed quiz and return a detailed analysis object.
 * Passes all answers, timestamps, and previous attempts for cognitive analytics and scoring.
 */
export async function getLLMQuizAnalysis(
    studentId: string,
    context: any,
    answers: any[],
    startTime: number,
    endTime: number
): Promise<any> {
    const previousAttempts = await getStudentChapterQuizAttempts(
        studentId,
        context.subject,
        context.chapter
    );
    const prompt = {
        systemPrompt: `You are an expert educational analyst AI. Given a student's quiz answers, timestamps, and previous attempts on this chapter, return a JSON object with the following keys:
{
  conceptualUnderstanding: "Strong" | "Moderate" | "Weak",
  reasoningSkill: "Logical" | "Superficial" | "Guesswork",
  confidenceScore: "High" | "Medium" | "Low",
  errorPatterns: string[],
  retentionQuality?: "Stable" | "Needs Revision",
  learningTrend?: "Improving" | "Declining" | "Consistent",
  timeEfficiency: "Fast & Accurate" | "Slow & Accurate" | "Fast & Inaccurate",
  performanceScore: number, // out of 100
  verbalInsights: string // 2–4 sentence narrative summary of student performance
}
The performanceScore should be computed using: number of correct/wrong answers, number of questions attempted, time per question, difficulty of each question, and performance across difficulty levels. Use previous attempts to inform retentionQuality and learningTrend if available.`,
        userPrompt: `Quiz answers: ${JSON.stringify(answers)}\nStart time: ${startTime}\nEnd time: ${endTime}\nPrevious attempts: ${JSON.stringify(previousAttempts)}`
    };
    // Use the same callLLM logic as in route.ts
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
            max_tokens: 3000,
        })
    });
    // Removed logFetchResponse call (not defined in this file)
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Mistral API request failed: ${errorBody}`);
    }
    const llmResponse = await response.json();
    const content = llmResponse.choices[0]?.message?.content;
    if (!content) throw new Error('No content in LLM response');
    // Use the same extractAndParseJson logic as in route.ts
    let llmEval = null;
    try {
        // Try to parse the whole response as JSON first
        llmEval = JSON.parse(content);
    } catch {
        // If that fails, try to extract JSON from within the string
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                llmEval = JSON.parse(match[0]);
            } catch {
                llmEval = null;
            }
        }
    }
    if (!llmEval) {
        throw new Error('No valid JSON object found in the LLM response after all attempts.');
    }
    return llmEval;
}

// --- Helper: Robust JSON Extraction ---
function extractAndParseJson(content: string): any {
    let cleaned = content.trim();
    // Remove code block markers and leading/trailing text
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    // 1. Try to parse the whole cleaned string as JSON
    try {
        return JSON.parse(cleaned);
    } catch { }
    // 2. Use regex to extract the first {...} block and parse it
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch { }
    }
    // 3. If all fails, return null
    return null;
}

/**
 * Processes a student's answer, determines correctness, and provides feedback.
 * In a real scenario, this could involve an LLM call for more nuanced feedback.
 */
export async function processStudentAnswer(currentQuestion: any, studentAnswer: any, callLLM: Function): Promise<object> {
    let isCorrect = false;
    let feedback = '';
    let correctAnswer = currentQuestion.correctAnswer;
    let explanation = currentQuestion.explanation;
    if (currentQuestion.type === 'mcq') {
        isCorrect = currentQuestion.correctAnswer === studentAnswer;
        feedback = isCorrect ? "Correct! Well done." : `Not quite. The correct answer is ${currentQuestion.correctAnswer}.`;
    } else if (currentQuestion.type === 'short_answer') {
        // Use LLM to evaluate the answer, with strict JSON format
        const systemPrompt = `You are an expert tutor. Evaluate the student's answer to the following question. Return ONLY a valid JSON object with keys: isCorrect (boolean), correctAnswer (string, natural language), feedback (string, natural language), explanation (string, natural language). Do NOT return any extra text, markdown, or code block. If the answer is partially correct, mark isCorrect as true but mention in feedback.`;
        const userPrompt = `Question: ${currentQuestion.question}\nStudent Answer: ${studentAnswer}\nExpected Answer: ${currentQuestion.answerPattern || (currentQuestion.expectedKeywords ? currentQuestion.expectedKeywords.join(', ') : '')}`;
        let llmEval: any = null;
        try {
            // --- BEGIN DEBUG FETCH ---
            const fetchRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
                    max_tokens: 1000,
                })
            });
            // Removed logFetchResponse call (not defined in this file)
            if (!fetchRes.ok) {
                const errorBody = await fetchRes.text();
                console.error('[LLM FETCH ERROR - Short Answer Evaluation]', {
                    status: fetchRes.status,
                    statusText: fetchRes.statusText,
                    errorBody,
                    systemPrompt,
                    userPrompt
                });
                throw new Error(`LLM fetch failed: ${fetchRes.status} ${fetchRes.statusText}`);
            }
            const llmResponse = await fetchRes.json();
            const content = llmResponse.choices?.[0]?.message?.content;
            if (!content) {
                console.error('[LLM FETCH ERROR - No content in response]', { llmResponse, systemPrompt, userPrompt });
                throw new Error('No content in LLM response');
            }
            llmEval = extractAndParseJson(content);
            if (llmEval) {
                console.log('[LLM PARSE] Robust JSON extraction succeeded:', llmEval);
            } else {
                console.log('[LLM PARSE] Robust JSON extraction failed.');
            }
            // --- END DEBUG FETCH ---
        } catch (err) {
            console.error('[LLM ERROR - Short Answer Evaluation]', {
                error: err,
                systemPrompt,
                userPrompt
            });
            llmEval = null;
        }
        if (llmEval && typeof llmEval.isCorrect === 'boolean') {
            isCorrect = llmEval.isCorrect;
            // Always include congratulatory message and explanation in feedback if correct
            if (isCorrect) {
                feedback = `Correct! Well done. ${llmEval.explanation || llmEval.feedback || ''}`.trim();
            } else {
                feedback = llmEval.feedback || `Not quite. ${currentQuestion.explanation}`;
            }
            correctAnswer = llmEval.correctAnswer || "See explanation below.";
            explanation = llmEval.explanation || llmEval.feedback || feedback;
        } else {
            // Fallback to regex/keyword logic
            if (currentQuestion.answerPattern) {
                try {
                    const regex = new RegExp(currentQuestion.answerPattern, 'i');
                    isCorrect = regex.test(studentAnswer);
                } catch {
                    isCorrect = (currentQuestion.expectedKeywords || []).some((kw: string) => studentAnswer.toLowerCase().includes(kw.toLowerCase()));
                }
            } else if (currentQuestion.expectedKeywords) {
                isCorrect = (currentQuestion.expectedKeywords || []).some((kw: string) => studentAnswer.toLowerCase().includes(kw.toLowerCase()));
            }
            // Always include congratulatory message and explanation in feedback if correct
            if (isCorrect) {
                feedback = `Correct! Well done. ${currentQuestion.explanation || ''}`.trim();
            } else {
                feedback = `Not quite. ${currentQuestion.explanation}`;
            }
            correctAnswer = "(LLM unavailable, fallback to keyword match)";
            explanation = feedback;
        }
    }
    return {
        isCorrect,
        feedback,
        explanation,
        cognitiveAnalysis: currentQuestion.cognitiveAnalysis,
        correctAnswer,
    };
}

/**
 * Calculates final analytics and saves all quiz data to Firestore in a single batch.
 * This is called when the student clicks "Finish Quiz".
 */
export async function updatePerformanceAnalytics(studentId: string, assignedQuizId: string, sessionData: SessionData, answers: Answer[]) {
    if (answers.length === 0) {
        console.log("No answers provided; skipping analytics update.");
        return {};
    }

    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const averageScore = (correctAnswers / totalQuestions) * 100;

    const cognitiveTotals: { [key: string]: { total: number, count: number } } = {};
    answers.forEach(answer => {
        if (answer.cognitiveAnalysis) {
            for (const key in answer.cognitiveAnalysis) {
                if (!cognitiveTotals[key]) {
                    cognitiveTotals[key] = { total: 0, count: 0 };
                }
                cognitiveTotals[key].total += answer.cognitiveAnalysis[key];
                cognitiveTotals[key].count++;
            }
        }
    });

    const averageCognitiveScores: { [key: string]: number } = {};
    for (const key in cognitiveTotals) {
        averageCognitiveScores[key] = cognitiveTotals[key].total / cognitiveTotals[key].count;
    }

    const analytics = {
        score: averageScore,
        cognitiveAverages: averageCognitiveScores,
        lastAttempted: new Date(),
        totalQuestions: totalQuestions,
        correctQuestions: correctAnswers,
        answers: answers,
        subtopicId: sessionData.assignment.subtopicId, // Ensure subtopicId is always present
        studentAttended: true, // Mark student as attended
        verbalSummary: `Student completed ${totalQuestions} questions with ${correctAnswers} correct answers, achieving ${averageScore.toFixed(1)}% accuracy. Cognitive analysis shows strengths in ${Object.keys(averageCognitiveScores).slice(0, 2).join(', ')}.`
    };

    const submissionRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
    const quizActivationRef = doc(db, `quizActivations`, assignedQuizId); // Parent document
    const assignedQuizRef = doc(db, `assignedQuizzes/${sessionData.studentProfile.class}/quizzes`, assignedQuizId);
    const studentSubmissionSummaryRef = doc(db, `students/${studentId}/submissions`, assignedQuizId);
    const batch = writeBatch(db);

    // Ensure the quiz activation parent document exists with at least one field
    batch.set(quizActivationRef, {
        initialized: true,
        createdAt: new Date(),
        assignedQuizId: assignedQuizId
    }, { merge: true }); // Use merge to avoid overwriting if it already exists

    // Save submission data to quizActivations
    batch.set(submissionRef, {
        studentId: studentId,
        assignedQuizId: assignedQuizId,
        sessionData: sessionData,
        answers: answers,
        analytics: analytics,
        startTime: new Date(),
        endTime: new Date(),
        studentAttended: true, // Mark student as attended
        verbalSummary: analytics.verbalSummary
    });

    // Save submission summary to students collection (required for analytics)
    batch.set(studentSubmissionSummaryRef, {
        score: averageScore,
        lastAttempted: new Date(),
        subjectCode: sessionData.assignment.subjectCode,
        chapterId: sessionData.assignment.chapterId,
        subtopicId: sessionData.assignment.subtopicId,
        id: assignedQuizId
    });

    // Mark student as completed in the assigned quiz
    batch.update(assignedQuizRef, {
        [`completedBy.${studentId}`]: true
    });

    await batch.commit();
    return analytics;
}