"use client";

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const getVariantStyles = (variant: ButtonVariant, disabled: boolean) => {
  if (disabled) {
    return 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300';
  }

  switch (variant) {
    case 'primary':
      return 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-600 hover:border-blue-700 shadow-md hover:shadow-lg transition-all duration-200';
    case 'secondary':
      return 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-green-600 hover:border-green-700 shadow-md hover:shadow-lg transition-all duration-200';
    case 'outline':
      return 'bg-transparent hover:bg-blue-50 active:bg-blue-100 text-blue-600 border-blue-600 hover:border-blue-700 transition-all duration-200';
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 border-transparent transition-all duration-200';
    default:
      return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm font-medium';
    case 'md':
      return 'px-4 py-2 text-base font-medium';
    case 'lg':
      return 'px-6 py-3 text-lg font-semibold';
    case 'xl':
      return 'px-8 py-4 text-xl font-semibold';
    default:
      return 'px-4 py-2 text-base font-medium';
  }
};

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = "inline-flex items-center justify-center border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClass = getVariantStyles(variant, disabled || loading);
  const sizeClass = getSizeStyles(size);
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
