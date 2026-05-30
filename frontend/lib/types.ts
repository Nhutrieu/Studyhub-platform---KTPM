/**
 * Frontend Types
 * 
 * NOTE: These types should be kept in sync with shared/types in the backend.
 * For consistency, always match the structure defined in shared/types.
 * 
 * TODO: In the future, consider using a monorepo setup to share types directly.
 */

// Re-export enums to match shared/types
export enum UserRole {
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  BRANCH_MANAGER = 'branch_manager',
  SHIPPER = 'shipper',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  _id?: string; // MongoDB _id
  email: string;
  name: string; // Backend uses 'name'
  fullName?: string; // Alias for name, for compatibility
  phone?: string;
  role: UserRole;
  avatar?: string;
  branchId?: string;
  address?: string; // General address field
  addresses?: Array<{ // Shipping addresses array
    name: string;
    phone: string;
    street: string;
    ward: string;
    district: string;
    city: string;
    isDefault?: boolean;
  }>;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Matches shared/types/responses.ts
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null; // Backend can return null
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Product {
  id: string;
  _id?: string; // MongoDB _id
  name: string;
  description: string;
  price: number;
  discount?: number; // Discount amount
  stock?: number; // Stock quantity
  images: string[];
  model3d?: string; // Backend uses 'model3d'
  modelUrl?: string; // Alias for model3d, for compatibility
  categoryId: string;
  category?: Category | string; // Can be object or string (for backward compatibility)
  materials?: string[]; // Backend uses array: ['Gỗ', 'Da', 'Kim loại']
  material?: string; // Alias for backward compatibility
  colors?: string[]; // Backend uses array: ['Đen', 'Trắng', 'Xám']
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string; // 'cm', 'm', 'kg'
  } | string; // Can be object or string (for backward compatibility)
  weight?: number; // Alias for dimensions.weight
  rating?: number; // Average rating
  reviewCount?: number; // Number of reviews
  isActive?: boolean; // Backend uses isActive boolean
  isFeatured?: boolean; // Featured product flag
  status?: "active" | "inactive"; // Alias for isActive, for compatibility
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  _id?: string; // MongoDB _id
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  sortOrder?: number; // For ordering in UI
  isActive?: boolean; // Active status
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  _id?: string;
  name: string;
  description?: string; // Branch description
  address: string | { // Backend uses object format or string
    street: string;
    ward: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  } | string; // Can be object or string (for compatibility)
  phone: string;
  email?: string;
  latitude?: number; // Alias for address.coordinates.lat
  longitude?: number; // Alias for address.coordinates.lng
  status?: "pending" | "approved" | "rejected" | "active" | "inactive"; // Backend enum
  isActive?: boolean;
  managerId?: string; // Branch manager user ID
  registrationData?: { // Registration information
    businessLicense?: string;
    taxCode?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    documents?: string[];
  };
  approvedBy?: string; // Admin who approved
  approvedAt?: string; // Approval timestamp
  rejectedReason?: string; // Rejection reason
  totalOrders?: number; // Total orders processed
  totalRevenue?: number; // Total revenue
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  branchId?: string;
  branch?: Branch;
  price: number;
}

// Matches shared/types/index.ts - OrderStatus enum
// 0.2: Standardized order status flow
export enum OrderStatus {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  RETURNING = 'RETURNING',
  RETURNED = 'RETURNED',
  // Legacy statuses for backward compatibility
  NEW = 'NEW',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
}

// Legacy type for backward compatibility
export type OrderStatusLegacy = 
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "shipping"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  _id?: string; // MongoDB _id
  customerId: string; // Backend uses customerId
  userId?: string; // Alias for customerId, for compatibility
  user?: User; // Populated user
  items: OrderItem[];
  totalPrice: number; // Backend uses totalPrice
  totalAmount?: number; // Alias for totalPrice, for compatibility
  totalDiscount?: number; // Total discount amount
  shippingAddress: string | Address; // Backend uses string
  phone: string; // Phone number for delivery
  deliveryAddress?: {
    latitude: number;
    longitude: number;
  };
  shippingCoordinates?: { // For order creation
    lat: number;
    lng: number;
  };
  paymentMethod: "cod" | "stripe" | "momo" | "vnpay" | "wallet" | "COD" | "WALLET" | "VNPAY" | "MOMO" | "ZALOPAY" | "STRIPE"; // Backend uses lowercase
  paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "UNPAID" | "PAID" | "REFUND_PENDING" | "REFUNDED" | "FAILED";
  isPaid?: boolean; // Backend uses isPaid boolean
  status: OrderStatus | OrderStatusLegacy | string; // Backend uses uppercase enum, support legacy for compatibility
  branchId?: string; // Branch processing the order
  branch?: Branch; // Populated branch
  shipperId?: string; // Assigned shipper
  shipper?: User; // Populated shipper
  assignedEmployeeId?: string; // Assigned employee
  assignedEmployee?: User; // Populated employee
  trackingNumber?: string;
  notes?: string; // Order notes
  promotionId?: string; // Applied promotion
  promotionCode?: string; // Promotion code
  confirmedAt?: string; // Confirmation timestamp
  shippedAt?: string; // Shipping timestamp
  deliveredAt?: string; // Delivery timestamp
  cancelledAt?: string; // Cancellation timestamp
  cancelReason?: string; // Cancellation reason
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: string; // May not have id in some contexts
  productId: string;
  productName?: string; // Backend includes productName
  product?: Product; // Populated product (if available)
  quantity: number;
  price: number;
  discount?: number; // Item discount amount
}

export interface Address {
  id?: string; // May not have id in User.addresses array
  _id?: string; // MongoDB _id
  userId?: string; // User ID (may not be present in User.addresses)
  name: string; // Backend uses 'name'
  fullName?: string; // Alias for name, for compatibility
  phone: string;
  street: string; // Backend uses 'street'
  address?: string; // Alias for street, for compatibility
  ward: string;
  district: string;
  city: string;
  isDefault?: boolean; // Default address flag
  createdAt?: string;
  updatedAt?: string;
}

// Matches shared/types/index.ts - ShippingStatus enum
export enum ShippingStatus {
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  DELIVERY_FAILED = 'delivery_failed',
  RETURNED = 'returned',
}

// Legacy type for backward compatibility
export type ShippingStatusLegacy = 
  | "pending"
  | "picked"
  | "shipping"
  | "failed";

export interface ShippingTracking {
  id: string;
  _id?: string; // MongoDB _id
  orderId: string;
  order?: Order; // Populated order
  shipperId: string;
  shipper?: User; // Populated shipper
  status: ShippingStatus | ShippingStatusLegacy | string; // Backend enum, support legacy for compatibility
  currentLocation?: string; // Current shipping location
  estimatedDelivery?: string; // Estimated delivery date
  proofOfDeliveryImages?: string[]; // Multiple proof images (Backend array)
  proofImage?: string; // Alias for first image, for compatibility
  customerSignature?: string; // Customer signature
  signature?: string; // Alias for customerSignature, for compatibility
  deliveryNote?: string; // Delivery notes
  notes?: string; // Alias for deliveryNote, for compatibility
  deliveryFailedReason?: string; // Reason for delivery failure
  deliveryFailedProofs?: string[]; // Proofs for delivery failure
  trackingHistory?: Array<{ // Tracking history
    status: string;
    location?: string;
    note?: string;
    timestamp: string;
  }>;
  trackingNumber?: string; // Alias for order trackingNumber, for compatibility
  deliveredAt?: string; // Delivery timestamp
  createdAt: string;
  updatedAt: string;
}

// Legacy Shipping interface for compatibility
export type Shipping = ShippingTracking;

export interface Wallet {
  id: string;
  _id?: string; // MongoDB _id
  userId: string;
  balance: number;
  lockedBalance?: number; // Amount locked in escrow
  totalDeposited?: number; // Total amount deposited
  totalWithdrawn?: number; // Total amount withdrawn
  currency?: string; // Currency code (default: VND)
  isActive?: boolean; // Wallet active status
  transactions?: WalletTransaction[]; // Transactions (if populated)
  createdAt: string;
  updatedAt: string;
}

// Matches shared/types/index.ts - WalletTransactionType enum
export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  ESCROW_LOCK = 'escrow_lock',
  ESCROW_RELEASE = 'escrow_release',
  ESCROW_REFUND = 'escrow_refund',
  TRANSFER = 'transfer',
}

// Matches shared/types/index.ts - WalletTransactionStatus enum
export enum WalletTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export type WalletTopupStatus = 
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export interface WalletTransaction {
  id: string;
  _id?: string; // MongoDB _id
  walletId: string;
  userId: string;
  type: WalletTransactionType | string; // Backend enum
  amount: number;
  status: WalletTransactionStatus | string; // Backend enum
  topupStatus?: WalletTopupStatus; // VNPAY deposit status
  orderId?: string; // Related order ID
  paymentId?: string; // Related payment ID
  description?: string;
  referenceId?: string; // External reference
  completedAt?: string; // Completion timestamp
  failedReason?: string; // Failure reason
  bankAccount?: string; // For withdrawals
  bankName?: string; // Bank name
  accountHolderName?: string; // Account holder name
  adminNote?: string; // Admin notes
  // VNPAY specific fields
  vnpTransactionNo?: string; // VNPAY transaction number
  ipnProcessed?: boolean; // IPN processed flag
  vnpResponseCode?: string; // VNPAY response code
  vnpTransactionStatus?: string; // VNPAY transaction status
  expiresAt?: string; // Expiration for pending topup
  vnpParams?: Record<string, unknown>; // Full VNPAY params
  createdAt: string;
  updatedAt?: string;
}

// Matches shared/types/index.ts - DisputeType enum
export enum DisputeType {
  QUALITY = 'quality',
  DAMAGE = 'damage',
  MISSING = 'missing',
  WRONG_ITEM = 'wrong_item',
  DELIVERY = 'delivery',
  PAYMENT = 'payment',
  OTHER = 'other',
}

// Matches shared/types/index.ts - DisputeStatus enum
export enum DisputeStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
}

export interface Dispute {
  id: string;
  _id?: string; // MongoDB _id
  orderId: string;
  order?: Order; // Populated order
  customerId: string; // Backend uses customerId
  customerName: string; // Customer name
  userId?: string; // Alias for customerId, for compatibility
  user?: User; // Populated user
  type: DisputeType | string; // Backend enum
  reason: string; // Dispute reason
  description: string; // Detailed description (Backend required)
  images?: string[]; // Evidence images
  status: DisputeStatus | string; // Backend enum
  reviewedBy?: string; // Admin/Manager who reviewed
  reviewNote?: string; // Review notes
  resolution?: string; // Resolution provided
  response?: string; // Alias for resolution, for compatibility
  resolvedAt?: string; // Resolution timestamp
  refundAmount?: number; // Refund amount (if applicable)
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  _id?: string; // MongoDB _id
  productId: string;
  customerId: string; // Backend uses customerId
  customerName: string; // Customer name
  userId?: string; // Alias for customerId, for compatibility
  user?: User; // Populated user
  orderId?: string; // Related order ID (optional in some contexts)
  rating: number; // 1-5 stars
  comment: string; // Backend requires comment
  images?: string[]; // Review images
  isVerified?: boolean; // Verified purchase flag
  createdAt: string;
  updatedAt: string;
}

// Matches shared/types/index.ts - PromotionType enum
export enum PromotionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
  BUY_X_GET_Y = 'buy_x_get_y',
}

export interface Promotion {
  id: string;
  _id?: string; // MongoDB _id
  code?: string; // Promotion code (optional)
  name: string;
  description?: string;
  type: PromotionType | string; // Backend enum
  value: number; // Discount value
  isActive?: boolean; // Active status
  startDate: string; // Start date
  endDate: string; // End date
  applicableProducts?: string[]; // Product IDs this promotion applies to
  applicableCategories?: string[]; // Category IDs this promotion applies to
  minPurchaseAmount?: number; // Minimum purchase amount (Backend: minPurchaseAmount)
  minOrderAmount?: number; // Alias for minPurchaseAmount, for backward compatibility
  maxDiscountAmount?: number; // Maximum discount amount
  usageLimit?: number; // Maximum usage limit
  usageCount?: number; // Current usage count (Backend: usageCount)
  usedCount?: number; // Alias for usageCount, for compatibility
  usedBy?: string[]; // User IDs who used this promotion
  isCodeRequired?: boolean; // Whether code is required to use
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string; // Backend uses 'message'
  content?: string; // Alias for message, for compatibility
  images?: string[]; // Message images
  isRead?: boolean; // Read status
  sentAt: string; // Backend uses 'sentAt'
  timestamp?: string; // Alias for sentAt, for compatibility
  createdAt?: string; // Alias for sentAt
}

export interface Chat {
  id: string;
  _id?: string; // MongoDB _id
  customerId: string;
  customerName: string;
  employeeId?: string; // Assigned employee
  employeeName?: string; // Employee name (if populated)
  messages?: ChatMessage[]; // Messages array (Backend structure)
  status: "open" | "closed" | "pending"; // Backend enum
  subject?: string; // Chat subject/topic
  lastMessageAt: string; // Last message timestamp
  isReadByEmployee?: boolean; // Employee read status
  isReadByCustomer?: boolean; // Customer read status
  createdAt: string;
  updatedAt: string;
}

// Legacy Message interface for compatibility
export interface Message {
  id?: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | string;
  content: string;
  message?: string; // Alias for content
  type?: "text" | "image" | "file";
  timestamp?: string;
  sentAt?: string; // Alias for timestamp
  readAt?: string;
  isRead?: boolean; // Alias for read status
  createdAt: string;
  readBy?: string[];
  images?: string[];
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  pendingOrders?: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  totalProducts: number;
  totalSold: number;
}

export interface OrdersByStatus {
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  shipping: number;
  delivered: number;
  cancelled: number;
}

export type WarehouseTransactionType = 
  | "import"
  | "export"
  | "adjustment"
  | "damaged"
  | "returned";

export interface WarehouseTransaction {
  productId: string;
  productName: string;
  quantity: number; // Positive for import, negative for export
  type: WarehouseTransactionType;
  orderId?: string; // Related order ID
  userId: string; // Who made the transaction
  note?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  _id?: string; // MongoDB _id
  productId: string;
  productName: string;
  quantity: number; // Current stock quantity
  reservedQuantity?: number; // Reserved quantity (ordered but not shipped)
  availableQuantity?: number; // Available quantity (quantity - reservedQuantity)
  minStockLevel?: number; // Minimum stock level for alerts
  maxStockLevel?: number; // Maximum stock level
  location?: string; // Warehouse location
  isActive?: boolean; // Active status
  status?: "in_stock" | "low_stock" | "out_of_stock"; // Computed status (not in backend)
  transactions?: WarehouseTransaction[]; // Transaction history
  createdAt?: string;
  updatedAt?: string;
}

// Matches shared/types/index.ts - PaymentMethod enum
export enum PaymentMethod {
  COD = 'cod',
  STRIPE = 'stripe',
  MOMO = 'momo',
  VNPAY = 'vnpay',
  WALLET = 'wallet',
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "UNPAID" | "PAID" | "REFUND_PENDING" | "REFUNDED" | "FAILED";

export interface Payment {
  id: string;
  _id?: string; // MongoDB _id
  orderId: string;
  amount: number;
  method: PaymentMethod | string; // Backend uses PaymentMethod | string
  status: PaymentStatus;
  transactionId?: string;
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
}
