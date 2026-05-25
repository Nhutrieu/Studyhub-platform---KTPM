<?php
session_start();
require_once '../../includes/db.php';

// 🔒 Kiểm tra đăng nhập
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login_normal.php");
    exit;
}

// 🟢 Nếu chưa có user_id trong session thì tự lấy từ database
if (!isset($_SESSION['user_id'])) {
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=? LIMIT 1");
    $st->bind_param("s", $u);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    if ($r) $_SESSION['user_id'] = (int)$r['UserID'];
}

$page_title = "Cộng đồng Koi";
include '../../includes/header.php';

$active_menu = 'community';
;

// Load full user info
$u = $_SESSION['username'];
$stm = $conn->prepare("SELECT AvatarURL, FullName, Role FROM Users WHERE Username=? LIMIT 1");
$stm->bind_param("s", $u);
$stm->execute();
$info = $stm->get_result()->fetch_assoc();
$current_username = $_SESSION['username'];

// Xử lý avatar path
$avatar_path = $info['AvatarURL'] ?? "";
if ($avatar_path && !empty($avatar_path) && $avatar_path !== "null") {
    // Nếu avatar chỉ là tên file, thêm đường dẫn
    if (!str_contains($avatar_path, '/') && !str_contains($avatar_path, 'http')) {
        $current_avatar = "/HeThongChamSocCaKoi/uploads/avatars/" . $avatar_path;
    } else {
        $current_avatar = $avatar_path;
    }
} else {
    $current_avatar = ""; // Để JS xử lý default
}

$current_fullname = trim($info['FullName'] ?? "") ?: $u;
$current_role = $info['Role'] ?? ($_SESSION['role'] ?? 'user');

// Debug thông tin user
error_log("User Info - Avatar: " . $current_avatar . ", Role: " . $current_role);
?>

<!-- Fonts -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Material+Icons&display=swap" rel="stylesheet">

<!-- Styles -->
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-water-effects.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-main.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/ban-checker.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-notifications.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-create.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-edit.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-comments.css">
<!-- FACEBOOK REACTION POPUP -->
<div id="fb-reaction-popup" class="fb-popup">
  <div class="fb-popup-box">
      <div class="fb-popup-header">
          <div id="fb-reaction-tabs" class="fb-tabs">
              <!-- tab sẽ được JS load -->
          </div>
          <button class="fb-close-btn" onclick="closeFbReactionPopup()">✕</button>
      </div>

      <div id="fb-reaction-list" class="fb-user-list">
          <!-- danh sách user sẽ load ở đây -->
      </div>
  </div>
</div>

<div class="main-content community-wrapper">
  <!-- Top bar: tiêu đề + tab + thông báo -->
  <div class="community-header-bar">
    <div class="community-header-left">
      <h2>Cộng đồng Koi</h2>
      <div class="feed-tabs">
        <button class="feed-tab-btn active" data-scope="all">Dành cho bạn</button>
        <button class="feed-tab-btn" data-scope="following">Đang theo dõi</button>
      </div>
    </div>
     <div class="community-header-right">
      <button id="community-notify-btn" class="notify-btn" type="button">
        <span class="material-icons">notifications</span>
        <span id="community-notify-badge" class="notify-badge" hidden>0</span>
      </button>
      <div id="community-notify-dropdown" class="notify-dropdown"></div>
    </div>
  </div>

  <!-- Composer đăng bài (Facebook style) -->
  <!-- Composer đăng bài (Facebook style) -->
<section class="community-composer facebook-style">
    <div class="composer-wrapper" style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); text-align: left !important;">
      <div class="composer-top" style="display: flex; align-items: flex-start; text-align: left !important;">
        <!-- Avatar user -->
        <div class="composer-avatar" 
             onclick="goToUserProfileWithBack('<?= htmlspecialchars($current_username) ?>')"
             style="cursor: pointer; flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #f0f2f5; margin-right: 12px; float: left;">
          <?php if (!empty($current_avatar)): ?>
            <img src="<?= htmlspecialchars($current_avatar) ?>" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
          <?php else: ?>
            <div class="avatar-default" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #1877f2; color: white; font-weight: bold; font-size: 18px;">
              <?= strtoupper(substr($current_username, 0, 1)) ?>
            </div>
          <?php endif; ?>
        </div>
        
        <!-- Input text với placeholder -->
        <div class="composer-input-wrapper" style="flex: 1; text-align: left !important; overflow: hidden;">
          <input 
            type="text" 
            id="facebook-input" 
            name="content" 
            class="facebook-input" 
            placeholder="<?= htmlspecialchars($current_username) ?>, bạn đang nghĩ gì?"
            onclick="openPostModal()"
            readonly
            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 20px; background: #f0f2f5; cursor: pointer; text-align: left !important;"
          >
        </div>
      </div>
      
      <div class="composer-bottom" style="display: flex; justify-content: center; margin-top: 12px;">
        <button type="button" class="composer-action-btn" onclick="openPostModal()"
                style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: none; color: #65676b; cursor: pointer; border-radius: 6px; font-weight: 500;">
        </button>
      </div>
    </div>
  </section>

 <!-- Modal tạo bài viết (giống Facebook) -->
<div id="post-modal" class="post-modal">
    <div class="modal-content" style="text-align: left !important;">
      <!-- Header modal -->
      <div class="modal-header" style="text-align: center !important; padding: 16px; border-bottom: 1px solid #ddd;">
        <h3 style="margin: 0; text-align: center !important;">Tạo bài viết</h3>
        <button class="modal-close" onclick="closePostModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      
      <!-- User info với link đến trang user - FIX CĂN TRÁI -->
      <div class="modal-user-info" style="display: flex !important; align-items: flex-start !important; text-align: left !important; padding: 16px !important; margin: 0 !important;">
          <!-- Avatar -->
          <div class="modal-user-avatar" 
              onclick="goToUserProfileWithBack('<?= htmlspecialchars($current_username) ?>')"
              style="cursor: pointer; flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #f0f2f5; margin-right: 12px !important; float: left !important;">
              <?php if (!empty($current_avatar)): ?>
                  <img src="<?= htmlspecialchars($current_avatar) ?>" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
              <?php else: ?>
                  <div class="avatar-default" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #1877f2; color: white; font-weight: bold; font-size: 18px;">
                      <?= strtoupper(substr($current_username, 0, 1)) ?>
                  </div>
              <?php endif; ?>
          </div>
          
          <div class="modal-user-details" style="text-align: left !important; display: block !important; overflow: hidden; margin: 0 !important; padding: 0 !important;">
              <!-- Tên - Ở ĐẦU DÒNG BÊN PHẢI AVATAR -->
              <strong onclick="goToUserProfileWithBack('<?= htmlspecialchars($current_username) ?>')"
                      style="cursor: pointer; color: #050505; font-size: 15px; font-weight: 600; display: block; margin: 0 0 4px 0 !important; padding: 0 !important; text-align: left !important; float: none !important;">
                  <?= htmlspecialchars($current_username) ?>
              </strong>
              <select name="privacy" id="modal-privacy" style="border: 1px solid #ced0d4; border-radius: 6px; padding: 4px 8px; font-size: 13px; color: #65676b; background: white; cursor: pointer; text-align: left !important; display: block;">
                  <option value="public">Công khai</option>
                  <option value="followers">Người theo dõi</option>
                  <option value="private">Chỉ mình tôi</option>
              </select>
          </div>
      </div>
      
      <!-- Form đăng bài -->
      <form id="modal-post-form" style="padding: 0 16px; text-align: left !important;">
        <textarea 
          id="modal-content" 
          name="content" 
          rows="5" 
          placeholder="<?= htmlspecialchars($current_username) ?>, bạn đang nghĩ gì?"
          class="modal-textarea"
          style="width: 100%; min-height: 100px; border: none; resize: none; font-size: 16px; padding: 16px 0; outline: none; text-align: left !important; display: block;"
        ></textarea>
        
        <!-- Preview media -->
        <div id="modal-media-preview" class="modal-media-preview"></div>
        
        <!-- Footer modal -->
        <div class="modal-footer" style="padding: 16px; border-top: 1px solid #ddd; margin-top: 16px; text-align: left !important;">
          <div class="modal-actions" style="display: inline-block;">
            <label class="modal-action-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; background: #f0f2f5; color: #65676b;">
              <input type="file" id="modal-media" name="media[]" accept="image/*,video/*" multiple hidden>
              <span class="material-icons">image</span>
              <span>Ảnh/video</span>
            </label>
          </div>
          
          <div class="modal-submit" style="display: inline-block; float: right;">
            <button type="submit" id="modal-submit-btn" class="post-submit-btn" style="background: #1877f2; color: white; border: none; border-radius: 6px; padding: 8px 20px; font-weight: 600; cursor: pointer;">
              Đăng
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Composer đăng bài cũ (ẩn đi) -->
  <section class="community-composer old-composer" style="display: none;">
    <form id="community-post-form" enctype="multipart/form-data">
      <textarea id="community-content" name="content" rows="3"></textarea>

      <div class="composer-footer">
        <div class="composer-left">
          <label class="upload-btn">
            <span class="material-icons">image</span>
            Ảnh / Video
            <!-- multiple để chọn nhiều ảnh/video -->
            <input type="file" id="community-media" name="media[]" accept="image/*,video/*" multiple hidden>
          </label>
        </div>

        <div class="composer-center">
          <select name="privacy" id="community-privacy">
            <option value="public">Công khai</option>
            <option value="followers">Người theo dõi</option>
            <option value="private">Chỉ mình tôi</option>
          </select>
        </div>

        <div class="composer-right">
          <button type="submit" id="community-submit-btn">Đăng bài</button>
        </div>
      </div>

      <!-- Preview file đã chọn (JS render) -->
      <div id="community-media-preview"></div>
    </form>
  </section>

  <!-- Khu vực feed -->
  <section id="community-feed" aria-label="Bài viết cộng đồng">
    <!-- JS render -->
  </section>
</div>
<!-- Hiệu ứng nước -->
<div class="water-bg">
  <div class="water-wave"></div>
  <div class="water-wave"></div>
  <div class="water-wave"></div>
</div>

<div class="bubbles-container">
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
  <div class="bubble"></div>
</div>

<div class="water-light"></div>

<div class="koi-fish"></div>
<div class="koi-fish blue"></div>
<div class="koi-fish orange"></div>
<div id="reaction-tooltip"></div>

<script>
// Thêm hiệu ứng gợn nước khi click
document.addEventListener('click', function(e) {
  if (e.target.matches('.community-post button, .feed-tab-btn, .post-action-btn, .follow-btn, .modal-action-btn, .post-submit-btn, .comment-submit-btn')) {
    const btn = e.target;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('div');
    ripple.classList.add('water-ripple');
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    btn.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 1000);
  }
});

// Tạo thêm hiệu ứng cá Koi bơi random
function createRandomKoi() {
  const colors = ['', 'blue', 'orange'];
  const koi = document.createElement('div');
  koi.className = 'koi-fish ' + colors[Math.floor(Math.random() * colors.length)];
  koi.style.left = Math.random() * 100 + 'vw';
  koi.style.top = Math.random() * 100 + 'vh';
  koi.style.animationDuration = (40 + Math.random() * 40) + 's';
  koi.style.animationDelay = '-' + Math.random() * 60 + 's';
  document.querySelector('.community-wrapper').appendChild(koi);
  
  setTimeout(() => koi.remove(), 60000);
}

// Tạo cá Koi mỗi 10 giây
setInterval(createRandomKoi, 10000);

// Tạo bong bóng mới mỗi 2 giây
function createBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.left = Math.random() * 100 + '%';
  bubble.style.width = bubble.style.height = (20 + Math.random() * 40) + 'px';
  bubble.style.animationDuration = (15 + Math.random() * 15) + 's';
  bubble.style.animationDelay = Math.random() * 10 + 's';
  document.querySelector('.bubbles-container').appendChild(bubble);
  
  setTimeout(() => bubble.remove(), 30000);
}

// Tạo một số bong bóng ban đầu
for (let i = 0; i < 5; i++) {
  setTimeout(createBubble, i * 500);
}

// Tạo một số cá Koi ban đầu
for (let i = 0; i < 3; i++) {
  setTimeout(createRandomKoi, i * 1000);
}

setInterval(createBubble, 2000);

// Kiểm tra CSS đã load chưa
setTimeout(function() {
  const koiFish = document.querySelector('.koi-fish');
  const waterWave = document.querySelector('.water-wave');
  const bubble = document.querySelector('.bubble');
  
  if (koiFish || waterWave || bubble) {
    console.log('✅ CSS water-effects đã được load');
  } else {
    console.log('⚠️ Không tìm thấy CSS water-effects');
  }
}, 1000);
</script>

<script>
  function goToUserProfileWithBack(username) {
    if (!username) {
        console.error('❌ Không tìm thấy username');
        return;
    }
    
    // Lưu trang hiện tại vào localStorage để quay lại
    localStorage.setItem('community_previous_page', window.location.href);
    localStorage.setItem('community_previous_title', document.title);
    
    // Tạo URL profile
    const profileUrl = `${window.BASE_URL}/frontend/community/user_posts.php?u=${encodeURIComponent(username)}`;
    
    // Đóng modal nếu đang mở
    if (typeof closePostModal === 'function') {
        closePostModal();
    }
    
    // Chờ 100ms rồi chuyển trang
    setTimeout(() => {
        window.location.href = profileUrl;
    }, 100);
}

// Hàm quay lại trang community từ trang profile
function backToCommunityFromProfile() {
    const previousPage = localStorage.getItem('community_previous_page');
    const previousTitle = localStorage.getItem('community_previous_title');
    
    if (previousPage) {
        window.location.href = previousPage;
    } else {
        // Mặc định quay về trang chủ community
        window.location.href = `${window.BASE_URL}/frontend/community/`;
    }
}

// Kiểm tra và xử lý khi load trang
document.addEventListener("DOMContentLoaded", function() {
    // Nếu đang ở trang profile và có nút back, thêm sự kiện
    const backButton = document.getElementById('back-to-community-btn');
    if (backButton) {
        backButton.addEventListener('click', backToCommunityFromProfile);
    }
    
    // Hoặc tự động thêm nút back nếu cần
    if (window.location.pathname.includes('user_posts.php') && 
        localStorage.getItem('community_previous_page')) {
        addBackButtonToProfile();
    }
});

// Hàm thêm nút "Quay lại Cộng đồng" vào trang profile
function addBackButtonToProfile() {
    // Kiểm tra xem đã có nút back chưa
    if (document.getElementById('back-to-community-btn')) {
        return;
    }
    
    // Tìm header của trang profile
    const pageHeader = document.querySelector('.page-header, .user-profile-header, header');
    
    if (pageHeader) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-community-btn';
        backBtn.className = 'back-to-community-btn';
        backBtn.innerHTML = '← Quay lại Cộng đồng';
        backBtn.style.cssText = `
            margin-left: 10px;
            padding: 5px 15px;
            background: #1877f2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        pageHeader.appendChild(backBtn);
    }
}
    // ĐẢM BẢO TẤT CẢ BIẾN TOÀN CỤC TỒN TẠI
    window.CURRENT_USER_ID    = <?= json_encode($_SESSION['user_id'] ?? 0) ?>;
    window.CURRENT_USERNAME   = <?= json_encode($_SESSION['username']) ?>;
    window.CURRENT_FULLNAME   = <?= json_encode($current_fullname) ?>;
    window.CURRENT_AVATAR     = <?= json_encode($current_avatar) ?>;
    window.CURRENT_USER_ROLE  = <?= json_encode($current_role) ?>;
    window.BASE_URL           = "/HeThongChamSocCaKoi";
    
    // Debug log chi tiết
    console.log('🔐 User Info:', {
        ID: window.CURRENT_USER_ID,
        Username: window.CURRENT_USERNAME,
        FullName: window.CURRENT_FULLNAME,
        Avatar: window.CURRENT_AVATAR,
        Role: window.CURRENT_USER_ROLE,
        IsAdmin: window.CURRENT_USER_ROLE === 'Admin',
        BASE_URL: window.BASE_URL
    });
    
    // Đảm bảo CURRENT_USER_AVATAR không bị undefined
    if (typeof window.CURRENT_USER_AVATAR === 'undefined' || 
        window.CURRENT_USER_AVATAR === null || 
        window.CURRENT_USER_AVATAR === 'null') {
        window.CURRENT_USER_AVATAR = '';
        console.warn('⚠️ CURRENT_USER_AVATAR was undefined/null, set to empty string');
    }
</script>

<script>
// Hàm escape HTML đơn giản
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) {
        return map[m];
    });
}
  
// Set placeholder cho input Facebook
document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("facebook-input");
    if (input && window.CURRENT_USERNAME) {  // 🟢 SỬA TỪ CURRENT_FULLNAME THÀNH CURRENT_USERNAME
        input.placeholder = escapeHtml(window.CURRENT_USERNAME) + ", bạn đang nghĩ gì?";
    }
    
    // Cũng cập nhật placeholder trong modal
    var modalTextarea = document.getElementById("modal-content");
    if (modalTextarea && window.CURRENT_USERNAME) {
        modalTextarea.placeholder = escapeHtml(window.CURRENT_USERNAME) + ", bạn đang nghĩ gì?";
    }
});
</script>

<!-- JS Core: Post + Feed + Popup + Notifications -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-main.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/check_user_ban.js?v=2001"></script>
<!-- Load admin-menu.js ngay sau main.js -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-admin-menu.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-notifications.js?v=2001"></script>
<!-- Các file khác -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-create.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-edit.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-comments.js?v=2001"></script>
<?php include '../../includes/footer.php'; ?>