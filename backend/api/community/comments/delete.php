<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

// 🟢 HÀM TRẢ VỀ LỖI CHUẨN
function json_error($message, $code = 400) {
  http_response_code($code);
  echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
  exit;
}

// 🟢 HÀM TRẢ VỀ THÀNH CÔNG
function json_success($data = []) {
  echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
  exit;
}

// 🟢 KIỂM TRA ĐĂNG NHẬP
if (!isset($_SESSION['username'])) {
  json_error('Chưa đăng nhập', 401);
}

$username = $_SESSION['username'];
$commentId = (int)($_POST['comment_id'] ?? 0);

if ($commentId <= 0) {
  json_error('Thiếu comment_id', 400);
}

try {
  // 🟢 LẤY THÔNG TIN USER HIỆN TẠI
  $stmt = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ?");
  $stmt->bind_param("s", $username);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  
  if (!$user) {
    json_error('Tài khoản không tồn tại', 404);
  }
  
  $currentUserId = (int)$user['UserID'];
  $currentUserRole = strtolower(trim($user['Role'] ?? 'user'));
  
  // 🟢 LẤY THÔNG TIN COMMENT
  $stmt = $conn->prepare("
    SELECT c.UserID, c.PostID, p.UserID AS PostOwnerID 
    FROM CommunityComment c
    JOIN CommunityPost p ON c.PostID = p.PostID
    WHERE c.CommentID = ?
  ");
  
  $stmt->bind_param("i", $commentId);
  $stmt->execute();
  $comment = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  
  if (!$comment) {
    json_error('Bình luận không tồn tại', 404);
  }
  
  $commentUserId = (int)$comment['UserID'];
  $postId = (int)$comment['PostID'];
  $postOwnerId = (int)$comment['PostOwnerID'];
  
  // 🟢 KIỂM TRA QUYỀN
  $canDelete = false;
  
  // Quyền xóa:
  // 1. Chủ comment
  if ($commentUserId === $currentUserId) {
    $canDelete = true;
  }
  // 2. Chủ bài viết
  elseif ($postOwnerId === $currentUserId) {
    $canDelete = true;
  }
  // 3. Admin
  elseif ($currentUserRole === 'admin') {
    $canDelete = true;
  }
  
  if (!$canDelete) {
    json_error('Bạn không có quyền xóa bình luận này', 403);
  }
  
  // 🟢 XÓA COMMENT
  $stmt = $conn->prepare("DELETE FROM CommunityComment WHERE CommentID = ?");
  $stmt->bind_param("i", $commentId);
  
  if (!$stmt->execute()) {
    throw new Exception('Không thể xóa bình luận');
  }
  $stmt->close();
  
  // 🟢 XÓA REACTION (NẾU CÓ)
  $stmt = $conn->prepare("DELETE FROM CommunityCommentReaction WHERE CommentID = ?");
  if ($stmt) {
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $stmt->close();
  }
  
  // 🟢 CẬP NHẬT SỐ LƯỢNG COMMENT
  $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM CommunityComment WHERE PostID = ?");
  $stmt->bind_param("i", $postId);
  $stmt->execute();
  $result = $stmt->get_result();
  $row = $result->fetch_assoc();
  $totalComments = (int)$row['total'];
  $stmt->close();
  
  $stmt = $conn->prepare("UPDATE CommunityPost SET CommentCount = ? WHERE PostID = ?");
  $stmt->bind_param("ii", $totalComments, $postId);
  $stmt->execute();
  $stmt->close();
  
  // 🟢 TRẢ KẾT QUẢ
  json_success([
    'message' => 'Đã xóa bình luận thành công',
    'post_id' => $postId,
    'comment_id' => $commentId,
    'total_comments' => $totalComments,
    'deleted_by_admin' => ($currentUserRole === 'admin')
  ]);
  
} catch (Exception $e) {
  error_log("Delete comment error: " . $e->getMessage());
  json_error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>