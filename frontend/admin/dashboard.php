<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\admin\dashboard.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Bảo mật: Chỉ Admin
if ($_SESSION['role'] !== 'Admin') {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$page_title = "Admin Dashboard - KoiCare System";

// ====================================================
// XỬ LÝ DỮ LIỆU (Dùng chung cho cả Load trang & AJAX)
// ====================================================
$range = $_GET['range'] ?? '7days'; // Mặc định 7 ngày
$shopId = $_GET['shop_id'] ?? 'all';

// 1. Xác định số ngày cần lấy dữ liệu
$daysToShow = 7;
if ($range == '30days') $daysToShow = 30;
if ($range == '90days') $daysToShow = 90;
if ($range == '365days') $daysToShow = 365;
if ($range == 'this_month') $daysToShow = date('d');

// 2. Query phụ cho filter Shop
$shopFilterSql = "";
if ($shopId !== 'all') {
    $shopFilterSql = " AND UserID = " . intval($shopId);
}

// 3. Tính toán KPI (Revenue & GMV) phụ thuộc vào Filter
// A. Tổng doanh thu (Phí sàn)
$sqlRevTotal = "SELECT SUM(Amount) as total FROM ShopTransactions WHERE Type = 'fee' $shopFilterSql";
$stmtRevenue = $conn->query($sqlRevTotal);
$totalRevenue = $stmtRevenue->fetch_assoc()['total'] ?? 0;

// B. Tổng GMV
if ($shopId !== 'all') {
    $totalGMV = 0;
} else {
    $stmtGMV = $conn->query("SELECT SUM(TotalAmount) as total FROM Orders WHERE Status = 'Completed'");
    $totalGMV = $stmtGMV->fetch_assoc()['total'] ?? 0;
}

// 4. Dữ liệu Biểu đồ
$chartLabels = [];
$dataRevenue = [];
$dataGMV     = [];

for ($i = $daysToShow - 1; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $displayDate = date('d/m', strtotime("-$i days"));
    
    // Doanh thu sàn theo ngày
    $sqlRev = "SELECT SUM(Amount) as revenue FROM ShopTransactions WHERE Type = 'fee' AND DATE(CreatedAt) = '$date' $shopFilterSql";
    $resRev = $conn->query($sqlRev)->fetch_assoc();
    $dailyRev = $resRev['revenue'] ?? 0;

    // GMV theo ngày (chỉ tính khi xem All shops)
    if ($shopId == 'all') {
        $sqlGMV = "SELECT SUM(TotalAmount) as gmv FROM Orders WHERE Status = 'Completed' AND DATE(CompletedAt) = '$date'";
        $resGMV = $conn->query($sqlGMV)->fetch_assoc();
        $dailyGMV = $resGMV['gmv'] ?? 0;
    } else {
        $dailyGMV = 0;
    }
    
    $chartLabels[] = $displayDate;
    $dataRevenue[] = (float)$dailyRev;
    $dataGMV[]     = (float)$dailyGMV;
}

// ====================================================
// XỬ LÝ AJAX REQUEST (Trả về JSON rồi kết thúc)
// ====================================================
if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    header('Content-Type: application/json');
    echo json_encode([
        'labels' => $chartLabels,
        'revenue' => $dataRevenue,
        'gmv' => $dataGMV,
        // Trả về HTML cho KPI để update giao diện
        'kpi_revenue' => number_format($totalRevenue, 0, ',', '.') . ' <span style="font-size:1rem; color:#9ca3af;">đ</span>',
        'kpi_gmv' => number_format($totalGMV, 0, ',', '.') . ' <span style="font-size:1rem; color:#9ca3af;">đ</span>',
        'show_gmv' => ($shopId == 'all') // Cờ để JS biết có hiện cột GMV hay không
    ]);
    exit; // Dừng chạy code tại đây để không load HTML
}

// ====================================================
// PHẦN DƯỚI NÀY CHỈ CHẠY KHI LOAD TRANG HTML
// ====================================================

// Các KPI không ảnh hưởng bởi filter (User, Disputes)
$stmtUsers = $conn->query("SELECT COUNT(*) as total FROM Users WHERE Role != 'Admin'");
$totalUsers = $stmtUsers->fetch_assoc()['total'] ?? 0;

$stmtDispute = $conn->query("SELECT COUNT(*) as total FROM Orders WHERE Status = 'AdminReview'");
$pendingDisputes = $stmtDispute->fetch_assoc()['total'] ?? 0;

// NEW: Lấy số lượng yêu cầu rút tiền đang chờ
$stmtWithdrawal = $conn->query("SELECT COUNT(*) as total FROM WithdrawalRequests WHERE Status = 'Pending'");
$pendingWithdrawals = $stmtWithdrawal->fetch_assoc()['total'] ?? 0;

// Lấy danh sách Shop cho Select Box
$shops = $conn->query("SELECT UserID, FullName FROM Users WHERE Role = 'Shop'");

include '../../includes/header.php';
?>

<!-- Import Chart.js & Icon Library -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<style>
    :root {
        --admin-bg: #f3f4f6;
        --admin-card: #ffffff;
        --text-primary: #111827;
        --text-secondary: #6b7280;
        --accent-color: #4f46e5;
        --success-color: #10b981;
        --warning-color: #f59e0b;
        --danger-color: #ef4444;
        --yellow-color: #ca8a04; /* New Color for Withdrawal */
    }

    body { background-color: var(--admin-bg); font-family: 'Inter', system-ui, sans-serif; }

    .admin-wrapper {
        max-width: 1400px;
        margin: 0 auto;
        padding: 30px 20px;
    }

    /* Header Section */
    .admin-header {
        margin-bottom: 30px;
    }
    .admin-header h1 { margin: 0; font-size: 1.8rem; color: var(--text-primary); }
    .admin-header p { margin: 5px 0 0; color: var(--text-secondary); }
    
    /* Form Filter Style */
    .filter-group {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    .filter-select {
        padding: 6px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: white;
        color: var(--text-secondary);
        font-weight: 500;
        cursor: pointer;
        font-size: 0.85rem;
        outline: none;
    }
    .filter-select:focus { border-color: var(--accent-color); }

    /* KPI Grid (Update to 5 columns if needed later, currently 4 is enough) */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); /* Adjusted min-width for more cards */
        gap: 20px;
        margin-bottom: 30px;
    }

    .kpi-card {
        background: var(--admin-card);
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb;
        transition: transform 0.2s;
        position: relative;
        overflow: hidden;
    }
    .kpi-card:hover { transform: translateY(-2px); border-color: var(--accent-color); }
    
    .kpi-icon {
        width: 48px; height: 48px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem;
        margin-bottom: 16px;
    }
    .kpi-title { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin-top: 5px; }
    .kpi-sub { font-size: 0.8rem; color: var(--success-color); margin-top: 5px; display: flex; align-items: center; gap: 4px; }

    /* Colors */
    .bg-indigo { background: #e0e7ff; color: #4f46e5; }
    .bg-green { background: #d1fae5; color: #059669; }
    .bg-orange { background: #ffedd5; color: #ea580c; }
    .bg-red { background: #fee2e2; color: #dc2626; }
    .bg-yellow { background: #fef9c3; color: var(--yellow-color); } /* New Color for Withdrawal */

    /* Layout Content */
    .content-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 25px;
    }

    /* Chart Section */
    .chart-box {
        background: var(--admin-card);
        padding: 25px;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb;
    }
    .chart-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 20px; 
        flex-wrap: wrap;
        gap: 15px;
    }
    .chart-title-group {
        display: flex;
        flex-direction: column;
    }
    .chart-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .chart-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; }

    /* Quick Links & Tasks */
    .side-panel { display: flex; flex-direction: column; gap: 20px; }
    
    .menu-card {
        background: var(--admin-card);
        padding: 20px;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
    }
    .menu-item {
        display: flex; align-items: center; gap: 15px;
        padding: 15px;
        border-radius: 10px;
        text-decoration: none;
        color: var(--text-primary);
        font-weight: 600;
        transition: 0.2s;
        margin-bottom: 8px;
        background: #f9fafb;
    }
    .menu-item:last-child { margin-bottom: 0; }
    .menu-item:hover { background: #f3f4f6; color: var(--accent-color); }
    .menu-item i { width: 24px; text-align: center; font-size: 1.1rem; }
    .badge-count {
        margin-left: auto;
        background: var(--danger-color);
        color: white;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 10px;
    }

    /* Alert Box */
    .alert-box {
        padding: 15px;
        border-radius: 10px;
        margin-top: 15px;
    }
    .alert-title { color: #991b1b; font-weight: 700; font-size: 0.9rem; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
    .alert-desc { color: #7f1d1d; font-size: 0.85rem; }

    /* Added Alert Box Styles for Feedback */
    .alert-box-error {
        background: #fef2f2; /* Red 50 */
        border: 1px solid #fecaca; /* Red 200 */
    }
    .alert-box-error .alert-title {
        color: #991b1b; /* Red 800 */
    }
    .alert-box-error .alert-desc {
        color: #7f1d1d; /* Red 900 */
    }
    .alert-box-success {
        background: #ecfdf5; /* Green 50 */
        border: 1px solid #a7f3d0; /* Green 200 */
    }
    .alert-box-success .alert-title {
        color: #065f46; /* Green 800 */
    }
    .alert-box-success .alert-desc {
        color: #065f46; /* Green 800 */
    }

    /* New Action Button Style */
    .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 10px 15px;
        margin-top: 15px;
        border: none;
        border-radius: 8px;
        background-color: var(--accent-color);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
        gap: 8px;
        font-size: 0.9rem;
    }
    .action-btn:hover {
        background-color: #4338ca; /* Indigo 700 */
    }
    .action-btn:active {
        transform: scale(0.99);
    }
    .action-btn:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
    }

    @media (max-width: 1024px) {
        .content-grid { grid-template-columns: 1fr; }
        .chart-header { flex-direction: column; align-items: flex-start; }
        .filter-group { width: 100%; justify-content: space-between; margin-top: 10px; }
        .filter-select { flex: 1; }
    }
</style>

<div class="admin-wrapper">
    <!-- Header -->
    <div class="admin-header">
        <h1>Tổng Quan Hệ Thống</h1>
        <p>Chào mừng quản trị viên quay trở lại.</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
        <!-- 1. Doanh thu hệ thống -->
        <div class="kpi-card">
            <div class="kpi-icon bg-indigo"><i class="fa-solid fa-coins"></i></div>
            <div class="kpi-title">Doanh Thu Hệ Thống (Phí)</div>
            <!-- Thêm ID để AJAX update -->
            <div class="kpi-value" id="kpiRevenue"><?= number_format($totalRevenue, 0, ',', '.') ?> <span style="font-size:1rem; color:#9ca3af;">đ</span></div>
            <div class="kpi-sub"><i class="fa-solid fa-arrow-trend-up"></i> Gồm phí sàn & phí phạt</div>
        </div>

        <!-- 2. GMV -->
        <div class="kpi-card">
            <div class="kpi-icon bg-green"><i class="fa-solid fa-cart-shopping"></i></div>
            <div class="kpi-title">Tổng Giá Trị Giao Dịch (GMV)</div>
            <!-- Thêm ID để AJAX update -->
            <div class="kpi-value" id="kpiGMV"><?= number_format($totalGMV, 0, ',', '.') ?> <span style="font-size:1rem; color:#9ca3af;">đ</span></div>
            <div class="kpi-sub">Quy mô dòng tiền qua sàn</div>
        </div>

        <!-- 3. Yêu cầu Rút tiền -->
        <div class="kpi-card" style="<?= $pendingWithdrawals > 0 ? 'border-color:var(--warning-color);' : '' ?>">
            <div class="kpi-icon bg-yellow"><i class="fa-solid fa-money-check-dollar"></i></div>
            <div class="kpi-title">Yêu cầu Rút tiền Cần Xử Lý</div>
            <div class="kpi-value" style="<?= $pendingWithdrawals > 0 ? 'color:var(--warning-color);' : '' ?>">
                <?= $pendingWithdrawals ?>
            </div>
            <div class="kpi-sub" style="color:var(--warning-color);">Cần kiểm tra ngay</div>
        </div>

        <!-- 4. Người dùng -->
        <div class="kpi-card">
            <div class="kpi-icon bg-orange"><i class="fa-solid fa-users"></i></div>
            <div class="kpi-title">Tổng Người Dùng</div>
            <div class="kpi-value"><?= number_format($totalUsers) ?></div>
            <div class="kpi-sub">Shop & Khách hàng</div>
        </div>

        <!-- 5. Khiếu nại -->
        <div class="kpi-card" style="<?= $pendingDisputes > 0 ? 'border-color:var(--danger-color);' : '' ?>">
            <div class="kpi-icon bg-red"><i class="fa-solid fa-gavel"></i></div>
            <div class="kpi-title">Đơn Khiếu Nại Cần Xử Lý</div>
            <div class="kpi-value" style="<?= $pendingDisputes > 0 ? 'color:var(--danger-color);' : '' ?>">
                <?= $pendingDisputes ?>
            </div>
            <div class="kpi-sub" style="color:var(--danger-color);">Cần hành động ngay</div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content-grid">
        
        <!-- Left: Chart & Filters -->
        <div class="chart-box">
            <div class="chart-header">
                <div class="chart-title-group">
                    <div class="chart-title">
                        Biểu đồ tăng trưởng
                    </div>
                    <div class="chart-subtitle">
                        <span style="color:#4f46e5; margin-right:10px;">● Phí thu được</span>
                        <!-- GMV Legend: Ẩn/Hiện bằng JS sau này nếu cần, hiện tại fix cứng -->
                        <span id="legendGMV" style="color:#10b981; margin-right:10px; display: <?= $shopId == 'all' ? 'inline' : 'none' ?>;">■ GMV</span>
                    </div>
                </div>

                <!-- FORM BỘ LỌC AJAX -->
                <div class="filter-group">
                    <!-- Filter Shop -->
                    <select id="filterShop" class="filter-select" onchange="updateDashboard()">
                        <option value="all">-- Tất cả Shop --</option>
                        <?php while($s = $shops->fetch_assoc()): ?>
                            <option value="<?= $s['UserID'] ?>" <?= $shopId == $s['UserID'] ? 'selected' : '' ?>>
                                <?= htmlspecialchars($s['FullName']) ?>
                            </option>
                        <?php endwhile; ?>
                    </select>

                    <!-- Filter Thời gian -->
                    <select id="filterRange" class="filter-select" onchange="updateDashboard()">
                        <option value="7days" <?= $range == '7days' ? 'selected' : '' ?>>7 ngày qua</option>
                        <option value="30days" <?= $range == '30days' ? 'selected' : '' ?>>30 ngày qua</option>
                        <option value="90days" <?= $range == '90days' ? 'selected' : '' ?>>90 ngày qua</option>
                        <option value="365days" <?= $range == '365days' ? 'selected' : '' ?>>1 năm qua</option>
                        <option value="this_month" <?= $range == 'this_month' ? 'selected' : '' ?>>Tháng này</option>
                    </select>
                </div>
            </div>

            <div style="height: 350px; width: 100%;">
                <canvas id="adminChart"></canvas>
            </div>
        </div>

        <!-- Right: Menu & Tasks -->
        <div class="side-panel">
            <div class="menu-card">
                <h3 style="margin-top:0; margin-bottom:15px; font-size:1.1rem; color:var(--text-primary);">Quản lý</h3>
                <a href="users_management.php" class="menu-item"><i class="fa-solid fa-user-gear" style="color:#0ea5e9;"></i> Quản lý người dùng</a>
                <a href="/HeThongChamSocCaKoi/frontend/community/admin/ban_appeals.php" class="menu-item"><i class="fa-solid fa-newspaper" style="color:#8b5cf6;"></i> Quản lý cộng đồng (Forum)</a>
                
                <!-- NEW: Quản lý Rút tiền -->
                <a href="withdrawal_management.php" class="menu-item" style="<?= $pendingWithdrawals > 0 ? 'background:#fef9c3; border:1px solid #fcd34d;' : '' ?>">
                    <i class="fa-solid fa-money-check-dollar" style="color:#f59e0b;"></i> Xử lý Rút tiền
                    <?php if($pendingWithdrawals > 0): ?><span class="badge-count"><?= $pendingWithdrawals ?></span><?php endif; ?>
                </a>
                
                <a href="disputes.php" class="menu-item" style="<?= $pendingDisputes > 0 ? 'background:#fef2f2; border:1px solid #fecaca;' : '' ?>">
                    <i class="fa-solid fa-scale-balanced" style="color:#ef4444;"></i> Xử lý khiếu nại
                    <?php if($pendingDisputes > 0): ?><span class="badge-count"><?= $pendingDisputes ?></span><?php endif; ?>
                </a>
                <a href="deposit_management.php" class="menu-item"><i class="fa-solid fa-money-bill-transfer" style="color:#10b981;"></i> Quản lý Ký quỹ</a>
                <a href="../shop/vouchers.php" class="menu-item"><i class="fa-solid fa-ticket" style="color:#db2777;"></i> Quản lý mã giảm giá</a>
                <a href="system_settings.php" class="menu-item"><i class="fa-solid fa-sliders" style="color:#64748b;"></i> Cấu hình hệ thống</a>
            </div>

            <div class="menu-card">
                <h3 style="margin-top:0; margin-bottom:15px; font-size:1.1rem;">Trạng thái hệ thống</h3>
                <div style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6;">
                    <div><i class="fa-solid fa-server" style="color:#10b981; margin-right:8px;"></i> Database: <strong>Connected</strong></div>
                    <div><i class="fa-solid fa-shield-halved" style="color:#10b981; margin-right:8px;"></i> SSL: <strong>Secure</strong></div>
                    <div><i class="fa-solid fa-clock" style="color:#6b7280; margin-right:8px;"></i> Backup: <strong>2 giờ trước</strong></div>
                </div>
                
                <!-- Vị trí hiển thị kết quả Hủy đơn tự động -->
                <div class="alert-box alert-box-success" id="autoCancelResult" style="display:none; margin-top: 15px;">
                    <!-- Message here -->
                </div>

                <!-- Nút chạy Hủy đơn tự động -->
                <button id="btnAutoCancel" onclick="triggerAutoCancel()" class="action-btn">
                    <i class="fa-solid fa-clock-rotate-left"></i> Chạy Hủy Đơn Quá Hạn
                </button>

                <?php if ($pendingDisputes > 0): ?>
                    <div class="alert-box alert-box-error" style="margin-top: 15px;">
                        <div class="alert-title"><i class="fa-solid fa-triangle-exclamation"></i> Cảnh báo</div>
                        <div class="alert-desc">Có <?= $pendingDisputes ?> vụ tranh chấp đang chờ Admin phán quyết.</div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script>
    const ctx = document.getElementById('adminChart').getContext('2d');
    
    // Khởi tạo Chart
    let adminChart = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: <?= json_encode($chartLabels) ?>,
            datasets: [
                {
                    label: 'Doanh thu Sàn (Phí)',
                    data: <?= json_encode($dataRevenue) ?>,
                    type: 'line', 
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                <?php if($shopId == 'all'): ?>
                {
                    label: 'Tổng GMV (Giá trị đơn)',
                    data: <?= json_encode($dataGMV) ?>,
                    type: 'bar', 
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    barPercentage: 0.5,
                    yAxisID: 'y1'
                }
                <?php endif; ?>
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false }, 
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Doanh thu (VNĐ)' },
                    grid: { borderDash: [5, 5] }
                },
                y1: {
                    type: 'linear',
                    display: <?= $shopId == 'all' ? 'true' : 'false' ?>, // Ẩn hiện trục Y bên phải
                    position: 'right',
                    title: { display: true, text: 'GMV (VNĐ)' },
                    grid: { drawOnChartArea: false } 
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Hàm gọi AJAX cập nhật dữ liệu
    function updateDashboard() {
        const shopId = document.getElementById('filterShop').value;
        const range = document.getElementById('filterRange').value;

        // Hiệu ứng mờ nhẹ để báo đang load
        document.querySelector('.chart-box').style.opacity = '0.7';

        fetch(`?ajax=1&shop_id=${shopId}&range=${range}`)
            .then(response => response.json())
            .then(data => {
                // 1. Update Chart Data
                adminChart.data.labels = data.labels;
                adminChart.data.datasets[0].data = data.revenue;

                // Xử lý Dataset GMV (Thêm/Sửa/Xóa)
                if (data.show_gmv) {
                    // Nếu cần hiện GMV
                    if (adminChart.data.datasets.length < 2) {
                        // Nếu chưa có thì thêm vào
                        adminChart.data.datasets.push({
                            label: 'Tổng GMV (Giá trị đơn)',
                            data: data.gmv,
                            type: 'bar', 
                            backgroundColor: '#10b981',
                            borderRadius: 4,
                            barPercentage: 0.5,
                            yAxisID: 'y1'
                        });
                    } else {
                        // Nếu đã có thì update data
                        adminChart.data.datasets[1].data = data.gmv;
                    }
                    // Hiện trục Y1 và Legend
                    adminChart.options.scales.y1.display = true;
                    document.getElementById('legendGMV').style.display = 'inline';
                } else {
                    // Nếu ẩn GMV (khi chọn Shop cụ thể)
                    if (adminChart.data.datasets.length > 1) {
                        adminChart.data.datasets.pop(); // Xóa dataset GMV
                    }
                    // Ẩn trục Y1 và Legend
                    adminChart.options.scales.y1.display = false;
                    document.getElementById('legendGMV').style.display = 'none';
                }

                adminChart.update();

                // 2. Update KPI Text
                document.getElementById('kpiRevenue').innerHTML = data.kpi_revenue;
                document.getElementById('kpiGMV').innerHTML = data.kpi_gmv;

                // Hoàn tất
                document.querySelector('.chart-box').style.opacity = '1';
            })
            .catch(error => {
                console.error('Lỗi tải dữ liệu:', error);
                document.querySelector('.chart-box').style.opacity = '1';
            });
    }

    // Hàm gọi API tự động hủy đơn hàng
    /**
 * Hàm gọi API và hiển thị thông báo cho người dùng trên Dashboard
 * Đã sửa lỗi truy cập sai tên thuộc tính (processed -> processed_count)
 */
async function triggerAutoCancel() {
    const btn = document.getElementById('btnAutoCancel');
    const resultBox = document.getElementById('autoCancelResult');
    
    if (!btn || !resultBox) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    resultBox.style.display = 'none';
    resultBox.classList.remove('alert-box-success', 'alert-box-error');

    try {
        // Đường dẫn đến file PHP backend
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/admin/auto_cancel_overdue.php', {
            method: 'GET'
        });

        const data = await response.json();
        
        resultBox.style.display = 'block';

        if (data.success) {
            // SỬA LỖI TẠI ĐÂY: Sử dụng data.processed_count thay vì data.processed
            const count = data.processed_count;

            resultBox.classList.add('alert-box-success');
            resultBox.innerHTML = `
                <div class="alert-title"><i class="fa-solid fa-circle-check"></i> Hoàn tất</div>
                <div class="alert-desc">
                    Đã xử lý hủy tự động. Tổng cộng <strong>${count}</strong> đơn hàng đã được hủy và hoàn tiền (nếu đã thanh toán).
                </div>`;
        } else {
            // Hiển thị thông báo lỗi từ server
            resultBox.classList.add('alert-box-error');
            resultBox.innerHTML = `
                <div class="alert-title"><i class="fa-solid fa-circle-xmark"></i> Lỗi xử lý</div>
                <div class="alert-desc">Lỗi hệ thống: ${data.error || 'Lỗi không xác định.'} Vui lòng kiểm tra log server.</div>`;
        }
    } catch (error) {
        // Lỗi kết nối hoặc lỗi cú pháp JSON
        resultBox.style.display = 'block';
        resultBox.classList.add('alert-box-error');
        resultBox.innerHTML = `
            <div class="alert-title"><i class="fa-solid fa-circle-xmark"></i> Lỗi kết nối</div>
            <div class="alert-desc">Không thể kết nối đến máy chủ API: ${error.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Chạy Hủy Đơn Quá Hạn (Test)';
    }
}
</script>

<?php include '../../includes/footer.php'; ?>