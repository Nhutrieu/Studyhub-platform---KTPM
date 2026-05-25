<?php
// /HeThongChamSocCaKoi/backend/api/community/admin/appeal_ban.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
session_start();

// Hàm response lỗi
function jsonError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Hàm response thành công
function jsonSuccess($message, $data = []) {
    echo json_encode(array_merge([
        'success' => true,
        'message' => $message
    ], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Kiểm tra đăng nhập
    if (!isset($_SESSION['user_id'])) {
        jsonError('Vui lòng đăng nhập để khiếu nại', 401);
    }

    $userId = (int)$_SESSION['user_id'];
    $username = $_SESSION['username'] ?? 'Người dùng';

    // 2. Kiểm tra dữ liệu POST
    if (!isset($_POST['ban_id']) || empty($_POST['ban_id'])) {
        jsonError('Thiếu ID lệnh cấm', 400);
    }

    if (!isset($_POST['reason']) || empty(trim($_POST['reason']))) {
        jsonError('Vui lòng nhập lý do khiếu nại', 400);
    }

    $banId = (int)$_POST['ban_id'];
    $reason = trim($_POST['reason']);

    // 3. Kết nối database
    require_once '../../../../includes/db.php';
    
    // Kiểm tra kết nối
    if (!$conn) {
        jsonError('Không thể kết nối database', 500);
    }

    // 4. Kiểm tra lệnh cấm tồn tại
    $checkStmt = $conn->prepare("
        SELECT BanID, UserID, AppealStatus, HasAppeal 
        FROM UserBan 
        WHERE BanID = ? AND UserID = ? AND Scope = 'community'
    ");
    
    if (!$checkStmt) {
        jsonError('Lỗi chuẩn bị truy vấn: ' . $conn->error, 500);
    }
    
    $checkStmt->bind_param("ii", $banId, $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonError('Lệnh cấm không tồn tại hoặc không thuộc về bạn', 404);
    }
    
    $banInfo = $result->fetch_assoc();
    
    // 5. Kiểm tra đã khiếu nại chưa
    if ($banInfo['HasAppeal'] == 1 && in_array($banInfo['AppealStatus'], ['pending', 'reviewed'])) {
        jsonError('Bạn đã gửi khiếu nại cho lệnh cấm này. Vui lòng chờ phản hồi.', 409);
    }

    // 6. Cập nhật khiếu nại
    $updateStmt = $conn->prepare("
        UPDATE UserBan 
        SET 
            AppealReason = ?,
            AppealStatus = 'pending',
            AppealSubmittedAt = NOW(),
            HasAppeal = 1
        WHERE BanID = ? AND UserID = ?
    ");
    
    if (!$updateStmt) {
        jsonError('Lỗi chuẩn bị cập nhật: ' . $conn->error, 500);
    }
    
    $updateStmt->bind_param("sii", $reason, $banId, $userId);
    
    if (!$updateStmt->execute()) {
        jsonError('Không thể cập nhật khiếu nại: ' . $conn->error, 500);
    }

    // 7. Gửi thông báo cho tất cả admin
    try {
        // Lấy danh sách admin
        $adminStmt = $conn->prepare("SELECT UserID FROM Users WHERE Role = 'Admin' AND IsActive = 1");
        if ($adminStmt) {
            $adminStmt->execute();
            $admins = $adminStmt->get_result();
            
            $notificationMsg = "Người dùng $username (ID: $userId) đã khiếu nại lệnh cấm #$banId";
            
            while ($admin = $admins->fetch_assoc()) {
                $notifStmt = $conn->prepare("
                    INSERT INTO CommunityNotification 
                    (UserID, Type, Message, CreatedAt)
                    VALUES (?, 'ban_appeal', ?, NOW())
                ");
                if ($notifStmt) {
                    $notifStmt->bind_param("is", $admin['UserID'], $notificationMsg);
                    $notifStmt->execute();
                    $notifStmt->close();
                }
            }
            $adminStmt->close();
        }
    } catch (Exception $e) {
        // Bỏ qua lỗi thông báo, không ảnh hưởng đến khiếu nại
        error_log("Notification error (non-critical): " . $e->getMessage());
    }

    // 8. Ghi log (nếu bảng tồn tại)
    try {
        $logStmt = $conn->prepare("
            INSERT INTO AdminActionLog 
            (AdminID, ActionType, TargetUserID, Details, CreatedAt)
            VALUES (?, 'ban_appeal_created', ?, ?, NOW())
        ");
        if ($logStmt) {
            $logDetails = "User $username appealed ban #$banId. Reason: $reason";
            $logStmt->bind_param("iis", $userId, $userId, $logDetails);
            $logStmt->execute();
            $logStmt->close();
        }
    } catch (Exception $e) {
        // Bỏ qua lỗi log
        error_log("Log error (non-critical): " . $e->getMessage());
    }

    // 9. Trả về thành công
    jsonSuccess('Khiếu nại đã được gửi thành công. Quản trị viên sẽ xem xét.', [
        'ban_id' => $banId,
        'appeal_status' => 'pending'
    ]);

} catch (Exception $e) {
    error_log("Appeal ban exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    jsonError('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>