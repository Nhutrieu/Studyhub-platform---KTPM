<?php
// backend/api/community/posts/check_user_status.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../../includes/db.php';
require_once '../../../../../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Kiểm tra đăng nhập
    requireLogin();
    
    $userId = (int)$_SESSION['userid'];
    
    // Kiểm tra cấm đăng bài
    $banInfo = checkUserBanForPosting($userId);
    
    // Lấy cảnh cáo
    $warnings = getUserWarnings($userId);
    
    success([
        'user_id' => $userId,
        'can_post' => !$banInfo['is_banned'],
        'ban_info' => $banInfo,
        'warnings' => $warnings,
        'warning_count' => count($warnings),
        'is_admin' => isAdmin()
    ]);
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}

// Các hàm helper
function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}
?>