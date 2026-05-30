import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "elevated";
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md transition-all duration-250 ease-out",
          "w-full max-w-full",
          variant === "default" && "bg-white border border-secondary-200",
          variant === "outline" && "bg-transparent border border-secondary-300",
          variant === "elevated" && "bg-white shadow-medium border border-secondary-100",
          hoverable && [
            "hover:shadow-medium hover:-translate-y-0.5",
            "hover:border-secondary-300",
            "[@media(prefers-reduced-motion:reduce)]:hover:translate-y-0"
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pb-4 w-full max-w-full", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-medium text-secondary-900 tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0 w-full max-w-full", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-4 border-t border-secondary-100 w-full max-w-full", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export default Card;

