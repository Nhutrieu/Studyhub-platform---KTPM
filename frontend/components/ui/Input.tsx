import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  success?: boolean;
}

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className, label, error, multiline, rows = 3, success, ...props }, ref) => {

    const inputClasses = cn(
      "w-full px-4 py-3 border rounded-xl bg-white text-secondary-900 placeholder:text-secondary-400",
      "focus:outline-none focus:ring-1 focus:ring-primary-600 focus:border-primary-600",
      "transition-all duration-200 ease-out",
      "disabled:bg-secondary-50 disabled:cursor-not-allowed disabled:text-secondary-500",
      error
        ? "border-error focus:border-error focus:ring-error"
        : success
          ? "border-success focus:border-success focus:ring-success"
          : "border-secondary-200 hover:border-secondary-300",
      className
    );

    return (
      <div className="w-full group">
        {label && (
          <label className="block text-sm font-medium text-secondary-700 mb-1.5 transition-colors group-focus-within:text-primary-700">
            {label}
          </label>
        )}
        <div className="relative">
          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={inputClasses}
              rows={rows}
              {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              className={inputClasses}
              {...props}
            />
          )}

          {/* Status Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            {error && (
              <FiAlertCircle className="w-5 h-5 text-error animate-fade-in" aria-hidden="true" />
            )}
            {success && !error && (
              <FiCheckCircle className="w-5 h-5 text-success animate-fade-in" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1 animate-slide-in-from-top" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
