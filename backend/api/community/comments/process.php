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
    // Kiểm tra đăng nhập và quyền admin
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }
    
    $adminId = (int)$_SESSION['userid'];
    
    // Kiểm tra quyền admin
    $checkAdminSql = "SELECT Role FROM Users WHERE UserID = ?";
    $checkStmt = $conn->prepare($checkAdminSql);
    $checkStmt->bind_param("i", $adminId);
    $checkStmt->execute();
    $adminResult = $checkStmt->get_result();
    
    if ($adminResult->num_rows === 0 || $adminResult->fetch_assoc()['Role'] !== 'Admin') {
        fail("Không có quyền truy cập", 403);
    }
    
    $commentId = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : 0;
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    $banDays = isset($_POST['ban_days']) ? (int)$_POST['ban_days'] : 7;
    $adminNotes = isset($_POST['admin_notes']) ? trim($_POST['admin_notes']) : '';
    
    // Validate input
    if ($commentId <= 0) {
        fail("Thiếu comment_id");
    }
    
    $validActions = ['delete', 'ban', 'delete_and_ban', 'dismiss'];
    if (!in_array($action, $validActions)) {
        fail("Hành động không hợp lệ. Chọn: delete, ban, delete_and_ban, dismiss");
    }
    
    // Lấy thông tin comment
    $commentSql = "
        SELECT 
            c.*, 
            u.UserID as commenter_id,
            u.Username as commenter_username,
            u.Email as commenter_email,
            p.PostID,
            p.UserID as post_owner_id
        FROM CommunityComment c
        JOIN Users u ON c.UserID = u.UserID
        JOIN CommunityPost p ON c.PostID = p.PostID
        WHERE c.CommentID = ?
    ";
    
    $stmt = $conn->prepare($commentSql);
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $commentResult = $stmt->get_result();
    
    if ($commentResult->num_rows === 0) {
        fail("Comment không tồn tại", 404);
    }
    
    $commentData = $commentResult->fetch_assoc();
    $commenterId = (int)$commentData['commenter_id'];
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    try {
        // 1. Cập nhật tất cả báo cáo liên quan
        $updateReportsSql = "
            UPDATE CommunityReport 
            SET Status = 'reviewed', 
                ReviewedBy = ?, 
                ReviewedAt = NOW(),
                AdminNotes = ?
            WHERE CommentID = ? AND Status = 'pending'
        ";
        
        $updateStmt = $conn->prepare($updateReportsSql);
        $updateStmt->bind_param("isi", $adminId, $adminNotes, $commentId);
        $updateStmt->execute();
        
        $actionDetails = '';
        
        // 2. Thực hiện hành động
        if ($action === 'delete' || $action === 'delete_and_ban') {
            // Xóa comment
            $deleteSql = "
                UPDATE CommunityComment 
                SET Status = 'deleted' 
                WHERE CommentID = ?
            ";
            
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->bind_param("i", $commentId);
            $deleteStmt->execute();
            
            // Cập nhật số comment của post
            $updatePostSql = "
                UPDATE CommunityPost 
                SET CommentCount = CommentCount - 1 
                WHERE PostID = ?
            ";
            
            $updatePostStmt = $conn->prepare($updatePostSql);
            $updatePostStmt->bind_param("i", $commentData['PostID']);
            $updatePostStmt->execute();
            
            $actionDetails .= "Đã xóa comment #{$commentId}. ";
            
            // Gửi thông báo cho chủ comment
            $notifyCommenterSql = "
                INSERT INTO CommunityNotification 
                (UserID, ActorID, Type, PostID, CommentID, IsRead) 
                VALUES (?, ?, 'comment_deleted', ?, ?, 0)
            ";
            
            $notifyStmt = $conn->prepare($notifyCommenterSql);
            $notifyStmt->bind_param("iiii", $commenterId, $adminId, $commentData['PostID'], $commentId);
            $notifyStmt->execute();
        }
        
        if ($action === 'ban' || $action === 'delete_and_ban') {
            // Vô hiệu hóa lệnh cấm cũ
            $deactivateSql = "
                UPDATE UserChatBan 
                SET IsActive = 0 
                WHERE UserID = ? AND IsActive = 1
            ";
            
            $deactivateStmt = $conn->prepare($deactivateSql);
            $deactivateStmt->bind_param("i", $commenterId);
            $deactivateStmt->execute();
            
            // Thêm lệnh cấm mới
            $banReason = "Vi phạm quy định cộng đồng. Comment #{$commentId}";
            if (!empty($adminNotes)) {
                $banReason .= " - Ghi chú: " . $adminNotes;
            }
            
            $insertBanSql = "
                INSERT INTO UserChatBan 
                (UserID, BannedBy, Reason, BanDuration) 
                VALUES (?, ?, ?, ?)
            ";
            
            $insertBanStmt = $conn->prepare($insertBanSql);
            $insertBanStmt->bind_param("iisi", $commenterId, $adminId, $banReason, $banDays);
            $insertBanStmt->execute();
            
            $banText = $banDays == 0 ? 'vĩnh viễn' : "{$banDays} ngày";
            $actionDetails .= "Đã cấm user {$commentData['commenter_username']} {$banText}. ";
            
            // Gửi thông báo cho user bị cấm
            $banNotifySql = "
                INSERT INTO CommunityNotification 
                (UserID, ActorID, Type, PostID, CommentID, IsRead) 
                VALUES (?, ?, 'user_banned', ?, ?, 0)
            ";
            
            $banNotifyStmt = $conn->prepare($banNotifySql);
            $banNotifyStmt->bind_param("iiii", $commenterId, $adminId, $commentData['PostID'], $commentId);
            $banNotifyStmt->execute();
        }
        
        if ($action === 'dismiss') {
            $actionDetails = "Đã bỏ qua báo cáo comment #{$commentId}";
        }
        
        // Commit transaction
        $conn->commit();
        
        // Log action
        $logSql = "
            INSERT INTO AdminActionLog 
            (AdminID, ActionType, TargetUserID, CommentID, ReportID, Details) 
            VALUES (?, ?, ?, ?, NULL, ?)
        ";
        
        $logStmt = $conn->prepare($logSql);
        $logStmt->bind_param("isiis", $adminId, $action, $commenterId, $commentId, $actionDetails);
        $logStmt->execute();
        
        success([
            'message' => '✅ ' . $actionDetails,
            'action' => $action,
            'comment_id' => $commentId,
            'ban_days' => $banDays
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        fail("Lỗi hệ thống: " . $e->getMessage(), 500);
    }
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>