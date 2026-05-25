<?php
// /HeThongChamSocCaKoi/backend/api/community/posts/pin.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../../../includes/db.php';

header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false, 
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['username'])) {
        fail('Vui lòng đăng nhập', 401);
    }

    $username = $_SESSION['username'];

    // Kiểm tra quyền admin
    $stmt = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ?");
    if (!$stmt) {
        fail('Lỗi database: ' . $conn->error, 500);
    }
    
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows === 0) {
        fail('Người dùng không tồn tại', 404);
    }
    
    $user = $userResult->fetch_assoc();
    $adminId = (int)$user['UserID'];
    $adminRole = $user['Role'];
    
    if ($adminRole !== 'Admin') {
        fail('Chỉ quản trị viên mới có quyền ghim bài', 403);
    }

    $postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
    $reason = isset($_POST['reason']) ? trim($_POST['reason']) : '';
    
    if ($postId <= 0) {
        fail('ID bài viết không hợp lệ', 400);
    }

    // Kiểm tra bài viết
    $stmt = $conn->prepare("
        SELECT 
            p.PostID,
            p.UserID,
            p.Content,
            p.IsPinned,
            p.PinnedAt,
            u.Username,
            u.FullName,
            u.Role as UserRole
        FROM CommunityPost p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.PostID = ?
        AND (p.Status IS NULL OR p.Status IN ('active','public','approved'))
    ");
    
    if (!$stmt) {
        fail('Lỗi chuẩn bị truy vấn: ' . $conn->error, 500);
    }
    
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $postResult = $stmt->get_result();
    
    if ($postResult->num_rows === 0) {
        fail('Bài viết không tồn tại hoặc đã bị xóa', 404);
    }
    
    $post = $postResult->fetch_assoc();
    $currentPinned = isset($post['IsPinned']) ? (int)$post['IsPinned'] : 0;
    $newPinnedStatus = $currentPinned ? 0 : 1;
    
    // 🆕 GIỚI HẠN SỐ BÀI GHIM: chỉ giữ lại 3 bài ghim mới nhất
    if ($newPinnedStatus) {
        $maxPinned = 3; // Chỉ giữ lại 3 bài ghim mới nhất
        
        // Đếm số bài đang ghim
        $countStmt = $conn->prepare("SELECT COUNT(*) as pinned_count FROM CommunityPost WHERE IsPinned = 1");
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $pinnedCount = $countResult->fetch_assoc()['pinned_count'];
        
        if ($pinnedCount >= $maxPinned) {
            // Tìm bài ghim cũ nhất để bỏ ghim
            $oldestStmt = $conn->prepare("
                SELECT PostID 
                FROM CommunityPost 
                WHERE IsPinned = 1 
                ORDER BY PinnedAt ASC 
                LIMIT 1
            ");
            $oldestStmt->execute();
            $oldestResult = $oldestStmt->get_result();
            
            if ($oldestRow = $oldestResult->fetch_assoc()) {
                $oldestPostId = $oldestRow['PostID'];
                
                // Bỏ ghim bài cũ
                $unpinStmt = $conn->prepare("
                    UPDATE CommunityPost 
                    SET IsPinned = 0, 
                        UnpinnedAt = NOW(),
                        PinReason = 'Tự động bỏ ghim do giới hạn 3 bài'
                    WHERE PostID = ?
                ");
                $unpinStmt->bind_param("i", $oldestPostId);
                $unpinStmt->execute();
                $unpinStmt->close();
            }
        }
    }
    
    // Cập nhật bài viết HIỆN TẠI
    if ($newPinnedStatus) {
        // Ghim bài - LUÔN CẬP NHẬT PinnedAt để bài mới nhất lên đầu
        $updateStmt = $conn->prepare("
            UPDATE CommunityPost 
            SET 
                IsPinned = 1,
                PinnedByAdminID = ?,
                PinnedAt = NOW(),  -- 🆕 LUÔN CẬP NHẬT THỜI GIAN MỚI NHẤT
                UnpinnedAt = NULL,
                PinReason = ?,
                UpdatedAt = NOW()
            WHERE PostID = ?
        ");
        
        if (!$updateStmt) {
            fail('Lỗi chuẩn bị update: ' . $conn->error, 500);
        }
        
        $updateStmt->bind_param("isi", $adminId, $reason, $postId);
    } else {
        // Bỏ ghim
        $updateStmt = $conn->prepare("
            UPDATE CommunityPost 
            SET 
                IsPinned = 0,
                UnpinnedAt = NOW(),
                PinReason = NULL,
                UpdatedAt = NOW()
            WHERE PostID = ?
        ");
        
        if (!$updateStmt) {
            fail('Lỗi chuẩn bị update: ' . $conn->error, 500);
        }
        
        $updateStmt->bind_param("i", $postId);
    }
    
    if ($updateStmt->execute()) {
        // Trả thêm thông tin về bài ghim
        echo json_encode([
            'success' => true,
            'is_pinned' => $newPinnedStatus,
            'message' => $newPinnedStatus ? 
                '✅ Đã ghim bài viết. Bài viết sẽ hiển thị đầu trang.' : 
                '✅ Đã bỏ ghim bài viết.',
            'post_id' => $postId,
            'post_title' => mb_substr(strip_tags($post['Content']), 0, 50) . '...',
            'pinned_at' => $newPinnedStatus ? date('Y-m-d H:i:s') : null,
            'pinned_by_admin_id' => $adminId,
            'post_author' => $post['Username'],
            'html' => $newPinnedStatus ? getPinnedPostHTML($conn, $postId) : null // 🆕 Trả HTML để cập nhật UI
        ], JSON_UNESCAPED_UNICODE);
    } else {
        fail('Không thể cập nhật trạng thái ghim: ' . $conn->error, 500);
    }
    
    $updateStmt->close();
    
} catch (Exception $e) {
    error_log("Pin API Exception: " . $e->getMessage());
    fail('Lỗi server: ' . $e->getMessage(), 500);
}

// 🆕 HÀM LẤY HTML CỦA BÀI VIẾT ĐÃ GHIM
function getPinnedPostHTML($conn, $postId) {
    $stmt = $conn->prepare("
        SELECT p.*,
               u.FullName, u.Username, u.AvatarURL, u.Role
        FROM CommunityPost p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.PostID = ?
    ");
    
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Tạo dữ liệu giống như API list.php trả về
        $postData = [
            'PostID' => $row['PostID'],
            'UserID' => $row['UserID'],
            'Content' => $row['Content'],
            'CreatedAt' => $row['CreatedAt'],
            'UpdatedAt' => $row['UpdatedAt'],
            'IsPinned' => 1,
            'user' => [
                'UserID' => $row['UserID'],
                'FullName' => $row['FullName'],
                'Username' => $row['Username'],
                'AvatarURL' => $row['AvatarURL'],
                'Role' => $row['Role']
            ],
            'media' => [],
            'reactions' => ['summary' => [], 'total' => 0, 'user' => null],
            'comments' => ['total' => 0, 'items' => []]
        ];
        
        // Sử dụng hàm renderPostCard từ JavaScript (sẽ được gọi ở client-side)
        return base64_encode(json_encode($postData));
    }
    
    return null;
}
?>