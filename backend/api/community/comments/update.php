<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($message, $data = []) {
    echo json_encode(array_merge(['success' => true, 'message' => $message], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Kiểm tra đăng nhập
    if (!isset($_SESSION['userid'])) {
        fail('Chưa đăng nhập', 401);
    }

    $currentUserId = (int)$_SESSION['userid'];

    // 2. Lấy dữ liệu từ request
    $commentId = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : 0;
    $content = isset($_POST['content']) ? trim($_POST['content']) : '';
    $imageAction = isset($_POST['image_action']) ? $_POST['image_action'] : 'keep';
    
    if ($commentId <= 0) {
        fail('Thiếu comment_id hoặc comment_id không hợp lệ');
    }
    
    if ($content === '') {
        fail('Nội dung bình luận không được để trống');
    }

    // 3. Kiểm tra comment có tồn tại và user có quyền chỉnh sửa không
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

    // 4. XỬ LÝ ẢNH
    $imageUrl = $comment['ImageURL'] ?? '';
    $hasImage = (int)$comment['HasImage'];
    $imageRemoved = false;
    $newImageName = '';

    if ($imageAction === 'replace' && isset($_FILES['image'])) {
        // 🟢 CÓ ẢNH MỚI - UPLOAD ẢNH MỚI
        
        // Xóa ảnh cũ nếu có
        if (!empty($imageUrl) && file_exists('../../../../' . $imageUrl)) {
            unlink('../../../../' . $imageUrl);
        }
        
        // Xử lý upload ảnh mới
        $file = $_FILES['image'];
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!in_array($file['type'], $allowedTypes)) {
            fail('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
        }
        
        if ($file['size'] > 5 * 1024 * 1024) { // 5MB
            fail('Kích thước ảnh tối đa 5MB');
        }
        
        // Tạo tên file mới
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $newImageName = 'comment_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $uploadDir = '../../../../uploads/comments/';
        
        // Tạo thư mục nếu chưa có
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $uploadPath = $uploadDir . $newImageName;
        
        if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
            $imageUrl = 'uploads/comments/' . $newImageName;
            $hasImage = 1;
            $imageRemoved = false;
        } else {
            fail('Không thể upload ảnh');
        }
        
    } elseif ($imageAction === 'remove') {
        // 🟢 XÓA ẢNH HIỆN TẠI
        if (!empty($imageUrl) && file_exists('../../../../' . $imageUrl)) {
            unlink('../../../../' . $imageUrl);
        }
        
        $imageUrl = '';
        $hasImage = 0;
        $imageRemoved = true;
        
    } elseif ($imageAction === 'keep') {
        // 🟢 GIỮ NGUYÊN ẢNH CŨ
        $hasImage = (int)$comment['HasImage'];
        $imageUrl = $comment['ImageURL'] ?? '';
    }

    // 5. Cập nhật comment trong database - KHÔNG có UpdatedAt
    $stmt = $conn->prepare("
        UPDATE CommunityComment 
        SET Content = ?, 
            ImageURL = ?,
            HasImage = ?
        WHERE CommentID = ?
    ");
    
    if (!$stmt) {
        fail('Lỗi chuẩn bị câu lệnh: ' . $conn->error);
    }
    
    $stmt->bind_param("ssii", $content, $imageUrl, $hasImage, $commentId);
    
    if (!$stmt->execute()) {
        fail('Không thể cập nhật bình luận: ' . $stmt->error, 500);
    }

    // 6. Lấy lại thông tin comment sau khi update
    $stmt = $conn->prepare("
        SELECT 
            c.CommentID,
            c.PostID,
            c.ParentCommentID,
            c.Content,
            c.CreatedAt,
            c.ImageURL,
            c.HasImage,
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

    // 7. Trả về kết quả với thông tin ảnh đầy đủ
    $resultData = [
        'comment' => [
            'CommentID' => (int)$updatedComment['CommentID'],
            'PostID' => (int)$updatedComment['PostID'],
            'ParentCommentID' => isset($updatedComment['ParentCommentID']) ? (int)$updatedComment['ParentCommentID'] : null,
            'Content' => $updatedComment['Content'],
            'CreatedAt' => $updatedComment['CreatedAt'],
            'ImageURL' => $updatedComment['ImageURL'] ?? '',
            'HasImage' => (int)$updatedComment['HasImage'],
            
            'user' => [
                'UserID' => (int)$updatedComment['UserID'],
                'FullName' => $updatedComment['FullName'] ?? '',
                'Username' => $updatedComment['Username'] ?? '',
                'AvatarURL' => $updatedComment['AvatarURL'] ?? '',
                'Role' => $updatedComment['Role'] ?? ''
            ],
            
            'reactions' => [
                'summary' => [],
                'total' => 0,
                'user' => null
            ],
            
            'ReplyCount' => 0
        ],
        'image_removed' => $imageRemoved
    ];
    
    // Thêm image_url nếu có ảnh mới - ĐẢM BẢO ĐƯỜNG DẪN ĐÚNG
    if (!empty($newImageName)) {
        $resultData['image_url'] = '/uploads/comments/' . $newImageName; // 🟢 THÊM DẤU / Ở ĐẦU
    }

    success('Đã cập nhật bình luận thành công', $resultData);

} catch (Throwable $e) {
    error_log("Update comment error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>