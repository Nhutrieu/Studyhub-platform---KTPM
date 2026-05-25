<?php
// ====================== DEBUG MODE ======================
ob_clean();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ====================== KẾT NỐI & CHECK LOGIN ======================
require_once(realpath(__DIR__ . '/../../../../includes/check_login.php'));

if (empty($_SESSION['username']) || empty($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập']);
    exit;
}

// ====================== LẤY DỮ LIỆU ======================
$user_id = $_SESSION['userid'];
$post_id = intval($_POST['post_id'] ?? 0);
$content = trim($_POST['content'] ?? '');
$privacy = $_POST['privacy'] ?? 'public';

if (!$post_id) {
    echo json_encode(['success' => false, 'error' => 'Thiếu mã bài viết cần chia sẻ']);
    exit;
}

// ====================== KIỂM TRA BÀI GỐC ======================
$stmt = $conn->prepare("SELECT PostID, UserID, is_original_deleted FROM CommunityPost WHERE PostID = ?");
$stmt->bind_param("i", $post_id);
$stmt->execute();
$result = $stmt->get_result();
$original = $result->fetch_assoc();
$stmt->close();

if (!$original) {
    echo json_encode(['success' => false, 'error' => 'Bài viết gốc không tồn tại']);
    exit;
}

// 🆕 KIỂM TRA NẾU BÀI GỐC ĐÃ BỊ XÓA
if ($original['is_original_deleted'] == 1) {
    echo json_encode(['success' => false, 'error' => 'Không thể chia sẻ bài viết đã bị xóa']);
    exit;
}

// ====================== TẠO BÀI CHIA SẺ ======================
$stmt = $conn->prepare("
    INSERT INTO CommunityPost (UserID, Content, Privacy, OriginalPostID, CreatedAt, is_original_deleted)
    VALUES (?, ?, ?, ?, NOW(), ?)
");
// 🆕 THÊM is_original_deleted TỪ BÀI GỐC
$is_original_deleted = $original['is_original_deleted'] ?? 0;
$stmt->bind_param("issii", $user_id, $content, $privacy, $post_id, $is_original_deleted);
$ok = $stmt->execute();
$newPostId = $conn->insert_id;
$stmt->close();

if (!$ok) {
    echo json_encode(['success' => false, 'error' => 'Không thể chia sẻ bài viết']);
    exit;
}

// 🆕 CHỈ COPY MEDIA NẾU BÀI GỐC CHƯA BỊ XÓA
if ($is_original_deleted == 0) {
    $mediaQ = $conn->prepare("SELECT MediaType, FilePath, ThumbnailPath, SortOrder 
                              FROM CommunityPostMedia WHERE PostID = ?");
    $mediaQ->bind_param("i", $post_id);
    $mediaQ->execute();
    $mediaRes = $mediaQ->get_result();

    if ($mediaRes->num_rows > 0) {
        $insertMedia = $conn->prepare("INSERT INTO CommunityPostMedia (PostID, MediaType, FilePath, ThumbnailPath, SortOrder) 
                                       VALUES (?, ?, ?, ?, ?)");
        while ($m = $mediaRes->fetch_assoc()) {
            $insertMedia->bind_param(
                "isssi",
                $newPostId,
                $m['MediaType'],
                $m['FilePath'],
                $m['ThumbnailPath'],
                $m['SortOrder']
            );
            $insertMedia->execute();
        }
        $insertMedia->close();
    }
    $mediaQ->close();
}

// ====================== CẬP NHẬT SỐ LƯỢT CHIA SẺ ======================
$update = $conn->prepare("UPDATE CommunityPost SET ShareCount = ShareCount + 1 WHERE PostID = ?");
$update->bind_param("i", $post_id);
$update->execute();
$update->close();

// ====================== GỬI THÔNG BÁO ======================
if ($original['UserID'] != $user_id && $is_original_deleted == 0) {
    $noti = $conn->prepare("
        INSERT INTO CommunityNotification (ActorID, UserID, Type, PostID, CreatedAt)
        VALUES (?, ?, 'share', ?, NOW())
    ");
    $noti->bind_param("iii", $user_id, $original['UserID'], $post_id);
    $noti->execute();
    $noti->close();
}

// ====================== PHẢN HỒI KẾT QUẢ ======================
echo json_encode([
    'success' => true,
    'message' => 'Đã chia sẻ bài viết thành công!',
    'new_post_id' => $newPostId,
    'original_deleted' => $is_original_deleted
]);
exit;
?>