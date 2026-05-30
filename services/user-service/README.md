# 👥 FurniMart User Service

## 📋 Tổng quan

**User Service** là một microservice độc lập trong hệ thống FurniMart, chịu trách nhiệm quản lý thông tin người dùng và địa chỉ giao hàng. Service này cung cấp các chức năng CRUD cho user, quản lý địa chỉ giao hàng, và hỗ trợ phân quyền dựa trên vai trò (RBAC). Service được xây dựng bằng NestJS framework, sử dụng MongoDB để lưu trữ dữ liệu và JWT để xác thực người dùng.

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
  - **@nestjs/jwt** (v10.2.0): NestJS module cho JWT
  - **passport-jwt** (v4.0.1): Passport strategy cho JWT authentication
  - **@nestjs/passport** (v10.0.0): NestJS module tích hợp Passport.js
- **bcryptjs** (v2.4.3): Thư viện mã hóa mật khẩu một chiều (hashing) - sử dụng khi cập nhật password

### Validation & Transformation
- **class-validator** (v0.14.0): Decorator-based validation cho DTOs
- **class-transformer** (v0.5.1): Transform và serialize objects

### API Documentation
- **@nestjs/swagger** (v7.1.0): Tự động tạo API documentation với Swagger/OpenAPI

### Configuration
- **@nestjs/config** (v3.1.0): Quản lý environment variables và configuration

### Common Modules (Internal)
Service sử dụng các common modules nội bộ:
  - `HttpExceptionFilter`: Xử lý exceptions toàn cục
  - `ResponseInterceptor`: Chuẩn hóa response format
  - `AuthModule`: JWT authentication module (nội bộ)
  - `RolesGuard`: Role-based authorization guard
  - `JwtAuthGuard`: JWT authentication guard
  - `@Roles()` decorator: Đánh dấu role được phép truy cập
  - `@CurrentUser()` decorator: Lấy thông tin user hiện tại từ JWT
  - `Role` enum: Định nghĩa các role trong hệ thống (từ `rbac-matrix.ts`)

## 🏗️ Kiến trúc và Nguyên lý hoạt động

### Kiến trúc Module

Service được tổ chức theo mô hình modular của NestJS:

```
user-service/
├── src/
│   ├── main.ts                 # Entry point, bootstrap application
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Health check endpoints
│   └── users/                 # User management module
│       ├── users.module.ts
│       ├── users.service.ts   # Business logic cho user management
│       ├── users.controller.ts # REST API endpoints (public API)
│       ├── users-internal.controller.ts # Internal API endpoints (no auth)
│       ├── dtos/
│       │   └── user.dto.ts    # Data Transfer Objects
│       └── schemas/
│           └── user.schema.ts # Mongoose schema definition
```

### Luồng hoạt động (Operation Flow)

#### 1. Lấy thông tin cá nhân (GET Profile)
```
Client → GET /api/users/profile
  Headers: Authorization: Bearer <token>
  ↓
AuthGuard('jwt') → Xác thực JWT token
  ↓
UsersController.getProfile()
  ↓
UsersService.findById(userId)
  ├─→ Tìm user trong MongoDB (loại trừ soft-deleted)
  └─→ Return: user (không bao gồm password)
```

#### 2. Cập nhật thông tin cá nhân (PUT Profile)
```
Client → PUT /api/users/profile
  Headers: Authorization: Bearer <token>
  ↓
AuthGuard('jwt') → Xác thực JWT token
  ↓
UsersController.updateProfile()
  ↓
UsersService.update(userId, updateDto)
  ├─→ Nếu có password → Hash với bcrypt (10 rounds)
  ├─→ Cập nhật user trong MongoDB
  └─→ Return: updated user (không bao gồm password)
```

#### 3. Lấy danh sách users (GET - Admin/Manager)
```
Client → GET /api/users?role=customer
  Headers: Authorization: Bearer <admin-token>
  ↓
AuthGuard('jwt') → Xác thực JWT token
  ↓
RolesGuard → Kiểm tra role = ADMIN hoặc BRANCH_MANAGER
  ↓
UsersController.findAll()
  ├─→ Nếu BRANCH_MANAGER:
  │   ├─→ Chỉ xem được EMPLOYEE và SHIPPER
  │   └─→ Filter theo branchId của manager
  ├─→ Nếu ADMIN:
  │   └─→ Xem tất cả users (có thể filter theo role)
  └─→ Return: danh sách users (không bao gồm password)
```

#### 4. Quản lý địa chỉ (Address Management)

**Thêm địa chỉ:**
```
Client → POST /api/users/addresses
  ↓
UsersService.addAddress(userId, address)
  ├─→ Nếu địa chỉ đầu tiên hoặc isDefault=true → Đặt làm mặc định
  ├─→ Nếu đặt làm mặc định → Bỏ default của các địa chỉ khác
  └─→ Thêm vào mảng addresses và save
```

**Cập nhật địa chỉ:**
```
Client → PUT /api/users/addresses/:addressId
  ↓
UsersService.updateAddress(userId, addressId, addressData)
  ├─→ Tìm địa chỉ trong mảng addresses
  ├─→ Nếu isDefault=true → Bỏ default của các địa chỉ khác
  └─→ Cập nhật và save
```

**Xóa địa chỉ:**
```
Client → DELETE /api/users/addresses/:addressId
  ↓
UsersService.deleteAddress(userId, addressId)
  └─→ Filter bỏ địa chỉ khỏi mảng addresses và save
```

**Đặt địa chỉ mặc định:**
```
Client → PUT /api/users/addresses/:addressId/set-default
  ↓
UsersService.setDefaultAddress(userId, addressId)
  ├─→ Bỏ default của tất cả địa chỉ
  └─→ Đặt isDefault=true cho địa chỉ được chọn
```

#### 5. Soft Delete User
```
Client → DELETE /api/users/:id
  Headers: Authorization: Bearer <admin-token>
  ↓
AuthGuard('jwt') + RolesGuard → Chỉ ADMIN
  ↓
UsersService.delete(id)
  ├─→ Set deletedAt = new Date()
  ├─→ Set isActive = false
  └─→ Không xóa khỏi database (soft delete)
```

**Lưu ý**: Tất cả queries đều filter `deletedAt: { $exists: false }` để loại trừ users đã bị soft delete.

### RBAC (Role-Based Access Control)

#### Phân quyền theo Role:

1. **ADMIN**:
   - Xem tất cả users
   - Cập nhật bất kỳ user nào
   - Xóa user (soft delete)
   - Có thể thay đổi role và branchId

2. **BRANCH_MANAGER**:
   - Chỉ xem được EMPLOYEE và SHIPPER trong chi nhánh của mình
   - Chỉ cập nhật được EMPLOYEE và SHIPPER trong chi nhánh của mình
   - Không thể thay đổi role ngoài EMPLOYEE/SHIPPER
   - Không thể xóa user

3. **CUSTOMER, EMPLOYEE, SHIPPER**:
   - Chỉ xem và cập nhật được profile của chính mình
   - Quản lý địa chỉ của chính mình

### Soft Delete

Service sử dụng **soft delete** pattern:
- Khi xóa user, chỉ set `deletedAt` và `isActive = false`
- Không xóa record khỏi database
- Tất cả queries tự động filter `deletedAt: { $exists: false }`
- Lý do: Không được xóa user đã có đơn hàng (để giữ lịch sử)

## 📡 API Endpoints

### Base URL
```
http://localhost:3003/api
```

### Endpoints

#### 1. Health Check
- **GET** `/` - Root endpoint
- **GET** `/health` - Health check với thông tin service

#### 2. User Profile

##### Lấy thông tin cá nhân
- **GET** `/users/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200):
  ```json
  {
    "_id": "60f1b5b5e1b3c1b5b5e1b3c1",
    "email": "user@furnimart.vn",
    "name": "Nguyễn Văn A",
    "phone": "+84123456789",
    "role": "customer",
    "branchId": null,
    "address": "123 Nguyễn Hue, TP.HCM",
    "addresses": [
      {
        "_id": "60f1b5b5e1b3c1b5b5e1b3c2",
        "name": "Nguyễn Văn A",
        "phone": "+84123456789",
        "street": "123 Nguyễn Hue",
        "ward": "Phường 1",
        "district": "Quận 1",
        "city": "TP.HCM",
        "isDefault": true
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```

##### Cập nhật thông tin cá nhân
- **PUT** `/users/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "Nguyễn Văn B",
    "phone": "+84987654321",
    "address": "456 Lê Lợi, TP.HCM",
    "password": "newpassword123"
  }
  ```
- **Response** (200): Updated user object (không bao gồm password)

#### 3. User Management (Admin/Manager)

##### Lấy danh sách users
- **GET** `/users?role=customer`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Query Parameters**:
  - `role` (optional): Filter theo role (customer, employee, shipper, etc.)
- **Permissions**:
  - **ADMIN**: Xem tất cả users
  - **BRANCH_MANAGER**: Chỉ xem EMPLOYEE và SHIPPER trong chi nhánh của mình
- **Response** (200):
  ```json
  [
    {
      "_id": "60f1b5b5e1b3c1b5b5e1b3c1",
      "email": "user@furnimart.vn",
      "name": "Nguyễn Văn A",
      "role": "customer",
      "isActive": true
    }
  ]
  ```

##### Lấy thông tin user theo ID
- **GET** `/users/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200): User object (không bao gồm password)

##### Cập nhật user (Admin/Manager)
- **PUT** `/users/:id`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "name": "Nguyễn Văn C",
    "phone": "+84987654321",
    "role": "employee",
    "branchId": "60f1b5b5e1b3c1b5b5e1b3c3"
  }
  ```
- **Permissions**:
  - **ADMIN**: Cập nhật bất kỳ user nào
  - **BRANCH_MANAGER**: Chỉ cập nhật EMPLOYEE và SHIPPER trong chi nhánh của mình
- **Response** (200): Updated user object

##### Xóa user (Admin only)
- **DELETE** `/users/:id`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Permissions**: Chỉ **ADMIN**
- **Response** (200):
  ```json
  {
    "message": "Đã xóa người dùng thành công"
  }
  ```
- **Lưu ý**: Soft delete - user không bị xóa khỏi database

#### 4. Address Management

##### Lấy danh sách địa chỉ
- **GET** `/users/addresses`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200):
  ```json
  [
    {
      "_id": "60f1b5b5e1b3c1b5b5e1b3c2",
      "name": "Nguyễn Văn A",
      "phone": "+84123456789",
      "street": "123 Nguyễn Hue",
      "ward": "Phường 1",
      "district": "Quận 1",
      "city": "TP.HCM",
      "isDefault": true
    }
  ]
  ```

##### Thêm địa chỉ mới
- **POST** `/users/addresses`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "Nguyễn Văn A",
    "phone": "+84123456789",
    "street": "123 Nguyễn Hue",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "TP.HCM",
    "isDefault": true
  }
  ```
- **Response** (200): Added address object

##### Cập nhật địa chỉ
- **PUT** `/users/addresses/:addressId`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "name": "Nguyễn Văn B",
    "phone": "+84987654321",
    "street": "456 Lê Lợi",
    "ward": "Phường 2",
    "district": "Quận 3",
    "city": "TP.HCM",
    "isDefault": false
  }
  ```
- **Response** (200): Updated address object

##### Xóa địa chỉ
- **DELETE** `/users/addresses/:addressId`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200): Success message

##### Đặt địa chỉ làm mặc định
- **PUT** `/users/addresses/:addressId/set-default`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200): Updated address object với `isDefault: true`

#### 5. Internal API (Service-to-Service)

Service cung cấp internal endpoints để các service khác có thể query user information mà không cần authentication:

##### Lấy thông tin user theo ID (Internal)
- **GET** `/users/internal/:id`
- **Authentication**: Không cần JWT (internal service call)
- **Security**: Nên được bảo vệ ở network level (chỉ cho phép internal services trong Docker network)
- **Response** (200): User object (không bao gồm password)
  ```json
  {
    "_id": "60f1b5b5e1b3c1b5b5e1b3c1",
    "email": "user@furnimart.vn",
    "name": "Nguyễn Văn A",
    "phone": "+84123456789",
    "role": "customer",
    "addresses": [...]
  }
  ```
- **Use Case**: 
  - Order service query user info để gửi email xác nhận đơn hàng
  - Auth service query user info để validate
  - Các service khác cần thông tin user
- **Lưu ý**: 
  - Endpoint này không yêu cầu JWT token
  - Nên được bảo vệ ở network level (Docker network isolation)
  - Chỉ các service trong cùng Docker network mới có thể truy cập

### Swagger Documentation

API documentation có sẵn tại:
```
http://localhost:3003/api/docs
```

## 🔒 Bảo mật

### Authentication
- Tất cả endpoints yêu cầu JWT token hợp lệ (trừ health check)
- Token được validate qua `AuthGuard('jwt')` từ Passport

### Authorization
- **Profile endpoints**: User chỉ có thể xem/cập nhật profile của chính mình
- **User management endpoints**: Chỉ ADMIN và BRANCH_MANAGER
- **Branch Manager restrictions**:
  - Chỉ xem/cập nhật được EMPLOYEE và SHIPPER
  - Chỉ trong chi nhánh của mình
  - Không thể thay đổi role ngoài EMPLOYEE/SHIPPER
- **Delete user**: Chỉ ADMIN

### Password Security
- Khi cập nhật password, tự động hash với bcrypt (10 rounds)
- Password không bao giờ được trả về trong response
- Password được loại bỏ khỏi response bằng `formatUserResponse()`

### Validation
- Tất cả input được validate bằng `class-validator`
- Email format validation
- Address fields validation (name, phone, street, ward, district, city)

### Soft Delete
- Users không bị xóa khỏi database
- Chỉ set `deletedAt` và `isActive = false`
- Tất cả queries tự động filter soft-deleted users

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
cd services/user-service
npm install
```

### Environment Variables

Tạo file `.env` trong thư mục `services/user-service/`:

```env
# Server
PORT=3003
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/furnimart

# JWT (cùng secret với auth-service)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**⚠️ Lưu ý**: 
- `JWT_SECRET` phải giống với auth-service để validate token
- Trong production, sử dụng strong, random secret key

### Chạy Development Mode
```bash
npm run dev
```

Service sẽ chạy tại: `http://localhost:3003/api`

### Build Production
```bash
npm run build
npm start
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t furnimart-user-service:latest -f services/user-service/Dockerfile .
```

### Run Container
```bash
docker run -d \
  --name user-service \
  -p 3003:3003 \
  -e PORT=3003 \
  -e MONGODB_URI=mongodb://mongodb:27017/furnimart \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  furnimart-user-service:latest
```

### Dockerfile Details

Dockerfile sử dụng multi-stage build:
1. **Builder stage**: Build shared package và user-service
2. **Production stage**: Chỉ copy production dependencies và built code

**Port**: 3003 (EXPOSE 3003)

## 📁 Cấu trúc Project

```
services/user-service/
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
    └── users/             # User management module
        ├── users.module.ts
        ├── users.service.ts
        ├── users.controller.ts
        ├── users-internal.controller.ts
        ├── dtos/
        │   └── user.dto.ts
        └── schemas/
            └── user.schema.ts
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
  address?: string (deprecated - sử dụng addresses array)
  addresses?: Array<{
    name: string
    phone: string
    street: string
    ward: string
    district: string
    city: string
    isDefault: boolean
  }> (default: [])
  isActive: boolean (default: true)
  deletedAt?: Date (soft delete - không có nghĩa là chưa xóa)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### Address Structure

Mỗi address trong mảng `addresses` có cấu trúc:
- **name**: Tên người nhận
- **phone**: Số điện thoại
- **street**: Địa chỉ đường/phố
- **ward**: Phường/Xã
- **district**: Quận/Huyện
- **city**: Thành phố
- **isDefault**: Địa chỉ mặc định (chỉ một địa chỉ có thể là default)

**Lưu ý**: 
- Khi thêm địa chỉ đầu tiên, tự động đặt làm mặc định
- Khi đặt một địa chỉ làm mặc định, các địa chỉ khác sẽ bị bỏ default
- Address được lưu dưới dạng subdocument trong MongoDB

## 🔄 Tích hợp với Services khác

User Service được thiết kế để hoạt động độc lập nhưng tích hợp với:

1. **Auth Service**: 
   - Sử dụng cùng `JWT_SECRET` để validate tokens
   - User được tạo qua auth-service, user-service quản lý thông tin và địa chỉ
   - Auth service có thể query user information từ user-service qua internal endpoint

2. **Order Service**: 
   - Order service có thể query user information từ user-service qua internal endpoint
   - Sử dụng địa chỉ từ user.addresses cho giao hàng
   - Internal endpoint: `GET /api/users/internal/:id` (không cần auth, chỉ dùng cho service-to-service)

3. **Email Service**: 
   - Order service và auth service sử dụng email-service để gửi email
   - User-service cung cấp thông tin user (email) cho các service khác để gửi email
   - Email service được tách riêng thành microservice độc lập (port 3020)

4. **Frontend**: 
   - Cung cấp API để frontend quản lý profile và địa chỉ
   - Admin panel quản lý users
   - Customer panel quản lý thông tin cá nhân và địa chỉ giao hàng

5. **API Gateway**: 
   - Service được expose qua API Gateway (port 3001)
   - Tất cả requests từ frontend đi qua API Gateway

## 🧪 Testing

### Manual Testing với Swagger
1. Truy cập `http://localhost:3003/api/docs`
2. Test các endpoints trực tiếp từ Swagger UI
3. Để test, cần:
   - Login qua auth-service để lấy token
   - Copy token và click "Authorize" trong Swagger UI
   - Nhập token: `Bearer <your-token>`

### Testing với cURL

**Get Profile:**
```bash
curl -X GET http://localhost:3003/api/users/profile \
  -H "Authorization: Bearer <your-token>"
```

**Update Profile:**
```bash
curl -X PUT http://localhost:3003/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Nguyễn Văn B",
    "phone": "+84987654321"
  }'
```

**Get Addresses:**
```bash
curl -X GET http://localhost:3003/api/users/addresses \
  -H "Authorization: Bearer <your-token>"
```

**Add Address:**
```bash
curl -X POST http://localhost:3003/api/users/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Nguyễn Văn A",
    "phone": "+84123456789",
    "street": "123 Nguyễn Hue",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "TP.HCM",
    "isDefault": true
  }'
```

**Get All Users (Admin):**
```bash
curl -X GET http://localhost:3003/api/users?role=customer \
  -H "Authorization: Bearer <admin-token>"
```

**Get User by ID (Internal - no auth):**
```bash
curl -X GET http://localhost:3003/api/users/internal/60f1b5b5e1b3c1b5b5e1b3c1
```

## 📝 Scripts

- `npm run dev`: Chạy development mode với hot reload
- `npm run build`: Build production code
- `npm start`: Chạy production code
- `npm run lint`: Lint và fix code

## 🚀 Production Best Practices

1. **Environment Variables**: Luôn sử dụng environment variables cho sensitive data
2. **JWT Secret**: Phải giống với auth-service để validate tokens
3. **HTTPS**: Luôn sử dụng HTTPS trong production
4. **Password Hashing**: Luôn hash password khi cập nhật (đã tự động trong service với bcrypt, 10 rounds)
5. **Soft Delete**: Không xóa user đã có đơn hàng để giữ lịch sử
6. **Indexing**: Cân nhắc thêm indexes cho:
   - `email` (đã có unique index)
   - `role` và `branchId` (cho queries của branch manager)
   - `deletedAt` (cho soft delete filtering)
7. **Validation**: Đảm bảo validate tất cả input trước khi lưu (sử dụng class-validator)
8. **Error Handling**: Service đã có global exception filter (`HttpExceptionFilter`)
9. **Logging**: Cân nhắc thêm logging cho các operations quan trọng
10. **Monitoring**: Setup monitoring và alerting cho service health
11. **Internal API Security**: Internal endpoints (`/users/internal/:id`) nên được bảo vệ ở network level
12. **CORS**: Cấu hình CORS phù hợp cho production (không dùng `origin: true`)
13. **Rate Limiting**: Cân nhắc thêm rate limiting cho các endpoints quan trọng
14. **Database Connection**: Sử dụng connection pooling và retry logic cho MongoDB

## 💡 Use Cases

### 1. User quản lý profile
- Xem thông tin cá nhân
- Cập nhật tên, số điện thoại
- Đổi mật khẩu

### 2. User quản lý địa chỉ giao hàng
- Thêm nhiều địa chỉ (nhà, công ty, etc.)
- Cập nhật địa chỉ
- Xóa địa chỉ
- Đặt địa chỉ mặc định

### 3. Admin quản lý users
- Xem danh sách tất cả users
- Filter theo role
- Cập nhật thông tin user
- Xóa user (soft delete)

### 4. Branch Manager quản lý nhân sự
- Xem danh sách nhân viên và shipper trong chi nhánh
- Cập nhật thông tin nhân viên
- Gán nhân viên vào chi nhánh

## 🔮 Tính năng tương lai (TODO)

- [ ] User avatar/image upload
- [ ] User preferences/settings
- [ ] Email verification status
- [ ] Phone verification
- [ ] Two-factor authentication (2FA)
- [ ] User activity log/history
- [ ] Bulk user operations (import/export)
- [ ] User search với advanced filters
- [ ] Pagination cho danh sách users
- [ ] User statistics/analytics
- [ ] Address validation (geocoding)
- [ ] Address suggestions (autocomplete)
- [ ] User notification preferences
- [ ] User social media links
- [ ] User tags/categories
- [ ] Internal API authentication (API key hoặc service-to-service secret header)
- [ ] Rate limiting cho internal endpoints
- [ ] User caching (Redis) để giảm database queries
- [ ] Webhook support cho user events (created, updated, deleted)

## 📞 Liên hệ & Hỗ trợ

Để biết thêm thông tin về FurniMart project, vui lòng tham khảo documentation chính của dự án.

---

**Version**: 1.0.0  
**Email Service Integration**: Email functionality đã được tách ra thành email-service riêng (port 3020)


