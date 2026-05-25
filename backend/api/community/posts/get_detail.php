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
  if (!isset($_GET['post_id'])) fail('Thiếu ID bài viết.');
  $postId = (int)$_GET['post_id'];

  $uid = 0;
  if (!empty($_SESSION['username'])) {
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $u);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    if ($row) $uid = (int)$row['UserID'];
  }

  // 🟢 Lấy thông tin bài viết
  $st = $conn->prepare("
      SELECT 
        p.*, 
        u.FullName, u.Username, u.AvatarURL, u.Role,
        (SELECT 1 FROM CommunityFollow f 
         WHERE f.FollowerID=? AND f.FollowingID=u.UserID LIMIT 1) AS IsFollowing
      FROM CommunityPost p
      JOIN Users u ON p.UserID = u.UserID
      WHERE p.PostID=?
        AND (p.Status IS NULL OR p.Status IN ('active','public','approved'))
  ");
  $st->bind_param("ii", $uid, $postId);
  $st->execute();
  $p = $st->get_result()->fetch_assoc();
  if (!$p) fail('Không tìm thấy bài viết.', 404);

  // 🟢 Media
  $media = [];
  $stm = $conn->prepare("SELECT MediaID, MediaType, FilePath, ThumbnailPath, SortOrder 
                         FROM CommunityPostMedia 
                         WHERE PostID=? ORDER BY SortOrder ASC");
  $stm->bind_param("i", $postId);
  $stm->execute();
  $rs = $stm->get_result();
  while ($m = $rs->fetch_assoc()) $media[] = $m;

  // 🟢 Reaction summary
  $summary = [];
  $total = 0;
  $sr = $conn->prepare("SELECT Type, COUNT(*) AS Cnt 
                        FROM CommunityReaction WHERE PostID=? GROUP BY Type");
  $sr->bind_param("i", $postId);
  $sr->execute();
  $rr = $sr->get_result();
  while ($r = $rr->fetch_assoc()) {
    $summary[$r['Type']] = (int)$r['Cnt'];
    $total += (int)$r['Cnt'];
  }

  // 🟢 User reaction
  $userReact = null;
  if ($uid) {
    $ur = $conn->prepare("SELECT Type FROM CommunityReaction 
                          WHERE PostID=? AND UserID=? LIMIT 1");
    $ur->bind_param("ii", $postId, $uid);
    $ur->execute();
    if ($row = $ur->get_result()->fetch_assoc()) $userReact = $row['Type'];
  }

  // 🟢 Comment count
  $cCount = $conn->prepare("
      SELECT COUNT(*) AS Cnt 
      FROM CommunityComment WHERE PostID=? AND Status='active'
  ");
  $cCount->bind_param("i", $postId);
  $cCount->execute();
  $rC = $cCount->get_result()->fetch_assoc();
  $commentCount = (int)($rC['Cnt'] ?? 0);

  // 🟢 Bài chia sẻ
  $originalPost = null;
  if (!empty($p['OriginalPostID'])) {
    $oid = (int)$p['OriginalPostID'];

    $so = $conn->prepare("
        SELECT 
          p.PostID, p.Content, p.CreatedAt, p.Privacy,
          u.FullName, u.Username, u.AvatarURL, u.Role
        FROM CommunityPost p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.PostID=?
          AND (p.Status IS NULL OR p.Status IN ('active','public','approved'))
          AND (p.Privacy IN ('public','followers') OR p.UserID=?)
    ");

    $so->bind_param("ii", $oid, $uid);
    $so->execute();
    $orig = $so->get_result()->fetch_assoc();

    if ($orig) {
      // Media bài gốc
      $morig = [];
      $stm->bind_param("i", $oid);
      $stm->execute();
      $mres = $stm->get_result();
      while ($mm = $mres->fetch_assoc()) $morig[] = $mm;

      // Tổng react của bài gốc
      $sumO = [];
      $totO = 0;
      $sr->bind_param("i", $oid);
      $sr->execute();
      $rro = $sr->get_result();
      while ($ro = $rro->fetch_assoc()) {
        $sumO[$ro['Type']] = (int)$ro['Cnt'];
        $totO += (int)$ro['Cnt'];
      }

      // React user vào bài gốc
      $userReactOrig = null;
      if ($uid) {
        $ur->bind_param("ii", $oid, $uid);
        $ur->execute();
        if ($row2 = $ur->get_result()->fetch_assoc()) $userReactOrig = $row2['Type'];
      }

      $orig['media'] = $morig;
      $orig['reactions'] = [
        'summary' => $sumO,
        'total' => $totO,
        'user' => $userReactOrig,
      ];

      $originalPost = $orig;
    }
  }

  // 🟢 Tạo object user
  $user = [
    'UserID'    => (int)$p['UserID'],
    'FullName'  => $p['FullName'],
    'Username'  => $p['Username'],
    'AvatarURL' => $p['AvatarURL'],
    'Role'      => $p['Role'],
  ];

  // 🟢 Tạo JSON trả về đúng chuẩn FE
  $out = [
    'PostID'       => (int)$p['PostID'],
    'UserID'       => (int)$p['UserID'],
    'Content'      => $p['Content'],
    'Privacy'      => $p['Privacy'],
    'CreatedAt'    => $p['CreatedAt'],
    'UpdatedAt'    => $p['UpdatedAt'],
    'media'        => $media,
    'user'         => $user,
    'OriginalPostID' => $p['OriginalPostID'] ? (int)$p['OriginalPostID'] : null,
    'OriginalPost' => $originalPost,

    // ⭐⭐ QUAN TRỌNG — TRẢ RA isFollowing ĐÚNG CHUẨN FE ⭐⭐
    'isFollowing'  => !empty($p['IsFollowing']),

    'reactions' => [
      'summary' => $summary,
      'total'   => $total,
      'user'    => $userReact,
    ],

    'comments' => [
      'total' => $commentCount,
      'items' => []
    ]
  ];

  echo json_encode(['success' => true, 'post' => $out], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>
