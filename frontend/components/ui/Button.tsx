import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {

    // Base styles with enhanced visual appeal
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold tracking-wide transition-all duration-350 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

    const variants = {
      primary: "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 hover:scale-[1.02] shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40 focus:ring-primary-500 transition-all duration-200",
      secondary: "bg-gradient-to-r from-secondary-800 to-secondary-900 text-white hover:from-secondary-700 hover:to-secondary-800 hover:scale-[1.02] shadow-md shadow-secondary-900/20 hover:shadow-lg focus:ring-secondary-500 transition-all duration-200",
      outline: "border-2 border-secondary-300 text-secondary-900 bg-white hover:bg-primary-50 hover:border-primary-400 hover:text-primary-700 hover:scale-[1.02] focus:ring-primary-500 transition-all duration-200",
      ghost: "text-secondary-700 hover:bg-primary-50 hover:text-primary-700 hover:scale-[1.02] focus:ring-primary-500 transition-all duration-200",
      danger: "bg-gradient-to-r from-error to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:scale-[1.02] shadow-md shadow-error/30 hover:shadow-lg hover:shadow-error/40 focus:ring-red-500 transition-all duration-200",
    };

    const sizes = {
      sm: "px-5 py-2.5 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isLoading && "opacity-80 cursor-wait",
          className
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
);

Button.displayName = "Button";

export default Button;
