"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { X, TrendingUp, Clock, Target } from "lucide-react";

interface SubtopicTrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterData: any;
  subjectName: string;
}

export default function SubtopicTrendModal({
  isOpen,
  onClose,
  chapterData,
  subjectName,
}: SubtopicTrendModalProps) {
  if (!isOpen || !chapterData) return null;

  const chartColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

  // Prepare data for the chart
  const chartData = chapterData.subtopics.map((subtopic: any) => ({
    name: subtopic.name,
    score: Math.round(subtopic.averageScore),
    attempts: subtopic.attempts,
    trend: subtopic.trend,
  }));

  // Get performance color
  const getPerformanceColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  // Get performance bg color
  const getPerformanceBgColor = (score: number) => {
    if (score >= 70) return "bg-green-100";
    if (score >= 50) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{chapterData.name}</h2>
            <p className="text-sm text-gray-600">{subjectName} • Chapter Performance</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Chapter Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(chapterData.averageScore)}%
              </div>
              <div className="text-sm text-blue-700">Average Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {chapterData.attempts}
              </div>
              <div className="text-sm text-green-700">Total Attempts</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {chapterData.subtopics.length}
              </div>
              <div className="text-sm text-purple-700">Subtopics</div>
            </div>
          </div>

          {/* Subtopic Performance Chart */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Subtopic Performance Overview
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subtopic Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Detailed Subtopic Analysis
            </h3>
            <div className="space-y-4">
              {chapterData.subtopics.map((subtopic: any, index: number) => (
                <div
                  key={subtopic.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      ></div>
                      <h4 className="font-semibold text-gray-800">{subtopic.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getPerformanceColor(subtopic.averageScore)}`}>
                        {Math.round(subtopic.averageScore)}%
                      </div>
                      <div className="text-xs text-gray-500">{subtopic.attempts} attempts</div>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className={`h-3 rounded-full ${getPerformanceBgColor(subtopic.averageScore)}`}
                      style={{ width: `${subtopic.averageScore}%` }}
                    ></div>
                  </div>

                  {/* Trend Data */}
                  {subtopic.trend && subtopic.trend.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="flex justify-between items-center">
                        <span>Recent Performance:</span>
                        <span>
                          {subtopic.trend.slice(-3).map((t: any, i: number) => (
                            <span
                              key={i}
                              className={`ml-1 px-2 py-1 rounded ${t.score >= 70
                                  ? "bg-green-100 text-green-700"
                                  : t.score >= 50
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                            >
                              {Math.round(t.score)}%
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Performance Insights</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>
                <span className="font-semibold">Strongest Area:</span> {chapterData.strongest}
              </p>
              <p>
                <span className="font-semibold">Needs Improvement:</span> {chapterData.weakest}
              </p>
              <p>
                <span className="font-semibold">Recommendation:</span> Focus on practicing {chapterData.weakest}
                to improve your overall chapter performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
