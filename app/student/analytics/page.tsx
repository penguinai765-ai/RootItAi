"use client";

import StudentAnalyticsDashboard from "@/components/analytics/StudentAnalyticsDashboard";
import { useAuth } from "@/lib/AuthContext";

export default function AnalyticsPage() {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Your Performance</h1>
      {user ? (
        <StudentAnalyticsDashboard studentId={user.uid} />
      ) : (
        <p>Loading your analytics...</p>
      )}
    </div>
  );
}
