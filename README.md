# FurniMart - E-commerce Platform

Hệ thống thương mại điện tử nội thất đa chi nhánh với kiến trúc Microservices.

**Version**: 1.0.0  
**Status**: ✅ Production Ready

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc](#kiến-trúc)
- [Frontend Status](#frontend-status) ⭐ NEW
- [Tech Stack](#tech-stack)
- [Cài đặt](#cài-đặt)
- [Chạy dự án](#chạy-dự-án)
- [Seed Data](#seed-data)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Services](#api-services)
- [Tài khoản Test](#tài-khoản-test)
- [Environment Variables](#environment-variables)
- [Docker](#docker)

## 🎯 Tổng quan

FurniMart là nền tảng thương mại điện tử chuyên về nội thất với các tính năng:

- 🛍️ Mua sắm và đặt hàng trực tuyến
- 🏢 Quản lý đa chi nhánh
- 💳 Thanh toán đa phương thức (COD, VNPay, MoMo)
- 📦 Quản lý kho và vận chuyển
- 💬 Chat hỗ trợ khách hàng

## 🎉 Frontend Status

**✅ FRONTEND HOÀN TOÀN HOÀN CHỈNH & SẴN SÀNG PRODUCTION!**

### Thống Kê

- **70+ Pages** across 5 user roles (Customer, Admin, Manager, Employee, Shipper)
- **16 API Services** fully implemented
- **3 Zustand Stores** with persistent state
- **5 Custom Hooks** for common functionality
- **50+ React Components** with consistent design
- **8000+ Files** in complete application
- **✅ Build Success** - TypeScript compilation passed
- **✅ Zero Errors** - All critical issues resolved

### Chức Năng Hoàn Chỉnh

- ✅ User Authentication & Authorization
- ✅ Product Browsing & Filtering
- ✅ Shopping Cart & Checkout
- ✅ Multi-Payment Integration
- ✅ Order Tracking & Management
- ✅ Customer Support Chat
- ✅ Wallet System
- ✅ Reviews & Ratings
- ✅ Dispute Management
- ✅ Analytics Dashboard
- ✅ Multi-Branch Support
- ✅ Role-Based Access Control

### Documentation

📚 Tài liệu dự án hiện được tổng hợp trong README này.

### Getting Started Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Deploy Frontend

```bash
cd frontend
npm run build
# Deploy to Vercel, Docker, AWS, etc.
```

---

- ⭐ Đánh giá và review sản phẩm
- 🎁 Hệ thống khuyến mãi
- 👥 Quản lý người dùng với nhiều vai trò

## 🏗️ Kiến trúc

Dự án sử dụng kiến trúc **Microservices** với các thành phần:

```
┌─────────────┐
│   Frontend  │ (Next.js 14)
│   Port 3000 │
└──────┬──────┘
       │
┌──────▼──────┐
│ API Gateway │ (NestJS)
│  Port 3001  │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼──┐ ┌─▼──┐ ... (18 Microservices)
│Auth │ │User│ │Prod│
└─────┘ └────┘ └────┘
   │       │       │
   └───┬───┴───┬───┘
       │       │
   ┌───▼───────▼───┐
   │   MongoDB     │
   │   Port 27017  │
   └───────────────┘
```

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **3D Viewer**: Three.js + React Three Fiber

### Backend

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: JWT
- **API Documentation**: Swagger

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB 7.0

## 📦 Cài đặt

### Yêu cầu

- Node.js 18+
- Docker & Docker Compose
- Git

### Clone repository

```bash
git clone <repository-url>
cd furnimart
```

### Cài đặt dependencies

**Root project:**

```bash
npm install
```

**Frontend:**

```bash
cd frontend
npm install
```

**Seed Script:**

```bash
cd scripts
npm install
```

## 🚀 Chạy dự án

### Sử dụng Docker Compose (Khuyến nghị)

```bash
# Build và chạy tất cả services
npm run dev

# Hoặc
docker-compose up

# Chạy ở background
npm start
# Hoặc
docker-compose up -d

# Dừng services
npm run stop
# Hoặc
docker-compose down

# Xem logs
npm run logs
# Hoặc
docker-compose logs -f

# Xóa volumes (xóa database)
npm run clean
# Hoặc
docker-compose down -v
```

### Chạy từng service riêng lẻ

**Frontend:**

```bash
cd frontend
npm run dev
# Frontend chạy tại http://localhost:3000
```

**API Gateway:**

```bash
cd api-gateway
npm run start:dev
# API Gateway chạy tại http://localhost:3001
```

**Microservices:**

```bash
cd services/<service-name>
npm run start:dev
```

## 🌱 Seed Data

Script seed tạo dữ liệu mẫu đầy đủ cho hệ thống.

### Chạy Seed

```bash
cd scripts
npm run seed
```

Hoặc với ts-node trực tiếp:

```bash
cd scripts
npx ts-node index.ts
```

### Dữ liệu được tạo

Script seed tạo dữ liệu mẫu đầy đủ cho hệ thống:

- **34 Users**:

  - 1 Admin
  - 3 Branch Managers
  - 4 Employees
  - 3 Shippers
  - 23 Customers

- **3 Branches**: Chi nhánh Quận 1, Quận 7, Quận 2

- **6 Categories**: Ghế, Bàn, Giường, Tủ, Đèn, Trang trí

- **Products**: Với ảnh từ Unsplash (số lượng tùy theo seed script)

- **98 Warehouse records**: Inventory cho tất cả sản phẩm

- **4 Promotions**: Các chương trình khuyến mãi

- **50 Orders**: Đơn hàng với các trạng thái khác nhau

- **100 Reviews**: Đánh giá từ khách hàng

- **23 Wallets**: Ví điện tử cho tất cả customers

- **Payments**: Thanh toán cho các đơn hàng (trừ COD)

- **Shipping Tracking**: Theo dõi vận chuyển cho các đơn hàng

- **15 Chats**: Cuộc trò chuyện giữa customers và employees

- **10 Disputes**: Tranh chấp đơn hàng với các trạng thái khác nhau

- **1 Settings**: Cài đặt hệ thống (theme, header, footer, hero)

### Xóa và nạp lại database

```bash
# Xóa database cũ
docker exec furnimart-mongodb mongosh --username admin --password admin123 --authenticationDatabase admin --eval "use furnimart; db.getCollectionNames().forEach(function(c) { db[c].drop(); });"

# Chạy seed
cd scripts
npm run seed
```

## 📁 Cấu trúc dự án

```
furnimart/
├── api-gateway/          # API Gateway (NestJS)
│   ├── src/
│   └── Dockerfile
│
├── frontend/              # Frontend (Next.js)
│   ├── app/              # Pages (App Router)
│   │   ├── (customer)/   # Customer/public pages
│   │   ├── (dashboard)/  # Dashboard pages
│   │   └── auth/         # Authentication pages
│   ├── components/       # UI components
│   ├── services/         # API service layer
│   ├── store/            # Zustand state management
│   └── lib/              # Utilities, types
│
├── services/             # Microservices (18 services)
│   ├── auth-service/     # Authentication & Authorization
│   ├── user-service/      # User management
│   ├── product-service/  # Product management
│   ├── category-service/ # Category management
│   ├── order-service/    # Order management
│   ├── cart-service/     # Shopping cart
│   ├── payment-service/  # Payment processing
│   ├── shipping-service/ # Shipping management
│   ├── warehouse-service/ # Inventory management
│   ├── review-service/   # Product reviews
│   ├── promotion-service/ # Promotions & discounts
│   ├── branch-service/   # Branch management
│   ├── chat-service/     # Customer support chat
│   ├── dispute-service/  # Order disputes
│   ├── settings-service/ # System settings
│   ├── dashboard-service/ # Analytics & dashboard
│   ├── upload-service/  # File upload
│   └── wallet-service/   # Wallet & transactions
│
├── shared/               # Shared code
│   ├── common/          # Common utilities
│   │   ├── auth/       # Auth guards, strategies
│   │   ├── decorators/  # Custom decorators
│   │   ├── guards/     # Guards
│   │   └── interceptors/ # Interceptors
│   └── types/           # Shared TypeScript types
│
├── scripts/             # Utility scripts
│   └── seed.ts         # Database seed script
│
├── docker-compose.yml   # Docker Compose configuration
└── package.json         # Root package.json
```

## 🔌 API Services

### Service Ports

| Service           | Port | Description                    |
| ----------------- | ---- | ------------------------------ |
| Frontend          | 3000 | Next.js frontend               |
| API Gateway       | 3001 | Entry point for all APIs       |
| Auth Service      | 3002 | Authentication & Authorization |
| User Service      | 3003 | User management                |
| Product Service   | 3004 | Product management             |
| Order Service     | 3005 | Order management               |
| Shipping Service  | 3006 | Shipping management            |
| Review Service    | 3007 | Product reviews                |
| Chat Service      | 3008 | Customer support               |
| Warehouse Service | 3009 | Inventory management           |
| Dispute Service   | 3010 | Order disputes                 |
| Settings Service  | 3011 | System settings                |
| Upload Service    | 3012 | File upload                    |
| Category Service  | 3013 | Category management            |
| Dashboard Service | 3014 | Analytics & dashboard          |
| Payment Service   | 3015 | Payment processing             |
| Promotion Service | 3016 | Promotions & discounts         |
| Branch Service    | 3017 | Branch management              |
| Wallet Service    | 3018 | Wallet & transactions          |
| Cart Service      | 3019 | Shopping cart                  |

### API Endpoints

Tất cả API endpoints được route qua API Gateway tại `http://localhost:3001/api`

Ví dụ:

- `GET /api/products` - Lấy danh sách sản phẩm
- `POST /api/auth/login` - Đăng nhập
- `GET /api/orders` - Lấy danh sách đơn hàng

## 👥 Roles & Permissions

Hệ thống hỗ trợ 6 vai trò:

- **guest** - Khách chưa đăng nhập

  - Xem sản phẩm, danh mục, chi nhánh
  - Không thể đặt hàng hoặc xem đơn hàng
  - Phải đăng nhập để mua hàng

- **customer** - Khách hàng

  - Mua sắm, đặt hàng, thanh toán
  - Xem sản phẩm, đánh giá, tạo review
  - Chat với nhân viên, tạo dispute
  - Quản lý địa chỉ giao hàng

- **admin** - Quản trị viên

  - Quản lý toàn hệ thống (products, categories, branches, users)
  - Xem dashboard tổng quan và báo cáo
  - Quản lý tất cả chi nhánh
  - **Lưu ý**: Admin chỉ xem inventory, không chỉnh sửa tồn kho

- **branch_manager** - Quản lý chi nhánh

  - Quản lý chi nhánh của mình
  - Quản lý nhân viên và shipper
  - Quản lý tồn kho chi nhánh
  - Xác nhận đơn hàng, phân công employee/shipper
  - Xem dashboard chi nhánh

- **employee** - Nhân viên chi nhánh

  - Xử lý đơn hàng được phân công
  - Cập nhật trạng thái: CONFIRMED → PACKING → READY_TO_SHIP
  - Chat hỗ trợ khách hàng
  - Quản lý kho (nhập/xuất)

- **shipper** - Nhân viên giao hàng
  - Xem đơn hàng được phân công
  - Cập nhật trạng thái: READY_TO_SHIP → SHIPPING → DELIVERED/FAILED_DELIVERY
  - Xác nhận giao hàng (OTP/signature)
  - Xem lịch sử giao hàng

Chi tiết đầy đủ xem tại `ROLES_AND_PERMISSIONS.md`

## 🔑 Tài khoản Test

Sau khi chạy seed, bạn có thể sử dụng các tài khoản sau:

| Role           | Email                     | Password      |
| -------------- | ------------------------- | ------------- |
| Admin          | `admin@furnimart.com`     | `admin123`    |
| Branch Manager | `manager1@furnimart.com`  | `manager123`  |
| Employee       | `employee1@furnimart.com` | `employee123` |
| Shipper        | `shipper1@furnimart.com`  | `shipper123`  |
| Customer       | `customer1@example.com`   | `customer123` |

## ⚙️ Environment Variables

### Root `.env`

```env
NODE_ENV=development
JWT_SECRET=furnimart-secret-key-2024
MONGODB_URI=mongodb://admin:admin123@localhost:27017/furnimart?authSource=admin
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Payment Service (VNPay)

```env
VNP_TMN_CODE=7MFQRM1G
VNP_HASH_SECRET=HUOUL72ZW06UZRY5ZG6D8QARXPQ1ZDDR
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3000/payment/return
```

# Vào thư mục gốc

cd /Users/huynhngocbinh/Downloads/furnimart

# Kiểm tra đang ở đúng folder (phải thấy docker-compose.yml)

ls docker-compose.yml

## 🐳 Docker

### Build images

```bash
docker-compose build
```

### Chạy services

```bash
docker-compose up -d
```

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Một service cụ thể
docker-compose logs -f api-gateway
```

### Dừng services

```bash
docker-compose down
```

### Xóa volumes (xóa database)

```bash
docker-compose down -v
```

### Restart một service

```bash
docker-compose restart <service-name>
```

## 🎨 Design System

Frontend sử dụng design system nhất quán:

- **Style**: Minimalist, luxury (MOHO-inspired)
- **Colors**: Secondary-\* palette (stone/beige tones)
- **Typography**: Inter font family
- **Components**: Consistent rounded-md, font-medium
- **Layout**: Max-width 1280px, consistent padding

## 🔒 Security

- JWT authentication với refresh tokens
- Role-based route protection (middleware)
- API request/response interceptors
- Secure cookie handling
- Input validation với class-validator
- CORS configuration

## 📊 Database

### MongoDB Connection

Mặc định: `mongodb://admin:admin123@localhost:27017/furnimart?authSource=admin`

### Collections

- `users` - Người dùng
- `branches` - Chi nhánh
- `categories` - Danh mục
- `products` - Sản phẩm
- `orders` - Đơn hàng
- `reviews` - Đánh giá
- `promotions` - Khuyến mãi
- `warehouses` - Kho hàng
- `carts` - Giỏ hàng
- `payments` - Thanh toán
- `shippings` - Vận chuyển
- `chats` - Chat messages
- `disputes` - Tranh chấp
- `wallets` - Ví điện tử

## 🚦 Development Workflow

1. **Start MongoDB:**

   ```bash
   docker-compose up mongodb -d
   ```

2. **Run Seed (nếu cần):**

   ```bash
   cd scripts && npm run seed
   ```

3. **Start API Gateway:**

   ```bash
   cd api-gateway && npm run start:dev
   ```

4. **Start Services (theo nhu cầu):**

   ```bash
   cd services/<service-name> && npm run start:dev
   ```

5. **Start Frontend:**
   ```bash
   cd frontend && npm run dev
   ```

## ✅ Production Checklist

- ✅ TypeScript strict mode
- ✅ No linter errors
- ✅ All API endpoints synchronized
- ✅ Backend-Frontend types synchronized
- ✅ Error handling (ErrorBoundary + ErrorState)
- ✅ Loading states (Skeleton components)
- ✅ Empty states (EmptyState components)
- ✅ Responsive design (mobile-first)
- ✅ Accessibility (ARIA labels, focus states)
- ✅ Performance optimized (dynamic imports, lazy loading)
- ✅ Docker containerization
- ✅ Health checks cho tất cả services
- ✅ Centralized logging
- ✅ Centralized notifications
- ✅ Design system nhất quán
- ✅ Code quality cao

## 🐳 Docker Build

### Build Services

Để build lại tất cả Docker services, sử dụng lệnh docker build:

**Build từng service:**

```bash
docker-compose build --no-cache <service-name>
```

**Build tất cả services:**

```bash
docker-compose build --no-cache
```

**Ví dụ build từng service:**

```bash
docker-compose build --no-cache auth-service
docker-compose build --no-cache user-service
docker-compose build --no-cache product-service
# ... (xem docker-compose.yml để biết tất cả services)
```

## 📚 Documentation

- `README.md` - Tổng quan dự án (file này)
- `API.md` - API documentation đầy đủ
- `DEPLOYMENT.md` - Hướng dẫn deploy production
- `ROLES_AND_PERMISSIONS.md` - Chi tiết về roles và permissions

## 📝 Notes

- Script seed sẽ **XÓA TẤT CẢ** dữ liệu hiện có trước khi seed
- Chỉ chạy seed trong môi trường development
- Đảm bảo MongoDB đang chạy và có quyền truy cập
- Tất cả sản phẩm có ảnh từ Unsplash (high quality)

## 📄 License

ISC

## 👨‍💻 Author

FurniMart Development Team
