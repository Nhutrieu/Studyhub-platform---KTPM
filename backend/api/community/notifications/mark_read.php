<?php
// backend/api/community/notifications/mark_read.php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập bằng user_id
    if (!isset($_SESSION['user_id'])) {
        fail('Chưa đăng nhập', 401);
    }
    
    $userId = (int)$_SESSION['user_id'];
    
    // Kiểm tra user tồn tại
    $checkUser = $conn->prepare("SELECT UserID FROM Users WHERE UserID = ?");
    $checkUser->bind_param("i", $userId);
    $checkUser->execute();
    
    if ($checkUser->get_result()->num_rows === 0) {
        fail('Tài khoản không tồn tại', 404);
    }
    
    // Xử lý các loại request
    if (isset($_POST['all']) && $_POST['all'] == '1') {
        // Đánh dấu tất cả đã đọc
        $stmt = $conn->prepare("
            UPDATE CommunityNotification 
            SET IsRead = 1 
            WHERE UserID = ? AND IsRead = 0
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã đánh dấu tất cả thông báo đã đọc'
        ], JSON_UNESCAPED_UNICODE);
        
    } elseif (isset($_POST['notification_id']) && !empty($_POST['notification_id'])) {
        // Đánh dấu một thông báo cụ thể
        $notificationId = (int)$_POST['notification_id'];
        
        $stmt = $conn->prepare("
            UPDATE CommunityNotification 
            SET IsRead = 1 
            WHERE NotificationID = ? AND UserID = ?
        ");
        $stmt->bind_param("ii", $notificationId, $userId);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo đã đọc',
            'notification_id' => $notificationId
        ], JSON_UNESCAPED_UNICODE);
        
    } elseif (isset($_POST['comment_id']) && !empty($_POST['comment_id'])) {
        // Đánh dấu thông báo báo cáo
        $commentId = (int)$_POST['comment_id'];
        $type = $_POST['type'] ?? 'comment_reported';
        
        $stmt = $conn->prepare("
            UPDATE CommunityNotification 
            SET IsRead = 1 
            WHERE UserID = ? AND CommentID = ? AND Type = ? AND IsRead = 0
        ");
        $stmt->bind_param("iis", $userId, $commentId, $type);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo báo cáo đã đọc',
            'comment_id' => $commentId,
            'affected_rows' => $conn->affected_rows
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        fail('Thiếu tham số hợp lệ. Cần: all=1 hoặc notification_id=xxx hoặc comment_id=xxx', 400);
    }
    
} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>