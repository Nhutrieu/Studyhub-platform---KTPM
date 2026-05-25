<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\products.php
session_start(); // Đảm bảo session được khởi động trước khi include check_login
require_once '../../includes/db.php'; // Cần kết nối DB để tính toán thống kê
require_once '../../includes/check_login.php';

// Kiểm tra quyền
$role = $_SESSION['role'] ?? 'Customer';
if (!in_array($role, ['Admin', 'Shop'], true)) {
    header('Location: /HeThongChamSocCaKoi/frontend/customer/shopping/products.php');
    exit;
}

$shopId = $_SESSION['userid'];

// ====================================================
// LOGIC TÍNH TOÁN DOANH THU & TĂNG TRƯỞNG
// ====================================================

// --- 1. Thiết lập khoảng thời gian ---
$current_month_start = date('Y-m-01');
$current_month_end = date('Y-m-d 23:59:59');

$previous_month_start = date('Y-m-01', strtotime('first day of last month'));
$previous_month_end = date('Y-m-t 23:59:59', strtotime('last day of last month'));

/**
 * Hàm truy vấn Tổng doanh thu bán hàng (Gross Sales) trong một khoảng thời gian
 * Tổng TotalAmount của các đơn hàng đã Hoàn thành có sản phẩm của Shop
 */
function getGrossRevenue($conn, $shopId, $startDate, $endDate) {
    $sql = "
        SELECT COALESCE(SUM(o.TotalAmount), 0) as revenue
        FROM Orders o
        WHERE o.OrderID IN (
            SELECT DISTINCT od.OrderID
            FROM OrderDetail od
            JOIN Product p ON od.ProductID = p.ProductID
            WHERE p.ShopID = ?
        )
        AND o.Status = 'Completed'
        AND o.CompletedAt BETWEEN ? AND ?
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $shopId, $startDate, $endDate);
    $stmt->execute();
    $revenue = $stmt->get_result()->fetch_assoc()['revenue'] ?? 0;
    $stmt->close();
    return (float)$revenue;
}

// --- 2. Lấy Doanh thu ---
$currentMonthRevenue = getGrossRevenue($conn, $shopId, $current_month_start, $current_month_end);
$previousMonthRevenue = getGrossRevenue($conn, $shopId, $previous_month_start, $previous_month_end);

// --- 3. Tính % Tăng trưởng ---
$growthPercentage = 0;
$growthDirection = '';
$growthColor = 'bg-white/20'; // Default color

if ($currentMonthRevenue > 0 && $previousMonthRevenue == 0) {
    $growthPercentage = 100;
    $growthDirection = 'tăng trưởng mạnh';
    $growthColor = 'bg-emerald-500/30 text-emerald-100';
    $growthIcon = 'trending-up';
} elseif ($previousMonthRevenue > 0) {
    $growthPercentage = (($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100;
    
    if ($growthPercentage > 0) {
        $growthDirection = 'tăng';
        $growthColor = 'bg-emerald-500/30 text-emerald-100';
        $growthIcon = 'trending-up';
    } elseif ($growthPercentage < 0) {
        $growthDirection = 'giảm';
        $growthColor = 'bg-rose-500/30 text-rose-100';
        $growthIcon = 'trending-down';
    } else {
        $growthDirection = 'ổn định';
        $growthColor = 'bg-slate-500/30 text-slate-100';
        $growthIcon = 'minus';
    }
} else {
    $growthDirection = 'chưa có dữ liệu';
    $growthIcon = 'minus';
}

$formattedRevenue = number_format($currentMonthRevenue, 0, ',', '.');
$formattedGrowth = number_format(abs($growthPercentage), 1, ',', '.');


$page_title = "Quản lý sản phẩm - KoiCare Shop";
include "../../includes/header.php";
?>

<!-- Tailwind & Lucide -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/products.css">

<div class="min-h-screen bg-[#f0f9ff] font-sans text-slate-800 pb-20">
    <main class="max-w-7xl mx-auto px-4 py-6">
        
        <!-- ADMIN DASHBOARD HEADER -->
        <div class="mb-8 animate-slide-in-right">
            <div class="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-slate-800">Quản Lý Sản Phẩm</h1>
                    <p class="text-slate-500 text-sm mt-1">Hệ thống quản trị kho hàng và sản phẩm KoiCare</p>
                </div>
                <div class="flex gap-2">
                    <button class="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-700 flex items-center gap-2">
                        <i data-lucide="file-text" class="w-4 h-4"></i> Xuất Báo Cáo
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <!-- Card Tổng Doanh Thu (Đã sửa theo logic Gross Sales) -->
                <div class="col-span-1 md:col-span-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-sky-500/20 relative overflow-hidden flex items-center justify-between">
                    <div class="relative z-10">
                        <p class="text-sky-100 text-xs font-bold uppercase mb-1">Tổng Doanh Thu (Tháng này)</p>
                        <!-- Hiển thị Doanh thu Gross Sales -->
                        <h2 class="text-3xl font-bold"><?= $formattedRevenue ?> đ</h2> 
                        <!-- Hiển thị % Tăng trưởng -->
                        <div class="flex items-center gap-1 mt-2 text-xs w-fit px-2 py-1 rounded-lg backdrop-blur-sm <?= $growthColor ?>">
                            <i data-lucide="<?= $growthIcon ?>" class="w-3 h-3"></i>
                            <span><?= $formattedGrowth ?>% <?= $growthDirection ?> so với tháng trước</span>
                        </div>
                    </div>
                    <div class="relative z-10 w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <i data-lucide="package" class="w-8 h-8"></i>
                    </div>
                    <!-- Decor Circle -->
                    <div class="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 scale-150">
                        <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                    </div>
                </div>

                <!-- Card Tổng SP -->
                <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-indigo-500">
                        <i data-lucide="list" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Tổng sản phẩm</p>
                        <p class="text-2xl font-bold text-slate-800" id="stat-total-products">...</p>
                    </div>
                </div>

                <!-- Card Active -->
                <div class="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-emerald-500">
                        <i data-lucide="check-circle" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Đang hiển thị</p>
                        <p class="text-2xl font-bold text-slate-800" id="stat-active-products">...</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- SIDEBAR FILTERS (Admin) -->
            <aside class="lg:col-span-3 space-y-6 lg:sticky lg:top-24 admin-filters">
                <!-- Admin Quick Filters -->
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bộ lọc Admin</h3>
                    <div class="space-y-1">
                        <button class="filter-pill w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900 is-active" data-filter="all">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                                <span>Tất cả sản phẩm</span>
                            </div>
                        </button>
                        <button class="filter-pill w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900" data-filter="low">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>Sắp hết hàng</span>
                            </div>
                        </button>
                        <button class="filter-pill w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900" data-filter="out">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>Hết hàng</span>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Detailed Filter -->
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center gap-2 mb-4 text-slate-700">
                        <i data-lucide="filter" class="w-4 h-4"></i>
                        <h3 class="font-bold">Tìm kiếm & Lọc</h3>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="relative">
                            <input type="text" id="search-input" placeholder="Tìm tên, mã SP..." 
                                class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all">
                            <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400 w-4 h-4"></i>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-2 block uppercase">Danh mục</label>
                            <select id="category-filter" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-100 transition-colors">
                                <option value="">Tất cả danh mục</option>
                            </select>
                        </div>

                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block uppercase">Sắp xếp</label>
                            <select id="sort-select" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-100 transition-colors">
                                <option value="ProductID|DESC">Mới nhất</option>
                                <option value="Price|ASC">Giá tăng dần</option>
                                <option value="Price|DESC">Giá giảm dần</option>
                                <option value="Stock|DESC">Tồn kho nhiều</option>
                            </select>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- PRODUCT GRID AREA -->
            <div class="lg:col-span-9 col-span-12">
                <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center justify-between sticky top-20 z-40 md:static">
                     <div class="flex items-center gap-2 pl-2">
                        <span id="toolbar-result" class="text-sm text-slate-500 font-medium">Đang tải dữ liệu...</span>
                     </div>
                     <button onclick="openProductForm('add')" 
                         class="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-sky-500/30 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap">
                         <i data-lucide="plus" class="w-4 h-4"></i> <span>Thêm mới</span>
                     </button>
                </div>

                <!-- Grid -->
                <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Rendered by JS -->
                </div>

                <!-- Pagination -->
                <div class="mt-10 flex justify-center items-center gap-4">
                    <button id="prev-page" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </button>
                    <span id="page-info" class="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        Trang 1 / 1
                    </span>
                    <button id="next-page" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all">
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- MODAL THÊM / SỬA -->
<div id="product-form-modal">
    <div class="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-zoom-in">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2" id="product-form-title">
                Thêm sản phẩm mới
            </h3>
            <button onclick="closeProductForm()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        
        <!-- Form -->
        <form id="product-form" enctype="multipart/form-data">
            <input type="hidden" name="ProductID">
            <input type="hidden" name="CurrentImageURL">

            <div class="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                <!-- Left Form -->
                <div class="md:col-span-7 space-y-5">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên sản phẩm</label>
                            <input type="text" name="Name" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" placeholder="Nhập tên sản phẩm...">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Danh mục</label>
                            <select name="CategoryID" id="product-category" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none">
                                <!-- JS load categories -->
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tồn kho</label>
                            <input type="number" name="Stock" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Giá bán (VNĐ)</label>
                            <div class="relative">
                                <input type="number" name="Price" required class="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-sky-500 outline-none">
                                <span class="absolute right-4 top-2.5 text-slate-400 text-sm font-bold">đ</span>
                            </div>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mô tả chi tiết</label>
                            <textarea name="Description" rows="4" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none resize-none" placeholder="Thông tin chi tiết về sản phẩm..."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Right Upload -->
                <div class="md:col-span-5 flex flex-col gap-4">
                    <!-- Ảnh đại diện -->
                    <div class="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center relative hover:bg-slate-100 transition-colors h-64">
                         <div class="primary-preview w-full h-full flex items-center justify-center overflow-hidden rounded-lg mb-2">
                             <img id="primary-image-preview" src="/HeThongChamSocCaKoi/assets/images/default_product.png" class="max-h-full max-w-full object-contain">
                         </div>
                         <label class="absolute inset-0 cursor-pointer flex flex-col items-center justify-end pb-4 opacity-0 hover:opacity-100 transition-opacity bg-slate-900/10 rounded-2xl">
                             <span class="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Thay ảnh</span>
                             <input type="file" name="ImageFile" accept="image/*" class="hidden">
                         </label>
                    </div>

                    <!-- Gallery -->
                    <div class="bg-white border border-slate-200 rounded-xl p-3">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-xs font-bold text-slate-400 uppercase">Thư viện ảnh/video</label>
                            <label class="cursor-pointer text-sky-500 text-xs font-bold hover:underline">
                                + Thêm
                                <input type="file" name="MediaFiles[]" accept="image/*,video/*" multiple class="hidden">
                            </label>
                        </div>
                        <div id="product-media-list" class="flex gap-2 overflow-x-auto pb-2 min-h-[64px]">
                            <!-- JS render -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" onclick="closeProductForm()" class="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-white hover:shadow-sm transition-all">Hủy bỏ</button>
                <button type="submit" id="product-form-submit" class="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:shadow-sky-600/30 transition-all flex items-center gap-2">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> <span>Lưu thay đổi</span>
                </button>
            </div>
        </form>
    </div>
</div>

<!-- MODAL XÓA SẢN PHẨM (MỚI THÊM) -->
<div id="delete-confirm-modal">
    <div class="modal-content bg-white rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        <div class="p-6 text-center">
            <div class="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="trash-2" class="w-8 h-8"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa sản phẩm?</h3>
            <p class="text-sm text-slate-500 mb-6">Hành động này không thể hoàn tác. Sản phẩm sẽ bị xóa vĩnh viễn khỏi hệ thống.</p>
            
            <div class="flex gap-3 justify-center">
                <button onclick="closeDeleteModal()" class="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-50 border border-slate-200 w-full">
                    Hủy bỏ
                </button>
                <button onclick="performDeleteProduct()" class="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/30 hover:bg-rose-600 w-full flex items-center justify-center gap-2">
                    Xóa ngay
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Toast -->
<div id="toast-stack" class="toast-stack"></div>

<script>
    window.role = "<?= $_SESSION['role'] ?? 'Customer' ?>";
</script>
<script src="/HeThongChamSocCaKoi/assets/js/shop/products.js"></script>

<?php include "../../includes/footer.php"; ?>