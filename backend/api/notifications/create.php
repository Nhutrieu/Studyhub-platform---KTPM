<?php
// FILE: backend/api/notifications/create.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';

// Kiểm tra đăng nhập
if (empty($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Lấy UserID từ Session
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

if (!$uid) {
    echo json_encode(['success' => false, 'error' => 'User not found']);
    exit;
}

// Nhận dữ liệu từ POST
$type = $_POST['type'] ?? 'info'; // danger, warning, success, info
$title = $_POST['title'] ?? 'Thông báo hệ thống';
$message = $_POST['message'] ?? '';
$link = $_POST['link'] ?? null;

if (empty($message)) {
    echo json_encode(['success' => false, 'error' => 'Empty message']);
    exit;
}

// Insert vào bảng SystemNotifications
$sql = "INSERT INTO SystemNotifications (UserID, Type, Title, Message, Link, IsRead, CreatedAt) VALUES (?, ?, ?, ?, ?, 0, NOW())";
$stmt = $conn->prepare($sql);
$stmt->bind_param("issss", $uid, $type, $title, $message, $link);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>