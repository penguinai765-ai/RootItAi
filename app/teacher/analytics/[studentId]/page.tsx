"use client";

import StudentAnalyticsDashboard from "@/components/analytics/StudentAnalyticsDashboard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";

interface StudentInfo {
    name: string;
    class: string;
}

export default function StudentDrilldownPage({ params }: { params: { studentId: string } }) {
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
    const { studentId } = params;

    useEffect(() => {
        const fetchStudentInfo = async () => {
            const studentRef = doc(db, "students", studentId);
            const studentSnap = await getDoc(studentRef);
            if(studentSnap.exists()) {
                setStudentInfo(studentSnap.data() as StudentInfo);
            }
        };
        if(studentId) fetchStudentInfo();
    }, [studentId]);

    return (
        <div className="p-4 md:p-8">
            <div className="mb-8">
                <Link href="/teacher/analytics" className="text-indigo-600 hover:underline">
                    &larr; Back to Class Dashboard
                </Link>
                <h1 className="text-3xl font-bold mt-2">
                    Detailed Performance: {studentInfo?.name || 'Loading...'}
                </h1>
                {studentInfo && <p className="text-gray-600">Class: {studentInfo.class}</p>}
            </div>

            <StudentAnalyticsDashboard studentId={studentId} />
        </div>
    );
}
