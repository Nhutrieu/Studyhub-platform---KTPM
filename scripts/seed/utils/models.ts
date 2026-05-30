
import * as mongoose from 'mongoose';

// --- Shared Sub-Schemas ---
const AddressSchema = new mongoose.Schema({
    name: String,
    phone: String,
    street: String,
    ward: String,
    district: String,
    city: String,
    isDefault: { type: Boolean, default: false },
}, { _id: false });

const GeoSchema = new mongoose.Schema({
    lat: Number,
    lng: Number,
}, { _id: false });

// 1. BRANCHES
export const BranchSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // Added code for uniqueness
    name: { type: String, required: true },
    description: String,
    address: {
        street: { type: String, required: true },
        ward: { type: String, required: true },
        district: { type: String, required: true },
        city: { type: String, required: true },
        coordinates: GeoSchema,
    },
    phone: { type: String, required: true },
    email: String,
    openHours: { type: String, default: '8:00 - 22:00' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Branch = mongoose.model('Branch', BranchSchema);

// 2. USERS
export const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    name: { type: String, required: true },
    phone: String,
    role: { type: String, enum: ['customer', 'employee', 'branch_manager', 'shipper', 'admin'], default: 'customer' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // For employees/managers
    isActive: { type: Boolean, default: true },
    addresses: [AddressSchema],
    avatar: String,
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);

// 3. CATEGORIES
export const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    image: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Category = mongoose.model('Category', CategorySchema);

// 4. PRODUCTS
export const ProductSchema = new mongoose.Schema({
    // sku: { type: String, required: true, unique: true }, // Service does not use SKU
    name: { type: String, required: true },
    slug: { type: String }, // Optional in seed if not used by service logic strictly
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    images: [String],
    categoryId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Category' },
    category: { type: String, required: true }, // Denormalized name
    materials: [String],
    colors: [String],
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: String,
    },
    // tags: [String],
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

export const Product = mongoose.model('Product', ProductSchema);

// 5. INVENTORY / WAREHOUSE
export const WarehouseSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    productName: { type: String, required: true }, // Added missing field
    branchId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Branch' },
    quantity: { type: Number, required: true, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 10 },
    maxStockLevel: { type: Number, default: 100 },
    location: String,
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for uniqueness
WarehouseSchema.index({ productId: 1, branchId: 1 }, { unique: true });

export const Warehouse = mongoose.model('Warehouse', WarehouseSchema);

// 6. CARTS
const CartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    quantity: { type: Number, required: true, min: 1 },
});

export const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    items: [CartItemSchema],
}, { timestamps: true });

export const Cart = mongoose.model('Cart', CartSchema);

// 7. ORDERS
const OrderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    productName: String,
    quantity: { type: Number, required: true },
    price: Number,
});

export const OrderSchema = new mongoose.Schema({
    // orderNumber: { type: String, required: true, unique: true }, // Service generates this? Or use _id?
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Branch' },
    items: [OrderItemSchema],
    totalPrice: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'PICKUP_READY', 'PACKING', 'READY_TO_SHIP', 'FAILED_DELIVERY', 'RETURNING', 'RETURNED'],
        default: 'PENDING_CONFIRMATION'
    },
    shippingAddress: { type: String, required: true },
    phone: { type: String },
    paymentMethod: { type: String, enum: ['cod', 'wallet', 'vnpay'], default: 'cod' },
    paymentStatus: { type: String, default: 'UNPAID' },
    isPaid: { type: Boolean, default: false },
    note: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    confirmedAt: Date,
}, { timestamps: true });

export const Order = mongoose.model('Order', OrderSchema);

// 8. PAYMENTS
export const PaymentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order' },
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['vnpay', 'wallet', 'cod'], required: true },
    status: { type: String, default: 'pending' },
    transactionId: String,
    completedAt: Date,
}, { timestamps: true });

export const Payment = mongoose.model('Payment', PaymentSchema);

// 9. WALLET
export const WalletTransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['TOPUP', 'PAYMENT', 'REFUND'], required: true },
    amount: { type: Number, required: true },
    description: String,
    status: { type: String, default: 'COMPLETED' },
}, { timestamps: true });

export const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
    isActive: { type: Boolean, default: true },
    transactions: [WalletTransactionSchema],
}, { timestamps: true });

export const Wallet = mongoose.model('Wallet', WalletSchema);

// 10. PROMOTIONS
export const PromotionSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: String,
    description: String,
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'], required: true },
    // discountType: { type: String, enum: ['percentage', 'fixed'], required: true }, // Removed
    value: { type: Number, required: true },
    minPurchaseAmount: { type: Number, default: 0 },
    maxDiscountAmount: Number,
    startDate: Date,
    endDate: Date,
    usageLimit: { type: Number, default: 100 },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isCodeRequired: { type: Boolean, default: true },
    applicableProducts: [String],
    applicableCategories: [String],
    usedBy: [String],
}, { timestamps: true });

export const Promotion = mongoose.model('Promotion', PromotionSchema);

// 11. REVIEWS
export const ReviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customerName: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    images: [String],
    isVerified: { type: Boolean, default: false },
    // isActive: { type: Boolean, default: true }, // Removed
}, { timestamps: true });

export const Review = mongoose.model('Review', ReviewSchema);

// 12. CHAT
const MessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    senderName: String,
    senderRole: String,
    message: { type: String, required: true },
    images: [String],
    isRead: { type: Boolean, default: false },
    sentAt: Date,
}, { _id: false, timestamps: true });

export const ChatSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customerName: String,
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['open', 'closed', 'pending'], default: 'open' },
    subject: String,
    lastMessageAt: Date,
    isReadByEmployee: { type: Boolean, default: false },
    isReadByCustomer: { type: Boolean, default: false },
    messages: [MessageSchema],
}, { timestamps: true });

export const Chat = mongoose.model('Chat', ChatSchema);

// 13. DISPUTES
export const DisputeSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order' },
    customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    customerName: String,
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    type: { type: String, required: true }, // quality, damage...
    reason: { type: String, required: true },
    description: String,
    images: [String],
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], default: 'OPEN' },
    resolution: String,
    refundAmount: Number,
    resolvedAt: Date,
}, { timestamps: true });

export const Dispute = mongoose.model('Dispute', DisputeSchema);

// META - Seed Version Tracking
export const SeedMetaSchema = new mongoose.Schema({
    id: { type: String, default: 'meta' },
    lastSeedDate: Date,
    seededModules: [String],
}, { timestamps: true });

export const SeedMeta = mongoose.model('SeedMeta', SeedMetaSchema);
