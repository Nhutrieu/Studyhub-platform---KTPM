<?php
// /HeThongChamSocCaKoi/backend/api/community/admin/remove_ban.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

error_log("=== UNBAN USER API CALLED ===");

function jsonResponse($success, $data = [], $error = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Kiểm tra session
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(false, [], 'Chưa đăng nhập');
    }
    
    $adminId = $_SESSION['user_id'];
    
    // 2. Kiểm tra quyền admin
    $checkStmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
    $checkStmt->bind_param("i", $adminId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        jsonResponse(false, [], 'Người dùng không tồn tại');
    }
    
    $user = $checkResult->fetch_assoc();
    if ($user['Role'] !== 'Admin') {
        jsonResponse(false, [], 'Chỉ quản trị viên mới được mở khóa');
    }
    
    // 3. Kiểm tra input
    if (!isset($_POST['ban_id']) || empty($_POST['ban_id'])) {
        jsonResponse(false, [], 'Thiếu ID lệnh cấm');
    }
    
    $banId = (int)$_POST['ban_id'];
    error_log("Processing ban ID: $banId");
    
    // 4. Lấy thông tin lệnh cấm
    $stmt = $conn->prepare("
        SELECT ub.*, u.Username, u.Email 
        FROM UserBan ub
        JOIN Users u ON ub.UserID = u.UserID
        WHERE ub.BanID = ?
        AND ub.IsActive = 1
    ");
    
    if (!$stmt) {
        throw new Exception('Lỗi prepare: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $banId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonResponse(false, [], 'Không tìm thấy lệnh cấm đang hiệu lực');
    }
    
    $ban = $result->fetch_assoc();
    $userId = $ban['UserID'];
    $username = $ban['Username'];
    
    error_log("Found ban for user: $userId ($username)");
    
    // 5. CẬP NHẬT BẢNG UserBan - CHỈ SET IsActive = 0 (không dùng các cột không tồn tại)
    $updateStmt = $conn->prepare("
        UPDATE UserBan 
        SET 
            IsActive = 0,
            ExpiresAt = NOW()  -- Đặt thời gian hết hạn là hiện tại
        WHERE BanID = ?
    ");
    
    if (!$updateStmt) {
        throw new Exception('Lỗi prepare update: ' . $conn->error);
    }
    
    $updateStmt->bind_param("i", $banId);
    
    if (!$updateStmt->execute()) {
        throw new Exception('Lỗi update UserBan: ' . $conn->error);
    }
    
    $affectedRows = $updateStmt->affected_rows;
    error_log("Updated UserBan rows: $affectedRows");
    
    // 6. CẬP NHẬT TRẠNG THÁI KHIẾU NẠI (nếu có)
    if ($ban['HasAppeal'] == 1 && $ban['AppealStatus'] === 'pending') {
        $updateAppealStmt = $conn->prepare("
            UPDATE UserBan 
            SET 
                AppealStatus = 'approved',
                AppealResponse = 'Tài khoản đã được mở khóa bởi quản trị viên.',
                AppealReviewedBy = ?,
                AppealReviewedAt = NOW()
            WHERE BanID = ?
        ");
        
        if ($updateAppealStmt) {
            $updateAppealStmt->bind_param("ii", $adminId, $banId);
            $updateAppealStmt->execute();
            error_log("Updated appeal status");
        }
    }
    
    // 7. GỬI THÔNG BÁO CHO USER
    try {
        $notificationMsg = "🔓 Tài khoản của bạn đã được mở khóa bởi quản trị viên. Bạn có thể sử dụng cộng đồng bình thường.";
        
        $notifStmt = $conn->prepare("
            INSERT INTO CommunityNotification 
            (UserID, Type, Message, IsRead, CreatedAt)
            VALUES (?, 'user_unbanned', ?, 0, NOW())
        ");
        
        if ($notifStmt) {
            $notifStmt->bind_param("is", $userId, $notificationMsg);
            $notifStmt->execute();
            error_log("Notification sent to user $userId");
        }
    } catch (Exception $e) {
        error_log("Notification error (non-critical): " . $e->getMessage());
    }
    
    // 8. GHI LOG HÀNH ĐỘNG
    try {
        $adminName = $_SESSION['full_name'] ?? $_SESSION['username'] ?? 'Admin';
        $details = "Admin $adminName đã mở khóa tài khoản cho user $username (ID: $userId) - BanID: $banId";
        
        $logStmt = $conn->prepare("
            INSERT INTO AdminActionLog 
            (AdminID, ActionType, TargetUserID, Details, CreatedAt)
            VALUES (?, 'user_unbanned', ?, ?, NOW())
        ");
        
        if ($logStmt) {
            $logStmt->bind_param("iis", $adminId, $userId, $details);
            $logStmt->execute();
            error_log("Action logged");
        }
    } catch (Exception $e) {
        error_log("Log error (non-critical): " . $e->getMessage());
    }
    
    error_log("=== UNBAN SUCCESS ===");
    error_log("User $username (ID: $userId) has been unbanned");
    
    jsonResponse(true, [
        'ban_id' => $banId,
        'user_id' => $userId,
        'username' => $username,
        'message' => '✅ Đã mở khóa tài khoản thành công'
    ]);
    
} catch (Exception $e) {
    error_log("=== UNBAN ERROR ===");
    error_log("Error: " . $e->getMessage());
    
    jsonResponse(false, [], 'Lỗi: ' . $e->getMessage());
}