"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getStudentDashboardData } from '@/lib/firestoreService';
import Card from '@/components/dashboard/Card';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Button from '@/components/Button';
import Link from 'next/link';

interface Quiz {
    id: string;
    subject: string;
    topic: string;
    deadline: any;
}

interface StudentData {
  studentName: string;
  className: string;
  activeQuizzes: Quiz[];
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const dashboardData = await getStudentDashboardData(user.uid);
          setData(dashboardData);
        } catch (err) {
          setError('Failed to load dashboard data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8">{error}</div>;
  }

  if (!data) {
    return <div className="p-8">No data available.</div>;
  }

  const hasActiveQuizzes = (data?.activeQuizzes?.length || 0) > 0;

  return (
    <div className="p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
            <div>
            <h1 className="text-3xl font-bold">Welcome, {data.studentName}</h1>
            <p className="text-gray-600">Class: {data.className}</p>
            </div>
            <LogoutButton />
        </header>
        
        <h2 className="text-2xl font-bold mb-4">Active Quizzes</h2>
        
        {!hasActiveQuizzes ? (
            <p>No active quizzes at the moment. Great job!</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.activeQuizzes.map((quiz) => (
                    <Card key={quiz.id} title={quiz.subject}>
                        <p className="text-lg mb-2">{quiz.topic}</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Deadline: {new Date(quiz.deadline?.toDate()).toLocaleDateString()}
                        </p>
                        <Link href={`/student/quiz/${quiz.id}`}>
                          <Button>Attend Quiz</Button>
                        </Link>
                    </Card>
                ))}
            </div>
        )}
    </div>
  );
}
