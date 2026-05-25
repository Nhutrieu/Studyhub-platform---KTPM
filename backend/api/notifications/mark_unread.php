<?php
// FILE: backend/api/notifications/mark_unread.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';

// Kiểm tra quyền
if (empty($_SESSION['username'])) {
    echo json_encode(['success'=>false, 'error'=>'Unauthorized']);
    exit;
}

$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

if (!$uid) {
    echo json_encode(['success'=>false, 'error'=>'User not found']);
    exit;
}

$id = $_POST['id'] ?? null;

if ($id === null || !is_numeric($id)) {
    echo json_encode(['success'=>false, 'error'=>'Invalid notification ID']);
    exit;
}

// Chỉ đánh dấu là chưa đọc cho một thông báo cụ thể (IsRead = 0)
$notiId = (int)$id;
$upd = $conn->prepare("UPDATE SystemNotifications SET IsRead = 0 WHERE NotiID = ? AND UserID = ?");
$upd->bind_param("ii", $notiId, $uid);

if ($upd->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>