/**
 * Role utilities
 *
 * Centralized role definitions and dashboard routing.
 */

export const roles = {
  customer: "customer",
  admin: "admin",
  branch_manager: "branch_manager",
  employee: "employee",
  shipper: "shipper",
} as const;

export type Role = typeof roles[keyof typeof roles];

// Check if user has required role
export const hasRole = (userRole: string | undefined, requiredRoles: string[]): boolean => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

// Get dashboard route by role
export const getDashboardRoute = (role?: string): string => {
  switch (role) {
    case roles.admin:
      return "/admin";
    case roles.branch_manager:
      return "/manager";
    case roles.employee:
      return "/employee";
    case roles.shipper:
      return "/shipper";
    case roles.customer:
      return "/account";
    default:
      return "/";
  }
};
