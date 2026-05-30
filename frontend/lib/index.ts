/**
 * Central Exports
 * 
 * Single entry point for all lib utilities.
 */

// API
export { default as apiClient } from "./apiClient";
export { endpoints } from "./endpoints";

// Auth
export * from "./auth/guards";
export * from "./auth/index";

// Config
export { routes } from "./config/routes";
export * from "./config/nav";

// Design System
export * from "./design-system/tokens";
// Export theme but exclude buttonPresets (already in tokens)
export { 
  pageContainer,
  sectionSpacing,
  cardStyles,
  inputPresets,
  tablePresets,
  gridPresets,
  textPresets
} from "./design-system/theme";

// Types
export * from "./types";

// Utils
export { cn } from "./utils";
export { formatCurrency } from "./format";

