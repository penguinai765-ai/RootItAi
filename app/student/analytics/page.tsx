"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getStudentAnalytics } from '@/lib/firestoreService';
import { InsightCard } from '@/components/analytics/InsightCard';
import { SubjectCard } from '@/components/analytics/SubjectCard';

// --- Skeleton Loaders for a better UX ---
const SkeletonHeader = () => <div className="h-10 bg-gray-200 rounded-md w-1/2 animate-pulse mb-10" />;
const SkeletonCard = () => <div className="bg-white rounded-2xl shadow-md p-5 h-36 animate-pulse" />;
const SkeletonSubjectRow = () => <div className="h-48 bg-white rounded-2xl shadow-md p-5 animate-pulse" />;

// Helper to map subjects to icons/colors for the UI
const subjectUIMap: Record<string, { icon: string, color: string }> = {
    'science08': { icon: 'fa-flask', color: 'teal' },
    'math08': { icon: 'fa-calculator', color: 'royal' },
    // Add more subjects as needed
    'default': { icon: 'fa-book-open', color: 'electric' }
};

export default function GamifiedAnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getStudentAnalytics(user.uid)
                .then(data => setAnalytics(data))
                .catch(err => console.error("Failed to load student analytics", err))
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    if (isLoading) {
        return (
            <main className="pt-20 pb-24 px-4">
                <SkeletonHeader />
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
                <SkeletonSubjectRow />
            </main>
        );
    }
    
    if (!analytics) {
        return <div className="p-8 text-center">Could not load your analytics data. Please try again later.</div>;
    }

    // --- Main JSX for the Gamified Dashboard ---
    return (
        <main className="pt-20 pb-24 px-4">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white bg-opacity-90 backdrop-blur-sm shadow-sm z-10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="relative animate-wiggle">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric to-lavender flex items-center justify-center text-white font-bold shadow-md">
                            <i className="fas fa-star"></i>
                        </div>
                    </div>
                    <div>
                        <h1 className="font-bold text-electric">{user?.displayName || 'Student'}</h1>
                        <p className="text-xs text-gray-500 flex items-center">
                            <span className="w-2 h-2 bg-teal rounded-full mr-1 animate-pulse"></span>
                            Level {analytics.level} Scholar
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-electric animate-float">
                            <i className="fas fa-gem"></i>
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-raspberry rounded-full flex items-center justify-center text-xs text-white animate-pulse-glow">
                            {analytics.gems}
                        </div>
                    </div>
                </div>
            </header>

            {/* XP Bar */}
            <div className="mb-8 relative">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-electric">Sparkle Progress</span>
                    <span className="font-bold text-electric">{analytics.xp}/{analytics.xpToNextLevel} <i className="fas fa-sparkle ml-1 text-yellow-400"></i></span>
                </div>
                <div className="w-full bg-white rounded-full h-4 shadow-inner overflow-hidden">
                    <div className="bg-gradient-to-r from-electric to-lavender h-4 rounded-full" style={{ width: `${(analytics.xp / analytics.xpToNextLevel) * 100}%` }}></div>
                </div>
            </div>

            {/* Insight Cards */}
            <h2 className="text-xl font-bold mb-4 text-electric flex items-center">
                <i className="fas fa-magic mr-2 animate-wiggle"></i> Your Magic Stats
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <InsightCard icon="fa-hat-wizard" title="Learning Style" value={`${analytics.learningStyle.score.toFixed(0)}% Visual`} description="Leans towards visual and pattern-based learning." color="electric" />
                <InsightCard icon="fa-brain" title="Memory Power" value={`+${analytics.memoryPower.improvement}%`} description="Improvement in recall this period." color="teal" />
            </div>

            {/* Subject Overview */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-electric flex items-center"><i className="fas fa-book-open mr-2"></i> Your Magical Subjects</h2>
            </div>
            <div className="relative">
                <div className="overflow-x-auto pb-4">
                    <div className="flex space-x-4" style={{ width: 'max-content' }}>
                        {analytics.subjectPerformance.map((subject: any) => {
                            const uiProps = subjectUIMap[subject.subjectCode] || subjectUIMap.default;
                            return <SubjectCard key={subject.subjectCode} subject={subject} {...uiProps} />;
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
