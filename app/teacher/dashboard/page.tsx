"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTeacherDashboardData, getAssignedQuizzes, migrateQuizAssignedDates, getClassRatingsForDate } from '@/lib/firestoreService';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Button from '@/components/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Calendar,
  Filter,
  X,
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  BarChart3,
  Award,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
  Star
} from 'lucide-react';
import LoadingLottie from "@/components/LoadingLottie";
import Card from '@/components/dashboard/Card';
import Modal from 'react-modal';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirestore } from '@/lib/firebase';

interface DashboardData {
  teacherName: string;
  schoolName: string;
  subject: string;
  classCode: string;
  activeQuizzesCount: number;
  studentCount: number;
  subjectCode: string; // Add this line
}

interface QuizData {
  id: string;
  subjectName: string;
  chapterName: string;
  subtopicName: string;
  status: string;
  submitted: number;
  total: number;
  due: Date;
  assignedDate: Date;
  timeLimit?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-200";
    case "completed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "expired":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <CheckCircle className="w-4 h-4" />;
    case "completed":
      return <Award className="w-4 h-4" />;
    case "expired":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [viewResultsLoading, setViewResultsLoading] = useState<string | null>(null); // quizId or null
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<{ average: number, count: number } | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          // First, migrate any existing quizzes that don't have assignedDate
          try {
            await migrateQuizAssignedDates(user.uid);
          } catch (migrationError) {
            console.warn("Migration failed, continuing with existing data:", migrationError);
          }

          const [dashboardData, quizzesData] = await Promise.all([
            getTeacherDashboardData(user.uid),
            getAssignedQuizzes(user.uid)
          ]);
          setData(dashboardData);
          setQuizzes(quizzesData);
        } catch (err: any) {
          setError(err.message || 'Failed to load dashboard data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (data?.subjectCode) {
      setFeedbackLoading(true);
      // Get today's local date string (YYYY-MM-DD)
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Fetch all student IDs
      (async () => {
        try {
          const studentsSnap = await getDocs(collection(getFirestore(), 'students'));
          const studentIds = studentsSnap.docs.map(doc => doc.id);

          // --- Fetch today's feedback for the card ---
          let todayRatings: number[] = [];
          for (const studentId of studentIds) {
            const ratingDocRef = doc(getFirestore(), `classRating/${data.subjectCode}/dailyRatings/${todayStr}/studentRatings/${studentId}`);
            const ratingDocSnap = await getDoc(ratingDocRef);
            if (ratingDocSnap.exists()) {
              const rating = ratingDocSnap.data().rating;
              if (typeof rating === 'number') {
                todayRatings.push(rating);
              }
            }
          }
          const todayCount = todayRatings.length;
          const todayAverage = todayCount > 0 ? todayRatings.reduce((a, b) => a + b, 0) / todayCount : 0;
          setFeedbackStats({ average: todayAverage, count: todayCount });

          // --- Fetch feedback history for the graph ---
          const dailyRatingsRef = collection(getFirestore(), `classRating/${data.subjectCode}/dailyRatings`);
          const dailySnaps = await getDocs(dailyRatingsRef);
          const allDates = dailySnaps.docs.map(doc => doc.id);
          const history: any[] = [];
          for (const date of allDates) {
            let ratings: number[] = [];
            for (const studentId of studentIds) {
              const ratingDocRef = doc(getFirestore(), `classRating/${data.subjectCode}/dailyRatings/${date}/studentRatings/${studentId}`);
              const ratingDocSnap = await getDoc(ratingDocRef);
              if (ratingDocSnap.exists()) {
                const rating = ratingDocSnap.data().rating;
                if (typeof rating === 'number') {
                  ratings.push(rating);
                }
              }
            }
            const count = ratings.length;
            const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;
            if (count > 0) {
              history.push({ date, average, count });
            }
          }
          history.sort((a, b) => a.date.localeCompare(b.date));
          setFeedbackHistory(history);
        } catch (err) {
          setFeedbackStats(null);
          setFeedbackHistory([]);
          console.error('[ClassRating] Error fetching feedback data:', err);
        } finally {
          setFeedbackLoading(false);
        }
      })();
    }
  }, [data?.subjectCode]);

  const handleFilterQuizzes = async () => {
    if (!user || !filterDate) return;

    try {
      const selectedDate = new Date(filterDate);
      const dateFilter = { startDate: selectedDate };
      const filteredQuizzes = await getAssignedQuizzes(user.uid, dateFilter);
      setQuizzes(filteredQuizzes);
    } catch (err: any) {
      console.error('Error filtering quizzes:', err);
    }
  };

  const clearFilter = async () => {
    if (!user) return;
    setFilterDate('');
    try {
      const allQuizzes = await getAssignedQuizzes(user.uid);
      setQuizzes(allQuizzes);
    } catch (err: any) {
      console.error('Error clearing filter:', err);
    }
  };

  const getSubmissionRate = (submitted: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((submitted / total) * 100);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingLottie message="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Data Available</h2>
          <p className="text-gray-600">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  const activeQuizzes = quizzes.filter(q => q.status === 'active');
  const completedQuizzes = quizzes.filter(q => q.status === 'completed');
  const totalSubmissions = quizzes.reduce((sum, q) => sum + q.submitted, 0);
  const totalStudents = quizzes.reduce((sum, q) => sum + q.total, 0);
  const averageSubmissionRate = totalStudents > 0 ? Math.round((totalSubmissions / totalStudents) * 100) : 0;

  // Before rendering the graph modal, add a debug log
  console.log('[ClassRating] feedbackHistory for graph:', feedbackHistory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14"> {/* Reduce height from h-16 to h-14 */}
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">Welcome back, {data.teacherName}</h1> {/* Reduce text size */}
              <p className="text-xs text-gray-600">{data.schoolName} • {data.subject} • Class {data.classCode}</p> {/* Reduce text size */}
            </div>
            <div className="flex items-center gap-3"> {/* Reduce gap */}
              <div className="w-8 h-8 bg-purple-100 text-purple-700 font-semibold flex items-center justify-center rounded-full text-base"> {/* Smaller avatar */}
                {data.teacherName?.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <LogoutButton className="px-1.5 py-0.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded" /> {/* Smaller button */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition" onClick={() => setShowFeedbackModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Class Feedback</p>
                <p className="text-2xl font-bold text-gray-900">
                  {feedbackStats ? `⭐️ ${feedbackStats.average.toFixed(1)} / 5` : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{data?.subject} • {feedbackStats ? `Based on feedback from ${feedbackStats.count} students.` : ''}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{activeQuizzes.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Submission Rate</p>
                <p className="text-2xl font-bold text-gray-900">{averageSubmissionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students completed quizz</p>
                <p className="text-2xl font-bold text-gray-900">{completedQuizzes.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Quiz</h3>
                <p className="text-sm text-gray-600">Assign a quiz to your students</p>
              </div>
            </div>
            <Link href="/teacher/quiz/assign">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Analytics</h3>
                <p className="text-sm text-gray-600">Analyze student performance</p>
              </div>
            </div>
            <Link href="/teacher/analytics" className="w-full block">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Quiz Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Quiz Management</h2>
                  <p className="text-sm text-gray-600">Manage and monitor your assigned quizzes</p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                {filterDate && (
                  <button
                    onClick={clearFilter}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Date Filter */}
            {showDateFilter && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Assignment Date</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleFilterQuizzes}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      Apply Filter
                    </button>
                  </div>
                  {filterDate && (
                    <div className="flex items-center text-xs text-purple-600">
                      <span className="bg-purple-100 px-2 py-1 rounded-full">
                        Showing quizzes from {new Date(filterDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quiz List */}
          <div className="p-6">
            {quizzes.length > 0 ? (
              <div className="space-y-4">
                {quizzes.map((quiz: QuizData) => {
                  const submissionRate = getSubmissionRate(quiz.submitted, quiz.total);
                  const daysUntilDue = getDaysUntilDue(quiz.due);
                  const isOverdue = daysUntilDue < 0;
                  const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;

                  return (
                    <div key={quiz.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Quiz Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {quiz.subjectName} - {quiz.chapterName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">Subtopic: {quiz.subtopicName}</p>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(quiz.status)}`}>
                              {getStatusIcon(quiz.status)}
                              {quiz.status}
                            </div>
                          </div>

                          {/* Progress and Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{quiz.submitted}</p>
                              <p className="text-xs text-gray-600">Submitted</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{quiz.total}</p>
                              <p className="text-xs text-gray-600">Total Students</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{submissionRate}%</p>
                              <p className="text-xs text-gray-600">Completion Rate</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                                {isOverdue ? Math.abs(daysUntilDue) : daysUntilDue}
                              </p>
                              <p className="text-xs text-gray-600">
                                {isOverdue ? 'Days Overdue' : isDueSoon ? 'Days Left' : 'Days Left'}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Submission Progress</span>
                              <span>{submissionRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${submissionRate}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {quiz.due.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Assigned: {quiz.assignedDate.toLocaleDateString()}
                            </span>
                            {quiz.timeLimit && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Time Limit: {quiz.timeLimit} min
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 lg:flex-shrink-0">
                          {viewResultsLoading === quiz.id ? (
                            <div className="w-full flex items-center justify-center py-4">
                              <LoadingLottie message="Loading results..." />
                            </div>
                          ) : (
                            <button
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={async () => {
                                setViewResultsLoading(quiz.id);
                                router.push(`/teacher/quiz/report/${quiz.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              View Results
                            </button>
                          )}
                          <div className="flex gap-2">

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
                <p className="text-gray-600 mb-6">
                  {filterDate ? 'No quizzes were assigned on the selected date.' : 'You haven\'t created any quizzes yet.'}
                </p>
                <Link href="/teacher/quiz/assign">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback History Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onRequestClose={() => setShowFeedbackModal(false)}
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4">Class Feedback Over Time</h2>
          <>
            {feedbackLoading ? (
              <LoadingLottie message="Loading feedback history..." />
            ) : feedbackHistory.length === 0 ? (
              <div className="text-gray-400 text-lg text-center py-16">No feedback data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={feedbackHistory} margin={{ top: 30, right: 40, left: 0, bottom: 30 }}>
                  <defs>
                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 13, fontWeight: 600, fill: '#6366f1' }} angle={-20} dy={10} />
                  <YAxis domain={[1, 5]} tickCount={5} tick={{ fontSize: 13, fontWeight: 600, fill: '#6366f1' }} />
                  <Tooltip contentStyle={{ background: '#fff8e1', border: '1px solid #fbbf24', borderRadius: 12, fontWeight: 600, color: '#92400e' }}
                    labelStyle={{ color: '#92400e', fontWeight: 700 }}
                    formatter={(value: number) => `${value.toFixed(2)} ⭐️`} />
                  <Area type="monotone" dataKey="average" stroke="none" fill="url(#colorRating)" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="average" stroke="#fbbf24" strokeWidth={4} dot={{ r: 7, fill: '#fbbf24', stroke: '#fff', strokeWidth: 3 }} activeDot={{ r: 10, fill: '#f59e42', stroke: '#fff', strokeWidth: 4 }} name="Average Rating" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
          <button onClick={() => setShowFeedbackModal(false)} className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700">Close</button>
        </div>
      </Modal>
    </div>
  );
}
