<?php
// backend/api/community/admin/mark_warning_read.php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);
    
    $warningId = (int)($_POST['warning_id'] ?? 0);
    if ($warningId <= 0) fail('ID cảnh cáo không hợp lệ', 400);
    
    // Lấy user ID
    $username = $_SESSION['username'];
    $userStmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $userStmt->bind_param("s", $username);
    $userStmt->execute();
    $user = $userStmt->get_result()->fetch_assoc();
    
    if (!$user) fail('Người dùng không tồn tại', 404);
    
    $userId = $user['UserID'];
    
    // Đánh dấu cảnh cáo đã đọc
    $updateStmt = $conn->prepare("UPDATE UserWarning SET IsAcknowledged = 1, AcknowledgedAt = NOW() WHERE WarningID = ? AND UserID = ?");
    $updateStmt->bind_param("ii", $warningId, $userId);
    
    if ($updateStmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Đã đánh dấu cảnh cáo đã đọc']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Không thể cập nhật']);
    }
    
} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>