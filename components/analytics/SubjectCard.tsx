"use client";
import React from 'react';
import Link from 'next/link';

interface SubjectCardProps {
    subject: {
        subjectCode: string;
        name: string;
        averageScore: number;
        improvement: number;
    };
    icon: string;
    color: string;
}

export const SubjectCard = ({ subject, icon, color }: SubjectCardProps) => {
    const iconContainerClass = `bg-${color}-100 p-3 rounded-xl animate-wiggle`;
    const iconClass = `fas ${icon} text-${color} text-lg`;
    const titleClass = `font-bold mb-1 text-${color}`;
    const improvementClass = `text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full animate-bounce-slow`;
    const gradientClass = `bg-gradient-to-r from-${color} to-purple-400`; // A fallback gradient

    return (
        <Link href={`/student/analytics/${subject.subjectCode}`}>
            <div className="w-52 flex-shrink-0 bg-white rounded-2xl shadow-md p-5 transform transition-all hover:scale-105 cute-btn">
                <div className="flex justify-between items-start mb-3">
                    <div className={iconContainerClass}>
                        <i className={iconClass}></i>
                    </div>
                    {subject.improvement > 0 && (
                        <div className={improvementClass}>
                            +{subject.improvement.toFixed(1)}%
                        </div>
                    )}
                </div>
                <h3 className={titleClass}>{subject.name}</h3>
                <p className="text-xs text-gray-500 mb-3">Average Score: {subject.averageScore.toFixed(1)}%</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${gradientClass} rounded-full`} style={{ width: `${subject.averageScore}%` }}></div>
                </div>
            </div>
        </Link>
    );
};
