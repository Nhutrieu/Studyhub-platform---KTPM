import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { inputPresets } from "@/lib/design-system";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-secondary-900 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            inputPresets,
            "focus:ring-2 focus:ring-primary-500 focus:border-primary-600",
            error && "border-error focus:ring-error",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
            <span>⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;

