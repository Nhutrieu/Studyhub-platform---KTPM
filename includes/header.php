<?php
if (session_status() === PHP_SESSION_NONE) session_start();

// Kiểm tra kết nối DB
if (!isset($conn)) {
    $db_path = __DIR__ . '/db.php';
    if (file_exists($db_path)) {
        require_once $db_path;
    }
}

$role       = $_SESSION['role'] ?? 'guest';
$username = $_SESSION['username'] ?? 'Khách';
$fullname = $_SESSION['fullname'] ?? $username; 
$userId   = $_SESSION['userid'] ?? 0;

// --- 1. LOGIC TÍNH GIỎ HÀNG (GIỮ NGUYÊN ĐỂ HIỂN THỊ BAN ĐẦU) ---
$cart_count = 0;
if ($userId > 0 && isset($conn)) {
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM Cart WHERE UserID = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $cart_count = $res['count'] ?? 0;
    $stmt->close();
}

// --- 2. LOGIC VÍ KOIPAY, SỐ DƯ & AVATAR ---
$user_balance = 0;
$wallet_url = '#';
$avatar_db_url = ''; // Biến mới để lưu AvatarURL từ DB

if ($userId > 0 && isset($conn)) {
    // Lấy số dư thực tế và AvatarURL
    $stmtB = $conn->prepare("SELECT AccountBalance, AvatarURL FROM Users WHERE UserID = ?");
    $stmtB->bind_param("i", $userId);
    $stmtB->execute();
    $resB = $stmtB->get_result()->fetch_assoc();
    $user_balance = $resB['AccountBalance'] ?? 0;
    $avatar_db_url = $resB['AvatarURL'] ?? ''; // Lấy AvatarURL từ DB
    $stmtB->close();

    // Link ví
    if ($role === 'Shop' || $role === 'Admin') {
        $wallet_url = '/HeThongChamSocCaKoi/frontend/shop/wallet.php';
    } else {
        $wallet_url = '/HeThongChamSocCaKoi/frontend/users/wallet.php';
    }
}

// Xác định URL avatar cuối cùng: Ưu tiên DB, nếu không có thì dùng UI-Avatars
$avatar_url_final = !empty($avatar_db_url) 
    ? htmlspecialchars($avatar_db_url) 
    : "https://ui-avatars.com/api/?name=" . urlencode($fullname) . "&background=random";


// --- 3. LOGIC LINK DASHBOARD (CHO NÚT TỔNG QUAN) ---
$dashboard_url = '/HeThongChamSocCaKoi/index.php'; // Mặc định
switch ($role) {
    case 'Admin':
        $dashboard_url = '/HeThongChamSocCaKoi/frontend/admin/dashboard.php';
        break;
    case 'Shop':
        $dashboard_url = '/HeThongChamSocCaKoi/frontend/shop/dashboard.php';
        break;
    case 'Customer':
        $dashboard_url = '/HeThongChamSocCaKoi/frontend/customer/ponds.php';
        break;
}

// --- 4. LOGIC TỰ ĐỘNG XÁC ĐỊNH MENU ACTIVE DỰA TRÊN URL HIỆN TẠI ---
// Lấy đường dẫn hiện tại (loại bỏ query string)
$current_page_uri = strtok($_SERVER['REQUEST_URI'] ?? '', '?');
// Khởi tạo $active_menu nếu chưa được set từ bên ngoài
$active_menu = $active_menu ?? ''; 

// Chỉ tự động xác định nếu $active_menu chưa được set
if ($active_menu === '') {
    // 1. Tổng quan / Trang chủ
    if (
        $current_page_uri === '/HeThongChamSocCaKoi/index.php' ||
        $current_page_uri === $dashboard_url // Dùng dashboard_url đã tính ở trên
    ) {
        $active_menu = 'home';
    }
    // 2. Menu chính
    else if (str_contains($current_page_uri, '/frontend/customer/ponds.php')) {
        $active_menu = 'ponds';
    }
    else if (str_contains($current_page_uri, '/frontend/customer/kois.php')) {
        $active_menu = 'kois';
    }
    else if (str_contains($current_page_uri, '/frontend/shop/products.php')) {
        $active_menu = 'products';
    }
    else if (str_contains($current_page_uri, '/frontend/community/index.php')) {
        $active_menu = 'news';
    }
    // 3. Công cụ (Tools) - Kiểm tra các trang con trong dropdown
    else if (str_contains($current_page_uri, '/frontend/customer/water_para.php')) {
        $active_menu = 'water';
    }
    else if (str_contains($current_page_uri, '/frontend/customer/salt.php')) {
        $active_menu = 'salt';
    }
    else if (str_contains($current_page_uri, '/frontend/customer/feeding.php')) {
        $active_menu = 'feeding';
    }
    else if (str_contains($current_page_uri, '/frontend/ai-detect/health-check.php')) {
        $active_menu = 'health';
    }
}

$is_tools_active = in_array($active_menu, ['water', 'salt', 'feeding', 'health']);
?>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- START: CSS & ASSETS -->
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">

<!-- Chatbot CSS -->
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/ai/chatbot.css">

<style>
    body { font-family: 'Outfit', sans-serif; background-color: #f1f5f9; }
    :root { --header-bg: #0f172a; --koi-accent: #f97316; }

    /* Hiệu ứng chữ Logo Gradient */
    @keyframes textGradientShift {
        0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; }
    }
    .premium-text-gradient {
        background: linear-gradient(135deg, #38bdf8 0%, #f97316 40%, #fbbf24 70%, #38bdf8 100%);
        background-size: 300% 300%;
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 900; letter-spacing: -0.03em;
        animation: textGradientShift 4s ease infinite;
    }

    /* Scrollbar & Transitions */
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .mobile-sidebar { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    
    /* Dropdown Logic (Click) */
    .dropdown-content {
        transform-origin: top right; transition: all 0.2s ease-out;
        opacity: 0; transform: scale(0.95); pointer-events: none;
        display: none; 
    }
    .dropdown-content.show { 
        opacity: 1; transform: scale(1); pointer-events: auto; 
        display: block; 
    }

    /* Modal & Switch */
    .music-modal { background-color: rgba(15, 23, 42, 0.55); z-index: 9999; }
    .music-modal-content { animation: fadeIn 0.25s ease-out; }
    @keyframes fadeIn { from {opacity: 0; transform: translateY(-10px);} to {opacity: 1; transform: translateY(0);} }
    
    .switch-toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
    .switch-toggle input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1; transition: .3s; border-radius: 99px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #22c55e; }
    input:checked + .slider:before { transform: translateX(22px); }

    @media (min-width: 768px) {
        .force-desktop-flex { display: flex !important; }
    }
</style>

<!-- 🎵 IFRAME NHẠC NỀN -->
<iframe src="/HeThongChamSocCaKoi/includes/music_player.php" id="music-frame" style="display:none" allow="autoplay"></iframe>

<!-- ================= HEADER CHÍNH (DESKTOP) ================= -->
<header class="bg-[#0f172a] text-white sticky top-0 z-50 shadow-xl border-b border-slate-700">
    
    <!-- Top Bar -->
    <div class="hidden md:block bg-[#020617] text-xs text-slate-400 py-1.5 px-4 border-b border-slate-800">
        <div class="container mx-auto flex justify-between">
            <span><i class="fas fa-shield-alt text-orange-500 mr-1"></i> Hệ thống chăm sóc cá Koi chuẩn Quốc tế</span>
            <div class="flex gap-4">
                <a href="#" class="hover:text-white">Tải App</a>
                <span class="text-slate-600">|</span>
                <a href="#" class="hover:text-white">Hỗ trợ</a>
            </div>
        </div>
        
    </div>

    <div class="container mx-auto px-4">
        <div class="h-16 flex items-center justify-between gap-4">

            <!-- 1. LOGO & MENU MOBILE -->
            <div class="flex items-center gap-3">
                <button onclick="toggleSidebar()" class="md:hidden text-2xl text-slate-300 hover:text-white focus:outline-none">
                    <i class="fas fa-bars"></i>
                </button>

                <!-- Logo giữ nguyên link cũ (Trang chủ) -->
                <a href="/HeThongChamSocCaKoi/index.php" class="flex items-center gap-2 group">
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-orange-500 overflow-hidden">
                        <img src="/HeThongChamSocCaKoi/assets/images/logo_koi.png" alt="Logo" class="w-full h-full object-cover p-0.5 rounded-full" onerror="this.src='https://placehold.co/40x40?text=Koi'">
                    </div>
                    <div class="flex flex-col leading-none">
                        <span class="text-2xl premium-text-gradient">KoiCareS</span>
                        <span class="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:block">Professional System</span>
                    </div>
                </a>
            </div>

            <!-- 2. NAVIGATION (DESKTOP) -->
            <nav class="max-md:hidden force-desktop-flex items-center gap-6 text-sm font-medium text-slate-300">
                <!-- Nút Tổng quan link tới Dashboard theo vai trò -->
                <a href="<?= $dashboard_url ?>" class="hover:text-orange-400 transition py-2 <?= $active_menu=='home'?'text-orange-400':'' ?>">Tổng quan</a>
                
                <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="hover:text-orange-400 transition py-2 <?= $active_menu=='ponds'?'text-orange-400':'' ?>">Hồ cá</a>
                <a href="/HeThongChamSocCaKoi/frontend/customer/kois.php" class="hover:text-orange-400 transition py-2 <?= $active_menu=='kois'?'text-orange-400':'' ?>">Cá Koi</a>
                
                <!-- Dropdown Công cụ -->
                <div class="relative dropdown-container cursor-pointer">
                    <button onclick="toggleDropdown(event, 'tools-dropdown')" class="flex items-center gap-1 hover:text-orange-400 transition focus:outline-none <?= $is_tools_active?'text-orange-400':'' ?>">
                        Công cụ <i class="fas fa-chevron-down text-xs ml-1"></i>
                    </button>
                    <div id="tools-dropdown" class="dropdown-content absolute top-full left-0 mt-2 w-60 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden text-slate-200 z-50">
                        <a href="/HeThongChamSocCaKoi/frontend/customer/water_para.php" class="block px-4 py-3 hover:bg-slate-700 hover:text-orange-400 border-b border-slate-700/50 <?= $active_menu=='water'?'text-orange-400 font-bold':'' ?>"><i class="fas fa-vial w-5 mr-2"></i> Thông số nước</a>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/salt.php" class="block px-4 py-3 hover:bg-slate-700 hover:text-orange-400 border-b border-slate-700/50 <?= $active_menu=='salt'?'text-orange-400 font-bold':'' ?>"><i class="fas fa-calculator w-5 mr-2"></i> Tính lượng muối</a>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/feeding.php" class="block px-4 py-3 hover:bg-slate-700 hover:text-orange-400 border-b border-slate-700/50 <?= $active_menu=='feeding'?'text-orange-400 font-bold':'' ?>"><i class="fas fa-utensils w-5 mr-2"></i> Tính lượng thức ăn</a>
                        <a href="/HeThongChamSocCaKoi/frontend/ai-detect/health-check.php" class="block px-4 py-3 hover:bg-slate-700 hover:text-orange-400 <?= $active_menu=='health'?'text-orange-400 font-bold':'' ?>"><i class="fas fa-notes-medical w-5 mr-2"></i> Kiểm tra sức khỏe (AI)</a>
                    </div>
                </div>

                <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="hover:text-orange-400 transition py-2 <?= $active_menu=='products'?'text-orange-400':'' ?>">Cửa hàng</a>
                <a href="/HeThongChamSocCaKoi/frontend/community/index.php" class="hover:text-orange-400 transition py-2 <?= $active_menu=='news'?'text-orange-400':'' ?>">Cộng đồng</a>
            </nav>

            <!-- 3. ACTIONS & HOTLINE -->
            <div class="flex items-center gap-2 sm:gap-4">
                
                <!-- Hotline -->
                <a href="tel:0937598098" class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-600 hover:border-orange-500 hover:bg-slate-700 transition group no-underline">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition">
                        <i class="fas fa-phone-alt text-xs animate-pulse"></i>
                    </div>
                    <div class="flex flex-col leading-tight mr-1">
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Hotline</span>
                        <span class="text-sm font-bold text-white group-hover:text-orange-400 transition font-mono">0792.299.564</span>
                    </div>
                </a>

                <a href="tel:0937598098" class="lg:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-600 text-white shadow-lg animate-pulse">
                    <i class="fas fa-phone"></i>
                </a>

                <!-- Action Icons -->
                <div class="flex items-center gap-2">
                    
                    <!-- Nút Thông Báo -->
                    <button id="noti-btn" class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition relative">
                        <i class="far fa-bell text-sm"></i>
                        <span id="noti-badge" style="display:none;" class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0f172a]"></span>
                    </button>

                    <!-- Nút Giỏ Hàng (Đã thêm ID) -->
                    <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/cart.php" class="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition relative" id="cart-btn">
                        <i class="fas fa-shopping-cart text-xs"></i>
                        <span id="cart-badge" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full" style="display: <?= $cart_count > 0 ? 'flex' : 'none' ?>;"><?= $cart_count ?></span>
                    </a>
                    
                    <!-- XỬ LÝ: AVATAR USER HOẶC NÚT ĐĂNG NHẬP -->
                    <?php if ($userId > 0): ?>
                        <!-- User Menu (Avatar) - Chỉ hiện khi đã đăng nhập -->
                        <div class="relative dropdown-container ml-1">
                            <button onclick="toggleDropdown(event, 'user-dropdown')" class="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-600 hover:border-orange-500 transition focus:outline-none">
                                <!-- Đã cập nhật để dùng $avatar_url_final -->
                                <img src="<?= $avatar_url_final ?>" alt="Avatar" class="w-full h-full object-cover">
                            </button>
                            
                            <div id="user-dropdown" class="dropdown-content absolute right-0 top-full mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
                                <div class="p-4 border-b border-slate-700 bg-slate-900/50">
                                    <div class="text-white font-bold"><?= htmlspecialchars($fullname) ?></div>
                                    <div class="text-xs text-slate-400"><?= ucfirst($role) ?></div>
                                    
                                    <!-- Ví KoiPay -->
                                    <a href="<?= $wallet_url ?>" class="mt-3 pt-2 border-t border-slate-700 flex justify-between items-center text-xs group/wallet hover:bg-slate-700/50 p-1 rounded transition no-underline">
                                        <span class="text-slate-400 group-hover/wallet:text-white">Ví KoiPay:</span>
                                        <span class="text-orange-400 font-bold font-mono"><?= number_format($user_balance, 0, ',', '.') ?> đ</span>
                                    </a>
                                </div>
                                <div class="py-1">
                                    <a href="/HeThongChamSocCaKoi/frontend/users/profile.php" class="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"><i class="fas fa-user-circle w-6 mr-2"></i> Hồ sơ</a>
                                    <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/orders.php" class="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"><i class="fas fa-box w-6 mr-2"></i> Đơn hàng</a>
                                    <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/wishlist.php" class="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"><i class="far fa-heart w-6 mr-2"></i> Danh sách yêu thích</a>
                                    
                                    
                                    <!-- Nút Cài đặt trong menu -->
                                    <button id="settings-btn" class="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center">
                                        <i class="fas fa-cog w-6 mr-2"></i> Cài đặt nhạc
                                    </button>
                                    
                                    <div class="border-t border-slate-700 my-1"></div>
                                    <a href="/HeThongChamSocCaKoi/backend/api/auth/logout.php" class="block px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition"><i class="fas fa-sign-out-alt w-6 mr-2"></i> Đăng xuất</a>
                                </div>
                            </div>
                        </div>
                    <?php else: ?>
                        <!-- Nút Đăng nhập - Hiện khi là Khách -->
                        <a href="/HeThongChamSocCaKoi/frontend/auth/login.php" class="ml-2 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-lg shadow-lg hover:shadow-orange-500/30 transition transform hover:-translate-y-0.5">
                            <i class="fas fa-user"></i> <span class="hidden sm:inline">Đăng nhập</span>
                        </a>
                    <?php endif; ?>

                </div>
            </div>
        </div>
    </div>
</header>

<!-- ================= MOBILE SIDEBAR (OFF-CANVAS) ================= -->
<div id="mobile-sidebar-overlay" onclick="toggleSidebar()" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] hidden transition-opacity opacity-0"></div>

<aside id="mobile-sidebar" class="fixed top-0 left-0 h-full w-[280px] bg-white z-[1000] transform -translate-x-full mobile-sidebar shadow-2xl flex flex-col">
    <div class="h-16 flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50">
        <span class="text-lg font-extrabold text-slate-800">MENU</span>
        <button onclick="toggleSidebar()" class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 flex items-center justify-center shadow-sm">
            <i class="fas fa-times"></i>
        </button>
        
    </div>

    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div class="space-y-1">
            <!-- Hiển thị Ví trên Mobile Sidebar -->
            <?php if($userId > 0): ?>
            <div class="mb-4 p-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl text-white">
                <div class="text-xs text-slate-400 mb-1">Ví KoiPay của bạn</div>
                <div class="flex justify-between items-center">
                    <span class="font-bold text-orange-400 text-lg"><?= number_format($user_balance, 0, ',', '.') ?> đ</span>
                    <a href="<?= $wallet_url ?>" class="text-xs bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded text-white transition">Nạp tiền</a>
                </div>
            </div>
            <?php endif; ?>

            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3">Tổng quan</div>
            
            <!-- Link Tổng quan Dashboard theo Role cho Mobile -->
            <a href="<?= $dashboard_url ?>" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='home'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-grid-2 w-5"></i> Trang chủ
            </a>
            <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='ponds'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-water w-5"></i> Quản lý Hồ cá
            </a>
            <a href="/HeThongChamSocCaKoi/frontend/customer/kois.php" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='kois'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-fish w-5"></i> Danh sách Cá Koi
            </a>

            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Công cụ tiện ích</div>
            <div class="space-y-1 pl-2 border-l-2 border-slate-100 ml-3">
                <a href="/HeThongChamSocCaKoi/frontend/customer/water_para.php" class="block px-3 py-2 text-sm hover:text-orange-500 <?= $active_menu=='water'?'text-orange-600 font-bold':'text-slate-600' ?>">Thông số nước</a>
                <a href="/HeThongChamSocCaKoi/frontend/customer/salt.php" class="block px-3 py-2 text-sm hover:text-orange-500 <?= $active_menu=='salt'?'text-orange-600 font-bold':'text-slate-600' ?>">Tính khối lượng muối</a>
                <a href="/HeThongChamSocCaKoi/frontend/customer/feeding.php" class="block px-3 py-2 text-sm hover:text-orange-500 <?= $active_menu=='feeding'?'text-orange-600 font-bold':'text-slate-600' ?>">Tính lượng thức ăn</a>
                <a href="/HeThongChamSocCaKoi/frontend/ai-detect/health-check.php" class="block px-3 py-2 text-sm hover:text-orange-500 <?= $active_menu=='health'?'text-orange-600 font-bold':'text-slate-600' ?>">Kiểm tra sức khỏe (AI)</a>
            </div>

            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Cửa hàng</div>
            <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='products'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-store w-5"></i> Cửa hàng
            </a>
            
            <a href="/HeThongChamSocCaKoi/frontend/community/index.php" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='news'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-users w-5"></i> Cộng đồng
            </a>
            
            <?php if (in_array($role, ['Admin', 'Shop'])): ?>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 px-3">Quản trị</div>
            <a href="/HeThongChamSocCaKoi/frontend/admin/dashboard.php" class="flex items-center gap-3 px-3 py-3 rounded-lg <?= $active_menu=='admin'?'bg-orange-50 text-orange-600 font-bold':'text-slate-600 hover:bg-slate-50' ?>">
                <i class="fas fa-cog w-5"></i> Dashboard Admin
            </a>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="p-4 border-t border-slate-100 bg-slate-50">
        <?php if ($userId > 0): ?>
            <a href="/HeThongChamSocCaKoi/backend/api/auth/logout.php" class="flex items-center gap-3 text-red-500 font-medium hover:bg-red-50 px-3 py-2 rounded-lg transition">
                <i class="fas fa-sign-out-alt"></i> Đăng xuất
            </a>
        <?php else: ?>
            <a href="/HeThongChamSocCaKoi/login.php" class="flex items-center justify-center gap-2 bg-orange-600 text-white font-medium hover:bg-orange-700 px-3 py-3 rounded-lg transition shadow-md">
                <i class="fas fa-sign-in-alt"></i> Đăng nhập ngay
            </a>
        <?php endif; ?>
    </div>
</aside>

<!-- ⚙️ Modal Cài đặt Nhạc -->
<div id="settings-modal" class="music-modal fixed inset-0 hidden flex items-center justify-center">
    <div class="music-modal-content bg-white p-6 rounded-2xl w-80 text-center shadow-2xl relative">
        <button id="close-modal" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        <div class="text-lg font-bold text-sky-500 mb-6">Cài đặt âm thanh</div>
        <div class="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg">
            <span class="font-semibold text-slate-700">Nhạc nền</span>
            <label class="switch-toggle">
                <input type="checkbox" id="music-toggle">
                <span class="slider"></span>
            </label>
        </div>
    </div>
</div>

<!-- ================= CHATBOT ROBOT ICON (DRAGGABLE) ================= -->
<div id="ai-robot-launcher" 
     class="w-14 h-14 cursor-pointer 
           flex items-center justify-center rounded-full bg-orange-500 
           shadow-xl border-4 border-white text-white transition-transform 
           hover:scale-110 active:scale-95 duration-300">
    <!-- Icon Robot -->
    <i class="fas fa-robot text-2xl"></i>
</div>

<!-- SCRIPTS -->
<script>
    // 1. Sidebar Logic
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const body = document.body;

    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            setTimeout(() => { overlay.classList.remove('opacity-0'); }, 10);
            body.style.overflow = 'hidden';
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0');
            setTimeout(() => { overlay.classList.add('hidden'); }, 300);
            body.style.overflow = '';
        }
    }

    // 2. Dropdown Logic
    function toggleDropdown(e, dropdownId) {
        e.stopPropagation();
        const dropdown = document.getElementById(dropdownId);
        const allDropdowns = document.querySelectorAll('.dropdown-content');
        allDropdowns.forEach(d => {
            if (d.id !== dropdownId) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    }

    window.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown-container')) {
            document.querySelectorAll('.dropdown-content').forEach(d => {
                d.classList.remove('show');
            });
        }
        const modal = document.getElementById('settings-modal');
        if (e.target === modal) modal.classList.add('hidden');
    });

    // 3. Modal Nhạc
    const modal = document.getElementById('settings-modal');
    document.addEventListener('click', function(e) {
        if (e.target.closest('#settings-btn')) {
            modal.classList.remove('hidden');
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        }
        if (e.target.closest('#close-modal')) {
            modal.classList.add('hidden');
        }
    });

    const toggle = document.getElementById('music-toggle');
    const iframe = document.getElementById('music-frame');

    if (toggle) {
        toggle.addEventListener('change', function() {
            const enabled = this.checked;
            localStorage.setItem('musicEnabled', enabled ? 'true' : 'false');
            if (enabled) iframe.contentWindow?.postMessage('playMusic', '*');
            else iframe.contentWindow?.postMessage('pauseMusic', '*');
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        const enabled = localStorage.getItem('musicEnabled') === 'true';
        if (toggle) toggle.checked = enabled;
        if (enabled) iframe.contentWindow?.postMessage('playMusic', '*');
    });

    // --- 4. Logic Cập nhật Giỏ hàng theo Hành động (Action-based) ---
    <?php if ($userId > 0): ?>
        const cartBadge = document.getElementById('cart-badge');
        
        // HÀM TOÀN CỤC: Gọi hàm này sau khi request AJAX 'Thêm vào Giỏ hàng' thành công
        window.refreshCartCount = function() { 
            // Endpoint API để lấy số lượng giỏ hàng mới nhất
            const apiUrl = '/HeThongChamSocCaKoi/backend/api/cart/get_count.php'; 
            
            fetch(apiUrl, { method: 'GET' }) 
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && typeof data.count === 'number') {
                        const count = data.count;
                        cartBadge.textContent = count;
                        if (count > 0) {
                            // Hiển thị badge
                            cartBadge.style.display = 'flex'; 
                        } else {
                            // Ẩn badge
                            cartBadge.style.display = 'none';
                        }
                    } else {
                        console.error('API Error: Invalid response format or failure.');
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch cart count:', error);
                });
        }

        // Gọi hàm một lần khi trang tải xong để thiết lập số lượng ban đầu
        // window.refreshCartCount(); // Đã có logic PHP hiển thị count ban đầu, có thể bỏ dòng này nếu muốn giảm tải
    <?php endif; ?>
</script>

<!-- NHÚNG LOGIC THÔNG BÁO TỪ FILE BÊN NGOÀI -->
<script src="/HeThongChamSocCaKoi/assets/js/common/notifications.js"></script>

<script src="/HeThongChamSocCaKoi/assets/js/ai/chatbot.js"></script>