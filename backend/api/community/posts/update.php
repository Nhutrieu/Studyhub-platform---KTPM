<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}

function buildImageUrl($imagePath) {
    if (!$imagePath || $imagePath === '') return null;
    
    $base_url = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https://" : "http://";
    $base_url .= $_SERVER['HTTP_HOST'];
    
    // Nếu đang chạy localhost với cổng
    if ($_SERVER['SERVER_PORT'] && $_SERVER['SERVER_PORT'] != '80' && $_SERVER['SERVER_PORT'] != '443') {
        $base_url .= ':' . $_SERVER['SERVER_PORT'];
    }
    
    // Thêm base path nếu có
    $base_path = '/HeThongChamSocCaKoi'; // Điều chỉnh theo cấu trúc của bạn
    if ($base_path !== '/') {
        $base_url .= $base_path;
    }
    
    if (strpos($imagePath, 'http://') === 0 || strpos($imagePath, 'https://') === 0) {
        return $imagePath;
    }
    
    if (strpos($imagePath, '/') === 0) {
        return $base_url . $imagePath;
    }
    
    return $base_url . '/uploads/comments/' . $imagePath;
}

try {
  // 1. Kiểm tra đăng nhập
  if (!isset($_SESSION['username'])) {
    fail('Chưa đăng nhập', 401);
  }

  $username = $_SESSION['username'];
  
  // 2. Lấy thông tin user
  $stmt = $conn->prepare("SELECT UserID, FullName, Username, AvatarURL, Role FROM Users WHERE Username = ?");
  $stmt->bind_param("s", $username);
  $stmt->execute();
  $user = $stmt->get_result()->fetch_assoc();
  
  if (!$user) {
    fail('Không tìm thấy tài khoản', 404);
  }
  
  $currentUserId = (int)$user['UserID'];

  // 3. Lấy dữ liệu từ request
  $commentId = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : 0;
  $content = isset($_POST['content']) ? trim($_POST['content']) : '';
  $action = isset($_POST['action']) ? $_POST['action'] : 'keep'; // replace, remove, keep
  
  if ($commentId <= 0) {
    fail('Thiếu comment_id hoặc comment_id không hợp lệ');
  }
  
  if ($content === '') {
    fail('Nội dung bình luận không được để trống');
  }

  // 🟢 DEBUG: Log thông tin request
  error_log("=== UPDATE COMMENT REQUEST ===");
  error_log("Comment ID: " . $commentId);
  error_log("Content: " . $content);
  error_log("Action: " . $action);
  error_log("POST data: " . print_r($_POST, true));
  error_log("FILES data: " . print_r($_FILES, true));
  
  // 4. Kiểm tra comment có tồn tại và user có quyền chỉnh sửa không
  $stmt = $conn->prepare("
    SELECT CommentID, UserID, PostID, Content, ImageURL, HasImage
    FROM CommunityComment 
    WHERE CommentID = ? 
  ");
  $stmt->bind_param("i", $commentId);
  $stmt->execute();
  $comment = $stmt->get_result()->fetch_assoc();
  
  if (!$comment) {
    fail('Bình luận không tồn tại', 404);
  }

  // Kiểm tra quyền - chỉ chủ comment mới được chỉnh sửa
  $commentUserId = (int)$comment['UserID'];
  if ($commentUserId !== $currentUserId) {
    fail('Bạn không có quyền chỉnh sửa bình luận này', 403);
  }

  // 5. XỬ LÝ ẢNH
  $image_url = $comment['ImageURL'];
  $has_image = (int)$comment['HasImage'];
  $image_removed = false;
  $new_image_name = null;
  
  error_log("Original comment image data:");
  error_log("  ImageURL: " . ($image_url ?? 'NULL'));
  error_log("  HasImage: " . $has_image);
  
  // 🟢 XỬ LÝ THEO ACTION
  error_log("Processing action: " . $action);
  
  switch ($action) {
    case 'replace':
      // 🟢 UPLOAD ẢNH MỚI
      if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        error_log("New image found for upload");
        
        // Đường dẫn upload
        $upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/HeThongChamSocCaKoi/uploads/comments/';
        error_log("Upload directory: " . $upload_dir);
        
        // Tạo thư mục nếu chưa có
        if (!file_exists($upload_dir)) {
            if (!mkdir($upload_dir, 0777, true)) {
                fail('Không thể tạo thư mục uploads');
            }
            error_log("Created upload directory");
        }
        
        // Kiểm tra loại file
        $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $file_type = $_FILES['image']['type'];
        
        // Kiểm tra MIME type thực tế
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $actual_type = finfo_file($finfo, $_FILES['image']['tmp_name']);
        finfo_close($finfo);
        
        error_log("File MIME type: " . $file_type . ", Actual type: " . $actual_type);
        
        if (!in_array($actual_type, $allowed_types)) {
            fail('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP). File type: ' . $actual_type);
        }
        
        // Kiểm tra kích thước (5MB)
        if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
            fail('Kích thước ảnh tối đa 5MB. File size: ' . $_FILES['image']['size']);
        }
        
        // Tạo tên file
        $file_extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $file_name = time() . '_' . uniqid() . '.' . $file_extension;
        $file_path = $upload_dir . $file_name;
        
        error_log("Saving image to: " . $file_path);
        
        // Di chuyển file
        if (move_uploaded_file($_FILES['image']['tmp_name'], $file_path)) {
            $image_url = 'uploads/comments/' . $file_name;
            $has_image = 1;
            $new_image_name = $file_name;
            
            error_log("Image uploaded successfully: " . $image_url);
            
            // 🟢 XÓA ẢNH CŨ NẾU CÓ
            if (!empty($comment['ImageURL']) && $comment['ImageURL'] !== $image_url) {
                $old_image_path = $_SERVER['DOCUMENT_ROOT'] . '/HeThongChamSocCaKoi/' . $comment['ImageURL'];
                if (file_exists($old_image_path)) {
                    if (unlink($old_image_path)) {
                        error_log("Old image deleted: " . $old_image_path);
                    } else {
                        error_log("Failed to delete old image: " . $old_image_path);
                    }
                }
            }
        } else {
            error_log("Move uploaded file failed. Error: " . $_FILES['image']['error']);
            fail('Không thể upload ảnh. Error code: ' . $_FILES['image']['error']);
        }
      } else {
        error_log("No valid image file found for replace action. File error: " . ($_FILES['image']['error'] ?? 'N/A'));
        // Nếu không có ảnh mới nhưng action là replace, giữ ảnh cũ
        $image_url = $comment['ImageURL'];
        $has_image = (int)$comment['HasImage'];
      }
      break;
      
    case 'remove':
      // 🟢 XÓA ẢNH CŨ
      error_log("Removing image for comment: " . $commentId);
      if (!empty($comment['ImageURL'])) {
        $old_image_path = $_SERVER['DOCUMENT_ROOT'] . '/HeThongChamSocCaKoi/' . $comment['ImageURL'];
        if (file_exists($old_image_path)) {
          if (unlink($old_image_path)) {
            error_log("Image deleted successfully: " . $old_image_path);
          } else {
            error_log("Failed to delete image: " . $old_image_path);
          }
        }
      }
      $has_image = 0;
      $image_url = null;
      $image_removed = true;
      break;
      
    case 'keep':
    default:
      // 🟢 GIỮ NGUYÊN ẢNH CŨ
      error_log("Keeping original image");
      if (!empty($comment['ImageURL'])) {
        $image_url = $comment['ImageURL'];
        $has_image = 1;
      } else {
        $has_image = 0;
      }
      break;
  }

  // 6. Cập nhật comment
  error_log("Updating comment in database:");
  error_log("  Image URL: " . ($image_url ?? 'NULL'));
  error_log("  Has Image: " . $has_image);
  
  // Kiểm tra xem bảng có cột UpdatedAt không
  $checkColumn = $conn->query("SHOW COLUMNS FROM CommunityComment LIKE 'UpdatedAt'");
  $hasUpdatedAt = $checkColumn && $checkColumn->num_rows > 0;
  
  if ($hasUpdatedAt) {
    $stmt = $conn->prepare("
      UPDATE CommunityComment 
      SET Content = ?, 
          ImageURL = ?,
          HasImage = ?,
          UpdatedAt = NOW()
      WHERE CommentID = ?
    ");
    // 🟢 QUAN TRỌNG: Dùng 's' cho ImageURL ngay cả khi NULL
    $stmt->bind_param("ssii", $content, $image_url, $has_image, $commentId);
  } else {
    $stmt = $conn->prepare("
      UPDATE CommunityComment 
      SET Content = ?, 
          ImageURL = ?,
          HasImage = ?
      WHERE CommentID = ?
    ");
    $stmt->bind_param("ssii", $content, $image_url, $has_image, $commentId);
  }
  
  if (!$stmt->execute()) {
    error_log("Update failed: " . $conn->error);
    fail('Không thể cập nhật bình luận: ' . $conn->error, 500);
  }

  error_log("Comment updated successfully");

  // 7. Lấy lại thông tin comment sau khi update - 🟢 SỬA QUERY NÀY
  $stmt = $conn->prepare("
    SELECT 
      c.CommentID,
      c.PostID,
      c.ParentCommentID,
      c.Content,
      c.CreatedAt,
      c.ImageURL,
      c.HasImage,  -- 🟢 QUAN TRỌNG: Thêm cột này
      u.UserID,
      u.FullName,
      u.Username,
      u.AvatarURL,
      u.Role
    FROM CommunityComment c
    JOIN Users u ON c.UserID = u.UserID
    WHERE c.CommentID = ?
  ");
  $stmt->bind_param("i", $commentId);
  $stmt->execute();
  $updatedComment = $stmt->get_result()->fetch_assoc();

  if (!$updatedComment) {
    fail('Không thể lấy thông tin bình luận sau khi cập nhật', 500);
  }

  // Debug: Kiểm tra dữ liệu ảnh từ database
  error_log("Updated comment from database:");
  error_log("  ImageURL: " . ($updatedComment['ImageURL'] ?? 'NULL'));
  error_log("  HasImage: " . ($updatedComment['HasImage'] ?? 'NULL'));

  // 8. Lấy thông tin reactions
  $reactions_summary = [];
  $reactions_total = 0;
  $user_reaction = null;
  
  try {
    $reaction_stmt = $conn->prepare("
      SELECT Type, COUNT(*) as count 
      FROM CommunityCommentReaction 
      WHERE CommentID = ? 
      GROUP BY Type
    ");
    $reaction_stmt->bind_param("i", $commentId);
    $reaction_stmt->execute();
    $reactions_result = $reaction_stmt->get_result();
    
    while ($row = $reactions_result->fetch_assoc()) {
      $reactions_summary[$row['Type']] = (int)$row['count'];
      $reactions_total += (int)$row['count'];
    }
    
    $user_reaction_stmt = $conn->prepare("
      SELECT Type FROM CommunityCommentReaction 
      WHERE CommentID = ? AND UserID = ?
    ");
    $user_reaction_stmt->bind_param("ii", $commentId, $currentUserId);
    $user_reaction_stmt->execute();
    $user_reaction_result = $user_reaction_stmt->get_result();
    
    if ($user_reaction_row = $user_reaction_result->fetch_assoc()) {
      $user_reaction = $user_reaction_row['Type'];
    }
  } catch (Exception $e) {
    error_log("Reaction query error: " . $e->getMessage());
  }

  // 9. Lấy số lượng reply
  $reply_count = 0;
  try {
    $reply_stmt = $conn->prepare("
      SELECT COUNT(*) as count FROM CommunityComment 
      WHERE ParentCommentID = ?
    ");
    $reply_stmt->bind_param("i", $commentId);
    $reply_stmt->execute();
    $reply_result = $reply_stmt->get_result();
    
    if ($reply_row = $reply_result->fetch_assoc()) {
      $reply_count = (int)$reply_row['count'];
    }
  } catch (Exception $e) {
    error_log("Reply count error: " . $e->getMessage());
  }

  // 10. Xây dựng URL ảnh đầy đủ
  $full_image_url = null;
  if (!empty($updatedComment['ImageURL'])) {
    $full_image_url = buildImageUrl($updatedComment['ImageURL']);
    error_log("Built image URL: " . $full_image_url);
  }

  // 11. Trả về kết quả - 🟢 SỬA RESPONSE NÀY
  $response = [
    'success' => true,
    'message' => 'Đã cập nhật bình luận thành công',
    'comment' => [
      'CommentID' => (int)$updatedComment['CommentID'],
      'PostID' => (int)$updatedComment['PostID'],
      'ParentCommentID' => isset($updatedComment['ParentCommentID']) ? (int)$updatedComment['ParentCommentID'] : null,
      'Content' => $updatedComment['Content'],
      'CreatedAt' => $updatedComment['CreatedAt'],
      'ImageURL' => $updatedComment['ImageURL'] ?? null, // 🟢 QUAN TRỌNG: Thêm field này
      'HasImage' => isset($updatedComment['HasImage']) ? (int)$updatedComment['HasImage'] : 0, // 🟢 QUAN TRỌNG: Thêm field này
      
      'user' => [
        'UserID' => (int)$updatedComment['UserID'],
        'FullName' => $updatedComment['FullName'] ?? '',
        'Username' => $updatedComment['Username'] ?? '',
        'AvatarURL' => $updatedComment['AvatarURL'] ?? '',
        'Role' => $updatedComment['Role'] ?? ''
      ],
      
      'reactions' => [
        'summary' => $reactions_summary,
        'total' => $reactions_total,
        'user' => $user_reaction
      ],
      
      'ReplyCount' => $reply_count
    ],
    
    // 🟢 QUAN TRỌNG: Thêm các field này cho JS
    'image_url' => $full_image_url, // URL đầy đủ
    'has_image' => isset($updatedComment['HasImage']) ? (int)$updatedComment['HasImage'] : 0
  ];
  
  // Thêm thông tin ảnh nếu có
  if ($image_removed) {
    $response['image_removed'] = true;
    $response['has_image'] = 0;
  }
  
  if ($new_image_name) {
    $response['new_image'] = $new_image_name;
  }

  // 🟢 DEBUG: Log response
  error_log("Final response JSON:");
  error_log(json_encode($response, JSON_UNESCAPED_UNICODE));

  echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  error_log("Update comment error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>