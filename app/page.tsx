"use client";

import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { signInWithGoogle } from "@/lib/authService";
import { doesUserMappingExist, doesStudentProfileExist } from "@/lib/firestoreService";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          RootIt
        </h1>
        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
          AI-Powered Adaptive Learning Platform
        </p>
        <div className="mt-5 sm:mt-8 sm:flex sm:justify-center">
          <div className="rounded-md shadow">
            <Button onClick={() => handleSignIn("teacher")}>
              Login as Teacher
            </Button>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <Button onClick={() => handleSignIn("student")}>
              Login as Student
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
