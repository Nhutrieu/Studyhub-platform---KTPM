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

  $u = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s", $u);
  $st->execute();
  $user = $st->get_result()->fetch_assoc();
  if (!$user) fail('Không tìm thấy tài khoản', 404);
  $uid = (int)$user['UserID'];

  $postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
  $type   = isset($_POST['type']) ? $_POST['type'] : 'like';

  if ($postId <= 0) fail('Thiếu post_id');

  $validTypes = ['like','love','care','wow','sad','angry','haha'];
  if (!in_array($type, $validTypes, true)) $type = 'like';

  // Kiểm tra Post tồn tại + lấy owner
  $st = $conn->prepare("SELECT PostID, UserID, Content FROM CommunityPost WHERE PostID=? AND Status='active'");
  $st->bind_param("i", $postId);
  $st->execute();
  $postRow = $st->get_result()->fetch_assoc();
  if (!$postRow) fail('Bài viết không tồn tại hoặc đã bị ẩn.', 404);
  $postOwnerId = (int)$postRow['UserID'];

  // Kiểm tra reaction hiện tại
  $st = $conn->prepare("SELECT ReactionID, Type FROM CommunityReaction WHERE PostID=? AND UserID=? LIMIT 1");
  $st->bind_param("ii", $postId, $uid);
  $st->execute();
  $cur = $st->get_result()->fetch_assoc();

  $userReaction = null;

  if (!$cur) {
    // chưa có -> insert
    $ins = $conn->prepare("INSERT INTO CommunityReaction (PostID, UserID, Type) VALUES (?, ?, ?)");
    $ins->bind_param("iis", $postId, $uid, $type);
    $ins->execute();
    $userReaction = $type;
  } else {
    if ($cur['Type'] === $type) {
      // trùng -> bỏ reaction
      $del = $conn->prepare("DELETE FROM CommunityReaction WHERE ReactionID=?");
      $rid = (int)$cur['ReactionID'];
      $del->bind_param("i", $rid);
      $del->execute();
      $userReaction = null;
    } else {
      // đổi loại reaction
      $upd = $conn->prepare("UPDATE CommunityReaction SET Type=? WHERE ReactionID=?");
      $rid = (int)$cur['ReactionID'];
      $upd->bind_param("si", $type, $rid);
      $upd->execute();
      $userReaction = $type;
    }
  }

  // Cập nhật ReactionCount
  $st = $conn->prepare("SELECT COUNT(*) AS Cnt FROM CommunityReaction WHERE PostID=?");
  $st->bind_param("i", $postId);
  $st->execute();
  $cntRow = $st->get_result()->fetch_assoc();
  $totalReact = (int)($cntRow['Cnt'] ?? 0);

  $upd = $conn->prepare("UPDATE CommunityPost SET ReactionCount=? WHERE PostID=?");
  $upd->bind_param("ii", $totalReact, $postId);
  $upd->execute();

  // Notification: nếu có reaction (không phải remove) & không phải tự like chính mình
  if ($userReaction !== null && $postOwnerId !== $uid) {
    $snippet = mb_substr($postRow['Content'] ?? '', 0, 80);
    $ins = $conn->prepare("INSERT INTO CommunityNotification (UserID, ActorID, Type, PostID, IsRead) VALUES (?, ?, 'post_reaction', ?, 0)");
    $ins->bind_param("iii", $postOwnerId, $uid, $postId);
    $ins->execute();
    // lưu snippet vào trường AdviceText? mình dùng PostSnippet bên list, nên không cần
  }

  // Lấy summary theo type
  $summary = [];
  $st = $conn->prepare("SELECT Type, COUNT(*) AS Cnt FROM CommunityReaction WHERE PostID=? GROUP BY Type");
  $st->bind_param("i", $postId);
  $st->execute();
  $rs = $st->get_result();
  while ($row = $rs->fetch_assoc()) {
    $summary[$row['Type']] = (int)$row['Cnt'];
  }

  echo json_encode([
    'success'      => true,
    'userReaction' => $userReaction,
    'total'        => $totalReact,
    'summary'      => $summary
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
