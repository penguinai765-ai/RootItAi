// components/quiz/AnswerOptions.tsx
import React from 'react';

interface AnswerOptionsProps {
  type: 'mcq' | 'short_answer';
  options?: string[];
  onSelectAnswer: (answer: string | number) => void;
  selectedOption: number | null;
  shortAnswer: string;
  onShortAnswerChange: (val: string) => void;
  isSubmitted: boolean;
  correctAnswer?: string;
  showAnswerReveal?: boolean;
  feedbackType?: 'none' | 'correct' | 'incorrect' | 'final'; // NEW
}

const AnswerOptions = ({
  type,
  options = [],
  onSelectAnswer,
  selectedOption,
  shortAnswer,
  onShortAnswerChange,
  isSubmitted,
  correctAnswer,
  showAnswerReveal = false,
  feedbackType = 'none', // NEW
}: AnswerOptionsProps) => {
  if (type === 'short_answer') {
    return (
      <div className="my-4">
        <input
          type="text"
          value={shortAnswer}
          onChange={e => onShortAnswerChange(e.target.value)}
          disabled={isSubmitted}
          className="w-full border rounded-md px-4 py-2 text-lg"
          placeholder="Type your answer here..."
        />
      </div>
    );
  }
  // MCQ rendering
  const getButtonClass = (option: string, index: number) => {
    let baseClass = "w-full flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md transition-colors duration-200";
    if (feedbackType === 'correct') {
      return `${baseClass} ${selectedOption === index ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300'}`;
    }
    if (feedbackType === 'incorrect') {
      return `${baseClass} ${selectedOption === index ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-300'}`;
    }
    if (feedbackType === 'final') {
      const isCorrect = option === correctAnswer;
      const isSelected = selectedOption === index;
      if (isCorrect) {
        return `${baseClass} bg-green-500 text-white border-green-500`;
      }
      if (isSelected && !isCorrect) {
        return `${baseClass} bg-red-500 text-white border-red-500`;
      }
      return `${baseClass} bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed`;
    }
    // Default: highlight selected option blue, others normal
    return `${baseClass} ${selectedOption === index
      ? 'bg-indigo-600 text-white border-indigo-600'
      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`;
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelectAnswer(index)}
          disabled={isSubmitted && feedbackType !== 'incorrect' && feedbackType !== 'none'}
          className={getButtonClass(option, index)}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default AnswerOptions;
