<?php
session_start();
require_once '../../includes/db.php';

// 🔒 Kiểm tra đăng nhập
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login_normal.php");
    exit;
}

// 🟢 Lấy thông tin đầy đủ từ database nếu chưa có trong session
if (!isset($_SESSION['user_id']) || !isset($_SESSION['avatar_url'])) {
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID, AvatarURL FROM Users WHERE Username=? LIMIT 1");
    $st->bind_param("s", $u);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    if ($r) {
        $_SESSION['user_id'] = (int)$r['UserID'];
        $_SESSION['avatar_url'] = $r['AvatarURL'] ?? '';
    }
}

$page_title = "Bài viết người dùng";
include '../../includes/header.php';

$active_menu = 'community';
include '../../includes/navbar.php';

$username = $_GET['u'] ?? '';

// 🟢 XÁC ĐỊNH CHÍNH XÁC ĐÂY CÓ PHẢI TRANG CÁ NHÂN KHÔNG
$is_own_profile = false;
$display_username = '';

if (empty($username)) {
    // Không có tham số u -> trang cá nhân
    $display_username = $_SESSION['username'];
    $is_own_profile = true;
} else if ($username === $_SESSION['username']) {
    // Có tham số u nhưng trùng với user đang đăng nhập -> trang cá nhân
    $display_username = $_SESSION['username'];
    $is_own_profile = true;
} else {
    // Có tham số u và khác với user đang đăng nhập -> trang người khác
    $display_username = $username;
    $is_own_profile = false;
}

$highlight = $_GET['highlight'] ?? '';
?>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-main.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-notifications.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-create.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-edit.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-comments.css">

<div class="main-content community-wrapper">
  <?php if ($is_own_profile): ?>
    <h2>Bài viết của bạn</h2>
  <?php else: ?>
    <h2>Bài viết của <span id="user-post-name"><?= htmlspecialchars($display_username) ?></span></h2>
  <?php endif; ?>
  
  <button onclick="history.back()" class="btn small-btn">⬅ Quay lại</button>

  <section id="user-post-feed" aria-label="Bài viết người dùng"></section>
</div>

<!-- 🧩 Popup hiển thị người thả cảm xúc -->
<div id="fb-reaction-popup" class="fb-popup">
  <div class="fb-popup-box">
    <div class="fb-popup-header">
      <div id="fb-reaction-tabs" class="fb-tabs"></div>
      <button class="fb-close-btn" onclick="closeFbReactionPopup()">✕</button>
    </div>
    <div id="fb-reaction-list" class="fb-user-list"></div>
  </div>
</div>

<!-- Tooltip xem ai đã react -->
<div id="reaction-tooltip"></div>

<!-- 🧩 Gắn biến PHP sang JS -->
<script>
  // 🟢 QUAN TRỌNG: Đặt biến này TRƯỚC khi load các file JS khác
  const TARGET_USERNAME = "<?= htmlspecialchars($display_username) ?>";
  const HIGHLIGHT_ID = "<?= htmlspecialchars($highlight) ?>";
  const IS_OWN_PROFILE = <?= $is_own_profile ? 'true' : 'false' ?>;
  window.CURRENT_USER_ID = <?= isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0 ?>;
  window.CURRENT_USERNAME = "<?= htmlspecialchars($_SESSION['username']) ?>";
  window.CURRENT_AVATAR = "<?= isset($_SESSION['avatar_url']) ? htmlspecialchars($_SESSION['avatar_url']) : '' ?>";
  
  console.log("🔍 DEBUG INFO:");
  console.log("TARGET_USERNAME:", TARGET_USERNAME);
  console.log("IS_OWN_PROFILE:", IS_OWN_PROFILE);
  console.log("CURRENT_USERNAME:", window.CURRENT_USERNAME);
  console.log("CURRENT_AVATAR:", window.CURRENT_AVATAR);
  console.log("URL u param:", "<?= htmlspecialchars($username) ?>");
</script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-user.js?v=2001"></script>

<script src="/HeThongChamSocCaKoi/assets/js/community/community-notifications.js?v=2001"></script>

<!-- JS Core: Post + Feed + Popup + Notifications -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-main.js?v=2001"></script>

<!-- Load admin-menu.js ngay sau main.js -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-admin-menu.js?v=2001"></script>

<!-- Các file khác -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-create.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-edit.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-comments.js?v=2001"></script>

<?php include '../../includes/footer.php'; ?>