"use client";

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean; // Add the disabled prop
}

export default function Button({ children, onClick, disabled }: ButtonProps) {
  // Base classes
  const baseClass = "w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md md:py-4 md:text-lg md:px-10";
  
  // Conditional classes for enabled/disabled states
  const enabledClass = "text-white bg-indigo-600 hover:bg-indigo-700";
  const disabledClass = "bg-gray-400 text-gray-700 cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${disabled ? disabledClass : enabledClass}`}
    >
      {children}
    </button>
  );
}
