"use client";

import { useAuth } from "@/lib/AuthContext";
import { useParams, useRouter } from "next/navigation";
import DetailedAnalyticsDashboard from "@/components/analytics/DetailedAnalyticsDashboard";
import Link from 'next/link';

export default function SubjectAnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    // Get the subject code from the URL, e.g., 'science08'
    const subjectCode = params.subjectCode as string;

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                {/* Use a simple button or Link for navigation */}
                <button onClick={() => router.back()} className="text-electric hover:underline mb-4">
                    &larr; Back to Main Analytics
                </button>
                <h1 className="text-3xl font-bold">
                    Detailed Analytics: <span className="capitalize">{subjectCode.replace('0', ' ')}</span>
                </h1>
            </div>
            
            {user ? (
                // Pass both the studentId and the subjectCode from the URL to the component
                <DetailedAnalyticsDashboard studentId={user.uid} subjectCode={subjectCode} />
            ) : (
                <p>Loading analytics...</p>
            )}
        </div>
    );
}
