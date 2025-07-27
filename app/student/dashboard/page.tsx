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
import LoadingLottie from "@/components/LoadingLottie";
import NoActiveQuizzesLottie from "@/components/NoActiveQuizzesLottie";
import Modal from "react-modal";
import { useRouter } from "next/navigation";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import Player from "lottie-react";
import CatMovementLottie from "@/components/assets/Cat Movement.json";
import { useSwipeable } from 'react-swipeable';

export default function StudentHomePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Removed activeTab state as it's not used with global navigation
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const router = useRouter();
  const db = getFirestore();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<any>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);

  // Ensure activeQuizzes is defined before useSwipeable
  const activeQuizzes = dashboard?.activeQuizzes || [];
  const totalCards = activeQuizzes.length;
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (totalCards > 1) setActiveCardIndex((prev) => (prev + 1) % totalCards);
    },
    onSwipedRight: () => {
      if (totalCards > 1) setActiveCardIndex((prev) => (prev - 1 + totalCards) % totalCards);
    },
    trackMouse: true,
  });

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

  if (loading) return <div className="p-8 text-center"><LoadingLottie message="Loading your dashboard..." /></div>;
  if (!dashboard || !analytics) return <div className="p-8 text-center">Could not load your dashboard data. Please try again later.</div>;

  // --- Data Mapping ---
  const studentName = dashboard.studentName;
  const className = dashboard.className;
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

  const weeklyXPInt = Math.round(weeklyXP);
  const weeklyXPTargetInt = Math.round(weeklyXPTarget);
  const xpToGo = Math.max(weeklyXPTargetInt - weeklyXPInt, 0);
  const progressPercent = weeklyXPTargetInt > 0 ? Math.round((weeklyXPInt / weeklyXPTargetInt) * 100) : 0;

  const handleCardClick = (index: number) => {
    setActiveCardIndex(index);
  };

  // Helper: Get today's date string in local time (YYYY-MM-DD)
  const getTodayDateString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: Check if rating exists for subject today
  const checkClassRatingExists = async (subjectCode: string) => {
    if (!user) return false;
    const today = getTodayDateString();
    const ratingRef = doc(db, `classRating/${subjectCode}/dailyRatings/${today}/studentRatings/${user.uid}`);
    const ratingSnap = await getDoc(ratingRef);
    return ratingSnap.exists();
  };

  // Helper: Save rating
  const saveClassRating = async (subjectCode: string, rating: number) => {
    if (!subjectCode || rating == null || !user?.uid) {
      throw new Error('[ClassRating] Missing subjectCode, rating, or user.uid');
    }
    const today = getTodayDateString();
    const ratingRef = doc(db, `classRating/${subjectCode}/dailyRatings/${today}/studentRatings/${user.uid}`);
    await setDoc(ratingRef, { rating, timestamp: serverTimestamp() });
  };

  // Helper: Fetch quiz data (simulate API call)
  const fetchQuizData = async (quizId: string) => {
    // You may want to use your quizApiService here
    // For now, just return quizId as placeholder
    return { quizId };
  };

  // Intercept Attend Now click
  const handleAttendQuiz = async (quiz: any) => {
    setPendingQuiz(quiz);
    setShowRatingModal(false);
    setQuizData(null);
    setRating(null);
    setIsSubmitting(false);
    // 1. Check if already rated today
    const alreadyRated = await checkClassRatingExists(quiz.subjectCode);
    if (alreadyRated) {
      // Go straight to quiz
      router.push(`/student/quiz/${quiz.id}`);
      return;
    }
    // 2. Show modal and fetch quiz in background
    setShowRatingModal(true);
    fetchQuizData(quiz.id).then(data => setQuizData(data));
  };

  // Modal submit
  const handleSubmitRating = async () => {
    if (!pendingQuiz || rating == null || !user?.uid) {
      console.error('[ClassRating] Submission blocked: missing pendingQuiz, rating, or user.uid');
      alert('Cannot submit rating: missing required information.');
      return;
    }
    setIsSubmitting(true);
    try {
      await saveClassRating(pendingQuiz.subjectCode, rating);
      setShowRatingModal(false);
      if (!quizData) await new Promise(res => setTimeout(res, 500));
      router.push(`/student/quiz/${pendingQuiz.id}`);
    } catch (err) {
      console.error('[ClassRating] Error saving rating:', err);
      alert('Failed to save your rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full max-w-full">
      {/* Top Header - Responsive */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 md:ml-64">
        <div className="px-3 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">Welcome, {studentName}</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-0.5">Class: {className}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center rounded-full text-base md:text-lg shadow-lg">
                {studentName?.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 md:px-6 md:py-6 space-y-6 pb-24 md:pb-6">
        {/* Active Quiz Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Active Quizzes</h2>
            {activeQuizzes.length > 0 && (
              <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-1 flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {activeQuizzes.length} Live
              </span>
            )}
          </div>

          {activeQuizzes.length > 0 ? (
            <div className="relative h-[240px] mb-6">
              {/* Card Stack Container */}
              <div
                className="relative w-full max-w-[340px] mx-auto h-full"
                {...swipeHandlers}
              >
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

                  // Use a palette of gradients for variety
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
                        transform: `translateX(${circularOffset * 60}px) translateY(${Math.abs(circularOffset) * 8}px) scale(${isActive ? 1 : 0.8 - Math.abs(circularOffset) * 0.08}) rotateY(${circularOffset * 18}deg)`,
                        opacity: Math.abs(circularOffset) > 2 ? 0 : 1 - Math.abs(circularOffset) * 0.2,
                        filter: `blur(${Math.abs(circularOffset) * 0.4}px)`,
                        zIndex: isActive ? 10 : Math.max(1, 5 - Math.abs(circularOffset)),
                      }}
                      onClick={() => handleCardClick(index)}
                    >
                      <div className={`w-full border-0 bg-gradient-to-br ${colorScheme.from} ${colorScheme.via} ${colorScheme.to} shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden group rounded-xl`} style={{ minHeight: 140, paddingBottom: 16 }}>
                        {/* Glowing effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.from} ${colorScheme.via} ${colorScheme.to} rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10 scale-110`}></div>
                        {/* Card shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-60"></div>
                        <div className="p-4 flex flex-col justify-between relative z-10">
                          {/* Top Section - Header */}
                          <div className="flex items-start justify-between mb-4">
                            {/* Left side - Subject name */}
                            <div className="space-y-1">
                              <h3 className="font-bold text-white text-base tracking-wide drop-shadow-sm leading-tight">{quiz.subjectName || quiz.subject}</h3>
                              <p className="text-white/90 text-xs font-medium leading-tight">{quiz.chapterName || quiz.chapter}</p>
                              <p className="text-white/80 text-xs leading-tight">{quiz.subtopicName || quiz.subtopic}</p>
                            </div>
                            {/* Right side - LIVE badge */}
                            <span className="bg-white text-purple-600 text-xs px-3 py-1.5 font-bold shadow-lg border border-purple-200 rounded-full">LIVE</span>
                          </div>

                          {/* Middle Section - Deadline */}
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-start gap-2 text-white/90">
                              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="text-xs">
                                <div className="font-medium">Deadline:</div>
                                <div className="leading-tight">{
                                  quiz.deadline
                                    ? (typeof quiz.deadline.toDate === 'function'
                                      ? quiz.deadline.toDate().toLocaleDateString() + ' 11:59 PM'
                                      : new Date(quiz.deadline).toLocaleDateString() + ' 11:59 PM')
                                    : 'No deadline'
                                }</div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Section - Button */}
                          <div className="mt-3 flex-shrink-0">
                            <button
                              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                              onClick={() => handleAttendQuiz(quiz)}
                            >
                              <Play className="w-5 h-5" /> Attend Now
                            </button>
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
            <div className="relative mb-8 flex justify-center">
              <div className="w-full max-w-sm mx-auto bg-purple-50 shadow-lg rounded-2xl flex flex-col items-center justify-center py-6 px-4 h-56">
                <div className="relative w-full h-24 flex items-center justify-center mb-8 overflow-visible">
                  <NoActiveQuizzesLottie message="" scale={2.2} />
                </div>
                <h3 className="font-bold text-purple-700 text-xl text-center mt-2">You’re all caught up!</h3>
                <p className="text-purple-500 text-base text-center mt-1">Enjoy your free time or review something new.</p>
              </div>
            </div>
          )}
        </section>

        {/* Enrolled Subjects Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">My Subjects</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-purple-600 font-medium">{enrolledSubjects.filter((s: any) => s.enrolled).length} Enrolled</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {enrolledSubjects.map((subject: any) => {
              const IconComponent = subject.icon;
              return (
                <Link key={subject.name} href={subject.enrolled ? `/student/plan/${subject.code}` : "#"}>
                  <div
                    className={`shadow-lg border-0 transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden ${subject.enrolled ? "bg-white hover:shadow-xl cursor-pointer" : "bg-gray-50 opacity-60 cursor-pointer hover:opacity-80"}`}
                  >
                    <div className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        {subject.enrolled ? (
                          <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg relative overflow-hidden">
                            <IconComponent className="w-6 h-6 relative z-10" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                            <Plus className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <h3 className={`font-semibold text-sm ${subject.enrolled ? "text-gray-900" : "text-gray-500"}`}>{subject.name}</h3>
                          {subject.enrolled && (
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">{subject.mastery}% Average Score</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Weekly Progress</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-purple-600 font-medium">Active</span>
            </div>
          </div>
          <div className="shadow-lg border-0 bg-purple-50 rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-lg">Weekly XP</span>
                      <div className="text-xs text-gray-600">Keep learning to earn more!</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-2xl text-gray-900">{weeklyXPInt}</div>
                    <div className="text-xs text-gray-600">/ {weeklyXPTargetInt} XP</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-purple-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-4 rounded-full bg-purple-500 shadow-lg transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 XP</span>
                    <span>{weeklyXPTargetInt} XP</span>
                  </div>
                </div>

                <div className="bg-white/50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {xpToGo} XP to go!
                      </div>
                      <div className="text-xs text-gray-600">
                        You're <span className="font-semibold text-purple-600">{progressPercent}%</span> towards your weekly goal
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={showRatingModal}
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 flex flex-col items-center">
          <div className="w-40 h-40 mx-auto mb-4">
            <Player autoplay loop animationData={CatMovementLottie} style={{ width: '100%', height: '100%' }} />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">How was today’s class for <span className="text-purple-600">{pendingQuiz?.subjectName}</span>?</h2>
          <div className="flex items-center justify-center gap-2 my-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                <span className={star <= (rating ?? 0) ? 'text-yellow-400 text-3xl' : 'text-gray-300 text-3xl'}>★</span>
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-sm text-center mb-4">Your rating is anonymous and will not be seen by your teacher. Please be honest 🙂.</p>
          {/* Assuming Button is a custom component or imported elsewhere */}
          {/* <Button
            onClick={handleSubmitRating}
            disabled={rating == null || isSubmitting}
            className="w-full py-3 text-base rounded-xl mt-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit & Start Quiz'}
          </Button> */}
          {/* Placeholder for Button component */}
          <button
            onClick={handleSubmitRating}
            disabled={rating == null || isSubmitting}
            className="w-full py-3 text-base rounded-xl mt-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit & Start Quiz'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

