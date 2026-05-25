<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\order_process\resolve_dispute.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json');

// 1. Kiểm tra quyền
if (!isset($_SESSION['userid']) || $_SESSION['role'] !== 'Shop') {
    echo json_encode(['success' => false, 'error' => 'Không có quyền truy cập.']);
    exit;
}

$shopId = (int)$_SESSION['userid'];
$data   = json_decode(file_get_contents('php://input'), true);
$orderId = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$action  = isset($data['action']) ? $data['action'] : ''; 
$reply   = isset($data['reply']) ? trim($data['reply']) : '';

if ($orderId <= 0 || !in_array($action, ['refund', 'reject'], true)) {
    echo json_encode(['success' => false, 'error' => 'Dữ liệu không hợp lệ.']);
    exit;
}

try {
    $conn->begin_transaction();

    // 2. Khóa đơn hàng để xử lý (Logic Mới - Tốt)
    $stmt = $conn->prepare("
        SELECT o.OrderID, o.Status, o.TotalAmount, o.UserID AS CustomerID 
        FROM Orders o 
        JOIN OrderDetail od ON o.OrderID = od.OrderID 
        JOIN Product p ON od.ProductID = p.ProductID
        WHERE o.OrderID = ? AND p.ShopID = ? AND o.Status = 'Dispute'
        LIMIT 1 FOR UPDATE
    ");
    $stmt->bind_param("ii", $orderId, $shopId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) throw new Exception("Đơn hàng không tồn tại hoặc trạng thái đã thay đổi.");

    $totalAmount = (float)$order['TotalAmount'];
    $customerId  = (int)$order['CustomerID'];

    // 3. Xử lý hành động
    if ($action === 'refund') {
        // --- REFUND: HOÀN TIỀN ---

        // Cập nhật Status (Atomic Check)
        $upd = $conn->prepare("UPDATE Orders SET Status = 'Refunded' WHERE OrderID = ? AND Status = 'Dispute'");
        $upd->bind_param("i", $orderId);
        $upd->execute();
        
        if ($upd->affected_rows === 0) throw new Exception("Xung đột trạng thái. Vui lòng thử lại.");
        $upd->close();

        // Hoàn tiền cho khách (Cộng AccountBalance)
        $stmtRefundCus = $conn->prepare("UPDATE Users SET AccountBalance = AccountBalance + ? WHERE UserID = ?");
        $stmtRefundCus->bind_param("di", $totalAmount, $customerId);
        $stmtRefundCus->execute();
        $stmtRefundCus->close();

        // Log cho Khách (Dùng Prepared Statement từ file cũ -> AN TOÀN)
        $descCus = "Hoàn tiền đơn #$orderId (Shop chấp nhận khiếu nại)";
        $logCus = $conn->prepare("INSERT INTO CustomerTransactions (UserID, OrderID, Type, Amount, Description) VALUES (?, ?, 'refund', ?, ?)");
        $logCus->bind_param("iids", $customerId, $orderId, $totalAmount, $descCus);
        $logCus->execute();
        $logCus->close();

        // Phạt Shop (Trừ DepositBalance - Logic Mới)
        $penaltyAmount = $totalAmount * 0.02; // 2%
        $stmtPenalty = $conn->prepare("UPDATE Users SET DepositBalance = DepositBalance - ? WHERE UserID = ?");
        $stmtPenalty->bind_param("di", $penaltyAmount, $shopId);
        $stmtPenalty->execute();
        $stmtPenalty->close();

        // Log cho Shop (Dùng Prepared Statement -> AN TOÀN)
        $descShop = "Phạt thua kiện đơn #$orderId (Trừ quỹ đảm bảo)";
        $logShop = $conn->prepare("INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) VALUES (?, ?, 'fee', ?, ?)");
        $logShop->bind_param("iids", $shopId, $orderId, $penaltyAmount, $descShop);
        $logShop->execute();
        $logShop->close();

        // Log History (Dùng Prepared Statement -> AN TOÀN với nội dung $reply)
        $note = "Shop chấp nhận hoàn tiền. Lời nhắn: " . ($reply ?: '[Không có]');
        $hist = $conn->prepare("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES (?, 'Dispute', 'Refunded', ?, ?)");
        $hist->bind_param("isi", $orderId, $note, $shopId);
        $hist->execute();
        $hist->close();

        $msg = "Đã hoàn tiền và trừ phạt " . number_format($penaltyAmount) . "đ vào quỹ bảo đảm.";

    } else {
        // --- REJECT: TỪ CHỐI ---

        $upd = $conn->prepare("UPDATE Orders SET Status = 'AdminReview' WHERE OrderID = ? AND Status = 'Dispute'");
        $upd->bind_param("i", $orderId);
        $upd->execute();

        if ($upd->affected_rows === 0) throw new Exception("Xung đột trạng thái.");
        $upd->close();

        // Log History (Dùng Prepared Statement -> AN TOÀN)
        $note = "Shop từ chối khiếu nại: " . ($reply ?: '[Không có]');
        $hist = $conn->prepare("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES (?, 'Dispute', 'AdminReview', ?, ?)");
        $hist->bind_param("isi", $orderId, $note, $shopId);
        $hist->execute();
        $hist->close();
        
        $msg = "Đã gửi lên Admin xử lý.";
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => $msg]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>