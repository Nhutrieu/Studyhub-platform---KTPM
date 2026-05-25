<?php
// backend/api/user/update_lastseen.php
error_reporting(E_ALL);
ini_set('display_errors','0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function out_err($msg,$code=400){ http_response_code($code); echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE); exit; }

try {
  if (!isset($_SESSION['username'])) out_err('Unauthorized',401);
  $username = $_SESSION['username'];
  $st = $conn->prepare("UPDATE Users SET LastSeen = NOW() WHERE Username = ?");
  $st->bind_param("s", $username);
  $st->execute();
  echo json_encode(['success'=>true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  out_err('Lỗi hệ thống: '.$e->getMessage(),500);
}
