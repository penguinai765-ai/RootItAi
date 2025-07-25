"use client";

import { useAuth } from "@/lib/AuthContext";
import { useParams, useSearchParams } from "next/navigation";
import DetailedAnalyticsDashboard from "@/components/analytics/DetailedAnalyticsDashboard";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LoadingLottie from "@/components/LoadingLottie";

interface StudentInfo {
    name: string;
    class: string;
}

// A small component to handle the logic now that we are using Suspense
function AnalyticsView() {
    const { user } = useAuth();
    const params = useParams();
    const searchParams = useSearchParams();

    const studentId = params.studentId as string;
    const subjectCode = searchParams.get('subjectCode');

    if (!subjectCode) {
        return <div className="p-4 text-red-500">Error: Subject context is missing. Please go back and select a student again.</div>;
    }

    return (
        <>
            {user ? (
                <DetailedAnalyticsDashboard studentId={studentId} subjectCode={subjectCode} />
            ) : (
                <p>Loading user data...</p>
            )}
        </>
    );
}


export default function StudentDrilldownPage() {
    const params = useParams();
    const studentId = params.studentId as string;
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

    useEffect(() => {
        const fetchStudentInfo = async () => {
            if (studentId) {
                const studentRef = doc(db, "students", studentId);
                const studentSnap = await getDoc(studentRef);
                if (studentSnap.exists()) {
                    setStudentInfo(studentSnap.data() as StudentInfo);
                }
            }
        };
        fetchStudentInfo();
    }, [studentId]);

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <Link href="/teacher/analytics" className="text-electric hover:underline">
                    &larr; Back to Class Dashboard
                </Link>
                <h1 className="text-3xl font-bold mt-2">
                    Detailed Performance: {studentInfo?.name || 'Loading...'}
                </h1>
                {studentInfo && <p className="text-gray-600">Class: {studentInfo.class}</p>}
            </div>

            <Suspense fallback={<div><LoadingLottie message="Loading student details..." /></div>}>
                <AnalyticsView />
            </Suspense>
        </div>
    );
}
