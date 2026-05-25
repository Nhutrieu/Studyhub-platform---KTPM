<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\order_process\shop_cancel.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['userid']) || $_SESSION['role'] !== 'Shop') {
    echo json_encode(['success' => false, 'error' => 'Auth failed']); exit;
}

$shopId = $_SESSION['userid'];
$data = json_decode(file_get_contents('php://input'), true);
$orderId = (int)($data['order_id'] ?? 0);
$reason = trim($data['reason'] ?? '');

try {
    $conn->begin_transaction();

    // Check & Lock
    $stmt = $conn->prepare("
        SELECT o.OrderID, o.Status, o.PaymentStatus, o.TotalAmount, o.UserID as CustomerID
        FROM Orders o JOIN OrderDetail od ON o.OrderID = od.OrderID JOIN Product p ON od.ProductID = p.ProductID
        WHERE o.OrderID = ? AND p.ShopID = ?
        LIMIT 1 FOR UPDATE
    ");
    $stmt->bind_param("ii", $orderId, $shopId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order || !in_array($order['Status'], ['Pending', 'Processing'])) {
        throw new Exception("Không thể hủy đơn hàng này.");
    }

    // Hoàn tiền nếu đã thanh toán
    if ($order['PaymentStatus'] === 'PAID') {
        $amount = (float)$order['TotalAmount'];
        $cusId  = (int)$order['CustomerID'];
        
        $conn->query("UPDATE Users SET AccountBalance = AccountBalance + $amount WHERE UserID = $cusId");
        $conn->query("INSERT INTO CustomerTransactions (UserID, OrderID, Type, Amount, Description) VALUES ($cusId, $orderId, 'refund', $amount, 'Hoàn tiền Shop hủy đơn #$orderId')");
        
        $conn->query("UPDATE Orders SET Status = 'Cancelled', PaymentStatus = 'REFUNDED' WHERE OrderID = $orderId");
    } else {
        $conn->query("UPDATE Orders SET Status = 'Cancelled' WHERE OrderID = $orderId");
    }

    // Log
    $note = "Shop hủy đơn: $reason";
    $conn->query("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES ($orderId, '".$order['Status']."', 'Cancelled', '$note', $shopId)");

    $conn->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>