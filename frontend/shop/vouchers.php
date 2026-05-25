<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\vouchers.php
require_once '../../includes/check_login.php';

// Chặn truy cập nếu không phải Admin hoặc Shop
$role = $_SESSION['role'] ?? 'Customer';
if (!in_array($role, ['Admin', 'Shop'], true)) {
    http_response_code(403);
    echo "❌ Bạn không có quyền truy cập trang này.";
    exit;
}

$page_title = "Quản lý mã giảm giá - KoiCare Shop";
include "../../includes/header.php";

// Lấy thông tin UserID để truyền vào JS (dùng cho Scope của Shop)
$userId = (int)($_SESSION['userid'] ?? $_SESSION['user_id'] ?? 0);
?>
<!-- Load CSS mới -->
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/vouchers.css">
<!-- Load Phosphor Icons -->
<script src="https://unpkg.com/@phosphor-icons/web"></script>
<!-- Đảm bảo font Inter được load -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">


<div class="page-container">
    
    <!-- FIX: Loại bỏ padding-top 64px (h-16) nếu header phụ không còn sticky -->
    <div class="container"> 
        
        <!-- Header (Không sticky, nằm ngay dưới Header chính) -->
        <header class="page-header">
            <div class="page-title">
                <h1>
                    <div class="icon-box"><i class="ph ph-ticket"></i></div>
                    Quản lý mã giảm giá
                </h1>
                <p class="text-xs text-muted">
                    Tạo, theo dõi và tối ưu các mã giảm giá để tăng đơn hàng trên KoiCare Shop.
                </p>
                <p class="text-xs text-secondary-muted mt-1">
                    <?php if ($role === 'Admin'): ?>
                        Bạn đang đăng nhập với quyền <strong>Admin</strong> – có thể tạo mã áp dụng toàn bộ hệ thống.
                    <?php else: ?>
                        Bạn đang đăng nhập với quyền <strong>Shop</strong> – quản lý mã giảm giá riêng cho shop của bạn.
                    <?php endif; ?>
                </p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="openVoucherForm('create')">
                    <i class="ph ph-plus-circle"></i> Tạo mã mới
                </button>
            </div>
        </header>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon bg-blue-light"><i class="ph ph-files"></i></div>
                <div class="stat-info">
                    <span class="value" id="stat-total-vouchers">—</span>
                    <span class="label">Tổng số mã</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-green-light"><i class="ph ph-check-circle"></i></div>
                <div class="stat-info">
                    <span class="value" id="stat-active-vouchers">—</span>
                    <span class="label">Đang hoạt động</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-orange-light"><i class="ph ph-warning-circle"></i></div>
                <div class="stat-info">
                    <span class="value" id="stat-inactive-vouchers">—</span>
                    <span class="label">Đã hết / Ngừng</span>
                </div>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
            <div class="toolbar-top">
                <div class="search-box">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" id="search-input" placeholder="Tìm kiếm mã voucher, ghi chú...">
                </div>
                
                <select class="filter-select" id="status-filter">
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động / Hết hạn</option>
                </select>

                <select class="filter-select" id="scope-filter">
                    <option value="">Tất cả phạm vi</option>
                    <option value="system">Mã hệ thống</option>
                    <option value="shop">Mã shop</option>
                </select>

                <select class="filter-select" id="sort-select">
                    <option value="CreatedAt|DESC">Mới tạo nhất</option>
                    <option value="EndDate|ASC">Ngày hết hạn gần nhất</option>
                    <option value="Usage|DESC">Lượt dùng nhiều</option>
                    <option value="Code|ASC">Mã A-Z</option>
                </select>
            </div>
            <div class="toolbar-bottom">
                 <span class="toolbar-result" id="toolbar-result">Đang tải dữ liệu...</span>
            </div>
        </div>

        <!-- Grid Danh Sách Voucher -->
        <div class="voucher-grid" id="voucher-rows">
            <!-- JS RENDER CARDS HERE -->
        </div>
        
        <!-- Empty State -->
        <div class="empty-state" id="voucher-empty" style="display:none;">
            <div class="empty-icon"><i class="ph ph-ticket"></i></div>
            <div class="empty-text-main">Chưa có mã giảm giá nào được tìm thấy.</div>
            <div class="empty-text-sub">
                Hãy thử thay đổi bộ lọc hoặc tạo mã giảm giá đầu tiên của bạn.
            </div>
            <button type="button" class="btn primary" onclick="openVoucherForm('create')">
                <i class="ph ph-plus-circle"></i> <span>Tạo mã giảm giá</span>
            </button>
        </div>

        <!-- Pagination -->
        <div class="pagination">
            <button id="prev-page" class="btn btn-ghost small" disabled>
                <i class="ph ph-caret-left"></i> Trang trước
            </button>
            <span id="page-info">Trang 1 / 1</span>
            <button id="next-page" class="btn btn-ghost small" disabled>
                Trang sau <i class="ph ph-caret-right"></i>
            </button>
        </div>

    </div>
</div>

<!-- Modal Form -->
<div class="modal-overlay" id="voucher-form-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title" id="voucher-form-title">Tạo mã giảm giá mới</h3>
            <button class="close-modal" onclick="closeVoucherForm()">&times;</button>
        </div>
        <form id="voucher-form">
            <input type="hidden" name="VoucherID" id="voucher-id">
            <div class="modal-body">
                <div class="form-grid">
                    
                    <!-- Mã Voucher -->
                    <div class="col-span-2 form-group">
                        <label>Mã Voucher <span style="color:red">*</span></label>
                        <input type="text" class="form-control" id="voucher-code" name="Code" required placeholder="VD: KOISALE2025" style="text-transform: uppercase; font-weight: bold;">
                        <small class="hint">Nên dùng chữ in hoa, không dấu, không khoảng trắng.</small>
                    </div>
                    
                    <!-- Loại giảm giá -->
                    <div class="form-group">
                        <label>Loại giảm giá <span style="color:red">*</span></label>
                        <select class="form-control" id="voucher-discount-type" name="DiscountType">
                            <option value="percent">Theo phần trăm (%)</option>
                            <option value="fixed">Số tiền cố định (VNĐ)</option>
                        </select>
                    </div>

                    <!-- Giá trị giảm -->
                    <div class="form-group">
                        <label>Giá trị giảm <span style="color:red">*</span></label>
                        <div style="position: relative;">
                            <input type="number" step="0.01" min="0" class="form-control" id="voucher-discount-value" name="DiscountValue" required placeholder="0">
                            <span style="position: absolute; right: 10px; top: 10px; color: #64748b; font-weight: bold; font-size: 13px;" id="suffix-unit">%</span>
                        </div>
                    </div>

                    <!-- Đơn tối thiểu -->
                    <div class="form-group">
                        <label>Đơn tối thiểu (VNĐ)</label>
                        <input type="number" step="0.01" min="0" class="form-control" id="voucher-min-order" name="MinOrderAmount" value="0" placeholder="0 VNĐ">
                    </div>

                    <!-- Giảm tối đa -->
                    <div class="form-group" id="group-max-discount">
                        <label>Giảm tối đa (VNĐ)</label>
                        <input type="number" step="0.01" min="0" class="form-control" id="voucher-max-discount" name="MaxDiscountAmount" placeholder="Để trống nếu không giới hạn">
                        <small class="hint">Chỉ áp dụng cho mã theo %.</small>
                    </div>

                    <!-- Phạm vi (Chỉ Admin mới có thể chọn System) -->
                    <div class="col-span-2 form-group">
                        <label>Phạm vi áp dụng</label>
                        <?php if ($role === 'Shop'): ?>
                            <input type="hidden" id="voucher-scope" name="Scope" value="shop">
                            <div class="badge-scope shop-scope p-2 rounded-lg">Mã của shop bạn (<?= htmlspecialchars($_SESSION['shop_name'] ?? 'Shop cá Koi') ?>)</div>
                        <?php else: ?>
                            <select class="form-control" id="voucher-scope" name="Scope">
                                <option value="system">Mã hệ thống (áp dụng toàn sàn)</option>
                                <option value="shop">Mã của shop hiện tại (<?= htmlspecialchars($_SESSION['shop_name'] ?? 'Shop cá Koi') ?>)</option>
                            </select>
                            <small class="hint">Admin có thể chọn mã hệ thống hoặc mã shop.</small>
                        <?php endif; ?>
                    </div>
                    
                    <!-- Thời gian hiệu lực -->
                    <div class="form-group">
                        <label>Ngày bắt đầu <span style="color:red">*</span></label>
                        <input type="datetime-local" class="form-control" id="voucher-start" name="StartDate" required>
                    </div>

                    <div class="form-group">
                        <label>Ngày kết thúc <span style="color:red">*</span></label>
                        <input type="datetime-local" class="form-control" id="voucher-end" name="EndDate" required>
                    </div>

                    <!-- Giới hạn sử dụng -->
                    <div class="form-group">
                        <label>Tổng lượt dùng</label>
                        <input type="number" min="0" class="form-control" id="voucher-usage-total" name="UsageLimitTotal" placeholder="Không giới hạn">
                    </div>

                    <div class="form-group">
                        <label>Lượt dùng / người</label>
                        <input type="number" min="0" class="form-control" id="voucher-usage-user" name="UsageLimitPerUser" placeholder="Không giới hạn (mặc định 1)">
                    </div>

                    <!-- Trạng thái -->
                    <div class="form-group">
                        <label for="voucher-status">Trạng thái</label>
                        <select class="form-control" id="voucher-status" name="Status">
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Ngừng hoạt động</option>
                        </select>
                    </div>

                    <!-- Ghi chú nội bộ -->
                    <div class="col-span-2 form-group">
                        <label>Ghi chú nội bộ</label>
                        <textarea class="form-control" id="voucher-note" name="Note" rows="3" placeholder="VD: Mã mừng khai trương, chỉ áp dụng cho sản phẩm thức ăn..."></textarea>
                        <small class="hint">Ghi chú này chỉ hiển thị cho Admin/Shop.</small>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" onclick="closeVoucherForm()">Hủy bỏ</button>
                <button type="submit" id="voucher-form-submit" class="btn btn-primary">
                    <i class="ph ph-floppy-disk"></i> <span>Lưu mã giảm giá</span>
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Toast -->
<div id="toast-stack" class="toast-stack"></div>


<script>
    // Truyền biến PHP vào JS
    window.currentRole = "<?= htmlspecialchars($role, ENT_QUOTES) ?>";
    window.currentUserId = <?= $userId ?>;
</script>
<script src="/HeThongChamSocCaKoi/assets/js/shop/vouchers.js"></script>

<?php include "../../includes/footer.php"; ?>