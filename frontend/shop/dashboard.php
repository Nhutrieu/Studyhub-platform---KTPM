<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\dashboard.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Chỉ cho phép Shop truy cập
if ($_SESSION['role'] !== 'Shop') {
    // Nếu là request AJAX mà không có quyền -> trả lỗi JSON
    if (isset($_GET['ajax'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$shopId = $_SESSION['userid'];

// ====================================================
// 1. XỬ LÝ DỮ LIỆU BIỂU ĐỒ (DÙNG CHUNG CHO CẢ LOAD TRANG VÀ AJAX)
// ====================================================

// Mặc định: 7 ngày gần nhất
$default_start = date('Y-m-d', strtotime('-6 days'));
$default_end = date('Y-m-d');

// Lấy giá trị từ GET request
// **Đã gõ lại các dòng này để loại bỏ ký tự trắng ẩn**
$filter_start = isset($_GET['start_date']) && !empty($_GET['start_date']) ? $_GET['start_date'] : $default_start;
$filter_end = isset($_GET['end_date']) && !empty($_GET['end_date']) ? $_GET['end_date'] : $default_end;

// Đảm bảo ngày kết thúc không nhỏ hơn ngày bắt đầu
if ($filter_start > $filter_end) {
    $temp = $filter_start;
    $filter_start = $filter_end;
    $filter_end = $temp;
}

// Query dữ liệu biểu đồ
$sqlChart = "
    SELECT DATE(o.CompletedAt) as report_date, SUM(o.NetEarnings) as revenue
    FROM Orders o
    JOIN OrderDetail od ON o.OrderID = od.OrderID
    JOIN Product p ON od.ProductID = p.ProductID
    WHERE p.ShopID = ? 
      AND o.Status = 'Completed' 
      AND DATE(o.CompletedAt) BETWEEN ? AND ?
    GROUP BY DATE(o.CompletedAt)
    ORDER BY report_date ASC
";

$stmtC = $conn->prepare($sqlChart);
$stmtC->bind_param("iss", $shopId, $filter_start, $filter_end);
$stmtC->execute();
$resultChart = $stmtC->get_result();

$dbData = [];
while ($row = $resultChart->fetch_assoc()) {
    $dbData[$row['report_date']] = (float)$row['revenue'];
}
$stmtC->close();

// Chuẩn bị dữ liệu đầy đủ cho các ngày (lấp đầy ngày trống bằng 0)
$chartLabels = [];
$chartData = [];

$currentDate = new DateTime($filter_start);
$endDateObj = new DateTime($filter_end);
$endDateObj->modify('+1 day'); // Để vòng lặp bao gồm cả ngày cuối cùng

$interval = DateInterval::createFromDateString('1 day');
$period = new DatePeriod($currentDate, $interval, $endDateObj);

// **Đã làm sạch hoàn toàn vòng lặp này để khắc phục lỗi line 77**
foreach ($period as $dt) {
    $dateKey = $dt->format("Y-m-d"); 
    $displayDate = $dt->format("d/m"); 
    
    $chartLabels[] = $displayDate;
    $chartData[] = isset($dbData[$dateKey]) ? $dbData[$dateKey] : 0;
}

$totalPeriodRevenue = array_sum($chartData);

// ====================================================
// 2. TRẢ VỀ JSON NẾU LÀ AJAX REQUEST (Không render HTML)
// ====================================================
if (isset($_GET['ajax']) && $_GET['ajax'] == 1) {
    header('Content-Type: application/json');
    echo json_encode([
        'labels' => $chartLabels,
        'data' => $chartData,
        'totalRevenue' => $totalPeriodRevenue,
        'formattedTotal' => number_format($totalPeriodRevenue, 0, ',', '.') . ' đ',
        'startDate' => $filter_start,
        'endDate' => $filter_end
    ]);
    exit; // Dừng thực thi PHP tại đây
}

// ====================================================
// 3. NẾU KHÔNG PHẢI AJAX => LẤY DỮ LIỆU CARD & RENDER HTML
// ====================================================

$page_title = "Kênh Người Bán - Dashboard";

// A. Tổng sản phẩm
$stmtProd = $conn->prepare("SELECT COUNT(*) as total FROM Product WHERE ShopID = ?");
$stmtProd->bind_param("i", $shopId);
$stmtProd->execute();
$prodCount = $stmtProd->get_result()->fetch_assoc()['total'];
$stmtProd->close();

// B. Đơn cần xử lý (Pending + Processing)
$stmtOrder = $conn->prepare("
    SELECT COUNT(DISTINCT o.OrderID) as total
    FROM Orders o
    JOIN OrderDetail od ON o.OrderID = od.OrderID
    JOIN Product p ON od.ProductID = p.ProductID
    WHERE p.ShopID = ? AND o.Status IN ('Pending', 'Processing')
");
$stmtOrder->bind_param("i", $shopId);
$stmtOrder->execute();
$orderPendingCount = $stmtOrder->get_result()->fetch_assoc()['total'];
$stmtOrder->close();

// C. Số dư ví (Giữ lại cho các tính năng khác, không dùng cho card "Doanh thu" nữa)
$stmtWallet = $conn->prepare("SELECT AccountBalance FROM Users WHERE UserID = ?");
$stmtWallet->bind_param("i", $shopId);
$stmtWallet->execute();
$walletBalance = $stmtWallet->get_result()->fetch_assoc()['AccountBalance'] ?? 0;
$stmtWallet->close();

// D. Voucher Active
$stmtVoucher = $conn->prepare("SELECT COUNT(*) as total FROM Voucher WHERE ShopID = ? AND Status = 'active' AND EndDate >= NOW()");
$stmtVoucher->bind_param("i", $shopId);
$stmtVoucher->execute();
$voucherCount = $stmtVoucher->get_result()->fetch_assoc()['total'];
$stmtVoucher->close();

// E. Tổng doanh thu tích lũy (Tổng doanh thu bán hàng - Gross Sales, không tính phí và ký quỹ)
// Truy vấn tổng TotalAmount (giá trị đơn hàng) của các đơn hàng đã hoàn thành có sản phẩm của Shop này.
$sqlCumulativeRevenue = "
    SELECT COALESCE(SUM(o.TotalAmount), 0) as total_gross_revenue
    FROM Orders o
    WHERE o.OrderID IN (
        SELECT DISTINCT od.OrderID
        FROM OrderDetail od
        JOIN Product p ON od.ProductID = p.ProductID
        WHERE p.ShopID = ?
    )
    AND o.Status = 'Completed'
";
$stmtCumulativeRevenue = $conn->prepare($sqlCumulativeRevenue);
$stmtCumulativeRevenue->bind_param("i", $shopId);
$stmtCumulativeRevenue->execute();
$totalCumulativeRevenue = $stmtCumulativeRevenue->get_result()->fetch_assoc()['total_gross_revenue'] ?? 0;
$stmtCumulativeRevenue->close();


include '../../includes/header.php';
?>

<!-- Thư viện Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
    :root {
        --primary-blue: #0ea5e9;
        --secondary-bg: #f1f5f9;
        --text-dark: #0f172a;
        --text-gray: #64748b;
    }

    body { background-color: var(--secondary-bg); font-family: system-ui, -apple-system, sans-serif; }

    .dashboard-container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }

    /* Banner */
    .welcome-banner {
        background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;
        border-left: 5px solid var(--primary-blue);
        box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
    }
    .welcome-text h1 { margin: 0; font-size: 1.5rem; color: var(--text-dark); }
    .welcome-text p { margin: 5px 0 0; color: var(--text-gray); }
    .date-badge { background: #e0f2fe; color: #0284c7; padding: 8px 15px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }

    /* Cards Grid */
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
    
    .dash-card {
        background: white; border-radius: 12px; padding: 20px;
        border: 1px solid #e2e8f0; text-decoration: none; color: inherit;
        transition: 0.2s; display: flex; flex-direction: column;
    }
    .dash-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1); border-color: var(--primary-blue); }
    
    .card-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
    .card-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
    .card-products .card-icon { background: #e0f2fe; color: #0284c7; }
    .card-orders .card-icon { background: #ffedd5; color: #ea580c; }
    .card-wallet .card-icon { background: #dcfce7; color: #16a34a; }
    .card-vouchers .card-icon { background: #f3e8ff; color: #9333ea; }
    
    .card-title { color: var(--text-gray); font-size: 0.9rem; font-weight: 600; }
    .card-value { font-size: 1.8rem; font-weight: 700; color: var(--text-dark); margin-top: 5px; }
    .card-link { font-size: 0.85rem; color: var(--primary-blue); font-weight: 600; margin-top: auto; }

    /* Chart Section & Filter */
    .chart-section {
        background: white; border-radius: 12px; padding: 25px;
        border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        margin-bottom: 30px;
    }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
    .chart-info h3 { margin: 0; color: var(--text-dark); font-size: 1.2rem; }
    .chart-info span { font-size: 0.9rem; color: var(--text-gray); }

    /* Filter Form Styles */
    .filter-form { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: 5px; }
    .form-control-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; }
    .btn-filter { background: var(--primary-blue); color: white; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.2s; }
    .btn-filter:hover { background: #0284c7; }
    .btn-filter:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .quick-filters a {
        padding: 5px 10px; font-size: 0.85rem; background: #f1f5f9; color: var(--text-dark);
        text-decoration: none; border-radius: 5px; margin-right: 5px; transition: 0.2s; cursor: pointer;
    }
    .quick-filters a:hover, .quick-filters a.active { background: #e0f2fe; color: #0284c7; font-weight: 600; }

    /* Quick Actions */
    .quick-actions h3 { color: var(--text-dark); font-size: 1.2rem; margin-bottom: 15px; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .action-btn {
        background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;
        text-decoration: none; color: var(--text-dark); font-weight: 600;
        display: flex; align-items: center; gap: 10px; transition: 0.2s;
    }
    .action-btn:hover { background: #f8fafc; border-color: var(--primary-blue); }

    @media (max-width: 768px) {
        .dashboard-grid { grid-template-columns: 1fr; }
        .chart-header { flex-direction: column; align-items: flex-start; }
        .filter-form { width: 100%; }
        .form-control-sm { width: 100%; }
    }
</style>

<div class="dashboard-container">
    
    <!-- Banner -->
    <div class="welcome-banner">
        <div class="welcome-text">
            <h1>👋 Xin chào, Shop <?= htmlspecialchars($_SESSION['username']) ?>!</h1>
            <p>Quản lý hiệu quả, kinh doanh phát đạt.</p>
        </div>
        <div class="date-badge">📅 Hôm nay: <?= date('d/m/Y') ?></div>
    </div>

    <!-- 4 Cards Thống kê -->
    <div class="dashboard-grid">
        <a href="orders_manage.php?tab=Pending" class="dash-card card-orders">
            <div class="card-top">
                <div>
                    <div class="card-title">Đơn chờ xử lý</div>
                    <div class="card-value"><?= number_format($orderPendingCount) ?></div>
                </div>
                <div class="card-icon">⚡</div>
            </div>
            <div class="card-link">Xử lý ngay &rarr;</div>
        </a>

        <!-- CARD DOANH THU TÍCH LŨY (Tổng doanh thu bán hàng) -->
        <a href="wallet.php" class="dash-card card-wallet">
            <div class="card-top">
                <div>
                    <div class="card-title">Doanh thu tích lũy</div>
                    <div class="card-value"><?= number_format($totalCumulativeRevenue, 0, ',', '.') ?> <span style="font-size:1rem">đ</span></div>
                </div>
                <div class="card-icon">💰</div>
            </div>
            <div class="card-link">Xem ví & Rút tiền &rarr;</div>
        </a>

        <a href="products.php" class="dash-card card-products">
            <div class="card-top">
                <div>
                    <div class="card-title">Sản phẩm</div>
                    <div class="card-value"><?= number_format($prodCount) ?></div>
                </div>
                <div class="card-icon">📦</div>
            </div>
            <div class="card-link">Quản lý kho &rarr;</div>
        </a>

        <a href="vouchers.php" class="dash-card card-vouchers">
            <div class="card-top">
                <div>
                    <div class="card-title">Mã giảm giá</div>
                    <div class="card-value"><?= number_format($voucherCount) ?></div>
                </div>
                <div class="card-icon">🎟️</div>
            </div>
            <div class="card-link">Tạo khuyến mãi &rarr;</div>
        </a>
    </div>

    <!-- BIỂU ĐỒ DOANH THU CÓ BỘ LỌC -->
    <div class="chart-section">
        <div class="chart-header">
            <div class="chart-info">
                <h3>📈 Biểu đồ doanh thu</h3>
                <span>Tổng thu giai đoạn: <strong id="totalRevenueDisplay" style="color:var(--primary-blue)"><?= number_format($totalPeriodRevenue, 0, ',', '.') ?> đ</strong></span>
            </div>

            <!-- Form Lọc AJAX -->
            <div style="display: flex; flex-direction: column; gap: 5px; align-items: flex-end;">
                <div class="quick-filters">
                    <?php 
                        $today = date('Y-m-d');
                        $last7 = date('Y-m-d', strtotime('-6 days'));
                        $last30 = date('Y-m-d', strtotime('-29 days'));
                        $startMonth = date('Y-m-01');
                    ?>
                    <!-- Dùng onclick để gọi JS thay vì href -->
                    <a onclick="loadChartData('<?= $last7 ?>', '<?= $today ?>', this)" class="<?= ($filter_start == $last7) ? 'active' : '' ?>">7 ngày</a>
                    <a onclick="loadChartData('<?= $last30 ?>', '<?= $today ?>', this)" class="<?= ($filter_start == $last30) ? 'active' : '' ?>">30 ngày</a>
                    <a onclick="loadChartData('<?= $startMonth ?>', '<?= $today ?>', this)" class="<?= ($filter_start == $startMonth) ? 'active' : '' ?>">Tháng này</a>
                </div>
                
                <form id="filterForm" class="filter-form">
                    <div class="filter-group">
                        <input type="date" id="inputStart" name="start_date" class="form-control-sm" value="<?= $filter_start ?>" required>
                        <span>-</span>
                        <input type="date" id="inputEnd" name="end_date" class="form-control-sm" value="<?= $filter_end ?>" required>
                    </div>
                    <button type="submit" id="btnFilter" class="btn-filter">Lọc</button>
                </form>
            </div>
        </div>
        
        <div style="position: relative; height: 350px; width: 100%">
            <canvas id="revenueChart"></canvas>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
        <h3>Thao tác nhanh</h3>
        <div class="action-grid">
            <a href="products.php?action=add" class="action-btn">
                <span style="font-size:1.2rem">➕</span> Đăng bán sản phẩm
            </a>
            <a href="orders_manage.php?tab=Processing" class="action-btn">
                <span style="font-size:1.2rem">🚚</span> Giao hàng loạt
            </a>
            <a href="orders_manage.php?tab=Dispute" class="action-btn" style="color:#ef4444; border-color:#fca5a5; background:#fef2f2;">
                <span style="font-size:1.2rem">⚠️</span> Giải quyết khiếu nại
            </a>
            <!-- <a href="../../logout.php" class="action-btn" style="color:#64748b;">
                <span style="font-size:1.2rem">🚪</span> Đăng xuất
            </a> -->
        </div>
    </div>

</div>

<!-- Script vẽ biểu đồ và xử lý AJAX -->
<script>
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Dữ liệu ban đầu từ PHP
    let initialLabels = <?= json_encode($chartLabels) ?>;
    let initialData   = <?= json_encode($chartData) ?>;

    // Khởi tạo Chart
    let revenueChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: initialLabels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: initialData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0ea5e9',
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#f1f5f9' },
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value) + 'đ'; 
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // === HÀM GỌI AJAX CẬP NHẬT BIỂU ĐỒ ===
    function loadChartData(start, end, btnElement = null) {
        // Hiệu ứng loading nút bấm (nếu có)
        const btnFilter = document.getElementById('btnFilter');
        btnFilter.textContent = '...';
        btnFilter.disabled = true;

        // Cập nhật giá trị vào ô input nếu gọi từ nút quick filter
        document.getElementById('inputStart').value = start;
        document.getElementById('inputEnd').value = end;

        // Gọi AJAX về chính file này với tham số ajax=1
        fetch(`dashboard.php?ajax=1&start_date=${start}&end_date=${end}`)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                // 1. Cập nhật dữ liệu biểu đồ
                revenueChart.data.labels = data.labels;
                revenueChart.data.datasets[0].data = data.data;
                revenueChart.update();

                // 2. Cập nhật số tổng tiền
                document.getElementById('totalRevenueDisplay').innerText = data.formattedTotal;

                // 3. Cập nhật trạng thái Active cho các nút Quick Filter
                if (btnElement) {
                    document.querySelectorAll('.quick-filters a').forEach(a => a.classList.remove('active'));
                    btnElement.classList.add('active');
                } else {
                    // Nếu gọi từ form custom, xóa active khỏi các nút quick
                    document.querySelectorAll('.quick-filters a').forEach(a => a.classList.remove('active'));
                }

                // 4. Cập nhật URL (Optional - để reload trang vẫn giữ nguyên filter)
                const url = new URL(window.location);
                url.searchParams.set('start_date', start);
                url.searchParams.set('end_date', end);
                window.history.pushState({}, '', url);
            })
            .catch(error => {
                console.error('Lỗi khi tải dữ liệu:', error);
                // Thay alert() bằng modal custom nếu có, hoặc log lỗi
                // alert('Có lỗi xảy ra khi tải dữ liệu biểu đồ.'); 
            })
            .finally(() => {
                btnFilter.textContent = 'Lọc';
                btnFilter.disabled = false;
            });
    }

    // Xử lý sự kiện submit form (để không reload trang)
    document.getElementById('filterForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Chặn reload
        const start = document.getElementById('inputStart').value;
        const end = document.getElementById('inputEnd').value;
        loadChartData(start, end);
    });
</script>

<?php include '../../includes/footer.php'; ?>