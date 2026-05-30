/**
 * Design System Central Export
 * 
 * Single entry point for all design system utilities.
 */

// Tokens
export * from "./tokens";

// Theme Presets (backward compatibility) - exclude duplicates that are already in tokens
export { 
  pageContainer,
  sectionSpacing,
  cardStyles,
  inputPresets,
  tablePresets,
  gridPresets,
  textPresets
} from "./theme";

// Patterns
export * from "./patterns";

// Layout Config - exclude spacing as it's already in tokens
export { 
  breakpoints,
  zIndex,
  dashboardMenuGroups,
  dashboardMenus,
  customerMenus,
  type MenuGroup,
  type MenuItem,
  // spacing is excluded - use from tokens instead
} from "./layout-config";

