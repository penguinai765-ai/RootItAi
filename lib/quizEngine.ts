// lib/quizEngine.ts

import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

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
export async function initializeQuizSession(studentId: string, assignedQuizId:string): Promise<SessionData> {
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

/**
 * Builds the context for the next question, including performance on previous questions.
 * This helps the LLM adapt the quiz.
 */
export function buildQuestionContext(sessionData: SessionData, questionNumber: number, previousAnswers: Answer[]): object {
    return {
        subject: sessionData.assignment.subjectCode,
        chapter: sessionData.assignment.chapterId,
        subtopic: sessionData.assignment.subtopicId,
        questionNumber: questionNumber,
        subtopicContent: sessionData.subtopicContent, 
        // Provide a summary of past performance to guide difficulty and topic selection
        previousAnswersSummary: previousAnswers.map(a => ({
            isCorrect: a.isCorrect,
            cognitiveAnalysis: a.cognitiveAnalysis
        }))
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
 */
export function buildLLMPrompt(context: any, difficulty: number): { systemPrompt: string, userPrompt: string } {
    const systemPrompt = `
        You are an expert AI tutor creating a personalized quiz for a high-school student. 
        Generate a single, clear, multiple-choice question.
        The JSON output must include: 'question', 'options' (an array of 4 strings), 'correctAnswer' (the exact string of the correct option), 
        'explanation' (a brief justification), and 'cognitiveAnalysis' (an object with keys like 'memory_retrieval', 'problem_solving').
        The cognitive scores should be between 0.1 and 1.0.
    `;
    const userPrompt = `
        Context:
        - Subject: ${context.subject}
        - Chapter: ${context.chapter}
        - Subtopic: ${context.subtopic}
        - Desired Difficulty (0.0 to 1.0): ${difficulty.toFixed(1)}
        
        Learning Material to Base the Question On:
        ---
        ${context.subtopicContent}
        ---
    `;
    return { systemPrompt, userPrompt };
}

/**
 * Processes a student's answer, determines correctness, and provides feedback.
 * In a real scenario, this could involve an LLM call for more nuanced feedback.
 */
export async function processStudentAnswer(currentQuestion: any, studentAnswer: any, callLLM: Function): Promise<object> {
    const isCorrect = currentQuestion.correctAnswer === studentAnswer;
    // This function can be expanded to call an LLM for more detailed, Socratic feedback.
    return {
        isCorrect: isCorrect,
        feedback: isCorrect ? "Correct! Well done." : `Not quite. The correct answer is ${currentQuestion.correctAnswer}.`,
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
        answers: answers 
    };

    const submissionRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
    const studentSubmissionRef = doc(db, `students/${studentId}/submissions`, assignedQuizId);
    const originalQuizRef = doc(db, `assignedQuizzes/${sessionData.studentProfile.class}/quizzes`, assignedQuizId);

    const batch = writeBatch(db);

    batch.set(submissionRef, analytics, { merge: true });
    batch.set(studentSubmissionRef, {
        score: analytics.score,
        lastAttempted: analytics.lastAttempted,
        subjectCode: sessionData.assignment.subjectCode,
        chapterId: sessionData.assignment.chapterId,
        subtopicId: sessionData.assignment.subtopicId,
    }, { merge: true });
    batch.update(originalQuizRef, { [`completedBy.${studentId}`]: true });

    await batch.commit();
    return analytics;
}
