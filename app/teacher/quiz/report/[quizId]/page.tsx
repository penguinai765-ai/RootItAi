"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTeacherDashboardData, getAssignedQuizzes, getStudentAnalytics, getQuizSubmissions, getStudentSubtopicProgress } from "@/lib/firestoreService";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Area,
    AreaChart,
} from "recharts";
import {
    ArrowLeft,
    Users,
    CheckCircle,
    XCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    Filter,
    BookOpen,
    Target,
    Clock,
    Award,
    AlertCircle,
} from "lucide-react";
import LoadingLottie from "@/components/LoadingLottie";

interface StudentData {
    id: string;
    name: string;
    rollNumber: string;
    division: string;
    attended: boolean;
    score?: number;
    submittedAt?: Date;
    timeTaken?: number;
}

interface QuizReportData {
    quizId: string;
    subjectName: string;
    subjectCode: string;
    chapterName: string;
    chapterId: string;
    subtopicName: string;
    subtopicId: string;
    assignedDate: Date;
    deadline: Date;
    totalStudents: number;
    attendedCount: number;
    averageScore: number;
    students: StudentData[];
    divisions: string[];
}

interface StudentProgressData {
    date: string;
    score: number;
    improvement: 'improving' | 'declining' | 'stable';
}

interface SubtopicProgressData {
    progress: { date: string; score: number }[];
    improvement: 'improving' | 'declining' | 'stable';
    averageScore: number;
    totalAttempts: number;
}

interface SubtopicProgressData {
    progress: { date: string; score: number }[];
    improvement: 'improving' | 'declining' | 'stable';
    averageScore: number;
    totalAttempts: number;
}

export default function QuizReportPage() {
    const { user } = useAuth();
    const params = useParams();
    const quizId = params.quizId as string;

    const [reportData, setReportData] = useState<QuizReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDivision, setSelectedDivision] = useState<string>('all');
    const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
    const [studentProgress, setStudentProgress] = useState<StudentProgressData[]>([]);
    const [subtopicProgress, setSubtopicProgress] = useState<SubtopicProgressData | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);

    useEffect(() => {
        if (user && quizId) {
            fetchQuizReport();
        }
    }, [user, quizId]);

    const fetchQuizReport = async () => {
        try {
            setLoading(true);

            // Get teacher info
            const teacherData = await getTeacherDashboardData(user!.uid);
            const classCode = teacherData.classCode;

            // Get school code from user mapping
            const userDocSnap = await getDoc(doc(db, "users", user!.uid));
            const userData = userDocSnap.data();
            const schoolCode = userData?.schoolCode;

            // Get all assigned quizzes to find the specific quiz
            const allQuizzes = await getAssignedQuizzes(user!.uid);
            const targetQuiz = allQuizzes.find(q => q.id === quizId);

            if (!targetQuiz) {
                throw new Error("Quiz not found");
            }

            // Get all students in the class
            const studentsQuery = query(
                collection(db, "students"),
                where("class", "==", classCode),
                where("schoolCode", "==", schoolCode)
            );
            const studentsSnap = await getDocs(studentsQuery);
            const allStudents = studentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Get quiz submissions from quizActivations
            const submissions = await getQuizSubmissions(quizId);

            const studentData: StudentData[] = allStudents.map(student => {
                const submission = submissions.find((sub: any) => sub.studentId === student.id);
                if (submission) {
                    return {
                        id: student.id,
                        name: student.name,
                        rollNumber: student.rollNumber,
                        division: student.division,
                        attended: true,
                        score: (submission as any).analytics?.score || 0,
                        submittedAt: (submission as any).endTime?.toDate() || new Date(),
                        timeTaken: (submission as any).analytics?.timeTaken || 0
                    };
                } else {
                    return {
                        id: student.id,
                        name: student.name,
                        rollNumber: student.rollNumber,
                        division: student.division,
                        attended: false
                    };
                }
            });

            const attendedStudents = studentData.filter(s => s.attended);
            const averageScore = attendedStudents.length > 0
                ? attendedStudents.reduce((sum, s) => sum + (s.score || 0), 0) / attendedStudents.length
                : 0;

            const divisions = [...new Set(studentData.map(s => s.division))];

            setReportData({
                quizId,
                subjectName: targetQuiz.subjectName,
                subjectCode: targetQuiz.subjectCode,
                chapterName: targetQuiz.chapterName,
                chapterId: targetQuiz.chapterId,
                subtopicName: targetQuiz.subtopicName,
                subtopicId: targetQuiz.subtopicId,
                assignedDate: targetQuiz.assignedDate,
                deadline: targetQuiz.deadline,
                totalStudents: studentData.length,
                attendedCount: attendedStudents.length,
                averageScore,
                students: studentData,
                divisions
            });

        } catch (err: any) {
            setError(err.message || 'Failed to load quiz report');
            console.error('Error fetching quiz report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentProgress = async (studentId: string) => {
        try {
            console.log('=== FETCH STUDENT PROGRESS DEBUG ===');
            console.log('Student ID:', studentId);
            console.log('Report Data:', reportData);
            console.log('Subtopic Name:', reportData?.subtopicName);
            console.log('Subtopic ID:', reportData?.subtopicId);

            // Try to get the actual subtopic name from the database
            let actualSubtopicName = reportData?.subtopicName || '';

            // If we have a subtopicId, try to get the actual name from the database
            if (reportData?.subtopicId && reportData?.subjectCode) {
                try {
                    const subtopicDoc = await getDoc(doc(db, "textbook", reportData.subjectCode, "chapters", reportData.chapterId, "subtopics", reportData.subtopicId));
                    if (subtopicDoc.exists()) {
                        actualSubtopicName = subtopicDoc.data().title || reportData.subtopicName;
                        console.log('Found actual subtopic name:', actualSubtopicName);
                    }
                } catch (error) {
                    console.log('Error fetching subtopic name from database:', error);
                }
            }

            // Get student's subtopic progress using the new function
            const progress = await getStudentSubtopicProgress(studentId, actualSubtopicName);

            // Convert the progress data to the format expected by the chart
            const progressWithTrend = progress.progress.map((entry: { date: string; score: number }, index: number) => {
                if (index === 0) {
                    return {
                        date: entry.date,
                        score: entry.score,
                        improvement: 'stable' as const
                    };
                }

                const currentScore = entry.score;
                const previousScore = progress.progress[index - 1].score;
                const difference = currentScore - previousScore;

                let improvement: 'improving' | 'declining' | 'stable';
                if (difference > 5) improvement = 'improving';
                else if (difference < -5) improvement = 'declining';
                else improvement = 'stable';

                return {
                    date: entry.date,
                    score: entry.score,
                    improvement
                };
            });

            setStudentProgress(progressWithTrend);
            setSubtopicProgress(progress);
        } catch (err) {
            console.error('Error fetching student progress:', err);
            setStudentProgress([]);
            setSubtopicProgress(null);
        }
    };

    const handleStudentClick = async (student: StudentData) => {
        setSelectedStudent(student);
        await fetchStudentProgress(student.id);
        setShowProgressModal(true);
    };

    const filteredStudents = reportData?.students.filter(student =>
        selectedDivision === 'all' || student.division === selectedDivision
    ) || [];

    const attendedStudents = filteredStudents.filter(s => s.attended);
    const nonAttendedStudents = filteredStudents.filter(s => !s.attended);

    // Group students by performance
    const highPerformers = attendedStudents.filter(s => (s.score || 0) >= 80);
    const averagePerformers = attendedStudents.filter(s => (s.score || 0) >= 50 && (s.score || 0) < 80);
    const lowPerformers = attendedStudents.filter(s => (s.score || 0) < 50);

    const getImprovementIcon = (improvement: string) => {
        switch (improvement) {
            case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
            default: return <Minus className="w-4 h-4 text-gray-500" />;
        }
    };

    const getImprovementText = (improvement: string) => {
        switch (improvement) {
            case 'improving': return 'Improving';
            case 'declining': return 'Declining';
            default: return 'Stable';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoadingLottie message="Loading quiz report..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Report</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Link href="/teacher/dashboard" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Quiz Not Found</h2>
                    <Link href="/teacher/dashboard" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <Link href="/teacher/dashboard" className="text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="w-6 h-6" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Quiz Report</h1>
                                <p className="text-sm text-gray-500">
                                    {reportData.subjectName} - {reportData.chapterName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Overall Performance</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {Math.round(reportData.averageScore)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quiz Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Users className="w-8 h-8 text-blue-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Students</p>
                                <p className="text-2xl font-bold text-gray-900">{reportData.totalStudents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Attended</p>
                                <p className="text-2xl font-bold text-gray-900">{reportData.attendedCount}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <XCircle className="w-8 h-8 text-red-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Not Attended</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {reportData.totalStudents - reportData.attendedCount}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Target className="w-8 h-8 text-purple-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Average Score</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {Math.round(reportData.averageScore)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
                            <div className="flex items-center space-x-2">
                                <Filter className="w-4 h-4 text-gray-500" />
                                <select
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="all">All Divisions</option>
                                    {reportData.divisions.map(division => (
                                        <option key={division} value={division}>Division {division}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-green-700">High Performers</p>
                                        <p className="text-2xl font-bold text-green-900">{highPerformers.length}</p>
                                        <p className="text-xs text-green-600">Score ≥ 80%</p>
                                    </div>
                                    <Award className="w-8 h-8 text-green-600" />
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-yellow-700">Average</p>
                                        <p className="text-2xl font-bold text-yellow-900">{averagePerformers.length}</p>
                                        <p className="text-xs text-yellow-600">Score 50-79%</p>
                                    </div>
                                    <Minus className="w-8 h-8 text-yellow-600" />
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-red-700">Need Support</p>
                                        <p className="text-2xl font-bold text-red-900">{lowPerformers.length}</p>
                                        <p className="text-xs text-red-600">Score &lt; 50%</p>
                                    </div>
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                            </div>


                        </div>
                    </div>
                </div>

                {/* Student Performance Details */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Student Performance Details</h2>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">
                                    Showing {filteredStudents.length} of {reportData.totalStudents} students
                                </span>
                            </div>
                        </div>
                    </div>



                    {/* Low Performers Section */}
                    {lowPerformers.length > 0 && (
                        <div className="p-6 border-t bg-red-50">
                            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                                Students Needing Support ({lowPerformers.length})
                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                    Score &lt; 50%
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {lowPerformers.map((student) => (
                                    <div
                                        key={student.id}
                                        onClick={() => handleStudentClick(student)}
                                        className="bg-white border border-red-300 rounded-lg p-4 cursor-pointer hover:bg-red-50 transition-colors shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                            <span className="text-sm text-gray-500">Roll: {student.rollNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-600">Division {student.division}</span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg font-bold text-red-600">
                                                    {Math.round(student.score ?? 0)}%
                                                </span>
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            </div>
                                        </div>
                                        {student.timeTaken && (
                                            <div className="flex items-center text-xs text-gray-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {Math.round(student.timeTaken / 60)} min
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-red-600 font-medium">
                                            Click to view detailed progress
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Average Performers Section */}
                    {averagePerformers.length > 0 && (
                        <div className="p-6 border-t">
                            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                <Minus className="w-5 h-5 text-yellow-500 mr-2" />
                                Average Performance ({averagePerformers.length})
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                    50-79%
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {averagePerformers.map((student) => (
                                    <div
                                        key={student.id}
                                        onClick={() => handleStudentClick(student)}
                                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                            <span className="text-sm text-gray-500">Roll: {student.rollNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Division {student.division}</span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg font-bold text-yellow-600">
                                                    {Math.round(student.score ?? 0)}%
                                                </span>
                                                <Minus className="w-4 h-4 text-yellow-500" />
                                            </div>
                                        </div>
                                        {student.timeTaken && (
                                            <div className="flex items-center mt-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {Math.round(student.timeTaken / 60)} min
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* High Performers Section */}
                    {highPerformers.length > 0 && (
                        <div className="p-6 border-t">
                            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                <Award className="w-5 h-5 text-green-500 mr-2" />
                                High Performers ({highPerformers.length})
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    Score ≥ 80%
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {highPerformers.map((student) => (
                                    <div
                                        key={student.id}
                                        onClick={() => handleStudentClick(student)}
                                        className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                            <span className="text-sm text-gray-500">Roll: {student.rollNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Division {student.division}</span>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg font-bold text-green-600">
                                                    {Math.round(student.score ?? 0)}%
                                                </span>
                                                <Award className="w-4 h-4 text-green-500" />
                                            </div>
                                        </div>
                                        {student.timeTaken && (
                                            <div className="flex items-center mt-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {Math.round(student.timeTaken / 60)} min
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Non-Attended Students */}
                    {nonAttendedStudents.length > 0 && (
                        <div className="p-6 border-t">
                            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                                Not Attended ({nonAttendedStudents.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {nonAttendedStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                            <span className="text-sm text-gray-500">Roll: {student.rollNumber}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Division {student.division}</span>
                                            <span className="text-sm text-red-600 font-medium">Not Submitted</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Student Progress Modal */}
            {showProgressModal && selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedStudent.name}'s Progress
                                </h2>
                                <button
                                    onClick={() => setShowProgressModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                Performance in {reportData.subtopicName}
                            </p>
                        </div>

                        <div className="p-6">
                            {studentProgress.length > 0 ? (
                                <div>
                                    {/* Progress Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-blue-700">Average Score</p>
                                                    <p className="text-2xl font-bold text-blue-900">{subtopicProgress?.averageScore || 0}%</p>
                                                </div>
                                                <Target className="w-8 h-8 text-blue-600" />
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-green-700">Total Attempts</p>
                                                    <p className="text-2xl font-bold text-green-900">{subtopicProgress?.totalAttempts || 0}</p>
                                                </div>
                                                <BookOpen className="w-8 h-8 text-green-600" />
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-lg border ${subtopicProgress?.improvement === 'improving'
                                            ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                                            : subtopicProgress?.improvement === 'declining'
                                                ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
                                                : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Trend</p>
                                                    <p className={`text-2xl font-bold ${subtopicProgress?.improvement === 'improving' ? 'text-green-900' :
                                                        subtopicProgress?.improvement === 'declining' ? 'text-red-900' : 'text-gray-900'
                                                        }`}>
                                                        {getImprovementText(subtopicProgress?.improvement || 'stable')}
                                                    </p>
                                                </div>
                                                {getImprovementIcon(subtopicProgress?.improvement || 'stable')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Chart */}
                                    <div className="h-64 mb-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={studentProgress}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    formatter={(value: any) => [`${value}%`, 'Score']}
                                                    labelFormatter={(label) => `Date: ${label}`}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="score"
                                                    stroke="#8B5CF6"
                                                    fill="#8B5CF6"
                                                    fillOpacity={0.3}
                                                    strokeWidth={2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Detailed Progress Analysis */}
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-purple-600" />
                                            Detailed Progress Analysis
                                        </h3>
                                        {studentProgress.map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-purple-700">{index + 1}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-900">{entry.date}</span>
                                                        <span className="ml-2 text-sm text-gray-500">Score: {entry.score}%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {getImprovementIcon(entry.improvement)}
                                                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${entry.improvement === 'improving' ? 'bg-green-100 text-green-700' :
                                                        entry.improvement === 'declining' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {getImprovementText(entry.improvement)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Improvement Insights */}
                                    {subtopicProgress && (
                                        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <Award className="w-5 h-5 text-purple-600" />
                                                Performance Insights
                                            </h4>
                                            <div className="text-sm text-gray-700 space-y-1">
                                                {subtopicProgress.improvement === 'improving' && (
                                                    <p>🎉 Great job! {selectedStudent?.name} is showing consistent improvement in this subtopic.</p>
                                                )}
                                                {subtopicProgress.improvement === 'declining' && (
                                                    <p>⚠️ {selectedStudent?.name} may need additional support in this subtopic.</p>
                                                )}
                                                {subtopicProgress.improvement === 'stable' && (
                                                    <p>📊 {selectedStudent?.name} is maintaining a stable performance in this subtopic.</p>
                                                )}
                                                <p>Average score: <span className="font-semibold">{subtopicProgress.averageScore}%</span> across {subtopicProgress.totalAttempts} attempts.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No progress data available for this subtopic</p>
                                    <p className="text-sm text-gray-400 mt-2">The student hasn't taken any quizzes for this subtopic yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 