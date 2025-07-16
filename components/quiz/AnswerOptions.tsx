// components/quiz/AnswerOptions.tsx
import React from 'react';

interface AnswerOptionsProps {
  options: string[];
  onSelectAnswer: (optionIndex: number) => void;
  selectedOption: number | null;
  isSubmitted: boolean;
  correctAnswer: string;
}

const AnswerOptions = ({ 
  options, 
  onSelectAnswer, 
  selectedOption, 
  isSubmitted, 
  correctAnswer 
}: AnswerOptionsProps) => {

  const getButtonClass = (option: string, index: number) => {
    let baseClass = "w-full flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md transition-colors duration-200";

    if (!isSubmitted) {
      // Before submission
      return `${baseClass} ${selectedOption === index 
        ? 'bg-indigo-600 text-white border-indigo-600' 
        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`;
    } else {
      // After submission
      const isCorrect = option === correctAnswer;
      const isSelected = selectedOption === index;

      if (isCorrect) {
        return `${baseClass} bg-green-500 text-white border-green-500`;
      }
      if (isSelected && !isCorrect) {
        return `${baseClass} bg-red-500 text-white border-red-500`;
      }
      // Default for other incorrect, unselected options
      return `${baseClass} bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed`;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelectAnswer(index)}
          disabled={isSubmitted}
          className={getButtonClass(option, index)}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default AnswerOptions;
