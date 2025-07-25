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
    return <div className="flex items-center justify-center min-h-screen"><LoadingLottie message="Loading..." /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] px-4 pt-6 pb-28 md:pb-0 relative">
      {/* App Name Top Left */}
      <div className="w-full flex items-center justify-start mb-4">
        <span className="text-2xl font-extrabold" style={{ color: '#6366F1', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em' }}>RootIt</span>
      </div>
      {/* Responsive Content Center */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="w-full h-[45vh] md:h-[60vh] max-w-full mx-auto mb-2" style={{ background: 'transparent' }}>
            <Player
              autoplay
              loop
              animationData={lottieAnimation}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
              rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
            />
          </div>
          {/* Headline & Subheadline */}
          <div className="w-full text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#1F2937' }}>AI-Powered Adaptive Learning</h2>
            <p className="text-base md:text-lg" style={{ color: '#4B5563' }}>Empower your journey with personalized, interactive, and engaging education.</p>
          </div>
        </div>
      </div>
      {/* Responsive Button Bar */}
      <div className="fixed md:static left-0 right-0 bottom-0 w-full px-4 pb-4 md:pb-0 bg-gradient-to-t from-white/90 to-transparent md:bg-transparent flex flex-col md:flex-row md:justify-center md:items-center gap-3 z-50 mb-8">
        <Button
          onClick={() => handleSignIn('student')}
          className="w-full md:w-auto md:min-w-[220px] py-4 rounded-full font-bold text-white text-lg"
          style={{ background: '#009688' }}
        >
          Join as Student
        </Button>
        <Button
          onClick={() => handleSignIn('teacher')}
          className="w-full md:w-auto md:min-w-[220px] py-4 rounded-full font-bold text-white text-lg"
          style={{ background: '#6366F1' }}
        >
          Join as Teacher
        </Button>
      </div>
    </div>
  );
}
