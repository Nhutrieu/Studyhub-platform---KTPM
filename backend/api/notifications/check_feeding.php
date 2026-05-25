<?php
// FILE: backend/api/notifications/check_feeding.php
// Mục đích: Kiểm tra các cữ ăn đến giờ và tạo thông báo tự động
// [FIXED] Sửa đường dẫn link từ feeding/index.php thành feeding.php
header('Content-Type: application/json; charset=utf-8');
// Tắt hiển thị lỗi HTML ra browser để tránh làm hỏng JSON client
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    if (session_status() === PHP_SESSION_NONE) session_start();
    
    // Đường dẫn này có thể khác tùy cấu trúc thư mục thực tế của bạn
    require_once '../../../includes/db.php';

    if (empty($_SESSION['username'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    // 1. Lấy UserID hiện tại
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $u);
    $st->execute();
    $uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

    if (!$uid) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    // 2. Cấu hình thời gian
    $intervalMinutes = 30; 

    // 3. Query tìm các cữ ăn
    // SỬA ĐỔI QUAN TRỌNG DỰA TRÊN SCHEMA:
    // - Table: FeedingEvent (chứa các cữ ăn cụ thể)
    // - Table: FeedingPlan (chứa kế hoạch tổng thể)
    // - Table: Pond (chứa thông tin hồ và UserID chủ sở hữu)
    $sql = "
        SELECT 
            e.EventID, 
            e.ScheduledAt, 
            e.AmountExpected,
            p.PondID, 
            po.PondName,
            p.PlanID
        FROM FeedingEvent e
        JOIN FeedingPlan p ON e.PlanID = p.PlanID
        JOIN Pond po ON p.PondID = po.PondID
        WHERE 
            p.Status = 'active'
            AND po.UserID = ?  -- Lấy UserID từ bảng Pond (do FeedingPlan không có cột UserID)
            AND e.ExecutedAt IS NULL
            AND e.ScheduledAt <= NOW()
            AND e.ScheduledAt >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Lỗi SQL Prepare: " . $conn->error);
    }

    $stmt->bind_param("ii", $uid, $intervalMinutes);
    if (!$stmt->execute()) {
        throw new Exception("Lỗi SQL Execute: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $count = 0;

    while ($row = $result->fetch_assoc()) {
        $eventId = $row['EventID'];
        $pondName = $row['PondName'];
        // Ép kiểu float để hiển thị đẹp hơn (ví dụ 100.00 -> 100)
        $amount = floatval($row['AmountExpected']); 
        $timeStr = date('H:i', strtotime($row['ScheduledAt']));
        
        // [FIXED] Sửa đường dẫn đúng file feeding.php (bỏ /index.php)
        $link = "/HeThongChamSocCaKoi/frontend/customer/feeding.php?plan_id={$row['PlanID']}&event_id={$eventId}";
        
        // 4. Kiểm tra xem đã thông báo chưa để tránh spam
        $checkSql = "SELECT NotiID FROM SystemNotifications WHERE UserID = ? AND Link = ? LIMIT 1";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("is", $uid, $link);
        $checkStmt->execute();
        
        if ($checkStmt->get_result()->num_rows == 0) {
            // Chưa có -> Tạo mới
            $title = "Đến giờ cho ăn";
            $message = "Hồ <strong>{$pondName}</strong>: Cữ {$timeStr} ({$amount}g). Nhấn để xác nhận đã cho ăn.";
            $type = "warning"; 
            
            $insertSql = "INSERT INTO SystemNotifications (UserID, Type, Title, Message, Link, IsRead, CreatedAt) VALUES (?, ?, ?, ?, ?, 0, NOW())";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("issss", $uid, $type, $title, $message, $link);
            
            if ($insertStmt->execute()) {
                $count++;
            }
        }
    }

    echo json_encode(['success' => true, 'new_notifications' => $count]);

} catch (Exception $e) {
    // Trả về JSON lỗi thay vì HTML Fatal Error
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>