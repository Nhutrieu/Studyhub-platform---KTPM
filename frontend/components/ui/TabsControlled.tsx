"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsControlledProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => ReactNode;
  className?: string;
}

export default function TabsControlled({
  tabs,
  defaultTab,
  children,
  className,
}: TabsControlledProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn("w-full max-w-full overflow-x-hidden", className)}>
      <div className="flex space-x-8 border-b border-secondary-200 w-full max-w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap flex-shrink-0",
              activeTab === tab.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-primary-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6 w-full max-w-full overflow-x-hidden">{children(activeTab)}</div>
    </div>
  );
}

