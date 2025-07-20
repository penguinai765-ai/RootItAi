"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className = '', ...props }: ButtonProps) {
  const baseClass = "w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md md:py-4 md:text-lg md:px-10";
  const enabledClass = "text-white bg-indigo-600 hover:bg-indigo-700";
  const disabledClass = "bg-gray-400 text-gray-700 cursor-not-allowed";
  const isDisabled = props.disabled;

  return (
    <button
      {...props}
      className={`${baseClass} ${isDisabled ? disabledClass : enabledClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
