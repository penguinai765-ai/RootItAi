import { doc, getDoc, setDoc, writeBatch, collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// --- Explicit Type Definitions ---
export interface ChapterInfo { id: string; name: string; }
export interface SubtopicInfo { id: string; name: string; }
export interface SchoolInfo { id: string; name: string; }
interface SubmissionSummary {
    score: number;
    lastAttempted: Timestamp;
    subjectCode: string;
    chapterId: string;
    subtopicId: string;
}

// --- Verification and Onboarding Functions ---
export const doesUserMappingExist = async (uid: string): Promise<boolean> => {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists();
};

export const verifyAndClaimTeacherProfile = async (uid: string, schoolCode: string, teacherCode: string): Promise<string> => {
    const teacherDocRef = doc(db, `schools/${schoolCode}/teachers`, teacherCode);
    const teacherDocSnap = await getDoc(teacherDocRef);
    if (!teacherDocSnap.exists()) throw new Error("Invalid School or Teacher Code.");
    const teacherData = teacherDocSnap.data();
    if (teacherData.uid) throw new Error("This teacher profile has already been claimed.");
    const batch = writeBatch(db);
    batch.update(teacherDocRef, { uid: uid });
    const userDocRef = doc(db, "users", uid);
    batch.set(userDocRef, { role: 'teacher', schoolCode, teacherCode });
    await batch.commit();
    return "Profile successfully claimed!";
};

// --- Profile Existence & Creation ---
export const doesStudentProfileExist = async (uid: string): Promise<boolean> => {
  const studentDocRef = doc(db, "students", uid);
  const docSnap = await getDoc(studentDocRef);
  return docSnap.exists();
};

export const getSchoolList = async (): Promise<SchoolInfo[]> => {
    const schoolsRef = collection(db, "schools");
    const snapshot = await getDocs(schoolsRef);
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().schoolName || "Unnamed School"
    }));
};

export const createStudentProfile = async (uid: string, profileData: {
    name: string;
    schoolCode: string;
    schoolName: string;
    class: string;
    rollNumber: string;
    division: string;
}) => {
  const studentDocRef = doc(db, "students", uid);
  await setDoc(studentDocRef, {
    ...profileData,
    subjectCodes: [],
    classCode: profileData.class || "8", 
  });
};

// --- Dashboard Data Fetching ---
export const getTeacherDashboardData = async (uid: string) => {
    const userDocSnap = await getDoc(doc(db, "users", uid));
    if (!userDocSnap.exists()) throw new Error("User mapping not found.");
    const { schoolCode, teacherCode } = userDocSnap.data();
    const teacherDocSnap = await getDoc(doc(db, `schools/${schoolCode}/teachers`, teacherCode));
    if (!teacherDocSnap.exists()) throw new Error("Teacher profile data not found.");
    const teacherData = teacherDocSnap.data();
    const schoolDocSnap = await getDoc(doc(db, "schools", schoolCode));
    const schoolName = schoolDocSnap.exists() ? schoolDocSnap.data().schoolName : "Unknown School";
    const classCode = teacherData.class;
    let activeQuizzesCount = 0;
    let studentCount = 0;
    if (classCode && schoolCode) {
        const quizzesQuery = query(collection(db, `assignedQuizzes/${classCode}/quizzes`), where("schoolCode", "==", schoolCode));
        activeQuizzesCount = (await getDocs(quizzesQuery)).size;
        const studentsQuery = query(collection(db, "students"), where("class", "==", classCode), where("schoolCode", "==", schoolCode));
        studentCount = (await getDocs(studentsQuery)).size;
    }
    return {
        teacherName: teacherData.name, schoolName, subject: teacherData.subject,
        classCode: teacherData.class, subjectCode: teacherData.subjectCode,
        activeQuizzesCount, studentCount,
    };
};

export const getStudentDashboardData = async (uid: string) => {
    const studentDocSnap = await getDoc(doc(db, "students", uid));
    if (!studentDocSnap.exists()) throw new Error("Student profile not found.");
    const studentData = studentDocSnap.data();
    const { classCode, schoolCode } = studentData;
    let allQuizzes: any[] = [];
    try {
        if (classCode && schoolCode) {
            const quizzesQuery = query(
                collection(db, "assignedQuizzes", classCode, "quizzes"), 
                where("schoolCode", "==", schoolCode)
            );
            const quizzesSnap = await getDocs(quizzesQuery);
            allQuizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (error) { 
        console.error("Error fetching quizzes. This may be due to a missing Firestore index. Please check the console for a link to create it.", error);
    }
    const activeQuizzes = allQuizzes.filter(q => !(q.completedBy && q.completedBy[uid]) && !(q.deadline && q.deadline.toDate() < new Date()));
    return { studentName: studentData.name, className: studentData.class, activeQuizzes };
};

// --- Quiz Assignment Functions ---
export const getSubjects = async () => {
    const snapshot = await getDocs(collection(db, "textbook"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getChapters = async (subjectCode: string): Promise<ChapterInfo[]> => {
    const snapshot = await getDocs(collection(db, "textbook", subjectCode, "chapters"));
    return snapshot.docs.map(d => ({ id: d.id, name: d.data().chaptername || "Unnamed Chapter" }));
};
export const getSubtopics = async (subjectCode: string, chapterId: string): Promise<SubtopicInfo[]> => {
    const snapshot = await getDocs(collection(db, "textbook", subjectCode, "chapters", chapterId, "subtopics"));
    return snapshot.docs.map(d => ({ id: d.id, name: d.data().title || "Unnamed Subtopic" }));
};
export const createQuizAssignment = async (data: {
    assignedBy: string;
    classCode: string;
    subjectCode: string;
    chapterId: string;
    subtopicId: string;
    deadline: Date;
    timeLimit: number;
}) => {
    const { assignedBy, classCode, ...details } = data;
    const userDocSnap = await getDoc(doc(db, "users", assignedBy));
    if (!userDocSnap.exists()) throw new Error("Cannot assign quiz: Teacher mapping not found.");
    const { schoolCode } = userDocSnap.data();
    if (!schoolCode) throw new Error("Cannot assign quiz: Teacher is not associated with a school.");
    const assignmentData = { ...details, assignedBy, schoolCode, completedBy: {} };
    await addDoc(collection(db, "assignedQuizzes", classCode, "quizzes"), assignmentData);
};


// --- Analytics Functions ---
export const getStudentAnalytics = async (uid: string) => {
    const submissionsRef = collection(db, `students/${uid}/submissions`);
    const submissionsSnap = await getDocs(submissionsRef);
    if (submissionsSnap.empty) return { scoreOverTime: [], chapterAnalytics: [], subtopicAnalytics: [], subtopicTrends: {}, domainPerformance: [] };
    const summaries: SubmissionSummary[] = submissionsSnap.docs.map(doc => doc.data() as SubmissionSummary);
    const textbookCache = new Map<string, { name: string; domain: string }>();
    const subtopicToChapterMap = new Map<string, string>();
    const subjectsSnap = await getDocs(collection(db, 'textbook'));
    for (const subjectDoc of subjectsSnap.docs) {
        const chaptersSnap = await getDocs(collection(db, `textbook/${subjectDoc.id}/chapters`));
        for (const chapterDoc of chaptersSnap.docs) {
            const chapData = chapterDoc.data();
            const chapterName = chapData.chaptername || "Unnamed Chapter";
            textbookCache.set(chapterDoc.id, { name: chapterName, domain: chapData.domain || "Uncategorized" });
            const subtopicsSnap = await getDocs(collection(db, `textbook/${subjectDoc.id}/chapters/${chapterDoc.id}/subtopics`));
            for (const subtopicDoc of subtopicsSnap.docs) {
                const subData = subtopicDoc.data();
                const subtopicName = subData.title || "Unnamed Subtopic";
                textbookCache.set(subtopicDoc.id, { name: subtopicName, domain: chapData.domain });
                subtopicToChapterMap.set(subtopicDoc.id, chapterName);
            }
        }
    }
    const sortedSummaries = summaries.sort((a, b) => a.lastAttempted.toDate().getTime() - b.lastAttempted.toDate().getTime());
    const scoreOverTime = sortedSummaries.map(s => ({ date: s.lastAttempted.toDate().toLocaleDateString(), score: s.score }));
    const chapterAnalyticsMap = new Map<string, number[]>();
    const subtopicAnalyticsMap = new Map<string, { scores: number[]; parentChapter: string }>();
    const domainPerformanceMap = new Map<string, number[]>();
    const subtopicTrends = new Map<string, { date: string, score: number }[]>();
    for (const summary of summaries) {
        const chapterInfo = textbookCache.get(summary.chapterId);
        if (chapterInfo) {
            const chapScores = chapterAnalyticsMap.get(chapterInfo.name) || [];
            chapScores.push(summary.score);
            chapterAnalyticsMap.set(chapterInfo.name, chapScores);
            const domainScores = domainPerformanceMap.get(chapterInfo.domain) || [];
            domainScores.push(summary.score);
            domainPerformanceMap.set(chapterInfo.domain, domainScores);
        }
        const subtopicInfo = textbookCache.get(summary.subtopicId);
        if (subtopicInfo) {
            const parentChapterName = subtopicToChapterMap.get(summary.subtopicId) || "Unknown Chapter";
            const subData = subtopicAnalyticsMap.get(subtopicInfo.name) || { scores: [], parentChapter: parentChapterName };
            subData.scores.push(summary.score);
            subtopicAnalyticsMap.set(subtopicInfo.name, subData);
            const trendData = subtopicTrends.get(subtopicInfo.name) || [];
            trendData.push({ date: summary.lastAttempted.toDate().toLocaleDateString(), score: summary.score });
            subtopicTrends.set(subtopicInfo.name, trendData);
        }
    }
    const chapterAnalytics = Array.from(chapterAnalyticsMap.entries()).map(([name, scores]) => ({ name, averageScore: scores.reduce((a, b) => a + b, 0) / scores.length }));
    const subtopicAnalytics = Array.from(subtopicAnalyticsMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, parentChapter: data.parentChapter }));
    const domainPerformance = Array.from(domainPerformanceMap.entries()).map(([name, scores]) => ({ name, averageScore: scores.reduce((a, b) => a + b, 0) / scores.length }));
    const finalSubtopicTrends = Object.fromEntries(subtopicTrends);
    return { scoreOverTime, chapterAnalytics, subtopicAnalytics, subtopicTrends: finalSubtopicTrends, domainPerformance };
};

export const getDetailedQuizReport = async (assignedQuizId: string, studentId: string) => {
    const reportRef = doc(db, `quizActivations/${assignedQuizId}/submissions`, studentId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) throw new Error("Detailed report not found.");
    return reportSnap.data();
};

export const getTeacherAnalytics = async (teacherId: string) => {
    const userDocSnap = await getDoc(doc(db, "users", teacherId));
    if (!userDocSnap.exists()) throw new Error("Teacher user mapping not found.");
    const { schoolCode, teacherCode } = userDocSnap.data();
    const teacherProfileSnap = await getDoc(doc(db, `schools/${schoolCode}/teachers`, teacherCode));
    if (!teacherProfileSnap.exists()) throw new Error("Teacher profile not found.");
    const classCode = teacherProfileSnap.data().class;
    const studentsSnap = await getDocs(query(collection(db, "students"), where("class", "==", classCode), where("schoolCode", "==", schoolCode)));
    const studentList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const submissionPromises = studentList.map(student => getDocs(collection(db, `students/${student.id}/submissions`)));
    const submissionSnaps = await Promise.all(submissionPromises);
    const allSubmissions: (SubmissionSummary & { studentId: string })[] = [];
    submissionSnaps.forEach((snap, index) => {
        const studentId = studentList[index].id;
        snap.forEach(subDoc => { allSubmissions.push({ studentId, ...(subDoc.data() as SubmissionSummary) }); });
    });
    const textbookCache = new Map<string, string>();
    const subjectsSnap = await getDocs(collection(db, 'textbook'));
    for (const subjectDoc of subjectsSnap.docs) {
        const chaptersSnap = await getDocs(collection(db, `textbook/${subjectDoc.id}/chapters`));
        for (const chapterDoc of chaptersSnap.docs) {
            textbookCache.set(chapterDoc.id, chapterDoc.data().chaptername);
        }
    }
    const chapterAnalyticsMap = new Map<string, number[]>();
    const subtopicAnalyticsMap = new Map<string, { scores: number[], parentChapter: string }>();
    allSubmissions.forEach(summary => {
        const chapterName = textbookCache.get(summary.chapterId) || summary.chapterId;
        const subtopicName = "Placeholder";
        const chapScores = chapterAnalyticsMap.get(chapterName) || [];
        chapScores.push(summary.score);
        chapterAnalyticsMap.set(chapterName, chapScores);
        const subData = subtopicAnalyticsMap.get(subtopicName) || { scores: [], parentChapter: chapterName };
        subData.scores.push(summary.score);
        subtopicAnalyticsMap.set(subtopicName, subData);
    });
    const chapterPerformance = Array.from(chapterAnalyticsMap.entries()).map(([name, scores]) => ({ name, averageScore: scores.reduce((a, b) => a + b, 0) / scores.length }));
    const subtopicPerformance = Array.from(subtopicAnalyticsMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, parentChapter: data.parentChapter }));
    const processedStudentList = studentList.map(student => {
        const studentSubmissions = allSubmissions.filter(s => s.studentId === student.id);
        const overallScore = studentSubmissions.reduce((sum, s) => sum + s.score, 0) / (studentSubmissions.length || 1);
        return { id: student.id, name: student.name, division: student.division, overallScore: parseFloat(overallScore.toFixed(1) || "0") };
    });
    return {
        classAverage: allSubmissions.reduce((sum, s) => sum + s.score, 0) / (allSubmissions.length || 1),
        studentList: processedStudentList,
        chapterPerformance,
        subtopicPerformance,
    };
};
