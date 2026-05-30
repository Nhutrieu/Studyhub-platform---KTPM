"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  children: ReactNode;
  className?: string;
}

interface TabListProps {
  children: ReactNode;
  className?: string;
}

interface TabProps {
  children: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

interface TabPanelProps {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function Tabs({ children, className }: TabsProps) {
  return <div className={cn("w-full max-w-full overflow-x-hidden", className)}>{children}</div>;
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={cn(
        "flex space-x-8 border-b border-secondary-200 w-full max-w-full overflow-x-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Tab({ children, isActive, onClick, className }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
        isActive
          ? "border-primary-600 text-primary-600"
          : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-primary-300",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={cn("mt-6 w-full max-w-full overflow-x-hidden", className)}>{children}</div>;
}

export function TabPanel({ children, isActive, className }: TabPanelProps) {
  if (!isActive) return null;
  return <div className={cn(className)}>{children}</div>;
}

