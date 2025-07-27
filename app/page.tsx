"use client";

import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { signInWithGoogle } from "@/lib/authService";
import { doesUserMappingExist, doesStudentProfileExist } from "@/lib/firestoreService";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Player from "lottie-react";
import lottieAnimation from "../components/assets/education new color scheme.json";
import LoadingLottie from "@/components/LoadingLottie";
import { Users, Target, Zap, ChevronDown, Play, Star, Award, TrendingUp, Sparkles, Brain, Lightbulb } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userType, setUserType] = useState<"teacher" | "student" | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!userType) return;

    const routeUser = async () => {
      if (userType === "teacher") {
        const mappingExists = await doesUserMappingExist(user.uid);
        if (mappingExists) {
          router.push("/teacher/dashboard");
        } else {
          router.push("/teacher/setup");
        }
      } else if (userType === "student") {
        const profileExists = await doesStudentProfileExist(user.uid);
        if (profileExists) {
          router.push("/student/dashboard");
        } else {
          router.push("/student/setup");
        }
      }
    };

    routeUser();
  }, [user, loading, router, userType]);

  const handleSignIn = async (type: "teacher" | "student") => {
    setIsSigningIn(true);
    setUserType(type);
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error("Sign in failed:", error);
        setIsSigningIn(false);
      }
    }
  };

  if (loading || (user && userType)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingLottie message="Welcome to RootIt..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 relative overflow-hidden">
      {/* Vibrant Cloud Shapes - Mobile Optimized */}
      <div className="absolute inset-0">
        {/* Large pink cloud bottom right - Hidden on mobile, visible on larger screens */}
        <div className="hidden sm:block absolute bottom-0 right-0 w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-gradient-to-tl from-pink-400 via-pink-300 to-pink-200 opacity-80 rounded-full transform translate-x-24 md:translate-x-32 translate-y-24 md:translate-y-32"></div>
        <div className="hidden sm:block absolute bottom-10 right-10 w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 bg-gradient-to-tl from-purple-400 via-purple-300 to-pink-300 opacity-70 rounded-full transform translate-x-16 md:translate-x-20 translate-y-16 md:translate-y-20"></div>

        {/* Medium clouds - Reduced size and repositioned for mobile */}
        <div className="absolute top-10 right-10 w-20 h-20 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-300 opacity-60 rounded-full transform -translate-y-4 sm:-translate-y-8 md:-translate-y-10"></div>
        <div className="absolute bottom-20 left-0 w-24 h-24 sm:w-56 sm:h-56 md:w-72 md:h-72 bg-gradient-to-tr from-purple-400 via-pink-400 to-pink-300 opacity-75 rounded-full transform -translate-x-8 sm:-translate-x-16 md:-translate-x-20"></div>

        {/* Small accent clouds - Minimal on mobile */}
        <div className="absolute top-20 left-16 w-16 h-16 sm:w-36 sm:h-36 md:w-48 md:h-48 bg-gradient-to-r from-pink-300 to-purple-300 opacity-50 rounded-full"></div>
        <div className="absolute top-40 right-20 w-12 h-12 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-l from-orange-300 to-yellow-300 opacity-60 rounded-full"></div>

        {/* Decorative shapes - Hidden on mobile to reduce clutter */}
        <div className="hidden sm:block absolute top-32 left-20 w-4 h-4 md:w-6 md:h-6 bg-pink-400 rounded-full opacity-80"></div>
        <div className="hidden sm:block absolute top-48 right-32 w-3 h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full opacity-90"></div>
        <div className="hidden sm:block absolute bottom-48 left-40 w-4 h-4 md:w-5 md:h-5 bg-purple-400 rounded-full opacity-70"></div>
        <div className="hidden sm:block absolute bottom-60 right-60 w-2.5 h-2.5 md:w-3 md:h-3 bg-orange-400 rounded-full opacity-80"></div>
      </div>

      {/* App Header - Fully Responsive */}
      <header className="relative z-10 px-4 sm:px-6 md:px-8 pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-6 sm:pb-8 md:pb-10">
        <div className="max-w-4xl mx-auto text-center">

          {/* App Name - Fully Responsive Typography */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] font-black mb-3 sm:mb-4 md:mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 bg-clip-text text-transparent tracking-tight drop-shadow-sm leading-none">
            RootIt
          </h1>

          {/* Energetic Tagline - Fully Responsive */}
          <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-8 sm:mb-10 md:mb-12 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">AI-Powered Learning</p>
        </div>
      </header>

      {/* Main Animation Section - Fully Responsive */}
      <main className="relative z-10 px-4 sm:px-6 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto text-center">
          {/* Animation that blends naturally with background */}
          <div className="relative mb-8 sm:mb-10 md:mb-12">
            {/* No container - animation blends directly with background */}
            <div className="relative z-10 mx-auto w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
              <Player
                autoplay
                loop
                animationData={lottieAnimation}
                style={{
                  width: '100%',
                  height: 'auto',
                  minHeight: '280px',
                  maxHeight: '450px'
                }}
                rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Vibrant Action Buttons - Fully Responsive */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pb-16 md:pb-20">
        <div className="max-w-sm sm:max-w-md md:max-w-lg mx-auto">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <Button
              onClick={() => handleSignIn('student')}
              variant="primary"
              size="xl"
              fullWidth
              loading={isSigningIn && userType === 'student'}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-700 text-white font-bold text-lg sm:text-xl md:text-2xl py-5 sm:py-6 md:py-7 shadow-2xl border-0 transform hover:scale-105 transition-all duration-300 rounded-2xl md:rounded-3xl"
            >
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-3 sm:mr-4" />
              Join as Student
            </Button>
            <Button
              onClick={() => handleSignIn('teacher')}
              variant="outline"
              size="xl"
              fullWidth
              loading={isSigningIn && userType === 'teacher'}
              className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 hover:from-yellow-500 hover:via-orange-500 hover:to-red-600 text-white font-bold text-lg sm:text-xl md:text-2xl py-5 sm:py-6 md:py-7 shadow-2xl border-0 transform hover:scale-105 transition-all duration-300 rounded-2xl md:rounded-3xl"
            >
              <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-3 sm:mr-4" />
              Join as Teacher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
