<?php
// /HeThongChamSocCaKoi/backend/api/community/notifications/create.php
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

function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['user_id'])) {
        fail('Chưa đăng nhập', 401);
    }
    
    $currentUserId = (int)$_SESSION['user_id'];
    
    // Lấy dữ liệu từ POST (có thể là JSON hoặc form data)
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Nếu không phải JSON, dùng POST thông thường
        $input = $_POST;
    }
    
    if (empty($input)) {
        fail('Không có dữ liệu', 400);
    }
    
    // Xác định loại request
    if (isset($input['type'])) {
        // Tạo thông báo mới
        
        // Kiểm tra quyền (chỉ admin có thể tạo thông báo cho người khác)
        $checkStmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
        $checkStmt->bind_param("i", $currentUserId);
        $checkStmt->execute();
        $userResult = $checkStmt->get_result();
        
        if ($userResult->num_rows === 0) {
            fail('Người dùng không tồn tại', 404);
        }
        
        $user = $userResult->fetch_assoc();
        $isAdmin = ($user['Role'] === 'Admin');
        
        // Các trường bắt buộc
        $required = ['user_id', 'type'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                fail("Thiếu trường bắt buộc: $field", 400);
            }
        }
        
        $targetUserId = (int)$input['user_id'];
        $type = $input['type'];
        $message = $input['message'] ?? '';
        $postId = isset($input['post_id']) ? (int)$input['post_id'] : null;
        $commentId = isset($input['comment_id']) ? (int)$input['comment_id'] : null;
        $actorId = $input['actor_id'] ?? $currentUserId;
        
        // Kiểm tra quyền: Người dùng thường chỉ có thể tạo thông báo cho chính mình
        if (!$isAdmin && $targetUserId !== $currentUserId) {
            fail('Bạn không có quyền tạo thông báo cho người khác', 403);
        }
        
        // Kiểm tra user tồn tại
        $checkTargetStmt = $conn->prepare("SELECT UserID FROM Users WHERE UserID = ?");
        $checkTargetStmt->bind_param("i", $targetUserId);
        $checkTargetStmt->execute();
        
        if ($checkTargetStmt->get_result()->num_rows === 0) {
            fail('Người dùng nhận thông báo không tồn tại', 404);
        }
        
        // Chèn thông báo
        $stmt = $conn->prepare("
            INSERT INTO CommunityNotification 
            (UserID, ActorID, Type, Message, PostID, CommentID, IsRead, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
        ");
        
        $stmt->bind_param(
            "iissii", 
            $targetUserId, 
            $actorId, 
            $type, 
            $message, 
            $postId, 
            $commentId
        );
        
        if (!$stmt->execute()) {
            fail('Lỗi tạo thông báo: ' . $conn->error, 500);
        }
        
        $notificationId = $conn->insert_id;
        
        success([
            'notification_id' => $notificationId,
            'message' => 'Đã tạo thông báo thành công'
        ]);
        
    } else {
        // Không có type, trả về lỗi
        fail('Thiếu loại thông báo', 400);
    }
    
} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>