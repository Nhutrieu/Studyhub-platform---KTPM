-- =======================================================================================
-- KOI CARE SYSTEM - MASTER DATABASE SCHEMA (OPTIMIZED & CONSOLIDATED)
-- Phiên bản: Consolidated (Đã gộp tất cả ALTER và Patch lỗi Logic vào CREATE)
-- =======================================================================================

-- Cài đặt mặc định
SET time_zone = '+07:00';
SET default_storage_engine = InnoDB;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- Tắt kiểm tra FK tạm thời để tạo bảng nhanh

-- Tạo Database
CREATE DATABASE IF NOT EXISTS koi_care_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE koi_care_system;

-- =======================================================================================
-- 1. NGƯỜI DÙNG & XÁC THỰC (CORE AUTH)
-- =======================================================================================

CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Username VARCHAR(50) NOT NULL,
    Phone VARCHAR(20),
    IsPhoneVerified TINYINT(1) DEFAULT 0 COMMENT 'Cờ xác thực số điện thoại', -- MERGED
    Address VARCHAR(255),
    Bio TEXT DEFAULT NULL COMMENT 'Giới thiệu bản thân', -- MERGED
    Title VARCHAR(100) DEFAULT 'Thành viên mới' COMMENT 'Danh hiệu/Tagline', -- MERGED
    SocialLinks JSON DEFAULT NULL COMMENT 'Link mạng xã hội', -- MERGED
    Role ENUM('Admin', 'Shop', 'Customer') DEFAULT 'Customer',
    
    -- [Tài chính]
    AccountBalance DECIMAL(15,2) DEFAULT 0.00,
    DepositBalance DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Ví ký quỹ cho Shop', -- MERGED

    -- [Social Auth]
    AuthProvider ENUM('local', 'google', 'facebook', 'github') DEFAULT 'local',
    ProviderID VARCHAR(255),
    
    -- [Trạng thái]
    AvatarURL VARCHAR(255),
    CoverURL VARCHAR(255) DEFAULT NULL COMMENT 'Ảnh bìa', -- MERGED
    IsActive TINYINT(1) DEFAULT 1,
    LastSeen DATETIME DEFAULT NULL,
    
    -- [Xác minh Email]
    EmailVerified TINYINT(1) NOT NULL DEFAULT 0,
    EmailVerifiedAt DATETIME NULL,
    
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- MERGED
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0, -- MERGED
    DeletedAt DATETIME NULL, -- MERGED

    INDEX (Username),
    INDEX (Email),
    INDEX idx_user_isdeleted (IsDeleted)
);

CREATE TABLE LoginAttempts (
    AttemptID INT AUTO_INCREMENT PRIMARY KEY,
    IPAddress VARCHAR(45) NOT NULL,
    UserAgent VARCHAR(255) NOT NULL,
    Attempts INT DEFAULT 1,
    LastAttempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LockedUntil TIMESTAMP NULL,
    INDEX (IPAddress),
    INDEX (UserAgent),
    INDEX (LockedUntil)
);

CREATE TABLE RememberTokens (
    TokenID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    TokenHash VARCHAR(255) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (UserID),
    INDEX (TokenHash)
);

CREATE TABLE EmailVerificationTokens (
    TokenID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Token VARCHAR(64) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    UsedAt DATETIME DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (Token),
    INDEX (UserID)
);

CREATE TABLE PasswordResetTokens (
    TokenID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Token VARCHAR(64) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    UsedAt DATETIME DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (Token),
    INDEX (UserID)
);

CREATE TABLE SystemSettings (
    SettingKey VARCHAR(50) PRIMARY KEY,
    SettingValue TEXT NOT NULL,
    Description VARCHAR(255) NULL
);

CREATE TABLE WithdrawalRequests (
    RequestID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    
    BankName VARCHAR(100) NOT NULL,
    AccountName VARCHAR(100) NOT NULL,
    AccountNumber VARCHAR(50) NOT NULL,
    
    Status ENUM('Pending', 'Processing', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
    TransactionID INT DEFAULT NULL, 
    
    RequestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ProcessedAt DATETIME DEFAULT NULL,
    ProcessedByAdminID INT DEFAULT NULL,
    AdminNote TEXT NULL,
    
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ProcessedByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL,
    INDEX (UserID),
    INDEX (Status)
);

-- =======================================================================================
-- 2. HỆ THỐNG E-COMMERCE (SHOP, PRODUCT, ORDER)
-- =======================================================================================

CREATE TABLE Category (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL
);

CREATE TABLE Product (
    ProductID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryID INT NOT NULL,
    ShopID INT NULL, 
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    Price DECIMAL(10,2) NOT NULL,
    Stock INT DEFAULT 0,
    ImageURL VARCHAR(255),
    
    -- [Thống kê]
    SoldCount INT NOT NULL DEFAULT 0,
    RatingAverage DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    RatingCount INT NOT NULL DEFAULT 0,
    
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID) ON DELETE CASCADE,
    FOREIGN KEY (ShopID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (CategoryID),
    INDEX (ShopID)
);

CREATE TABLE ProductImage (
    ProductImageID INT AUTO_INCREMENT PRIMARY KEY,
    ProductID INT NOT NULL,
    ImageURL VARCHAR(255) NOT NULL,
    MediaType ENUM('image','video') NOT NULL DEFAULT 'image', -- MERGED
    IsPrimary TINYINT(1) NOT NULL DEFAULT 0,
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID) ON DELETE CASCADE,
    INDEX (ProductID)
);

CREATE TABLE ProductReview (
    ReviewID INT AUTO_INCREMENT PRIMARY KEY,
    ProductID INT NOT NULL,
    UserID INT NOT NULL,
    Rating TINYINT NOT NULL, -- 1–5
    Comment TEXT NULL,
    Status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT NULL,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    CONSTRAINT uniq_product_user_review UNIQUE (ProductID, UserID),
    INDEX (ProductID),
    INDEX (Status)
);

CREATE TABLE Wishlist (
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserID, ProductID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID) ON DELETE CASCADE
);

CREATE TABLE Cart (
    CartID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT DEFAULT 1,
    AddedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID) ON DELETE CASCADE,
    INDEX (UserID)
);

CREATE TABLE Voucher (
    VoucherID INT AUTO_INCREMENT PRIMARY KEY,
    Code VARCHAR(50) NOT NULL,
    Scope ENUM('system','shop') NOT NULL DEFAULT 'shop',
    ShopID INT DEFAULT NULL,
    DiscountType ENUM('percent','fixed') NOT NULL,
    DiscountValue DECIMAL(10,2) NOT NULL,
    MaxDiscountAmount DECIMAL(10,2) DEFAULT NULL,
    MinOrderAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    StartDate DATETIME NOT NULL,
    EndDate DATETIME NOT NULL,
    UsageLimitTotal INT DEFAULT NULL,
    UsageLimitPerUser INT DEFAULT NULL,
    UsedCount INT NOT NULL DEFAULT 0,
    Status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    CreatedByUserID INT DEFAULT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT NULL,
    Note VARCHAR(255) DEFAULT NULL,
    
    CONSTRAINT uniq_voucher_code_scope UNIQUE (Code, Scope, ShopID),
    FOREIGN KEY (ShopID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CreatedByUserID) REFERENCES Users(UserID) ON DELETE SET NULL,
    INDEX (ShopID),
    INDEX (StartDate, EndDate)
);

CREATE TABLE Orders (
    OrderID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    OrderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- [Người nhận]
    ReceiverName VARCHAR(100) NULL,
    ReceiverPhone VARCHAR(20) NULL,
    ReceiverAddress VARCHAR(255) NULL,
    
    -- [Tài chính đơn hàng]
    SubTotal DECIMAL(10,2) DEFAULT NULL,
    VoucherDiscount DECIMAL(10,2) NOT NULL DEFAULT 0,
    PlatformVoucherAmount DECIMAL(10,2) DEFAULT 0.00, -- MERGED (Sàn tài trợ)
    VoucherCodeSnapshot VARCHAR(50) NULL,
    TotalAmount DECIMAL(12,2),
    
    -- [Trạng thái]
    Status VARCHAR(50) DEFAULT 'Pending',
    PaymentMethod ENUM('vnpay','vietqr') NULL,
    PaymentStatus ENUM('PENDING','PAID','FAILED','CANCELLED') DEFAULT 'PENDING',
    
    -- [Vận chuyển]
    ShippingCarrier VARCHAR(100) DEFAULT NULL,
    ShippingCode VARCHAR(50) DEFAULT NULL,
    ShippingFeeEstimate DECIMAL(10,2) DEFAULT 0,
    DeliveryImage VARCHAR(255) DEFAULT NULL,
    EstimatedArrival DATETIME DEFAULT NULL,
    CarrierContact VARCHAR(50) DEFAULT NULL,
    ShippingNote TEXT DEFAULT NULL,
    
    -- [Tài chính sàn]
    PlatformFee DECIMAL(10,2) DEFAULT 0,
    NetEarnings DECIMAL(10,2) DEFAULT 0,
    CompletedAt DATETIME DEFAULT NULL,
    
    -- [Khiếu nại]
    DisputeReason TEXT DEFAULT NULL,
    DisputeEvidence TEXT DEFAULT NULL,

    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (UserID)
);

CREATE TABLE OrderDetail (
    OrderDetailID INT AUTO_INCREMENT PRIMARY KEY,
    OrderID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Product(ProductID),
    INDEX (OrderID)
);

CREATE TABLE OrderVoucher (
    OrderVoucherID INT AUTO_INCREMENT PRIMARY KEY,
    OrderID INT NOT NULL,
    VoucherID INT NOT NULL,
    CodeSnapshot VARCHAR(50) NOT NULL,
    DiscountAmount DECIMAL(10,2) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (VoucherID) REFERENCES Voucher(VoucherID) ON DELETE RESTRICT,
    INDEX (OrderID)
);

CREATE TABLE OrderStatusHistory (
    HistoryID INT AUTO_INCREMENT PRIMARY KEY,
    OrderID INT NOT NULL,
    OldStatus VARCHAR(50) NULL,
    NewStatus VARCHAR(50) NOT NULL,
    ChangedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Note VARCHAR(255) DEFAULT NULL,
    ChangedByUserID INT DEFAULT NULL,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ChangedByUserID) REFERENCES Users(UserID) ON DELETE SET NULL,
    INDEX (OrderID)
);

CREATE TABLE Payment (
    PaymentID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    OrderID INT NOT NULL,
    PaymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    PaidAt DATETIME NULL,
    PaymentMethod VARCHAR(50) DEFAULT NULL,
    Provider ENUM('vnpay','vietqr') DEFAULT 'vnpay',
    PaymentStatus VARCHAR(50) DEFAULT 'Pending',
    Amount DECIMAL(10,2) DEFAULT NULL,
    GatewayTxnId VARCHAR(100) DEFAULT NULL,
    Reference VARCHAR(255) DEFAULT NULL,
    Bank VARCHAR(100) DEFAULT NULL,
    PaymentLink VARCHAR(255) DEFAULT NULL,
    SignatureVerified TINYINT(1) DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    INDEX (GatewayTxnId),
    INDEX (Reference)
);

CREATE TABLE ShopTransactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    OrderID INT DEFAULT NULL,
    Type ENUM('income', 'fee', 'withdraw', 'refund') NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    Description VARCHAR(255),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE SET NULL,
    INDEX (UserID),
    INDEX (Type)
);

CREATE TABLE CustomerTransactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    OrderID INT DEFAULT NULL,
    Type ENUM('payment', 'refund', 'deposit') NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    Description VARCHAR(255),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE SET NULL,
    INDEX (UserID)
);

-- =======================================================================================
-- 3. QUẢN LÝ HỒ CÁ & KOI (CORE FEATURE)
-- =======================================================================================

CREATE TABLE Pond (
    PondID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    PondName VARCHAR(100) NOT NULL,
    Volume DECIMAL(10,2) NOT NULL,
    Depth DECIMAL(5,2),
    Type VARCHAR(50),
    DrainCount INT DEFAULT NULL,
    SkimmerCount INT DEFAULT NULL,
    PumpingCapacity DECIMAL(10,2) DEFAULT NULL,
    CreatedAt DATE DEFAULT (CURRENT_DATE),
    Notes TEXT,
    ImageURL VARCHAR(255),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (UserID)
);

CREATE TABLE KoiVarieties (
    VarietyID INT AUTO_INCREMENT PRIMARY KEY,
    VarietyName VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT,
    Origin VARCHAR(100) DEFAULT 'Japan'
);

CREATE TABLE KoiFish (
    FishID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    Age INT,
    Length DECIMAL(5,2),
    Weight DECIMAL(5,2),
    Sex ENUM('Male', 'Female', 'Unknown') DEFAULT 'Unknown',
    Variety VARCHAR(100),
    Color VARCHAR(100),
    HealthStatus VARCHAR(100),
    PondSince DATE DEFAULT CURRENT_DATE,
    Breeder VARCHAR(100),
    PurchasePrice DECIMAL(11,2) DEFAULT NULL,
    Remarks TEXT,
    GrowthHistory TEXT, -- Json/Text cũ
    ImageURL VARCHAR(255),
    IsFeatured TINYINT(1) DEFAULT 0, -- MERGED
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE,
    INDEX (PondID)
);

CREATE TABLE KoiGrowthHistory (
    GrowthID INT AUTO_INCREMENT PRIMARY KEY,
    FishID INT NOT NULL,
    MeasuredAt DATE DEFAULT (CURRENT_DATE),
    Length DECIMAL(5,2),
    Weight DECIMAL(5,2),
    Note VARCHAR(255),
    FOREIGN KEY (FishID) REFERENCES KoiFish(FishID) ON DELETE CASCADE,
    INDEX (FishID),
    INDEX (MeasuredAt)
);

CREATE TABLE FeedingSchedule (
    FeedID INT AUTO_INCREMENT PRIMARY KEY,
    FishID INT NOT NULL,
    FeedTime DATETIME NOT NULL,
    FoodType VARCHAR(100),
    Amount DECIMAL(5,2),
    FOREIGN KEY (FishID) REFERENCES KoiFish(FishID) ON DELETE CASCADE,
    INDEX (FishID)
);

CREATE TABLE WaterParameter (
    ParameterID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    RecordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    pH DECIMAL(3,1),
    Temperature DECIMAL(4,1),
    Ammonia DECIMAL(4,2),
    Nitrite DECIMAL(4,2),
    Nitrate DECIMAL(4,2),
    Phosphate DECIMAL(4,2),
    Hardness DECIMAL(5,2),
    Salt DECIMAL(5,2),
    Oxygen DECIMAL(5,2),
    CO2 DECIMAL(5,2),
    CH DECIMAL(5,2),
    GH DECIMAL(5,2),
    Note TEXT,
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE,
    INDEX (PondID),
    INDEX (PondID, RecordedAt), -- Index tối ưu truy vấn lịch sử
    INDEX idx_water_val_lookup (PondID, RecordedAt) -- Index hỗ trợ truy vấn Latest Known Value
);

CREATE TABLE PondEnvironmentLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    RecordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    Temperature DECIMAL(4,1) NULL,
    Oxygen DECIMAL(5,2) NULL,
    Ammonia DECIMAL(4,2) NULL,
    Nitrite DECIMAL(4,2) NULL,
    pH DECIMAL(3,1) NULL,
    Salt DECIMAL(5,2) NULL,
    WeatherData JSON NULL,
    Note TEXT NULL,
    INDEX (PondID, RecordedAt),
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE
);

-- =======================================================================================
-- 4. MODULE TÍNH MUỐI (SALT CALCULATOR & PLANNER)
-- =======================================================================================
CREATE TABLE SaltCalculation (
    SaltID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    DateCalculated DATETIME DEFAULT CURRENT_TIMESTAMP,
    SaltRequired DECIMAL(8,2),
    Note TEXT,
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE
);

CREATE TABLE SaltPlan (
    PlanID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    Mode ENUM('main','hospital','dip') NOT NULL DEFAULT 'main',
    Purpose ENUM('stabilize','nitrite','treat','prophylaxis','dip') NOT NULL DEFAULT 'stabilize',
    HasFry TINYINT(1) NOT NULL DEFAULT 0,
    HasPlants TINYINT(1) NOT NULL DEFAULT 0,
    VolumeLiters DECIMAL(10,2) NOT NULL,
    
    -- Snapshot thông tin cá (Fix logic)
    FishCountSnapshot INT DEFAULT 0 COMMENT 'Số lượng cá tại thời điểm lập kế hoạch',
    AvgWeightSnapshot DECIMAL(6,2) DEFAULT 0 COMMENT 'Trọng lượng cá TB (kg) lúc lập plan',
    
    StartPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    TargetPercent DECIMAL(5,2) NOT NULL,
    SourceWaterSalinity DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Độ mặn của nước nguồn thay vào', -- MERGED
    
    StepPercent DECIMAL(5,2) NOT NULL DEFAULT 0.10,
    IntervalHours INT NOT NULL DEFAULT 12,
    Status ENUM('active','done','cancelled') NOT NULL DEFAULT 'active',
    StartAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    EndAt DATETIME DEFAULT NULL,
    Note TEXT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    WeatherSnapshot JSON NULL COMMENT 'Dữ liệu thời tiết snapshot khi tạo kế hoạch', -- MERGED
    EnvironmentSnapshot JSON NULL COMMENT 'Dữ liệu môi trường snapshot khi tạo kế hoạch', -- MERGED
    ReduceByWaterChange TINYINT(1) DEFAULT 0 COMMENT '1 nếu giảm độ mặn bằng cách thay nước', -- MERGED
    
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE,
    INDEX (PondID),
    INDEX (Status),
    INDEX idx_saltplan_pond_status (PondID, Status),
    INDEX idx_saltplan_created (CreatedAt)
);

CREATE TABLE SaltDoseStep (
    StepID INT AUTO_INCREMENT PRIMARY KEY,
    PlanID INT NOT NULL,
    StepIndex INT NOT NULL,
    ScheduledAt DATETIME NOT NULL,
    DeltaPercent DECIMAL(5,2) NOT NULL,
    ExpectedSaltGrams DECIMAL(10,2) NOT NULL,
    ExpectedPercentAfter DECIMAL(5,2) DEFAULT NULL,
    ExecutedAt DATETIME DEFAULT NULL,
    AddedSaltGrams DECIMAL(10,2) DEFAULT NULL,
    WaterChangeLiters DECIMAL(10,2) DEFAULT NULL,
    MeasuredPercent DECIMAL(5,2) DEFAULT NULL,
    
    SourceSalinity DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Độ mặn nước nguồn cho bước thay nước', -- MERGED
    Note TEXT DEFAULT NULL COMMENT 'Ghi chú khi thực hiện bước này', -- MERGED
    
    ParameterID INT DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PlanID) REFERENCES SaltPlan(PlanID) ON DELETE CASCADE,
    FOREIGN KEY (ParameterID) REFERENCES WaterParameter(ParameterID) ON DELETE SET NULL,
    INDEX (PlanID),
    INDEX (ScheduledAt),
    INDEX idx_saltdosestep_plan (PlanID, StepIndex),
    INDEX idx_saltdosestep_executed (ExecutedAt)
);

CREATE TABLE SaltSafetyAudit (
    AuditID INT AUTO_INCREMENT PRIMARY KEY,
    PlanID INT NOT NULL,
    UserID INT NOT NULL,
    ActionType ENUM('create', 'update', 'complete', 'cancel', 'warning_override') NOT NULL,
    SafetyLevel ENUM('safe', 'warning', 'danger') DEFAULT 'safe',
    ValidationWarnings TEXT NULL,
    OverrideReason TEXT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (PlanID),
    INDEX (UserID),
    INDEX (SafetyLevel),
    FOREIGN KEY (PlanID) REFERENCES SaltPlan(PlanID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);


-- =======================================================================================
-- 5. MODULE CHO ĂN (FEEDING PLANNER & AI)
-- =======================================================================================

CREATE TABLE FeedingPlan (
    PlanID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    PlanningDate DATE DEFAULT (CURRENT_DATE), -- Hỗ trợ lỗ hổng Time Travel
    Objective ENUM('growth','maintenance','color','recovery','custom') DEFAULT 'growth',
    TemplateID INT DEFAULT NULL, -- Hỗ trợ Copy Plan
    FeedRatePct DECIMAL(5,2) NOT NULL,
    DailyFeedGrams DECIMAL(10,2) NOT NULL,
    FishCount INT DEFAULT NULL,
    AvgWeight DECIMAL(6,3) DEFAULT NULL,
    ProteinPct DECIMAL(5,2) DEFAULT NULL,
    WaterTemp DECIMAL(4,1) DEFAULT NULL,
    WeatherCondition VARCHAR(50) DEFAULT NULL, -- Hỗ trợ yếu tố môi trường
    FeedType ENUM('floating','sinking','mixed') DEFAULT 'floating',
    Source ENUM('ai','manual') DEFAULT 'ai',
    Status ENUM('active','done','cancelled') DEFAULT 'active',
    Note TEXT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsDeleted TINYINT(1) DEFAULT 0 COMMENT '0: Active, 1: Deleted by user', -- MERGED
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE,
    INDEX (PondID),
    INDEX idx_feedingplan_deleted (IsDeleted)
);

CREATE TABLE FeedingEvent (
    EventID INT AUTO_INCREMENT PRIMARY KEY,
    PlanID INT NOT NULL,
    FeedIndex INT NOT NULL,
    ScheduledAt DATETIME NOT NULL,
    AmountExpected DECIMAL(10,2) NOT NULL,
    AmountGiven DECIMAL(10,2) DEFAULT NULL,
    ExecutedAt DATETIME DEFAULT NULL,
    Observation TEXT NULL,
    LeftoverFlag TINYINT(1) DEFAULT 0, -- Cờ báo thừa thức ăn
    WaterTempSnapshot DECIMAL(4,1) DEFAULT NULL,
    MeasuredWeight DECIMAL(6,3) DEFAULT NULL,
    AutoFeedFlag TINYINT(1) DEFAULT 0,
    AIAdjusted TINYINT(1) DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PlanID) REFERENCES FeedingPlan(PlanID) ON DELETE CASCADE,
    INDEX (PlanID),
    INDEX (ScheduledAt)
);

CREATE TABLE FeedingInsight (
    InsightID INT AUTO_INCREMENT PRIMARY KEY,
    PondID INT NOT NULL,
    FromDate DATE NOT NULL,
    ToDate DATE NOT NULL,
    Days INT NOT NULL,
    Samples INT NOT NULL,
    AvgExpected DECIMAL(10,2) NOT NULL,
    AvgGiven DECIMAL(10,2) NOT NULL,
    AvgRatio DECIMAL(5,2) NOT NULL,
    OverfeedDays INT NOT NULL,
    UnderfeedDays INT NOT NULL,
    StableDays INT NOT NULL,
    GrowthPct DECIMAL(6,2) DEFAULT NULL,
    SuggestedDeltaPct DECIMAL(5,2) NOT NULL,
    WarningLevel ENUM('ok','info','warning','danger') DEFAULT 'ok',
    WarningCode VARCHAR(50) DEFAULT NULL,
    AdviceText TEXT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PondID) REFERENCES Pond(PondID) ON DELETE CASCADE,
    INDEX (PondID)
);


-- =======================================================================================
-- 6. CỘNG ĐỒNG (SOCIAL NETWORK MINI)
-- =======================================================================================

CREATE TABLE CommunityPost (
    PostID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Content TEXT NOT NULL,
    Privacy ENUM('public','followers','private') NOT NULL DEFAULT 'public',
    Status ENUM('active','hidden','deleted') NOT NULL DEFAULT 'active',
    OriginalPostID INT DEFAULT NULL, 
    CommentCount INT NOT NULL DEFAULT 0,
    ReactionCount INT NOT NULL DEFAULT 0,
    ShareCount INT NOT NULL DEFAULT 0,
    
    -- Các cột quản trị và trạng thái (MERGED từ ALTER)
    IsReported TINYINT(1) DEFAULT 0,
    ReportCount INT DEFAULT 0,
    IsHiddenByAdmin TINYINT(1) DEFAULT 0,
    HiddenByAdminID INT DEFAULT NULL,
    HiddenReason TEXT DEFAULT NULL,
    HiddenAt DATETIME DEFAULT NULL, 
    IsLocked TINYINT(1) DEFAULT 0,
    LockedByAdminID INT DEFAULT NULL,
    LockReason TEXT DEFAULT NULL,
    LockedAt DATETIME DEFAULT NULL,
    IsPinned TINYINT(1) DEFAULT 0,
    PinnedByAdminID INT DEFAULT NULL,
    PinnedAt DATETIME DEFAULT NULL,
    UnpinnedAt DATETIME DEFAULT NULL,
    PinReason TEXT DEFAULT NULL,
    
    is_original_deleted TINYINT(1) DEFAULT 0 COMMENT 'Đánh dấu bài gốc đã bị xóa (chỉ áp dụng cho bài chia sẻ)',
    original_content TEXT NULL,
    original_created_at DATETIME NULL,
    original_user_id INT NULL,
    original_username VARCHAR(100) NULL,
    original_fullname VARCHAR(255) NULL,
    original_avatar VARCHAR(500) NULL,
    original_role VARCHAR(50) NULL,

    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT NULL,
    
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (OriginalPostID) REFERENCES CommunityPost(PostID) ON DELETE SET NULL,
    FOREIGN KEY (HiddenByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL, -- MERGED
    FOREIGN KEY (LockedByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL, -- MERGED
    FOREIGN KEY (PinnedByAdminID) REFERENCES Users(UserID) ON DELETE SET NULL, -- MERGED
    
    INDEX (UserID, CreatedAt),
    INDEX (OriginalPostID),
    INDEX (Status),
    INDEX (IsReported), -- MERGED
    INDEX (IsHiddenByAdmin), -- MERGED
    INDEX (IsLocked), -- MERGED
    INDEX idx_pinned (IsPinned, PinnedAt), -- MERGED
    INDEX idx_pinned_by_admin (PinnedByAdminID) -- MERGED
);

CREATE TABLE CommunityPostMedia (
    MediaID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    MediaType ENUM('image','video') NOT NULL,
    FilePath VARCHAR(255) NOT NULL,
    ThumbnailPath VARCHAR(255) DEFAULT NULL,
    SortOrder INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE CASCADE,
    INDEX (PostID),
    INDEX (MediaType)
);

CREATE TABLE CommunityReaction (
    ReactionID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    UserID INT NOT NULL,
    Type ENUM('like','love','care','haha','wow','sad','angry') NOT NULL DEFAULT 'like',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE KEY uniq_post_user (PostID, UserID),
    INDEX (PostID),
    INDEX (UserID)
);

CREATE TABLE CommunityComment (
    CommentID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    UserID INT NOT NULL,
    ParentCommentID INT DEFAULT NULL, 
    Content TEXT NOT NULL,
    ImageURL VARCHAR(500) DEFAULT NULL, -- MERGED
    HasImage TINYINT(1) DEFAULT 0, -- MERGED
    Status ENUM('active','hidden','deleted') NOT NULL DEFAULT 'active',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ParentCommentID) REFERENCES CommunityComment(CommentID) ON DELETE CASCADE,
    INDEX (PostID),
    INDEX (UserID),
    INDEX (ParentCommentID)
);

CREATE TABLE CommunityCommentReaction (
    ReactionID INT AUTO_INCREMENT PRIMARY KEY,
    CommentID INT NOT NULL,
    UserID INT NOT NULL,
    Type ENUM('like','love','care','haha','wow','sad','angry') NOT NULL DEFAULT 'like',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE KEY uniq_comment_user (CommentID, UserID),
    INDEX (CommentID),
    INDEX (UserID)
);

CREATE TABLE CommunityFollow (
    FollowerID INT NOT NULL,
    FollowingID INT NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (FollowerID, FollowingID),
    FOREIGN KEY (FollowerID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (FollowingID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE CommunityNotification (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL, 
    ActorID INT DEFAULT NULL, 
    Type ENUM(
        'post_reaction',
        'comment', 
        'comment_reaction', 
        'share', 
        'follow', 
        'comment_reported', 
        'comment_deleted', 
        'user_banned',
        'post_reported', 
        'user_warned', 
        'ban_appeal',
        'post_pinned', 
        'post_unpinned' 
    ) NOT NULL, -- MERGED ENUM VALUES
    PostID INT DEFAULT NULL,
    CommentID INT DEFAULT NULL,
    Message TEXT DEFAULT NULL,
    IsRead TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ActorID) REFERENCES Users(UserID) ON DELETE SET NULL,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE CASCADE,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE CASCADE,
    INDEX (UserID, IsRead),
    INDEX (PostID),
    INDEX (CommentID),
    INDEX (Type)
);

CREATE TABLE CommunityHiddenComment (
    HiddenID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL, 
    CommentID INT NOT NULL, 
    HiddenAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_comment (UserID, CommentID),
    INDEX (UserID),
    INDEX (CommentID)
);

CREATE TABLE CommunityReport (
    ReportID INT AUTO_INCREMENT PRIMARY KEY,
    CommentID INT NOT NULL,
    ReporterID INT NOT NULL,
    Reason TEXT NOT NULL,
    ReportType ENUM('spam', 'abuse', 'inappropriate', 'other') DEFAULT 'other',
    Status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    AdminNotes TEXT DEFAULT NULL,
    ReviewedBy INT DEFAULT NULL,
    ReviewedAt DATETIME DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE CASCADE,
    FOREIGN KEY (ReporterID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ReviewedBy) REFERENCES Users(UserID) ON DELETE SET NULL,
    INDEX (Status),
    INDEX (CommentID),
    INDEX (ReporterID)
);

CREATE TABLE CommunityPostReport (
    ReportID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    ReporterID INT NOT NULL,
    Reason TEXT NOT NULL,
    ReportType ENUM('spam', 'abuse', 'inappropriate', 'copyright', 'other') DEFAULT 'other',
    Status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    AdminNotes TEXT DEFAULT NULL,
    ReviewedBy INT DEFAULT NULL,
    ReviewedAt DATETIME DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE CASCADE,
    FOREIGN KEY (ReporterID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ReviewedBy) REFERENCES Users(UserID) ON DELETE SET NULL,
    UNIQUE KEY uniq_user_post_report (ReporterID, PostID),
    INDEX (Status),
    INDEX (PostID),
    INDEX (ReporterID)
);

CREATE TABLE UserBan (
    BanID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    BannedBy INT NOT NULL,
    Reason TEXT NOT NULL,
    BanType ENUM('comment_only', 'post_only', 'full_ban') DEFAULT 'comment_only',
    BanDuration INT NOT NULL DEFAULT 7 COMMENT 'Số ngày bị cấm (0 = vĩnh viễn)',
    Message TEXT DEFAULT NULL,
    AppealReason TEXT DEFAULT NULL,
    AppealStatus ENUM('none', 'pending', 'reviewed', 'approved', 'rejected') DEFAULT 'none',
    AppealResponse TEXT DEFAULT NULL,
    AppealSubmittedAt DATETIME DEFAULT NULL,
    AppealReviewedAt DATETIME DEFAULT NULL,
    AppealReviewedBy INT DEFAULT NULL,
    HasAppeal TINYINT(1) DEFAULT 0,
    Scope ENUM('community', 'chat', 'all') DEFAULT 'community',
    IsTemporary TINYINT(1) DEFAULT 1,
    IsActive TINYINT(1) DEFAULT 1,
    PostID INT DEFAULT NULL,
    CommentID INT DEFAULT NULL,
    BannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt DATETIME DEFAULT NULL,
    UnbanAt DATETIME GENERATED ALWAYS AS (
        CASE 
            WHEN BanDuration = 0 THEN NULL
            ELSE DATE_ADD(BannedAt, INTERVAL BanDuration DAY)
        END
    ) STORED,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (BannedBy) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (AppealReviewedBy) REFERENCES Users(UserID) ON DELETE SET NULL,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE SET NULL,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE SET NULL,
    INDEX (UserID),
    INDEX (IsActive),
    INDEX (BanType),
    INDEX (Scope),
    INDEX idx_appeal_status (AppealStatus),
    INDEX idx_has_appeal (HasAppeal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE UserWarning (
    WarningID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AdminID INT NOT NULL,
    WarningType ENUM('post_violation', 'comment_violation', 'spam', 'inappropriate_content', 'harassment', 'other') NOT NULL,
    PostID INT DEFAULT NULL,
    CommentID INT DEFAULT NULL,
    Reason TEXT NOT NULL,
    Severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    IsAcknowledged TINYINT(1) DEFAULT 0,
    AcknowledgedAt DATETIME DEFAULT NULL,
    ExpiresAt DATETIME DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (AdminID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE SET NULL,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE SET NULL,
    INDEX (UserID),
    INDEX (IsAcknowledged),
    INDEX (ExpiresAt)
);

CREATE TABLE AdminActionLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    AdminID INT NOT NULL,
    ActionType ENUM(
        'delete_comment', 
        'ban_user', 
        'dismiss_report', 
        'delete_and_ban',
        'report_created',
        'delete_post',
        'hide_post',
        'lock_post',
        'unlock_post',
        'warn_user',
        'delete_post_report',
        'dismiss_post_report',
        'ban_appeal_created', 
        'ban_appeal_reviewed',
        'pin_post', 
        'unpin_post' 
    ) NOT NULL, -- MERGED ENUM VALUES
    TargetUserID INT DEFAULT NULL,
    CommentID INT DEFAULT NULL,
    PostID INT DEFAULT NULL, -- MERGED
    ReportID INT DEFAULT NULL,
    Details TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AdminID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (TargetUserID) REFERENCES Users(UserID) ON DELETE SET NULL,
    FOREIGN KEY (CommentID) REFERENCES CommunityComment(CommentID) ON DELETE SET NULL,
    FOREIGN KEY (PostID) REFERENCES CommunityPost(PostID) ON DELETE SET NULL, -- MERGED
    FOREIGN KEY (ReportID) REFERENCES CommunityReport(ReportID) ON DELETE SET NULL,
    INDEX (AdminID),
    INDEX (TargetUserID),
    INDEX (CreatedAt)
);

-- =======================================================================================
-- 7. CHAT & HỘI THOẠI (SHOP <-> KHÁCH)
-- =======================================================================================

CREATE TABLE Conversations (
    ConversationID INT AUTO_INCREMENT PRIMARY KEY,
    ShopID INT NOT NULL, 
    CustomerID INT NOT NULL, 
    LastMessage TEXT NULL, 
    LastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UnreadCountShop INT DEFAULT 0, 
    UnreadCountCus INT DEFAULT 0, 
    
    UNIQUE KEY uniq_conversation (ShopID, CustomerID),
    FOREIGN KEY (ShopID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (CustomerID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE Messages (
    MessageID INT AUTO_INCREMENT PRIMARY KEY,
    ConversationID INT NOT NULL,
    SenderID INT NOT NULL, 
    Content TEXT NOT NULL,
    MsgType ENUM('text', 'image', 'product_link') DEFAULT 'text',
    AttachmentURL VARCHAR(255) NULL, 
    IsRead TINYINT(1) DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    HasAttachment TINYINT(1) DEFAULT 0, -- MERGED
    IsRecalled TINYINT(1) DEFAULT 0, -- MERGED
    
    FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID) ON DELETE CASCADE,
    FOREIGN KEY (SenderID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX (ConversationID, CreatedAt)
);

CREATE TABLE Attachments (
    AttachmentID INT AUTO_INCREMENT PRIMARY KEY,
    MessageID INT NOT NULL,
    FileName VARCHAR(255) NOT NULL,
    FilePath VARCHAR(255) NOT NULL, 
    FileType VARCHAR(50) NOT NULL, 
    FileSize INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MessageID) REFERENCES Messages(MessageID) ON DELETE CASCADE
);

-- =======================================================================================
-- 8. CÁC TÍNH NĂNG KHÁC (TIN TỨC, AI)
-- =======================================================================================

CREATE TABLE News (
    NewsID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Content TEXT,
    Author VARCHAR(100),
    PublishedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Category VARCHAR(100),
    ImageURL VARCHAR(255)
);

CREATE TABLE AI_Analysis (
    AnalysisID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    FishID INT,
    AnalysisType VARCHAR(50),
    Result TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (FishID) REFERENCES KoiFish(FishID) ON DELETE CASCADE
);

CREATE TABLE ChatHistory (
    ChatID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    Message TEXT,
    Response TEXT,
    SentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- =======================================================================================
-- 9. DỮ LIỆU MẪU (INITIAL DATA)
-- =======================================================================================
SET FOREIGN_KEY_CHECKS = 1; -- Bật lại kiểm tra FK

-- Tạo mật khẩu băm mẫu (Admin123456, Shop123456, User123456)
-- SỬ DỤNG SHA2(MD5('...'), 256) CHO MỤC ĐÍCH DEMO.
SET @admin_pass = SHA2(MD5('Admin123456'), 256);
SET @shop_pass = SHA2(MD5('Shop123456'), 256);
SET @user_pass = SHA2(MD5('User123456'), 256);

-- 1. Dữ liệu Users (Admin, Shop, Customer)
INSERT INTO Users (UserID, FullName, Email, PasswordHash, Username, Phone, Address, Role, EmailVerified) VALUES
(1, 'Admin Hệ Thống', 'admin@koicare.com', @admin_pass, 'admin', '0901234567', 'Hà Nội, Việt Nam', 'Admin', 1),
(2, 'Shop Thiết Bị Koi', 'shop1@koicare.com', @shop_pass, 'shop1', '0912345678', 'TP.HCM, Việt Nam', 'Shop', 1),
(3, 'Khách hàng thân thiết', 'user1@koicare.com', @user_pass, 'user1', '0987654321', 'Đà Nẵng, Việt Nam', 'Customer', 1);

-- 2. Dữ liệu Category
INSERT INTO Category (CategoryName) VALUES
('Thức ăn cho cá Koi'),
('Thuốc & hóa chất xử lý nước'),
('Thiết bị lọc nước'),
('Phụ kiện hồ cá'),
('Trang trí hồ cá'),
('Dụng cụ bảo trì hồ'),
('Cá Koi giống'),
('Thức ăn bổ sung & vitamin'),
('Thiết bị điều khiển tự động'),
('Sản phẩm vệ sinh hồ cá'),
('Phụ kiện điện & điện tử'),
('Dụng cụ vận chuyển & nuôi cách ly'),
('Khác');

-- 3. Dữ liệu KoiVarieties
INSERT IGNORE INTO KoiVarieties (VarietyID, VarietyName, Description) VALUES 
(1, 'Kohaku', 'Nền trắng khoang đỏ'),
(2, 'Showa', 'Nền đen có khoang đỏ và trắng'),
(3, 'Sanke', 'Nền trắng khoang đỏ và đốm đen'),
(4, 'Tancho', 'Trắng toàn thân, có điểm đỏ ở đầu'),
(5, 'Chagoi', 'Màu trà, thân thiện, dẫn đàn'),
(6, 'Benigoi', 'Đỏ toàn thân'),
(7, 'Shiro Utsuri', 'Nền đen khoang trắng'),
(8, 'Hi Utsuri', 'Nền đen khoang đỏ');

-- 4. Dữ liệu Pond (cho user1)
INSERT INTO Pond (UserID, PondName, Volume, Depth, Type, CreatedAt) VALUES
(3, 'Hồ chính User1', 15000.00, 1.80, 'OutDoor', '2024-01-15');

-- 5. Dữ liệu KoiFish (cho Hồ chính User1)
SET @pond_id = (SELECT PondID FROM Pond WHERE UserID = 3 LIMIT 1);
INSERT INTO KoiFish (PondID, Name, Age, Length, Weight, Sex, Variety, HealthStatus, PurchasePrice) VALUES
(@pond_id, 'Shogun', 3, 55.0, 2.5, 'Male', 'Kohaku', 'Healthy', 15000000.00),
(@pond_id, 'Lady In Red', 2, 40.5, 1.8, 'Female', 'Benigoi', 'Healthy', 8000000.00),
(@pond_id, 'Tancho Maru', 4, 62.0, 3.1, 'Unknown', 'Tancho', 'Healthy', 22000000.00);

-- 6. Dữ liệu Product (từ shop1)
SET @food_cat = (SELECT CategoryID FROM Category WHERE CategoryName = 'Thức ăn cho cá Koi');
SET @filter_cat = (SELECT CategoryID FROM Category WHERE CategoryName = 'Thiết bị lọc nước');
INSERT INTO Product (ShopID, CategoryID, Name, Description, Price, Stock, ImageURL) VALUES
(2, @food_cat, 'Thức Ăn Tăng Trưởng JPD Pro', 'Thức ăn chuyên biệt giúp cá Koi phát triển nhanh, hàm lượng Protein cao.', 550000.00, 50, 'https://placehold.co/400x300/1e40af/ffffff?text=KoiFood'),
(2, @filter_cat, 'Bơm Chìm Lifetech 10000L/H', 'Bơm tiết kiệm điện, công suất lớn, phù hợp cho hồ 10-15m3.', 1800000.00, 10, 'https://placehold.co/400x300/059669/ffffff?text=WaterPump');

-- 7. Dữ liệu Orders (user1 mua từ shop1)
SET @product_id_1 = (SELECT ProductID FROM Product WHERE Name LIKE '%JPD Pro%' LIMIT 1);
SET @product_id_2 = (SELECT ProductID FROM Product WHERE Name LIKE '%Lifetech%' LIMIT 1);
SET @total_amount = (550000.00 * 2) + (1800000.00 * 1); -- 1100000 + 1800000 = 2900000

INSERT INTO Orders (UserID, ReceiverName, ReceiverPhone, ReceiverAddress, SubTotal, TotalAmount, Status, PaymentStatus) VALUES
(3, 'Khách hàng thân thiết', '0987654321', 'Đà Nẵng, Việt Nam', @total_amount, @total_amount, 'Processing', 'PENDING');

SET @order_id = LAST_INSERT_ID();
INSERT INTO OrderDetail (OrderID, ProductID, Quantity, UnitPrice) VALUES
(@order_id, @product_id_1, 2, 550000.00),
(@order_id, @product_id_2, 1, 1800000.00);


-- =======================================================================================
-- 10. TRIGGERS & PROCEDURES (QUAN TRỌNG) - KHÔNG BỊ GỘP
-- =======================================================================================

-- 1. TRIGGER: Cập nhật kích thước KoiFish sau khi INSERT vào KoiGrowthHistory
DROP TRIGGER IF EXISTS trg_UpdateKoiSize_AfterGrowthInsert;
DELIMITER $$
CREATE TRIGGER trg_UpdateKoiSize_AfterGrowthInsert
AFTER INSERT ON KoiGrowthHistory
FOR EACH ROW
BEGIN
    UPDATE KoiFish 
    SET Length = NEW.Length, 
        Weight = NEW.Weight 
    WHERE FishID = NEW.FishID;
END$$
DELIMITER ;

-- 2. TRIGGER: Cập nhật thông tin LastMessage trong Conversations khi có tin nhắn mới
DROP TRIGGER IF EXISTS trg_AfterMessageInsert;
DELIMITER $$
CREATE TRIGGER trg_AfterMessageInsert
AFTER INSERT ON Messages
FOR EACH ROW
BEGIN
    -- Cập nhật tin nhắn cuối cùng và thời gian, và đếm tin chưa đọc
    UPDATE Conversations 
    SET LastMessage = NEW.Content,
        LastMessageAt = NEW.CreatedAt,
        -- Nếu người gửi là Shop (SenderID = ShopID) -> Tăng biến đếm chưa đọc của Khách (CustomerID)
        UnreadCountCus = CASE WHEN NEW.SenderID = ShopID THEN UnreadCountCus + 1 ELSE UnreadCountCus END,
        -- Nếu người gửi là Khách (SenderID = CustomerID) -> Tăng biến đếm chưa đọc của Shop (ShopID)
        UnreadCountShop = CASE WHEN NEW.SenderID = CustomerID THEN UnreadCountShop + 1 ELSE UnreadCountShop END
    WHERE ConversationID = NEW.ConversationID;
END$$
DELIMITER ;

-- 3. TRIGGER: Cập nhật WaterParameter (Salt) sau khi hoàn thành bước SaltDoseStep
DROP TRIGGER IF EXISTS after_salt_step_update$$
DELIMITER $$
CREATE TRIGGER after_salt_step_update
AFTER UPDATE ON SaltDoseStep
FOR EACH ROW
BEGIN
    DECLARE v_PondID INT DEFAULT NULL;
    DECLARE v_PlanID INT DEFAULT NULL;
    DECLARE v_StepIndex INT DEFAULT NULL;
    
    -- Chỉ kích hoạt khi bước được đánh dấu hoàn thành và có kết quả đo
    IF NEW.ExecutedAt IS NOT NULL AND NEW.MeasuredPercent IS NOT NULL AND OLD.ExecutedAt IS NULL THEN
        
        -- Lấy thông tin từ bảng SaltPlan
        SELECT sp.PondID, sp.PlanID INTO v_PondID, v_PlanID
        FROM SaltPlan sp 
        WHERE sp.PlanID = NEW.PlanID
        LIMIT 1;
        
        SET v_StepIndex = NEW.StepIndex;
        
        -- Kiểm tra xem đã có bản ghi WaterParameter trong 6 giờ gần đây chưa
        SET @recent_id = NULL;
        
        SELECT ParameterID INTO @recent_id
        FROM WaterParameter
        WHERE PondID = v_PondID 
          AND RecordedAt >= (NEW.ExecutedAt - INTERVAL 6 HOUR)
        ORDER BY RecordedAt DESC 
        LIMIT 1;
        
        IF @recent_id IS NOT NULL THEN
            -- Cập nhật bản ghi cũ
            UPDATE WaterParameter
            SET Salt = NEW.MeasuredPercent,
                Note = CONCAT(
                    COALESCE(Note, ''),
                    ' | Cập nhật muối (Kế hoạch #', v_PlanID, ' Bước ', v_StepIndex, ')'
                )
            WHERE ParameterID = @recent_id;
        ELSE
            -- Tạo bản ghi mới
            INSERT INTO WaterParameter (PondID, RecordedAt, Salt, Note)
            VALUES (
                v_PondID,
                NEW.ExecutedAt,
                NEW.MeasuredPercent,
                CONCAT('Tự động: Kế hoạch muối #', v_PlanID, ' - Bước ', v_StepIndex)
            );
        END IF;
        
        -- Log safety audit if significant deviation (Logic từ phần 8)
        IF NEW.MeasuredPercent IS NOT NULL AND NEW.ExpectedPercentAfter IS NOT NULL THEN
            SET @deviation = ABS(NEW.MeasuredPercent - NEW.ExpectedPercentAfter) / NEW.ExpectedPercentAfter * 100;
            
            IF @deviation > 30 THEN
                INSERT INTO SaltSafetyAudit (PlanID, UserID, ActionType, SafetyLevel, ValidationWarnings)
                SELECT 
                    v_PlanID,
                    p.UserID,
                    'warning_override',
                    'warning',
                    CONCAT('Độ lệch lớn khi hoàn thành bước: ', ROUND(@deviation, 1), '% (Dự tính: ', NEW.ExpectedPercentAfter, '%, Thực tế: ', NEW.MeasuredPercent, '%)')
                FROM SaltPlan sp
                JOIN Pond p ON sp.PondID = p.PondID
                WHERE sp.PlanID = v_PlanID;
            END IF;
        END IF;
        
    END IF;
END$$
DELIMITER ;


-- 4. VIEW FOR EXPERT SYSTEM MONITORING (KHÔNG BỊ GỘP)
CREATE OR REPLACE VIEW SaltExpertMonitor AS
SELECT 
    sp.PlanID,
    p.PondName,
    sp.TargetPercent,
    sp.SourceWaterSalinity,
    sp.Status,
    sp.StartAt,
    sp.EndAt,
    sp.FishCountSnapshot,
    sp.AvgWeightSnapshot,
    (SELECT COUNT(*) FROM SaltDoseStep sds WHERE sds.PlanID = sp.PlanID) AS TotalSteps,
    (SELECT COUNT(*) FROM SaltDoseStep sds WHERE sds.PlanID = sp.PlanID AND sds.ExecutedAt IS NOT NULL) AS CompletedSteps,
    (SELECT AVG(ABS(sds.MeasuredPercent - sds.ExpectedPercentAfter) / sds.ExpectedPercentAfter * 100) 
     FROM SaltDoseStep sds 
     WHERE sds.PlanID = sp.PlanID AND sds.MeasuredPercent IS NOT NULL) AS AvgDeviationPct,
    CASE 
        WHEN sp.TargetPercent > 0.7 THEN 'danger'
        WHEN sp.TargetPercent > 0.3 THEN 'warning'
        ELSE 'safe'
    END AS SafetyLevel
FROM SaltPlan sp
JOIN Pond p ON sp.PondID = p.PondID
ORDER BY sp.StartAt DESC;