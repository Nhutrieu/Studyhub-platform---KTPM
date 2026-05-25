<?php
/**
 * Script: Tự động hủy đơn hàng trạng thái 'Pending' hoặc 'Processing' quá hạn
 * Chức năng: Hoàn tiền vào ví User (nếu đã thanh toán) + Hủy đơn + Ghi log lịch sử
 * Phạm vi: Toàn bộ hệ thống (tất cả khách hàng)
 */

require_once '../../../includes/db.php';
header('Content-Type: application/json');

// --- ĐẢM BẢO ĐỒNG BỘ MÚI GIỜ VỚI DATABASE SCHEMA (+07:00) ---
$conn->query("SET time_zone = '+07:00'");

// ID của hệ thống để ghi log (thường là 1 - Admin)
$systemUserId = 1; 
$daysThreshold = 3;

try {
    // Lấy thông tin Debug để kiểm tra lệch múi giờ
    $debugQuery = $conn->query("SELECT NOW() as db_now, DATE_SUB(NOW(), INTERVAL $daysThreshold DAY) as cutoff_date");
    $debugInfo = $debugQuery->fetch_assoc();

    // 1. Tìm các đơn hàng thỏa mãn điều kiện TRÊN TOÀN HỆ THỐNG
    // Lưu ý: Cột OrderDate trong Schema là DATETIME DEFAULT CURRENT_TIMESTAMP
    $sql = "SELECT OrderID, UserID, TotalAmount, PaymentStatus, Status, ShippingNote 
            FROM Orders 
            WHERE Status IN ('Pending', 'Processing') 
            AND OrderDate < ?"; // Sử dụng tham số ngày để an toàn
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $debugInfo['cutoff_date']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $processedCount = 0;
    $details = [];
    $errors = [];

    while ($order = $result->fetch_assoc()) {
        $orderId = $order['OrderID'];
        $userId = $order['UserID'];
        $amount = $order['TotalAmount'];
        $oldStatus = $order['Status'];

        // Bắt đầu giao dịch cho từng đơn hàng
        $conn->begin_transaction();

        try {
            $refunded = false;
            // A. XỬ LÝ HOÀN TIỀN (Chỉ khi trạng thái thanh toán là PAID)
            // Lưu ý: Trong ENUM của bạn là 'PAID' (viết hoa)
            if (strtoupper($order['PaymentStatus']) === 'PAID') {
                $updateBalance = $conn->prepare("UPDATE Users SET AccountBalance = AccountBalance + ? WHERE UserID = ?");
                $updateBalance->bind_param("di", $amount, $userId);
                $updateBalance->execute();

                $desc = "Hoàn tiền tự động cho đơn hàng #$orderId (Quá hạn xử lý - Trạng thái gốc: $oldStatus)";
                $logTrans = $conn->prepare("INSERT INTO CustomerTransactions (UserID, OrderID, Type, Amount, Description) VALUES (?, ?, 'refund', ?, ?)");
                $logTrans->bind_param("iids", $userId, $orderId, $amount, $desc);
                $logTrans->execute();
                $refunded = true;
            }

            // B. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
            $newNote = trim(($order['ShippingNote'] ?? "") . " [Hệ thống tự động hủy đơn $oldStatus sau $daysThreshold ngày]");
            $updateOrder = $conn->prepare("UPDATE Orders SET Status = 'Cancelled', ShippingNote = ? WHERE OrderID = ?");
            $updateOrder->bind_param("si", $newNote, $orderId);
            $updateOrder->execute();

            // C. GHI LỊCH SỬ TRẠNG THÁI (OrderStatusHistory)
            $historyNote = "Tự động hủy đơn hàng đang ở trạng thái '$oldStatus' quá $daysThreshold ngày.";
            $logHistory = $conn->prepare("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES (?, ?, 'Cancelled', ?, ?)");
            $logHistory->bind_param("issi", $orderId, $oldStatus, $historyNote, $systemUserId);
            $logHistory->execute();

            $conn->commit();
            $processedCount++;
            $details[] = "Đơn #$orderId ($oldStatus) -> Cancelled" . ($refunded ? " (Đã hoàn tiền)" : "");
        } catch (Exception $e) {
            $conn->rollback();
            $errors[] = "Lỗi đơn #$orderId: " . $e->getMessage();
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Đã xử lý xong $processedCount đơn hàng.",
        'debug' => [
            'current_db_time' => $debugInfo['db_now'],
            'cutoff_time_used' => $debugInfo['cutoff_date'],
            'threshold_days' => $daysThreshold
        ],
        'processed_count' => $processedCount,
        'details' => $details,
        'errors' => $errors
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>