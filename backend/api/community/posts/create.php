<?php
// backend/api/community/posts/create.php
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
    // Kiểm tra đăng nhập bằng user_id thay vì username
    if (!isset($_SESSION['user_id'])) {
        fail('Chưa đăng nhập', 401);
    }
    
    $userId = (int)$_SESSION['user_id'];
    
    // Kiểm tra user có tồn tại không
    $checkUser = $conn->prepare("SELECT UserID FROM Users WHERE UserID = ? LIMIT 1");
    $checkUser->bind_param("i", $userId);
    $checkUser->execute();
    
    if ($checkUser->get_result()->num_rows === 0) {
        fail('Tài khoản không tồn tại', 404);
    }
    
    // Kiểm tra user có bị cấm đăng bài không
    $banCheck = $conn->prepare("
        SELECT * FROM UserBan 
        WHERE UserID = ? 
        AND IsActive = 1 
        AND Scope = 'community'
        AND BanType IN ('post_only', 'full_ban')
        AND (IsTemporary = 0 OR ExpiresAt > NOW())
        LIMIT 1
    ");
    
    $banCheck->bind_param("i", $userId);
    $banCheck->execute();
    $banResult = $banCheck->get_result();
    
    if ($banResult->num_rows > 0) {
        $ban = $banResult->fetch_assoc();
        fail("Tài khoản của bạn đã bị cấm đăng bài. Lý do: " . $ban['Reason'], 403);
    }
    
    // Lấy dữ liệu từ POST
    $content = trim($_POST['content'] ?? '');
    $privacy = $_POST['privacy'] ?? 'public';
    
    // Kiểm tra dữ liệu
    $allowedPriv = ['public', 'followers', 'private'];
    if (!in_array($privacy, $allowedPriv, true)) {
        $privacy = 'public';
    }
    
    // Kiểm tra có file upload không
    $hasFile = isset($_FILES['media']) &&
               is_array($_FILES['media']['name']) &&
               count(array_filter($_FILES['media']['name'])) > 0;
    
    // Kiểm tra nội dung
    if (empty($content) && !$hasFile) {
        fail('Hãy nhập nội dung hoặc chọn ít nhất một ảnh/video.');
    }
    
    // Bắt đầu transaction
    $conn->begin_transaction();
    
    try {
        // Tạo bài viết
        $sql = "INSERT INTO CommunityPost (UserID, Content, Privacy, CreatedAt) VALUES (?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iss", $userId, $content, $privacy);
        $stmt->execute();
        
        $postId = $stmt->insert_id;
        
        // Xử lý upload media nếu có
        if ($hasFile) {
            // Thư mục upload
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . "/HeThongChamSocCaKoi/uploads/community/";
            
            // Tạo thư mục nếu chưa có
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            // Loại file cho phép
            $allowedTypes = [
                'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                'video' => ['mp4', 'mov', 'avi', 'mkv', 'webm']
            ];
            
            $files = $_FILES['media'];
            $fileCount = count($files['name']);
            $sortOrder = 0;
            
            for ($i = 0; $i < $fileCount; $i++) {
                if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                    continue;
                }
                
                $fileName = $files['name'][$i];
                $tmpName = $files['tmp_name'][$i];
                $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                
                // Xác định loại file
                $mediaType = 'image';
                if (in_array($fileExt, $allowedTypes['video'])) {
                    $mediaType = 'video';
                } elseif (!in_array($fileExt, $allowedTypes['image'])) {
                    continue; // Bỏ qua file không hỗ trợ
                }
                
                // Tạo tên file an toàn
                $safeName = uniqid('post_', true) . '.' . $fileExt;
                $filePath = $uploadDir . $safeName;
                
                // Upload file
                if (move_uploaded_file($tmpName, $filePath)) {
                    // Lưu vào database
                    $webPath = "/HeThongChamSocCaKoi/uploads/community/" . $safeName;
                    
                    $mediaStmt = $conn->prepare("
                        INSERT INTO CommunityPostMedia (PostID, MediaType, FilePath, SortOrder) 
                        VALUES (?, ?, ?, ?)
                    ");
                    $mediaStmt->bind_param("issi", $postId, $mediaType, $webPath, $sortOrder);
                    $mediaStmt->execute();
                    
                    $sortOrder++;
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Đã đăng bài thành công',
            'post_id' => $postId
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        // Rollback nếu có lỗi
        $conn->rollback();
        throw $e;
    }
    
} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>