"use client";

import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { verifyAndClaimTeacherProfile } from "@/lib/firestoreService";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TeacherSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const [schoolCode, setSchoolCode] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to claim a profile.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyAndClaimTeacherProfile(user.uid, schoolCode, teacherCode);
      // On success, redirect to the dashboard where the new data will be loaded.
      router.push("/teacher/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to claim profile. Please check the details and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Claim Your Teacher Profile</h1>
        <p className="text-center text-gray-600">Enter the codes provided by your institution.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="schoolCode" className="block text-sm font-medium text-gray-700">
              School Code
            </label>
            <input
              id="schoolCode"
              name="schoolCode"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="e.g., schoolcode123"
            />
          </div>
          <div>
            <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700">
              Teacher Code
            </label>
            <input
              id="teacherCode"
              name="teacherCode"
              type="text"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="e.g., teachercode123"
            />
          </div>
          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          <div>
            <Button>
              {loading ? "Verifying..." : "Verify & Claim Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
