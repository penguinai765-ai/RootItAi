import React from "react";
import Player from "lottie-react";
import sandyLoadingLottie from "./assets/Sandy Loading.json";

export default function SandyLoadingLottie({ message = "Generating a hint for you..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center w-full">
            <div className="w-40 h-40 mb-4">
                <Player
                    autoplay
                    loop
                    animationData={sandyLoadingLottie}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                />
            </div>
            <p className="text-gray-600 text-lg font-medium text-center">{message}</p>
        </div>
    );
} 