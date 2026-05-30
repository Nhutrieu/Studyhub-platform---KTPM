"use client";

import { FiCheck, FiCircle } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface CheckoutStepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export default function CheckoutStepper({
  steps,
  currentStep,
  className,
}: CheckoutStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200 font-medium",
                    isCompleted
                      ? "bg-primary-600 border-primary-600 text-white"
                      : isCurrent
                      ? "bg-primary-100 border-primary-600 text-primary-700"
                      : "bg-secondary-100 border-secondary-300 text-secondary-500"
                  )}
                >
                  {isCompleted ? (
                    <FiCheck className="w-5 h-5" />
                  ) : (
                    <span className="font-medium">{index + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm font-medium",
                    isCompleted || isCurrent
                      ? "text-secondary-900"
                      : "text-secondary-400"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-200",
                    isCompleted ? "bg-primary-600" : "bg-secondary-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

