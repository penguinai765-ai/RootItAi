"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getStudentDashboardData, getStudentAnalytics } from "@/lib/firestoreService";
import Link from "next/link";
import {
  Home,
  BarChart3,
  Search,
  User,
  Clock,
  Plus,
  ChevronDown,
  BookOpen,
  Calculator,
  Beaker,
  Globe,
  Palette,
  Music,
  Dumbbell,
  Languages,
  Trophy,
  Star,
  Zap,
  Target,
  Play,
  CheckCircle,
} from "lucide-react";

export default function StudentHomePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Removed activeTab state as it's not used with global navigation
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    if (user) {
      Promise.all([
        getStudentDashboardData(user.uid),
        getStudentAnalytics(user.uid),
      ]).then(([dashboardData, analyticsData]) => {
        setDashboard(dashboardData);
        setAnalytics(analyticsData);
      }).catch(err => {
        console.error("Failed to load dashboard data:", err);
      }).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!dashboard || !analytics) return <div className="p-8 text-center">Could not load your dashboard data. Please try again later.</div>;

  // --- Data Mapping ---
  const studentName = dashboard.studentName;
  const className = dashboard.className;
  const activeQuizzes = dashboard.activeQuizzes || [];
  const enrolledSubjects = analytics.subjectPerformance.map((s: any) => ({
    name: s.name,
    code: s.subjectCode,
    mastery: Math.round(s.averageScore),
    icon: s.name.toLowerCase().includes("math") ? Calculator :
      s.name.toLowerCase().includes("science") ? Beaker :
        s.name.toLowerCase().includes("history") ? BookOpen :
          s.name.toLowerCase().includes("geography") ? Globe :
            s.name.toLowerCase().includes("art") ? Palette :
              s.name.toLowerCase().includes("music") ? Music :
                s.name.toLowerCase().includes("physical") ? Dumbbell :
                  s.name.toLowerCase().includes("language") ? Languages :
                    BookOpen,
    color: s.name.toLowerCase().includes("math") ? "bg-blue-500" :
      s.name.toLowerCase().includes("science") ? "bg-green-500" :
        s.name.toLowerCase().includes("history") ? "bg-purple-500" :
          s.name.toLowerCase().includes("geography") ? "bg-orange-500" :
            s.name.toLowerCase().includes("art") ? "bg-pink-500" :
              s.name.toLowerCase().includes("music") ? "bg-indigo-500" :
                s.name.toLowerCase().includes("physical") ? "bg-red-500" :
                  s.name.toLowerCase().includes("language") ? "bg-cyan-500" :
                    "bg-blue-500",
    enrolled: true,
  }));
  // Add placeholders for not enrolled subjects if needed (optional)

  const weeklyXP = analytics.xp || 0;
  const weeklyXPTarget = analytics.xpToNextLevel || 1000;

  const handleCardClick = (index: number) => {
    setActiveCardIndex(index);
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Welcome, {studentName}</h1>
              <p className="text-sm text-gray-600 mt-1">Class: {className}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center rounded-full text-lg">
                {studentName?.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8 pb-24">
        {/* Active Quiz Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Active Quizzes</h2>
            {activeQuizzes.length > 0 && (
              <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {activeQuizzes.length} Live
              </span>
            )}
          </div>

          {activeQuizzes.length > 0 ? (
            <div className="relative h-[260px] mb-8">
              {/* Card Stack Container */}
              <div className="relative w-full max-w-[360px] mx-auto h-full">
                {activeQuizzes.map((quiz: any, index: number) => {
                  // Calculate circular position
                  const totalCards = activeQuizzes.length;
                  let circularOffset = index - activeCardIndex;

                  // Handle circular wrapping
                  if (circularOffset > totalCards / 2) {
                    circularOffset -= totalCards;
                  } else if (circularOffset < -totalCards / 2) {
                    circularOffset += totalCards;
                  }

                  const isActive = circularOffset === 0;

                  // Generate unique colors based on subject and index
                  const colorSchemes = [
                    { from: "from-purple-500", via: "via-pink-500", to: "to-blue-500" },
                    { from: "from-emerald-500", via: "via-teal-500", to: "to-cyan-500" },
                    { from: "from-orange-500", via: "via-red-500", to: "to-pink-500" },
                    { from: "from-indigo-500", via: "via-purple-500", to: "to-violet-500" },
                    { from: "from-green-500", via: "via-emerald-500", to: "to-teal-500" },
                    { from: "from-blue-500", via: "via-indigo-500", to: "to-purple-500" },
                    { from: "from-rose-500", via: "via-pink-500", to: "to-purple-500" },
                    { from: "from-cyan-500", via: "via-blue-500", to: "to-indigo-500" },
                  ];

                  const colorScheme = colorSchemes[index % colorSchemes.length];

                  return (
                    <div
                      key={quiz.id}
                      className={`absolute top-0 left-0 w-full transition-all duration-500 ease-out cursor-pointer ${isActive ? "z-10" : "z-5"}`}
                      style={{
                        transform: `translateX(${circularOffset * 50}px) translateY(${Math.abs(circularOffset) * 5}px) scale(${isActive ? 1 : 0.85 - Math.abs(circularOffset) * 0.05}) rotateY(${circularOffset * 15}deg)`,
                        opacity: Math.abs(circularOffset) > 2 ? 0 : 1 - Math.abs(circularOffset) * 0.2,
                        filter: `blur(${Math.abs(circularOffset) * 0.4}px)`,
                        zIndex: isActive ? 10 : Math.max(1, 5 - Math.abs(circularOffset)),
                      }}
                      onClick={() => handleCardClick(index)}
                    >
                      <div className={`w-full h-[200px] border-0 bg-gradient-to-br ${colorScheme.from} ${colorScheme.via} ${colorScheme.to} shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden group rounded-xl`}>
                        {/* Glowing effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.from} ${colorScheme.via} ${colorScheme.to} rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10 scale-110`}></div>
                        {/* Card shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-60"></div>
                        <div className="p-4 h-full flex flex-col justify-between relative z-10">
                          {/* Top Section - Header */}
                          <div className="flex items-start justify-between mb-4">
                            {/* Left side - Subject name */}
                            <div className="space-y-1">
                              <h3 className="font-bold text-white text-lg tracking-wide drop-shadow-sm leading-tight">{quiz.subjectName || quiz.subject}</h3>
                              <p className="text-white/90 text-sm font-medium leading-tight">{quiz.chapterName || quiz.chapter}</p>
                              <p className="text-white/80 text-xs leading-tight">{quiz.subtopicName || quiz.subtopic}</p>
                            </div>
                            {/* Right side - LIVE badge */}
                            <span className="bg-red-500 text-white text-xs px-3 py-1.5 font-bold shadow-lg border border-red-400 rounded-full">🔴 LIVE</span>
                          </div>

                          {/* Middle Section - Deadline */}
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-start gap-2 text-white/90">
                              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="text-xs">
                                <div className="font-medium">Deadline:</div>
                                <div className="leading-tight">{quiz.deadline ? (typeof quiz.deadline.toDate === 'function' ? quiz.deadline.toDate().toLocaleDateString() + ' ' + quiz.deadline.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(quiz.deadline).toLocaleDateString() + ' ' + new Date(quiz.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'No deadline'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Section - Button */}
                          <div className="mt-3">
                            <Link href={`/student/quiz/${quiz.id}`}>
                              <button className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                                <Play className="w-5 h-5" /> Attend Now
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Card indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {activeQuizzes.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleCardClick(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "bg-purple-600 w-6" : "bg-gray-300 hover:bg-gray-400"}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="relative h-[240px] mb-8">
              <div className="w-full max-w-[340px] mx-auto h-full flex items-center">
                <div className="w-full h-[200px] border-0 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 shadow-2xl relative overflow-hidden rounded-xl flex flex-col items-center justify-center text-center">
                  {/* Glowing effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-xl blur-xl opacity-50 -z-10 scale-110"></div>
                  {/* Card shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-60"></div>
                  <div className="p-8 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 mb-2">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-white text-xl drop-shadow-sm">You're all caught up! 🎉</h3>
                      <p className="text-white/90 text-sm">Great job staying on top of your quizzes</p>
                    </div>
                    <button className="bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold px-6 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg">
                      Continue My Learning
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Enrolled Subjects Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">My Subjects</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-purple-600 font-medium">{enrolledSubjects.filter((s: any) => s.enrolled).length} Enrolled</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {enrolledSubjects.map((subject: any) => {
              const IconComponent = subject.icon;
              return (
                <Link key={subject.name} href={subject.enrolled ? `/student/analytics/${subject.code}` : "#"}>
                  <div
                    className={`shadow-lg border-0 transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden ${subject.enrolled ? "bg-white hover:shadow-xl cursor-pointer" : "bg-gray-50 opacity-60 cursor-pointer hover:opacity-80"}`}
                  >
                    <div className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        {subject.enrolled ? (
                          <div className={`w-12 h-12 ${subject.color} rounded-2xl flex items-center justify-center text-white shadow-lg relative overflow-hidden`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${subject.color} opacity-80`}></div>
                            <IconComponent className="w-6 h-6 relative z-10" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                            <Plus className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <h3 className={`font-semibold text-sm ${subject.enrolled ? "text-gray-900" : "text-gray-500"}`}>{subject.name}</h3>
                          {subject.enrolled && (
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">{subject.mastery}% Mastery</span>
                            </div>
                          )}
                          {!subject.enrolled && <p className="text-xs text-gray-400">Tap to enroll</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Progress Tracker Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Weekly Progress</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-600 font-medium">Active</span>
            </div>
          </div>
          <div className="shadow-lg border-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-lg">Weekly XP</span>
                      <div className="text-xs text-gray-600">Keep learning to earn more!</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-2xl text-gray-900">
                      {weeklyXP}
                    </div>
                    <div className="text-xs text-gray-600">/ {weeklyXPTarget} XP</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-purple-600">{Math.round((weeklyXP / weeklyXPTarget) * 100)}%</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 shadow-lg transition-all duration-500"
                      style={{ width: `${(weeklyXP / weeklyXPTarget) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 XP</span>
                    <span>{weeklyXPTarget} XP</span>
                  </div>
                </div>

                <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {weeklyXPTarget - weeklyXP} XP to go!
                      </div>
                      <div className="text-xs text-gray-600">
                        You're <span className="font-semibold text-purple-600">{Math.round((weeklyXP / weeklyXPTarget) * 100)}%</span> towards your weekly goal
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Remove duplicate bottom navigation - using global BottomNav component */}
    </div>
  );
}

