/**
 * RBAC Matrix - Single Source of Truth for Role-Based Access Control
 * Maps HTTP method + route pattern to allowed roles
 */

export enum Role {
    GUEST = 'guest',
    CUSTOMER = 'customer',
    ADMIN = 'admin',
    BRANCH_MANAGER = 'branch_manager',
    EMPLOYEE = 'employee',
    SHIPPER = 'shipper',
}

export type RoutePermission = {
    method: string;
    path: string;
    roles: Role[];
    description?: string;
};

/**
 * Complete RBAC matrix for all endpoints
 * Format: 'METHOD /route/pattern': [allowed roles]
 */
export const RBAC_MATRIX: Record<string, Role[]> = {
    // ===== AUTH ENDPOINTS =====
    'POST /auth/register': [Role.GUEST, Role.ADMIN], // Guest can register as customer, Admin can create staff
    'POST /auth/login': [Role.GUEST],
    'POST /auth/refresh': [Role.GUEST],
    'POST /auth/logout': [Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER],
    'GET /auth/me': [Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER],

    // ===== PRODUCT ENDPOINTS =====
    'GET /products': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'GET /products/:id': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'POST /products': [Role.ADMIN],
    'PUT /products/:id': [Role.ADMIN],
    'DELETE /products/:id': [Role.ADMIN],

    // ===== CATEGORY ENDPOINTS =====
    'GET /categories': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'GET /categories/:id': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'POST /categories': [Role.ADMIN],
    'PUT /categories/:id': [Role.ADMIN],
    'DELETE /categories/:id': [Role.ADMIN],

    // ===== CART ENDPOINTS =====
    'GET /cart': [Role.CUSTOMER],
    'POST /cart/items': [Role.CUSTOMER],
    'PUT /cart/items/:id': [Role.CUSTOMER],
    'DELETE /cart/items/:id': [Role.CUSTOMER],
    'DELETE /cart': [Role.CUSTOMER],

    // ===== ORDER ENDPOINTS =====
    'GET /orders': [Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'GET /orders/my': [Role.CUSTOMER],
    'GET /orders/:id': [Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER],
    'POST /orders': [Role.CUSTOMER],
    'PUT /orders/:id/status': [Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER],
    'PUT /orders/:id/cancel': [Role.CUSTOMER, Role.ADMIN],
    'PUT /orders/:id/assign-shipper': [Role.ADMIN, Role.BRANCH_MANAGER],
    'PUT /orders/:id/assign-employee': [Role.ADMIN, Role.BRANCH_MANAGER],
    'GET /orders/shipper/assigned': [Role.SHIPPER],
    'GET /orders/employee/assigned': [Role.EMPLOYEE],

    // ===== BRANCH ENDPOINTS =====
    'GET /branches': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER],
    'GET /branches/:id': [Role.GUEST, Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE],
    'POST /branches': [Role.ADMIN],
    'PUT /branches/:id': [Role.ADMIN, Role.BRANCH_MANAGER],
    'DELETE /branches/:id': [Role.ADMIN],

    // ===== WAREHOUSE/INVENTORY ENDPOINTS =====
    'GET /warehouse/branch/:branchId': [Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE], // Branch-scoped
    'POST /warehouse/stock': [Role.BRANCH_MANAGER, Role.EMPLOYEE], // Add stock to branch
    'PUT /warehouse/stock/:id': [Role.BRANCH_MANAGER, Role.EMPLOYEE], // Update branch stock
    'GET /warehouse/low-stock': [Role.ADMIN, Role.BRANCH_MANAGER],

    // ===== USER MANAGEMENT =====
    'GET /users': [Role.ADMIN],
    'GET /users/:id': [Role.ADMIN, Role.BRANCH_MANAGER], // Manager can view own branch staff
    'POST /users': [Role.ADMIN], // Create system users
    'PUT /users/:id': [Role.ADMIN, Role.CUSTOMER], // Admin: all users, Customer: self only
    'DELETE /users/:id': [Role.ADMIN],
    'GET /users/branch/:branchId': [Role.ADMIN, Role.BRANCH_MANAGER], // Branch staff list

    // ===== PAYMENT ENDPOINTS =====
    'POST /payment/vnpay/create': [Role.CUSTOMER],
    'GET /payment/vnpay/return': [Role.GUEST, Role.CUSTOMER],
    'POST /payment/momo/create': [Role.CUSTOMER],
    'GET /payment/momo/callback': [Role.GUEST, Role.CUSTOMER],

    // ===== WALLET ENDPOINTS =====
    'GET /wallet': [Role.CUSTOMER],
    'POST /wallet/deposit': [Role.CUSTOMER],
    'POST /wallet/withdraw': [Role.CUSTOMER],
    'GET /wallet/transactions': [Role.CUSTOMER],
    'GET /wallet/pending-withdrawals': [Role.ADMIN],
    'POST /wallet/approve-withdraw/:id': [Role.ADMIN],

    // ===== REVIEW ENDPOINTS =====
    'GET /reviews/product/:productId': [Role.GUEST, Role.CUSTOMER, Role.ADMIN],
    'POST /reviews': [Role.CUSTOMER],
    'PUT /reviews/:id': [Role.CUSTOMER, Role.ADMIN],
    'DELETE /reviews/:id': [Role.CUSTOMER, Role.ADMIN],

    // ===== PROMOTION ENDPOINTS =====
    'GET /promotions': [Role.GUEST, Role.CUSTOMER, Role.ADMIN],
    'GET /promotions/:id': [Role.GUEST, Role.CUSTOMER, Role.ADMIN],
    'POST /promotions': [Role.ADMIN],
    'PUT /promotions/:id': [Role.ADMIN],
    'DELETE /promotions/:id': [Role.ADMIN],

    // ===== CHAT ENDPOINTS =====
    'POST /chat': [Role.CUSTOMER, Role.EMPLOYEE],
    'GET /chat/my': [Role.CUSTOMER],
    'GET /chat/open': [Role.EMPLOYEE, Role.ADMIN],
    'GET /chat/:id': [Role.CUSTOMER, Role.EMPLOYEE, Role.ADMIN],
    'POST /chat/:id/message': [Role.CUSTOMER, Role.EMPLOYEE],
    'PUT /chat/:id/assign': [Role.EMPLOYEE, Role.ADMIN],

    // ===== DISPUTE ENDPOINTS =====
    'GET /disputes': [Role.ADMIN, Role.BRANCH_MANAGER],
    'GET /disputes/my': [Role.CUSTOMER],
    'GET /disputes/:id': [Role.CUSTOMER, Role.ADMIN, Role.BRANCH_MANAGER],
    'POST /disputes': [Role.CUSTOMER],
    'PUT /disputes/:id': [Role.ADMIN, Role.BRANCH_MANAGER],

    // ===== SHIPPING ENDPOINTS =====
    'GET /shipping/rates': [Role.CUSTOMER],
    'POST /shipping/calculate': [Role.CUSTOMER],
    'GET /shipping/track/:trackingNumber': [Role.CUSTOMER, Role.SHIPPER],

    // ===== DASHBOARD/ANALYTICS =====
    'GET /dashboard/stats': [Role.ADMIN],
    'GET /dashboard/branch/:branchId': [Role.ADMIN, Role.BRANCH_MANAGER],
    'GET /dashboard/revenue': [Role.ADMIN],
    'GET /dashboard/top-products': [Role.ADMIN, Role.BRANCH_MANAGER],

    // ===== SETTINGS =====
    'GET /settings': [Role.ADMIN],
    'PUT /settings': [Role.ADMIN],

    // ===== UPLOAD =====
    'POST /upload/image': [Role.ADMIN, Role.CUSTOMER, Role.BRANCH_MANAGER],
    'POST /upload/images': [Role.ADMIN],
};

/**
 * Helper function to check if a role has permission for a route
 */
export function hasPermission(method: string, path: string, userRole: Role): boolean {
    const key = `${method} ${path}`;
    const allowedRoles = RBAC_MATRIX[key];

    if (!allowedRoles) {
        // Route not in matrix - deny by default
        return false;
    }

    return allowedRoles.includes(userRole);
}

/**
 * Get all routes accessible by a specific role
 */
export function getRoutesByRole(role: Role): string[] {
    return Object.entries(RBAC_MATRIX)
        .filter(([_, roles]) => roles.includes(role))
        .map(([route, _]) => route);
}

