<?php
// backend/api/community/admin/get_warning.php
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
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);
    
    $warningId = (int)($_GET['warning_id'] ?? 0);
    if ($warningId <= 0) fail('ID cảnh cáo không hợp lệ', 400);
    
    // Lấy thông tin user
    $username = $_SESSION['username'];
    $userStmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $userStmt->bind_param("s", $username);
    $userStmt->execute();
    $user = $userStmt->get_result()->fetch_assoc();
    
    if (!$user) fail('Người dùng không tồn tại', 404);
    
    $userId = $user['UserID'];
    
    // Lấy thông tin cảnh cáo
    $stmt = $conn->prepare("
        SELECT w.*, u.Username as AdminName, u.FullName as AdminFullName
        FROM UserWarning w
        LEFT JOIN Users u ON w.AdminID = u.UserID
        WHERE w.WarningID = ? AND w.UserID = ?
    ");
    $stmt->bind_param("ii", $warningId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        fail('Không tìm thấy cảnh cáo', 404);
    }
    
    $warning = $result->fetch_assoc();
    
    // Format dates
    $warning['CreatedAt'] = date('Y-m-d H:i:s', strtotime($warning['CreatedAt']));
    $warning['ExpiresAt'] = $warning['ExpiresAt'] ? date('Y-m-d H:i:s', strtotime($warning['ExpiresAt'])) : null;
    $warning['AcknowledgedAt'] = $warning['AcknowledgedAt'] ? date('Y-m-d H:i:s', strtotime($warning['AcknowledgedAt'])) : null;
    
    echo json_encode([
        'success' => true,
        'warning' => $warning
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>