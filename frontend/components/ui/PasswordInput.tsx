"use client";

import { useState, forwardRef } from "react";
import type { ComponentProps } from "react";
import Input from "./Input";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { cn } from "@/lib/utils";

type PasswordInputProps = ComponentProps<typeof Input>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <div className="relative group">
                <Input
                    ref={ref}
                    type={showPassword ? "text" : "password"}
                    className={cn("pr-10", className)} // Add padding for the icon
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[2.4rem] -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none p-1 rounded-md"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <FiEyeOff className="w-5 h-5" />
                    ) : (
                        <FiEye className="w-5 h-5" />
                    )}
                </button>
            </div>
        );
    }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
