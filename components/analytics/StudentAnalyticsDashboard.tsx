"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getStudentAnalytics } from '@/lib/firestoreService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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

// --- Reusable Dashboard Component ---
interface StudentAnalyticsDashboardProps { studentId: string; }

const StudentAnalyticsDashboard = ({ studentId }: StudentAnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{name: string, data: TrendData[]} | null>(null);

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
                  <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                          <Pie data={analyticsData.domainPerformance} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="averageScore" nameKey="name" label={({ name, percent }) => {
  const value = typeof percent === "number" ? percent * 100 : 0;
  return `${name} ${value.toFixed(0)}%`;
}}>
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
                <div className="space-y-4 overflow-y-auto" style={{maxHeight: '250px'}}>
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
