<?php
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

if (!isset($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập']);
    exit;
}

$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=? LIMIT 1");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? 0;

if (!$uid) {
    echo json_encode(['success' => false, 'error' => 'Không xác định được UserID']);
    exit;
}

$commentId = (int)($_POST['comment_id'] ?? 0);
$type = $_POST['type'] ?? 'like';

$valid = ['like','love','care','haha','wow','sad','angry'];
if (!in_array($type, $valid)) {
    echo json_encode(['success' => false, 'error' => 'Kiểu reaction không hợp lệ']);
    exit;
}

try {
    // Kiểm tra comment tồn tại
    $st = $conn->prepare("SELECT UserID, PostID FROM CommunityComment WHERE CommentID=? AND Status='active'");
    $st->bind_param("i", $commentId);
    $st->execute();
    $c = $st->get_result()->fetch_assoc();
    if (!$c) {
        echo json_encode(['success' => false, 'error' => 'Comment không tồn tại']);
        exit;
    }

    // Kiểm tra reaction cũ
    $st = $conn->prepare("SELECT ReactionID, Type FROM CommunityCommentReaction WHERE CommentID=? AND UserID=?");
    $st->bind_param("ii", $commentId, $uid);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();

    if ($r) {
        if ($r['Type'] === $type) {
            $del = $conn->prepare("DELETE FROM CommunityCommentReaction WHERE ReactionID=?");
            $del->bind_param("i", $r['ReactionID']);
            $del->execute();
            $userReact = null;
        } else {
            $upd = $conn->prepare("UPDATE CommunityCommentReaction SET Type=? WHERE ReactionID=?");
            $upd->bind_param("si", $type, $r['ReactionID']);
            $upd->execute();
            $userReact = $type;
        }
    } else {
        $ins = $conn->prepare("INSERT INTO CommunityCommentReaction(CommentID, UserID, Type) VALUES(?,?,?)");
        $ins->bind_param("iis", $commentId, $uid, $type);
        $ins->execute();
        $userReact = $type;
    }

    // summary
    $summary = [];
    $total = 0;
    $q = $conn->query("
        SELECT Type, COUNT(*) AS Cnt
        FROM CommunityCommentReaction
        WHERE CommentID={$commentId}
        GROUP BY Type
    ");
    while ($row = $q->fetch_assoc()) {
        $summary[strtolower($row['Type'])] = (int)$row['Cnt'];
        $total += (int)$row['Cnt'];
    }

    echo json_encode([
        'success' => true,
        'comment_id' => $commentId,
        'userReact' => $userReact,
        'total' => $total,
        'summary' => $summary
    ]);

} catch (Throwable $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
