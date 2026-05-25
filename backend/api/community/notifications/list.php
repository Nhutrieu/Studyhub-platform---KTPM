<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
  http_response_code($c);
  echo json_encode(['error' => $m], JSON_UNESCAPED_UNICODE);
  exit;
}

try {
  if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);

  $u = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s", $u);
  $st->execute();
  $user = $st->get_result()->fetch_assoc();
  if (!$user) fail('Không tìm thấy tài khoản', 404);
  $uid = (int)$user['UserID'];

  // đếm unread
  $st = $conn->prepare("SELECT COUNT(*) AS Cnt FROM CommunityNotification WHERE UserID=? AND IsRead=0");
  $st->bind_param("i", $uid);
  $st->execute();
  $row = $st->get_result()->fetch_assoc();
  $unread = (int)($row['Cnt'] ?? 0);

  // nếu chỉ cần summary (badge)
  if (isset($_GET['summary'])) {
    echo json_encode(['unreadCount' => $unread], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // lấy danh sách chi tiết
  $sql = "SELECT n.NotificationID, n.Type, n.IsRead, n.CreatedAt, n.PostID, n.CommentID,
                 a.UserID AS ActorID, a.FullName AS ActorFullName, a.Username AS ActorUsername, a.AvatarURL AS ActorAvatar,
                 p.Content AS PostContent
          FROM CommunityNotification n
          LEFT JOIN Users a ON n.ActorID = a.UserID
          LEFT JOIN CommunityPost p ON n.PostID = p.PostID
          WHERE n.UserID=?
          ORDER BY n.CreatedAt DESC
          LIMIT 20";
  $st = $conn->prepare($sql);
  $st->bind_param("i", $uid);
  $st->execute();
  $rs = $st->get_result();

  $list = [];
  while ($r = $rs->fetch_assoc()) {
    $snippet = $r['PostContent'] !== null ? mb_substr($r['PostContent'], 0, 50) : null;
    $list[] = [
      'NotificationID' => (int)$r['NotificationID'],
      'Type'           => $r['Type'],
      'IsRead'         => (int)$r['IsRead'] ? 1 : 0,
      'CreatedAt'      => $r['CreatedAt'],
      'PostID'         => $r['PostID'] !== null ? (int)$r['PostID'] : null,
      'CommentID'      => $r['CommentID'] !== null ? (int)$r['CommentID'] : null,
      'PostSnippet'    => $snippet,
      'actor' => [
        'UserID'    => $r['ActorID'] !== null ? (int)$r['ActorID'] : null,
        'FullName'  => $r['ActorFullName'],
        'Username'  => $r['ActorUsername'],
        'AvatarURL' => $r['ActorAvatar'],
      ]
    ];
  }

  echo json_encode([
    'notifications' => $list,
    'unreadCount'   => $unread
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
