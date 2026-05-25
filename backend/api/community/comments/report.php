<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
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
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }
    
    $reporterId = (int)$_SESSION['userid'];
    $commentId = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : 0;
    $reason = isset($_POST['reason']) ? trim($_POST['reason']) : '';
    $reportType = isset($_POST['type']) ? $_POST['type'] : 'other';
    
    if ($commentId <= 0) fail("Thiếu comment_id");
    if (empty($reason) || strlen($reason) < 10) {
        fail("Vui lòng nhập lý do báo cáo chi tiết (ít nhất 10 ký tự)");
    }
    
    $validTypes = ['spam', 'abuse', 'inappropriate', 'other'];
    if (!in_array($reportType, $validTypes)) $reportType = 'other';
    
    // Kiểm tra comment
    $checkSql = "
        SELECT c.CommentID, c.UserID as commenter_id, c.PostID, u.Username, u.FullName
        FROM CommunityComment c
        JOIN Users u ON c.UserID = u.UserID
        WHERE c.CommentID = ? AND c.Status = 'active'
    ";
    
    $stmt = $conn->prepare($checkSql);
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        fail("Comment không tồn tại hoặc đã bị xóa", 404);
    }
    
    $commentData = $result->fetch_assoc();
    
    if ($commentData['commenter_id'] == $reporterId) {
        fail("Không thể báo cáo comment của chính mình", 400);
    }
    
    // Kiểm tra đã báo cáo chưa
    $checkReportSql = "
        SELECT ReportID FROM CommunityReport 
        WHERE CommentID = ? AND ReporterID = ? AND Status = 'pending'
        AND CreatedAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ";
    
    $stmt2 = $conn->prepare($checkReportSql);
    $stmt2->bind_param("ii", $commentId, $reporterId);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    
    if ($result2->num_rows > 0) {
        fail("Bạn đã báo cáo comment này trong vòng 24h qua", 400);
    }
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    try {
        // 1. Thêm báo cáo
        $insertSql = "
            INSERT INTO CommunityReport 
            (CommentID, ReporterID, Reason, ReportType, Status) 
            VALUES (?, ?, ?, ?, 'pending')
        ";
        
        $stmt3 = $conn->prepare($insertSql);
        $stmt3->bind_param("iiss", $commentId, $reporterId, $reason, $reportType);
        
        if (!$stmt3->execute()) {
            throw new Exception("Lỗi khi thêm báo cáo: " . $stmt3->error);
        }
        
        $reportId = $conn->insert_id;
        
        // 2. Lấy thông tin người báo cáo
        $reporterInfoSql = "SELECT Username, FullName FROM Users WHERE UserID = ?";
        $stmt4 = $conn->prepare($reporterInfoSql);
        $stmt4->bind_param("i", $reporterId);
        $stmt4->execute();
        $reporterData = $stmt4->get_result()->fetch_assoc();
        
        $reporterName = $reporterData['FullName'] ?: $reporterData['Username'];
        
        // 3. Gửi thông báo đến TẤT CẢ admin
        $adminSql = "
            SELECT UserID FROM Users 
            WHERE Role = 'Admin' AND IsActive = 1
        ";
        
        $adminResult = $conn->query($adminSql);
        
        $notificationCount = 0;
        while ($admin = $adminResult->fetch_assoc()) {
            // Tạo message JSON
            $messageData = [
                'report_id' => $reportId,
                'report_type' => $reportType,
                'reason' => $reason,
                'reporter_name' => $reporterName,
                'comment_id' => $commentId,
                'post_id' => $commentData['PostID'],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            $messageJson = json_encode($messageData, JSON_UNESCAPED_UNICODE);
            
            // Tạo thông báo với Message
            $notifySql = "
                INSERT INTO CommunityNotification 
                (UserID, ActorID, Type, Message, PostID, CommentID, IsRead, CreatedAt) 
                VALUES (?, ?, 'comment_reported', ?, ?, ?, 0, NOW())
            ";
            
            $notifyStmt = $conn->prepare($notifySql);
            $notifyStmt->bind_param("iisii", 
                $admin['UserID'], 
                $reporterId, 
                $messageJson,
                $commentData['PostID'], 
                $commentId
            );
            
            if ($notifyStmt->execute()) {
                $notificationCount++;
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // Log activity
        $logSql = "
            INSERT INTO AdminActionLog 
            (AdminID, ActionType, TargetUserID, CommentID, ReportID, Details) 
            VALUES (?, 'report_created', ?, ?, ?, ?)
        ";
        
        $logStmt = $conn->prepare($logSql);
        $logDetails = "User {$reporterName} reported comment #{$commentId}: {$reason}";
        $logStmt->bind_param("iiiss", $reporterId, $commentData['commenter_id'], $commentId, $reportId, $logDetails);
        $logStmt->execute();
        
        success([
            'message' => '✅ Đã gửi báo cáo đến quản trị viên!',
            'report_id' => $reportId,
            'notifications_sent' => $notificationCount
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        fail("Lỗi hệ thống: " . $e->getMessage(), 500);
    }
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>