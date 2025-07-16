"use client";

import Button from "@/components/Button";
import { useAuth } from "@/lib/AuthContext";
import { createStudentProfile, getSchoolList, SchoolInfo } from "@/lib/firestoreService";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function StudentSetup() {
  const { user } = useAuth();
  const router = useRouter();
  
  // State for the school list and form data
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    schoolName: "", // This will hold the selected school name
    class: "",
    rollNumber: "",
    division: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the list of schools on component mount
  useEffect(() => {
    getSchoolList()
        .then(schoolList => {
            setSchools(schoolList);
            // Set a default selection if the list is not empty
            if (schoolList.length > 0) {
                setFormData(prev => ({ ...prev, schoolName: schoolList[0].name }));
            }
        })
        .catch(() => setError("Could not load the list of schools."))
        .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a profile.");
      return;
    }

    // Find the corresponding school code for the selected school name
    const selectedSchool = schools.find(school => school.name === formData.schoolName);
    if (!selectedSchool) {
        setError("Please select a valid school from the list.");
        return;
    }

    setLoading(true);
    setError("");

    try {
      // Pass the complete profile data, including the schoolCode
      await createStudentProfile(user.uid, {
        name: formData.name,
        schoolName: selectedSchool.name,
        schoolCode: selectedSchool.id, // Pass the code
        class: formData.class,
        rollNumber: formData.rollNumber,
        division: formData.division,
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Student Profile Setup</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" placeholder="Full Name" onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
          
          {/* School Name Dropdown */}
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">School</label>
            <select
                id="schoolName"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
            >
                {loading ? (
                    <option>Loading schools...</option>
                ) : (
                    schools.map(school => (
                        <option key={school.id} value={school.name}>
                            {school.name}
                        </option>
                    ))
                )}
            </select>
          </div>

          <input name="class" placeholder="Class (e.g., 8)" onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
          <input name="rollNumber" placeholder="Roll Number" onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
          <input name="division" placeholder="Division" onChange={handleChange} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
          
          {error && <p className="text-sm text-red-600">{error}</p>}
          
          <div>
            <Button disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
