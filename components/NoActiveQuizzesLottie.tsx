import React from "react";
import Player from "lottie-react";
import thumbsUpBirdieLottie from "./assets/Thumbs up birdie.json";

export default function NoActiveQuizzesLottie({ message = "", scale = 1 }: { message?: string, scale?: number }) {
    return (
        <div className="flex flex-col items-center justify-center w-full py-4 mb-2 overflow-visible">
            <div className="w-full aspect-[32/9] max-w-full flex items-center justify-center overflow-visible" style={{ transform: `scale(${scale})` }}>
                <Player
                    autoplay
                    loop
                    animationData={thumbsUpBirdieLottie}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                />
            </div>
            {message && <p className="text-white text-lg font-semibold text-center">{message}</p>}
        </div>
    );
} 