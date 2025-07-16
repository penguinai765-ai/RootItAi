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
interface SubtopicPerformance { name: string; averageScore: number; parentChapter: string; }
interface TeacherAnalyticsData {
    classAverage: number;
    studentList: StudentAnalytics[];
    chapterPerformance: ChapterPerformance[];
    subtopicPerformance: SubtopicPerformance[];
}

const findTopAndBottom = (items: ChapterPerformance[]) => {
    if (!items || items.length === 0) return { top: null, bottom: null };
    const sorted = [...items].sort((a, b) => b.averageScore - a.averageScore);
    return { top: sorted[0], bottom: sorted[sorted.length - 1] };
};

// --- Main Component ---
export default function TeacherAnalyticsPage() {
    const { user } = useAuth();
    const [analyticsData, setAnalyticsData] = useState<TeacherAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            getTeacherAnalytics(user.uid)
                .then(data => {
                    setAnalyticsData(data);
                    if (data?.chapterPerformance?.length > 0) {
                        const topChapter = findTopAndBottom(data.chapterPerformance).top;
                        if (topChapter) setSelectedChapter(topChapter.name);
                    }
                })
                .catch(err => { console.error(err); setError("Could not load class analytics."); })
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    const performanceInsights = useMemo(() => {
        if (!analyticsData) return null;
        const studentsToWatch = analyticsData.studentList.filter(s => s.overallScore < 50).length;
        const chapterStats = findTopAndBottom(analyticsData.chapterPerformance);
        return { studentsToWatch, ...chapterStats };
    }, [analyticsData]);

    const filteredSubtopics = useMemo(() => {
        if (!selectedChapter || !analyticsData) return [];
        return analyticsData.subtopicPerformance.filter(s => s.parentChapter === selectedChapter);
    }, [selectedChapter, analyticsData]);

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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Class Performance by Chapter">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.chapterPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            {/* --- THIS IS THE CORRECTED PART --- */}
                            {/* The onClick handler is moved to the Bar element itself */}
                            <Bar 
                                dataKey="averageScore" 
                                fill="#8884d8" 
                                name="Avg Score"
                                onClick={(data) => {
                                    // The 'data' object here is the payload for the clicked bar, e.g., { name: 'Algebra', ... }
                                    // We can now safely access the 'name' property.
                                    if (data && data.name) {
                                        setSelectedChapter(data.name);
                                    }
                                }}
                                cursor="pointer"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                
                <Card title={selectedChapter ? `Subtopics in "${selectedChapter}"` : "Subtopic Performance (Click a Chapter)"}>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredSubtopics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={false} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="averageScore" fill="#82ca9d" name="Avg Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card title="Student Roster">
                <ul className="space-y-2">
                    {analyticsData.studentList.map(student => (
                        <li key={student.id} className="p-2 rounded-md hover:bg-gray-100">
                            <Link href={`/teacher/analytics/${student.id}`} className="flex justify-between items-center">
                                <span>{student.name}</span>
                                <span className="font-bold">{student.overallScore}%</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}
