<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($msg, $code = 400){
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }

    $userId = (int)$_SESSION['userid'];
    $postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
    $content = trim($_POST['content'] ?? "");

    if ($postId <= 0) {
        fail("Thiếu post_id");
    }

    // 🟢 KIỂM TRA: CÓ NỘI DUNG HOẶC CÓ ẢNH
    $hasContent = ($content !== "");
    $hasImage = (isset($_FILES['image']) && $_FILES['image']['error'] === 0);
    
    if (!$hasContent && !$hasImage) {
        fail("Vui lòng nhập nội dung hoặc chọn ảnh");
    }

    // 🟢 XỬ LÝ UPLOAD ẢNH NẾU CÓ
    $imageURL = '';
    $hasImageFlag = 0;

    if ($hasImage) {
        $file = $_FILES['image'];
        $fileName = $file['name'];
        $fileType = $file['type'];
        $fileSize = $file['size'];
        $fileTmp = $file['tmp_name'];
        $fileError = $file['error'];

        // Kiểm tra lỗi upload
        if ($fileError !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'File vượt quá kích thước tối đa cho phép',
                UPLOAD_ERR_FORM_SIZE => 'File vượt quá kích thước form',
                UPLOAD_ERR_PARTIAL => 'File chỉ upload được một phần',
                UPLOAD_ERR_NO_FILE => 'Không có file được upload',
                UPLOAD_ERR_NO_TMP_DIR => 'Thiếu thư mục tạm',
                UPLOAD_ERR_CANT_WRITE => 'Không thể ghi file',
                UPLOAD_ERR_EXTENSION => 'File bị dừng bởi extension'
            ];
            fail($errorMessages[$fileError] ?? 'Lỗi upload file không xác định');
        }

        // Kiểm tra loại file
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($fileType, $allowedTypes)) {
            fail("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)");
        }

        // Kiểm tra kích thước file (5MB)
        $maxSize = 5 * 1024 * 1024;
        if ($fileSize > $maxSize) {
            fail("Kích thước ảnh tối đa 5MB");
        }

        // Kiểm tra file thực sự là ảnh
        $imageInfo = @getimagesize($fileTmp);
        if ($imageInfo === false) {
            fail("File không phải là ảnh hợp lệ");
        }

        // Tạo tên file an toàn
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $safeFileName = 'comment_' . $userId . '_' . time() . '_' . uniqid() . '.' . $extension;

        // 🟢 QUAN TRỌNG: Sử dụng đường dẫn ABSOLUTE cho server
        $baseDir = dirname(dirname(dirname(dirname(__DIR__))));
        $uploadDir = $baseDir . '/uploads/comments/';
        
        // Debug
        error_log("[UPLOAD] Base dir: $baseDir");
        error_log("[UPLOAD] Upload dir: $uploadDir");
        
        // Tạo thư mục nếu chưa tồn tại
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                error_log("[UPLOAD] Failed to create directory: $uploadDir");
                fail("Không thể tạo thư mục upload");
            }
            error_log("[UPLOAD] Created directory: $uploadDir");
        }
        
        // Kiểm tra quyền ghi
        if (!is_writable($uploadDir)) {
            // Thử sửa quyền
            @chmod($uploadDir, 0755);
            if (!is_writable($uploadDir)) {
                error_log("[UPLOAD] Directory not writable: $uploadDir");
                fail("Thư mục upload không có quyền ghi");
            }
        }

        // Đường dẫn đầy đủ trên server
        $uploadPath = $uploadDir . $safeFileName;
        error_log("[UPLOAD] Full path: $uploadPath");

        // Di chuyển file
        if (!move_uploaded_file($fileTmp, $uploadPath)) {
            $error = error_get_last();
            error_log("[UPLOAD] Move failed: " . print_r($error, true));
            fail("Không thể upload ảnh: " . ($error['message'] ?? 'Unknown error'));
        }

        // Kiểm tra file tồn tại và có kích thước > 0
        if (!file_exists($uploadPath)) {
            fail("Ảnh upload không thành công (file không tồn tại)");
        }
        
        $fileSizeAfter = filesize($uploadPath);
        if ($fileSizeAfter === 0) {
            unlink($uploadPath); // Xóa file rỗng
            fail("Ảnh upload bị lỗi (file rỗng)");
        }
        
        error_log("[UPLOAD] File uploaded successfully. Size: $fileSizeAfter bytes");
        error_log("[UPLOAD] File exists: " . (file_exists($uploadPath) ? 'YES' : 'NO'));

        // 🟢 QUAN TRỌNG: Lưu đường dẫn WEB đúng format
        // Format: /uploads/comments/filename.jpg (bắt đầu bằng /)
        $imageURL = '/uploads/comments/' . $safeFileName;
        $hasImageFlag = 1;
        
        error_log("[UPLOAD] Image URL saved to DB: $imageURL");
    }

    // 1. Kiểm tra bài viết có tồn tại không
    $postCheck = $conn->prepare("SELECT PostID, UserID, Status FROM CommunityPost WHERE PostID = ?");
    $postCheck->bind_param("i", $postId);
    $postCheck->execute();
    $postResult = $postCheck->get_result();
    
    if ($postResult->num_rows === 0) {
        fail("Bài viết không tồn tại", 404);
    }
    
    $postRow = $postResult->fetch_assoc();
    
    if ($postRow['Status'] !== 'active') {
        fail("Bài viết không khả dụng", 403);
    }
    
    $postOwnerId = (int)$postRow['UserID'];

    // 2. Thêm comment mới
    if ($hasImageFlag) {
        // Nếu có ảnh
        $ins = $conn->prepare("
            INSERT INTO CommunityComment 
            (PostID, UserID, Content, ImageURL, HasImage)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $ins->bind_param(
            "iissi", 
            $postId, 
            $userId, 
            $content, 
            $imageURL, 
            $hasImageFlag
        );
    } else {
        // Nếu không có ảnh
        $ins = $conn->prepare("
            INSERT INTO CommunityComment 
            (PostID, UserID, Content)
            VALUES (?, ?, ?)
        ");
        
        $ins->bind_param("iis", $postId, $userId, $content);
    }
    
    if (!$ins->execute()) {
        error_log("[DB] Insert comment error: " . $conn->error);
        fail("Không thể thêm comment: " . $conn->error);
    }
    
    $newCommentId = $ins->insert_id;
    
    // 3. Cập nhật số comment trong post
    $conn->query("UPDATE CommunityPost SET CommentCount = CommentCount + 1 WHERE PostID = $postId");
    
    // 4. Gửi thông báo (nếu có)
    if ($postOwnerId !== $userId) {
        try {
            $notifSql = $conn->prepare("
                INSERT INTO CommunityNotification 
                (UserID, ActorID, Type, PostID, CommentID, IsRead, CreatedAt) 
                VALUES (?, ?, 'comment', ?, ?, 0, NOW())
            ");
            $notifSql->bind_param("iiii", $postOwnerId, $userId, $postId, $newCommentId);
            $notifSql->execute();
        } catch (Exception $e) {
            error_log("[NOTIF] Error: " . $e->getMessage());
        }
    }
    
    // 5. Lấy thông tin user
    $userQuery = $conn->prepare("
        SELECT UserID, FullName, Username, AvatarURL, Role 
        FROM Users WHERE UserID = ?
    ");
    $userQuery->bind_param("i", $userId);
    $userQuery->execute();
    $userResult = $userQuery->get_result();
    $userData = $userResult->fetch_assoc();
    
    if (!$userData) {
        $userData = [
            'UserID' => $userId,
            'FullName' => 'Người dùng',
            'Username' => 'user_' . $userId,
            'AvatarURL' => null,
            'Role' => null
        ];
    }
    
    // 6. Trả kết quả
    $response = [
        "success" => true,
        "message" => "Đã thêm bình luận thành công",
        "comment" => [
            "CommentID" => $newCommentId,
            "PostID" => $postId,
            "ParentCommentID" => null,
            "Content" => $content,
            "ImageURL" => $imageURL, // Đã là /uploads/comments/filename.jpg
            "HasImage" => $hasImageFlag,
            "CreatedAt" => date("Y-m-d H:i:s"),
            "user" => $userData,
            "reactions" => [
                "summary" => [],
                "total" => 0,
                "user" => null
            ],
            "ReplyCount" => 0
        ]
    ];
    
    // Debug: log response
    error_log("[RESPONSE] Comment created: ID $newCommentId, Image: " . ($imageURL ?: 'none'));
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Throwable $e) {
    error_log("[ERROR] Create comment: " . $e->getMessage());
    error_log("[ERROR] Stack trace: " . $e->getTraceAsString());
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>