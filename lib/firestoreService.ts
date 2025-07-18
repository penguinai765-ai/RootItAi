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
    id: string; 
}
interface DetailedSubmission {
    score: number;
    lastAttempted: Timestamp;
    cognitiveAverages?: { [key: string]: number };
    attempts: number;
    avgLearningStyleVisual?: number;
    avgMemoryPower?: number;
    avgLearningStyleVerbal?: number;
    avgProblemSolving?: number;
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
    if (!teacherDocSnap.exists()) throw new Error("Invalid School or Teacher Code. Please try again.");
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
    const submissionsSummaryRef = collection(db, `students/${uid}/submissions`);
    const summarySnap = await getDocs(submissionsSummaryRef);
    if (summarySnap.empty) {
        return {
            level: 1, xp: 0, gems: 0, xpToNextLevel: 1000,
            insightCards: [
                { title: 'Learning Style', value: 'N/A', description: 'Complete quizzes to discover.', icon: 'fa-hat-wizard', color: 'gray' },
                { title: 'Memory Power', value: 'N/A', description: 'Your recall score will appear here.', icon: 'fa-brain', color: 'gray' }
            ],
            scoreOverTime: [],
            subjectPerformance: [],
            chapterAnalytics: [],
            domainPerformance: [],
            subtopicAnalytics: [],
            subtopicTrends: {},
        };
    }
    const submissionSummaries: SubmissionSummary[] = summarySnap.docs.map(doc => ({  ...doc.data() as SubmissionSummary, id: doc.id }));

    const detailedReportPromises = submissionSummaries.map(summary => 
        getDoc(doc(db, `quizActivations/${summary.id}/submissions`, uid))
    );
    const detailedReportSnaps = await Promise.all(detailedReportPromises);
    const detailedReports: (DetailedSubmission & SubmissionSummary)[] = detailedReportSnaps
        .map((snap, index) => snap.exists() ? { ...snap.data() as DetailedSubmission, ...submissionSummaries[index] } : null)
        .filter((r): r is any => r !== null);

    if (detailedReports.length === 0) {
         return {
            level: 1, xp: 0, gems: 0, xpToNextLevel: 1000,
            insightCards: [
                { title: 'Learning Style', value: 'N/A', description: 'No cognitive data found in recent quizzes.', icon: 'fa-hat-wizard', color: 'gray' },
                { title: 'Memory Power', value: 'N/A', description: 'No cognitive data found in recent quizzes.', icon: 'fa-brain', color: 'gray' }
            ],
            scoreOverTime: [],
            subjectPerformance: [],
            chapterAnalytics: [],
            domainPerformance: [],
            subtopicAnalytics: [],
            subtopicTrends: {},
         };
    }
    
    detailedReports.sort((a, b) => a.lastAttempted.toDate().getTime() - b.lastAttempted.toDate().getTime());
    
    const textbookCache = new Map<string, { name: string; domain: string; subjectCode: string; subjectName: string; }>();
    const subjectsSnap = await getDocs(collection(db, 'textbook'));
    for (const subjectDoc of subjectsSnap.docs) {
        const subjectCode = subjectDoc.id;
        const subjectName = subjectDoc.data().name || "Unnamed Subject";
        const chaptersSnap = await getDocs(collection(db, `textbook/${subjectCode}/chapters`));
        for (const chapterDoc of chaptersSnap.docs) {
            const chapData = chapterDoc.data();
            textbookCache.set(chapterDoc.id, { 
                name: chapData.chaptername || "Unnamed Chapter",
                domain: chapData.domain || "Uncategorized",
                subjectCode: subjectCode,
                subjectName: subjectName
            });
        }
    }

    const subjectPerformanceMap = new Map<string, number[]>();
    const chapterAnalyticsMap = new Map<string, { scores: number[], subjectCode: string }>();
    const domainPerformanceMap = new Map<string, { scores: number[], subjectCode: string }>();
    const subtopicAnalyticsMap = new Map<string, { scores: number[], parentChapter: string, subjectCode: string }>();
    const subtopicTrends = new Map<string, { date: string, score: number }[]>();

    for (const report of detailedReports) {
        const chapterInfo = textbookCache.get(report.chapterId);
        if (chapterInfo) {
            const subjectScores = subjectPerformanceMap.get(chapterInfo.subjectCode) || [];
            subjectScores.push(report.score);
            subjectPerformanceMap.set(chapterInfo.subjectCode, subjectScores);

            const chapterData = chapterAnalyticsMap.get(chapterInfo.name) || { scores: [], subjectCode: chapterInfo.subjectCode };
            chapterData.scores.push(report.score);
            chapterAnalyticsMap.set(chapterInfo.name, chapterData);
            
            const domainData = domainPerformanceMap.get(chapterInfo.domain) || { scores: [], subjectCode: chapterInfo.subjectCode };
            domainData.scores.push(report.score);
            domainPerformanceMap.set(chapterInfo.domain, domainData);

            const subtopicData = subtopicAnalyticsMap.get(report.subtopicId) || { scores: [], parentChapter: chapterInfo.name, subjectCode: chapterInfo.subjectCode };
            subtopicData.scores.push(report.score);
            subtopicAnalyticsMap.set(report.subtopicId, subtopicData);
            
            const trendData = subtopicTrends.get(report.subtopicId) || [];
            trendData.push({ date: report.lastAttempted.toDate().toLocaleDateString(), score: report.score });
            subtopicTrends.set(report.subtopicId, trendData);
        }
    }
    
    const subjectPerformance = Array.from(subjectPerformanceMap.entries()).map(([code, scores]) => ({
        subjectCode: code,
        name: textbookCache.get(submissionSummaries.find(s => s.subjectCode === code)?.chapterId || "")?.subjectName || code,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        improvement: 0 
    }));
    const chapterAnalytics = Array.from(chapterAnalyticsMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, subjectCode: data.subjectCode }));
    const domainPerformance = Array.from(domainPerformanceMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, subjectCode: data.subjectCode }));
    const subtopicAnalytics = Array.from(subtopicAnalyticsMap.entries()).map(([id, data]) => ({ name: textbookCache.get(id)?.name || id, averageScore: data.scores.reduce((a,b) => a+b,0) / data.scores.length, parentChapter: data.parentChapter, subjectCode: data.subjectCode }));
    const finalSubtopicTrends = Object.fromEntries(Array.from(subtopicTrends.entries()).map(([id, data]) => [textbookCache.get(id)?.name || id, data]));
    
    const totalXP = detailedReports.reduce((sum, rep) => sum + (rep.score || 0), 0);
    
    return {
        level: Math.floor(totalXP / 1000) + 1,
        xp: totalXP % 1000,
        xpToNextLevel: 1000,
        gems: detailedReports.filter(rep => rep.score >= 90).length,
        learningStyle: { name: 'Visual', score: (detailedReports.reduce((s, r) => s + (r.avgLearningStyleVisual || 0), 0) / detailedReports.length) * 10 },
        memoryPower: { improvement: 0 },
        studyBalance: { creativity: 70, logic: 30 },
        focusTime: { topSubject: subjectPerformance[0]?.name || 'N/A', percentage: 45 },
        scoreOverTime: detailedReports.map(r => ({ date: r.lastAttempted.toDate().toLocaleDateString(), score: r.score })),
        subjectPerformance,
        chapterAnalytics,
        domainPerformance,
        subtopicAnalytics,
        subtopicTrends: finalSubtopicTrends,
    };
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
    const subjectCode = teacherCode.subjectCode;
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
        subjectCode, 
    };
};
