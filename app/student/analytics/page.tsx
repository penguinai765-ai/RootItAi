"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getStudentAnalytics } from "@/lib/firestoreService";
import Link from "next/link";
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
  Area,
  AreaChart,
  Cell,
} from "recharts";
import {
  Brain,
  TrendingUp,
  Clock,
  Target,
  Zap,
  BookOpen,
  Bot,
  Play,
  FileText,
  Home,
  BarChart3,
  User,
  Trophy,
  Award,
  Flame,
  BookMarked,
  Dumbbell,
  Info,
} from "lucide-react";
import LoadingLottie from "@/components/LoadingLottie";

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'progress'>('overview');

  // Move all useState and useEffect hooks to the top of the StudentAnalyticsPage function, before any if/return statements.
  // Place:
  // const [infoModal, setInfoModal] = useState<{ open: boolean, text: string }>({ open: false, text: "" });
  // immediately after the other useState hooks, and before any if (isLoading) or if (!analytics) returns.
  const [infoModal, setInfoModal] = useState<{ open: boolean, text: string }>({ open: false, text: "" });
  // Add state for modal
  const [showQuizInfo, setShowQuizInfo] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("Fetching analytics for user:", user.uid);
      getStudentAnalytics(user.uid)
        .then(async (data) => {
          console.log("Analytics data received:", data);
          setAnalytics(data);
        })
        .catch((err) => {
          console.error("Failed to load student analytics", err);
          // Show a more helpful error message
          setAnalytics({
            error: true,
            message: "Failed to load analytics. Please try again later."
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  if (isLoading)
    return <div className="p-8 text-center"><LoadingLottie message="Loading your analytics..." /></div>;
  if (!analytics)
    return <div className="p-8 text-center">Could not load your analytics data. Please try again later.</div>;

  // Handle error case
  if (analytics.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-6">{analytics.message || "Something went wrong while loading your analytics."}</p>
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

  // Check if we have any data at all
  const hasAnyData = analytics.domainPerformance?.length > 0 ||
    analytics.subjectPerformance?.length > 0 ||
    analytics.detailedAnalysisHistory?.length > 0;

  // Debug: Log the exact values to understand why hasAnyData is false
  console.log("=== DATA AVAILABILITY DEBUG ===");
  console.log("domainPerformance length:", analytics.domainPerformance?.length);
  console.log("subjectPerformance length:", analytics.subjectPerformance?.length);
  console.log("detailedAnalysisHistory length:", analytics.detailedAnalysisHistory?.length);
  console.log("hasAnyData:", hasAnyData);
  console.log("=== END DATA AVAILABILITY DEBUG ===");

  if (!hasAnyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Analytics Data Yet</h2>
          <p className="text-gray-600 mb-6">Complete your first quiz to start seeing detailed analytics and insights!</p>

          <Link href="/student/dashboard" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // --- Data Mapping ---
  // Latest Quiz - using analysis object (LLM insights)
  // Check if we have detailed analysis history, otherwise fall back to basic data
  const hasDetailedAnalysis = analytics.detailedAnalysisHistory && analytics.detailedAnalysisHistory.length > 0;
  const latestQuizEntry = hasDetailedAnalysis ? analytics.detailedAnalysisHistory[analytics.detailedAnalysisHistory.length - 1] : null;
  const latestQuiz = latestQuizEntry?.analysis || {};
  // Add these if not already present:
  const latestQuizSubject = latestQuizEntry?.subjectName || latestQuizEntry?.subjectCode || "-";
  const latestQuizChapter = latestQuizEntry?.chapterName || latestQuizEntry?.chapterId || "-";
  const latestQuizSubtopic = latestQuizEntry?.subtopicName || latestQuizEntry?.subtopicId || "-";

  // Fallback data if no detailed analysis exists
  const fallbackData = {
    performanceScore: latestQuizEntry?.score || 0,
    timeEfficiency: "N/A",
    conceptualUnderstanding: "N/A",
    confidenceScore: "N/A",
    verbalInsights: "Complete more quizzes to unlock detailed analytics!"
  };

  // Use detailed analysis if available, otherwise use fallback
  const displayData = hasDetailedAnalysis ? latestQuiz : fallbackData;

  // Debug logging to see what data we're getting
  console.log("=== ANALYTICS DEBUG ===");
  console.log("Full analytics object:", analytics);
  console.log("Has any data:", hasAnyData);
  console.log("Detailed analysis history length:", analytics.detailedAnalysisHistory?.length);
  console.log("Detailed analysis history:", analytics.detailedAnalysisHistory);
  console.log("Latest quiz entry:", latestQuizEntry);
  console.log("Latest quiz analysis:", latestQuiz);
  console.log("Latest quiz keys:", Object.keys(latestQuiz));
  console.log("Display data:", displayData);
  console.log("Domain performance:", analytics.domainPerformance);
  console.log("Subject performance:", analytics.subjectPerformance);
  console.log("=== END DEBUG ===");
  // Domain Performance
  const domainPerformance = analytics.domainPerformance.map((d: any) => ({
    domain: d.name,
    percentage: Math.round(d.averageScore),
    color: d.name === "Biology" ? "#EF4444" : d.name === "Chemistry" ? "#10B981" : d.name === "Physics" ? "#F59E0B" : "#8B5CF6",
    level:
      d.averageScore >= 70
        ? "excellent"
        : d.averageScore >= 50
          ? "good"
          : d.averageScore >= 35
            ? "needs-improvement"
            : "weak",
  }));
  // Subjects Overview
  const subjects = analytics.subjectPerformance.map((s: any) => ({
    name: s.name,
    code: s.subjectCode,
    mastery: Math.round(s.averageScore),
    icon: s.name.toLowerCase().includes("bio")
      ? Brain
      : s.name.toLowerCase().includes("chem")
        ? Dumbbell
        : s.name.toLowerCase().includes("math")
          ? BarChart3
          : Dumbbell,
    color: s.name.toLowerCase().includes("bio")
      ? "bg-purple-500"
      : s.name.toLowerCase().includes("chem")
        ? "bg-cyan-500"
        : s.name.toLowerCase().includes("math")
          ? "bg-green-500"
          : "bg-blue-500",
  }));

  // Map subject code to name
  const codeToName = Object.fromEntries(subjects.map((s: any) => [s.code, s.name]));
  // Cognitive Skill Data - using analysis object
  const cognitiveSkillData = [
    {
      skill: "Conceptual",
      current: displayData.conceptualUnderstanding === "Strong" ? 88 : displayData.conceptualUnderstanding === "Moderate" ? 60 : displayData.conceptualUnderstanding === "Weak" ? 30 : 0,
      previous: 0,
    },
    {
      skill: "Reasoning",
      current: displayData.reasoningSkill === "Logical" ? 76 : displayData.reasoningSkill === "Superficial" ? 60 : displayData.reasoningSkill === "Weak" ? 30 : 0,
      previous: 0,
    },
    {
      skill: "Confidence",
      current: displayData.confidenceScore === "High" ? 65 : displayData.confidenceScore === "Medium" ? 50 : displayData.confidenceScore === "Low" ? 30 : 0,
      previous: 0,
    },
  ];
  // Progress Over Time - using performance scores from analysis
  const progressOverTime =
    analytics.detailedAnalysisHistory?.map((q: any) => ({
      date: new Date(q.date).toLocaleDateString(),
      timestamp: new Date(q.date).getTime(), // For proper chronological ordering
      [q.subjectCode]: q.analysis?.performanceScore || q.score || 0,
    }))
      .sort((a: any, b: any) => a.timestamp - b.timestamp) // Sort by actual submission time (oldest to newest)
      .map(({ timestamp, ...rest }: any) => rest) || []; // Remove timestamp, keep only date for display

  // Get unique subjects for progress chart colors
  const uniqueSubjects = [...new Set(analytics.detailedAnalysisHistory?.map((q: any) => q.subjectCode) || [])] as string[];
  // AI Recommendation - using analysis object
  const aiRecommendation =
    displayData.verbalInsights || "Complete more quizzes to unlock personalized recommendations!";

  const subjectColors = [
    "#6366f1", // purple
    "#10b981", // green
    "#f59e0b", // yellow
    "#ef4444", // red
    "#3b82f6", // blue
    "#f59e42", // orange
  ];

  // Helper to map code or name to subject name
  function getSubjectName(key: string) {
    const subject = analytics.subjectPerformance.find(
      (s: any) => s.code === key || s.name === key
    );
    return subject ? subject.name : key;
  }

  // XP values as integers
  const weeklyXP = Math.round(analytics.xp || 0);
  const weeklyXPTarget = Math.round(analytics.xpToNextLevel || 1000);
  const xpToGo = Math.max(weeklyXPTarget - weeklyXP, 0);
  const progressPercent = Math.round((weeklyXP / weeklyXPTarget) * 100);

  // Remove any duplicate declarations of latestQuiz and related variables. Only keep this set above the return statement:

  // --- UI ---
  const performanceInfo = "This score reflects how well you performed in your previous quiz.";
  const improvementInfo = "This indicates how much you've improved compared to your last attempt.";
  const timeEfficiencyInfo = "This measures how quickly and accurately you answered the questions.";
  const confidenceInfo = "This shows how confident you were while answering the quiz.";

  const InfoModal = ({ open, text, onClose }: { open: boolean, text: string, onClose: () => void }) => (
    open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center relative animate-fade-in">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
          <div className="text-gray-800 text-base font-medium mb-2">Info</div>
          <div className="text-gray-600 text-sm">{text}</div>
        </div>
      </div>
    ) : null
  );

  // Find the highest and lowest performance in domainPerformance
  const maxDomain = domainPerformance.length > 0
    ? Math.max(...domainPerformance.map((d: { percentage: number }) => d.percentage))
    : null;
  const minDomain = domainPerformance.length > 0
    ? Math.min(...domainPerformance.map((d: { percentage: number }) => d.percentage))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-purple-100 mt-1 text-sm">Track your learning journey</p>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 pb-20 md:pb-6">
        {/* Always visible summary cards */}
        <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl mb-4">
          <div className="pb-4 pt-3 px-3">
            <div className="flex items-center gap-2 text-lg font-bold mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" /> Latest Quiz Performance
              <button onClick={() => setShowQuizInfo(true)} className="ml-1 p-1 rounded-full hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all" aria-label="Quiz Info">
                <Info className="w-5 h-5 text-purple-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-50 p-4 rounded-2xl border-2 border-blue-200 shadow-lg" onClick={() => setInfoModal({ open: true, text: performanceInfo })}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700 font-semibold">Performance</span>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {displayData.performanceScore ?? "--"}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-100 via-green-50 to-emerald-50 p-4 rounded-2xl border-2 border-green-200 shadow-lg" onClick={() => setInfoModal({ open: true, text: timeEfficiencyInfo })}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-semibold">Time Efficiency</span>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {displayData.timeEfficiency || "--"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-100 via-purple-50 to-violet-50 p-4 rounded-2xl border-2 border-purple-200 shadow-lg" onClick={() => setInfoModal({ open: true, text: improvementInfo })}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-700 font-semibold">Improvement</span>
                </div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  {(analytics.summary?.improvementRate ?? 0) > 0 ? '+' : ''}{analytics.summary?.improvementRate ?? 0}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 p-4 rounded-2xl border-2 border-orange-200 shadow-lg" onClick={() => setInfoModal({ open: true, text: confidenceInfo })}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-orange-700 font-semibold">Confidence</span>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                  {displayData.confidenceScore || "--"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Tabbed Navigation and Main Card Area */}
        <div className="w-full flex flex-col items-center">
          <div className="flex bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 rounded-full border border-purple-200 overflow-hidden mb-4 shadow">
            <button
              className={`px-6 py-2 text-sm font-medium focus:outline-none transition-all ${activeTab === 'overview' ? 'bg-white text-purple-700 shadow font-bold' : 'text-purple-700'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium focus:outline-none transition-all ${activeTab === 'insights' ? 'bg-white text-pink-700 shadow font-bold' : 'text-purple-700'}`}
              onClick={() => setActiveTab('insights')}
            >
              Insights
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium focus:outline-none transition-all ${activeTab === 'progress' ? 'bg-white text-blue-700 shadow font-bold' : 'text-purple-700'}`}
              onClick={() => setActiveTab('progress')}
            >
              Progress
            </button>
          </div>
          {/* Main Card Area controlled by tab */}
          <div className="w-full max-w-md">
            {activeTab === 'overview' && (
              <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl mb-4">
                <div className="flex items-center gap-2 px-3 pt-3 font-bold">
                  <BarChart3 className="w-5 h-5 text-purple-600" /> Performance by Domain
                </div>
                <div className="h-44 w-full px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={domainPerformance} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" strokeOpacity={0.5} />
                      <XAxis dataKey="domain" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip formatter={(value: any, name: any, props: any) => [`${value}%`, props.payload.level]} />
                      <Bar dataKey="percentage" radius={[12, 12, 4, 4]} maxBarSize={60}>
                        {domainPerformance.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`}
                            fill={
                              entry.percentage === maxDomain ? '#22c55e' : // green-500
                                entry.percentage === minDomain ? '#ef4444' : // red-500
                                  '#6366f1' // default: purple-500
                            }
                          />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {activeTab === 'insights' && (
              <div className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                <div className="flex items-center gap-2 px-3 pt-3 font-bold">
                  <Bot className="w-5 h-5 text-blue-600" /> Personalized Recommendations
                </div>
                <div className="bg-white rounded-2xl p-3 mb-4 border border-blue-200 relative">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-2">Your AI Tutor says:</p>
                      <p className="text-gray-700 leading-relaxed text-sm">{aiRecommendation}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                  <button className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full text-xs px-3 py-1 flex items-center gap-2"><FileText className="w-4 h-4" /> Suggested Exercises</button>
                  <button className="border border-blue-300 text-blue-700 bg-transparent rounded-full text-xs px-3 py-1 flex items-center gap-2"><Play className="w-4 h-4" /> Video Resources</button>
                </div>
              </div>
            )}
            {activeTab === 'progress' && (
              <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl mb-4">
                <div className="flex items-center gap-2 px-3 pt-3 font-bold">
                  <TrendingUp className="w-5 h-5 text-purple-600" /> Subject wise progress Over Time
                </div>
                <div className="h-44 w-full px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      {/* Remove subject code from tooltip */}
                      <Tooltip
                        formatter={(_, name) => [_, codeToName[String(name)] || name]}
                      />
                      {uniqueSubjects.map((subjectCode: string, idx: number) => (
                        <Area
                          key={subjectCode}
                          type="monotone"
                          dataKey={subjectCode}
                          stackId={String(idx)}
                          stroke={subjectColors[idx % subjectColors.length]}
                          fill={subjectColors[idx % subjectColors.length]}
                          fillOpacity={0.3}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Color legend below the graph */}
                <div className="flex flex-wrap gap-4 justify-center mt-2">
                  {uniqueSubjects.map((subjectCode, idx) => (
                    <div key={subjectCode} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subjectColors[idx % subjectColors.length], display: 'inline-block' }}></span>
                      <span className="text-sm text-gray-700 font-medium">{codeToName[subjectCode] || subjectCode}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Subjects Overview - now below main analytics card area */}
        <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl mb-4">
          <div className="flex items-center gap-2 px-3 pt-3 font-bold">
            <BookOpen className="w-5 h-5 text-purple-600" /> Subjects Overview
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-3">
            {subjects.map((subject: any) => {
              const IconComponent = subject.icon;
              return (
                <Link key={subject.code} href={`/student/analytics/${subject.code}`} className="block min-w-[160px]">
                  <div className={`bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border-2 border-transparent bg-clip-padding shadow-lg hover:shadow-xl transition-all duration-300 flex-shrink-0 hover:scale-105 relative overflow-hidden ${subject.color}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${subject.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">{subject.name}</h3>

                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-700">Mastery</span>
                      <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{subject.mastery}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full mt-2">
                      <div className={`h-2 rounded-full ${subject.color}`} style={{ width: `${subject.mastery}%` }}></div>
                    </div>
                    <div className="flex justify-center mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${subject.color} shadow-md flex items-center gap-1`}>
                        {subject.mastery >= 70 ? <><Trophy className="w-3 h-3" /> Excellent</> : subject.mastery >= 50 ? <><Award className="w-3 h-3" /> Good</> : <><Flame className="w-3 h-3" /> Improving</>}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        {/* Cognitive Skill Profile - always at the bottom */}
        <div className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl mb-4">
          <div className="flex items-center gap-2 px-3 pt-3 font-bold">
            <Brain className="w-5 h-5 text-purple-600" /> Cognitive Skill Profile
          </div>
          <div className="h-64 w-full px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={cognitiveSkillData}>
                <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} strokeOpacity={0.6} radialLines={true} />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 500 }} tickCount={6} axisLine={false} />
                <Radar name="Current" dataKey="current" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} strokeWidth={3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      <InfoModal open={infoModal.open} text={infoModal.text} onClose={() => setInfoModal({ open: false, text: "" })} />
      {showQuizInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center relative animate-fade-in">
            <button onClick={() => setShowQuizInfo(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
            <div className="text-gray-800 text-lg font-bold mb-2">Latest Quiz Details</div>
            <div className="text-left space-y-2">
              <div><span className="font-semibold">Subject:</span> {latestQuizEntry?.subjectName || latestQuizEntry?.subjectCode || "-"}</div>
              <div><span className="font-semibold">Chapter:</span> {latestQuizEntry?.chapterName || latestQuizEntry?.chapterId || "-"}</div>
              <div><span className="font-semibold">Subtopic:</span> {latestQuizEntry?.subtopicName || latestQuizEntry?.subtopicId || "-"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
