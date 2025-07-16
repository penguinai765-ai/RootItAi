"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTeacherDashboardData, getChapters, getSubtopics, createQuizAssignment, ChapterInfo, SubtopicInfo } from "@/lib/firestoreService";
import Stepper from "@/components/dashboard/Stepper";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

const steps = ["Select Chapter", "Select Subtopic", "Confirm Assignment"];

// State now uses the explicit types
interface TeacherData { subjectCode: string; classCode: string; }

export default function AssignQuiz() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  
  // These states are now strongly typed
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicInfo[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterInfo | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<SubtopicInfo | null>(null);
  
  const [deadline, setDeadline] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setLoading(true);
      getTeacherDashboardData(user.uid)
        .then(data => {
          if (!data || !data.subjectCode) {
            throw new Error("Your teacher profile is missing a Subject Code. Please contact your administrator.");
          }
          setTeacherData({ subjectCode: data.subjectCode, classCode: data.classCode });
          return getChapters(data.subjectCode);
        })
        .then(chaps => {
          setChapters(chaps); // No mapping needed here anymore, as the type is guaranteed
        })
        .catch(err => {
          console.error(err);
          setError(err.message || "Failed to load initial quiz data.");
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSelectChapter = async (chapter: ChapterInfo) => {
    if (!teacherData) return;
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      const subs = await getSubtopics(teacherData.subjectCode, chapter.id);
      setSubtopics(subs); // No mapping needed here anymore
      setCurrentStep(1);
    } catch (err) {
      setError("Failed to load subtopics.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubtopic = (subtopic: SubtopicInfo) => {
    setSelectedSubtopic(subtopic);
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!user || !teacherData || !selectedChapter || !selectedSubtopic || !deadline) {
        setError("Please ensure all fields are selected and filled.");
        return;
    }

    setLoading(true);
    try {
        await createQuizAssignment({
            assignedBy: user.uid,
            classCode: teacherData.classCode,
            subjectCode: teacherData.subjectCode,
            chapterId: selectedChapter.id,
            subtopicId: selectedSubtopic.id,
            deadline: new Date(deadline),
            timeLimit,
        });
        router.push("/teacher/dashboard");
    } catch (err) {
        setError("Failed to create assignment.");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };
  
  const renderList = (items: (ChapterInfo | SubtopicInfo)[], onSelect: (item: any) => void) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(item => (
            <div key={item.id} onClick={() => onSelect(item)} className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100 text-center">
                {item.name}
            </div>
        ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <Stepper currentStep={currentStep} steps={steps} />
        <div className="mt-8">
          {error && (
            <div className="p-4 mb-4 text-center text-red-700 bg-red-100 rounded-lg">
                <p className="font-bold">An Error Occurred</p>
                <p>{error}</p>
            </div>
          )}
          
          {loading && <p className="text-center">Loading...</p>}

          {!loading && !error && currentStep === 0 && (
            <div>
                <h2 className="text-2xl font-bold text-center mb-6">Select a Chapter</h2>
                {renderList(chapters, handleSelectChapter)}
            </div>
          )}

          {!loading && !error && currentStep === 1 && (
            <div>
                <h2 className="text-2xl font-bold text-center mb-6">Select a Subtopic</h2>
                {renderList(subtopics, handleSelectSubtopic)}
            </div>
          )}

          {!loading && !error && currentStep === 2 && (
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-6">Confirm Assignment</h2>
                 <div className="text-left w-full md:w-1/2 mx-auto space-y-2">
                    <p><strong>Chapter:</strong> {selectedChapter?.name}</p>
                    <p><strong>Subtopic:</strong> {selectedSubtopic?.name}</p>
                    <div className="mt-4">
                        <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
                        <input type="date" id="deadline" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
                    </div>
                    <div className="mt-4">
                        <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                        <input type="number" id="timeLimit" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
                    </div>
                </div>
                <div className="mt-8">
                    <Button onClick={handleSubmit}>
                        {loading ? "Assigning..." : "Assign Quiz"}
                    </Button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
