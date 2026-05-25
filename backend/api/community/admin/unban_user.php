<?php
// backend/api/community/admin/unban_user.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
require_once '../../../../../../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Kiểm tra đăng nhập và quyền admin
    requireLogin();
    requireAdmin();
    
    $adminId = (int)$_SESSION['userid'];
    
    // Lấy dữ liệu từ POST
    $targetUserId = (int)($_POST['user_id'] ?? 0);
    
    if ($targetUserId <= 0) {
        fail("Người dùng không hợp lệ");
    }
    
    // Kiểm tra người dùng tồn tại
    $checkUserSql = "SELECT UserID, Username, FullName FROM Users WHERE UserID = ?";
    $stmt = $conn->prepare($checkUserSql);
    $stmt->bind_param("i", $targetUserId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        fail("Người dùng không tồn tại");
    }
    
    $user = $result->fetch_assoc();
    
    // Vô hiệu hóa lệnh cấm hiện tại
    $updateSql = "UPDATE UserBan SET IsActive = 0 WHERE UserID = ? AND IsActive = 1";
    $stmt = $conn->prepare($updateSql);
    $stmt->bind_param("i", $targetUserId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        // Ghi log hành động admin
        $logSql = "INSERT INTO AdminActionLog (AdminID, ActionType, TargetUserID, Details) 
                   VALUES (?, 'unban_user', ?, ?)";
        $stmt = $conn->prepare($logSql);
        $details = json_encode([
            'action' => 'unban',
            'target_username' => $user['Username'],
            'target_fullname' => $user['FullName']
        ]);
        $stmt->bind_param("iis", $adminId, $targetUserId, $details);
        $stmt->execute();
        
        // Tạo thông báo cho người dùng
        $notificationSql = "INSERT INTO CommunityNotification (UserID, ActorID, Type, CreatedAt) 
                           VALUES (?, ?, 'user_unbanned', NOW())";
        $stmt = $conn->prepare($notificationSql);
        $stmt->bind_param("ii", $targetUserId, $adminId);
        $stmt->execute();
        
        success([
            'message' => 'Đã gỡ cấm đăng bài cho người dùng thành công',
            'user' => [
                'id' => $user['UserID'],
                'username' => $user['Username'],
                'fullname' => $user['FullName']
            ]
        ]);
    } else {
        fail("Người dùng này không bị cấm hoặc đã được gỡ cấm trước đó");
    }
    
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