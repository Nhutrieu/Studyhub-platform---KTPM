<?php
session_start();
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}

require_once '../../includes/db.php';
require_once '../../includes/check_login.php';
$username = $_SESSION['username'];

// Get current user role and ID (essential for Admin protection in JS)
$st = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username=?");
$st->bind_param("s", $username);
$st->execute();
$me = $st->get_result()->fetch_assoc();

if (!$me || $me['Role'] !== 'Admin') {
    echo "<script>alert('Bạn không có quyền truy cập trang này!'); window.location.href='/HeThongChamSocCaKoi/frontend/dashboards/dashboard.php';</script>";
    exit;
}

$current_user_id = $me['UserID'];
$current_user_role = $me['Role'];

$page_title = "Quản lý người dùng";
// Giả định header.php load CSS/meta tags cơ bản
include '../../includes/header.php';
?>

<!-- Tailwind CSS CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<!-- Inter Font -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>

<style>
    /* Custom styles for professional touch */
    body {
        font-family: 'Inter', sans-serif;
        background: #f1f5f9; /* Slate 100/200 like background */
    }
    .modal-overlay-custom {
        backdrop-filter: blur(4px);
        background-color: rgba(15, 23, 42, 0.5); /* Slate 900 */
    }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background-color: #94a3b8; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
    .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    input:required:invalid, select:required:invalid {
        box-shadow: none;
    }
</style>

<script>
    // FIX LỖI: Thay thế 'const' bằng 'window.' để tránh lỗi "already been declared"
    // Define PHP variables for JS consumption
    window.CURRENT_USER_ID = <?php echo $current_user_id; ?>;
    window.CURRENT_USER_ROLE = "<?php echo $current_user_role; ?>";
    
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    'primary': '#1e3a8a', /* Deep Blue 800 */
                    'primary-light': '#3b82f6', /* Blue 500 */
                    'success': '#10b981', /* Green */
                    'danger': '#ef4444', /* Red */
                    'warning': '#f59e0b', /* Amber */
                    'info': '#6366f1', /* Indigo */
                    'neutral-bg': '#f8fafc',
                }
            }
        }
    }
</script>

<div class="max-w-8xl mx-auto flex flex-col gap-8 p-4 sm:p-6 md:p-8">

    <!-- Header & Title -->
    <header class="flex justify-between items-center pb-4 border-b border-gray-200">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center">
            <i data-lucide="layout-dashboard" class="w-7 h-7 mr-3 text-primary"></i>
            Quản lý Người dùng
        </h1>
        <div class="text-sm text-gray-500 hidden md:block">
            Tài khoản: <?php echo htmlspecialchars($username); ?> (ID: <?php echo $current_user_id; ?>)
        </div>
    </header>

    <!-- Summary Statistics Cards -->
    <div id="stats-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Cards will be rendered here by JS -->
    </div>

    <!-- Main Content Area (Table and Filters) -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-100 p-6">

        <p class="text-md font-semibold text-gray-700 mb-4">
            Danh sách tài khoản hệ thống
        </p>

        <!-- User Table Component -->
        <div id="users-table">
            <div class="text-center p-12 text-gray-500" id="loading-spinner">
                <svg class="animate-spin h-6 w-6 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="mt-2 block">Đang tải dữ liệu...</span>
            </div>
        </div>
    </div>
    
    <!-- Instructions Sidebar (Now a Footer Card) -->
    <div class="w-full">
        <div class="bg-white p-5 rounded-xl shadow-md border border-gray-100">
            <h3 class="text-lg font-semibold text-primary-light mb-3 flex items-center">
                <i data-lucide="info" class="w-5 h-5 mr-2 text-primary"></i>
                Lưu ý về Trạng thái và Xóa
            </h3>
            <ul class="text-sm text-gray-600 space-y-2 grid sm:grid-cols-2 md:grid-cols-3">
                <li class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-success mr-2"></span>
                    <span class="font-bold text-success">Active:</span> Tài khoản hoạt động bình thường.
                </li>
                <li class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-warning mr-2"></span>
                    <span class="font-bold text-warning-700">Disabled:</span> Tài khoản bị vô hiệu hóa tạm thời.
                </li>
                <li class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-danger mr-2"></span>
                    <span class="font-bold text-danger">Deleted:</span> Tài khoản bị **Xóa** và **không xuất hiện** trong tìm kiếm/bộ lọc mặc định.
                </li>
            </ul>
        </div>
    </div>

</div>

<!-- Custom Modal Structure (Alerts/Confirms) -->
<div id="um-modal" class="modal-overlay-custom fixed inset-0 hidden items-center justify-center p-4 z-[1000]">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100 duration-300 border border-gray-100">
        <h4 id="um-modal-title" class="text-2xl font-extrabold text-primary mb-3"></h4>
        <p id="um-modal-message" class="text-gray-600 mb-8 text-base leading-relaxed"></p>
        <div id="um-modal-actions" class="flex justify-end gap-3">
            <!-- Buttons dynamically inserted -->
        </div>
    </div>
</div>

<!-- Form Modal Structure for Create/Edit -->
<div id="form-modal" class="modal-overlay-custom fixed inset-0 hidden items-center justify-center p-4 z-[1010]">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all scale-100 duration-300 border border-gray-100">
        <h4 id="form-modal-title" class="text-2xl font-extrabold text-primary mb-6"></h4>
        <form id="user-form">
            <!-- Form fields generated by JS -->
        </form>
        <div id="form-modal-actions" class="flex justify-end gap-3 mt-8">
            <button id="form-cancel" type="button" class="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition duration-150 shadow-sm">Hủy</button>
            <button id="form-submit" form="user-form" type="submit" class="px-5 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition duration-150 shadow-lg shadow-primary/30">Lưu</button>
        </div>
    </div>
</div>

<script src="/HeThongChamSocCaKoi/assets/js/admin/users_management.js"></script>

<?php include '../../includes/footer.php'; ?>