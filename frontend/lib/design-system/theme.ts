/**
 * Theme Presets
 * 
 * Pre-composed class combinations for common UI patterns.
 * Use these to ensure consistency across pages.
 */

import { cn } from "@/lib/utils";

// Page Container
export const pageContainer = cn(
  "max-w-[1280px] mx-auto",
  "px-4 md:px-6 lg:px-8" // 16px mobile, 24px tablet, 32px desktop
);

// Section Spacing
export const sectionSpacing = {
  sm: "py-8 md:py-12",      // 32px/48px
  md: "py-12 md:py-16",     // 48px/64px
  lg: "py-16 md:py-24",     // 64px/96px
} as const;

// Card Styles
export const cardStyles = {
  default: cn(
    "bg-white rounded-lg shadow-md",
    "border border-secondary-200"
  ),
  elevated: cn(
    "bg-white rounded-lg shadow-lg",
    "border border-secondary-200"
  ),
  outline: cn(
    "bg-transparent rounded-lg",
    "border-2 border-secondary-200"
  ),
} as const;

// Button Presets (extend existing Button component)
export const buttonPresets = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "bg-secondary-600 text-white hover:bg-secondary-700",
  outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
  ghost: "text-secondary-700 hover:bg-secondary-100",
  danger: "bg-error-600 text-white hover:bg-error-700",
} as const;

// Input Presets
export const inputPresets = cn(
  "w-full px-4 py-2",
  "border border-secondary-300 rounded-lg",
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
  "disabled:bg-secondary-100 disabled:cursor-not-allowed"
);

// Table Presets
export const tablePresets = {
  container: "overflow-x-auto rounded-lg border border-secondary-200",
  header: "bg-secondary-50",
  row: "border-b border-secondary-200 hover:bg-secondary-50 transition-colors",
  cell: "px-6 py-4 text-sm",
} as const;

// Grid Presets
export const gridPresets = {
  "1-col": "grid grid-cols-1",
  "2-col": "grid grid-cols-1 md:grid-cols-2",
  "3-col": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  "4-col": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

// Text Presets
export const textPresets = {
  heading1: "text-3xl md:text-4xl font-semibold text-secondary-900",
  heading2: "text-2xl font-semibold text-secondary-900",
  heading3: "text-xl font-semibold text-secondary-900",
  body: "text-sm md:text-base text-secondary-700",
  bodySmall: "text-sm text-secondary-600",
  caption: "text-xs text-secondary-500",
} as const;

