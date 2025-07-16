// components/quiz/QuestionDisplay.tsx
import React from 'react';

interface QuestionDisplayProps {
  question: string;
}

const QuestionDisplay = ({ question }: QuestionDisplayProps) => {
  return (
    <div className="my-8">
      <p className="text-2xl font-semibold text-center">{question}</p>
    </div>
  );
};

export default QuestionDisplay;
