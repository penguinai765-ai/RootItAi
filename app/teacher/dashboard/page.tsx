"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTeacherDashboardData } from '@/lib/firestoreService';
import Card from '@/components/dashboard/Card';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Button from '@/components/Button';
import Link from 'next/link';

interface DashboardData {
  teacherName: string;
  schoolName: string;
  subject: string;
  classCode: string;
  activeQuizzesCount: number;
  studentCount: number;
}

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const dashboardData = await getTeacherDashboardData(user.uid);
          setData(dashboardData);
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

  if (authLoading || loading) {
    return <div className="p-8">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!data) {
    return <div className="p-8">No data available.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {data.teacherName}</h1>
          <p className="text-gray-600">{data.schoolName}</p>
          <p className="text-gray-500 text-sm mt-1">Subject: {data.subject} | Class: {data.classCode}</p>
        </div>
        <LogoutButton />
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Assign Quiz">
          <p className="mb-4">Create and assign a new quiz to your class.</p>
          <Link href="/teacher/quiz/assign">
            <Button>Create Quiz</Button>
          </Link>
        </Card>
        
        <Card title="Student Analytics">
          <p className="mb-4">View class performance and student analytics.</p>
          <Link href="/teacher/analytics">
            <Button>View Analytics</Button>
          </Link>
        </Card>
      </div>

      <div className="mt-8">
        <Card title="Quick Stats">
            <div className="flex justify-around text-center">
                <div>
                    <p className="text-4xl font-bold">{data.activeQuizzesCount}</p>
                    <p>Active Quizzes</p>
                </div>
                <div>
                    <p className="text-4xl font-bold">{data.studentCount}</p>
                    <p>Students</p>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
}
