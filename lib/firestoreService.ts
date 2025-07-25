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

    // Fetch subject, chapter, and subtopic names for each quiz
    const enhancedQuizzes = await Promise.all(allQuizzes.map(async (quiz) => {
        try {
            // Get subject name
            const subjectDoc = await getDoc(doc(db, "textbook", quiz.subjectCode));
            const subjectName = subjectDoc.exists() ? (subjectDoc.data()["subject name"] || subjectDoc.data().name || quiz.subjectCode) : quiz.subjectCode;

            // Get chapter name
            const chapterDoc = await getDoc(doc(db, "textbook", quiz.subjectCode, "chapters", quiz.chapterId));
            const chapterName = chapterDoc.exists() ? (chapterDoc.data().chaptername || quiz.chapterId) : quiz.chapterId;

            // Get subtopic name
            const subtopicDoc = await getDoc(doc(db, "textbook", quiz.subjectCode, "chapters", quiz.chapterId, "subtopics", quiz.subtopicId));
            const subtopicName = subtopicDoc.exists() ? (subtopicDoc.data().title || quiz.subtopicId) : quiz.subtopicId;

            return {
                ...quiz,
                subjectName,
                chapterName,
                subtopicName
            };
        } catch (error) {
            console.error("Error fetching quiz details:", error);
            return {
                ...quiz,
                subjectName: quiz.subjectCode,
                chapterName: quiz.chapterId,
                subtopicName: quiz.subtopicId
            };
        }
    }));

    const activeQuizzes = enhancedQuizzes.filter(q => !(q.completedBy && q.completedBy[uid]) && !(q.deadline && q.deadline.toDate() < new Date()));
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
    const assignmentData = {
        ...details,
        assignedBy,
        schoolCode,
        completedBy: {},
        assignedDate: Timestamp.now(),
        deadline: Timestamp.fromDate(details.deadline)
    };
    await addDoc(collection(db, "assignedQuizzes", classCode, "quizzes"), assignmentData);
};

export const getAssignedQuizzes = async (teacherId: string, dateFilter?: { startDate?: Date; endDate?: Date }) => {
    const userDocSnap = await getDoc(doc(db, "users", teacherId));
    if (!userDocSnap.exists()) throw new Error("Teacher user mapping not found.");
    const { schoolCode, teacherCode } = userDocSnap.data();
    const teacherProfileSnap = await getDoc(doc(db, `schools/${schoolCode}/teachers`, teacherCode));
    if (!teacherProfileSnap.exists()) throw new Error("Teacher profile not found.");
    const classCode = teacherProfileSnap.data().class;

    try {
        // First, get all quizzes for the class and school
        const quizzesQuery = query(collection(db, `assignedQuizzes/${classCode}/quizzes`), where("schoolCode", "==", schoolCode));
        const quizzesSnap = await getDocs(quizzesQuery);

        // Filter in memory to avoid composite index issues
        let quizzes = quizzesSnap.docs.map(doc => {
            const data = doc.data();
            console.log(`Quiz ${doc.id} data:`, data);
            console.log(`Quiz ${doc.id} assignedDate:`, data.assignedDate?.toDate?.() || data.assignedDate);
            console.log(`Quiz ${doc.id} deadline:`, data.deadline?.toDate?.() || data.deadline);
            console.log(`Quiz ${doc.id} assignedDate timestamp:`, data.assignedDate);
            console.log(`Quiz ${doc.id} deadline timestamp:`, data.deadline);

            return {
                id: doc.id,
                ...data,
                assignedDate: data.assignedDate?.toDate?.() || new Date(),
                deadline: data.deadline?.toDate?.() || new Date()
            };
        });

        // Apply date filtering in memory - filter for exact date match
        if (dateFilter?.startDate) {
            const filterDate = dateFilter.startDate;
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);

            quizzes = quizzes.filter(quiz => {
                const quizDate = quiz.assignedDate;
                return quizDate >= filterDate && quizDate < nextDay;
            });
        }

        // Get subject, chapter, and subtopic names for each quiz
        const enhancedQuizzes = await Promise.all(quizzes.map(async (quiz: any) => {
            try {
                // Get subject name
                const subjectDoc = await getDoc(doc(db, "textbook", quiz.subjectCode));
                const subjectName = subjectDoc.exists() ? (subjectDoc.data()["subject name"] || subjectDoc.data().name || quiz.subjectCode) : quiz.subjectCode;

                // Get chapter name
                const chapterDoc = await getDoc(doc(db, "textbook", quiz.subjectCode, "chapters", quiz.chapterId));
                const chapterName = chapterDoc.exists() ? (chapterDoc.data().chaptername || quiz.chapterId) : quiz.chapterId;

                // Get subtopic name
                const subtopicDoc = await getDoc(doc(db, "textbook", quiz.subjectCode, "chapters", quiz.chapterId, "subtopics", quiz.subtopicId));
                const subtopicName = subtopicDoc.exists() ? (subtopicDoc.data().title || quiz.subtopicId) : quiz.subtopicId;

                // Calculate completion stats
                const completedCount = Object.keys(quiz.completedBy || {}).length;
                const totalStudents = await getDocs(query(collection(db, "students"), where("class", "==", classCode), where("schoolCode", "==", schoolCode)));
                const totalCount = totalStudents.size;

                return {
                    ...quiz,
                    subjectName,
                    chapterName,
                    subtopicName,
                    submitted: completedCount,
                    total: totalCount,
                    status: completedCount === totalCount ? "completed" : "active",
                    due: quiz.deadline || new Date()
                };
            } catch (error) {
                console.error("Error fetching quiz details:", error);
                return {
                    ...quiz,
                    subjectName: quiz.subjectCode || "Unknown",
                    chapterName: quiz.chapterId || "Unknown",
                    subtopicName: quiz.subtopicId || "Unknown",
                    submitted: 0,
                    total: 0,
                    status: "active",
                    due: quiz.deadline || new Date()
                };
            }
        }));

        return enhancedQuizzes.sort((a, b) => b.assignedDate.getTime() - a.assignedDate.getTime());
    } catch (error) {
        console.error("Error in getAssignedQuizzes:", error);
        return [];
    }
};

// Migration function to add assignedDate to existing quizzes
export const migrateQuizAssignedDates = async (teacherId: string) => {
    const userDocSnap = await getDoc(doc(db, "users", teacherId));
    if (!userDocSnap.exists()) throw new Error("Teacher user mapping not found.");
    const { schoolCode, teacherCode } = userDocSnap.data();
    const teacherProfileSnap = await getDoc(doc(db, `schools/${schoolCode}/teachers`, teacherCode));
    if (!teacherProfileSnap.exists()) throw new Error("Teacher profile not found.");
    const classCode = teacherProfileSnap.data().class;

    try {
        const quizzesQuery = query(collection(db, `assignedQuizzes/${classCode}/quizzes`), where("schoolCode", "==", schoolCode));
        const quizzesSnap = await getDocs(quizzesQuery);

        const batch = writeBatch(db);
        let updatedCount = 0;

        quizzesSnap.docs.forEach(doc => {
            const data = doc.data();
            if (!data.assignedDate) {
                console.log(`Migrating quiz ${doc.id} - adding assignedDate`);
                batch.update(doc.ref, { assignedDate: Timestamp.now() });
                updatedCount++;
            } else if (data.assignedDate && data.deadline &&
                data.assignedDate.toDate?.()?.getTime() === data.deadline.toDate?.()?.getTime()) {
                // If assigned date and deadline are the same, update assigned date to be earlier
                console.log(`Migrating quiz ${doc.id} - fixing assigned date to be earlier than deadline`);
                const deadlineDate = data.deadline.toDate();
                const assignedDate = new Date(deadlineDate.getTime() - (24 * 60 * 60 * 1000)); // 1 day earlier
                batch.update(doc.ref, { assignedDate: Timestamp.fromDate(assignedDate) });
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Migrated ${updatedCount} quizzes with assignedDate`);
        } else {
            console.log("No quizzes need migration");
        }

        return updatedCount;
    } catch (error) {
        console.error("Error migrating quiz assigned dates:", error);
        throw error;
    }
};


// --- Analytics Functions ---
export const getStudentAnalytics = async (uid: string) => {
    // Debug logging
    console.log("=== FIRESTORE DEBUG ===");
    console.log("Searching for submissions for user:", uid);

    // COMPLETELY NEW FLOW: Search only through quizActivations collections
    try {
        // Get all quizActivations collections
        const quizActivationsRef = collection(db, "quizActivations");
        const quizActivationsSnap = await getDocs(quizActivationsRef);

        console.log("Found quizActivations:", quizActivationsSnap.docs.length);

        // Check each quizActivation for submissions by this student
        const allSubmissions: any[] = [];
        for (const quizActivationDoc of quizActivationsSnap.docs) {
            const quizId = quizActivationDoc.id;
            const submissionsRef = collection(db, `quizActivations/${quizId}/submissions`);
            const submissionsSnap = await getDocs(submissionsRef);

            // Check if this student has a submission in this quiz
            console.log(`Checking quiz ${quizId} for student ${uid}`);
            console.log(`Available submission IDs:`, submissionsSnap.docs.map(doc => doc.id));
            const studentSubmission = submissionsSnap.docs.find(doc => doc.id === uid);
            console.log(`Student submission found:`, !!studentSubmission);
            if (studentSubmission && studentSubmission.exists()) {
                const submissionData = studentSubmission.data();
                console.log("Found submission in quiz:", quizId);
                console.log("Submission data keys:", Object.keys(submissionData));
                console.log("Has analysis object:", !!submissionData.analysis);
                console.log("Analysis object keys:", submissionData.analysis ? Object.keys(submissionData.analysis) : "No analysis");

                // Create a submission summary from the quizActivations data
                allSubmissions.push({
                    id: quizId,
                    score: submissionData.analytics?.score || 0,
                    lastAttempted: submissionData.endTime || new Date(),
                    subjectCode: submissionData.sessionData?.assignment?.subjectCode || "Unknown",
                    chapterId: submissionData.sessionData?.assignment?.chapterId || "Unknown",
                    subtopicId: submissionData.sessionData?.assignment?.subtopicId || "Unknown",
                    analysis: submissionData.analysis || null,
                    // Include all the data we need for analytics
                    sessionData: submissionData.sessionData,
                    answers: submissionData.answers,
                    analytics: submissionData.analytics
                });
            }
        }

        console.log("Total submissions found:", allSubmissions.length);

        if (allSubmissions.length === 0) {
            console.log("No submissions found anywhere, returning empty analytics");
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

        // Sort submissions by date (oldest to newest)
        allSubmissions.sort((a, b) => {
            const dateA = a.lastAttempted?.toDate?.() || new Date(a.lastAttempted);
            const dateB = b.lastAttempted?.toDate?.() || new Date(b.lastAttempted);
            return dateA.getTime() - dateB.getTime();
        });

        // Create detailedAnalysisHistory from the submissions
        const detailedAnalysisHistory = await Promise.all(
            allSubmissions.map(async sub => {
                const names = await mapQuizIdsToNames(sub.subjectCode, sub.chapterId, sub.subtopicId);
                return {
                    date: sub.lastAttempted?.toDate?.() || new Date(sub.lastAttempted),
                    subjectCode: sub.subjectCode,
                    subjectName: names.subjectName,
                    chapterId: sub.chapterId,
                    chapterName: names.chapterName,
                    subtopicId: sub.subtopicId,
                    subtopicName: names.subtopicName,
                    score: sub.score,
                    analysis: sub.analysis
                };
            })
        );
        // Filter out entries without analysis
        const filteredDetailedAnalysisHistory = detailedAnalysisHistory.filter(r => r.analysis);

        console.log("Detailed analysis history created:", filteredDetailedAnalysisHistory.length);

        // Create detailedReports for compatibility with existing analytics logic
        const detailedReports = allSubmissions.map(sub => ({
            score: sub.score,
            lastAttempted: sub.lastAttempted,
            subjectCode: sub.subjectCode,
            chapterId: sub.chapterId,
            subtopicId: sub.subtopicId,
            id: sub.id,
            // Include other fields that might be needed
            analytics: sub.analytics,
            sessionData: sub.sessionData,
            answers: sub.answers,
            // Add missing fields for compatibility
            avgLearningStyleVisual: sub.analytics?.cognitiveAverages?.learningStyleVisual || 0,
            avgMemoryPower: sub.analytics?.cognitiveAverages?.memoryPower || 0,
            avgLearningStyleVerbal: sub.analytics?.cognitiveAverages?.learningStyleVerbal || 0,
            avgProblemSolving: sub.analytics?.cognitiveAverages?.problemSolving || 0
        }));

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
            const subjectName = subjectDoc.data()["subject name"] || subjectDoc.data().name || "Unnamed Subject";
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
            name: textbookCache.get(detailedReports.find(s => s.subjectCode === code)?.chapterId || "")?.subjectName || code,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            improvement: 0
        }));
        const chapterAnalytics = Array.from(chapterAnalyticsMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, subjectCode: data.subjectCode }));
        const domainPerformance = Array.from(domainPerformanceMap.entries()).map(([name, data]) => ({ name, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, subjectCode: data.subjectCode }));
        const subtopicAnalytics = Array.from(subtopicAnalyticsMap.entries()).map(([id, data]) => ({ name: textbookCache.get(id)?.name || id, averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length, parentChapter: data.parentChapter, subjectCode: data.subjectCode }));
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
            detailedAnalysisHistory: filteredDetailedAnalysisHistory, // <-- add this
        };
    } catch (error) {
        console.error("Error in getStudentAnalytics:", error);
        return {
            level: 1, xp: 0, gems: 0, xpToNextLevel: 1000,
            insightCards: [
                { title: 'Learning Style', value: 'N/A', description: 'Error loading analytics.', icon: 'fa-hat-wizard', color: 'gray' },
                { title: 'Memory Power', value: 'N/A', description: 'Error loading analytics.', icon: 'fa-brain', color: 'gray' }
            ],
            scoreOverTime: [],
            subjectPerformance: [],
            chapterAnalytics: [],
            domainPerformance: [],
            subtopicAnalytics: [],
            subtopicTrends: {},
        };
    }
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
    const subjectCode = teacherProfileSnap.data().subjectCode;

    // Get all students in the teacher's class
    const studentsSnap = await getDocs(query(collection(db, "students"), where("class", "==", classCode), where("schoolCode", "==", schoolCode)));
    const studentList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // Get all quiz submissions for these students
    const allSubmissions: any[] = [];
    const studentAnalytics: any[] = [];

    // Fetch submissions from quizActivations (new flow)
    const quizActivationsRef = collection(db, "quizActivations");
    const quizActivationsSnap = await getDocs(quizActivationsRef);

    for (const quizActivationDoc of quizActivationsSnap.docs) {
        const quizId = quizActivationDoc.id;
        const submissionsRef = collection(db, `quizActivations/${quizId}/submissions`);
        const submissionsSnap = await getDocs(submissionsRef);

        for (const submissionDoc of submissionsSnap.docs) {
            const submissionData = submissionDoc.data();
            const studentId = submissionDoc.id;

            // Check if this student is in the teacher's class
            const student = studentList.find(s => s.id === studentId);
            if (student && submissionData.sessionData?.assignment?.subjectCode === subjectCode) {
                allSubmissions.push({
                    studentId,
                    score: submissionData.analytics?.score || 0,
                    lastAttempted: submissionData.endTime || new Date(),
                    subjectCode: submissionData.sessionData?.assignment?.subjectCode,
                    chapterId: submissionData.sessionData?.assignment?.chapterId || "Unknown",
                    subtopicId: submissionData.sessionData?.assignment?.subtopicId || "Unknown",
                    analysis: submissionData.analysis || null,
                    cognitiveAverages: submissionData.analytics?.cognitiveAverages || {},
                    errorPatterns: submissionData.analysis?.errorPatterns || []
                });
            }
        }
    }

    // Get textbook data for chapter/subtopic names
    const textbookCache = new Map<string, { name: string; domain: string; subjectCode: string; subjectName: string; }>();
    const subjectsSnap = await getDocs(collection(db, 'textbook'));
    for (const subjectDoc of subjectsSnap.docs) {
        const subjectCode = subjectDoc.id;
        const subjectName = subjectDoc.data()["subject name"] || subjectDoc.data().name || "Unnamed Subject";
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

    // Process student analytics
    for (const student of studentList) {
        const studentSubmissions = allSubmissions.filter(s => s.studentId === student.id);

        if (studentSubmissions.length > 0) {
            // Calculate chapter-wise performance
            const chapterPerformance = new Map<string, number[]>();
            const subtopicPerformance = new Map<string, number[]>();

            studentSubmissions.forEach(sub => {
                const chapterName = textbookCache.get(sub.chapterId)?.name || sub.chapterId;
                const chapterScores = chapterPerformance.get(chapterName) || [];
                chapterScores.push(sub.score);
                chapterPerformance.set(chapterName, chapterScores);

                const subtopicScores = subtopicPerformance.get(sub.subtopicId) || [];
                subtopicScores.push(sub.score);
                subtopicPerformance.set(sub.subtopicId, subtopicScores);
            });

            // Calculate averages
            const chapterAverages = Array.from(chapterPerformance.entries()).map(([name, scores]) => ({
                name,
                averageScore: scores.reduce((a, b) => a + b, 0) / scores.length
            }));

            const subtopicAverages = Array.from(subtopicPerformance.entries()).map(([id, scores]) => ({
                id,
                averageScore: scores.reduce((a, b) => a + b, 0) / scores.length
            }));

            // Calculate cognitive skills average
            const cognitiveSkills = {
                conceptual: 0,
                reasoning: 0,
                confidence: 0,
                application: 0,
                analysis: 0
            };

            let cognitiveCount = 0;
            studentSubmissions.forEach(sub => {
                if (sub.analysis) {
                    if (sub.analysis.conceptualUnderstanding) {
                        cognitiveSkills.conceptual += sub.analysis.conceptualUnderstanding === "Strong" ? 100 : sub.analysis.conceptualUnderstanding === "Moderate" ? 60 : 30;
                        cognitiveCount++;
                    }
                    if (sub.analysis.reasoningSkill) {
                        cognitiveSkills.reasoning += sub.analysis.reasoningSkill === "Logical" ? 100 : sub.analysis.reasoningSkill === "Superficial" ? 60 : 30;
                        cognitiveCount++;
                    }
                    if (sub.analysis.confidenceScore) {
                        cognitiveSkills.confidence += sub.analysis.confidenceScore === "High" ? 100 : sub.analysis.confidenceScore === "Medium" ? 60 : 30;
                        cognitiveCount++;
                    }
                }
            });

            if (cognitiveCount > 0) {
                Object.keys(cognitiveSkills).forEach(key => {
                    cognitiveSkills[key as keyof typeof cognitiveSkills] /= cognitiveCount;
                });
            }

            const overallScore = studentSubmissions.reduce((sum, s) => sum + s.score, 0) / studentSubmissions.length;

            studentAnalytics.push({
                id: student.id,
                name: student.name,
                rollNumber: student.rollNumber,
                division: student.division,
                overallScore: parseFloat(overallScore.toFixed(1)),
                chapterPerformance: chapterAverages,
                subtopicPerformance: subtopicAverages,
                cognitiveSkills,
                errorPatterns: studentSubmissions.flatMap(s => s.errorPatterns || []),
                quizzesTaken: studentSubmissions.length
            });
        }
    }

    // Calculate summary metrics
    const totalStudents = studentList.length;
    const averageScore = studentAnalytics.length > 0 ?
        studentAnalytics.reduce((sum, s) => sum + s.overallScore, 0) / studentAnalytics.length : 0;

    // Calculate class improvement (compare current vs previous 5 quizzes average)
    const allScores = allSubmissions.map(s => s.score).sort((a, b) => b - a);
    const currentAverage = allScores.slice(0, Math.min(5, allScores.length)).reduce((sum, score) => sum + score, 0) / Math.min(5, allScores.length);
    const previousAverage = allScores.slice(5, Math.min(10, allScores.length)).reduce((sum, score) => sum + score, 0) / Math.max(1, Math.min(5, allScores.length - 5));
    const classImprovement = previousAverage > 0 ? ((currentAverage - previousAverage) / previousAverage) * 100 : 0;

    // Get assigned quizzes count
    const assignedQuizzesQuery = query(collection(db, `assignedQuizzes/${classCode}/quizzes`), where("schoolCode", "==", schoolCode));
    const assignedQuizzesSnap = await getDocs(assignedQuizzesQuery);
    const quizzesTaken = assignedQuizzesSnap.size;

    // Calculate chapter-wise performance
    const chapterAnalyticsMap = new Map<string, number[]>();
    allSubmissions.forEach(sub => {
        const chapterName = textbookCache.get(sub.chapterId)?.name || sub.chapterId;
        const scores = chapterAnalyticsMap.get(chapterName) || [];
        scores.push(sub.score);
        chapterAnalyticsMap.set(chapterName, scores);
    });

    const chapterPerformance = Array.from(chapterAnalyticsMap.entries()).map(([name, scores]) => ({
        name,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        struggling: Math.round((scores.filter(s => s < 50).length / scores.length) * 100),
        maxScore: scores.length > 0 ? Math.max(...scores) : null,
        minScore: scores.length > 0 ? Math.min(...scores) : null,
        scores // include raw scores for possible future use
    }));

    // Find best and worst performing students for cognitive skills
    const sortedStudents = studentAnalytics.sort((a, b) => b.overallScore - a.overallScore);
    const bestStudent = sortedStudents[0];
    const worstStudent = sortedStudents[sortedStudents.length - 1];

    // Calculate cognitive skills distribution (class average)
    const cognitiveSkillsDistribution = [
        { skill: "Conceptual", value: studentAnalytics.reduce((sum, s) => sum + s.cognitiveSkills.conceptual, 0) / studentAnalytics.length },
        { skill: "Reasoning", value: studentAnalytics.reduce((sum, s) => sum + s.cognitiveSkills.reasoning, 0) / studentAnalytics.length },
        { skill: "Application", value: studentAnalytics.reduce((sum, s) => sum + s.cognitiveSkills.application, 0) / studentAnalytics.length },
        { skill: "Analysis", value: studentAnalytics.reduce((sum, s) => sum + s.cognitiveSkills.analysis, 0) / studentAnalytics.length },
        { skill: "Confidence", value: studentAnalytics.reduce((sum, s) => sum + s.cognitiveSkills.confidence, 0) / studentAnalytics.length },
    ];

    // Find common mistakes
    const allErrorPatterns = allSubmissions.flatMap(s => s.errorPatterns || []);
    const errorCounts = allErrorPatterns.reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const commonMistakes = Object.entries(errorCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 4)
        .map(([text, count]) => ({
            text,
            severity: (count as number) > totalStudents * 0.5 ? "High" : (count as number) > totalStudents * 0.3 ? "Medium" : "Low",
            percent: Math.round(((count as number) / totalStudents) * 100)
        }));

    // Find students needing attention (any subtopic < 50%)
    const needsAttention = await Promise.all(studentAnalytics
        .filter(student => student.subtopicPerformance.some((sub: any) => sub.averageScore < 50))
        .map(async student => {
            // For each struggling subtopic, include id, name, averageScore, parentChapter, errors, and trend
            const strugglingSubtopics = await Promise.all(
                student.subtopicPerformance
                    .filter((sub: any) => sub.averageScore < 50)
                    .map(async (sub: any) => {
                        // Resolve subtopic name and parent chapter from Firestore if not present
                        let subtopicName = sub.name;
                        let parentChapter = sub.parentChapter || '';
                        let chapterId = '';
                        if (!subtopicName || !parentChapter) {
                            // Try to find the submission for this subtopic to get chapterId
                            const submission = allSubmissions.find(s => s.studentId === student.id && s.subtopicId === sub.id);
                            if (submission) {
                                chapterId = submission.chapterId;
                                if (!parentChapter && textbookCache.has(chapterId)) {
                                    parentChapter = textbookCache.get(chapterId)?.name || '';
                                }
                                if (!subtopicName && chapterId && submission.subjectCode) {
                                    // Fetch subtopic name from Firestore
                                    try {
                                        const subtopicDoc = await getDoc(doc(db, `textbook/${submission.subjectCode}/chapters/${chapterId}/subtopics/${sub.id}`));
                                        if (subtopicDoc.exists()) {
                                            subtopicName = subtopicDoc.data().title || sub.id;
                                        }
                                    } catch (e) {
                                        // fallback to id
                                    }
                                }
                            }
                        }
                        // Collect all performance scores for this subtopic for this student
                        const subtopicSubmissions = allSubmissions.filter(s => s.studentId === student.id && s.subtopicId === sub.id);
                        const trend = subtopicSubmissions.map(s => ({
                            date: s.lastAttempted?.toDate?.() ? s.lastAttempted.toDate().toLocaleDateString() : new Date(s.lastAttempted).toLocaleDateString(),
                            score: s.score
                        }));
                        // Collect all error patterns for this subtopic for this student
                        let errors: any[] = [];
                        subtopicSubmissions.forEach(s => {
                            // Get errors from the quiz analysis for this specific submission
                            if (s.analysis && s.analysis.errorPatterns && Array.isArray(s.analysis.errorPatterns)) {
                                // Debug: log the error patterns to see their structure
                                console.log(`Error patterns for subtopic ${sub.id}:`, s.analysis.errorPatterns);

                                // Only include errors that are relevant to this subtopic
                                // Since we're already filtering by subtopic submissions, these errors should be relevant
                                // But we can add additional filtering if error patterns have subtopic info
                                const relevantErrors = s.analysis.errorPatterns.filter((err: any) => {
                                    // If error has subtopic info, check if it matches
                                    if (err.subtopicId && err.subtopicId !== sub.id) {
                                        return false;
                                    }
                                    if (err.subtopic && err.subtopic !== sub.name) {
                                        return false;
                                    }
                                    // If no subtopic info, include it (since it's from this subtopic's submission)
                                    return true;
                                });

                                errors.push(...relevantErrors);
                            }
                        });
                        // Deduplicate errors (by string or by .text property)
                        const seen = new Set();
                        errors = errors.filter(err => {
                            const key = typeof err === 'string' ? err : err.text || JSON.stringify(err);
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });

                        console.log(`Final errors for subtopic ${sub.id}:`, errors);
                        return {
                            id: sub.id,
                            name: subtopicName || sub.id,
                            averageScore: sub.averageScore,
                            parentChapter: parentChapter || '',
                            errors,
                            trend
                        };
                    })
            );
            return {
                ...student,
                strugglingSubtopics
            };
        }));

    // Find top performers (all subtopics > 50% and overall > 85%)
    const topPerformers = studentAnalytics
        .filter(student =>
            student.subtopicPerformance.every((sub: any) => sub.averageScore > 50) &&
            student.overallScore > 85
        )
        .slice(0, 5);

    // Enhanced student leaderboard with all required data
    const enhancedStudentList = studentAnalytics.map(student => {
        const bestChapter = student.chapterPerformance.reduce((a: any, b: any) => a.averageScore > b.averageScore ? a : b);
        const worstChapter = student.chapterPerformance.reduce((a: any, b: any) => a.averageScore < b.averageScore ? a : b);

        return {
            ...student,
            bestChapter: bestChapter.name,
            worstChapter: worstChapter.name,
            bestChapterScore: bestChapter.averageScore,
            worstChapterScore: worstChapter.averageScore,
            commonErrors: student.errorPatterns.slice(0, 3)
        };
    });

    return {
        // Summary cards data
        summary: {
            averageScore: Math.round(averageScore),
            quizzesTaken,
            classImprovement: Math.round(classImprovement),
            totalStudents
        },
        // Add subjectCode for teacher
        subjectCode,
        // Cognitive skills distribution
        cognitiveSkillsDistribution,
        bestStudent,
        worstStudent,

        // Common mistakes
        commonMistakes,

        // Student lists
        needsAttention,
        topPerformers,

        // Chapter performance
        chapterPerformance,

        // Enhanced student leaderboard
        studentList: enhancedStudentList,

        // Filter options
        divisions: [...new Set(studentList.map(s => s.division))],
        chapters: chapterPerformance.map(c => c.name),
        commonErrors: [...new Set(allErrorPatterns)]
    };
};

/**
 * Fetches all previous quiz attempts by a student for a specific chapter (and optionally subtopic).
 * Returns an array of DetailedSubmission objects, sorted by lastAttempted (oldest to newest).
 */
export const getStudentChapterQuizAttempts = async (
    studentId: string,
    subjectCode: string,
    chapterId: string,
    subtopicId?: string
): Promise<DetailedSubmission[]> => {
    const submissionsSummaryRef = collection(db, `students/${studentId}/submissions`);
    let q = query(submissionsSummaryRef, where("subjectCode", "==", subjectCode), where("chapterId", "==", chapterId));
    if (subtopicId) {
        q = query(q, where("subtopicId", "==", subtopicId));
    }
    const summarySnap = await getDocs(q);
    if (summarySnap.empty) return [];
    const submissionSummaries: SubmissionSummary[] = summarySnap.docs.map(doc => ({ ...doc.data() as SubmissionSummary, id: doc.id }));
    const detailedReportPromises = submissionSummaries.map(summary =>
        getDoc(doc(db, `quizActivations/${summary.id}/submissions`, studentId))
    );
    const detailedReportSnaps = await Promise.all(detailedReportPromises);
    const detailedReports: (DetailedSubmission & SubmissionSummary)[] = detailedReportSnaps
        .map((snap, index) => snap.exists() ? { ...snap.data() as DetailedSubmission, ...submissionSummaries[index] } : null)
        .filter((r): r is any => r !== null);
    detailedReports.sort((a, b) => a.lastAttempted.toDate().getTime() - b.lastAttempted.toDate().getTime());
    return detailedReports;
};

/**
 * Fetches user profile data for a student.
 * Returns the student's profile information including name, school, class, etc.
 */
export const getUserProfile = async (uid: string) => {
    const studentDocSnap = await getDoc(doc(db, "students", uid));
    if (!studentDocSnap.exists()) {
        throw new Error("Student profile not found.");
    }

    const studentData = studentDocSnap.data();
    return {
        name: studentData.name || "Student Name",
        email: studentData.email || "",
        schoolCode: studentData.schoolCode || "",
        schoolName: studentData.schoolName || "School Name",
        class: studentData.class || "Class",
        rollNumber: studentData.rollNumber || "Roll Number",
        division: studentData.division || "Division",
        createdAt: studentData.createdAt || null,
        lastLogin: studentData.lastLogin || null,
    };
};

// --- Subject-Specific Analytics Functions ---

export const getQuizSubmissions = async (quizId: string) => {
    try {
        const submissionsRef = collection(db, `quizActivations/${quizId}/submissions`);
        const submissionsSnap = await getDocs(submissionsRef);

        const submissions = submissionsSnap.docs.map(doc => ({
            studentId: doc.id,
            ...doc.data()
        }));

        return submissions;
    } catch (error) {
        console.error("Error fetching quiz submissions:", error);
        return [];
    }
};

export const getStudentSubjectAnalytics = async (uid: string, subjectCode: string) => {
    console.log(`Getting subject analytics for ${uid} in ${subjectCode}`);

    // Helper function to get all student submissions
    const getAllStudentSubmissions = async (uid: string) => {
        try {
            const quizActivationsRef = collection(db, "quizActivations");
            const quizActivationsSnap = await getDocs(quizActivationsRef);

            const allSubmissions: any[] = [];
            for (const quizActivationDoc of quizActivationsSnap.docs) {
                const quizId = quizActivationDoc.id;
                const submissionsRef = collection(db, `quizActivations/${quizId}/submissions`);
                const submissionsSnap = await getDocs(submissionsRef);

                const studentSubmission = submissionsSnap.docs.find(doc => doc.id === uid);
                if (studentSubmission && studentSubmission.exists()) {
                    const submissionData = studentSubmission.data();
                    allSubmissions.push({
                        id: quizId,
                        score: submissionData.analytics?.score || 0,
                        lastAttempted: submissionData.endTime || new Date(),
                        subjectCode: submissionData.sessionData?.assignment?.subjectCode || "Unknown",
                        chapterId: submissionData.sessionData?.assignment?.chapterId || "Unknown",
                        subtopicId: submissionData.sessionData?.assignment?.subtopicId || "Unknown",
                        analysis: submissionData.analysis || null,
                        analytics: submissionData.analytics,
                        sessionData: submissionData.sessionData,
                        answers: submissionData.answers
                    });
                }
            }

            return allSubmissions;
        } catch (error) {
            console.error("Error getting all student submissions:", error);
            return [];
        }
    };

    // Get all quiz submissions for this student
    const allSubmissions = await getAllStudentSubmissions(uid);

    // Filter submissions for this specific subject
    const subjectSubmissions = allSubmissions.filter(sub => sub.subjectCode === subjectCode);

    if (subjectSubmissions.length === 0) {
        return {
            subjectCode,
            subjectName: subjectCode,
            summary: {
                averageScore: 0,
                quizzesAttempted: 0,
                improvementRate: 0,
                timeEfficiency: 0
            },
            lastFiveComparison: {
                current: { score: 0, quizzes: 0 },
                previous: { score: 0, quizzes: 0 },
                change: { score: 0, quizzes: 0 }
            },
            chapterPerformance: [],
            progressOverTime: [],
            cognitiveInsights: [],
            strengths: [],
            weaknesses: [],
            cognitiveSkillSummary: null
        };
    }

    // Sort by date (newest to oldest)
    subjectSubmissions.sort((a, b) => {
        const dateA = a.lastAttempted?.toDate?.() || new Date(a.lastAttempted);
        const dateB = b.lastAttempted?.toDate?.() || new Date(b.lastAttempted);
        return dateB.getTime() - dateA.getTime();
    });

    // Calculate summary metrics
    const averageScore = subjectSubmissions.reduce((sum, sub) => sum + sub.score, 0) / subjectSubmissions.length;
    const quizzesAttempted = subjectSubmissions.length;

    // Calculate last 5 quizzes comparison
    const lastFiveQuizzes = subjectSubmissions.slice(0, 5);
    const previousFiveQuizzes = subjectSubmissions.slice(5, 10);

    const lastFiveAvg = lastFiveQuizzes.length > 0
        ? lastFiveQuizzes.reduce((sum, sub) => sum + sub.score, 0) / lastFiveQuizzes.length
        : 0;
    const previousFiveAvg = previousFiveQuizzes.length > 0
        ? previousFiveQuizzes.reduce((sum, sub) => sum + sub.score, 0) / previousFiveQuizzes.length
        : 0;

    const scoreChange = previousFiveAvg > 0 ? ((lastFiveAvg - previousFiveAvg) / previousFiveAvg) * 100 : 0;
    const quizChange = previousFiveQuizzes.length > 0
        ? ((lastFiveQuizzes.length - previousFiveQuizzes.length) / previousFiveQuizzes.length) * 100
        : 0;

    // Calculate improvement rate (overall trend)
    const firstHalf = subjectSubmissions.slice(Math.ceil(subjectSubmissions.length / 2));
    const secondHalf = subjectSubmissions.slice(0, Math.ceil(subjectSubmissions.length / 2));

    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, sub) => sum + sub.score, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, sub) => sum + sub.score, 0) / secondHalf.length : 0;

    const improvementRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    // Calculate time efficiency (average time per question)
    const totalQuestions = subjectSubmissions.reduce((sum, sub) => sum + (sub.analytics?.totalQuestions || 0), 0);
    const totalTime = subjectSubmissions.reduce((sum, sub) => {
        const startTime = sub.analytics?.startTime?.toDate?.() || new Date(sub.analytics?.startTime);
        const endTime = sub.analytics?.endTime?.toDate?.() || new Date(sub.analytics?.endTime);
        return sum + (endTime.getTime() - startTime.getTime());
    }, 0);

    const timeEfficiency = totalQuestions > 0 ? (totalTime / totalQuestions) / (1000 * 60) : 0; // in minutes

    // Group by chapters
    const chapterMap = new Map();
    subjectSubmissions.forEach(sub => {
        if (!chapterMap.has(sub.chapterId)) {
            chapterMap.set(sub.chapterId, []);
        }
        chapterMap.get(sub.chapterId).push(sub);
    });

    // Get chapter names from textbook
    const textbookCache = new Map();
    let resolvedSubjectName = subjectCode;
    try {
        const subjectDoc = await getDoc(doc(db, 'textbook', subjectCode));
        if (subjectDoc.exists()) {
            resolvedSubjectName = subjectDoc.data()["subject name"] || subjectDoc.data().name || subjectCode;
        }
        const chaptersSnap = await getDocs(collection(db, `textbook/${subjectCode}/chapters`));
        chaptersSnap.docs.forEach(doc => {
            textbookCache.set(doc.id, doc.data().chaptername || doc.id);
        });
    } catch (error) {
        console.error("Error fetching chapter/subject names:", error);
    }

    // Calculate chapter performance
    const chapterPerformancePromises = Array.from(chapterMap.entries()).map(async ([chapterId, submissions]: [string, any[]]) => {
        const chapterName = textbookCache.get(chapterId) || chapterId;
        const avgScore = submissions.reduce((sum: number, sub: any) => sum + sub.score, 0) / submissions.length;

        // Group by subtopics within this chapter
        const subtopicMap = new Map();
        submissions.forEach(sub => {
            if (!subtopicMap.has(sub.subtopicId)) {
                subtopicMap.set(sub.subtopicId, []);
            }
            subtopicMap.get(sub.subtopicId).push(sub);
        });

        // Get subtopic names
        const subtopicNames = new Map();
        try {
            const subtopicsSnap = await getDocs(collection(db, `textbook/${subjectCode}/chapters/${chapterId}/subtopics`));
            subtopicsSnap.docs.forEach(doc => {
                subtopicNames.set(doc.id, doc.data().title || doc.id);
            });
        } catch (error) {
            console.error("Error fetching subtopic names:", error);
        }

        const subtopics = Array.from(subtopicMap.entries()).map(([subtopicId, subSubmissions]: [string, any[]]) => {
            const subtopicName = subtopicNames.get(subtopicId) || subtopicId;
            const subtopicAvg = subSubmissions.reduce((sum: number, sub: any) => sum + sub.score, 0) / subSubmissions.length;
            return {
                id: subtopicId,
                name: subtopicName,
                averageScore: subtopicAvg,
                attempts: subSubmissions.length,
                trend: subSubmissions.map((s: any) => ({
                    date: s.lastAttempted?.toDate?.() || new Date(s.lastAttempted),
                    score: s.score,
                    timePerQuestion: s.analytics?.totalQuestions ?
                        ((s.analytics?.endTime?.toDate?.() || new Date(s.analytics?.endTime)).getTime() -
                            (s.analytics?.startTime?.toDate?.() || new Date(s.analytics?.startTime)).getTime()) /
                        (s.analytics?.totalQuestions * 1000 * 60) : 0
                }))
            };
        });

        // Find strongest subtopic (highest average)
        const sortedSubtopics = [...subtopics].sort((a: any, b: any) => b.averageScore - a.averageScore);
        const strongest = sortedSubtopics[0] && sortedSubtopics[0].averageScore > 50 ? sortedSubtopics[0] : null;
        // Find needs work subtopics (average < 50%)
        const needsWork = subtopics.filter((s: any) => s.averageScore < 50).map((s: any) => s.name);

        return {
            id: chapterId,
            name: chapterName,
            averageScore: avgScore,
            attempts: submissions.length,
            subtopics,
            strongest: strongest?.name || "N/A",
            needsWork,
            trend: submissions.map((s: any) => ({
                date: s.lastAttempted?.toDate?.() || new Date(s.lastAttempted),
                score: s.score
            }))
        };
    });

    const chapterPerformance = await Promise.all(chapterPerformancePromises);

    // Flatten all subtopics from all chapters into a single array
    const subtopicPerformance = chapterPerformance.flatMap(chapter =>
        (chapter.subtopics || []).map(sub => ({
            id: sub.id,
            name: sub.name,
            averageScore: sub.averageScore,
            parentChapter: chapter.name
        }))
    );

    // Generate cognitive insights
    const cognitiveInsights = [];
    const allAnalysis = subjectSubmissions.filter(sub => sub.analysis).map(sub => sub.analysis);

    if (allAnalysis.length > 0) {
        // Analyze error patterns
        const errorPatterns = allAnalysis.flatMap(analysis => analysis.errorPatterns || []);
        const commonErrors = errorPatterns.reduce((acc, error) => {
            acc[error] = (acc[error] || 0) + 1;
            return acc;
        }, {});

        // Find most common errors
        const topErrors = Object.entries(commonErrors)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([error]) => error);

        if (topErrors.length > 0) {
            cognitiveInsights.push(`Common errors: ${topErrors.join(', ')}`);
        }

        // Analyze conceptual understanding
        const conceptualScores = allAnalysis.map(a => a.conceptualUnderstanding);
        const weakConceptual = conceptualScores.filter(score => score === "Weak").length;
        if (weakConceptual > allAnalysis.length / 2) {
            cognitiveInsights.push("Struggles with conceptual understanding - needs more practice with fundamental concepts");
        }

        // Analyze time efficiency
        const timeEfficiencyScores = allAnalysis.map(a => a.timeEfficiency);
        const slowAccurate = timeEfficiencyScores.filter(score => score === "Slow & Accurate").length;
        if (slowAccurate > allAnalysis.length / 2) {
            cognitiveInsights.push("Takes longer time but maintains accuracy - consider time management strategies");
        }
    }

    let conceptualSum = 0, reasoningSum = 0, confidenceSum = 0, count = 0;
    allAnalysis.forEach(a => {
        if (a.conceptualUnderstanding) {
            conceptualSum += a.conceptualUnderstanding === "Strong" ? 100 : a.conceptualUnderstanding === "Moderate" ? 60 : 30;
            count++;
        }
        if (a.reasoningSkill) {
            reasoningSum += a.reasoningSkill === "Logical" ? 100 : a.reasoningSkill === "Superficial" ? 60 : 30;
        }
        if (a.confidenceScore) {
            confidenceSum += a.confidenceScore === "High" ? 100 : a.confidenceScore === "Medium" ? 60 : 30;
        }
    });
    const getQualitative = (score: number, labels: string[]): string => {
        if (score >= 85) return labels[0];
        if (score >= 60) return labels[1];
        return labels[2];
    };
    const cognitiveSkillSummary = count > 0 ? {
        conceptual: getQualitative(conceptualSum / count, ["Strong", "Moderate", "Weak"]),
        reasoning: getQualitative(reasoningSum / count, ["Logical", "Superficial", "Guesswork"]),
        confidence: getQualitative(confidenceSum / count, ["High", "Medium", "Low"])
    } : null;

    // Identify strengths and weaknesses
    const strengths = chapterPerformance
        .filter(chapter => chapter.averageScore >= 70)
        .map(chapter => chapter.name);

    const weaknesses = chapterPerformance
        .filter(chapter => chapter.averageScore < 50)
        .map(chapter => chapter.name);

    return {
        subjectCode,
        subjectName: resolvedSubjectName,
        summary: {
            averageScore: Math.round(averageScore),
            quizzesAttempted,
            improvementRate: Math.round(improvementRate),
            timeEfficiency: Math.round(timeEfficiency * 10) / 10
        },
        lastFiveComparison: {
            current: { score: Math.round(lastFiveAvg), quizzes: lastFiveQuizzes.length },
            previous: { score: Math.round(previousFiveAvg), quizzes: previousFiveQuizzes.length },
            change: { score: Math.round(scoreChange), quizzes: Math.round(quizChange) }
        },
        chapterPerformance,
        subtopicPerformance, // <-- add this line
        progressOverTime: (() => {
            // Calculate progress over time with quiz attempt index and cumulative averages
            const progressOverTime: any[] = [];
            const chapterCumulativeScores = new Map(); // chapterId -> cumulative scores array

            // Sort submissions by start time (oldest to newest)
            const sortedSubmissions = [...subjectSubmissions].sort((a, b) => {
                const dateA = a.analytics?.startTime?.toDate?.() || new Date(a.analytics?.startTime);
                const dateB = b.analytics?.startTime?.toDate?.() || new Date(b.analytics?.startTime);
                return dateA.getTime() - dateB.getTime();
            });

            // Initialize cumulative scores for each chapter
            sortedSubmissions.forEach(sub => {
                const chapterId = sub.chapterId;
                if (!chapterCumulativeScores.has(chapterId)) {
                    chapterCumulativeScores.set(chapterId, {
                        scores: [],
                        cumulativeAverage: 0
                    });
                }
            });

            // Process each quiz attempt chronologically
            sortedSubmissions.forEach((sub, attemptIndex) => {
                const chapterId = sub.chapterId;
                const chapterName = textbookCache.get(chapterId) || chapterId;

                // Update cumulative average for this chapter
                const chapterData = chapterCumulativeScores.get(chapterId);
                chapterData.scores.push(sub.score);
                chapterData.cumulativeAverage = chapterData.scores.reduce((sum: number, score: number) => sum + score, 0) / chapterData.scores.length;

                // Create data point for this attempt
                const dataPoint: any = {
                    attempt: attemptIndex + 1, // 1-based attempt index
                    date: `Attempt ${attemptIndex + 1}` // X-axis label
                };

                // Add cumulative averages for all chapters
                chapterCumulativeScores.forEach((chapterData, chapterId) => {
                    const chapterName = textbookCache.get(chapterId) || chapterId;
                    dataPoint[chapterName] = Math.round(chapterData.cumulativeAverage);
                });

                progressOverTime.push(dataPoint);
            });

            console.log("Progress over time data:", progressOverTime);
            console.log("Chapter cumulative scores:", Object.fromEntries(chapterCumulativeScores));

            return progressOverTime;
        })(),
        cognitiveInsights,
        strengths,
        weaknesses,
        cognitiveSkillSummary
    }
}

export const getStudentSubtopicProgress = async (studentId: string, subtopicName: string) => {
    try {
        console.log('=== SUBTOPIC PROGRESS DEBUG ===');
        console.log('Student ID:', studentId);
        console.log('Searching for subtopic:', subtopicName);

        // Get student analytics
        const analytics = await getStudentAnalytics(studentId);
        console.log('Analytics object keys:', Object.keys(analytics));
        console.log('Subtopic trends keys:', analytics.subtopicTrends ? Object.keys(analytics.subtopicTrends) : 'No subtopic trends');

        if (!analytics.subtopicTrends) {
            console.log('No subtopic trends found');
            return {
                progress: [],
                improvement: 'stable' as const,
                averageScore: 0,
                totalAttempts: 0
            };
        }

        // Try exact match first
        let progressData = (analytics.subtopicTrends as Record<string, { date: string; score: number }[]>)[subtopicName];

        // If exact match fails, try case-insensitive match
        if (!progressData) {
            console.log('Exact match failed, trying case-insensitive match');
            const subtopicKeys = Object.keys(analytics.subtopicTrends);
            const matchedKey = subtopicKeys.find(key =>
                key.toLowerCase() === subtopicName.toLowerCase() ||
                key.toLowerCase().includes(subtopicName.toLowerCase()) ||
                subtopicName.toLowerCase().includes(key.toLowerCase())
            );

            if (matchedKey) {
                console.log('Found match:', matchedKey);
                progressData = (analytics.subtopicTrends as Record<string, { date: string; score: number }[]>)[matchedKey];
            } else {
                console.log('No match found. Available subtopics:', subtopicKeys);

                // Try to find data in detailedAnalysisHistory as fallback
                if (analytics.detailedAnalysisHistory && analytics.detailedAnalysisHistory.length > 0) {
                    console.log('Trying to find data in detailedAnalysisHistory');
                    const matchingEntries = analytics.detailedAnalysisHistory.filter((entry: any) => {
                        const entrySubtopic = entry.subtopicId || entry.subtopicName || '';
                        return entrySubtopic.toLowerCase().includes(subtopicName.toLowerCase()) ||
                            subtopicName.toLowerCase().includes(entrySubtopic.toLowerCase());
                    });

                    if (matchingEntries.length > 0) {
                        console.log('Found matching entries in detailedAnalysisHistory:', matchingEntries.length);
                        progressData = matchingEntries.map((entry: any) => ({
                            date: new Date(entry.date).toLocaleDateString(),
                            score: entry.analysis?.performanceScore || entry.score || 0
                        }));
                    }
                }
            }
        }

        if (!progressData || progressData.length === 0) {
            console.log('No progress data found for this subtopic');

            // For demonstration purposes, let's check if we have any data at all
            if (analytics.subtopicTrends && Object.keys(analytics.subtopicTrends).length > 0) {
                console.log('Available subtopics with data:', Object.keys(analytics.subtopicTrends));
                // Return the first available subtopic data as a fallback
                const firstSubtopicKey = Object.keys(analytics.subtopicTrends)[0];
                const fallbackData = (analytics.subtopicTrends as Record<string, { date: string; score: number }[]>)[firstSubtopicKey];
                console.log('Using fallback data from:', firstSubtopicKey);

                return {
                    progress: fallbackData,
                    improvement: 'stable' as const,
                    averageScore: Math.round(fallbackData.reduce((sum: number, item: { date: string; score: number }) => sum + item.score, 0) / fallbackData.length),
                    totalAttempts: fallbackData.length
                };
            }

            return {
                progress: [],
                improvement: 'stable' as const,
                averageScore: 0,
                totalAttempts: 0
            };
        }

        // Calculate improvement trend
        let improvement: 'improving' | 'declining' | 'stable' = 'stable';
        if (progressData.length >= 2) {
            const recentScores = progressData.slice(-3); // Last 3 attempts
            const olderScores = progressData.slice(0, Math.max(0, progressData.length - 3)); // Earlier attempts

            if (recentScores.length > 0 && olderScores.length > 0) {
                const recentAverage = recentScores.reduce((sum: number, item: { date: string; score: number }) => sum + item.score, 0) / recentScores.length;
                const olderAverage = olderScores.reduce((sum: number, item: { date: string; score: number }) => sum + item.score, 0) / olderScores.length;

                if (recentAverage > olderAverage + 5) {
                    improvement = 'improving';
                } else if (recentAverage < olderAverage - 5) {
                    improvement = 'declining';
                }
            }
        }

        const averageScore = progressData.reduce((sum: number, item: { date: string; score: number }) => sum + item.score, 0) / progressData.length;

        return {
            progress: progressData,
            improvement,
            averageScore: Math.round(averageScore),
            totalAttempts: progressData.length
        };
    } catch (error) {
        console.error('Error fetching subtopic progress:', error);
        return {
            progress: [],
            improvement: 'stable' as const,
            averageScore: 0,
            totalAttempts: 0
        };
    }
};

// Fetch all student ratings for a particular date and compute average
export const getClassRatingsForDate = async (subjectCode: string, date: string) => {
    const studentRatingsRef = collection(db, `classRating/${subjectCode}/dailyRatings/${date}/studentRatings`);
    const studentRatingsSnap = await getDocs(studentRatingsRef);
    const ratings = studentRatingsSnap.docs.map(doc => doc.data().rating).filter(r => typeof r === 'number');
    const count = ratings.length;
    const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;
    return { average, count, ratings };
};

// Utility function to map IDs to names
async function mapQuizIdsToNames(subjectCode: string, chapterId: string, subtopicId: string) {
    let subjectName = subjectCode;
    let chapterName = chapterId;
    let subtopicName = subtopicId;
    try {
        const subjectDoc = await getDoc(doc(db, 'textbook', subjectCode));
        if (subjectDoc.exists()) {
            subjectName = subjectDoc.data()["subject name"] || subjectDoc.data().name || subjectCode;
        }
        const chapterDoc = await getDoc(doc(db, `textbook/${subjectCode}/chapters/${chapterId}`));
        if (chapterDoc.exists()) {
            chapterName = chapterDoc.data().chaptername || chapterId;
        }
        const subtopicDoc = await getDoc(doc(db, `textbook/${subjectCode}/chapters/${chapterId}/subtopics/${subtopicId}`));
        if (subtopicDoc.exists()) {
            subtopicName = subtopicDoc.data().title || subtopicId;
        }
    } catch (e) {
        // fallback to code/ID
    }
    return { subjectName, chapterName, subtopicName };
}
