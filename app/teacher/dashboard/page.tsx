"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTeacherDashboardData, getAssignedQuizzes, migrateQuizAssignedDates } from '@/lib/firestoreService';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Button from '@/components/Button';
import Link from 'next/link';
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
  Trash2
} from 'lucide-react';

interface DashboardData {
  teacherName: string;
  schoolName: string;
  subject: string;
  classCode: string;
  activeQuizzesCount: number;
  studentCount: number;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Welcome back, {data.teacherName}</h1>
              <p className="text-sm text-gray-600">{data.schoolName} • {data.subject} • Class {data.classCode}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center rounded-full text-lg">
                {data.teacherName?.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{data.studentCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
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
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
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
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
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
                          <Link href={`/teacher/quiz/report/${quiz.id}`}>
                            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-sm hover:shadow-md">
                              <Eye className="w-4 h-4" />
                              View Results
                            </button>
                          </Link>
                          <div className="flex gap-2">
                            <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
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
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
