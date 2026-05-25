<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }
    
    $userId = (int)$_SESSION['userid'];
    
    // Kiểm tra user có bị cấm không
    $checkBanSql = "
        SELECT 
            b.BanID,
            b.Reason,
            b.BanDuration,
            b.BannedAt,
            b.UnbanAt,
            b.IsActive,
            admin.Username as banned_by_username
        FROM UserChatBan b
        LEFT JOIN Users admin ON b.BannedBy = admin.UserID
        WHERE b.UserID = ? 
          AND b.IsActive = 1
          AND (b.BanDuration = 0 OR b.UnbanAt > NOW())
        ORDER BY b.BannedAt DESC 
        LIMIT 1
    ";
    
    $stmt = $conn->prepare($checkBanSql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $banData = $result->fetch_assoc();
        
        // Tính số ngày còn lại
        $unbanTime = strtotime($banData['UnbanAt']);
        $currentTime = time();
        $remainingSeconds = $unbanTime - $currentTime;
        $remainingDays = $banData['BanDuration'] == 0 ? 0 : ceil($remainingSeconds / (60 * 60 * 24));
        
        success([
            'is_banned' => true,
            'ban_info' => [
                'reason' => $banData['Reason'],
                'banned_at' => $banData['BannedAt'],
                'unban_at' => $banData['UnbanAt'],
                'banned_by' => $banData['banned_by_username'],
                'duration' => $banData['BanDuration'],
                'remaining_days' => $remainingDays
            ]
        ]);
    } else {
        success([
            'is_banned' => false
        ]);
    }
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>