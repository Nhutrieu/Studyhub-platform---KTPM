<?php
// check_shared_posts.php
// API để kiểm tra tất cả bài chia sẻ khi bài gốc bị xóa

error_reporting(E_ALL);
ini_set('display_errors', 0);
header("Content-Type: application/json; charset=utf-8");

session_start();

// 🟢 ĐƯỜNG DẪN ĐẾN FILE db.php
$dbPath = __DIR__ . '/../../../../../includes/db.php';
if (!file_exists($dbPath)) {
    $dbPath = __DIR__ . '/../../../../includes/db.php';
}

if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Không tìm thấy file kết nối database"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once $dbPath;

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(["success" => false, "error" => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 🟢 LẤY ID BÀI VIẾT GỐC
    $originalPostId = 0;
    
    if (isset($_POST['original_post_id'])) {
        $originalPostId = (int)$_POST['original_post_id'];
    } elseif (isset($_GET['original_post_id'])) {
        $originalPostId = (int)$_GET['original_post_id'];
    }
    
    if ($originalPostId <= 0) {
        fail("Thiếu ID bài viết gốc hoặc ID không hợp lệ", 400);
    }
    
    // 🟢 KIỂM TRA BÀI VIẾT GỐC CÓ TỒN TẠI KHÔNG
    $checkOriginalStmt = $conn->prepare("
        SELECT PostID, UserID, Content 
        FROM CommunityPost 
        WHERE PostID = ? 
        LIMIT 1
    ");
    $checkOriginalStmt->bind_param("i", $originalPostId);
    $checkOriginalStmt->execute();
    $originalResult = $checkOriginalStmt->get_result();
    $originalPost = $originalResult->fetch_assoc();
    $checkOriginalStmt->close();
    
    if (!$originalPost) {
        echo json_encode([
            'success' => true,
            'original_post_id' => $originalPostId,
            'original_post_exists' => false,
            'shared_posts_count' => 0,
            'shared_posts' => [],
            'message' => 'Bài viết gốc không tồn tại'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // 🟢 LẤY THÔNG TIN NGƯỜI ĐĂNG BÀI GỐC
    $originalUserStmt = $conn->prepare("
        SELECT Username, FullName, AvatarURL 
        FROM Users 
        WHERE UserID = ?
    ");
    $originalUserStmt->bind_param("i", $originalPost['UserID']);
    $originalUserStmt->execute();
    $originalUserResult = $originalUserStmt->get_result();
    $originalUser = $originalUserResult->fetch_assoc();
    $originalUserStmt->close();
    
    // 🟢 TÌM TẤT CẢ BÀI CHIA SẺ CỦA BÀI VIẾT NÀY
    $stmt = $conn->prepare("
        SELECT 
            PostID, 
            UserID, 
            Content, 
            Privacy, 
            CreatedAt,
            UpdatedAt
        FROM CommunityPost 
        WHERE OriginalPostID = ? 
        ORDER BY CreatedAt DESC
    ");
    $stmt->bind_param("i", $originalPostId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $sharedPosts = [];
    
    while ($row = $result->fetch_assoc()) {
        // Lấy thông tin người chia sẻ
        $userStmt = $conn->prepare("
            SELECT Username, FullName, AvatarURL 
            FROM Users 
            WHERE UserID = ?
        ");
        $userStmt->bind_param("i", $row['UserID']);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $user = $userResult->fetch_assoc();
        $userStmt->close();
        
        // Lấy media của bài chia sẻ
        $media = [];
        $mediaStmt = $conn->prepare("
            SELECT MediaID, MediaType, FilePath 
            FROM CommunityPostMedia 
            WHERE PostID = ?
            ORDER BY MediaID
        ");
        $mediaStmt->bind_param("i", $row['PostID']);
        $mediaStmt->execute();
        $mediaResult = $mediaStmt->get_result();
        
        while ($mediaRow = $mediaResult->fetch_assoc()) {
            $media[] = [
                'MediaID' => $mediaRow['MediaID'],
                'MediaType' => $mediaRow['MediaType'],
                'FilePath' => $mediaRow['FilePath']
            ];
        }
        $mediaStmt->close();
        
        $sharedPosts[] = [
            'post_id' => $row['PostID'],
            'user_id' => $row['UserID'],
            'content' => $row['Content'],
            'privacy' => $row['Privacy'],
            'created_at' => $row['CreatedAt'],
            'updated_at' => $row['UpdatedAt'],
            'user' => $user ?: null,
            'media' => $media,
            'original_post_deleted' => true,
            'warning_message' => '⚠️ Bài viết gốc đã bị xóa'
        ];
    }
    $stmt->close();
    
    // 🟢 TRẢ VỀ KẾT QUẢ
    echo json_encode([
        'success' => true,
        'original_post_id' => $originalPostId,
        'original_post_exists' => true,
        'shared_posts_count' => count($sharedPosts),
        'shared_posts' => $sharedPosts,
        'message' => 'Đã tìm thấy ' . count($sharedPosts) . ' bài chia sẻ của bài viết gốc ID: ' . $originalPostId
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Throwable $e) {
    error_log("Check Shared Posts Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Lỗi hệ thống',
        'debug' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>