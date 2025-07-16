"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/Button";
import Input from "@/components/form/Input";

export default function StudentOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    schoolName: "",
    class: "",
    rollNumber: "",
    division: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a profile.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await setDoc(doc(db, "students", user.uid), {
        ...formData,
        subjectCodes: [],
      });
      router.push("/student/dashboard");
    } catch (err) {
      setError("Failed to create profile. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">
          Complete Your Profile
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />
          <Input
            label="School Name"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleChange}
            placeholder="Enter your school name"
            required
          />
          <Input
            label="Class"
            name="class"
            value={formData.class}
            onChange={handleChange}
            placeholder="e.g., 10th"
            required
          />
          <Input
            label="Roll Number"
            name="rollNumber"
            value={formData.rollNumber}
            onChange={handleChange}
            placeholder="Enter your roll number"
            required
          />
          <Input
            label="Division"
            name="division"
            value={formData.division}
            onChange={handleChange}
            placeholder="e.g., A"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save and Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
