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
    const systemPrompt = `
You are an expert AI tutor creating a personalized, adaptive quiz for a high-school student.
- Use the student's previous performance on this chapter (see skill summary) to adapt the quiz.
- Cycle through these cognitive skills: factual recall, conceptual understanding, and reasoning/logic. Use the skill summary to decide which skill to target next.
- If a skill is weak (low correct rate), ask more questions of that type. If strong, move to the next skill.
- Do NOT repeat the same or very similar questions in this session.
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
            max_tokens: 1000,
        })
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Mistral API request failed: ${errorBody}`);
    }
    const llmResponse = await response.json();
    const content = llmResponse.choices[0]?.message?.content;
    if (!content) throw new Error('No content in LLM response');
    // Use the same extractAndParseJson logic as in route.ts
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error('No valid JSON object found in the LLM response.');
    }
    const jsonString = content.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonString);
}

/**
 * Processes a student's answer, determines correctness, and provides feedback.
 * In a real scenario, this could involve an LLM call for more nuanced feedback.
 */
export async function processStudentAnswer(currentQuestion: any, studentAnswer: any, callLLM: Function): Promise<object> {
    let isCorrect = false;
    let feedback = '';
    if (currentQuestion.type === 'mcq') {
        isCorrect = currentQuestion.correctAnswer === studentAnswer;
        feedback = isCorrect ? "Correct! Well done." : `Not quite. The correct answer is ${currentQuestion.correctAnswer}.`;
    } else if (currentQuestion.type === 'short_answer') {
        // Use a simple regex or keyword match for now
        if (currentQuestion.answerPattern) {
            try {
                const regex = new RegExp(currentQuestion.answerPattern, 'i');
                isCorrect = regex.test(studentAnswer);
            } catch {
                // fallback to keyword match
                isCorrect = (currentQuestion.expectedKeywords || []).some((kw: string) => studentAnswer.toLowerCase().includes(kw.toLowerCase()));
            }
        } else if (currentQuestion.expectedKeywords) {
            isCorrect = (currentQuestion.expectedKeywords || []).some((kw: string) => studentAnswer.toLowerCase().includes(kw.toLowerCase()));
        }
        feedback = isCorrect ? "Correct! Well done." : `Not quite. ${currentQuestion.explanation}`;
    }
    return {
        isCorrect,
        feedback,
        explanation: currentQuestion.explanation,
        cognitiveAnalysis: currentQuestion.cognitiveAnalysis,
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