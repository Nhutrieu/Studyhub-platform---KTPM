<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  if (empty($_SESSION['username'])) fail('Chưa đăng nhập', 401);

  $postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
  if ($postId <= 0) fail('Thiếu post_id');

  // Lấy user hiện tại
  $u = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=? LIMIT 1");
  $st->bind_param("s", $u);
  $st->execute();
  $user = $st->get_result()->fetch_assoc();
  if (!$user) fail('Không tìm thấy người dùng', 404);
  $uid = (int)$user['UserID'];

  // Kiểm tra bài viết
  $check = $conn->prepare("SELECT UserID, OriginalPostID, is_original_deleted FROM CommunityPost WHERE PostID=? LIMIT 1");
  $check->bind_param("i", $postId);
  $check->execute();
  $post = $check->get_result()->fetch_assoc();
  if (!$post) fail('Bài viết không tồn tại', 404);
  
  // Chỉ cho phép xóa nếu bài viết thuộc về user
  if ((int)$post['UserID'] !== $uid) fail('Không có quyền xóa bài này', 403);

  $conn->begin_transaction();

  // PHÂN BIỆT BÀI VIẾT GỐC VÀ BÀI CHIA SẺ
  $isOriginalPost = empty($post["OriginalPostID"]);
  $originalPostId = $isOriginalPost ? $postId : (int)$post["OriginalPostID"];

  // =============================
  // XÓA TẤT CẢ LIÊN QUAN
  // =============================

  // Media
  $conn->query("DELETE FROM CommunityPostMedia WHERE PostID = $postId");

  // Reaction
  $conn->query("DELETE FROM CommunityReaction WHERE PostID = $postId");

  // Comment
  $conn->query("DELETE FROM CommunityComment WHERE PostID = $postId");

  // Notification
  $conn->query("DELETE FROM CommunityNotification WHERE PostID = $postId");

  // =============================
  // XỬ LÝ KHÁC NHAU CHO BÀI GỐC VÀ BÀI CHIA SẺ
  // =============================
  
  if ($isOriginalPost) {
    // NẾU LÀ BÀI VIẾT GỐC:
    
    // 1. KIỂM TRA XEM CÁC CỘT ORIGINAL_* CÓ TỒN TẠI KHÔNG
    $checkColumns = $conn->query("SHOW COLUMNS FROM CommunityPost LIKE 'original_content'");
    $hasOriginalColumns = $checkColumns->num_rows > 0;
    
    if ($hasOriginalColumns) {
        // NẾU CÓ CỘT ORIGINAL_*: LẤY VÀ LƯU THÔNG TIN
        $stmt = $conn->prepare("SELECT 
            p.Content as original_content,
            p.CreatedAt as original_created_at,
            u.UserID as original_user_id,
            u.Username as original_username,
            u.FullName as original_fullname,
            u.AvatarURL as original_avatar,
            u.Role as original_role
        FROM CommunityPost p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.PostID = ?");
        $stmt->bind_param("i", $postId);
        $stmt->execute();
        $originalInfo = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        if ($originalInfo) {
            // CẬP NHẬT BÀI CHIA SẺ VỚI THÔNG TIN GỐC
            $updateShares = $conn->prepare("
                UPDATE CommunityPost 
                SET 
                    is_original_deleted = 1,
                    original_content = ?,
                    original_created_at = ?,
                    original_user_id = ?,
                    original_username = ?,
                    original_fullname = ?,
                    original_avatar = ?,
                    original_role = ?
                WHERE OriginalPostID = ?
            ");
            
            $updateShares->bind_param(
                "ssiisssi",
                $originalInfo['original_content'],
                $originalInfo['original_created_at'],
                $originalInfo['original_user_id'],
                $originalInfo['original_username'],
                $originalInfo['original_fullname'],
                $originalInfo['original_avatar'],
                $originalInfo['original_role'],
                $postId
            );
            $updateShares->execute();
            $updateShares->close();
        }
    } else {
        // NẾU KHÔNG CÓ CỘT ORIGINAL_*: CHỈ ĐÁNH DẤU is_original_deleted
        $updateShares = $conn->prepare("
            UPDATE CommunityPost 
            SET is_original_deleted = 1
            WHERE OriginalPostID = ?
        ");
        $updateShares->bind_param("i", $postId);
        $updateShares->execute();
        $updateShares->close();
    }
    
    // 3. Xóa bài viết gốc
    $del = $conn->prepare("DELETE FROM CommunityPost WHERE PostID=?");
    $del->bind_param("i", $postId);
    $del->execute();
    
  } else {
    // NẾU LÀ BÀI CHIA SẺ:
    // CHỈ xóa bài chia sẻ, KHÔNG ảnh hưởng đến bài gốc
    $del = $conn->prepare("DELETE FROM CommunityPost WHERE PostID=?");
    $del->bind_param("i", $postId);
    $del->execute();
  }

  $conn->commit();

  // Trả về kết quả
  echo json_encode([
    'success' => true, 
    'message' => $isOriginalPost ? 'Đã xóa bài viết gốc.' : 'Đã xóa bài chia sẻ.',
    'post_id' => $postId,
    'is_original_post' => $isOriginalPost,
    'original_post_id' => $originalPostId,
    'has_original_columns' => $hasOriginalColumns ?? false
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  if (isset($conn) && $conn->errno) {
    $conn->rollback();
  }
  error_log("Delete error: " . $e->getMessage());
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>