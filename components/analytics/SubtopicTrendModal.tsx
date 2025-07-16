"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../dashboard/Card';

interface TrendData {
  date: string;
  score: number;
}

interface SubtopicModalProps {
  subtopicName: string;
  trendData: TrendData[];
  onClose: () => void;
}

const SubtopicTrendModal = ({ subtopicName, trendData, onClose }: SubtopicModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Performance Trend: {subtopicName}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <div className="p-4">
          <Card title="Score Over Time">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} name="Score on this Subtopic" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubtopicTrendModal;
