"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getStudentSubjectAnalytics } from "@/lib/firestoreService";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    BookOpen,
    Target,
    Clock,
    Award,
    Flame,
    Brain,
    BarChart3,
    Home,
    User,
    Trophy,
    Lightbulb,
    Calendar,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Book,
    FlaskConical,
    Atom,
    Leaf,
    Zap,
    Flame as FlameIcon,
    Lightbulb as LightbulbIcon,
    BatteryFull,
    Globe,
    Beaker,
    BarChart4,
    ListChecks,
} from "lucide-react";
import LoadingLottie from "@/components/LoadingLottie";

export default function SubjectAnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const studentId = params.studentId as string;
    const subjectCode = params.subjectCode as string;
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

    useEffect(() => {
        if (studentId && subjectCode) {
            getStudentSubjectAnalytics(studentId, subjectCode)
                .then((data) => {
                    setAnalytics(data);
                })
                .catch((err) => {
                    setAnalytics({ error: true });
                })
                .finally(() => setIsLoading(false));
        }
    }, [studentId, subjectCode]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-gray-600 font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!analytics || analytics.error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Analytics</h2>
                    <p className="text-gray-600 mb-6">Could not load analytics for this subject. Please try again.</p>
                    <Link href="/teacher/analytics" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all">
                        Back to Analytics
                    </Link>
                </div>
            </div>
        );
    }

    // Performance color helper
    const getPerformanceColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 60) return "text-yellow-600";
        if (score >= 40) return "text-orange-600";
        return "text-red-600";
    };

    const getPerformanceBgColor = (score: number) => {
        if (score >= 80) return "bg-green-100";
        if (score >= 60) return "bg-yellow-100";
        if (score >= 40) return "bg-orange-100";
        return "bg-red-100";
    };

    const getPerformanceBorderColor = (score: number) => {
        if (score >= 80) return "border-green-200";
        if (score >= 60) return "border-yellow-200";
        if (score >= 40) return "border-orange-200";
        return "border-red-200";
    };

    // Chart colors for different chapters
    const chartColors = [
        "#8B5CF6", // purple
        "#10B981", // green
        "#F59E0B", // yellow
        "#EF4444", // red
        "#3B82F6", // blue
        "#F97316", // orange
        "#EC4899", // pink
        "#06B6D4", // cyan
    ];

    // Emoji mapping for chapters
    const chapterEmojis = [
        "📚", "🔬", "⚗️", "🧮", "🌱", "⚡", "🔥", "💡", "🔋", "🌍", "🌐", "📊"
    ];

    const chapterIcons = [
        Book, FlaskConical, Atom, Leaf, Zap, FlameIcon, LightbulbIcon, BatteryFull, Globe, Beaker, BarChart4, ListChecks
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-3 md:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/teacher/analytics" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl md:text-3xl font-bold">{analytics.subjectName || subjectCode}</h1>
                                <p className="text-purple-100 mt-1 text-sm">Subject Analytics & Insights</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                            <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-6 pb-20 md:pb-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-50 p-4 rounded-2xl border-2 border-blue-200 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-blue-700 font-semibold">Subject Average Score</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            {analytics.summary.averageScore}%
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-100 via-green-50 to-emerald-50 p-4 rounded-2xl border-2 border-green-200 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700 font-semibold">Quizzes Taken</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {analytics.summary.quizzesAttempted}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-100 via-purple-50 to-violet-50 p-4 rounded-2xl border-2 border-purple-200 shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-purple-700 font-semibold">Improvement</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                            {analytics.summary.improvementRate > 0 ? '+' : ''}{analytics.summary.improvementRate}%
                        </div>
                    </div>
                </div>

                {/* Progress Over Time Chart */}
                {analytics.progressOverTime && analytics.progressOverTime.length > 0 && (
                    <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                            <h2 className="text-xl font-bold text-gray-800">Progress Over Time</h2>
                        </div>

                        <div className="h-80 w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.progressOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" strokeOpacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[0, 100]}
                                    />
                                    {Object.keys(analytics.progressOverTime[0] || {}).filter(key => key !== 'date' && key !== 'attempt').map((chapterName, index) => (
                                        <Line
                                            key={chapterName}
                                            type="monotone"
                                            dataKey={chapterName}
                                            stroke={chartColors[index % chartColors.length]}
                                            strokeWidth={3}
                                            dot={{ fill: chartColors[index % chartColors.length], strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, stroke: chartColors[index % chartColors.length], strokeWidth: 2 }}
                                            connectNulls={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            {Object.keys(analytics.progressOverTime[0] || {}).filter(key => key !== 'date' && key !== 'attempt').map((chapterName, index) => (
                                <div key={chapterName} className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-700">{chapterName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chapter Performance */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-purple-600" />
                        <h2 className="text-xl font-bold text-gray-800">Chapter Performance</h2>
                    </div>

                    {analytics.chapterPerformance.map((chapter: any, chapterIndex: number) => {
                        const IconComponent = chapterIcons[chapterIndex % chapterIcons.length];
                        const isExpanded = expandedChapter === chapter.id;
                        return (
                            <div key={chapter.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300">
                                <button
                                    className="w-full flex items-center justify-between p-4 md:p-6 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all"
                                    onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`chapter-${chapter.id}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
                                            <IconComponent className="w-6 h-6 text-purple-600" />
                                        </span>
                                        <div className="text-left">
                                            <h3 className="text-base md:text-lg font-bold text-gray-800 leading-tight">{chapter.name}</h3>
                                            <p className="text-xs md:text-sm text-gray-600">{chapter.attempts} attempts</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className={`text-lg md:text-2xl font-bold ${getPerformanceColor(chapter.averageScore)}`}>{Math.round(chapter.averageScore)}%</div>
                                        <div className="text-xs text-gray-500">Average</div>
                                        <span className="ml-2">
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-purple-500" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-purple-400" />
                                            )}
                                        </span>
                                    </div>
                                </button>
                                {/* Dropdown content */}
                                <div
                                    id={`chapter-${chapter.id}`}
                                    className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} bg-gradient-to-br from-white/90 to-purple-50`}
                                >
                                    <div className="px-4 md:px-8 pb-4 md:pb-8">
                                        {/* Performance Insights */}
                                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 mb-4 border border-yellow-200">
                                            <div className="flex items-start gap-3">
                                                <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-yellow-800 mb-2">Performance Insights</h4>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                            <span className="text-green-700">Strongest: <strong>{chapter.strongest !== 'N/A' ? chapter.strongest : 'N/A'}</strong></span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                                            <span className="text-red-700">Needs Work: <strong>{chapter.needsWork && chapter.needsWork.length > 0 ? chapter.needsWork.join(', ') : 'No subtopics need work!'}</strong></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Subtopic Breakdown */}
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-purple-600" />
                                                Subtopic Performance
                                            </h4>
                                            <div className="space-y-3">
                                                {chapter.subtopics.map((subtopic: any) => (
                                                    <div key={subtopic.id} className={`${getPerformanceBgColor(subtopic.averageScore)} rounded-xl p-4 border-2 ${getPerformanceBorderColor(subtopic.averageScore)} flex flex-col md:flex-row md:items-center md:justify-between gap-2`}>
                                                        <div className="flex items-center gap-2">
                                                            <ListChecks className="w-4 h-4 text-purple-400" />
                                                            <div>
                                                                <h5 className="font-semibold text-gray-800 text-sm md:text-base">{subtopic.name}</h5>
                                                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {subtopic.attempts} attempts
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className={`text-base md:text-xl font-bold ${getPerformanceColor(subtopic.averageScore)}`}>{Math.round(subtopic.averageScore)}%</div>
                                                            <div className="text-xs text-gray-500">Average</div>
                                                        </div>
                                                        {/* Subtopic Performance Graph */}
                                                        {subtopic.trend && subtopic.trend.length > 0 && (
                                                            <div className="w-full md:w-1/2 mt-2 md:mt-0">
                                                                <div className="h-20 w-full">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <LineChart data={subtopic.trend}>
                                                                            <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" strokeOpacity={0.5} />
                                                                            <XAxis
                                                                                dataKey="date"
                                                                                tick={{ fontSize: 8 }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                                tickFormatter={(value) => {
                                                                                    const date = new Date(value);
                                                                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                                                }}
                                                                            />
                                                                            <YAxis
                                                                                tick={{ fontSize: 8 }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                                domain={[0, 100]}
                                                                                tickCount={3}
                                                                            />
                                                                            <Line
                                                                                type="monotone"
                                                                                dataKey="score"
                                                                                stroke="#3b82f6"
                                                                                strokeWidth={2}
                                                                                dot={{ fill: "#3b82f6", strokeWidth: 1, r: 3 }}
                                                                                activeDot={false}
                                                                                connectNulls={false}
                                                                            />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Cognitive Insights */}
                {analytics.cognitiveInsights && analytics.cognitiveInsights.length > 0 && (
                    <div className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Brain className="w-6 h-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">Cognitive Insights</h2>
                        </div>
                        <div className="space-y-3">
                            {analytics.cognitiveInsights.map((insight: string, index: number) => (
                                <div key={index} className="bg-white rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-white text-xs font-bold">{index + 1}</span>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed">{insight}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.strengths && analytics.strengths.length > 0 && (
                        <div className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="w-6 h-6 text-green-600" />
                                <h2 className="text-xl font-bold text-gray-800">Your Strengths</h2>
                            </div>
                            <div className="space-y-2">
                                {analytics.strengths.map((strength: string, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-gray-700">{strength}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {analytics.weaknesses && analytics.weaknesses.length > 0 && (
                        <div className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Flame className="w-6 h-6 text-red-600" />
                                <h2 className="text-xl font-bold text-gray-800">Areas for Improvement</h2>
                            </div>
                            <div className="space-y-2">
                                {analytics.weaknesses.map((weakness: string, index: number) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                        <span className="text-gray-700">{weakness}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 