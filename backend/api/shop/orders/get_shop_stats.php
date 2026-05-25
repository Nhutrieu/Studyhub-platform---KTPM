<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\orders\get_shop_stats.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['userid']) || !in_array($_SESSION['role'], ['Shop', 'Admin'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$shopId = (int)$_SESSION['userid'];

try {
    // 1. Lấy số dư Khả dụng (AccountBalance)
    $stmtBalance = $conn->prepare("SELECT AccountBalance FROM Users WHERE UserID = ?");
    $stmtBalance->bind_param("i", $shopId);
    $stmtBalance->execute();
    $balanceResult = $stmtBalance->get_result()->fetch_assoc();
    $accountBalance = (float)($balanceResult['AccountBalance'] ?? 0);
    $stmtBalance->close();

    // Thiết lập tháng hiện tại và tháng trước
    $currentMonth = date('Y-m');
    $lastMonth = date('Y-m', strtotime('-1 month'));
    
    // 2. Lấy tổng Doanh thu tháng hiện tại (CHỈ BÁN HÀNG - Loại trừ ký quỹ/nạp cọc)
    $stmtCurrentRevenue = $conn->prepare("
        SELECT COALESCE(SUM(Amount), 0) as MonthlyRevenue 
        FROM ShopTransactions 
        WHERE UserID = ? 
        AND Type = 'income' 
        AND DATE_FORMAT(CreatedAt, '%Y-%m') = ?
        -- Loại trừ các giao dịch nạp ký quỹ bằng cách kiểm tra Description
        AND Description NOT LIKE '%nạp quỹ bảo đảm%'
        AND Description NOT LIKE '%nạp cọc%'
    ");
    $stmtCurrentRevenue->bind_param("is", $shopId, $currentMonth);
    $stmtCurrentRevenue->execute();
    $currentRevenueResult = $stmtCurrentRevenue->get_result()->fetch_assoc();
    $monthlyRevenue = (float)($currentRevenueResult['MonthlyRevenue'] ?? 0);
    $stmtCurrentRevenue->close();

    // 3. Lấy tổng Doanh thu tháng trước (CHỈ BÁN HÀNG - Loại trừ ký quỹ/nạp cọc)
    $stmtLastRevenue = $conn->prepare("
        SELECT COALESCE(SUM(Amount), 0) as LastMonthlyRevenue 
        FROM ShopTransactions 
        WHERE UserID = ? 
        AND Type = 'income' 
        AND DATE_FORMAT(CreatedAt, '%Y-%m') = ?
        -- Loại trừ các giao dịch nạp ký quỹ bằng cách kiểm tra Description
        AND Description NOT LIKE '%nạp quỹ bảo đảm%'
        AND Description NOT LIKE '%nạp cọc%'
    ");
    $stmtLastRevenue->bind_param("is", $shopId, $lastMonth);
    $stmtLastRevenue->execute();
    $lastRevenueResult = $stmtLastRevenue->get_result()->fetch_assoc();
    $lastMonthlyRevenue = (float)($lastRevenueResult['LastMonthlyRevenue'] ?? 0);
    $stmtLastRevenue->close();
    
    // 4. Tính toán tỷ lệ tăng trưởng (%)
    $growthRate = 0;
    $growthSign = "";
    if ($lastMonthlyRevenue > 0) {
        $growthRate = (($monthlyRevenue - $lastMonthlyRevenue) / $lastMonthlyRevenue) * 100;
        $growthSign = $growthRate >= 0 ? "+" : "";
    } elseif ($monthlyRevenue > 0 && $lastMonthlyRevenue == 0) {
        // Tháng trước không có doanh thu, tháng này có -> tăng trưởng vô hạn, gán 100% (hoặc giá trị tượng trưng)
        $growthRate = 100;
        $growthSign = "+";
    }

    // 5. Đếm số lượng đơn hàng theo trạng thái
    $stmtCounts = $conn->prepare("
        SELECT 
            SUM(CASE WHEN o.Status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN o.Status = 'Shipped' THEN 1 ELSE 0 END) AS shipped_count,
            SUM(CASE WHEN o.Status = 'Dispute' THEN 1 ELSE 0 END) AS dispute_count
        FROM Orders o
        WHERE EXISTS (
            SELECT 1 FROM OrderDetail od 
            JOIN Product p ON od.ProductID = p.ProductID
            WHERE od.OrderID = o.OrderID AND p.ShopID = ?
        )
    ");
    $stmtCounts->bind_param("i", $shopId);
    $stmtCounts->execute();
    $counts = $stmtCounts->get_result()->fetch_assoc();
    $stmtCounts->close();

    echo json_encode([
        'success' => true,
        'stats' => [
            'pending_count' => (int)($counts['pending_count'] ?? 0),
            'shipped_count' => (int)($counts['shipped_count'] ?? 0),
            'dispute_count' => (int)($counts['dispute_count'] ?? 0),
            'monthly_revenue' => $monthlyRevenue,
            'account_balance' => $accountBalance,
            'growth_rate_pct' => $growthSign . number_format($growthRate, 1) . '%' // Thêm tỷ lệ tăng trưởng
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>