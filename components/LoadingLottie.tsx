import React from "react";
import Player from "lottie-react";
import loadingLottie from "./assets/Loading 40 _ Paperplane.json";

export default function LoadingLottie({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center w-full">
            <div className="w-40 h-40 mb-4">
                <Player
                    autoplay
                    loop
                    animationData={loadingLottie}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                />
            </div>
            <p className="text-gray-600 text-lg font-medium text-center">{message}</p>
        </div>
    );
} 