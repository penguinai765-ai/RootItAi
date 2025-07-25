"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { getUserProfile } from "@/lib/firestoreService";
import {
  User,
  Mail,
  School,
  GraduationCap,
  Calendar,
  Home,
  BarChart3,
  BookOpen,
} from "lucide-react";
import LoadingLottie from "@/components/LoadingLottie";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid)
        .then((data) => {
          setProfile(data);
        })
        .catch((err) => console.error("Failed to load profile", err))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingLottie message="Loading profile..." />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Could not load profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold">Student Profile</h1>
              <p className="text-purple-100 mt-1 text-sm">Manage your account</p>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{profile.name || "Student Name"}</h2>
              <p className="text-gray-600">{profile.email || user?.email}</p>
            </div>
          </div>

          {/* Profile Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <School className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="font-semibold text-gray-800">{profile.schoolName || "School Name"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="font-semibold text-gray-800">{profile.class || "Class"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Roll Number</p>
                  <p className="font-semibold text-gray-800">{profile.rollNumber || "Roll Number"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Home className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Division</p>
                  <p className="font-semibold text-gray-800">{profile.division || "Division"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{user?.email || "Email"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Account Type</p>
                  <p className="font-semibold text-gray-800">Student</p>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Logout Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Account Actions</h3>
          <div className="flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="fixed bottom-3 left-0 right-0 flex justify-center z-50 md:hidden">
        <div className="flex justify-around w-[95vw] max-w-md mx-auto bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl px-4 py-2">
          <Link href="/student/dashboard" className="flex flex-col items-center px-3 py-2 group">
            <Home className="w-7 h-7 mb-1 group-hover:text-purple-600 text-gray-400 transition-colors" />
            <span className="text-xs font-semibold group-hover:text-purple-600 text-gray-500">Home</span>
          </Link>
          <Link href="/student/analytics" className="flex flex-col items-center px-3 py-2 group">
            <BarChart3 className="w-7 h-7 mb-1 group-hover:text-purple-600 text-purple-600 transition-colors" />
            <span className="text-xs font-semibold group-hover:text-purple-600 text-purple-600">Analytics</span>
          </Link>
          <Link href="/student/profile" className="flex flex-col items-center px-3 py-2 group">
            <User className="w-7 h-7 mb-1 group-hover:text-purple-600 text-gray-400 transition-colors" />
            <span className="text-xs font-semibold group-hover:text-purple-600 text-gray-500">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
