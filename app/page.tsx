"use client";

import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { signInWithGoogle } from "@/lib/authService";
import { doesUserMappingExist, doesStudentProfileExist } from "@/lib/firestoreService";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Player from "lottie-react";
import lottieAnimation from "../components/assets/education new color scheme.json";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userType, setUserType] = useState<"teacher" | "student" | null>(null);

  useEffect(() => {
    if (loading) return; // Wait until Firebase auth state is loaded
    if (!user) return; // Wait for a user to be logged in
    if (!userType) return; // Wait for the user to select their role

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
    setUserType(type);
    if (!user) {
      await signInWithGoogle();
    }
  };

  if (loading || (user && userType)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-pink-500 to-blue-500 relative overflow-hidden">
      {/* Glassmorphism Card */}
      <div className="w-full max-w-md mx-auto rounded-3xl shadow-2xl bg-white/20 backdrop-blur-lg border border-white/30 p-6 md:p-10 flex flex-col items-center relative z-10">
        {/* Brand Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg tracking-tight mb-2 animate-fade-in-up" style={{ letterSpacing: '0.04em' }}>RootIt</h1>
        {/* Lottie Animation */}
        <div className="w-56 h-56 md:w-64 md:h-64 mx-auto mb-2 animate-fade-in">
          <Player
            autoplay
            loop
            animationData={lottieAnimation}
            style={{ width: '100%', height: '100%' }}
            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
          />
        </div>
        {/* Headline & Subheadline */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 animate-fade-in-up">AI-Powered Adaptive Learning</h2>
          <p className="text-base md:text-lg text-white/80 animate-fade-in-up delay-100">Empower your journey with personalized, interactive, and engaging education.</p>
        </div>
        {/* Login Buttons */}
        <div className="w-full flex flex-col gap-3 animate-fade-in-up delay-200">
          <Button onClick={() => handleSignIn("teacher")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition-transform">
            Login as Teacher
          </Button>
          <Button onClick={() => handleSignIn("student")}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition-transform">
            Login as Student
          </Button>
        </div>
      </div>
      {/* Animated background shapes (optional for vibrancy) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-400 opacity-30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-24 right-0 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-2xl animate-pulse-slower"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-500 opacity-20 rounded-full blur-2xl animate-pulse-slow" style={{ transform: 'translate(-50%, -50%)' }}></div>
      </div>
    </div>
  );
}
