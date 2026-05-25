<?php
// backend/api/users/profile/toggle_follow.php
header('Content-Type: application/json');
session_start();

// 1. Kết nối DB (Dựa trên cấu trúc của get_info.php)
require_once '../../../../includes/db.php'; 

// 2. TÌM UserID hiện tại (Dựa trên $_SESSION['username'])
$currentUserId = 0;
if (isset($_SESSION['username'])) {
    // Lấy UserID dựa trên session username
    // Giả định $conn đã được định nghĩa trong db.php
    $stmt_auth = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $stmt_auth->bind_param("s", $_SESSION['username']);
    $stmt_auth->execute();
    $result_auth = $stmt_auth->get_result();
    if ($user_auth = $result_auth->fetch_assoc()) {
        $currentUserId = intval($user_auth['UserID']);
    }
    $stmt_auth->close();
}

// Kiểm tra xem người dùng đã đăng nhập chưa (sử dụng UserID đã tìm được)
if ($currentUserId === 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Bạn cần đăng nhập để thực hiện chức năng này.']);
    exit;
}

// 1. Lấy UserID của người được theo dõi/bỏ theo dõi
$followingId = isset($_POST['following_id']) ? intval($_POST['following_id']) : 0;

if ($followingId === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Thiếu ID người dùng được theo dõi.']);
    exit;
}

if ($followingId === $currentUserId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Bạn không thể tự theo dõi chính mình.']);
    exit;
}

$isFollowing = false;

try {
    // Bắt đầu Transaction
    $conn->begin_transaction();

    // 2. Kiểm tra trạng thái theo dõi hiện tại
    $stmt = $conn->prepare("SELECT 1 FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ?");
    $stmt->bind_param("ii", $currentUserId, $followingId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Đang theo dõi -> Bỏ theo dõi (DELETE)
        $stmt_toggle = $conn->prepare("DELETE FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ?");
        $stmt_toggle->bind_param("ii", $currentUserId, $followingId);
        $stmt_toggle->execute();
        $isFollowing = false;
        $message = "Đã bỏ theo dõi thành công.";
    } else {
        // Chưa theo dõi -> Theo dõi (INSERT)
        $stmt_toggle = $conn->prepare("INSERT INTO CommunityFollow (FollowerID, FollowingID) VALUES (?, ?)");
        $stmt_toggle->bind_param("ii", $currentUserId, $followingId);
        $stmt_toggle->execute();
        $isFollowing = true;
        $message = "Đã theo dõi thành công.";
        
        // Gửi thông báo cho người được theo dõi (Tùy chọn)
        $stmt_noti = $conn->prepare("INSERT INTO CommunityNotification (UserID, ActorID, Type, Message) VALUES (?, ?, 'follow', ?)");
        $noti_message = 'Bắt đầu theo dõi bạn.';
        $stmt_noti->bind_param("iis", $followingId, $currentUserId, $noti_message);
        $stmt_noti->execute();
        $stmt_noti->close();
    }
    
    // Đóng statement toggle
    if (isset($stmt_toggle)) {
        $stmt_toggle->close();
    }

    // 3. Lấy số lượng người theo dõi mới
    $stmt_count = $conn->prepare("SELECT COUNT(*) as cnt FROM CommunityFollow WHERE FollowingID = ?");
    $stmt_count->bind_param("i", $followingId);
    $stmt_count->execute();
    $newFollowCount = $stmt_count->get_result()->fetch_assoc()['cnt'];
    $stmt_count->close();

    $conn->commit();
    $stmt->close();

    // 4. Trả về kết quả
    echo json_encode([
        'success' => true,
        'isFollowing' => $isFollowing,
        'newFollowCount' => $newFollowCount,
        'message' => $message
    ]);

} catch (\Exception $e) {
    $conn->rollback();
    http_response_code(500);
    // Vô hiệu hóa hiển thị lỗi chi tiết để tránh HTML breaking JSON
    echo json_encode(['success' => false, 'message' => 'Lỗi server: Đã xảy ra lỗi trong quá trình xử lý.']);
    // Dùng log thay vì hiển thị
    // error_log("Follow toggle failed: " . $e->getMessage());
}
?>