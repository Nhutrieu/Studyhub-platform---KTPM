<?php
// backend/api/community/admin/ban_user.php
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
  $reason = trim($_POST['reason'] ?? '');
  $duration = (int)($_POST['duration'] ?? 7);
  $banType = trim($_POST['ban_type'] ?? 'post_only'); // Thêm ban_type từ form
  
  // Kiểm tra dữ liệu
  if ($targetUserId <= 0) fail('ID người dùng không hợp lệ');
  if (empty($reason)) fail('Vui lòng nhập lý do cấm');
  
  // Kiểm tra không tự cấm mình
  if ($targetUserId === $adminId) fail('Không thể tự cấm chính mình');
  
  // Kiểm tra người dùng tồn tại
  $checkStmt = $conn->prepare("SELECT UserID, Username, FullName FROM Users WHERE UserID = ?");
  $checkStmt->bind_param("i", $targetUserId);
  $checkStmt->execute();
  $targetUser = $checkStmt->get_result()->fetch_assoc();
  
  if (!$targetUser) fail('Người dùng không tồn tại');
  
  // Kiểm tra ban_type hợp lệ
  $validBanTypes = ['post_only', 'comment_only', 'full_ban'];
  if (!in_array($banType, $validBanTypes)) {
    $banType = 'post_only';
  }
  
  // Map ban_type sang text hiển thị
  $banTypeTexts = [
    'post_only' => 'Chỉ đăng bài',
    'comment_only' => 'Chỉ bình luận', 
    'full_ban' => 'Cấm hoàn toàn'
  ];
  $banTypeText = $banTypeTexts[$banType] ?? 'Chỉ đăng bài';
  
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
    
    // Tạo thông báo cho người dùng
    $notifStmt = $conn->prepare("
      INSERT INTO CommunityNotification (UserID, ActorID, Type, CreatedAt) 
      VALUES (?, ?, 'user_banned', NOW())
    ");
    $notifStmt->bind_param("ii", $targetUserId, $adminId);
    $notifStmt->execute();
    
    // Ghi log hành động admin
    $logStmt = $conn->prepare("
      INSERT INTO AdminActionLog (AdminID, ActionType, TargetUserID, Details, CreatedAt)
      VALUES (?, 'ban_user', ?, ?, NOW())
    ");
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
    $logStmt->bind_param("iis", $adminId, $targetUserId, $details);
    $logStmt->execute();
    
    // Trả về response với đầy đủ thông tin
    echo json_encode([  
      'success' => true,
      'message' => 'Đã chặn người dùng thành công',
      'ban_id' => $banId,
      'user' => [
        'id' => $targetUser['UserID'],
        'username' => $targetUser['Username'],
        'fullname' => $targetUser['FullName'] ?: $targetUser['Username'] // Ưu tiên FullName, nếu không có thì dùng Username
      ],
      'ban_info' => [
        'type' => $banType,
        'type_text' => $banTypeText,
        'reason' => $reason,
        'duration' => $duration . ' ngày',
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
?>