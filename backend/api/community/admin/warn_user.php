<?php
// backend/api/community/admin/warn_user.php - FIXED VERSION
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

try {
  if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);
  
  $adminUsername = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID, Username, FullName, Role FROM Users WHERE Username=? LIMIT 1");
  $st->bind_param("s", $adminUsername);
  $st->execute();
  $admin = $st->get_result()->fetch_assoc();
  
  if (!$admin) fail('Không tìm thấy tài khoản', 404);
  if ($admin['Role'] !== 'Admin') fail('Bạn không có quyền admin', 403);
  
  $adminId = (int)$admin['UserID'];
  
  $targetUserId = (int)($_POST['user_id'] ?? 0);
  $reason = trim($_POST['reason'] ?? '');
  $warningType = $_POST['warning_type'] ?? 'post_violation';
  $severity = $_POST['severity'] ?? 'medium';
  $expireDays = (int)($_POST['expire_days'] ?? 30);
  $postId = (int)($_POST['post_id'] ?? 0);
  
  if ($targetUserId <= 0) fail('Người dùng không hợp lệ', 400);
  if (empty($reason)) fail('Vui lòng nhập lý do cảnh cáo', 400);
  if ($postId <= 0) fail('Không có thông tin bài viết', 400);
  
  $st = $conn->prepare("SELECT UserID, Username, FullName FROM Users WHERE UserID = ?");
  $st->bind_param("i", $targetUserId);
  $st->execute();
  $userResult = $st->get_result();
  
  if ($userResult->num_rows === 0) {
    fail('Người dùng không tồn tại', 404);
  }
  
  $user = $userResult->fetch_assoc();
  $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expireDays} days"));
  
  $st = $conn->prepare("SELECT PostID, Content, UserID, Status, Privacy FROM CommunityPost WHERE PostID = ?");
  $st->bind_param("i", $postId);
  $st->execute();
  $postResult = $st->get_result();
  
  if ($postResult->num_rows === 0) {
    fail('Bài viết không tồn tại', 404);
  }
  
  $post = $postResult->fetch_assoc();
  
  if (!empty($post['Status']) && !in_array($post['Status'], ['active','public','approved'])) {
    fail('Bài viết không khả dụng', 400);
  }
  
  if ($post['UserID'] != $targetUserId) {
    fail('Bài viết không thuộc về người dùng này', 400);
  }
  
  $conn->begin_transaction();
  
  try {
    // 1. Insert warning
    $insertStmt = $conn->prepare("INSERT INTO UserWarning (UserID, AdminID, WarningType, Reason, Severity, ExpiresAt, PostID) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $insertStmt->bind_param("iissssi", $targetUserId, $adminId, $warningType, $reason, $severity, $expiresAt, $postId);
    
    if (!$insertStmt->execute()) {
      throw new Exception("Không thể cảnh cáo người dùng: " . $insertStmt->error);
    }
    
    $warningId = $insertStmt->insert_id;
    
    // 2. Tạo thông báo - FIX: Gửi JSON đầy đủ
    $severityText = [
        'low' => 'cảnh cáo nhẹ',
        'medium' => 'cảnh cáo',
        'high' => 'cảnh cáo nghiêm trọng',
        'critical' => 'cảnh cáo cực kỳ nghiêm trọng'
    ][$severity] ?? 'cảnh cáo';
    
    // Message hiển thị trực tiếp
    $displayMessage = "⚠️ Bạn đã nhận {$severityText} từ quản trị viên {$admin['Username']}.\nLý do: {$reason}\nThời hạn: {$expireDays} ngày";
    
    // Dữ liệu JSON đầy đủ
    $messageData = [
        'display_message' => $displayMessage,
        'admin_name' => $admin['Username'],
        'admin_fullname' => $admin['FullName'],
        'reason' => $reason,
        'severity' => $severity,
        'severity_text' => $severityText,
        'post_id' => $postId,
        'warning_id' => $warningId,
        'expire_days' => $expireDays,
        'created_at' => date('Y-m-d H:i:s')
        
    ];
    
    $jsonMessage = json_encode($messageData, JSON_UNESCAPED_UNICODE);
    
    $notifyStmt = $conn->prepare("INSERT INTO CommunityNotification (UserID, ActorID, Type, Message, PostID, IsRead) VALUES (?, ?, 'user_warned', ?, ?, 0)");
    $notifyStmt->bind_param("iisi", $targetUserId, $adminId, $jsonMessage, $postId);
    
    if (!$notifyStmt->execute()) {
      error_log("Notification insert error: " . $notifyStmt->error);
      // Không throw vì cảnh cáo vẫn thành công
    }
    
    // 3. Log admin action
    try {
      $checkLogTable = $conn->query("SHOW TABLES LIKE 'AdminActionLog'");
      if ($checkLogTable->num_rows > 0) {
        $logStmt = $conn->prepare("INSERT INTO AdminActionLog (AdminID, ActionType, TargetUserID, PostID, Details) VALUES (?, 'warn_user', ?, ?, ?)");
        $logDetails = json_encode([
            'warning_id' => $warningId,
            'reason' => $reason,
            'severity' => $severity,
            'admin_name' => $admin['Username']
        ], JSON_UNESCAPED_UNICODE);
        $logStmt->bind_param("iiis", $adminId, $targetUserId, $postId, $logDetails);
        $logStmt->execute();
      }
    } catch (Exception $e) {
      error_log("AdminActionLog error: " . $e->getMessage());
    }
    
    // 4. Cập nhật báo cáo bài viết
    try {
      $checkReportTable = $conn->query("SHOW TABLES LIKE 'CommunityPostReport'");
      if ($checkReportTable->num_rows > 0) {
        $updateReportStmt = $conn->prepare("UPDATE CommunityPostReport SET Status = 'reviewed', ReviewedBy = ?, ReviewedAt = NOW(), AdminNotes = ? WHERE PostID = ? AND Status = 'pending'");
        $adminNotes = "Đã cảnh cáo người đăng: " . $reason;
        $updateReportStmt->bind_param("isi", $adminId, $adminNotes, $postId);
        $updateReportStmt->execute();
      }
    } catch (Exception $e) {
      error_log("CommunityPostReport update error: " . $e->getMessage());
    }
    
    // 5. Cập nhật trạng thái bài viết
    try {
      $checkColumn = $conn->query("SHOW COLUMNS FROM CommunityPost LIKE 'IsReported'");
      if ($checkColumn->num_rows > 0) {
        $updatePostStmt = $conn->prepare("UPDATE CommunityPost SET IsReported = 1, ReportCount = ReportCount + 1 WHERE PostID = ?");
        $updatePostStmt->bind_param("i", $postId);
        $updatePostStmt->execute();
      }
    } catch (Exception $e) {
      error_log("CommunityPost update error: " . $e->getMessage());
    }
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => '✅ Đã cảnh cáo ' . $user['Username'] . ' về bài viết',
        'warning_id' => $warningId,
        'notification_data' => $messageData, // Gửi thêm dữ liệu để debug
        'post_id' => $postId,
        'user' => [
            'id' => $user['UserID'],
            'username' => $user['Username'],
            'fullname' => $user['FullName']
        ]
    ], JSON_UNESCAPED_UNICODE);
    
  } catch (Exception $e) {
    $conn->rollback();
    error_log("Transaction error: " . $e->getMessage());
    fail('Lỗi transaction: ' . $e->getMessage(), 500);
  }
  
} catch (Throwable $e) {
  error_log("Fatal error: " . $e->getMessage());
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>