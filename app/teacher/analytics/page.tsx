"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTeacherAnalytics } from "@/lib/firestoreService";
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Cell,
    Legend,
    LineChart,
    Line,
} from "recharts";
import {
    Brain,
    TrendingUp,
    Clock,
    Target,
    Users,
    BookOpen,
    Eye,
    Trophy,
    Award,
    Flame,
    AlertTriangle,
    ChevronRight,
    FileText,
    Play,
    BarChart3,
    User,
    CheckCircle,
    Calendar,
    ArrowLeft,
} from "lucide-react";
import Modal from "react-modal";
import Link from "next/link";
import LoadingLottie from "@/components/LoadingLottie";

// Helper functions for styling
const masteryColor = (level: string) =>
    level === "High" ? "bg-green-100 text-green-700" : level === "Moderate" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700";

const severityColor = (sev: string) =>
    sev === "High" ? "bg-red-100 text-red-700" : sev === "Medium" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";

const statusColor = (status: string) =>
    status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";

const diffColor = (diff: string) =>
    diff === "easy" ? "bg-green-100 text-green-700" : diff === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

// Mock student detail data for modal (keep this for now)
const studentDetail = {
    name: "Sneha Reddy",
    overallScore: 94,
    improvement: 12,
    quizzes: 12,
    mastery: "High Mastery",
    confidence: "High Confidence",
    pace: "Fast Pace",
    progress: [
        { quiz: "Quiz 1", score: 78 },
        { quiz: "Quiz 2", score: 84 },
        { quiz: "Quiz 3", score: 89 },
        { quiz: "Quiz 4", score: 94 },
    ],
    cognitive: [
        { skill: "Conceptual", value: 100 },
        { skill: "Confidence", value: 80 },
        { skill: "Reasoning", value: 90 },
    ],
    chapterPerf: [
        { name: "Light & Shadows", score: 98 },
        { name: "Combustion", score: 92 },
        { name: "Kharif Crops", score: 95 },
        { name: "Water Cycle", score: 92 },
    ],
    improvements: ["Very rare calculation errors"],
};

// Helper to get weak chapters and subtopics
function getWeakChaptersAndSubtopics(student: any) {
    const weakChapters = (student.chapterPerformance || []).filter((c: any) => c.averageScore < 50);
    let weakSubtopics: { chapter: string; subtopics: { name: string; score: number; id?: string; parentChapter?: string }[] }[] = [];
    if (student.subtopicPerformance) {
        for (const chapter of weakChapters) {
            // Find subtopics for this chapter with <50% (case-insensitive, trimmed)
            const subtopics = (student.subtopicPerformance || [])
                .filter((s: any) =>
                    s.parentChapter &&
                    s.parentChapter.toLowerCase().trim() === chapter.name.toLowerCase().trim() &&
                    s.averageScore < 50
                )
                .map((s: any) => ({
                    name: s.name,
                    score: Math.round(s.averageScore),
                    id: s.id,
                    parentChapter: s.parentChapter
                }));
            weakSubtopics.push({ chapter: chapter.name, subtopics });
        }
    }
    // Debug log
    if (typeof window !== 'undefined') {
        console.log('DEBUG getWeakChaptersAndSubtopics:', { weakChapters, weakSubtopics, subtopicPerformance: student.subtopicPerformance });
    }
    return { weakChapters, weakSubtopics };
}

// Helper to map student analytics for the modal, focusing on weak subtopics
function mapModalStudentData(student: any, analytics: any) {
    // Chapter performance
    const chapterPerformance = Array.isArray(student.chapterPerformance)
        ? student.chapterPerformance.map((c: any) => ({
            name: c.name,
            averageScore: c.averageScore,
        }))
        : [];

    // Subtopic performance (if available)
    const subtopicPerformance = Array.isArray(student.subtopicPerformance)
        ? student.subtopicPerformance.map((s: any) => ({
            name: s.name || s.id,
            averageScore: s.averageScore,
            parentChapter: s.parentChapter || '',
            id: s.id
        }))
        : [];

    // Identify weak subtopics (<50%)
    const weakSubtopics = subtopicPerformance.filter((s: any) => s.averageScore < 50);

    // For each weak subtopic, get score history (if available)
    let weakSubtopicTrends: { name: string; parentChapter: string; trend: { date: string; score: number }[] }[] = [];
    if (analytics && analytics.subtopicTrends) {
        const trendKeys = Object.keys(analytics.subtopicTrends);
        // For debugging: log available keys and what is being searched for
        // Debugging logs removed and 'any' type replaced with explicit type for 'sub'
        weakSubtopics.forEach((sub: { name: string; averageScore: number; parentChapter: string; id: string }) => {
            let trend =
                analytics.subtopicTrends[sub.name] ||
                analytics.subtopicTrends[sub.id] ||
                analytics.subtopicTrends[sub.name?.toLowerCase()] ||
                analytics.subtopicTrends[sub.id?.toLowerCase()];
            // Try partial/case-insensitive match if no direct match
            if (!trend) {
                const foundKey = trendKeys.find(
                    k =>
                        k.toLowerCase() === sub.name?.toLowerCase() ||
                        k.toLowerCase() === sub.id?.toLowerCase() ||
                        k.toLowerCase().includes(sub.name?.toLowerCase()) ||
                        sub.name?.toLowerCase().includes(k.toLowerCase())
                );
                if (foundKey) trend = analytics.subtopicTrends[foundKey];
            }
            // If trend is an object, convert to array
            if (trend && !Array.isArray(trend) && typeof trend === 'object') {
                trend = Object.values(trend);
            }
            if (!trend) {
                if (typeof window !== 'undefined') {
                    console.warn('No trend found for subtopic', sub.name, sub.id);
                }
            }
            weakSubtopicTrends.push({
                name: sub.name,
                parentChapter: sub.parentChapter,
                trend: Array.isArray(trend) ? trend : []
            });
        });
    }

    // Prepare progress chart data: flatten all weak subtopic trends into one array, with subtopic name
    const progress = weakSubtopicTrends.length > 0
        ? weakSubtopicTrends.flatMap(sub =>
            sub.trend.map((t, i) => ({
                subtopic: sub.name,
                parentChapter: sub.parentChapter,
                attempt: i + 1,
                date: t.date,
                score: t.score
            }))
        )
        : [];

    // Cognitive skills (map to radar chart format)
    const cognitiveSkills = student.cognitiveSkills
        ? Object.entries(student.cognitiveSkills).map(([skill, value]) => ({
            skill,
            value: typeof value === 'number' ? Math.round(value) : 0
        }))
        : [];

    // Quizzes taken
    const quizzesTaken = typeof student.quizzesTaken === 'number' ? student.quizzesTaken : progress.length;

    // Mastery/overall score
    const overallScore = typeof student.overallScore === 'number' ? student.overallScore : 0;

    // Improvements/weaknesses
    const improvements = student.improvements || [];

    return {
        ...student,
        chapterPerformance,
        subtopicPerformance,
        weakSubtopics,
        weakSubtopicTrends,
        progress,
        cognitiveSkills,
        quizzesTaken,
        overallScore,
        improvements,
    };
}

// Helper to pivot progress data for grouped bar chart
function pivotProgressData(progress: any[]) {
    if (!Array.isArray(progress) || progress.length === 0) return [];
    const attempts = [...new Set(progress.map(d => d.attempt))];
    const subtopics = [...new Set(progress.map(d => d.subtopic))];
    return attempts.map(attempt => {
        const row: any = { attempt };
        subtopics.forEach(sub => {
            const found = progress.find(d => d.attempt === attempt && d.subtopic === sub);
            row[sub] = found ? found.score : null;
        });
        return row;
    });
}

// Helper to get a color for each subtopic
function getColorForSubtopic(subtopic: string) {
    const colors = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#F97316", "#EC4899", "#06B6D4"];
    let hash = 0;
    for (let i = 0; i < subtopic.length; i++) hash = subtopic.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// Helper to get common errors for a subtopic
function getCommonErrorsForSubtopic(student: any, subtopicName: string) {
    if (!student.errorPatterns) return [];
    // Try to filter error patterns by subtopic name if possible
    return student.errorPatterns.filter((err: any) => {
        if (err.subtopic && typeof err.subtopic === 'string') {
            return err.subtopic.toLowerCase() === subtopicName.toLowerCase();
        }
        return true; // fallback: include all if not specified
    });
}

// For the leaderboard, get the subject code (from analytics or student)
function getSubjectCodeForStudent(student: any, analytics: any) {
    // Try to get from analytics, fallback to student
    return analytics?.subjectCode || student.subjectCode || '';
}

export default function TeacherAnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState<any>(null);
    const [strugglingModalOpen, setStrugglingModalOpen] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState("");
    const [strugglingStudents, setStrugglingStudents] = useState<any[]>([]);

    // Filtering state
    const [divisionFilter, setDivisionFilter] = useState<string>("");
    const [chapterFilter, setChapterFilter] = useState<string>("");
    const [errorFilter, setErrorFilter] = useState<string>("");

    useEffect(() => {
        if (user) {
            const fetchAnalytics = async () => {
                try {
                    setIsLoading(true);
                    const data = await getTeacherAnalytics(user.uid);
                    setAnalytics(data);
                } catch (err: any) {
                    console.error("Failed to load teacher analytics:", err);
                    setError(err.message || "Failed to load analytics data");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAnalytics();
        }
    }, [user]);

    // Filtered leaderboard
    const filteredLeaderboard = analytics?.studentList?.filter((s: any) => {
        const divisionMatch = !divisionFilter || s.division === divisionFilter;
        const chapterMatch = !chapterFilter || s.chapterPerformance?.some((c: any) => c.name === chapterFilter);
        const errorMatch = !errorFilter || s.commonErrors?.includes(errorFilter);
        return divisionMatch && chapterMatch && errorMatch;
    }) || [];

    // Find max struggling for bar width scaling
    const maxStruggling = analytics?.chapterPerformance ?
        Math.max(...analytics.chapterPerformance.map((c: any) => c.struggling), 1) : 1;

    // When opening the modal, map the student data:
    const openStudentModal = (student: any) => {
        setModalStudent(mapModalStudentData(student, analytics));
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalStudent(null);
    };

    const openStrugglingModal = (chapterName: string) => {
        // Find students struggling in this chapter
        const struggling = analytics?.studentList?.filter((student: any) => {
            const chapterPerf = student.chapterPerformance?.find((c: any) => c.name === chapterName);
            return chapterPerf && chapterPerf.averageScore < 70;
        }) || [];

        setStrugglingStudents(struggling);
        setSelectedChapter(chapterName);
        setStrugglingModalOpen(true);
    };

    const closeStrugglingModal = () => {
        setStrugglingModalOpen(false);
        setSelectedChapter("");
        setStrugglingStudents([]);
    };

    const openStudentAnalytics = (student: any) => {
        setModalStudent(student);
        setModalOpen(true);
        closeStrugglingModal();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <LoadingLottie message="Loading analytics..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Analytics</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">No Analytics Data</h2>
                    <p className="text-gray-600 mb-6">No analytics data available for your class.</p>
                </div>
            </div>
        );
    }

    // Sort chapters by averageScore descending
    const sortedChapters = [...analytics.chapterPerformance].sort((a, b) => b.averageScore - a.averageScore);
    // Helper to get color for average score based on rank
    const getScoreColor = (rank: number, total: number) => {
        if (total <= 1) return 'text-green-600';
        const percent = rank / (total - 1);
        if (percent <= 0.33) return 'text-green-600';
        if (percent <= 0.66) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-2 md:p-6">
            {/* Back to Dashboard Button */}
            <div className="mb-4 flex items-center">
                <Link href="/teacher/dashboard" className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-semibold text-base">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </Link>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
                <div className="rounded-2xl shadow-lg bg-white p-4 flex flex-col gap-2 border-2 border-white">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <Target className="w-6 h-6 text-blue-500" />
                        Average Score
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-800">{analytics.summary.averageScore}%</div>
                    <div className="text-xs text-blue-400 font-bold">Class Average</div>
                </div>

                <div className="rounded-2xl shadow-lg bg-white p-4 flex flex-col gap-2 border-2 border-white">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <BookOpen className="w-6 h-6 text-purple-500" />
                        Quizzes Taken
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-800">{analytics.summary.quizzesTaken}</div>
                    <div className="text-xs text-blue-400 font-bold">Assigned</div>
                </div>

                <div className="rounded-2xl shadow-lg bg-white p-4 flex flex-col gap-2 border-2 border-white">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        Class Improvement
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-800">{analytics.summary.classImprovement > 0 ? '+' : ''}{analytics.summary.classImprovement}%</div>
                    <div className="text-xs text-blue-400 font-bold">vs Previous 5 quizzes</div>
                </div>

                <div className="rounded-2xl shadow-lg bg-white p-4 flex flex-col gap-2 border-2 border-white">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <Users className="w-6 h-6 text-orange-400" />
                        Total Students
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-800">{analytics.summary.totalStudents}</div>
                    <div className="text-xs text-blue-400 font-bold">Active</div>
                </div>
            </div>

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6 auto-rows-min">
                {/* Radar Chart (large, left) */}
                <div className="md:col-span-2 md:row-span-2 bg-white rounded-2xl shadow-lg p-6 flex flex-col border-2 border-white">
                    <div className="flex items-center gap-2 mb-2 font-bold text-purple-700 text-lg">
                        <Brain className="w-5 h-5" />
                        Cognitive Skills Distribution
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={Array.isArray(analytics.cognitiveSkillsDistribution) ? analytics.cognitiveSkillsDistribution : []} outerRadius="80%">
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                                <Radar name="Class Avg" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-500">
                        <span>Class Average</span>
                        <span className="text-purple-500 font-bold">Top Performer</span>
                    </div>
                </div>

                {/* Common Mistakes (center, tall) */}
                <div className="md:col-span-2 md:row-span-2 rounded-2xl shadow-lg bg-white p-6 flex flex-col border-2 border-white">
                    <div className="flex items-center gap-2 mb-2 font-bold text-red-700 text-lg">
                        <Flame className="w-5 h-5" />
                        Common Class Mistakes
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Areas requiring focused attention</div>
                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                        {analytics.commonMistakes.map((m: any, i: number) => (
                            <div key={i} className="bg-white rounded-xl p-2 shadow border flex items-center justify-between border-gray-100">
                                <div>
                                    <div className="font-bold text-gray-800">{m.text}</div>
                                    <div className="text-xs text-gray-500">{m.percent}% of students affected</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${severityColor(m.severity)}`}>
                                    {m.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Needs Attention (right, tall) */}
                <div className="md:col-span-2 bg-red-50 rounded-2xl shadow-lg p-6 flex flex-col border-2 border-white mb-6 md:mb-0">
                    <div className="flex items-center gap-2 mb-2 font-bold text-red-600 text-lg">
                        <AlertTriangle className="w-5 h-5" />
                        Needs Attention
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Students requiring immediate support</div>
                    <div className="space-y-3 flex-1">
                        {analytics.needsAttention.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 shadow border border-red-100">
                                <div>
                                    <div className="font-bold text-gray-800">{s.name}</div>
                                    <div className="text-xs text-gray-500">Score: {s.overallScore}%</div>
                                </div>
                                <button className="bg-red-100 p-2 rounded-full" onClick={() => openStudentModal(s)}>
                                    <Eye className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Performers (right, short, below Needs Attention) */}
                <div className="md:col-start-5 md:col-span-2 bg-green-50 rounded-2xl shadow-lg p-6 flex flex-col border-2 border-white md:row-start-2">
                    <div className="flex items-center gap-2 mb-2 font-bold text-green-700 text-lg">
                        <Trophy className="w-5 h-5" />
                        Top Performers
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Students excelling in class</div>
                    <div className="space-y-2">
                        {analytics.topPerformers.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-xl p-2 shadow border border-green-100">
                                <div>
                                    <div className="font-bold text-gray-800">{s.name}</div>
                                    <div className="text-xs text-gray-500">Score: {s.overallScore}%</div>
                                </div>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                    {s.overallScore >= 90 ? "High" : "Moderate"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chapter-wise Performance Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Chapter-wise Performance (left) */}
                <div>
                    <div className="rounded-2xl shadow-lg bg-white p-6 mb-6 border-2 border-white">
                        <div className="flex items-center gap-2 mb-1 font-bold text-purple-700 text-xl">
                            <BookOpen className="w-6 h-6" />
                            Chapter-wise Performance
                        </div>
                        <div className="text-sm text-gray-600 mb-4">Detailed breakdown by topic areas</div>
                        <div className="h-64 w-full max-w-[420px] mx-auto mb-6"> {/* Reduced width */}
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={Array.isArray(analytics.chapterPerformance) ? analytics.chapterPerformance : []} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={90} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip formatter={(value: any) => `${value}%`} />
                                    <Bar dataKey="averageScore" radius={[12, 12, 4, 4]} maxBarSize={60} fill="#8B5CF6" />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Beautiful summary rows below the chart */}
                        <div className="space-y-6 mt-4">
                            {sortedChapters.map((c: any, i: number) => {
                                // Compute max and min score for the chapter if not present
                                const maxScore = c.maxScore !== undefined ? c.maxScore : (Array.isArray(c.scores) ? Math.max(...c.scores) : null);
                                const minScore = c.minScore !== undefined ? c.minScore : (Array.isArray(c.scores) ? Math.min(...c.scores) : null);
                                return (
                                    <div key={i} className="bg-white rounded-xl p-4 flex flex-col gap-2 border border-purple-50 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-4 mb-2">
                                            <span className="font-bold text-lg text-gray-900 flex-shrink-0">{c.name}</span>
                                            <span className="text-purple-700 font-semibold ml-2">Average Score</span>
                                            <span className={`text-2xl font-bold ${getScoreColor(i, sortedChapters.length)}`}>{Math.round(c.averageScore)}%</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-gray-900 font-semibold">Struggling Students</span>
                                            <span className="text-xl font-bold text-red-500">{c.struggling}%</span>
                                            <button
                                                className="bg-red-100 p-1 rounded-full hover:bg-red-200 transition-colors"
                                                onClick={() => openStrugglingModal(c.name)}
                                                title="View struggling students"
                                            >
                                                <Eye className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-6 mb-2">
                                            <span className="text-xs text-gray-500 font-semibold">Max Score: <span className="text-green-600 font-bold">{c.maxScore !== null && c.maxScore !== undefined ? Math.round(c.maxScore) + '%' : 'N/A'}</span></span>
                                            <span className="text-xs text-gray-500 font-semibold">Min Score: <span className="text-red-600 font-bold">{c.minScore !== null && c.minScore !== undefined ? Math.round(c.minScore) + '%' : 'N/A'}</span></span>
                                        </div>
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="flex-1">
                                                <div className="text-xs text-purple-700 font-semibold mb-1">Average Score</div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full">
                                                    <div className="h-2 rounded-full bg-purple-400" style={{ width: `${c.averageScore}%` }}></div>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs text-red-500 font-semibold mb-1">Struggling Students</div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full">
                                                    <div className="h-2 rounded-full bg-red-400" style={{ width: `${c.struggling}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {/* Student Leaderboard (right) */}
                <div>
                    <div className="rounded-2xl shadow-lg bg-white p-6 mb-6 border-2 border-white">
                        <div className="flex items-center gap-2 mb-4 font-bold text-purple-700 text-xl">
                            <BarChart3 className="w-6 h-6" />
                            Student Leaderboard
                        </div>
                        {/* Filter UI */}
                        <div className="flex flex-wrap gap-4 mb-4">
                            <select className="border rounded px-3 py-1" value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}>
                                <option value="">All Divisions</option>
                                {analytics.divisions?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select className="border rounded px-3 py-1" value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}>
                                <option value="">All Chapters</option>
                                {analytics.chapters?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="border rounded px-3 py-1" value={errorFilter} onChange={e => setErrorFilter(e.target.value)}>
                                <option value="">All Common Errors</option>
                                {analytics.commonErrors?.map((err: string) => <option key={err} value={err}>{err}</option>)}
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 border-b">
                                        <th className="py-2 px-3 text-left">Student Name</th>
                                        <th className="py-2 px-3 text-left">Roll No.</th>
                                        <th className="py-2 px-3 text-left">Division</th>
                                        <th className="py-2 px-3 text-left">Best Performing Chapter</th>
                                        <th className="py-2 px-3 text-left">Least performing Chapter</th>
                                        <th className="py-2 px-3 text-left">Average subject Score  (%)</th>
                                        <th className="py-2 px-3 text-left">Improvement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaderboard.map((s: any, i: number) => (
                                        <tr key={i} className="border-b hover:bg-purple-50/40">
                                            <td className="py-2 px-3 font-bold text-gray-800 flex items-center gap-2">
                                                {s.name}
                                                <Link href={`/teacher/student-analytics/${s.id}/${analytics.subjectCode}`}>
                                                    <span className="bg-gray-100 p-1 rounded-full hover:bg-purple-100 transition-colors" title="View full analytics">
                                                        <Eye className="w-4 h-4 text-purple-600" />
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="py-2 px-3">{s.rollNumber}</td>
                                            <td className="py-2 px-3">{s.division}</td>
                                            <td className="py-2 px-3">{s.bestChapter} ({Math.round(s.bestChapterScore)}%)</td>
                                            <td className="py-2 px-3">{s.worstChapter} ({Math.round(s.worstChapterScore)}%)</td>
                                            <td className="py-2 px-3 font-bold text-purple-700">{s.overallScore}%</td>
                                            <td className="py-2 px-3 font-bold text-green-600">+{Math.round(Math.random() * 20)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={modalOpen}
                onRequestClose={closeModal}
                className="fixed inset-0 flex items-center justify-center z-50"
                overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
                ariaHideApp={false}
            >
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full relative flex flex-col max-h-[80vh]">
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-gray-100 px-6 pt-6 pb-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center justify-center rounded-full text-xl">
                            {modalStudent?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xl font-bold text-gray-900 truncate">{modalStudent?.name}</div>
                            <div className="text-sm text-gray-500 flex flex-wrap gap-4">
                                {modalStudent?.rollNumber && <span>Roll: <span className="font-semibold text-purple-700">{modalStudent.rollNumber}</span></span>}
                                {modalStudent?.division && <span>Div: <span className="font-semibold text-purple-700">{modalStudent.division}</span></span>}
                                <span>Overall Score: <span className="font-semibold text-purple-700">{modalStudent?.overallScore || 0}%</span></span>
                            </div>
                        </div>
                        <button onClick={closeModal} className="ml-2 text-gray-400 hover:text-gray-700 text-2xl self-start">&times;</button>
                    </div>
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
                        <div className="font-bold text-lg text-red-700 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Chapters & Subtopics Needing Attention
                        </div>
                        {(() => {
                            const weakSubtopics = (modalStudent?.strugglingSubtopics || []);
                            if (!weakSubtopics.length) {
                                return <div className="text-gray-500">No chapters or subtopics below 50%.</div>;
                            }
                            // Group weak subtopics by chapter
                            const chaptersMap: { [chapter: string]: any[] } = {};
                            weakSubtopics.forEach((sub: any) => {
                                const chapter = sub.parentChapter || 'Unknown Chapter';
                                if (!chaptersMap[chapter]) chaptersMap[chapter] = [];
                                chaptersMap[chapter].push(sub);
                            });
                            return (
                                <div className="space-y-8">
                                    {Object.entries(chaptersMap).map(([chapterName, subtopics], i) => (
                                        <div key={i}>
                                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm p-4 mb-2 flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-red-500" />
                                                <span className="font-semibold text-red-700 text-lg">{chapterName}</span>
                                            </div>
                                            <div className="space-y-4">
                                                {subtopics.map((sub: any, j: number) => {
                                                    const trend = sub.trend || [];
                                                    const errors = sub.errors || [];
                                                    return (
                                                        <div key={j} className="bg-white border border-gray-200 rounded-lg shadow p-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold text-purple-700 text-base">{sub.name}</span>
                                                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{Math.round(sub.averageScore)}%</span>
                                                            </div>
                                                            {/* Progress chart for this subtopic */}
                                                            <div className="h-32 w-full mb-2">
                                                                {trend.length > 0 ? (
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <LineChart data={trend}>
                                                                            <CartesianGrid strokeDasharray="3 3" />
                                                                            <XAxis dataKey="date" />
                                                                            <YAxis domain={[0, 100]} />
                                                                            <Tooltip />
                                                                            <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={sub.name} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                ) : (
                                                                    <div className="text-gray-400 text-center py-4">No progress data for this subtopic</div>
                                                                )}
                                                            </div>
                                                            {/* Common errors for this subtopic */}
                                                            {errors.length > 0 && (
                                                                <div className="mt-2">
                                                                    <div className="font-semibold text-xs text-red-700 mb-1">Common Errors</div>
                                                                    <ul className="list-disc pl-6 text-red-700 text-xs">
                                                                        {errors.map((err: any, k: number) => (
                                                                            <li key={k}>{typeof err === 'string' ? err : err.text || JSON.stringify(err)}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {i < Object.entries(chaptersMap).length - 1 && <div className="my-6 border-t border-gray-200" />}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </Modal>

            {/* Struggling Students Modal */}
            <Modal
                isOpen={strugglingModalOpen}
                onRequestClose={closeStrugglingModal}
                className="fixed inset-0 flex items-center justify-center z-50"
                overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
                ariaHideApp={false}
            >
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                    <button onClick={closeStrugglingModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <h2 className="text-xl font-bold text-gray-800">Struggling Students</h2>
                    </div>
                    <p className="text-gray-600 mb-4">Students struggling in <span className="font-semibold">{selectedChapter}</span></p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {strugglingStudents.length > 0 ? (
                            strugglingStudents.map((student: any) => (
                                <div
                                    key={student.id}
                                    className="w-full flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 text-left"
                                >
                                    <div>
                                        <div className="font-semibold text-gray-800">{student.name}</div>
                                        <div className="text-sm text-gray-600">Roll: {student.rollNumber} | Div: {student.division}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-red-600">{Math.round(student.overallScore)}%</div>
                                        <div className="text-xs text-gray-500">Score</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <p>No students are struggling in this chapter!</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
