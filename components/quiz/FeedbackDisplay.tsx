// components/quiz/FeedbackDisplay.tsx
import React from 'react';

interface FeedbackDisplayProps {
  isCorrect: boolean | null;
}

const FeedbackDisplay = ({ isCorrect }: FeedbackDisplayProps) => {
  if (isCorrect === null) return null;

  const message = isCorrect ? "Correct!" : "Incorrect!";
  const color = isCorrect ? "text-green-500" : "text-red-500";

  return (
    <div className={`text-center font-bold text-xl my-4 ${color}`}>
      <p>{message}</p>
    </div>
  );
};

export default FeedbackDisplay;
