import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              "w-4 h-4 text-secondary-900 border-secondary-300 rounded-md",
              "focus:ring-2 focus:ring-secondary-900 focus:ring-offset-0",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200",
              error && "border-error",
              className
            )}
            {...props}
          />
          {label && (
            <span className="text-sm font-medium text-secondary-700">{label}</span>
          )}
        </label>
        {error && (
          <p className="mt-1 text-sm text-red-600 ml-6">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;

