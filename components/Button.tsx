"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className = '', ...props }: ButtonProps) {
  // Remove width and padding from baseClass so className can control size
  const baseClass = "flex items-center justify-center border border-transparent font-medium rounded-md";
  const enabledClass = "text-white bg-indigo-600 hover:bg-indigo-700";
  const disabledClass = "bg-gray-400 text-gray-700 cursor-not-allowed";
  const isDisabled = props.disabled;

  return (
    <button
      {...props}
      className={`${className} ${isDisabled ? disabledClass : enabledClass} ${baseClass}`.trim()}
    >
      {children}
    </button>
  );
}
