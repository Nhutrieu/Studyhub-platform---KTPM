<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\orders\get_orders_by_status.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

// 1. Kiểm tra quyền
if (!isset($_SESSION['userid']) || !in_array($_SESSION['role'], ['Shop', 'Admin'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized access.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$shopId = (int)$_SESSION['userid'];
$status = trim($_GET['tab'] ?? '');

// 2. Danh sách trạng thái hợp lệ
$validStatuses = ['Pending', 'Processing', 'Shipped', 'Completed', 'Dispute', 'AdminReview', 'Refunded', 'Cancelled'];

if (!in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid order status provided.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 3. Xây dựng truy vấn
    $sql = "
        SELECT 
            o.OrderID, o.OrderDate, o.TotalAmount, o.Status, o.PaymentStatus, o.PaymentMethod,
            o.ReceiverName, o.ReceiverPhone, o.ReceiverAddress, o.UserID,
            o.ShippingCarrier, o.ShippingCode,
            o.DisputeReason, o.DisputeEvidence,
            (
                SELECT Note 
                FROM OrderStatusHistory 
                WHERE OrderID = o.OrderID AND (NewStatus = 'Completed' OR NewStatus = 'Refunded') AND Note LIKE 'Admin%'
                ORDER BY ChangedAt DESC LIMIT 1
            ) as AdminVerdict
        FROM Orders o
        WHERE o.Status = ?
        AND EXISTS (
            -- Đảm bảo chỉ lấy đơn hàng có chứa sản phẩm thuộc về Shop này
            SELECT 1 FROM OrderDetail od 
            JOIN Product p ON od.ProductID = p.ProductID
            WHERE od.OrderID = o.OrderID AND p.ShopID = ?
        )
        ORDER BY o.OrderDate DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $status, $shopId);
    $stmt->execute();
    $result = $stmt->get_result();
    $orders = [];
    
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    $stmt->close();

    // 4. Trả về kết quả
    echo json_encode([
        'success' => true,
        'status' => $status,
        'orders' => $orders
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>