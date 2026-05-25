<?php
// FILE: backend/api/notifications/check_salt.php
// Mục đích: Kiểm tra các bước châm muối/thay nước đến giờ và tạo thông báo
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    if (session_status() === PHP_SESSION_NONE) session_start();
    require_once '../../../includes/db.php';

    if (empty($_SESSION['username'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    // 1. Lấy UserID
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $u);
    $st->execute();
    $uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

    if (!$uid) {
        echo json_encode(['success' => false]);
        exit;
    }

    // 2. Cấu hình thời gian (30 phút đổ lại)
    $intervalMinutes = 30; 

    // 3. Query tìm các bước (Step) trong SaltPlan
    // - Plan đang Active
    // - Step chưa thực hiện (ExecutedAt IS NULL)
    // - Đã đến giờ (ScheduledAt <= NOW)
    $sql = "
        SELECT 
            s.StepID, 
            s.StepIndex, 
            s.ScheduledAt, 
            s.ExpectedSaltGrams,
            s.WaterChangeLiters,
            sp.PlanID, 
            p.PondName
        FROM SaltDoseStep s
        JOIN SaltPlan sp ON s.PlanID = sp.PlanID
        JOIN Pond p ON sp.PondID = p.PondID
        WHERE 
            sp.Status = 'active'
            AND p.UserID = ?
            AND s.ExecutedAt IS NULL
            AND s.ScheduledAt <= NOW()
            AND s.ScheduledAt >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Lỗi SQL Prepare: " . $conn->error);

    $stmt->bind_param("ii", $uid, $intervalMinutes);
    $stmt->execute();
    $result = $stmt->get_result();
    $count = 0;

    while ($row = $result->fetch_assoc()) {
        $stepId = $row['StepID'];
        $pondName = $row['PondName'];
        $stepIndex = $row['StepIndex'];
        $timeStr = date('H:i', strtotime($row['ScheduledAt']));
        
        // Xác định nội dung hành động (Châm muối hay Thay nước)
        $actionText = "";
        $saltGrams = floatval($row['ExpectedSaltGrams']);
        $waterLiters = floatval($row['WaterChangeLiters']);

        if ($waterLiters > 0) {
            $actionText = "thay {$waterLiters}L nước";
        } else {
            $actionText = "châm {$saltGrams}g muối";
        }

        // Link Deep Linking đến trang Salt
        $link = "/HeThongChamSocCaKoi/frontend/customer/salt.php?plan_id={$row['PlanID']}&step_id={$stepId}";
        
        // 4. Kiểm tra trùng lặp thông báo
        $checkSql = "SELECT NotiID FROM SystemNotifications WHERE UserID = ? AND Link = ? LIMIT 1";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("is", $uid, $link);
        $checkStmt->execute();
        
        if ($checkStmt->get_result()->num_rows == 0) {
            $title = "Nhắc nhở muối/nước";
            $message = "Hồ <strong>{$pondName}</strong>: Bước {$stepIndex} ({$actionText}) lúc {$timeStr}.";
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
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>