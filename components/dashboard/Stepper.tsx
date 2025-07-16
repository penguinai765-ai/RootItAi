"use client";

interface StepperProps {
  currentStep: number;
  steps: string[];
}

const Stepper = ({ currentStep, steps }: StepperProps) => {
  return (
    <nav className="flex items-center justify-center" aria-label="Progress">
      <ol className="flex items-center space-x-5">
        {steps.map((step, index) => (
          <li key={step}>
            {index < currentStep ? (
              <div className="flex items-center">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full">
                  <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="ml-3 text-sm font-medium text-gray-900">{step}</span>
              </div>
            ) : index === currentStep ? (
              <div className="flex items-center">
                <span className="flex items-center justify-center w-8 h-8 border-2 border-indigo-600 rounded-full">
                  <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                </span>
                <span className="ml-3 text-sm font-medium text-indigo-600">{step}</span>
              </div>
            ) : (
                <div className="flex items-center">
                    <span className="flex items-center justify-center w-8 h-8 border-2 border-gray-300 rounded-full">
                    <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                    </span>
                    <span className="ml-3 text-sm font-medium text-gray-500">{step}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Stepper;
