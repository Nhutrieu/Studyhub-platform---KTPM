<?php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['username'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Chưa đăng nhập']);
  exit;
}

$username = $_SESSION['username'];
$stmt = $conn->prepare("SELECT Username, FullName, Phone, Address, Role, AvatarURL FROM Users WHERE Username=?");
$stmt->bind_param("s", $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user) {
  http_response_code(404);
  echo json_encode(['error' => 'Không tìm thấy người dùng']);
  exit;
}

$avatar = !empty($user['AvatarURL'])
  ? '/' . ltrim($user['AvatarURL'], '/')
  : '/HeThongChamSocCaKoi/assets/images/default_avatar.png';

$user['AvatarURL'] = $avatar;
echo json_encode($user, JSON_UNESCAPED_UNICODE);
