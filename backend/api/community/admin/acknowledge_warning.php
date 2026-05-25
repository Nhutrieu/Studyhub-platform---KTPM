<?php
// backend/api/community/admin/acknowledge_warning.php
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
    if (!isset($_SESSION['username'])) {
        fail('Chưa đăng nhập', 401);
    }
    
    // Lấy warning_id từ POST
    $warningId = isset($_POST['warning_id']) ? (int)$_POST['warning_id'] : 0;
    if ($warningId <= 0) {
        fail('ID cảnh cáo không hợp lệ', 400);
    }
    
    // Lấy thông tin user
    $username = $_SESSION['username'];
    $userStmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $userStmt->bind_param("s", $username);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        fail('Người dùng không tồn tại', 404);
    }
    
    $user = $userResult->fetch_assoc();
    $userId = (int)$user['UserID'];
    
    // Kiểm tra xem cảnh cáo có thuộc về user này không
    $checkStmt = $conn->prepare("SELECT WarningID FROM UserWarning WHERE WarningID = ? AND UserID = ?");
    $checkStmt->bind_param("ii", $warningId, $userId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        fail('Cảnh cáo không tồn tại hoặc không thuộc về bạn', 403);
    }
    
    // Xác nhận đã đọc
    $updateStmt = $conn->prepare("UPDATE UserWarning SET IsAcknowledged = 1, AcknowledgedAt = NOW() WHERE WarningID = ?");
    $updateStmt->bind_param("i", $warningId);
    
    if ($updateStmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Đã xác nhận cảnh cáo',
            'warning_id' => $warningId
        ], JSON_UNESCAPED_UNICODE);
    } else {
        fail('Không thể cập nhật cảnh cáo: ' . $updateStmt->error, 500);
    }
    
} catch (Throwable $e) {
    error_log("acknowledge_warning.php error: " . $e->getMessage());
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>