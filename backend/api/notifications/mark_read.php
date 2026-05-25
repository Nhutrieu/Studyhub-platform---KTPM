<?php
// FILE: backend/api/notifications/mark_read.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';

if (empty($_SESSION['username'])) exit;

$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

if (!$uid) exit;

$id = $_POST['id'] ?? 'all';

if ($id === 'all') {
    $upd = $conn->prepare("UPDATE SystemNotifications SET IsRead = 1 WHERE UserID = ? AND IsRead = 0");
    $upd->bind_param("i", $uid);
    $upd->execute();
} else {
    $notiId = (int)$id;
    $upd = $conn->prepare("UPDATE SystemNotifications SET IsRead = 1 WHERE NotiID = ? AND UserID = ?");
    $upd->bind_param("ii", $notiId, $uid);
    $upd->execute();
}

echo json_encode(['success' => true]);
?>