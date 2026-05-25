<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\order_process\confirm_receipt.php
require_once '../../../../includes/db.php';
require_once '../../utils/fee_calculator.php'; 
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập.']);
    exit;
}
$userId = $_SESSION['userid'];
$data = json_decode(file_get_contents('php://input'), true);
$orderId = (int)($data['order_id'] ?? 0);

if ($orderId <= 0) {
    echo json_encode(['success' => false, 'error' => 'Thiếu OrderID.']);
    exit;
}

try {
    $conn->begin_transaction();

    // Lấy Order & Voucher Sàn
    // 🔥 FIX: Lấy thêm PlatformVoucherAmount
    $stmt = $conn->prepare("SELECT UserID, TotalAmount, Status, PlatformVoucherAmount FROM Orders WHERE OrderID = ? FOR UPDATE");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order || $order['UserID'] != $userId) throw new Exception("Không có quyền.");
    if ($order['Status'] !== 'Shipped') throw new Exception("Đơn hàng không ở trạng thái vận chuyển.");

    // Tìm Shop
    $shopQuery = $conn->prepare("SELECT p.ShopID FROM OrderDetail od JOIN Product p ON od.ProductID = p.ProductID WHERE od.OrderID = ? LIMIT 1");
    $shopQuery->bind_param("i", $orderId);
    $shopQuery->execute();
    $shopRes = $shopQuery->get_result()->fetch_assoc();
    $shopId = $shopRes['ShopID'] ?? 0;

    // Tính tiền
    $totalAmount = (float)$order['TotalAmount'];
    $platformVoucher = (float)($order['PlatformVoucherAmount'] ?? 0);
    
    // 🔥 FIX: Doanh thu thực = Khách trả + Sàn tài trợ
    $realRevenue = $totalAmount + $platformVoucher;
    
    // Phí sàn tính trên doanh thu thực (hoặc tùy chính sách)
    $platformFee = calculatePlatformFee($realRevenue);
    $netEarnings = $realRevenue - $platformFee;

    // Update Order (Race Condition Check)
    $upd = $conn->prepare("
        UPDATE Orders 
        SET Status = 'Completed', CompletedAt = NOW(), PlatformFee = ?, NetEarnings = ?
        WHERE OrderID = ? AND Status = 'Shipped'
    ");
    $upd->bind_param("ddi", $platformFee, $netEarnings, $orderId);
    $upd->execute();

    if ($upd->affected_rows === 0) throw new Exception("Trạng thái đơn hàng đã thay đổi.");

    // Cộng tiền Shop
    $conn->query("UPDATE Users SET AccountBalance = AccountBalance + $netEarnings WHERE UserID = $shopId");

    // Log Trans
    $conn->query("INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) VALUES ($shopId, $orderId, 'income', $realRevenue, 'Doanh thu đơn #$orderId')");
    $conn->query("INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) VALUES ($shopId, $orderId, 'fee', $platformFee, 'Phí sàn đơn #$orderId')");

    // Log History
    $conn->query("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES ($orderId, 'Shipped', 'Completed', 'Khách xác nhận nhận hàng.', $userId)");

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Đã nhận hàng thành công!']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>