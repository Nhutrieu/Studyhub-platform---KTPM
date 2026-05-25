<?php
// backend/api/community/admin/delete_post.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
require_once '../../../../../../includes/auth.php';
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
    // Kiểm tra đăng nhập và quyền admin
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }
    
    $adminId = (int)$_SESSION['userid'];
    $adminRole = $_SESSION['role'] ?? '';
    
    if ($adminRole !== 'Admin') {
        fail("Bạn không có quyền thực hiện hành động này", 403);
    }
    
    // Lấy dữ liệu từ POST
    $postId = (int)($_POST['post_id'] ?? 0);
    $reason = trim($_POST['reason'] ?? 'Vi phạm nội quy cộng đồng');
    
    if ($postId <= 0) {
        fail("Bài viết không hợp lệ");
    }
    
    // Kiểm tra bài viết tồn tại
    $checkSql = "SELECT PostID, UserID, Content FROM CommunityPost WHERE PostID = ? AND Status = 'active'";
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        fail("Bài viết không tồn tại hoặc đã bị xóa");
    }
    
    $post = $result->fetch_assoc();
    $targetUserId = $post['UserID'];
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    try {
        // Xóa bài viết (soft delete)
        $deleteSql = "UPDATE CommunityPost SET Status = 'deleted', UpdatedAt = NOW() WHERE PostID = ?";
        $stmt = $conn->prepare($deleteSql);
        $stmt->bind_param("i", $postId);
        
        if (!$stmt->execute()) {
            throw new Exception("Không thể xóa bài viết: " . $conn->error);
        }
        
        // Ghi log hành động admin
        $logSql = "INSERT INTO AdminActionLog (AdminID, ActionType, TargetUserID, PostID, Details) 
                   VALUES (?, 'delete_post', ?, ?, ?)";
        $stmt = $conn->prepare($logSql);
        $details = json_encode([
            'post_id' => $postId,
            'reason' => $reason,
            'content_preview' => substr($post['Content'], 0, 100)
        ]);
        $stmt->bind_param("iiis", $adminId, $targetUserId, $postId, $details);
        
        if (!$stmt->execute()) {
            throw new Exception("Không thể ghi log: " . $conn->error);
        }
        
        // Cập nhật báo cáo nếu có
        $updateReportSql = "UPDATE CommunityPostReport SET Status = 'reviewed', ReviewedBy = ?, ReviewedAt = NOW() 
                           WHERE PostID = ? AND Status = 'pending'";
        $stmt = $conn->prepare($updateReportSql);
        $stmt->bind_param("ii", $adminId, $postId);
        $stmt->execute();
        
        // Tạo thông báo cho người dùng
        $notificationSql = "INSERT INTO CommunityNotification (UserID, ActorID, Type, PostID, CreatedAt) 
                           VALUES (?, ?, 'post_deleted', ?, NOW())";
        $stmt = $conn->prepare($notificationSql);
        $stmt->bind_param("iii", $targetUserId, $adminId, $postId);
        $stmt->execute();
        
        $conn->commit();
        success(['message' => 'Đã xóa bài viết thành công']);
        
    } catch (Exception $e) {
        $conn->rollback();
        fail("Lỗi transaction: " . $e->getMessage());
    }
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>