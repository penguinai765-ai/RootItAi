"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTeacherAnalytics } from '@/lib/firestoreService';
import Link from 'next/link';
import Card from '@/components/dashboard/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Type Definitions ---
interface StudentAnalytics { id: string; name: string; division: string; overallScore: number; }
interface ChapterPerformance { name: string; averageScore: number; }
interface TeacherAnalyticsData {
    classAverage: number;
    studentList: StudentAnalytics[];
    chapterPerformance: ChapterPerformance[];
    subjectCode: string; // This is crucial for linking
}

const findTopAndBottom = (items: ChapterPerformance[]) => {
    if (!items || items.length === 0) return { top: null, bottom: null };
    const sorted = [...items].sort((a, b) => b.averageScore - a.averageScore);
    return {
        top: sorted[0],
        bottom: sorted[sorted.length - 1],
    };
};

// --- Main Component ---
export default function TeacherAnalyticsPage() {
    const { user } = useAuth();
    const [analyticsData, setAnalyticsData] = useState<TeacherAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<'performance' | 'division'>('performance');

    useEffect(() => {
        if (user) {
            getTeacherAnalytics(user.uid)
                .then(data => setAnalyticsData(data))
                .catch(err => {
                    console.error(err);
                    setError("Could not load class analytics.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    const performanceInsights = useMemo(() => {
        if (!analyticsData) return null;
        const studentsToWatch = analyticsData.studentList.filter(s => s.overallScore < 50).length;
        const chapterStats = findTopAndBottom(analyticsData.chapterPerformance);
        return { studentsToWatch, ...chapterStats };
    }, [analyticsData]);

    const groupedStudents = useMemo(() => {
        if (!analyticsData) return {};
        
        if (groupBy === 'division') {
            return analyticsData.studentList.reduce((acc, student) => {
                const key = `Division ${student.division}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(student);
                return acc;
            }, {} as Record<string, StudentAnalytics[]>);
        } else { // Group by performance
            const groups = {
                'Strong (80%+)': [],
                'Average (50-79%)': [],
                'Needs Support (<50%)': [],
            } as Record<string, StudentAnalytics[]>;

            analyticsData.studentList.forEach(student => {
                if (student.overallScore >= 80) groups['Strong (80%+)'].push(student);
                else if (student.overallScore >= 50) groups['Average (50-79%)'].push(student);
                else groups['Needs Support (<50%)'].push(student);
            });
            return groups;
        }
    }, [analyticsData, groupBy]);

    if (isLoading) return <div className="p-8">Loading class analytics...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!analyticsData) return <div className="p-8">No analytics data found for this class.</div>;

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold">Class Mission Control</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Class Average"><p className="text-3xl font-bold">{analyticsData.classAverage.toFixed(1)}%</p></Card>
                <Card title="Students to Watch"><p className="text-3xl font-bold">{performanceInsights?.studentsToWatch}</p></Card>
                <Card title="Top Chapter">
                    <p className="text-lg font-semibold truncate">{performanceInsights?.top?.name || 'N/A'}</p>
                    {performanceInsights?.top && (<span className="text-green-500">{performanceInsights.top.averageScore.toFixed(1)}%</span>)}
                </Card>
                <Card title="Needs Focus">
                    <p className="text-lg font-semibold truncate">{performanceInsights?.bottom?.name || 'N/A'}</p>
                    {performanceInsights?.bottom && (<span className="text-red-500">{performanceInsights.bottom.averageScore.toFixed(1)}%</span>)}
                </Card>
            </div>
            
            <Card title="Class Performance by Chapter">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.chapterPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="averageScore" fill="#8884d8" name="Avg Score" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card title="Student Roster">
                <div className="flex justify-end mb-4">
                    <select onChange={(e) => setGroupBy(e.target.value as any)} value={groupBy} className="p-2 border rounded-md">
                        <option value="performance">Group by Performance</option>
                        <option value="division">Group by Division</option>
                    </select>
                </div>

                <div className="space-y-6">
                    {Object.entries(groupedStudents).map(([groupName, students]) => (
                        <div key={groupName}>
                            <h3 className="text-lg font-semibold mb-2 border-b pb-1">{groupName} ({students.length})</h3>
                            <ul className="space-y-2">
                                {students.map(student => (
                                    <li key={student.id} className="p-2 rounded-md hover:bg-gray-100">
                                        <Link 
                                            href={`/teacher/analytics/${student.id}?subjectCode=${analyticsData.subjectCode}`} 
                                            className="flex justify-between items-center"
                                        >
                                            <span>{student.name}</span>
                                            <span className="font-bold">{student.overallScore}%</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
