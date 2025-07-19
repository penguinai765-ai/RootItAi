"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getStudentAnalytics } from '@/lib/firestoreService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList, Cell } from 'recharts';
import Card from '@/components/dashboard/Card';
import SubtopicTrendModal from './SubtopicTrendModal';

// --- Type Definitions ---
interface TrendData { date: string; score: number; }
interface DomainPerformance { name: string; averageScore: number; }
interface ChapterPerformance { name: string; averageScore: number; }
interface SubtopicPerformance { name: string; averageScore: number; parentChapter: string; }
interface AnalyticsData {
    scoreOverTime: TrendData[];
    chapterAnalytics: ChapterPerformance[];
    subtopicAnalytics: SubtopicPerformance[];
    subtopicTrends: Record<string, TrendData[]>;
    domainPerformance: DomainPerformance[];
}

// --- Skeleton Loaders ---
const SkeletonChart = () => <div className="animate-pulse bg-gray-200 rounded-lg" style={{ height: '300px' }} />;
const SkeletonList = () => (
    <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-200 rounded-md" />)}
    </div>
);

// --- New: Mobile-friendly DomainPerformanceBarChart ---
interface DomainPerformanceBarChartProps {
    domainPerformance: { name: string; averageScore: number }[];
}

export const DomainPerformanceBarChart = ({ domainPerformance }: DomainPerformanceBarChartProps) => {
    const BAR_COLORS = ["#003366", "#0099A8", "#8CE051", "#6366f1"]; // navy, teal, green, fallback
    if (!domainPerformance || domainPerformance.length === 0) {
        return <div className="flex items-center justify-center h-24 text-gray-400 text-base">No domain performance data available yet.</div>;
    }
    return (
        <div className="w-full px-1 pt-1 pb-0">
            <h2 className="text-base font-bold mb-0 text-center">Performance by Domain</h2>
            <ResponsiveContainer width="100%" height={90}>
                <BarChart
                    data={domainPerformance}
                    margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
                    barCategoryGap={"45%"}
                >
                    <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600 }}
                        width={18}
                    />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600 }}
                        height={16}
                    />
                    <Bar
                        dataKey="averageScore"
                        barSize={16}
                        radius={[7, 7, 0, 0]}
                        isAnimationActive={true}
                    >
                        {domainPerformance.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- Reusable Dashboard Component ---
interface StudentAnalyticsDashboardProps { studentId: string; }

const StudentAnalyticsDashboard = ({ studentId }: StudentAnalyticsDashboardProps) => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
    const [modalData, setModalData] = useState<{ name: string, data: TrendData[] } | null>(null);

    useEffect(() => {
        if (studentId) {
            setIsLoading(true);
            getStudentAnalytics(studentId)
                .then(data => {
                    setAnalyticsData(data);
                    if (data?.chapterAnalytics?.length > 0) {
                        setSelectedChapter(data.chapterAnalytics[0].name);
                    }
                })
                .catch(err => { console.error(err); setError("Could not load analytics data."); })
                .finally(() => setIsLoading(false));
        }
    }, [studentId]);

    const filteredSubtopics = useMemo(() => {
        if (!selectedChapter || !analyticsData?.subtopicAnalytics) return [];
        return analyticsData.subtopicAnalytics.filter(s => s.parentChapter === selectedChapter);
    }, [selectedChapter, analyticsData]);

    const handleSubtopicClick = (subtopicName: string) => {
        if (analyticsData?.subtopicTrends?.[subtopicName]) {
            setModalData({ name: subtopicName, data: analyticsData.subtopicTrends[subtopicName] });
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    if (error) return <p className="text-red-500 p-4">{error}</p>;
    if (isLoading) return (
        <div className="space-y-8 p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"><SkeletonChart /><SkeletonChart /><SkeletonChart /></div>
            <SkeletonChart />
        </div>
    );
    if (!analyticsData) return <p className="p-4">No analytics data available yet.</p>;

    return (
        <>
            {modalData && (
                <SubtopicTrendModal
                    subtopicName={modalData.name}
                    trendData={modalData.data}
                    onClose={() => setModalData(null)}
                />
            )}
            <div className="space-y-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <Card title="Overall Score Over Time" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analyticsData.scoreOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                <Legend />
                                <Line type="monotone" dataKey="score" stroke="#8884d8" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card title="Performance by Domain">
                        {analyticsData.domainPerformance.length === 0 ? (
                            <div className="flex items-center justify-center h-72 text-gray-400 text-lg">No domain performance data available yet.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analyticsData.domainPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontWeight: 'bold', fontSize: 14 }} />
                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                    <Legend />
                                    <Bar dataKey="averageScore" name="Average Score" fill="#8884d8" radius={[8, 8, 0, 0]}>
                                        <LabelList dataKey="averageScore" position="top" content={({ value }) => value !== undefined ? `${Math.round(Number(value))}%` : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card title="Performance by Chapter">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analyticsData.chapterAnalytics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                {/* --- THIS IS THE CORRECTED PART --- */}
                                <Bar
                                    dataKey="averageScore"
                                    fill="#82ca9d"
                                    name="Average Score"
                                    cursor="pointer"
                                    onClick={(data) => {
                                        // The 'data' object here is the payload for the clicked bar.
                                        // We can now safely access the 'name' property.
                                        if (data && data.name) {
                                            setSelectedChapter(data.name);
                                        }
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card title={selectedChapter ? `Subtopics in "${selectedChapter}"` : "Subtopic Performance"}>
                        <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '250px' }}>
                            {filteredSubtopics.length > 0 ? (
                                filteredSubtopics.map(subtopic => (
                                    <div key={subtopic.name} onClick={() => handleSubtopicClick(subtopic.name)} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <span>{subtopic.name}</span>
                                        <span className="font-semibold">{Math.round(subtopic.averageScore)}%</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center pt-10">{selectedChapter ? "No subtopic data for this chapter." : "Click a chapter on the left to see subtopics."}</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default StudentAnalyticsDashboard;
