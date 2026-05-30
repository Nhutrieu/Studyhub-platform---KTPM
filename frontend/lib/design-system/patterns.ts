/**
 * UI Patterns
 * 
 * Reusable patterns for common page layouts and component compositions.
 * These ensure consistency across all pages.
 */

import { cn } from "@/lib/utils";

/**
 * PageHeader Pattern
 * Standard layout for page headers with title, subtitle, actions, and breadcrumbs
 */
export const pageHeaderPattern = {
  container: cn(
    "flex flex-col sm:flex-row sm:items-center sm:justify-between",
    "gap-4 mb-6"
  ),
  titleSection: cn(
    "flex flex-col gap-1"
  ),
  actions: cn(
    "flex items-center gap-2 flex-shrink-0"
  ),
  breadcrumb: cn(
    "text-sm text-secondary-500 mb-2"
  ),
} as const;

/**
 * Toolbar Pattern
 * Standard toolbar for search, filters, and actions above data tables
 */
export const toolbarPattern = {
  container: cn(
    "flex flex-col sm:flex-row sm:items-center sm:justify-between",
    "gap-4 mb-4"
  ),
  left: cn(
    "flex flex-wrap items-center gap-2 flex-1"
  ),
  right: cn(
    "flex items-center gap-2 flex-shrink-0"
  ),
} as const;

/**
 * Form Layout Pattern
 * Standard two-column form layout on desktop, single column on mobile
 */
export const formLayoutPattern = {
  container: cn(
    "grid grid-cols-1 md:grid-cols-2 gap-6"
  ),
  fullWidth: cn(
    "md:col-span-2"
  ),
  actions: cn(
    "md:col-span-2 flex justify-end gap-3 pt-4"
  ),
} as const;

/**
 * Data Table Pattern
 * Standard table with pagination and toolbar
 */
export const dataTablePattern = {
  container: cn(
    "bg-white rounded-md border border-secondary-200 overflow-hidden w-full max-w-full"
  ),
  header: cn(
    "px-6 py-4 border-b border-secondary-200 bg-secondary-50"
  ),
  toolbar: toolbarPattern.container,
  table: cn(
    "w-full"
  ),
  pagination: cn(
    "px-6 py-4 border-t border-secondary-200 bg-secondary-50"
  ),
} as const;

/**
 * Product Grid Pattern
 * Standard product listing grid
 */
export const productGridPattern = {
  container: cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
  ),
  card: cn(
    "bg-white rounded-md shadow-soft border border-secondary-200",
    "hover:shadow-medium transition-all duration-200 cursor-pointer"
  ),
} as const;

/**
 * Detail Page Pattern
 * Standard two-column detail page (gallery + details)
 */
export const detailPagePattern = {
  container: cn(
    "grid grid-cols-1 lg:grid-cols-2 gap-8"
  ),
  gallery: cn(
    "sticky top-4 h-fit"
  ),
  details: cn(
    "space-y-6"
  ),
} as const;

/**
 * Stat Card Pattern
 * Standard stat card for dashboards
 */
export const statCardPattern = {
  container: cn(
    "bg-white rounded-md shadow-soft border border-secondary-200 p-6"
  ),
  value: cn(
    "text-3xl font-medium text-secondary-900"
  ),
  label: cn(
    "text-sm text-secondary-500 mt-1"
  ),
  change: cn(
    "text-sm mt-2"
  ),
} as const;

/**
 * Empty State Pattern
 */
export const emptyStatePattern = {
  container: cn(
    "flex flex-col items-center justify-center",
    "py-12 px-4 text-center"
  ),
  icon: cn(
    "w-16 h-16 text-secondary-300 mb-4"
  ),
  title: cn(
    "text-lg font-medium text-secondary-900 mb-2 tracking-tight"
  ),
  description: cn(
    "text-sm text-secondary-600 mb-4 max-w-md"
  ),
} as const;

/**
 * Error State Pattern
 */
export const errorStatePattern = {
  container: cn(
    "flex flex-col items-center justify-center",
    "py-12 px-4 text-center"
  ),
  icon: cn(
    "w-16 h-16 text-error/30 mb-4"
  ),
  title: cn(
    "text-lg font-medium text-secondary-900 mb-2 tracking-tight"
  ),
  description: cn(
    "text-sm text-secondary-600 mb-4 max-w-md"
  ),
} as const;

/**
 * Loading Skeleton Pattern
 */
export const skeletonPattern = {
  container: cn(
    "animate-pulse"
  ),
  text: cn(
    "h-4 bg-secondary-200 rounded-md"
  ),
  title: cn(
    "h-6 bg-secondary-200 rounded-md"
  ),
  card: cn(
    "h-48 bg-secondary-200 rounded-md"
  ),
} as const;

