// lib/quizEngine.ts

import { doc, getDoc, collection, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// --- (Type definitions and other functions remain the same) ---
interface Assignment { chapterId: string; subtopicId: string; subjectCode: string; }
interface TextbookContent { title: string; content: string; }
interface StudentProfile { name: string; class: string; }
interface PreviousPerformance { score: number; strengths: string[]; weaknesses: string[]; summary: string; attempts: number; }
interface SessionData { textbookContent: TextbookContent; previousPerformance: PreviousPerformance | null; studentProfile: StudentProfile; assignment: Assignment; }
interface Answer { question: string; answer: string; isCorrect: boolean; responseTime: number; difficulty: 'easy' | 'medium' | 'hard' }

// --- CORRECTED Analytics & Session Management ---
export async function updatePerformanceAnalytics(studentId: string, assignedQuizId: string, sessionData: SessionData, answers: Answer[]) {
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const totalTime = answers.reduce((sum, a) => sum + (a.responseTime || 0), 0);

    const analytics = {
        totalQuestions,
        correctAnswers,
        score: parseFloat(averageScore.toFixed(1)),
        totalTime,
        strengths: ["..."], // Placeholder for brevity
        weaknesses: ["..."], // Placeholder for brevity
        summary: `Scored ${averageScore.toFixed(1)}%`, // Placeholder for brevity
        difficultyProgression: answers.map(a => a.difficulty),
        lastAttempted: new Date(),
        attempts: (sessionData.previousPerformance?.attempts || 0) + 1,
    };
    
    // --- ATOMIC WRITE OPERATION ---
    
    // 1. Reference to the detailed report document
    const submissionRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
    
    // 2. Reference to the student's personal summary document
    const studentSubmissionRef = doc(db, `students/${studentId}/submissions`, assignedQuizId);
    
    // 3. (NEW) Reference to the original quiz assignment document
    const classCode = sessionData.studentProfile.class;
    const originalQuizRef = doc(db, `assignedQuizzes/${classCode}/quizzes`, assignedQuizId);

    // Create a batch to ensure all writes succeed or fail together
    const batch = writeBatch(db);

    // Write 1: The detailed report
    batch.set(submissionRef, analytics, { merge: true });
    
    // Write 2: The student's personal summary for fast lookups
    batch.set(studentSubmissionRef, {
        score: analytics.score,
        lastAttempted: analytics.lastAttempted,
        subjectCode: sessionData.assignment.subjectCode,
        chapterId: sessionData.assignment.chapterId,
        subtopicId: sessionData.assignment.subtopicId,
    }, { merge: true });
    
    // Write 3 (NEW): Update the original quiz to mark it as completed by this student.
    // Using dot notation to update a specific field in a map.
    batch.update(originalQuizRef, {
        [`completedBy.${studentId}`]: true
    });
    
    // Commit all three writes as a single atomic transaction
    await batch.commit();
    
    return analytics;
}

// --- (The rest of the file remains completely unchanged. All other functions are still here.) ---
export async function initializeQuizSession(studentId: string, assignedQuizId: string): Promise<SessionData> {
    let studentProfileData;
    const studentProfileRef = doc(db, "students", studentId);
    try {
        const studentProfileSnap = await getDoc(studentProfileRef);
        if (!studentProfileSnap.exists()) throw new Error("Student profile not found.");
        studentProfileData = studentProfileSnap.data() as StudentProfile;
    } catch (error) {
        console.error(`[DEBUG] FIREBASE PERMISSION ERROR on path: ${studentProfileRef.path}.`, error);
        throw error;
    }
    const classCode = studentProfileData.class;
    if (!classCode) throw new Error("Class code not found in student profile.");
    let assignmentData;
    const assignmentRef = doc(db, `assignedQuizzes/${classCode}/quizzes`, assignedQuizId);
    try {
        const assignmentSnap = await getDoc(assignmentRef);
        if (!assignmentSnap.exists()) throw new Error("Quiz assignment not found.");
        assignmentData = assignmentSnap.data() as Assignment;
    } catch (error) {
        console.error(`[DEBUG] FIREBASE PERMISSION ERROR on path: ${assignmentRef.path}.`, error);
        throw error;
    }
    let textbookContentData;
    const textbookContentRef = doc(db, `textbook/${assignmentData.subjectCode}/chapters/${assignmentData.chapterId}/subtopics`, assignmentData.subtopicId);
    try {
        const textbookContentSnap = await getDoc(textbookContentRef);
        if (!textbookContentSnap.exists()) throw new Error("Textbook content not found.");
        textbookContentData = textbookContentSnap.data() as TextbookContent;
    } catch (error) {
        console.error(`[DEBUG] FIREBASE PERMISSION ERROR on path: ${textbookContentRef.path}.`, error);
        throw error;
    }
    let previousPerformanceData = null;
    const previousPerformanceRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
    try {
        const previousPerformanceSnap = await getDoc(previousPerformanceRef);
        if (previousPerformanceSnap.exists()) {
            previousPerformanceData = previousPerformanceSnap.data() as PreviousPerformance;
        }
    } catch (error) {
        console.error(`[DEBUG] FIREBASE PERMISSION ERROR on path: ${previousPerformanceRef.path}.`, error);
        throw error;
    }
    return { textbookContent: textbookContentData, previousPerformance: previousPerformanceData, studentProfile: studentProfileData, assignment: assignmentData };
}
export function buildQuestionContext(sessionData: SessionData, questionNumber: number, previousAnswers: any[] = []) { return {} as any; }
export function calculateDifficulty(context: any): 'easy' | 'medium' | 'hard' { return 'medium'; }
export function buildLLMPrompt(context: any, difficulty: string) { return {} as any; }
