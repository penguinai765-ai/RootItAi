import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card = ({ title, children, className }: CardProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
};

export default Card;
