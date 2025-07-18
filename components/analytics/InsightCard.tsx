"use client";
import React from 'react';

interface InsightCardProps {
    icon: string;
    title: string;
    value: string;
    description: string;
    color: string;
}

export const InsightCard = ({ icon, title, value, description, color }: InsightCardProps) => {
    const iconContainerClass = `bg-${color}-100 p-3 rounded-xl mr-4 animate-float`;
    const iconClass = `fas ${icon} text-${color} text-xl`;
    const titleClass = `font-bold mb-1 text-${color}`;
    const borderClass = `border-b-4 border-${color}`;

    return (
        <div className={`bg-white rounded-2xl shadow-md p-5 transform transition-all hover:scale-105 cute-btn ${borderClass}`}>
            <div className="flex items-start">
                <div className={iconContainerClass}>
                    <i className={iconClass}></i>
                </div>
                <div>
                    <h3 className={titleClass}>{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};
