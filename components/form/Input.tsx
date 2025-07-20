import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, ...props }, ref) => (
    <div className="mb-4">
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input
            ref={ref}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
            {...props}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
));

Input.displayName = "Input";

export default Input; 