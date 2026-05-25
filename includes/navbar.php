<!-- 
    LƯU Ý QUAN TRỌNG: 
    Đây là file PHP. Hãy lưu file này với đuôi .php (ví dụ: sidebar.php) để logic hoạt động.
    Trong chế độ Preview này, mã PHP sẽ hiện ra dưới dạng text.
-->
<?php
// ====== LOGIC PHP TỪ FILE CŨ (Đã tối ưu) ======
if (session_status() === PHP_SESSION_NONE) session_start();

// Thông tin user cơ bản
$role = $_SESSION['role'] ?? 'Customer'; // Mặc định là khách

// Menu đang active (được set trước khi include file này)
$active_menu = $active_menu ?? 'home';

// Logic mở rộng menu con "Công cụ" nếu đang ở trang con
$tools_active_arr = ['tools', 'water', 'salt', 'feeding'];
$is_tools_open = in_array($active_menu, $tools_active_arr) ? 'open' : '';
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>

    <style>
        /* ====== CORE VARIABLES ====== */
        :root {
            --sidebar-width: 260px;
            --primary-color: #0ea5e9;
            --primary-dark: #0284c7;
            --accent-color: #f97316;
            --bg-sidebar: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --transition-speed: 0.4s; /* Tăng thời gian chuyển động cho mượt */
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        /* ====== TRIGGER AREA (Vùng cảm ứng mép trái) ====== */
        .sidebar-trigger-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 25px; /* Độ rộng vùng cảm ứng */
            height: 100%;
            z-index: 1001; /* Cao hơn sidebar một chút để bắt sự kiện */
            background: transparent; /* Trong suốt */
        }

        /* ====== SIDEBAR COMPONENT CSS ====== */
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            width: var(--sidebar-width);
            background: var(--bg-sidebar);
            /* Shadow đẹp hơn khi trượt ra */
            box-shadow: 10px 0 30px rgba(0,0,0,0.1); 
            display: flex;
            flex-direction: column;
            z-index: 1000;
            border-right: 1px solid #e2e8f0;
            
            /* TRẠNG THÁI MẶC ĐỊNH: ẨN SANG TRÁI */
            transform: translateX(-100%);
            /* Hiệu ứng chuyển động mượt mà */
            transition: transform var(--transition-speed) cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* ====== LOGIC HOVER: HIỆN SIDEBAR ====== */
        /* 1. Khi hover vào vùng cảm ứng mép trái */
        .sidebar-trigger-area:hover ~ .sidebar {
            transform: translateX(0);
        }
        /* 2. Khi chuột đã ở trong sidebar thì giữ nguyên hiển thị */
        .sidebar:hover {
            transform: translateX(0);
        }

        /* 1. BRAND */
        .sidebar-brand {
            height: 70px;
            display: flex;
            align-items: center;
            padding: 0 24px;
            border-bottom: 1px solid rgba(0,0,0,0.03);
            text-decoration: none;
        }

        .brand-logo {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
            flex-shrink: 0;
        }

        .brand-text {
            margin-left: 12px;
            display: flex;
            flex-direction: column;
            white-space: nowrap;
        }

        .brand-text span:first-child {
            font-weight: 700;
            font-size: 16px;
            color: var(--text-main);
        }

        .brand-text span:last-child {
            font-size: 11px;
            color: var(--primary-color);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* 2. MENU */
        .sidebar-menu {
            flex: 1;
            padding: 20px 16px;
            overflow-y: auto;
            list-style: none;
        }
        .sidebar-menu::-webkit-scrollbar { width: 4px; }
        .sidebar-menu::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

        .menu-title {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
            margin-bottom: 8px;
            padding-left: 12px;
            margin-top: 16px;
        }
        .menu-title:first-child { margin-top: 0; }

        .menu-item { margin-bottom: 4px; }

        .menu-link {
            display: flex;
            align-items: center;
            text-decoration: none;
            color: var(--text-muted);
            padding: 11px 14px;
            border-radius: 8px;
            transition: all 0.2s ease;
            font-weight: 500;
            font-size: 14px;
            position: relative;
            cursor: pointer; /* Đảm bảo con trỏ đúng */
        }

        .menu-icon {
            font-size: 20px;
            min-width: 28px;
            display: flex;
            align-items: center;
            transition: transform 0.2s;
        }

        .menu-text { margin-left: 8px; flex: 1; }
        .chevron-icon { font-size: 18px; transition: transform 0.3s; }

        /* Hover & Active */
        .menu-link:hover {
            color: var(--primary-color);
            background: #f0f9ff;
        }
        .menu-link:hover .menu-icon {
            transform: scale(1.1) translateX(2px);
            color: var(--primary-color);
        }

        /* Active State (PHP sẽ thêm class 'active' vào thẻ li cha) */
        .menu-item.active .menu-link {
            background: linear-gradient(90deg, var(--primary-color), var(--primary-dark));
            color: white;
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }
        .menu-item.active .menu-link .menu-icon,
        .menu-item.active .menu-link .chevron-icon {
            color: white;
            transform: none;
        }

        /* 3. SUBMENU */
        .submenu {
            list-style: none;
            padding-left: 44px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-in-out;
        }
        
        /* Logic mở submenu: Class 'open' được thêm bởi JS hoặc PHP */
        .menu-item.open .submenu {
            max-height: 200px;
            margin-bottom: 8px;
        }
        .menu-item.open .chevron-icon { transform: rotate(90deg); }

        .submenu-link {
            display: block;
            text-decoration: none;
            color: var(--text-muted);
            font-size: 13px;
            padding: 8px 0;
            position: relative;
            transition: color 0.2s;
        }
        .submenu-link::before {
            content: "";
            position: absolute;
            left: -12px; top: 50%;
            width: 5px; height: 5px;
            background: #cbd5e1;
            border-radius: 50%;
            transform: translateY(-50%);
            transition: 0.2s;
        }
        .submenu-link:hover { color: var(--text-main); }
        .submenu-link:hover::before { background: var(--accent-color); }

        .submenu-link.active { color: var(--primary-color); font-weight: 600; }
        .submenu-link.active::before { background: var(--primary-color); }

        /* RESPONSIVE */
        @media (max-width: 768px) {
            /* Trên mobile, vùng trigger có thể cần tắt hoặc giữ nguyên tùy trải nghiệm */
            /* Mặc định logic hover vẫn hoạt động trên mobile nếu chạm vào mép */
        }
    </style>
</head>
<body>

    <!-- 1. Trigger Area: Vùng cảm ứng vô hình mép trái -->
    <div class="sidebar-trigger-area"></div>

    <!-- 2. Sidebar Component -->
    <aside class="sidebar" id="sidebar">
        <!-- Brand -->
        <a href="/HeThongChamSocCaKoi/frontend/dashboards/dashboard.php" class="sidebar-brand">
            <div class="brand-logo"><i class='bx bxs-fish'></i></div>
            <div class="brand-text">
                <span>KoiCareS</span>
            </div>
        </a>

        <!-- Menu List -->
        <ul class="sidebar-menu">
            <div class="menu-title">Tổng quan</div>
            
            <li class="menu-item <?= $active_menu === 'home' ? 'active' : '' ?>">
                <a href="/HeThongChamSocCaKoi/frontend/dashboards/dashboard.php" class="menu-link">
                    <i class='bx bx-grid-alt menu-icon'></i>
                    <span class="menu-text">Trang chủ</span>
                </a>
            </li>

            <li class="menu-item <?= $active_menu === 'ponds' ? 'active' : '' ?>">
                <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="menu-link">
                    <i class='bx bx-water menu-icon'></i>
                    <span class="menu-text">Hồ cá</span>
                </a>
            </li>

            <li class="menu-item <?= $active_menu === 'kois' ? 'active' : '' ?>">
                <a href="/HeThongChamSocCaKoi/frontend/customer/kois.php" class="menu-link">
                    <i class='bx bxs-fish-original menu-icon'></i>
                    <span class="menu-text">Cá Koi</span>
                </a>
            </li>

            <div class="menu-title">Tiện ích</div>

            <!-- Công cụ (Dropdown) -->
            <!-- PHP kiểm tra nếu menu con active thì thêm class 'open' -->
            <li class="menu-item <?= $is_tools_open ?>" id="tools-menu">
                <a href="javascript:void(0)" class="menu-link" onclick="toggleSubmenu(this)">
                    <i class='bx bx-briefcase-alt-2 menu-icon'></i>
                    <span class="menu-text">Công cụ</span>
                    <i class='bx bx-chevron-right chevron-icon'></i>
                </a>
                <ul class="submenu">
                    <li>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/water_para.php" 
                           class="submenu-link <?= $active_menu === 'water' ? 'active' : '' ?>">
                           Thông số nước
                        </a>
                    </li>
                    <li>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/salt.php" 
                           class="submenu-link <?= $active_menu === 'salt' ? 'active' : '' ?>">
                           Tính khối lượng muối
                        </a>
                    </li>
                    <li>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/feeding.php" 
                           class="submenu-link <?= $active_menu === 'feeding' ? 'active' : '' ?>">
                           Tính lượng thức ăn
                        </a>
                    </li>
                    <li>
                        <a href="/HeThongChamSocCaKoi/frontend/ai-detect/health-check.php" 
                           class="submenu-link <?= $active_menu === 'salt' ? 'active' : '' ?>">
                           Kiểm tra sức khỏe
                        </a>
                    </li>
                </ul>
            </li>

            <li class="menu-item <?= $active_menu === 'products' ? 'active' : '' ?>">
                <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="menu-link">
                    <i class='bx bx-store-alt menu-icon'></i>
                    <span class="menu-text">Cửa hàng</span>
                </a>
            </li>

            <li class="menu-item <?= $active_menu === 'news' ? 'active' : '' ?>">
                <a href="/HeThongChamSocCaKoi/frontend/community/index.php" class="menu-link">
                    <i class='bx bx-group menu-icon'></i>
                    <span class="menu-text">Cộng đồng Koi</span>
                </a>
            </li>

            <!-- Chỉ hiện cho Admin/Shop (PHP Logic) -->
            <?php if (in_array($role, ['Admin', 'Shop'])): ?>
                <div class="menu-title">Hệ thống</div>
                <li class="menu-item <?= $active_menu === 'admin' ? 'active' : '' ?>">
                    <a href="/HeThongChamSocCaKoi/frontend/admin/dashboard.php" class="menu-link">
                        <i class='bx bx-cog menu-icon'></i>
                        <span class="menu-text">Quản trị</span>
                    </a>
                </li>
            <?php endif; ?>
        </ul>

        <div style="padding: 15px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            © 2024 KoiLover
        </div>
    </aside>

    <script>
        // JS Xử lý Dropdown (Click để mở/đóng)
        function toggleSubmenu(element) {
            const parentLi = element.parentElement;
            parentLi.classList.toggle('open');
        }
    </script>
</body>
</html>