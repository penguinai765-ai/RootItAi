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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
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

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">View Analytics</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all">
              <BarChart3 className="w-5 h-5" />
              <span className="font-semibold">Dashboard</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all">
              <GraduationCap className="w-5 h-5" />
              <span className="font-semibold">Take Quiz</span>
            </button>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center py-2 px-4 text-gray-400">
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-400">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1">Analytics</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-purple-600">
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
