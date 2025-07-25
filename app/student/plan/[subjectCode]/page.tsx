"use client";

import React from "react";
import Player from "lottie-react";
import stressManagementLottie from "@/components/assets/Stress Management.json";

export default function StudyPlanPlaceholder() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12">
            {/* Lottie animation */}
            <div className="w-full max-w-xs md:max-w-md aspect-[16/12] flex items-center justify-center mb-8">
                <Player
                    autoplay
                    loop
                    animationData={stressManagementLottie}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Here you will have personalised study plan.</h1>
            <p className="text-gray-500 text-center text-lg">Feature coming soon.</p>
        </div>
    );
} 