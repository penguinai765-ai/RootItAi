import React from "react";
import Player from "lottie-react";
import loadingQuizLottie from "./assets/loading.json";

export default function LoadingQuizLottie({ message = "Loading...", inline = false }: { message?: string, inline?: boolean }) {
    return (
        <div className={inline ? "flex flex-col items-center justify-center w-full h-32" : "min-h-screen flex flex-col items-center justify-center w-full"}>
            <div className="w-24 h-24 mb-2">
                <Player
                    autoplay
                    loop
                    animationData={loadingQuizLottie}
                    style={{ width: '100%', height: '100%' }}
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                />
            </div>
            <p className="text-gray-600 text-base font-medium text-center">{message}</p>
        </div>
    );
} 