<?php
// /HeThongChamSocCaKoi/backend/api/community/admin/process_appeal.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

// Debug session
error_log("=== PROCESS APPEAL DEBUG ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true));
error_log("POST data: " . print_r($_POST, true));

function jsonResponse($success, $data = [], $error = '') {
    http_response_code($success ? 200 : 400);
    echo json_encode([
        'success' => $success,
        'error' => $error,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Kiểm tra session
    if (!isset($_SESSION['user_id'])) {
        error_log("No user_id in session");
        jsonResponse(false, [], 'Chưa đăng nhập');
    }
    
    $userId = $_SESSION['user_id'];
    error_log("User ID from session: $userId");
    
    // 2. Kiểm tra input
    if (!isset($_POST['ban_id']) || empty($_POST['ban_id'])) {
        jsonResponse(false, [], 'Thiếu ID lệnh cấm');
    }
    
    if (!isset($_POST['action']) || !in_array($_POST['action'], ['approve', 'reject'])) {
        jsonResponse(false, [], 'Hành động không hợp lệ');
    }
    
    $banId = (int)$_POST['ban_id'];
    $action = $_POST['action'];
    
    error_log("Processing ban ID: $banId, action: $action");
    
    // 3. Kiểm tra quyền admin đơn giản hơn
    $stmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonResponse(false, [], 'Người dùng không tồn tại');
    }
    
    $user = $result->fetch_assoc();
    if ($user['Role'] !== 'Admin') {
        jsonResponse(false, [], 'Chỉ quản trị viên mới được xử lý');
    }
    
    // 4. Kiểm tra khiếu nại có tồn tại và đang pending
    $checkStmt = $conn->prepare("
        SELECT BanID, UserID, AppealStatus 
        FROM UserBan 
        WHERE BanID = ? 
        AND HasAppeal = 1 
        AND AppealStatus = 'pending'
    ");
    $checkStmt->bind_param("i", $banId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        jsonResponse(false, [], 'Không tìm thấy khiếu nại đang chờ xử lý');
    }
    
    $ban = $checkResult->fetch_assoc();
    $targetUserId = $ban['UserID'];
    
    // 5. Cập nhật trạng thái
    $appealStatus = $action === 'approve' ? 'approved' : 'rejected';
    $appealResponse = $action === 'approve' ? 
        'Khiếu nại đã được duyệt' : 
        'Khiếu nại đã bị từ chối';
    
    $updateStmt = $conn->prepare("
        UPDATE UserBan 
        SET 
            AppealStatus = ?,
            AppealResponse = ?,
            AppealReviewedBy = ?,
            AppealReviewedAt = NOW()
        WHERE BanID = ?
    ");
    
    $updateStmt->bind_param("ssii", $appealStatus, $appealResponse, $userId, $banId);
    
    if (!$updateStmt->execute()) {
        jsonResponse(false, [], 'Lỗi cập nhật: ' . $conn->error);
    }
    
    // 6. Nếu duyệt, vô hiệu hóa lệnh cấm
    if ($action === 'approve') {
        $deactivateStmt = $conn->prepare("
            UPDATE UserBan 
            SET IsActive = 0 
            WHERE BanID = ?
        ");
        $deactivateStmt->bind_param("i", $banId);
        $deactivateStmt->execute();
    }
    
    error_log("Appeal processed successfully");
    
    jsonResponse(true, [
        'ban_id' => $banId,
        'action' => $action,
        'status' => $appealStatus,
        'message' => 'Xử lý thành công'
    ]);
    
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    jsonResponse(false, [], 'Lỗi: ' . $e->getMessage());
}