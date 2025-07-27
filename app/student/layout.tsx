// app/student/layout.tsx
import BottomNav from "@/components/student/BottomNav";
import React from "react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Main content with responsive padding */}
      <main className="pb-20 md:pb-0 md:pl-64">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
