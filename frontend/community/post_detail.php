<?php
session_start();
require_once '../../includes/db.php';

// 🔒 Kiểm tra đăng nhập
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login_normal.php");
    exit;
}

// 🟢 Gán biến user_id nếu chưa có
if (!isset($_SESSION['user_id'])) {
    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=? LIMIT 1");
    $st->bind_param("s", $u);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    if ($r) $_SESSION['user_id'] = (int)$r['UserID'];
}

// 🟢 Lấy thông tin avatar
$user_avatar = '/HeThongChamSocCaKoi/assets/images/default-avatar.png';
if (isset($_SESSION['user_id'])) {
    $stmt = $conn->prepare("SELECT AvatarURL FROM Users WHERE UserID = ?");
    $stmt->bind_param("i", $_SESSION['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        if (!empty($row['AvatarURL']) && file_exists($_SERVER['DOCUMENT_ROOT'] . '/HeThongChamSocCaKoi/uploads/avatars/' . $row['AvatarURL'])) {
            $user_avatar = '/HeThongChamSocCaKoi/uploads/avatars/' . $row['AvatarURL'];
        }
    }
}

// 🔍 Lấy PostID từ URL
$postId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($postId <= 0) {
    die("Bài viết không tồn tại");
}

// 🔍 Kiểm tra nếu có tham số warning
$warningId = isset($_GET['warning']) ? (int)$_GET['warning'] : 0;
$showWarning = isset($_GET['show_warning']) ? true : false;

$warningInfo = null;
$warningDisplayed = false;

// Nếu có warning ID, lấy thông tin cảnh cáo
if ($warningId > 0) {
    $warningStmt = $conn->prepare("
        SELECT w.*, u.Username as AdminName, u.FullName as AdminFullName
        FROM UserWarning w
        LEFT JOIN Users u ON w.AdminID = u.UserID
        WHERE w.WarningID = ? AND w.UserID = ?
    ");
    
    if (isset($_SESSION['user_id'])) {
        $warningStmt->bind_param("ii", $warningId, $_SESSION['user_id']);
        $warningStmt->execute();
        $warningResult = $warningStmt->get_result();
        
        if ($warningResult->num_rows > 0) {
            $warningInfo = $warningResult->fetch_assoc();
        }
    }
}

// Nếu yêu cầu hiển thị cảnh cáo (từ notification)
if ($showWarning && isset($_SESSION['user_id'])) {
    $warningStmt = $conn->prepare("
        SELECT w.*, u.Username as AdminName, u.FullName as AdminFullName
        FROM UserWarning w
        LEFT JOIN Users u ON w.AdminID = u.UserID
        WHERE w.PostID = ? AND w.UserID = ?
        ORDER BY w.CreatedAt DESC LIMIT 1
    ");
    
    $warningStmt->bind_param("ii", $postId, $_SESSION['user_id']);
    $warningStmt->execute();
    $warningResult = $warningStmt->get_result();
    
    if ($warningResult->num_rows > 0) {
        $warningInfo = $warningResult->fetch_assoc();
    }
}

$page_title = "Bài viết chi tiết";
include '../../includes/header.php';
include '../../includes/navbar.php';
?>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-main.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-notifications.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-create.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-post-edit.css">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/community/community-comments.css">

<!-- CSS cho banner cảnh cáo -->
<style>
/* Banner cảnh cáo trên bài viết */
/* CSS cho comment được highlight khi click từ notification */
.comment-highlighted-from-notification {
    animation: notificationHighlightPulse 2s ease-in-out;
    border: 2px solid #2196f3 !important;
    border-radius: 8px;
    padding: 8px;
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
    position: relative;
    transform: translateY(-2px);
    transition: all 0.3s ease;
}

@keyframes notificationHighlightPulse {
    0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(33, 150, 243, 0); }
    100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
}

/* Đảm bảo comment trong reply list cũng được highlight */
.reply-list .comment-highlighted-from-notification {
    margin: 5px;
    transform: translateX(5px) translateY(-2px);
}

/* Style cho badge "ĐANG XEM" */
.notification-badge {
    animation: badgePulse 2s infinite;
}

@keyframes badgePulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Style cho thông báo tạm thời */
.temp-notification {
    animation: slideInDown 0.3s ease;
}

@keyframes slideInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.post-warning-banner {
    background: linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%);
    border: 2px solid #ff9800;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: 0 4px 20px rgba(255, 152, 0, 0.15);
    animation: slideInDown 0.5s ease;
    position: relative;
}

@keyframes slideInDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.warning-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #ffcc80;
}

.warning-icon {
    color: #ff9800;
    font-size: 28px;
    margin-right: 10px;
}

.warning-header h3 {
    margin: 0;
    color: #d84315;
    flex: 1;
}

.warning-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.warning-close:hover {
    background: rgba(0,0,0,0.1);
}

.warning-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.warning-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.warning-field strong {
    color: #333;
    font-size: 14px;
}

.warning-field p {
    margin: 0;
    padding: 10px;
    background: white;
    border-radius: 6px;
    border-left: 3px solid #ff9800;
    font-size: 14px;
}

.warning-severity {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
}

.severity-low {
    background: #e8f5e8;
    color: #388e3c;
}

.severity-medium {
    background: #fff3e0;
    color: #f57c00;
}

.severity-high {
    background: #ffebee;
    color: #d32f2f;
}

.severity-critical {
    background: #f3e5f5;
    color: #7b1fa2;
}

.warning-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 15px;
    border-top: 1px solid #ffcc80;
}

.btn-outline {
    background: white;
    border: 1px solid #ddd;
    color: #666;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
}

.btn-outline:hover {
    background: #f5f5f5;
    border-color: #ccc;
}

.btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.btn-primary {
    background: #1976d2;
    color: white;
}

.btn-primary:hover {
    background: #1565c0;
}

/* Loading spinner */
.loading-spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #ff9800;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Trạng thái đã xác nhận */
.post-warning-banner.acknowledged {
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    border-color: #4caf50;
}

.post-warning-banner.acknowledged .warning-header {
    border-bottom-color: #a5d6a7;
}

.post-warning-banner.acknowledged .warning-icon {
    color: #4caf50;
}

.post-warning-banner.acknowledged .warning-header h3 {
    color: #2e7d32;
}

/* Notification badge style */
.acknowledge-success, .acknowledge-loading, .acknowledge-error {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}

.acknowledge-success {
    color: #388e3c;
}

.acknowledge-error {
    color: #d32f2f;
}

</style>

<div class="main-content community-wrapper">
  <div class="community-header-bar">
    <h2>Bài viết chi tiết</h2>
    <button class="btn small-btn" onclick="window.history.back()">Quay lại</button>
  </div>

  <?php if ($warningInfo): ?>
  <!-- Banner cảnh cáo -->
  <div class="post-warning-banner" id="post-warning-banner">
    <div class="warning-header">
        <span class="material-icons warning-icon">warning</span>
        <h3>Bài viết này đã bị cảnh cáo</h3>
        <button class="warning-close" onclick="closeWarningBanner()">×</button>
    </div>
    
    <div class="warning-details">
        <div class="warning-field">
            <strong>Lý do cảnh cáo:</strong>
            <p><?php echo htmlspecialchars($warningInfo['Reason']); ?></p>
        </div>
        
        <div class="warning-field">
            <strong>Mức độ nghiêm trọng:</strong>
            <span class="warning-severity severity-<?php echo $warningInfo['Severity']; ?>">
                <?php 
                $severityText = [
                    'low' => 'Thấp',
                    'medium' => 'Trung bình', 
                    'high' => 'Cao',
                    'critical' => 'Rất cao'
                ];
                echo $severityText[$warningInfo['Severity']] ?? $warningInfo['Severity'];
                ?>
            </span>
        </div>
        
        <div class="warning-field">
            <strong>Người cảnh cáo:</strong>
            <span><?php echo htmlspecialchars($warningInfo['AdminName']); ?></span>
        </div>
        
        <div class="warning-field">
            <strong>Thời hạn:</strong>
            <span><?php echo date('d/m/Y H:i', strtotime($warningInfo['ExpiresAt'])); ?></span>
        </div>
        
        <div class="warning-field">
            <strong>Thời điểm cảnh cáo:</strong>
            <span><?php echo date('d/m/Y H:i', strtotime($warningInfo['CreatedAt'])); ?></span>
        </div>
    </div>
    
    <div class="warning-actions">
        <button class="btn btn-primary" onclick="acknowledgeWarning(<?php echo $warningInfo['WarningID']; ?>, <?php echo $postId; ?>)">
            <span class="material-icons">check_circle</span>
            Xác nhận đã đọc
        </button>
        
        <button class="btn btn-outline" onclick="closeWarningBanner()">
            <span class="material-icons">close</span>
            Đóng
        </button>
    </div>
  </div>
  <?php endif; ?>

  <section id="post-detail"></section>
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
  // 🟢 Gán ID người dùng hiện tại sang JS để dùng cho Follow / Owner check
  window.CURRENT_USER_ID = <?= isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0 ?>;
  window.CURRENT_USERNAME = '<?= isset($_SESSION['username']) ? addslashes($_SESSION['username']) : "" ?>';
  window.CURRENT_USER_ROLE = '<?= isset($_SESSION['role']) ? addslashes($_SESSION['role']) : "" ?>';
  window.CURRENT_USER_AVATAR = '<?= $user_avatar ?>';
  
  // Biến cho cảnh cáo
  window.CURRENT_WARNING_ID = <?= $warningId ?>;
  window.CURRENT_POST_ID = <?= $postId ?>;
  
  // Thêm biến để lưu notificationId nếu có từ sessionStorage
  window.CURRENT_NOTIFICATION_ID = null;
  
  // Kiểm tra sessionStorage để lấy notificationId nếu có
  try {
    const pendingWarning = sessionStorage.getItem('pendingWarning');
    if (pendingWarning) {
      const warningData = JSON.parse(pendingWarning);
      window.CURRENT_NOTIFICATION_ID = warningData.notificationId;
      console.log('🟡 Lấy notificationId từ sessionStorage:', window.CURRENT_NOTIFICATION_ID);
    }
  } catch(e) {
    console.error('❌ Error parsing pending warning:', e);
  }
</script>

<!-- ⚡ Community core -->
<!-- Thêm dòng này TRƯỚC khi load các script khác -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-detail.js?v=<?= time() ?>"></script>

<!-- ⚡ Community core -->
<!-- Đảm bảo load comment functions TRƯỚC -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-notifications.js?v=2001"></script>

<!-- JS Core: Post + Feed + Popup + Notifications -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-main.js?v=2001"></script>

<!-- Load admin-menu.js ngay sau main.js -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-admin-menu.js?v=2001"></script>

<!-- Các file khác -->
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-create.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-post-edit.js?v=2001"></script>
<script src="/HeThongChamSocCaKoi/assets/js/community/community-comments.js?v=2001"></script>

<script>
// Thêm vào phần script trong post_detail.php (trước window.onload)

/**
 * Xử lý auto-scroll đến comment từ thông báo
 */
function handleCommentNotificationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const commentId = urlParams.get('comment');
    const highlightId = urlParams.get('highlight');
    
    // Kiểm tra sessionStorage để xem có notification nào không
    const pendingNotification = sessionStorage.getItem('pendingCommentNotification');
    
    if (commentId || highlightId || pendingNotification) {
        console.log('🟡 Có thông báo comment cần xử lý:', {
            commentId,
            highlightId,
            pendingNotification: pendingNotification ? JSON.parse(pendingNotification) : null
        });
        
        // Xác định comment cần scroll đến
        let targetCommentId = highlightId || commentId;
        let notificationData = null;
        
        if (pendingNotification) {
            try {
                notificationData = JSON.parse(pendingNotification);
                // Nếu có commentId từ notification, ưu tiên dùng nó
                if (notificationData.commentId && !targetCommentId) {
                    targetCommentId = notificationData.commentId;
                }
            } catch(e) {
                console.error('❌ Error parsing pending notification:', e);
            }
        }
        
        if (targetCommentId) {
            console.log('🟡 Target comment ID:', targetCommentId);
            
            // Scroll đến comment sau khi bài viết load xong
            setTimeout(() => {
                scrollToComment(targetCommentId, notificationData);
            }, 1500);
        }
        
        // Xóa notification khỏi sessionStorage sau khi xử lý
        if (pendingNotification) {
            sessionStorage.removeItem('pendingCommentNotification');
        }
    }
}

/**
 * Scroll đến comment cụ thể
 */
async function scrollToComment(commentId, notificationData = null) {
    console.log('🟡 Scrolling to comment:', commentId);
    
    // Tìm comment element
    const commentElement = document.getElementById(`comment-${commentId}`);
    
    if (commentElement) {
        console.log('✅ Found comment element, scrolling...');
        
        // 1. Mở khung comment nếu đang đóng
        const postElement = commentElement.closest('.community-post');
        if (postElement) {
            const postId = postElement.dataset.postId;
            const commentsWrapper = document.getElementById(`comments-${postId}`);
            
            if (commentsWrapper && commentsWrapper.style.display === 'none') {
                console.log('📖 Mở khung comment...');
                commentsWrapper.style.display = 'block';
                commentsWrapper.dataset.open = '1';
                
                // Tải comment nếu chưa tải
                if (commentsWrapper.dataset.loaded === '0') {
                    await loadComments(postId, commentsWrapper.dataset.mode || 'hot');
                }
            }
        }
        
        // 2. Mở reply list nếu comment nằm trong reply
        const isInReplyList = commentElement.closest('.reply-list');
        if (isInReplyList) {
            const parentComment = commentElement.closest('.reply-list').closest('.comment-item');
            if (parentComment) {
                const parentId = parentComment.id.replace('comment-', '');
                const viewRepliesBtn = parentComment.querySelector('.view-replies');
                
                if (viewRepliesBtn && viewRepliesBtn.style.display !== 'none') {
                    console.log('📖 Mở reply list...');
                    viewRepliesBtn.click();
                    
                    // Chờ reply load
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        // 3. Scroll đến comment
        setTimeout(() => {
            commentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
            
            // 4. Highlight comment
            highlightComment(commentElement, notificationData);
            
            // 5. Đánh dấu notification đã đọc (nếu có notificationData)
            if (notificationData && notificationData.notificationId) {
                markNotificationAsReadFromPostDetail(notificationData.notificationId);
            }
            
        }, 300);
        
    } else {
        console.warn('⚠️ Comment not found, trying again in 1 second:', commentId);
        
        // Thử lại sau 1 giây nếu comment chưa load
        setTimeout(() => {
            const retryElement = document.getElementById(`comment-${commentId}`);
            if (retryElement) {
                retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightComment(retryElement, notificationData);
            } else {
                console.error('❌ Comment still not found after retry');
                
                // Hiển thị thông báo cho user
                showTempNotification('⚠️ Không tìm thấy bình luận, có thể nó đã bị xóa', 'warning');
            }
        }, 1000);
    }
}

/**
 * Highlight comment khi scroll đến
 */
function highlightComment(commentElement, notificationData = null) {
    console.log('✨ Highlighting comment:', commentElement.id);
    
    // Thêm class highlight
    commentElement.classList.add('comment-highlighted-from-notification');
    
    // Thêm badge "ĐANG XEM" nếu là từ notification
    if (notificationData) {
        const existingBadge = commentElement.querySelector('.notification-badge');
        if (!existingBadge) {
            const badge = document.createElement('div');
            badge.className = 'notification-badge';
            badge.innerHTML = `
                <span class="material-icons" style="font-size: 14px; margin-right: 4px;">notifications</span>
                <span>ĐANG XEM</span>
            `;
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: 10px;
                background: linear-gradient(135deg, #2196f3, #1976d2);
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 10px;
                z-index: 100;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                display: flex;
                align-items: center;
                white-space: nowrap;
            `;
            
            commentElement.style.position = 'relative';
            commentElement.appendChild(badge);
        }
    }
    
    // Xóa highlight sau 5 giây
    setTimeout(() => {
        commentElement.classList.remove('comment-highlighted-from-notification');
        const badge = commentElement.querySelector('.notification-badge');
        if (badge) badge.remove();
    }, 5000);
}

/**
 * Đánh dấu notification đã đọc từ post detail
 */
async function markNotificationAsReadFromPostDetail(notificationId) {
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/notifications/mark_read.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `notification_id=${notificationId}`
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Đã đánh dấu notification đã đọc từ post detail:', notificationId);
            
            // Gửi event để cập nhật UI nếu đang mở dropdown notification
            const event = new CustomEvent('notificationRead', {
                detail: { notificationId: notificationId }
            });
            window.dispatchEvent(event);
        }
    } catch (error) {
        console.error('❌ Lỗi đánh dấu notification:', error);
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.handleCommentNotificationFromURL = handleCommentNotificationFromURL;
    window.scrollToComment = scrollToComment;
    window.markNotificationAsReadFromPostDetail = markNotificationAsReadFromPostDetail;
}
// Hàm xử lý banner cảnh cáo
function closeWarningBanner() {
    const banner = document.getElementById('post-warning-banner');
    if (banner) {
        banner.style.display = 'none';
        // Lưu vào localStorage để không hiển thị lại
        localStorage.setItem('warning_<?php echo isset($warningInfo['WarningID']) ? $warningInfo['WarningID'] : 0; ?>_hidden', 'true');
    }
}

// Xác nhận đã đọc cảnh cáo - CẬP NHẬT CẢ NOTIFICATION
async function acknowledgeWarning(warningId, postId = null) {
    const banner = document.getElementById('post-warning-banner');
    if (!banner) return;
    
    const actionsDiv = banner.querySelector('.warning-actions');
    const header = banner.querySelector('.warning-header h3');
    
    if (!actionsDiv || !header) return;
    
    const originalActions = actionsDiv.innerHTML;
    
    // Hiển thị loading
    actionsDiv.innerHTML = `
        <div class="acknowledge-loading">
            <div class="loading-spinner-small"></div>
            <span>Đang xử lý...</span>
        </div>
    `;
    
    try {
        // 1. Đánh dấu cảnh cáo đã xác nhận
        const acknowledgeResponse = await fetch('/HeThongChamSocCaKoi/backend/api/community/admin/acknowledge_warning.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'warning_id=' + warningId
        });
        
        const acknowledgeData = await acknowledgeResponse.json();
        
        if (!acknowledgeData.success) {
            throw new Error(acknowledgeData.error || 'Không thể xác nhận cảnh cáo');
        }
        
        // 2. Đánh dấu notification đã đọc
        const notificationId = window.CURRENT_NOTIFICATION_ID;
        console.log('🟡 Đánh dấu notification với ID:', notificationId);
        
        let notificationSuccess = true;
        
        if (notificationId) {
            try {
                const notificationResponse = await fetch('/HeThongChamSocCaKoi/backend/api/community/notifications/mark_read.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'notification_id=' + notificationId
                });
                
                const notificationData = await notificationResponse.json();
                notificationSuccess = notificationData.success;
                
                if (notificationSuccess) {
                    console.log('✅ Đã đánh dấu notification đã đọc');
                } else {
                    console.warn('⚠️ Không thể đánh dấu notification:', notificationData.error);
                }
            } catch (notificationError) {
                console.error('❌ Lỗi đánh dấu notification:', notificationError);
                notificationSuccess = false;
            }
        }
        
        // 3. Thêm warningId vào acknowledgedWarnings
        if (window.acknowledgedWarnings) {
            window.acknowledgedWarnings.add(warningId);
            // Lưu vào localStorage
            localStorage.setItem('acknowledgedWarnings', JSON.stringify(Array.from(window.acknowledgedWarnings)));
            console.log('✅ Đã thêm warning vào acknowledgedWarnings:', warningId);
        }
        
        // 4. Cập nhật UI thành công
        header.innerHTML = '<span class="material-icons" style="color: #4caf50; margin-right: 8px;">check_circle</span> Đã xác nhận cảnh cáo';
        header.style.color = '#388e3c';
        
        const detailsDiv = banner.querySelector('.warning-details');
        if (detailsDiv) {
            const statusField = document.createElement('div');
            statusField.className = 'warning-field';
            statusField.innerHTML = `
                <strong>Trạng thái:</strong>
                <span style="color: #4caf50; font-weight: bold;">
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">check</span>
                    Đã xác nhận lúc ${new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                </span>
            `;
            detailsDiv.appendChild(statusField);
        }
        
        // Thêm class acknowledged cho banner
        banner.classList.add('acknowledged');
        
        // Hiển thị thông báo thành công
        actionsDiv.innerHTML = `
            <div class="acknowledge-success">
                <span class="material-icons" style="color: #4caf50; font-size: 20px;">done_all</span>
                <span style="color: #388e3c; font-weight: 500;">Đã xác nhận thành công!</span>
                <button class="btn btn-outline" onclick="closeWarningBanner()" style="margin-left: auto;">
                    <span class="material-icons">close</span>
                    Đóng
                </button>
            </div>
        `;
        
        // 🆕 Gửi message để cập nhật notification trong dropdown
        if (notificationSuccess && notificationId) {
            // Tạo một event để thông báo cho notifications module
            const event = new CustomEvent('warningAcknowledged', {
                detail: {
                    warningId: warningId,
                    notificationId: notificationId,
                    postId: postId || window.CURRENT_POST_ID
                }
            });
            window.dispatchEvent(event);
        }
        
        // Xóa dữ liệu từ sessionStorage
        sessionStorage.removeItem('pendingWarning');
        
        // Thông báo cho user
        setTimeout(() => {
            showTempNotification('✅ Đã xác nhận cảnh cáo. Thông báo đã được xóa khỏi danh sách.', 'success');
        }, 300);
        
    } catch (error) {
        console.error('❌ Error:', error);
        // THẤT BẠI - khôi phục lại nút ban đầu
        actionsDiv.innerHTML = `
            <div class="acknowledge-error">
                <span class="material-icons" style="color: #d32f2f; font-size: 20px;">error</span>
                <span style="color: #d32f2f;">${error.message || 'Không thể xác nhận'}</span>
                <button class="btn btn-primary" onclick="acknowledgeWarning(${warningId}, ${postId || 'null'})" style="margin-left: auto;">
                    <span class="material-icons">refresh</span>
                    Thử lại
                </button>
            </div>
        `;
    }
}

/**
 * Hiển thị thông báo tạm thời
 */
function showTempNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `temp-notification ${type}`;
    notification.innerHTML = `
        <div style="position:fixed; top:20px; right:20px; background:white; padding:12px 20px; 
                   border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:99999;
                   border-left:4px solid ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'}">
            <span style="font-weight:600;">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

/**
 * Hàm mở bài viết từ thông báo cảnh cáo (cho notifications module)
 */
function openPostWithWarning(postId, warningId = null, notificationId = null) {
    console.log('🟡 Opening post from warning notification:', {postId, warningId, notificationId});
    
    // Lưu thông tin vào sessionStorage để trang post_detail.php biết
    if (notificationId) {
        sessionStorage.setItem('pendingWarning', JSON.stringify({
            warningId: warningId,
            notificationId: notificationId,
            timestamp: Date.now()
        }));
    }
    
    // Tạo URL với tham số warning
    let url = `/HeThongChamSocCaKoi/frontend/community/post_detail.php?id=${postId}`;
    
    if (warningId) {
        url += `&warning=${warningId}`;
    } else {
        url += `&show_warning=1`;
    }
    
    console.log('🟡 Navigating to:', url);
    
    // Mở trang bài viết
    window.location.href = url;
}

// Export hàm ra global
if (typeof window !== 'undefined') {
    window.openPostWithWarning = openPostWithWarning;
    window.closeWarningBanner = closeWarningBanner;
    window.acknowledgeWarning = acknowledgeWarning;
    window.showTempNotification = showTempNotification;
}

// Kiểm tra nếu đã đóng banner trước đó
window.onload = function() {
    const warningId = <?php echo isset($warningInfo['WarningID']) ? $warningInfo['WarningID'] : 0; ?>;
    if (warningId > 0) {
        const isHidden = localStorage.getItem('warning_' + warningId + '_hidden');
        
        if (isHidden === 'true') {
            const banner = document.getElementById('post-warning-banner');
            if (banner) {
                banner.style.display = 'none';
            }
        }
    }
     handleCommentNotificationFromURL();
    // Kiểm tra xem có đang ở trang post detail không
    const postDetailSection = document.getElementById('post-detail');
    
    if (postDetailSection && typeof loadPostDetail === 'function') {
        console.log('🟢 Khởi động trang post detail...');
        loadPostDetail();
        
        // Thêm callback để khởi tạo features sau khi load xong
        setTimeout(() => {
            if (typeof onPostDetailLoaded === 'function') {
                onPostDetailLoaded();
            }
            
            // Gọi lại handleCommentNotificationFromURL sau khi post load xong
            setTimeout(handleCommentNotificationFromURL, 800);
        }, 500);
    }
    
    // Kiểm tra và xóa pendingWarning nếu user không xác nhận
    setTimeout(() => {
        const pendingWarning = sessionStorage.getItem('pendingWarning');
        if (pendingWarning) {
            console.log('🟡 User chưa xác nhận cảnh cáo, thông báo vẫn còn trong dropdown');
            
            // Nếu user đóng banner mà không xác nhận, xóa notificationId khỏi sessionStorage
            // để lần sau vẫn có thể xác nhận được
            const bannerCloseBtn = document.querySelector('.warning-close');
            if (bannerCloseBtn) {
                bannerCloseBtn.addEventListener('click', function() {
                    console.log('🟡 User đóng banner mà không xác nhận, thông báo vẫn còn');
                });
            }
        }
    }, 1000);
}
</script>

<?php include '../../includes/footer.php'; ?>