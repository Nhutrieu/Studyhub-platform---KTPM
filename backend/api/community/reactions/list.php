<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

if (!isset($_SESSION['username'])) {
    echo json_encode(['error' => 'Chưa đăng nhập']);
    exit;
}

// ===== Lấy ID người hiện tại =====
$currentUser = 0;
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=? LIMIT 1");
$st->bind_param("s", $u);
$st->execute();
$user = $st->get_result()->fetch_assoc();
if ($user) $currentUser = (int)$user['UserID'];

$postId = intval($_GET['post_id'] ?? 0);
$type = $_GET['type'] ?? '';
$valid = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'all'];
$isAll = isset($_GET['all']);

/* ======================================================
   TH1: ?all=1 → LẤY SUMMARY + FULL USER LIST (CHUẨN FB)
   ====================================================== */
if ($isAll) {
    // Lấy summary
    $sqlSum = "SELECT Type, COUNT(*) AS Total
               FROM CommunityReaction
               WHERE PostID = ?
               GROUP BY Type";
    $stSum = $conn->prepare($sqlSum);
    $stSum->bind_param("i", $postId);
    $stSum->execute();
    $rsSum = $stSum->get_result();

    $summary = [];
    while ($row = $rsSum->fetch_assoc()) {
        $summary[$row['Type']] = intval($row['Total']);
    }

    // Lấy danh sách user + trạng thái follow
    $sqlUsers = "SELECT 
                    r.Type, r.UserID, r.CreatedAt,
                    u.FullName, u.Username, u.AvatarURL,
                    EXISTS (
                        SELECT 1 FROM CommunityFollow f 
                        WHERE f.FollowerID = ? AND f.FollowingID = u.UserID
                    ) AS IsFollowed
                 FROM CommunityReaction r
                 JOIN Users u ON r.UserID = u.UserID
                 WHERE r.PostID = ?
                 ORDER BY r.CreatedAt DESC";

    $stUsers = $conn->prepare($sqlUsers);
    $stUsers->bind_param("ii", $currentUser, $postId);
    $stUsers->execute();
    $rsUsers = $stUsers->get_result();

    $users = [];
    while ($row = $rsUsers->fetch_assoc()) {
        $users[] = [
            'Type'       => $row['Type'],
            'UserID'     => (int)$row['UserID'],
            'FullName'   => $row['FullName'],
            'Username'   => $row['Username'],
            'AvatarURL'  => $row['AvatarURL'],
            'Time'       => $row['CreatedAt'],
            'IsFollowing' => (bool)$row['IsFollowed']
        ];
    }

    echo json_encode([
        'summary' => $summary,
        'users'   => $users
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ======================================================
   TH2: type=all → LẤY FULL USER LIST (KHÔNG SUMMARY)
   ====================================================== */
if (!in_array($type, $valid, true)) {
    echo json_encode(['error' => 'Loại cảm xúc không hợp lệ']);
    exit;
}

if ($type === 'all') {
    $sql = "SELECT 
                r.Type, r.UserID, r.CreatedAt,
                u.FullName, u.Username, u.AvatarURL,
                EXISTS (
                    SELECT 1 FROM CommunityFollow f 
                    WHERE f.FollowerID = ? AND f.FollowingID = u.UserID
                ) AS IsFollowed
            FROM CommunityReaction r
            JOIN Users u ON r.UserID = u.UserID
            WHERE r.PostID = ?
            ORDER BY r.CreatedAt DESC";

    $st = $conn->prepare($sql);
    $st->bind_param("ii", $currentUser, $postId);
    $st->execute();
    $rs = $st->get_result();

    $list = [];
    while ($row = $rs->fetch_assoc()) {
        $list[] = [
            'Type'        => $row['Type'],
            'UserID'      => (int)$row['UserID'],
            'FullName'    => $row['FullName'],
            'Username'    => $row['Username'],
            'AvatarURL'   => $row['AvatarURL'],
            'Time'        => $row['CreatedAt'],
            'IsFollowing' => (bool)$row['IsFollowed']
        ];
    }

    echo json_encode(['users' => $list], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ======================================================
   TH3: type cụ thể → LẤY THEO MỖI TYPE
   ====================================================== */
$sql = "SELECT 
            r.Type, r.UserID, r.CreatedAt,
            u.FullName, u.Username, u.AvatarURL,
            EXISTS (
                SELECT 1 FROM CommunityFollow f 
                WHERE f.FollowerID = ? AND f.FollowingID = u.UserID
            ) AS IsFollowed
        FROM CommunityReaction r
        JOIN Users u ON r.UserID = u.UserID
        WHERE r.PostID = ? AND r.Type = ?
        ORDER BY r.CreatedAt DESC";

$st = $conn->prepare($sql);
$st->bind_param("iis", $currentUser, $postId, $type);
$st->execute();
$rs = $st->get_result();

$list = [];
while ($row = $rs->fetch_assoc()) {
    $list[] = [
        'Type'        => $row['Type'],
        'UserID'      => (int)$row['UserID'],
        'FullName'    => $row['FullName'],
        'Username'    => $row['Username'],
        'AvatarURL'   => $row['AvatarURL'],
        'Time'        => $row['CreatedAt'],
        'IsFollowing' => (bool)$row['IsFollowed']
    ];
}

echo json_encode(['users' => $list], JSON_UNESCAPED_UNICODE);
?>
