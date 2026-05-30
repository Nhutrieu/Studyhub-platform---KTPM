# 🔐 FurniMart Auth Service

## 📋 Tổng quan

**Auth Service** là một microservice độc lập trong hệ thống FurniMart, chịu trách nhiệm quản lý xác thực (Authentication) và phân quyền (Authorization) cho toàn bộ hệ thống. Service này được xây dựng bằng NestJS framework, sử dụng JWT (JSON Web Token) để quản lý phiên đăng nhập và MongoDB để lưu trữ thông tin người dùng.

## 🛠️ Công nghệ sử dụng

### Core Framework & Runtime
- **NestJS** (v10.3.0): Progressive Node.js framework cho việc xây dựng ứng dụng server-side hiệu quả và có thể mở rộng
- **Node.js** (v22): JavaScript runtime environment
- **TypeScript** (v5.2.0): Ngôn ngữ lập trình với type safety

### Database & ODM
- **MongoDB**: NoSQL database để lưu trữ thông tin người dùng
- **Mongoose** (v8.0.0): MongoDB object modeling cho Node.js
- **@nestjs/mongoose** (v10.0.0): NestJS module tích hợp Mongoose

### Authentication & Security
- **JWT (JSON Web Token)**: Cơ chế xác thực stateless
  - **@nestjs/jwt** (v11.0.2): NestJS module cho JWT
  - **passport-jwt** (v4.0.1): Passport strategy cho JWT authentication
  - **@nestjs/passport** (v10.0.0): NestJS module tích hợp Passport.js
- **bcryptjs** (v2.4.3): Thư viện mã hóa mật khẩu một chiều (hashing)

### Validation & Transformation
- **class-validator** (v0.14.0): Decorator-based validation cho DTOs
- **class-transformer** (v0.5.1): Transform và serialize objects

### API Documentation
- **@nestjs/swagger** (v7.1.0): Tự động tạo API documentation với Swagger/OpenAPI

### Configuration
- **@nestjs/config** (v3.1.0): Quản lý environment variables và configuration

### Email Service
- **nodemailer** (v6.9.7): Thư viện gửi email
- Sử dụng Gmail SMTP để gửi email đặt lại mật khẩu
- Hỗ trợ HTML email templates

### Shared Modules
- **@shared/common**: Shared package chứa các utilities, decorators, filters, và interceptors dùng chung trong hệ thống
  - `HttpExceptionFilter`: Xử lý exceptions toàn cục
  - `ResponseInterceptor`: Chuẩn hóa response format
  - `@Public()` decorator: Đánh dấu public endpoints
  - `@CurrentUser()` decorator: Lấy thông tin user hiện tại từ JWT

## 🏗️ Kiến trúc và Nguyên lý hoạt động

### Kiến trúc Module

Service được tổ chức theo mô hình modular của NestJS:

```
auth-service/
├── src/
│   ├── main.ts                 # Entry point, bootstrap application
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Health check endpoints
│   ├── auth/                  # Authentication module
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts   # Business logic cho authentication
│   │   ├── auth.controller.ts # REST API endpoints
│   │   ├── dtos/
│   │   │   └── auth.dto.ts    # Data Transfer Objects
│   │   └── strategies/
│   │       └── jwt.strategy.ts # Passport JWT strategy
│   ├── user/                  # User management module
│   │   ├── user.module.ts
│   │   ├── user.service.ts    # User CRUD operations
│   │   └── schemas/
│   │       └── user.schema.ts # Mongoose schema definition
│   └── email/                 # Email service module
│       ├── email.module.ts
│       └── email.service.ts   # Email sending service
```

### Luồng xác thực (Authentication Flow)

#### 1. Đăng ký (Registration)
```
Client → POST /api/auth/register
  ↓
AuthController.register()
  ↓
AuthService.register()
  ├─→ Kiểm tra email đã tồn tại?
  ├─→ Validate branchId cho staff roles
  ├─→ Hash password với bcrypt (10 rounds)
  ├─→ Tạo user mới trong MongoDB
  ├─→ Generate JWT token
  └─→ Return: { accessToken, refreshToken, user }
```

#### 2. Đăng nhập (Login)
```
Client → POST /api/auth/login
  ↓
AuthController.login()
  ↓
AuthService.login()
  ├─→ Tìm user theo email
  ├─→ Verify password với bcrypt.compare()
  ├─→ Generate JWT token
  └─→ Return: { accessToken, refreshToken, user }
```

#### 3. Xác thực Request (Request Authentication)
```
Client → Request với Header: Authorization: Bearer <token>
  ↓
JwtStrategy.validate()
  ├─→ Extract token từ Authorization header
  ├─→ Verify token signature & expiration
  ├─→ Decode payload
  └─→ Return user object → @CurrentUser() decorator
```

#### 4. Refresh Token
```
Client → POST /api/auth/refresh
  ↓
AuthService.refreshToken()
  ├─→ Verify refresh token
  ├─→ Check user exists & isActive
  ├─→ Generate new JWT token
  └─→ Return: { accessToken, refreshToken, user }
```

#### 5. Quên mật khẩu (Forgot Password)
```
Client → POST /api/auth/forgot-password
  ↓
AuthService.forgotPassword()
  ├─→ Tìm user theo email
  ├─→ Generate reset token (crypto.randomBytes)
  ├─→ Lưu resetToken & resetTokenExpiry (1 hour)
  ├─→ Gửi email với reset link
  └─→ Return: { message }
```

#### 6. Đặt lại mật khẩu (Reset Password)
```
Client → POST /api/auth/reset-password
  ↓
AuthService.resetPassword()
  ├─→ Tìm user theo resetToken
  ├─→ Kiểm tra token chưa hết hạn
  ├─→ Hash password mới
  ├─→ Cập nhật password & xóa resetToken
  └─→ Return: { message }
```

### JWT Token Structure

Token được tạo với payload chứa:
```typescript
{
  sub: user._id,        // User ID
  email: user.email,    // Email address
  role: user.role,      // User role (customer, employee, etc.)
  name: user.name,      // Full name
  branchId: user.branchId // Branch ID (for staff)
}
```

**Token Expiration**: 7 days (có thể cấu hình qua `JWT_SECRET` và `signOptions`)

### User Roles & Permissions

Service hỗ trợ các role sau:
- **customer**: Khách hàng (mặc định)
- **employee**: Nhân viên bán hàng
- **branch_manager**: Quản lý chi nhánh
- **shipper**: Nhân viên giao hàng
- **admin**: Quản trị viên

**Lưu ý**: Các role `employee`, `branch_manager`, `shipper` bắt buộc phải có `branchId` khi đăng ký.

## 📡 API Endpoints

### Base URL
```
http://localhost:3002/api
```

### Endpoints

#### 1. Health Check
- **GET** `/` - Root endpoint
- **GET** `/health` - Health check với thông tin service

#### 2. Authentication

##### Đăng ký
- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "email": "user@furnimart.vn",
    "password": "password123",
    "name": "Nguyễn Văn A",
    "phone": "+84123456789",
    "role": "customer",
    "branchId": "60f1b5b5e1b3c1b5b5e1b3c1" // Optional, required for staff roles
  }
  ```
- **Response** (201):
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60f1b5b5e1b3c1b5b5e1b3c1",
      "email": "user@furnimart.vn",
      "fullName": "Nguyễn Văn A",
      "name": "Nguyễn Văn A",
      "role": "customer",
      "phone": "+84123456789",
      "address": null,
      "branchId": null,
      "addresses": [],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

##### Đăng nhập
- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "user@furnimart.vn",
    "password": "password123"
  }
  ```
- **Response** (200): Tương tự như register response

##### Lấy thông tin user hiện tại
- **POST** `/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200):
  ```json
  {
    "userId": "60f1b5b5e1b3c1b5b5e1b3c1",
    "email": "user@furnimart.vn",
    "role": "customer",
    "name": "Nguyễn Văn A",
    "branchId": null
  }
  ```

##### Refresh Token
- **POST** `/auth/refresh`
- **Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response** (200): Tương tự như login response

##### Đăng xuất
- **POST** `/auth/logout`
- **Response** (200):
  ```json
  {
    "message": "Đăng xuất thành công"
  }
  ```

##### Quên mật khẩu
- **POST** `/auth/forgot-password`
- **Body**:
  ```json
  {
    "email": "user@furnimart.vn"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
  }
  ```
- **Lưu ý**: Service luôn trả về message giống nhau để bảo mật (không tiết lộ email có tồn tại hay không)

##### Đặt lại mật khẩu
- **POST** `/auth/reset-password`
- **Body**:
  ```json
  {
    "token": "reset-token-from-email",
    "password": "newpassword123"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Mật khẩu đã được đặt lại thành công"
  }
  ```
- **Error** (400): Token không hợp lệ hoặc đã hết hạn

### Swagger Documentation

API documentation có sẵn tại:
```
http://localhost:3002/api/docs
```

## 🔒 Bảo mật

### Password Hashing
- Sử dụng **bcryptjs** với **10 rounds** (salt rounds)
- Mật khẩu được hash một chiều, không thể reverse
- So sánh mật khẩu sử dụng `bcrypt.compare()` để chống timing attacks

### JWT Security
- Token được ký bằng secret key (lưu trong environment variable)
- Token có expiration time (7 days)
- Token được validate trên mỗi request có `Authorization` header

### Validation
- Tất cả input được validate bằng `class-validator`
- Email format validation
- Password minimum length: 6 characters
- Whitelist validation để loại bỏ fields không mong muốn

### CORS
- CORS được enable với cấu hình:
  - `origin: true` - Cho phép tất cả origins
  - `credentials: true` - Cho phép gửi cookies/credentials
  - Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
  - Headers: Content-Type, Authorization, Accept

## 📦 Cài đặt và Chạy

### Yêu cầu
- Node.js >= 18.x
- MongoDB >= 4.4
- npm hoặc yarn

### Cài đặt dependencies
```bash
cd services/auth-service
npm install
```

### Environment Variables

Tạo file `.env` trong thư mục `services/auth-service/`:

```env
# Server
PORT=3002
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/furnimart

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Service (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

**⚠️ Lưu ý**: 
- Trong production, sử dụng strong, random secret key cho `JWT_SECRET` (ít nhất 32 ký tự).
- Để sử dụng email service, bạn cần:
  1. Tạo Gmail App Password: https://myaccount.google.com/apppasswords
  2. Đặt `GMAIL_USER` là địa chỉ email Gmail của bạn
  3. Đặt `GMAIL_APP_PASSWORD` là App Password đã tạo
  4. Nếu không cấu hình email, service vẫn hoạt động nhưng chức năng forgot/reset password sẽ không gửi được email

### Chạy Development Mode
```bash
npm run dev
```

Service sẽ chạy tại: `http://localhost:3002/api`

### Build Production
```bash
npm run build
npm start
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t furnimart-auth-service:latest -f services/auth-service/Dockerfile .
```

### Run Container
```bash
docker run -d \
  --name auth-service \
  -p 3002:3002 \
  -e PORT=3002 \
  -e MONGODB_URI=mongodb://mongodb:27017/furnimart \
  -e JWT_SECRET=your-secret-key \
  -e GMAIL_USER=your-email@gmail.com \
  -e GMAIL_APP_PASSWORD=your-gmail-app-password \
  -e FRONTEND_URL=https://your-frontend-domain.com \
  -e NODE_ENV=production \
  furnimart-auth-service:latest
```

### Dockerfile Details

Dockerfile sử dụng multi-stage build:
1. **Builder stage**: Build shared package và auth-service
2. **Production stage**: Chỉ copy production dependencies và built code

**Port**: 3002 (EXPOSE 3002)

## 📁 Cấu trúc Project

```
services/auth-service/
├── .dockerignore          # Docker ignore rules
├── Dockerfile             # Docker build configuration
├── nest-cli.json          # NestJS CLI configuration
├── package.json           # Dependencies & scripts
├── package-lock.json      # Locked dependencies
├── tsconfig.json          # TypeScript configuration
├── README.md              # Documentation (this file)
└── src/
    ├── main.ts            # Application entry point
    ├── app.module.ts      # Root module
    ├── app.controller.ts  # Health check controller
    ├── auth/              # Authentication module
    │   ├── auth.module.ts
    │   ├── auth.service.ts
    │   ├── auth.controller.ts
    │   ├── dtos/
    │   │   └── auth.dto.ts
    │   └── strategies/
    │       └── jwt.strategy.ts
    ├── user/              # User management module
    │   ├── user.module.ts
    │   ├── user.service.ts
    │   └── schemas/
    │       └── user.schema.ts
    └── email/             # Email service module
        ├── email.module.ts
        └── email.service.ts
```

## 🗄️ Database Schema

### User Schema

```typescript
{
  email: string (required, unique)
  password: string (required, hashed)
  name: string (required)
  phone?: string
  role: string (default: 'customer', enum: ['customer', 'employee', 'branch_manager', 'shipper', 'admin'])
  branchId?: ObjectId (required for staff roles)
  address?: string
  addresses?: Array<{
    name: string
    phone: string
    street: string
    ward: string
    district: string
    city: string
    isDefault: boolean
  }>
  resetToken?: string (for password reset)
  resetTokenExpiry?: Date (expires in 1 hour)
  isActive: boolean (default: true)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

## 🔄 Tích hợp với Services khác

Auth Service được thiết kế để hoạt động độc lập nhưng có thể tích hợp với:

1. **API Gateway**: Service này có thể được expose qua API Gateway để routing requests
2. **Other Microservices**: Các service khác có thể validate JWT token bằng cách sử dụng cùng `JWT_SECRET`
3. **Shared Package**: Sử dụng `@shared/common` cho các utilities, decorators, filters chung

## 🧪 Testing

### Manual Testing với Swagger
1. Truy cập `http://localhost:3002/api/docs`
2. Test các endpoints trực tiếp từ Swagger UI

### Testing với cURL

**Register:**
```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@furnimart.vn",
    "password": "password123",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@furnimart.vn",
    "password": "password123"
  }'
```

**Get Me:**
```bash
curl -X POST http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

**Forgot Password:**
```bash
curl -X POST http://localhost:3002/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@furnimart.vn"
  }'
```

**Reset Password:**
```bash
curl -X POST http://localhost:3002/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "newpassword123"
  }'
```

## 📝 Scripts

- `npm run dev`: Chạy development mode với hot reload
- `npm run build`: Build production code
- `npm start`: Chạy production code
- `npm run lint`: Lint và fix code

## 🚀 Production Best Practices

1. **Environment Variables**: Luôn sử dụng environment variables cho sensitive data
2. **JWT Secret**: Sử dụng strong, random secret key (ít nhất 32 characters)
3. **HTTPS**: Luôn sử dụng HTTPS trong production
4. **Rate Limiting**: Cân nhắc thêm rate limiting cho login/register endpoints
5. **Token Blacklist**: Có thể implement token blacklist cho logout functionality
6. **Refresh Token Rotation**: Implement proper refresh token rotation mechanism
7. **Logging**: Thêm logging cho security events (failed login attempts, etc.)
8. **Monitoring**: Setup monitoring và alerting cho service health

## 📧 Email Service Configuration

### Gmail App Password Setup

1. Truy cập: https://myaccount.google.com/apppasswords
2. Đăng nhập với tài khoản Gmail của bạn
3. Chọn "Mail" và "Other (Custom name)"
4. Nhập tên: "FurniMart Auth Service"
5. Nhấn "Generate"
6. Sao chép mật khẩu 16 ký tự được tạo
7. Đặt vào biến môi trường `GMAIL_APP_PASSWORD`

**Lưu ý**: 
- Không sử dụng mật khẩu Gmail thông thường
- App Password là cách an toàn để ứng dụng truy cập Gmail
- Nếu không cấu hình email, service vẫn chạy nhưng chức năng forgot/reset password sẽ không gửi được email

### Email Template

Service sử dụng HTML email template cho password reset với:
- Design hiện đại, responsive
- Link đặt lại mật khẩu
- Thông báo hết hạn (1 giờ)
- Branding FurniMart

## 🔮 Tính năng tương lai (TODO)

- [ ] Implement proper refresh token mechanism (hiện tại refresh token = access token)
- [ ] Token blacklist cho logout
- [ ] Rate limiting cho authentication endpoints
- [ ] Two-factor authentication (2FA)
- [x] Password reset functionality ✅
- [ ] Email verification
- [ ] OAuth integration (Google, Facebook)
- [ ] Session management
- [ ] Audit logging
- [ ] Multiple email providers support (không chỉ Gmail)

