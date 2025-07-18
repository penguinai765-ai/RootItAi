"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getStudentAnalytics } from '@/lib/firestoreService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '@/components/dashboard/Card';

// --- Type Definitions ---
interface AnalyticsData {
    chapterAnalytics: { name: string; averageScore: number; subjectCode: string; }[];
    domainPerformance: { name: string; averageScore: number; subjectCode: string; }[];
    subtopicAnalytics: { name: string; averageScore: number; parentChapter: string; subjectCode: string; }[];
}

interface DetailedAnalyticsDashboardProps {
  studentId: string;
  subjectCode: string;
}

const DetailedAnalyticsDashboard = ({ studentId, subjectCode }: DetailedAnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (studentId && subjectCode) {
      getStudentAnalytics(studentId)
        .then(data => {
            // --- CLIENT-SIDE FILTERING LOGIC ---
            const filteredData = {
                ...data,
                chapterAnalytics: data.chapterAnalytics.filter(c => c.subjectCode === subjectCode),
                domainPerformance: data.domainPerformance.filter(d => d.subjectCode === subjectCode),
                subtopicAnalytics: data.subtopicAnalytics.filter(s => s.subjectCode === subjectCode),
            };
            setAnalyticsData(filteredData);
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [studentId, subjectCode]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) return <p>Loading detailed analytics...</p>;
  if (!analyticsData) return <p>No detailed data available for this subject.</p>;

  return (
    <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
            <Card title="Performance by Chapter">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.chapterAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Bar dataKey="averageScore" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
            <Card title="Performance by Domain">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={analyticsData.domainPerformance} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="averageScore" nameKey="name" label>
                            {analyticsData.domainPerformance.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        </div>
    </div>
  );
};

export default DetailedAnalyticsDashboard;
