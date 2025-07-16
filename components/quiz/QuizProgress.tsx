// components/quiz/QuizProgress.tsx
import React from 'react';

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
}

const QuizProgress = ({ currentQuestion, totalQuestions }: QuizProgressProps) => {
  return (
    <div className="text-center text-gray-600">
      <p>Question {currentQuestion} of {totalQuestions}</p>
    </div>
  );
};

export default QuizProgress;
