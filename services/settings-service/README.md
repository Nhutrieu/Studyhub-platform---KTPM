# ⚙️ FurniMart Settings Service

## 📋 Tổng quan

**Settings Service** là một microservice độc lập trong hệ thống FurniMart, chịu trách nhiệm quản lý các cài đặt và cấu hình của website. Service này cho phép quản trị viên cấu hình các thành phần giao diện như Header, Footer, Hero Section, Newsletter, và các cài đặt chung của hệ thống. Service được xây dựng bằng NestJS framework, sử dụng MongoDB để lưu trữ cấu hình và JWT để bảo vệ các endpoint cập nhật.

## 🛠️ Công nghệ sử dụng

### Core Framework & Runtime
- **NestJS** (v10.3.0): Progressive Node.js framework cho việc xây dựng ứng dụng server-side hiệu quả và có thể mở rộng
- **Node.js** (v22): JavaScript runtime environment
- **TypeScript** (v5.2.0): Ngôn ngữ lập trình với type safety

### Database & ODM
- **MongoDB**: NoSQL database để lưu trữ cấu hình settings
- **Mongoose** (v8.0.0): MongoDB object modeling cho Node.js
- **@nestjs/mongoose** (v10.0.0): NestJS module tích hợp Mongoose

### Authentication & Authorization
- **JWT (JSON Web Token)**: Cơ chế xác thực stateless
  - **@nestjs/jwt** (v10.2.0): NestJS module cho JWT
  - **passport-jwt** (v4.0.1): Passport strategy cho JWT authentication
  - **@nestjs/passport** (v10.0.0): NestJS module tích hợp Passport.js
- **RBAC (Role-Based Access Control)**: Phân quyền dựa trên vai trò
  - Chỉ **ADMIN** mới có quyền cập nhật settings
  - Endpoints GET công khai, không cần authentication

### Validation & Transformation
- **class-validator** (v0.14.0): Decorator-based validation cho DTOs
- **class-transformer** (v0.5.1): Transform và serialize objects

### API Documentation
- **@nestjs/swagger** (v7.1.0): Tự động tạo API documentation với Swagger/OpenAPI

### Configuration
- **@nestjs/config** (v3.1.0): Quản lý environment variables và configuration

### Testing
- **Jest**: Testing framework cho unit tests và integration tests

### Shared Modules
- **@shared/common**: Shared package chứa các utilities, decorators, guards, và interceptors
  - `HttpExceptionFilter`: Xử lý exceptions toàn cục
  - `ResponseInterceptor`: Chuẩn hóa response format
  - `AuthModule`: JWT authentication module
  - `RolesGuard`: Guard kiểm tra quyền truy cập dựa trên role
  - `@Roles()` decorator: Đánh dấu role được phép truy cập
  - `Role` enum: Định nghĩa các role trong hệ thống

## 🏗️ Kiến trúc và Nguyên lý hoạt động

### Kiến trúc Module

Service được tổ chức theo mô hình modular của NestJS:

```
settings-service/
├── src/
│   ├── main.ts                 # Entry point, bootstrap application
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Health check endpoints
│   └── settings/              # Settings management module
│       ├── settings.module.ts
│       ├── settings.service.ts # Business logic cho settings
│       ├── settings.controller.ts # REST API endpoints
│       ├── dtos/
│       │   └── settings.dto.ts # Data Transfer Objects
│       └── schemas/
│           └── settings.schema.ts # Mongoose schema definition
```

### Luồng hoạt động (Operation Flow)

#### 1. Lấy Settings (GET)
```
Client → GET /api/settings/{key}
  ↓
SettingsController.get{Key}Settings()
  ↓
SettingsService.getSettings(key)
  ├─→ Tìm settings trong MongoDB theo key
  ├─→ Nếu không tồn tại → Tạo default settings
  └─→ Return: settings.value
```

#### 2. Cập nhật Settings (PUT - Admin Only)
```
Client → PUT /api/settings/{key}
  Headers: Authorization: Bearer <admin-token>
  ↓
AuthGuard('jwt') → Xác thực JWT token
  ↓
RolesGuard → Kiểm tra role = ADMIN
  ↓
SettingsController.update{Key}Settings()
  ↓
SettingsService.updateSettings(key, updateDto)
  ├─→ Tìm và cập nhật settings trong MongoDB
  ├─→ Nếu không tồn tại → Tạo mới (upsert: true)
  └─→ Return: updated settings
```

### Settings Keys

Service hỗ trợ 4 loại settings keys:

1. **`theme`** (mặc định): Cấu hình giao diện chủ đề
   - Newsletter section
   - Footer (about, contact, social media, links, copyright)

2. **`general`**: Cài đặt chung của website
   - Site name, description
   - Contact information (email, phone, address)

3. **`header`**: Cấu hình Header/Navbar
   - Logo (text, URL, SVG)
   - Search bar configuration
   - Navigation items với dropdown menus

4. **`hero`**: Cấu hình Hero Section
   - Hero image URL
   - Title, subtitle
   - CTA button (text, link)

### Default Settings

Khi settings chưa tồn tại trong database, service sẽ tự động tạo default settings:

- **Theme**: Newsletter và Footer với nội dung mặc định tiếng Việt
- **General**: Thông tin liên hệ FurniMart mặc định
- **Header**: Logo text "FurniMart", navigation items mặc định
- **Hero**: Title và subtitle mặc định về nội thất

### RBAC (Role-Based Access Control)

- **GET endpoints**: Công khai, không cần authentication
- **PUT endpoints**: Yêu cầu:
  1. JWT token hợp lệ (AuthGuard)
  2. Role = `ADMIN` (RolesGuard)

## 📡 API Endpoints

### Base URL
```
http://localhost:3011/api
```

### Endpoints

#### 1. Health Check
- **GET** `/` - Root endpoint
- **GET** `/health` - Health check với thông tin service

#### 2. Settings

##### Theme Settings

**Lấy cấu hình giao diện**
- **GET** `/settings/theme`
- **Authentication**: Không cần
- **Response** (200):
  ```json
  {
    "newsletter": {
      "title": "Đăng ký nhận bản tin",
      "subtitle": "Nhận thông tin sản phẩm mới, khuyến mãi đặc biệt",
      "placeholder": "Nhập email của bạn",
      "buttonText": "Đăng ký",
      "enabled": true
    },
    "footer": {
      "about": "Nền tảng thương mại điện tử nội thất hàng đầu...",
      "address": "123 Nguyễn Hue, TP.HCM",
      "phone": "0123 456 789",
      "email": "info@furnimart.com",
      "socialMedia": {
        "facebook": "#",
        "instagram": "#",
        "twitter": "#"
      },
      "quickLinks": [
        { "label": "Sản phẩm", "url": "/products" },
        { "label": "Đơn hàng", "url": "/orders" }
      ],
      "supportLinks": [
        { "label": "Hướng dẫn mua hàng", "url": "#" },
        { "label": "Chính sách đổi trả", "url": "#" }
      ],
      "copyright": "© 2026 FurniMart. Tất cả quyền được bảo lưu."
    }
  }
  ```

**Cập nhật cấu hình giao diện** (Admin only)
- **PUT** `/settings/theme`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "value": {
      "newsletter": {
        "title": "Đăng ký nhận bản tin mới",
        "enabled": true
      },
      "footer": {
        "about": "Cập nhật về chúng tôi...",
        "socialMedia": {
          "facebook": "https://facebook.com/furnimart"
        }
      }
    }
  }
  ```
- **Response** (200): Updated settings document

##### General Settings

**Lấy cài đặt chung**
- **GET** `/settings/general`
- **Authentication**: Không cần
- **Response** (200):
  ```json
  {
    "siteName": "FurniMart",
    "siteDescription": "Nền tảng thương mại điện tử nội thất hàng đầu",
    "contactEmail": "info@furnimart.com",
    "contactPhone": "0123 456 789",
    "address": "123 Nguyễn Hue, TP.HCM"
  }
  ```

**Cập nhật cài đặt chung** (Admin only)
- **PUT** `/settings/general`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "value": {
      "siteName": "FurniMart - Nội Thất Cao Cấp",
      "contactEmail": "contact@furnimart.com"
    }
  }
  ```

##### Header Settings

**Lấy cấu hình Header/Navbar**
- **GET** `/settings/header`
- **Authentication**: Không cần
- **Response** (200):
  ```json
  {
    "logoText": "FurniMart",
    "logoUrl": null,
    "logoSvg": null,
    "searchPlaceholder": "Tìm kiếm sản phẩm...",
    "showSearch": true,
    "navigationItems": [
      {
        "label": "Sản phẩm",
        "href": "/products",
        "dropdown": []
      },
      {
        "label": "Chi nhánh",
        "href": "/branches",
        "dropdown": []
      }
    ]
  }
  ```

**Cập nhật cấu hình Header/Navbar** (Admin only)
- **PUT** `/settings/header`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "value": {
      "logoText": "FurniMart",
      "logoUrl": "https://cdn.furnimart.com/logo.png",
      "navigationItems": [
        {
          "label": "Sản phẩm",
          "href": "/products",
          "dropdown": [
            { "label": "Bàn ghế", "href": "/products/tables-chairs" },
            { "label": "Tủ kệ", "href": "/products/cabinets" }
          ]
        }
      ]
    }
  }
  ```

##### Hero Settings

**Lấy cấu hình Hero Section**
- **GET** `/settings/hero`
- **Authentication**: Không cần
- **Response** (200):
  ```json
  {
    "imageUrl": null,
    "title": "Hệ Thống Nội Thất",
    "subtitle": "Lưu Giữ Hồn Việt Trong Đường Nét Hiện Đại",
    "buttonText": "Xem Chi Tiết",
    "buttonLink": "/products"
  }
  ```

**Cập nhật cấu hình Hero Section** (Admin only)
- **PUT** `/settings/hero`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "value": {
      "imageUrl": "https://cdn.furnimart.com/hero-banner.jpg",
      "title": "Khám Phá Nội Thất Đẳng Cấp",
      "subtitle": "Nơi Hội Tụ Tinh Hoa Nội Thất Việt Nam"
    }
  }
  ```

### Swagger Documentation

API documentation có sẵn tại:
```
http://localhost:3011/api/docs
```

## 🔒 Bảo mật

### Authentication
- Tất cả **PUT endpoints** yêu cầu JWT token hợp lệ
- Token được validate qua `AuthGuard('jwt')` từ Passport

### Authorization
- Chỉ user có role **ADMIN** mới có quyền cập nhật settings
- Authorization được kiểm tra qua `RolesGuard` và `@Roles(Role.ADMIN)` decorator
- GET endpoints công khai, không cần authentication

### Validation
- Tất cả input được validate bằng `class-validator`
- DTO validation đảm bảo structure đúng của settings value

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
cd services/settings-service
npm install
```

### Environment Variables

Tạo file `.env` trong thư mục `services/settings-service/`:

```env
# Server
PORT=3011
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

Service sẽ chạy tại: `http://localhost:3011/api`

### Build Production
```bash
npm run build
npm start
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t furnimart-settings-service:latest -f services/settings-service/Dockerfile .
```

### Run Container
```bash
docker run -d \
  --name settings-service \
  -p 3011:3011 \
  -e PORT=3011 \
  -e MONGODB_URI=mongodb://mongodb:27017/furnimart \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  furnimart-settings-service:latest
```

### Dockerfile Details

Dockerfile sử dụng multi-stage build:
1. **Builder stage**: Build shared package và settings-service
2. **Production stage**: Chỉ copy production dependencies và built code

**Port**: 3011 (EXPOSE 3011)

## 📁 Cấu trúc Project

```
services/settings-service/
├── Dockerfile             # Docker build configuration
├── jest.config.js         # Jest testing configuration
├── nest-cli.json          # NestJS CLI configuration
├── package.json           # Dependencies & scripts
├── package-lock.json      # Locked dependencies
├── tsconfig.json          # TypeScript configuration
├── README.md              # Documentation (this file)
└── src/
    ├── main.ts            # Application entry point
    ├── app.module.ts      # Root module
    ├── app.controller.ts  # Health check controller
    └── settings/          # Settings management module
        ├── settings.module.ts
        ├── settings.service.ts
        ├── settings.controller.ts
        ├── dtos/
        │   └── settings.dto.ts
        └── schemas/
            └── settings.schema.ts
```

## 🗄️ Database Schema

### Settings Schema

```typescript
{
  key: string (required, unique, default: 'theme')
  value: {
    // Newsletter Section (theme only)
    newsletter?: {
      title?: string
      subtitle?: string
      placeholder?: string
      buttonText?: string
      enabled?: boolean
    }
    
    // Footer (theme only)
    footer?: {
      about?: string
      address?: string
      phone?: string
      email?: string
      socialMedia?: {
        facebook?: string
        instagram?: string
        twitter?: string
      }
      quickLinks?: Array<{ label: string, url: string }>
      supportLinks?: Array<{ label: string, url: string }>
      copyright?: string
    }
    
    // Header/Navbar (header key)
    header?: {
      logoText?: string
      logoUrl?: string
      logoSvg?: string
      searchPlaceholder?: string
      showSearch?: boolean
      navigationItems?: Array<{
        label: string
        href: string
        dropdown?: Array<{ label: string, href: string }>
      }>
    }
    
    // Hero Section (hero key)
    hero?: {
      imageUrl?: string
      title?: string
      subtitle?: string
      buttonText?: string
      buttonLink?: string
    }
    
    // General Settings (general key)
    siteName?: string
    siteDescription?: string
    contactEmail?: string
    contactPhone?: string
    address?: string
  } (required)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Lưu ý**: Schema sử dụng `type: Object` trong Mongoose để lưu trữ flexible JSON structure cho `value` field.

## 🔄 Tích hợp với Services khác

Settings Service được thiết kế để hoạt động độc lập nhưng tích hợp với:

1. **Auth Service**: Sử dụng cùng `JWT_SECRET` để validate tokens
2. **Frontend**: Cung cấp API để frontend lấy và hiển thị settings
3. **API Gateway**: Service này có thể được expose qua API Gateway
4. **Shared Package**: Sử dụng `@shared/common` cho:
   - `AuthModule`: JWT authentication
   - `RolesGuard`: Role-based authorization
   - `Role` enum: Role definitions
   - Common decorators, filters, interceptors

## 🧪 Testing

### Manual Testing với Swagger
1. Truy cập `http://localhost:3011/api/docs`
2. Test các endpoints trực tiếp từ Swagger UI
3. Để test PUT endpoints, cần:
   - Login qua auth-service để lấy admin token
   - Copy token và click "Authorize" trong Swagger UI
   - Nhập token: `Bearer <your-token>`

### Testing với cURL

**Get Theme Settings:**
```bash
curl -X GET http://localhost:3011/api/settings/theme
```

**Update Theme Settings (Admin):**
```bash
curl -X PUT http://localhost:3011/api/settings/theme \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "value": {
      "newsletter": {
        "title": "Đăng ký nhận bản tin mới",
        "enabled": true
      }
    }
  }'
```

**Get General Settings:**
```bash
curl -X GET http://localhost:3011/api/settings/general
```

### Unit Tests
```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Run tests with coverage
```

## 📝 Scripts

- `npm run dev`: Chạy development mode với hot reload
- `npm run build`: Build production code
- `npm start`: Chạy production code
- `npm run lint`: Lint và fix code
- `npm test`: Chạy unit tests
- `npm run test:watch`: Chạy tests trong watch mode
- `npm run test:cov`: Chạy tests với coverage report

## 🚀 Production Best Practices

1. **Environment Variables**: Luôn sử dụng environment variables cho sensitive data
2. **JWT Secret**: Phải giống với auth-service để validate tokens
3. **HTTPS**: Luôn sử dụng HTTPS trong production
4. **Validation**: Đảm bảo validate tất cả input trước khi lưu vào database
5. **Default Values**: Service tự động tạo default settings nếu chưa tồn tại
6. **Backup**: Thường xuyên backup MongoDB để không mất cấu hình
7. **Caching**: Cân nhắc thêm caching cho GET endpoints (settings ít thay đổi)
8. **Monitoring**: Setup monitoring và alerting cho service health
9. **Version Control**: Có thể thêm versioning cho settings để rollback khi cần

## 💡 Use Cases

### 1. Frontend lấy cấu hình giao diện
Frontend có thể gọi GET endpoints khi khởi động để lấy:
- Theme settings (newsletter, footer)
- Header configuration (logo, navigation)
- Hero section settings
- General site information

### 2. Admin cập nhật cấu hình
Admin có thể cập nhật:
- Thay đổi logo, navigation menu
- Cập nhật thông tin liên hệ
- Thay đổi nội dung footer, newsletter
- Cập nhật hero banner

### 3. Multi-tenant Support (Future)
Có thể mở rộng để hỗ trợ multi-tenant bằng cách thêm `tenantId` vào schema.

## 🔮 Tính năng tương lai (TODO)

- [ ] Thêm caching layer (Redis) cho GET endpoints
- [ ] Settings versioning và rollback
- [ ] Multi-tenant support
- [ ] Settings import/export (JSON)
- [ ] Settings validation schema (JSON Schema)
- [ ] Audit logging cho mọi thay đổi settings
- [ ] Settings preview mode (chưa publish)
- [ ] Settings templates/presets
- [ ] Bulk update multiple settings keys
- [ ] Settings history/change tracking

## 📞 Liên hệ & Hỗ trợ

Để biết thêm thông tin về FurniMart project, vui lòng tham khảo documentation chính của dự án.

---

**Version**: 1.0.0  



