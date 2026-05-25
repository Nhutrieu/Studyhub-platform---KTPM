<?php
// FILE: backend/api/notifications/list.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';

if (empty($_SESSION['username'])) {
    echo json_encode(['success'=>false, 'error'=>'Unauthorized']);
    exit;
}

// Lấy UserID
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

if (!$uid) {
    echo json_encode(['success'=>false, 'error'=>'User not found']);
    exit;
}

// Lấy 10 thông báo mới nhất
$sql = "SELECT NotiID, Type, Title, Message, Link, IsRead, CreatedAt 
        FROM SystemNotifications 
        WHERE UserID = ? 
        ORDER BY CreatedAt DESC 
        LIMIT 20";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $uid);
$stmt->execute();
$result = $stmt->get_result();
$items = $result->fetch_all(MYSQLI_ASSOC);

// Đếm số lượng chưa đọc
$cntSql = "SELECT COUNT(*) as unread FROM SystemNotifications WHERE UserID = ? AND IsRead = 0";
$cntStmt = $conn->prepare($cntSql);
$cntStmt->bind_param("i", $uid);
$cntStmt->execute();
$unread = $cntStmt->get_result()->fetch_assoc()['unread'] ?? 0;

echo json_encode([
    'success' => true,
    'items' => $items,
    'unread_count' => (int)$unread
]);
?>