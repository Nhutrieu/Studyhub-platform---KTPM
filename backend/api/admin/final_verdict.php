<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\admin\final_verdict.php

require_once '../../../includes/db.php';
require_once '../utils/fee_calculator.php'; 
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['userid']) || $_SESSION['role'] !== 'Admin') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}
$adminId = (int)$_SESSION['userid'];

$data    = json_decode(file_get_contents('php://input'), true);
$orderId = isset($data['order_id']) ? (int)$data['order_id'] : 0;
$verdict = isset($data['verdict']) ? $data['verdict'] : ''; 
$reason  = isset($data['reason']) ? trim($data['reason']) : '';

if ($orderId <= 0 || !in_array($verdict, ['shop_win', 'customer_win'], true)) {
    echo json_encode(['success' => false, 'error' => 'Dữ liệu không hợp lệ.']);
    exit;
}

try {
    $conn->begin_transaction();

    // Lấy thông tin đơn hàng
    $stmt = $conn->prepare("
        SELECT 
            o.TotalAmount, 
            o.Status, 
            o.UserID as CustomerID, 
            p.ShopID 
        FROM Orders o
        JOIN OrderDetail od ON o.OrderID = od.OrderID
        JOIN Product p ON od.ProductID = p.ProductID
        WHERE o.OrderID = ? 
          AND o.Status = 'AdminReview'
        LIMIT 1
    ");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        throw new Exception("Đơn hàng không ở trạng thái chờ Admin xử lý.");
    }
    
    $shopId      = (int)$order['ShopID'];
    $customerId  = (int)$order['CustomerID'];
    $totalAmount = (float)$order['TotalAmount'];

    if ($verdict === 'shop_win') {
        // --- SHOP THẮNG (Giữ nguyên logic cũ) ---
        $platformFee = calculatePlatformFee($totalAmount);
        $netEarnings = $totalAmount - $platformFee;

        // Cập nhật đơn hàng
        $conn->query("
            UPDATE Orders 
            SET Status='Completed', 
                CompletedAt=NOW(), 
                PlatformFee=$platformFee, 
                NetEarnings=$netEarnings 
            WHERE OrderID=$orderId
        ");

        // Cộng tiền cho Shop
        $conn->query("
            UPDATE Users 
            SET AccountBalance = AccountBalance + $netEarnings 
            WHERE UserID = $shopId
        ");

        // Log doanh thu (tổng tiền)
        $descInc = "Doanh thu đơn #$orderId (Admin phán quyết thắng)";
        $conn->query("
            INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) 
            VALUES ($shopId, $orderId, 'income', $totalAmount, '$descInc')
        ");

        // Log phí sàn
        $descFee = "Phí sàn đơn #$orderId";
        $conn->query("
            INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) 
            VALUES ($shopId, $orderId, 'fee', $platformFee, '$descFee')
        ");

        $note      = "Admin phán quyết: Shop thắng. Lý do: $reason";
        $newStatus = 'Completed';

    } else {
        // --- KHÁCH THẮNG: HOÀN TIỀN + PHẠT SHOP ---

        // 1. Cập nhật trạng thái: Refunded
        $conn->query("UPDATE Orders SET Status='Refunded' WHERE OrderID=$orderId");

        // 2. Hoàn 100% tiền cho khách (về ví)
        $conn->query("
            UPDATE Users 
            SET AccountBalance = AccountBalance + $totalAmount 
            WHERE UserID = $customerId
        ");

        // 2b. Ghi log hoàn tiền cho khách (CustomerTransactions) nếu có bảng
        $checkCusTrans = $conn->query("SHOW TABLES LIKE 'CustomerTransactions'");
        if ($checkCusTrans && $checkCusTrans->num_rows > 0) {
            $descRefund = "Hoàn tiền đơn #$orderId (Admin phán quyết khách thắng)";
            $stmtCusLog = $conn->prepare("
                INSERT INTO CustomerTransactions (UserID, OrderID, Type, Amount, Description)
                VALUES (?, ?, 'refund', ?, ?)
            ");
            $stmtCusLog->bind_param("iids", $customerId, $orderId, $totalAmount, $descRefund);
            $stmtCusLog->execute();
            $stmtCusLog->close();
        }

        // 3. TÍNH PHÍ PHẠT SHOP (Penalty Fee)
        $penaltyRate   = 0.02; // 2%
        $penaltyAmount = $totalAmount * $penaltyRate;
        
        // Trừ phạt vào ví Shop
        $conn->query("
            UPDATE Users 
            SET AccountBalance = AccountBalance - $penaltyAmount 
            WHERE UserID = $shopId
        ");

        // 4. Ghi Log phạt cho Shop
        $descPenalty = "Phạt thua kiện đơn #$orderId (Bù phí cổng thanh toán)";
        $conn->query("
            INSERT INTO ShopTransactions (UserID, OrderID, Type, Amount, Description) 
            VALUES ($shopId, $orderId, 'fee', $penaltyAmount, '$descPenalty')
        ");

        $note      = "Admin phán quyết: Khách thắng (Hoàn tiền). Shop chịu phạt: ".number_format($penaltyAmount)."đ. Lý do: $reason";
        $newStatus = 'Refunded';
    }

    // Ghi lịch sử đơn
    $stmtHist = $conn->prepare("
        INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) 
        VALUES (?, 'AdminReview', ?, ?, ?)
    ");
    $stmtHist->bind_param("issi", $orderId, $newStatus, $note, $adminId);
    $stmtHist->execute();
    $stmtHist->close();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Đã xử lý xong tranh chấp!']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
