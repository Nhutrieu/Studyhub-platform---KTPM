<?php
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

$commentId = $_GET['comment_id'] ?? 0;
$type = $_GET['type'] ?? 'all';

$valid = ['all','like','love','care','haha','wow','sad','angry'];
if (!in_array($type, $valid, true)) {
    echo json_encode(['error' => 'Kiểu reaction không hợp lệ']);
    exit;
}

// Hàm kiểm tra trạng thái theo dõi (sử dụng CommunityFollow)
function checkIfFollowing($followerId, $targetId) {
    global $conn;
    
    if (!$followerId || !$targetId || $followerId == $targetId) {
        return false;
    }
    
    try {
        // Kiểm tra trong bảng CommunityFollow
        $sql = "SELECT 1 FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $followerId, $targetId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->num_rows > 0;
        
    } catch (mysqli_sql_exception $e) {
        error_log("Error checking follow status: " . $e->getMessage());
        return false;
    }
}

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $currentUserId = $_SESSION['user_id'] ?? 0;

    // Lấy danh sách user theo type
    if ($type === 'all') {
        $sql = "
            SELECT r.Type, u.UserID, u.Username, u.FullName, u.AvatarURL
            FROM CommunityCommentReaction r
            JOIN Users u ON r.UserID = u.UserID
            WHERE r.CommentID=?
            ORDER BY r.CreatedAt DESC
        ";
        $st = $conn->prepare($sql);
        $st->bind_param("i", $commentId);
    } else {
        $sql = "
            SELECT r.Type, u.UserID, u.Username, u.FullName, u.AvatarURL
            FROM CommunityCommentReaction r
            JOIN Users u ON r.UserID = u.UserID
            WHERE r.CommentID=? AND r.Type=?
            ORDER BY r.CreatedAt DESC
        ";
        $st = $conn->prepare($sql);
        $st->bind_param("is", $commentId, $type);
    }

    $st->execute();
    $rs = $st->get_result();

    $users = [];
    while ($row = $rs->fetch_assoc()) {
        // Kiểm tra trạng thái theo dõi cho mỗi user
        $isFollowing = checkIfFollowing($currentUserId, $row['UserID']);
        
        $users[] = [
            'UserID' => $row['UserID'],
            'Username' => $row['Username'],
            'FullName' => $row['FullName'],
            'AvatarURL' => $row['AvatarURL'],
            'Type' => $row['Type'],
            'IsFollowing' => $isFollowing
        ];
    }

    // Tổng số reaction
    $total = 0;
    $summary = [
        'like'=>0,'love'=>0,'care'=>0,'haha'=>0,'wow'=>0,'sad'=>0,'angry'=>0
    ];

    $sql2 = "SELECT Type, COUNT(*) AS Cnt
             FROM CommunityCommentReaction
             WHERE CommentID=?
             GROUP BY Type";
    $st2 = $conn->prepare($sql2);
    $st2->bind_param("i", $commentId);
    $st2->execute();
    $rs2 = $st2->get_result();

    while ($row = $rs2->fetch_assoc()) {
        $summary[$row['Type']] = intval($row['Cnt']);
        $total += intval($row['Cnt']);
    }

    // reaction của user hiện tại
    $userReact = null;
    if ($currentUserId) {
        $sql3 = "SELECT Type FROM CommunityCommentReaction WHERE CommentID=? AND UserID=?";
        $st3 = $conn->prepare($sql3);
        $st3->bind_param("ii", $commentId, $currentUserId);
        $st3->execute();
        $rs3 = $st3->get_result();
        if ($r3 = $rs3->fetch_assoc()) {
            $userReact = $r3['Type'];
        }
    }

    echo json_encode([
        'success' => true,
        'comment_id' => $commentId,
        'users' => $users,
        'summary' => $summary,
        'total' => $total,
        'userReact' => $userReact,
        'currentUserId' => $currentUserId
    ]);

} catch (Throwable $e) {
    error_log("Error in comment_reactions/list.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Lỗi server: ' . $e->getMessage()]);
}
?>