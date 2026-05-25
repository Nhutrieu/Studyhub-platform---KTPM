<?php
// backend/api/community/admin/ban_comment.php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php'; // SỬA ĐƯỜNG DẪN NÀY
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  // Kiểm tra admin
  if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);
  
  // Lấy thông tin user để kiểm tra role
  $username = $_SESSION['username'];
  $stmt = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ? LIMIT 1");
  $stmt->bind_param("s", $username);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();
  
  if (!$user) fail('Không tìm thấy tài khoản', 404);
  if ($user['Role'] !== 'Admin') fail('Bạn không có quyền Admin', 403);
  
  $adminId = (int)$user['UserID'];
  
  // Lấy dữ liệu từ POST
  $targetUserId = (int)($_POST['user_id'] ?? 0);
  $targetUsername = trim($_POST['username'] ?? '');
  $reason = trim($_POST['reason'] ?? 'Vi phạm chính sách bình luận');
  $duration = (int)($_POST['duration'] ?? 7);
  
  // VALIDATION - SỬA ĐỂ HỖ TRỢ CẢ USERNAME
  if ($targetUserId <= 0 && empty($targetUsername)) {
    fail('Thiếu thông tin người dùng (ID hoặc Username)');
  }
  
  if (empty($reason)) {
    $reason = 'Vi phạm chính sách bình luận';
  }
  
  // XÁC ĐỊNH USER CẦN CẤM (HỖ TRỢ CẢ USERNAME)
  $targetUser = null;
  
  if ($targetUserId <= 0 && !empty($targetUsername)) {
    // Tìm user bằng username
    $stmt = $conn->prepare("SELECT UserID, Username, FullName, Role FROM Users WHERE Username = ? LIMIT 1");
    $stmt->bind_param("s", $targetUsername);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
      fail('Không tìm thấy người dùng: ' . $targetUsername);
    }
    
    $targetUser = $result->fetch_assoc();
    $targetUserId = (int)$targetUser['UserID'];
    
  } else {
    // Tìm user bằng ID
    $stmt = $conn->prepare("SELECT UserID, Username, FullName, Role FROM Users WHERE UserID = ?");
    $stmt->bind_param("i", $targetUserId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
      fail('Người dùng không tồn tại');
    }
    
    $targetUser = $result->fetch_assoc();
    $targetUsername = $targetUser['Username'];
  }
  
  // Kiểm tra không cấm admin
  if ($targetUser['Role'] === 'Admin') {
    fail('Không thể cấm Admin khác');
  }
  
  // Kiểm tra không tự cấm mình
  if ($targetUserId === $adminId) {
    fail('Không thể tự cấm chính mình');
  }
  
  // CỐ ĐỊNH BAN_TYPE LÀ 'comment_only' (ĐÚNG NHƯ TÊN FILE)
  $banType = 'comment_only';
  $banTypeText = 'Chỉ bình luận';
  
  // Vô hiệu hóa lệnh cấm cũ
  $disableStmt = $conn->prepare("UPDATE UserBan SET IsActive = 0 WHERE UserID = ? AND IsActive = 1");
  $disableStmt->bind_param("i", $targetUserId);
  $disableStmt->execute();
  
  // Tính ngày hết hạn
  $expiresAt = null;
  if ($duration > 0) {
    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$duration} days"));
  }
  
  // Thêm lệnh cấm mới
  $insertStmt = $conn->prepare("
    INSERT INTO UserBan (UserID, BannedBy, Reason, BanType, BanDuration, Scope, IsTemporary, IsActive, ExpiresAt) 
    VALUES (?, ?, ?, ?, ?, 'community', 1, 1, ?)
  ");
  $insertStmt->bind_param("isssis", $targetUserId, $adminId, $reason, $banType, $duration, $expiresAt);
  
  if ($insertStmt->execute()) {
    $banId = $insertStmt->insert_id;
    
    // Tạo thông báo cho người dùng (CÓ THÊM MESSAGE)
    try {
      $message = "Bạn đã bị cấm bình luận trong {$duration} ngày. Lý do: {$reason}";
      $notifStmt = $conn->prepare("
        INSERT INTO CommunityNotification (UserID, ActorID, Type, Message, IsRead, CreatedAt) 
        VALUES (?, ?, 'user_banned', ?, 0, NOW())
      ");
      $notifStmt->bind_param("iis", $targetUserId, $adminId, $message);
      $notifStmt->execute();
    } catch (Exception $e) {
      // Bỏ qua lỗi notification
    }
    
    // Ghi log hành động admin
    try {
      $details = json_encode([
        'ban_id' => $banId,
        'reason' => $reason,
        'duration' => $duration,
        'ban_type' => $banType,
        'user_info' => [
          'id' => $targetUser['UserID'],
          'username' => $targetUser['Username'],
          'fullname' => $targetUser['FullName']
        ]
      ], JSON_UNESCAPED_UNICODE);
      
      $logStmt = $conn->prepare("
        INSERT INTO AdminActionLog (AdminID, ActionType, TargetUserID, Details, CreatedAt)
        VALUES (?, 'ban_user', ?, ?, NOW())
      ");
      $logStmt->bind_param("iis", $adminId, $targetUserId, $details);
      $logStmt->execute();
    } catch (Exception $e) {
      // Bỏ qua lỗi log
    }
    
    // Trả về response với đầy đủ thông tin
    $durationText = $duration === 0 ? 'Vĩnh viễn' : "{$duration} ngày";
    
    echo json_encode([  
      'success' => true,
      'message' => 'Đã cấm bình luận user thành công',
      'ban_id' => $banId,
      'user' => [
        'id' => $targetUser['UserID'],
        'username' => $targetUser['Username'],
        'fullname' => $targetUser['FullName'] ?: $targetUser['Username']
      ],
      'ban_info' => [
        'type' => $banType,
        'type_text' => $banTypeText,
        'reason' => $reason,
        'duration' => $duration,
        'duration_text' => $durationText,
        'expires_at' => $expiresAt
      ],
      'admin' => [
        'id' => $adminId,
        'name' => $username
      ]
    ], JSON_UNESCAPED_UNICODE);
    
  } else {
    fail('Không thể tạo lệnh cấm');
  }
  
} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}