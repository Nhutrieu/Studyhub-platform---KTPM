import { SetMetadata } from "@nestjs/common";
import { Role } from '../config/rbac-matrix';

export const ROLES_KEY = "roles";

/**
 * Decorator to specify which roles can access an endpoint
 * Usage: @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Public route decorator - no authentication required
 * Usage: @Public()
 */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

