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
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
