/**
 * Design System Tokens
 * 
 * Single source of truth for all design values.
 * All components MUST use these tokens.
 */

// Colors
export const colors = {
  // Primary - Emerald (Brand color)
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    DEFAULT: "#059669",
  },

  // Secondary - Stone (Neutral)
  secondary: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
    DEFAULT: "#78716c",
  },

  // Accent - Amber (Highlights)
  accent: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    DEFAULT: "#f59e0b",
  },

  // Status Colors
  success: {
    50: "#ecfdf5",
    100: "#d1fae5",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    DEFAULT: "#059669",
  },

  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    DEFAULT: "#dc2626",
  },

  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    DEFAULT: "#f59e0b",
  },

  info: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    DEFAULT: "#3b82f6",
  },
} as const;

// Spacing (Base unit: 4px)
export const spacing = {
  0: "0",
  1: "0.25rem",   // 4px
  2: "0.5rem",    // 8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  8: "2rem",      // 32px
  10: "2.5rem",   // 40px
  12: "3rem",     // 48px
  16: "4rem",     // 64px
  20: "5rem",     // 80px
  24: "6rem",     // 96px
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: [
      "Inter",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(", "),
  },
  fontSize: {
    xs: "0.75rem",    // 12px
    sm: "0.875rem",   // 14px
    base: "1rem",      // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",    // 20px
    "2xl": "1.5rem",  // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem",    // 48px
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
} as const;

// Shadows
export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
} as const;

// Border Radius
export const radius = {
  none: "0",
  sm: "0.125rem",   // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem",   // 6px
  lg: "0.5rem",     // 8px
  xl: "0.75rem",    // 12px
  "2xl": "1rem",    // 16px
  "3xl": "1.5rem",  // 24px
  full: "9999px",
} as const;

// Theme Presets (for backward compatibility)
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

// Button Presets
export const buttonPresets = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "bg-secondary-900 text-white hover:bg-secondary-800",
  outline: "border border-secondary-300 text-secondary-900 hover:bg-secondary-50 bg-white",
  ghost: "text-secondary-700 hover:bg-secondary-100",
  danger: "bg-error text-white hover:bg-red-700",
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

