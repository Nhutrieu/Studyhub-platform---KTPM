<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);

  $pid = (int)($_GET['id'] ?? 0);
  if ($pid <= 0) fail('Thiếu ID bản ghi', 400);

  $username = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s", $username);
  $st->execute();
  $user = $st->get_result()->fetch_assoc();
  if (!$user) fail('Không tìm thấy tài khoản', 404);
  $uid = (int)$user['UserID'];

  // kiểm tra quyền sở hữu bản ghi
  $q = "SELECT 1 
        FROM WaterParameter WP 
        JOIN Pond P ON WP.PondID = P.PondID
        WHERE WP.ParameterID = ? AND P.UserID = ?";
  $st = $conn->prepare($q);
  $st->bind_param("ii", $pid, $uid);
  $st->execute();
  if (!$st->get_result()->fetch_assoc()) fail('Không có quyền xoá bản ghi này', 403);

  // xoá bản ghi
  $del = $conn->prepare("DELETE FROM WaterParameter WHERE ParameterID=?");
  $del->bind_param("i", $pid);
  $del->execute();

  echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
