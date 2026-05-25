// community-post-detail.js
// ================== POST DETAIL SPECIFIC FUNCTIONS ==================

function togglePostMenuDetail(postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const menu = document.getElementById(`post-menu-${postId}`);
    if (!menu) return;
    
    // Đóng tất cả menu khác
    document.querySelectorAll('.post-menu-dropdown').forEach(m => {
        if (m !== menu) {
            m.style.display = 'none';
            m.classList.remove('show');
        }
    });
    
    // Toggle menu hiện tại
    const isVisible = menu.style.display === 'block' || 
                     menu.classList.contains('show');
    
    if (isVisible) {
        menu.style.display = 'none';
        menu.classList.remove('show');
    } else {
        menu.style.display = 'block';
        menu.classList.add('show');
        
        // Đặt vị trí
        const btn = event.target.closest('.post-menu-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            menu.style.position = 'absolute';
            menu.style.top = (rect.bottom + 5) + 'px';
            menu.style.right = (window.innerWidth - rect.right - 10) + 'px';
            menu.style.zIndex = '1000';
        }
    }
}
// Thêm CSS cho edit modal (nếu chưa có)
function addEditModalStyles() {
    if (document.getElementById('edit-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'edit-modal-styles';
    style.textContent = `
        /* Edit modal styles */
        .edit-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .edit-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .edit-composer {
            position: relative;
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .edit-header {
            padding: 16px;
            border-bottom: 1px solid #e4e6eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .edit-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .edit-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #65676b;
        }
        
        .edit-user-info {
            display: flex;
            align-items: center;
            padding: 16px;
            gap: 12px;
        }
        
        .edit-user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            border: 1px solid #e4e6eb;
        }
        
        .edit-user-details {
            flex: 1;
        }
        
        .edit-username {
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 4px;
        }
        
        .edit-privacy-select {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #f0f2f5;
            padding: 6px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            width: fit-content;
        }
        
        .edit-privacy-select:hover {
            background: #e4e6eb;
        }
        
        .edit-content-area {
            padding: 0 16px;
        }
        
        .edit-textarea {
            width: 100%;
            border: none;
            outline: none;
            font-size: 15px;
            resize: none;
            min-height: 80px;
            font-family: inherit;
        }
        
        .edit-textarea::placeholder {
            color: #65676b;
        }
        
        .edit-media-preview {
            padding: 16px;
            display: grid;
            gap: 8px;
        }
        
        .edit-footer-actions {
            padding: 16px;
            border-top: 1px solid #e4e6eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .edit-add-media-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: none;
            cursor: pointer;
            color: #65676b;
            padding: 8px 12px;
            border-radius: 8px;
            transition: background 0.2s;
        }
        
        .edit-add-media-btn:hover {
            background: #f0f2f5;
        }
        
        .edit-cancel-btn,
        .edit-save-btn {
            padding: 8px 20px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
        }
        
        .edit-cancel-btn {
            background: #f0f2f5;
            color: #050505;
            margin-right: 8px;
        }
        
        .edit-save-btn {
            background: #1877f2;
            color: white;
        }
        
        .edit-save-btn:hover {
            background: #166fe5;
        }
        
        .edit-save-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    `;
    
    document.head.appendChild(style);
}

// Gọi hàm thêm styles khi load
document.addEventListener('DOMContentLoaded', function() {
    addEditModalStyles();
});
/**
 * Chỉnh sửa bài viết trong post detail
 */
async function editPostDetail(postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Đóng menu
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('show');
    }
    
    // Gọi hàm editPost từ community-post-edit.js với tham số đầy đủ
    if (typeof editPost === 'function') {
        editPost(postId, true); // Thêm tham số true để chỉ rõ đây là trang detail
    } else {
        console.error('Hàm editPost chưa được load!');
        alert('Tính năng chỉnh sửa chưa sẵn sàng. Vui lòng tải lại trang.');
    }
}

/**
 * Đổi privacy trong post detail
 */
async function changePrivacyDetail(postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Đóng menu
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('show');
    }
    
    // Gọi hàm changePrivacy từ community-post-edit.js
    if (typeof changePrivacy === 'function') {
        changePrivacy(postId);
    } else {
        console.error('Hàm changePrivacy chưa được load!');
        alert('Tính năng đổi privacy chưa sẵn sàng.');
    }
}
/**
 * Xóa bài viết trong post detail
 */
async function deletePostDetail(postId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!confirm('Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    // Đóng menu
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('show');
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('post_id', postId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Thông báo thành công
            showPostNotification('✅ Đã xóa bài viết thành công');
            
            // Quay lại trang trước hoặc trang chủ sau 1.5 giây
            setTimeout(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = `${BASE_URL}/frontend/community/community.php`;
                }
            }, 1500);
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể xóa bài viết'));
        }
    } catch (err) {
        console.error('❌ Lỗi xóa bài viết:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Hiển thị thông báo cho post actions
 */
function showPostNotification(message, type = 'success') {
    // Xóa thông báo cũ nếu có
    const oldNotification = document.getElementById('post-notification');
    if (oldNotification) oldNotification.remove();
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.id = 'post-notification';
    notification.className = `post-notification ${type}`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    notification.innerHTML = `
        <span class="material-icons post-notification-icon">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

/**
 * Thêm event listener để đóng menu khi click ra ngoài
 */
function setupPostMenuClickHandlers() {
    document.addEventListener('click', function(e) {
        // Nếu click không phải vào menu hoặc nút menu thì đóng tất cả menu
        if (!e.target.closest('.post-menu') && 
            !e.target.closest('.post-menu-dropdown')) {
            document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
                menu.style.display = 'none';
                menu.classList.remove('show');
            });
        }
    });
}

/**
 * Thêm CSS cho post menu trong post detail
 */
function addPostMenuStyles() {
    if (document.getElementById('post-menu-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'post-menu-styles';
    style.textContent = `
        /* Post menu trong post detail */
        .post-menu {
            position: relative;
            margin-left: auto;
        }
        
        .post-menu-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 8px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .post-menu-btn:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        .post-menu-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            min-width: 200px;
            z-index: 1000;
            display: none;
            animation: fadeIn 0.2s ease;
        }
        
        .post-menu-dropdown.show {
            display: block;
        }
        
        .post-menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 12px 16px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            color: #333;
            transition: background 0.2s ease;
        }
        
        .post-menu-item:hover {
            background: #f5f5f5;
        }
        
        .post-menu-item.edit {
            color: #1976d2;
        }
        
        .post-menu-item.edit:hover {
            background: #e3f2fd;
        }
        
        .post-menu-item.privacy {
            color: #ff9800;
        }
        
        .post-menu-item.privacy:hover {
            background: #fff3e0;
        }
        
        .post-menu-item.delete {
            color: #d32f2f;
        }
        
        .post-menu-item.delete:hover {
            background: #ffebee;
        }
        
        .post-menu-item .material-icons {
            font-size: 20px;
        }
        
        /* Post notification */
        .post-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        }
        
        .post-notification.error {
            background: #f44336;
        }
        
        .post-notification.warning {
            background: #ff9800;
        }
        
        .post-notification.info {
            background: #2196f3;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Follow button styles */
        .follow-btn {
            background: #1877f2;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .follow-btn:hover {
            background: #166fe5;
        }
        
        .follow-btn.following {
            background: #e4e6eb;
            color: #050505;
        }
        
        .follow-btn.following:hover {
            background: #d8dadf;
        }
        
        /* Post stats styles */
        .post-stats {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 10px 0;
            border-bottom: 1px solid #e4e6eb;
            font-size: 14px;
            color: #65676b;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .reaction-display {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .reaction-icon {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .reaction-count {
            cursor: pointer;
            font-weight: 500;
        }
        
        .reaction-count:hover {
            text-decoration: underline;
        }
        
        .comment-count {
            cursor: pointer;
            font-weight: 500;
        }
        
        .comment-count:hover {
            text-decoration: underline;
        }
        
        .report-count {
            cursor: pointer;
            font-weight: 500;
        }
        
        .report-count:hover {
            text-decoration: underline;
        }
        
        /* Post actions */
        .post-actions {
            display: flex;
            border-top: 1px solid #e4e6eb;
            border-bottom: 1px solid #e4e6eb;
            padding: 4px 0;
        }
        
        .post-action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px;
            background: none;
            border: none;
            cursor: pointer;
            color: #65676b;
            font-size: 14px;
            font-weight: 600;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .post-action-btn:hover {
            background: #f0f2f5;
        }
        
        .post-action-btn.active {
            color: #1877f2;
        }
        
        .post-action-btn .material-icons {
            font-size: 18px;
        }
        
        .admin-manage-btn {
            color: #d32f2f;
        }
        
        .admin-manage-btn:hover {
            background: #ffebee;
        }
        
        .report-post-btn {
            color: #ff9800;
        }
        
        .report-post-btn:hover {
            background: #fff3e0;
        }
        
        /* Admin section trong menu */
        .admin-section {
            border-top: 1px solid #e4e6eb;
            padding-top: 8px;
            margin-top: 8px;
        }
        
        .admin-section-title {
            font-size: 12px;
            color: #65676b;
            font-weight: 600;
            text-transform: uppercase;
            padding: 8px 16px 4px;
        }
        
        .admin-action-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 12px 16px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            transition: background 0.2s ease;
        }
        
        .admin-action-btn:hover {
            background: #f5f5f5;
        }
        
        .admin-action-btn.delete {
            color: #d32f2f;
        }
        
        .admin-action-btn.delete:hover {
            background: #ffebee;
        }
        
        .admin-action-btn.hide {
            color: #ff9800;
        }
        
        .admin-action-btn.hide:hover {
            background: #fff3e0;
        }
        
        .admin-action-btn.warn {
            color: #ff9800;
        }
        
        .admin-action-btn.warn:hover {
            background: #fff3e0;
        }
        
        .admin-action-btn.ban {
            color: #d32f2f;
        }
        
        .admin-action-btn.ban:hover {
            background: #ffebee;
        }
        
        /* Animation */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ===========================================
// POST DETAIL SPECIFIC INITIALIZATION
// ===========================================

/**
 * Khởi tạo các sự kiện cho post detail
 */
function initPostDetail() {
    console.log('🟢 Khởi tạo post detail...');
    
    // Thêm CSS styles
    addPostMenuStyles();
    
    // Setup click handlers
    setupPostMenuClickHandlers();
    
    // Kiểm tra nếu là admin để thêm admin features
    if (window.CURRENT_USER_ROLE === 'Admin') {
        console.log('🛡️ Admin features enabled for post detail');
        initAdminFeaturesForDetail();
    }
}

/**
 * Khởi tạo admin features cho post detail
 */
function initAdminFeaturesForDetail() {
    // Thêm nút admin toggle
    addAdminToggleButtonForDetail();
    
    // Thêm admin badge vào tên admin
    addAdminBadgesForDetail();
}

/**
 * Thêm nút toggle admin view cho post detail
 */
function addAdminToggleButtonForDetail() {
    // Kiểm tra nếu đã có nút
    if (document.querySelector('.admin-view-toggle-detail')) return;
    
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'admin-view-toggle admin-view-toggle-detail';

    // Thêm vào trang
    const headerBar = document.querySelector('.community-header-bar');
    if (headerBar) {
        headerBar.appendChild(toggleBtn);
    }
}
function addUserPostEditStyles() {
    if (document.getElementById('user-post-edit-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'user-post-edit-styles';
    style.textContent = `
        /* ===== COMMENT FORM FACEBOOK STYLE ===== */
        .reaction-display {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 0px !important;
            position: relative !important;
            min-height: 20px !important;
        }
        
        .reaction-icon {
            width: 30px !important;
            height: 16px !important;
            object-fit: contain !important;
            cursor: pointer !important;
            z-index: 1 !important;
            position: relative !important;
        }
        
        /* Stack icons slightly overlapping */
        .reaction-icon:not(:first-child) {
            margin-left: -10px !important;
        }
        
        .reaction-icon img {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
        }
        
        .reaction-count {
            font-weight: 600 !important;
            font-size: 14px !important;
            margin-left: -10px !important;
            cursor: pointer !important;
            position: relative !important;
            z-index: 2 !important;
            padding: 0 4px !important;
            border-radius: 2px !important;
            top:5px;
        }
        
        .reaction-count:hover {
            text-decoration: underline !important;
        }
        .post-stats {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 12px 0 !important;
            font-size: 14px !important;
            flex-wrap: wrap !important;
        }
        
        .stat-item {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
        }
        
        /* Đảm bảo có đủ không gian cho reaction display */
        .reaction-display-container {
            display: flex !important;
            align-items: center !important;
            padding: 2px 8px !important;
            border-radius: 12px !important;
            min-width: fit-content !important;
        }
        
        /* Thêm style cho reaction icons không bị đè */
        .reaction-icon-wrapper {
            display: inline-flex !important;
            align-items: center !important;
            gap: 1px !important;
        }
        
        .reaction-icon-wrapper .reaction-icon {
            margin-right: -2px !important;
        }
        
        .reaction-icon-wrapper .reaction-icon:last-child {
            margin-right: 4px !important;
        }
        .comment-form {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-top: 6px;
            align-items: center;
            width: 100%;
        }
        
        .comment-form input[name="comment"] {
            flex: 1;
            box-sizing: border-box;
            border-radius: 999px;
            border: 1px solid #ddd;
            padding: 8px 45px 8px 14px;
            font-size: 14px;
            min-height: 36px;
            background: #f0f2f5;
            border: none;
        }
        
        .comment-form input[name="comment"]:focus {
            height: 36px !important;
            line-height: 20px !important;
            padding: 8px 45px 8px 12px !important;
            box-sizing: border-box !important;
            outline: none;
            border-color: #1976d2;
            box-shadow: 0 0 0 1px rgba(25,118,210,0.1);
            background: white;
        }
        
        /* Nút mũi tên nằm bên phải input */
        .comment-send-btn {
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: #bcc0c4;
            cursor: default;
            pointer-events: none;
            z-index: 10;
            margin-left: 10px !important;
        }
        .comment-form {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-top: 6px;
            align-items: center;
            gap: 8px; /* 🟢 THÊM DÒNG NÀY - tạo khoảng cách giữa các phần tử */
            }

        .comment-add-image-btn {
            margin-right: 28px !important; /* 🟢 THÊM DÒNG NÀY */
            }
        .comment-send-btn .material-icons {
            font-size: 20px !important;
            line-height: 1 !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Có chữ => active: nền xanh, icon trắng, bấm được */
        .comment-send-btn.active {
            background: #1877f2;
            color: #fff;
            cursor: pointer;
            pointer-events: auto;
        }
        
        /* Hover effect */
        .comment-send-btn.active:hover {
            background: #166fe5;
            transform: translateY(-50%) scale(1.05);
        }
        
        /* ===== REPLY FORM FACEBOOK STYLE ===== */
        .reply-box {
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-left: 45px;
            margin-top: 6px;
            display: none;
            position: relative;
            width: calc(100% - 45px);
        }
        
        .reply-input-wrapper {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            background: #f0f2f5 !important;
            border-radius: 20px !important;
            border: 1px solid transparent !important;
            min-height: 36px !important;
            max-height: 120px !important;
            padding-right: 0px !important;
            transition: all 0.2s !important;
        }
        
        .reply-input {
            flex: 1 !important;
            min-height: 36px !important;
            max-height: 120px !important;
            padding: 8px 12px !important;
            background: transparent !important;
            border: none !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            outline: none !important;
            overflow-y: auto !important;
            resize: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
        }
        
        .reply-input:focus {
            background: white !important;
            border-color: #1877f2 !important;
            box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1) !important;
        }
        
        /* Container cho nút thêm ảnh và gửi */
        .reply-buttons-container {
            position: absolute !important;
            right: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            z-index: 10 !important;
            height: 28px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Nút thêm ảnh */
        .reply-add-image-btn {
            width: 28px !important;
            height: 28px !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            border: none !important;
            color: #65676b !important;
            cursor: pointer !important;
            border-radius: 50% !important;
            transition: all 0.2s !important;
        }
        
        .reply-add-image-btn:hover {
            background: rgba(0,0,0,0.05) !important;
            color: #1877f2 !important;
        }
        
        /* Nút gửi */
        .reply-send-btn {
           position: absolute !important;
            right: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            cursor: default;
            pointer-events: none;
            z-index: 10;
            transition: all 0.2s ease;
        }
        
        .reply-send-btn.active {
            background: #1877f2 !important;
            color: white !important;
            cursor: pointer !important;
            pointer-events: auto !important;
        }
        
        .reply-send-btn.active:hover {
            background: #166fe5 !important;
            transform: scale(1.05) !important;
        }
        
        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
            .comment-form input[name="comment"] {
                padding: 8px 42px 8px 12px;
            }
            
            .reply-input {
                padding: 8px 42px 8px 10px !important;
            }
            
            .comment-send-btn,
            .reply-send-btn {
                right: 6px;
                width: 26px;
                height: 26px;
            }
            
            .reply-add-image-btn {
                width: 26px !important;
                height: 26px !important;
                right: 35px !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}
document.addEventListener('DOMContentLoaded', function() {
    addUserPostEditStyles();
    
    // 🟢 Đảm bảo comment system được kích hoạt
    initializeCommentSystem();
});
/**
 * Chuyển đổi chế độ xem admin trong post detail
 */
function toggleAdminViewDetail() {
    const post = document.querySelector('#post-detail .community-post');
    if (post) {
        post.classList.toggle('admin-view');
        
        // Hiển thị thông tin báo cáo nếu có
        if (post.classList.contains('admin-view')) {
            const postId = post.dataset.postId;
            if (postId) {
                showPostReportInfo(post);
            }
        }
    }
    
    showPostNotification(
        document.querySelector('#post-detail .community-post')?.classList.contains('admin-view') ? 
        'Đã bật chế độ xem Admin' : 
        'Đã tắt chế độ xem Admin',
        'info'
    );
}

/**
 * Thêm admin badge vào tên admin trong post detail
 */
function addAdminBadgesForDetail() {
    document.querySelectorAll('#post-detail .author-name').forEach(nameEl => {
        const username = nameEl.textContent.trim();
        if (username === window.CURRENT_USERNAME) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'Admin';
            badge.style.cssText = `
                margin-left: 8px;
                color: #d32f2f;
                font-size: 11px;
                font-weight: bold;
                background: #ffebee;
                padding: 2px 8px;
                border-radius: 12px;
            `;
            nameEl.appendChild(badge);
        }
    });
}

// ===========================================
// UPDATE RENDERPOSTCARD FOR POST DETAIL
// ===========================================

/**
 * Ghi đè hàm renderPostCard để đảm bảo có menu trong post detail
 */
const originalRenderPostCard = window.renderPostCard;
window.renderPostCard = function(post) {
    // Gọi hàm render gốc
    let html = originalRenderPostCard(post);
    
    console.log('🟡 Rendering post for detail:', post.PostID);
    
    // Trong post detail, chúng ta cần đảm bảo có đầy đủ menu
    // Hàm renderPostCard gốc đã có menu, nhưng cần đảm bảo nó sử dụng đúng hàm cho detail
    
    return html;
};
/**
 * Hàm được gọi sau khi load post detail xong
 */
function onPostDetailLoaded() {
    console.log('✅ Post detail loaded, initializing features...');
    
    // Khởi tạo post detail
    initPostDetail();
    
    // Gắn sự kiện follow
    attachFollowEventHandlers();
    
    // Setup menu handlers
    setupPostMenuClickHandlers();
    
    // Kiểm tra nếu có warning
    if (window.CURRENT_WARNING_ID > 0) {
        syncNotificationStatus(window.CURRENT_WARNING_ID);
    }
    
    // 🟢 THÊM: Gọi hàm thêm styles cho edit modal và notification
    addPostNotificationStyles();
    addEditModalStyles(); // Đảm bảo có hàm này
}
// ===========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ===========================================

if (typeof window !== 'undefined') {
    // Post menu functions for detail
    window.togglePostMenuDetail = togglePostMenuDetail;
    window.editPostDetail = editPostDetail;
    window.changePrivacyDetail = changePrivacyDetail;
    window.deletePostDetail = deletePostDetail;
    
    // Post detail initialization
    window.initPostDetail = initPostDetail;
    window.onPostDetailLoaded = onPostDetailLoaded;
    
    console.log('✅ Post detail menu functions exported to global scope');
}
async function loadPostDetail() {
    const params = new URLSearchParams(window.location.search);
    const POST_ID = params.get("id");
    
    const wrap = document.getElementById("post-detail");
    if (!POST_ID) {
        wrap.innerHTML = "<p>Không tìm thấy bài viết.</p>";
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/get_detail.php?post_id=${POST_ID}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Lỗi tải bài viết.");
        if (typeof renderPostCard !== "function") {
            throw new Error("Hàm renderPostCard chưa được load.");
        }

        // 🟢 Render bài viết
        wrap.innerHTML = renderPostCard(data.post);

        // 🟢 Gắn sự kiện follow
        attachFollowEventHandlers();

    } catch (err) {
        wrap.innerHTML = `<p class='feed-error'>Lỗi: ${err.message}</p>`;
    }
}

/**
 * Gắn sự kiện cho nút Theo dõi
 */
function attachFollowEventHandlers() {
    document.querySelectorAll("[data-user-follow]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute("data-user-follow");
            btn.disabled = true;
            btn.textContent = "Đang xử lý...";
            try {
                await toggleFollow(targetId);
            } finally {
                btn.disabled = false;
            }
        });
    });
}

// ===========================================
// RENDER COMMENT ITEM (ĐẦY ĐỦ)
// ===========================================

/**
 * Render một comment item (một bình luận) - Full version
 */
// community-post-detail.js
// ================== POST DETAIL SPECIFIC FUNCTIONS ==================

// ... (phần code hiện có)

/**
 * Render layout media cho post detail (giống như trang chủ)
 */
function renderPostMediaLayout(media, postId) {
    const count = media.length;
    if (count === 0) return "";
    
    console.log(`🎨 Rendering ${count} media for post detail ${postId}`);

    function itemHTML(m, index, isLast = false, remaining = 0) {
        const isVideo = m.MediaType === "video";
        const itemClass = `media-item media-${index} ${isLast && remaining > 0 ? 'overlay-item' : ''}`;
        const url = escapeHtml(m.FilePath);
        
        if (isVideo) {
            return `
                <div class="${itemClass}"
                     onclick="openMediaViewer('${url}', ${postId}, ${index})">
                    <video controls>
                        <source src="${url}" type="video/mp4">
                    </video>
                    ${isLast && remaining > 0 ? `<div class="more-text">+${remaining}</div>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="${itemClass}"
                 onclick="openMediaViewer('${url}', ${postId}, ${index})">
                <img src="${url}" alt="Ảnh bài viết" loading="lazy">
                ${isLast && remaining > 0 ? `<div class="more-text">+${remaining}</div>` : ''}
            </div>
        `;
    }

    // Layout theo số lượng
    if (count === 1) return `<div class="post-media-grid grid-1">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    if (count === 2) return `<div class="post-media-grid grid-2">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    if (count === 3) return `<div class="post-media-grid grid-3">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    if (count === 4) return `<div class="post-media-grid grid-4">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    if (count === 5) return `<div class="post-media-grid grid-5">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;

    // Layout 6+ ảnh - Facebook style
    if (count >= 6) {
        let html = `<div class="post-media-grid grid-many">`;
        
        const displayCount = Math.min(count, 6);
        
        for (let i = 0; i < displayCount; i++) {
            const mediaItem = media[i];
            const isLast = i === 5 && count > 6; // Chỉ là overlay nếu count > 6
            const remaining = count - 6;
            
            html += itemHTML(mediaItem, i, isLast, remaining);
        }
        
        html += `</div>`;
        return html;
    }
    
    return "";
}

/**
 * Ghi đè hàm renderPostCard để sử dụng media layout giống trang chủ
 */
window.renderPostCard = function(post) {
    // Gọi hàm render gốc để có HTML cơ bản
    let html = originalRenderPostCard(post);
    
    console.log('🟡 Rendering post for detail:', post.PostID);
    
    const media = post.media || [];
    
    // Nếu có media, thay thế phần media HTML bằng layout có click event
    if (media.length > 0) {
        // Tạo media HTML mới với click event
        const mediaHtml = renderPostMediaLayout(media, post.PostID);
        
        // Tìm phần media trong HTML và thay thế
        // Tìm vị trí của div chứa post-content và media
        const postContentMatch = html.match(/<div class="post-content">[\s\S]*?<\/div>/);
        if (postContentMatch) {
            // Tạo đoạn HTML mới thay thế
            const newHtml = html.replace(
                /(<div class="post-content">[\s\S]*?<\/div>)([\s\S]*?)(<div class="post-stats")/,
                `$1${mediaHtml}$3`
            );
            
            // Nếu có media grid cũ, xóa nó
            const finalHtml = newHtml.replace(/<div class="post-media-grid">[\s\S]*?<\/div>/, '');
            return finalHtml;
        }
    }
    
    return html;
};

/**
 * Mở media viewer khi click vào ảnh/video trong post detail
 * (sử dụng hàm từ community-main.js)
 */
function openMediaViewer(url, postId, index) {
    // Kiểm tra xem hàm đã tồn tại chưa (từ community-main.js)
    if (typeof window.openMediaViewer === 'function') {
        // Gọi hàm gốc từ community-main.js
        window._openMediaViewer(url, postId, index);
    } else {
        // Fallback: mở ảnh trong tab mới
        window.open(url, '_blank');
    }
}


async function loadPostDetail() {
    const params = new URLSearchParams(window.location.search);
    const POST_ID = params.get("id");
    
    const wrap = document.getElementById("post-detail");
    if (!POST_ID) {
        wrap.innerHTML = "<p>Không tìm thấy bài viết.</p>";
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/get_detail.php?post_id=${POST_ID}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Lỗi tải bài viết.");
        
        // Lưu post data để media viewer có thể truy cập
        if (!window._communityPosts) window._communityPosts = {};
        window._communityPosts[data.post.PostID] = data.post;
        
        if (typeof renderPostCard !== "function") {
            throw new Error("Hàm renderPostCard chưa được load.");
        }

        // 🟢 Render bài viết với media layout mới
        wrap.innerHTML = renderPostCard(data.post);

        // 🟢 Gắn sự kiện follow
        attachFollowEventHandlers();

    } catch (err) {
        wrap.innerHTML = `<p class='feed-error'>Lỗi: ${err.message}</p>`;
    }
}

// ===========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ===========================================

if (typeof window !== 'undefined') {
    // Media viewer functions
    window.openMediaViewer = openMediaViewer;
    window.renderPostMediaLayout = renderPostMediaLayout;
    window.initMediaViewerForDetail = initMediaViewerForDetail;
    
    console.log('✅ Post detail media viewer functions exported to global scope');
}

// ===========================================
// KHỞI TẠO KHI TRANG LOAD
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem có đang ở trang post detail không
    const postDetailSection = document.getElementById('post-detail');
    
    if (postDetailSection) {
        console.log('🟢 Đang ở trang post detail, khởi động chức năng...');
        
        // Load bài viết chi tiết
        loadPostDetail();
        
        // Thêm CSS cho các component mới
        addPostDetailStyles();
        
        // Thêm CSS cho media viewer
        addMediaViewerStyles();
        
        // Khởi tạo media viewer
        initMediaViewerForDetail();
    }
});
function renderCommentItem(c, postId) {
    // 🟢 DEBUG: XEM DATA TỪ SERVER
    console.log("🔍 USER DATA FROM SERVER:", c.user);
    console.log("🔍 Username:", c.user?.Username);
    console.log("🔍 FullName:", c.user?.FullName);
    
    const cu = c.user || {};
    
    // 🟢 FIX: DÙNG HÀM displayName ĐÃ SỬA
    const name = displayName(cu);
    console.log("🔍 displayName result:", name);
    
    const avatarUrl = buildAvatarURL(cu);
    const firstChar = name ? name.charAt(0).toUpperCase() : "?";
    const replyCount = c.ReplyCount || 0;
    const sum = (c.reactions && c.reactions.summary) || {};
    const total = (c.reactions && c.reactions.total) || 0;
    const ctime = c.CreatedAt ? c.CreatedAt.slice(0, 16) : "";
    
    const userId = cu.UserID || 0;
    const username = cu.Username || '';
    
    const isOwnComment = window.CURRENT_USER_ID && parseInt(userId) === parseInt(window.CURRENT_USER_ID);

    const iconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    let contentHTML = c.Content || '';
    contentHTML = contentHTML.replace(/^[\s\u00A0]+/, '');
    
    const reactIconsHtml =
        total > 0
            ? Object.entries(sum)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(
                    ([t]) => `
                        <img class="cmt-react-icon"
                            src="${iconMap[t]}"
                            onmouseenter="showCommentReactionUsersTooltip(${c.CommentID}, '${t}', event)"
                            onmouseleave="hideReactionUsersTooltip()"
                            onclick="openCommentReactionUserModal(${c.CommentID}, '${t}')">
                `
                )
                .join("")
            : "";
    
    // TẠO MENU 3 CHẤM (CHO COMMENT CỦA CHÍNH MÌNH HOẶC NGƯỜI KHÁC)
    let commentMenuHtml = '';
    
    if (isOwnComment) {
        commentMenuHtml = `
            <div class="comment-menu">
                <button class="comment-menu-btn" onclick="toggleCommentMenu(${c.CommentID}, event)">
                    <span class="material-icons" style="font-size:18px;">more_horiz</span>
                </button>
                <div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">
                    <button class="comment-menu-item" 
                            onclick="editComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">edit</span>
                        Chỉnh sửa
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item delete" 
                            onclick="deleteComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">delete</span>
                        Xóa
                    </button>
                </div>
            </div>
        `;
    } else {
        commentMenuHtml = `
            <div class="comment-menu">
                <button class="comment-menu-btn" onclick="toggleCommentMenu(${c.CommentID}, event)">
                    <span class="material-icons" style="font-size:18px;">more_horiz</span>
                </button>
                <div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">
                    <button class="comment-menu-item" onclick="hideComment(${c.CommentID})">
                        <span class="material-icons" style="font-size:18px;">visibility_off</span>
                        Ẩn bình luận
                    </button>
                    <button class="comment-menu-item" onclick="reportComment(${c.CommentID})">
                        <span class="material-icons" style="font-size:18px;">report</span>
                        Báo cáo bình luận
                    </button>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="comment-item" 
             id="comment-${c.CommentID}" 
             data-user-id="${userId}" 
             data-username="${username}"
             data-display-name="${escapeHtml(name)}"> <!-- 🟢 LƯU TÊN HIỂN THỊ -->
            
            <div class="comment-avatar" onclick="openUserProfile('${username}')">
                ${avatarUrl
                    ? `
                    <img class="comment-avatar-img"
                        src="${avatarUrl}"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                    : ""
                }
                <div class="avatar-circle" style="${avatarUrl ? "display:none;" : ""}">
                    ${firstChar}
                </div>
            </div>

            <div class="comment-body">
                <div class="comment-bubble">
                    <div class="comment-name" onclick="openUserProfile('${username}')">
                        ${escapeHtml(name)} <!-- 🟢 HIỂN THỊ TÊN ĐÚNG -->
                    </div>
                    <div class="comment-text">${contentHTML}</div>
                </div>
                
                ${commentMenuHtml}

                <div class="comment-footer">
                    <div class="comment-meta">
                        <span class="comment-time">${escapeHtml(ctime)}</span>

                        <div class="cmt-like-wrap">
                            <span class="cmt-action cmt-action-like ${c.reactions && c.reactions.user ? "active" : ""}"
                                style="${c.reactions && c.reactions.user ? `color:${reactColorMap[c.reactions.user]}` : ""}"
                                onmouseenter="openCommentReactionPicker(${c.CommentID}, event)"
                                onclick="toggleCommentReaction(${c.CommentID}, 'like')">
                                ${c.reactions && c.reactions.user ? reactTextMap[c.reactions.user] : "Thích"}
                            </span>

                            <div class="cmt-react-picker" id="cmt-react-picker-${c.CommentID}"
                                onmouseleave="closeCommentReactionPicker(${c.CommentID})">
                                ${["like", "love", "care", "haha", "wow", "sad", "angry"]
                                    .map(
                                        (t) => `
                                    <button class="cmt-react-emoji"
                                            onclick="event.stopPropagation(); chooseCommentReaction(${c.CommentID}, '${t}')">
                                        <img src="${BASE_URL}/assets/images/${t}.png">
                                    </button>
                                `
                                    )
                                    .join("")}
                            </div>
                        </div>

                        <span class="cmt-action" onclick="if (window.showReplyBox) window.showReplyBox(${c.CommentID}, ${postId})">
                            Trả lời
                        </span>
                    </div>

                    <div class="comment-react-right" id="cmt-react-${c.CommentID}">
                        ${reactIconsHtml}
                        ${total > 0 ? `<span class="react-total">${total}</span>` : ""}
                    </div>
                </div>

                ${replyCount > 0 ? `
                    <div class="view-replies" onclick="if (window.loadReplies) window.loadReplies(${c.CommentID})">
                        Xem ${replyCount} phản hồi
                    </div>` : ""}

                <div class="reply-list" id="reply-list-${c.CommentID}"></div>

                <div class="reply-box" id="reply-box-${c.CommentID}" style="display:none;">
                    <div class="reply-input"
                        id="reply-input-${c.CommentID}"
                        contenteditable="true"></div>
                    <button class="reply-send-btn"
                            type="button"
                            onclick="submitReply(${postId}, ${c.CommentID})">
                        <span class="material-icons">send</span>
                    </button>
                </div>
            </div>
        </div>`;
}

// ===========================================
// COMMENT MENU FUNCTIONS
// ===========================================

/**
 * Toggle menu comment
 */
function toggleCommentMenu(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (!menu) return;
    
    // Đóng tất cả các menu khác
    document.querySelectorAll('.comment-menu-dropdown').forEach(m => {
        if (m !== menu) {
            m.classList.remove('show');
        }
    });
    
    // Toggle menu hiện tại
    menu.classList.toggle('show');
    
    // Đóng menu khi click ra ngoài
    if (menu.classList.contains('show')) {
        const closeMenuHandler = function(e) {
            if (!menu.contains(e.target) && !e.target.closest('.comment-menu-btn')) {
                menu.classList.remove('show');
                document.removeEventListener('click', closeMenuHandler);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 10);
    }
}

/**
 * Chỉnh sửa comment
 */
async function editComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const comment = document.getElementById(`comment-${commentId}`);
    if (!comment) return;
    
    const textElement = comment.querySelector('.comment-text');
    const originalContent = textElement.innerHTML.trim();
    
    // Tạo form chỉnh sửa
    const editForm = document.createElement('div');
    editForm.className = 'comment-edit-form';
    editForm.innerHTML = `
        <textarea class="comment-edit-input">${originalContent}</textarea>
        <div class="comment-edit-actions">
            <button class="btn btn-secondary" onclick="cancelEditComment(${commentId})">Hủy</button>
            <button class="btn btn-primary" onclick="saveEditComment(${commentId})">Lưu</button>
        </div>
    `;
    
    // Thay thế nội dung comment bằng form chỉnh sửa
    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(editForm, textElement.nextSibling);
    
    // Đóng menu
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.remove('show');
    
    // Focus vào textarea
    setTimeout(() => {
        const textarea = editForm.querySelector('.comment-edit-input');
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }, 10);
}

/**
 * Hủy chỉnh sửa comment
 */
function cancelEditComment(commentId) {
    const comment = document.getElementById(`comment-${commentId}`);
    if (!comment) return;
    
    const editForm = comment.querySelector('.comment-edit-form');
    const textElement = comment.querySelector('.comment-text');
    
    if (editForm && textElement) {
        editForm.remove();
        textElement.style.display = '';
    }
}

/**
 * Lưu comment đã chỉnh sửa
 */
async function saveEditComment(commentId) {
    const comment = document.getElementById(`comment-${commentId}`);
    if (!comment) return;
    
    const editForm = comment.querySelector('.comment-edit-form');
    const textarea = editForm?.querySelector('.comment-edit-input');
    const textElement = comment.querySelector('.comment-text');
    
    if (!textarea || !textElement) return;
    
    const newContent = textarea.value.trim();
    if (!newContent) {
        alert('Nội dung không được để trống!');
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('content', newContent);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/update.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Cập nhật nội dung comment
            textElement.innerHTML = newContent;
            
            // Xóa form chỉnh sửa
            editForm.remove();
            textElement.style.display = '';
            
            // Thông báo thành công
            showCommentNotification('✅ Đã cập nhật bình luận');
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể cập nhật bình luận'));
        }
    } catch (err) {
        console.error('❌ Lỗi cập nhật comment:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Xóa comment
 */
async function deleteComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/delete.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Xóa comment khỏi giao diện với hiệu ứng
            const comment = document.getElementById(`comment-${commentId}`);
            if (comment) {
                comment.classList.add('deleting');
                setTimeout(() => {
                    comment.remove();
                    
                    // Cập nhật số lượng comment nếu có
                    updateCommentCountAfterDeletion();
                    
                    // Thông báo thành công
                    showCommentNotification('✅ Đã xóa bình luận');
                }, 300);
            }
            
            // Đóng menu
            const menu = document.getElementById(`comment-menu-${commentId}`);
            if (menu) menu.classList.remove('show');
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể xóa bình luận'));
        }
    } catch (err) {
        console.error('❌ Lỗi xóa comment:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Cập nhật số lượng comment sau khi xóa
 */
function updateCommentCountAfterDeletion() {
    // Lấy tất cả comment count elements
    const commentCountElements = document.querySelectorAll('.comment-count');
    commentCountElements.forEach(element => {
        const currentText = element.textContent;
        const match = currentText.match(/(\d+)\s*bình luận/);
        
        if (match) {
            const currentCount = parseInt(match[1]);
            if (currentCount > 0) {
                const newCount = currentCount - 1;
                element.textContent = newCount === 0 ? '' : `${newCount} bình luận`;
            }
        }
    });
}

/**
 * Ẩn comment
 */
function hideComment(commentId) {
    const comment = document.getElementById(`comment-${commentId}`);
    if (comment) {
        comment.style.display = 'none';
        showCommentNotification('Đã ẩn bình luận');
    }
    
    // Đóng menu
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.remove('show');
}

/**
 * Báo cáo comment
 */
async function reportComment(commentId) {
    if (!confirm('Bạn có chắc muốn báo cáo bình luận này?')) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/report.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Đóng menu
            const menu = document.getElementById(`comment-menu-${commentId}`);
            if (menu) menu.classList.remove('show');
            
            // Thông báo thành công
            showCommentNotification('✅ Đã báo cáo bình luận thành công');
            
            // Đánh dấu comment đã báo cáo
            const comment = document.getElementById(`comment-${commentId}`);
            if (comment) {
                comment.classList.add('reported');
                comment.title = 'Bình luận đã được báo cáo';
            }
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể báo cáo bình luận'));
        }
    } catch (err) {
        console.error('❌ Lỗi báo cáo comment:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Hiển thị thông báo cho comment actions
 */
function showCommentNotification(message) {
    // Xóa thông báo cũ nếu có
    const oldNotification = document.getElementById('comment-notification');
    if (oldNotification) oldNotification.remove();
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.id = 'comment-notification';
    notification.className = 'comment-notification';
    notification.innerHTML = `
        <div class="comment-notification-content">
            <span class="material-icons">check_circle</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// ===========================================
// COMMENT REACTION FUNCTIONS
// ===========================================

/**
 * Chọn reaction cho comment
 */
function chooseCommentReaction(commentId, type) {
    toggleCommentReaction(commentId, type);
    
    // Đóng picker
    const picker = document.getElementById(`cmt-react-picker-${commentId}`);
    if (picker) picker.classList.remove('show');
}

/**
 * Mở modal hiển thị người reaction comment
 */
async function openCommentReactionUserModal(commentId, type) {
    // Tạo modal tương tự như post reaction modal
    // Code giống với openReactionUserModal nhưng cho comment
    console.log(`Mở modal reaction comment ${commentId}, type: ${type}`);
    
    // Tạm thời mở tooltip thay vì modal
    // Có thể implement modal riêng nếu cần
}

// ===========================================
// REPLY FUNCTIONS
// ===========================================

/**
 * Hiển thị box reply
 */
function showReplyBox(commentId, postId) {
    const replyBox = document.getElementById(`reply-box-${commentId}`);
    if (!replyBox) return;
    
    replyBox.style.display = 'flex';
    
    // Focus vào input
    setTimeout(() => {
        const input = replyBox.querySelector('.reply-input');
        if (input) {
            input.focus();
        }
    }, 10);
}

/**
 * Gửi reply
 */
async function submitReply(postId, parentCommentId) {
    const replyBox = document.getElementById(`reply-box-${parentCommentId}`);
    if (!replyBox) return;
    
    const input = replyBox.querySelector('.reply-input');
    if (!input) return;
    
    const content = input.textContent.trim();
    if (!content) {
        alert('Vui lòng nhập nội dung phản hồi!');
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('post_id', postId);
        formData.append('content', content);
        formData.append('parent_id', parentCommentId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/create.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Xóa nội dung input
            input.textContent = '';
            
            // Ẩn reply box
            replyBox.style.display = 'none';
            
            // Load lại replies
            if (window.loadReplies) {
                loadReplies(parentCommentId);
            }
            
            // Cập nhật số lượng replies
            updateReplyCount(parentCommentId, data.totalReplies || 1);
            
            // Thông báo thành công
            showCommentNotification('✅ Đã gửi phản hồi');
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể gửi phản hồi'));
        }
    } catch (err) {
        console.error('❌ Lỗi gửi reply:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Cập nhật số lượng replies
 */
function updateReplyCount(commentId, newCount) {
    const viewRepliesElement = document.querySelector(`#comment-${commentId} .view-replies`);
    if (viewRepliesElement) {
        if (newCount > 0) {
            viewRepliesElement.textContent = `Xem ${newCount} phản hồi`;
            viewRepliesElement.style.display = 'block';
        } else {
            viewRepliesElement.style.display = 'none';
        }
    }
}

/**
 * Load replies
 */
async function loadReplies(parentCommentId) {
    const replyList = document.getElementById(`reply-list-${parentCommentId}`);
    if (!replyList) return;
    
    // Nếu đã load rồi thì toggle
    if (replyList.style.display === 'block') {
        replyList.style.display = 'none';
        return;
    }
    
    replyList.innerHTML = '<p class="reply-loading">Đang tải phản hồi...</p>';
    replyList.style.display = 'block';
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/replies.php?parent_id=${parentCommentId}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        const replies = data.replies || [];
        
        if (replies.length === 0) {
            replyList.innerHTML = '<p class="reply-empty">Chưa có phản hồi nào.</p>';
            return;
        }
        
        // Render replies
        replyList.innerHTML = replies.map(reply => renderCommentItem(reply, 0)).join('');
        
        // Ẩn "Xem phản hồi" sau khi đã load
        const viewRepliesElement = document.querySelector(`#comment-${parentCommentId} .view-replies`);
        if (viewRepliesElement) {
            viewRepliesElement.style.display = 'none';
        }
        
    } catch (err) {
        replyList.innerHTML = `<p class="reply-error">Lỗi: ${err.message}</p>`;
    }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Escape HTML để tránh XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    
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

// ===========================================
// KHỞI TẠO KHI TRANG LOAD
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem có đang ở trang post detail không
    const postDetailSection = document.getElementById('post-detail');
    
    if (postDetailSection) {
        console.log('🟢 Đang ở trang post detail, khởi động chức năng...');
        
        // Load bài viết chi tiết
        loadPostDetail();
        
        // Thêm CSS cho các component mới
        addPostDetailStyles();
    }
});

/**
 * Thêm CSS cho post detail
 */
function addPostDetailStyles() {
    if (document.getElementById('post-detail-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'post-detail-styles';
    style.textContent = `
        /* Comment notification */
        .comment-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 99999;
            animation: slideInRight 0.3s ease;
        }
        
        .comment-notification.fade-out {
            animation: slideOutRight 0.3s ease forwards;
        }
        
        .comment-notification-content {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }
        
        .comment-notification-content .material-icons {
            font-size: 18px;
        }
        
        /* Comment edit form */
        .comment-edit-form {
            margin-top: 8px;
            margin-bottom: 8px;
        }
        
        .comment-edit-input {
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
        }
        
        .comment-edit-input:focus {
            outline: none;
            border-color: #2196f3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }
        
        .comment-edit-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
        }
        
        /* Comment menu */
        .comment-menu {
            position: relative;
            display: inline-block;
        }
        
        .comment-menu-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .comment-menu-btn:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        .comment-menu-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 180px;
            z-index: 1000;
            display: none;
        }
        
        .comment-menu-dropdown.show {
            display: block;
            animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .comment-menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            color: #333;
        }
        
        .comment-menu-item:hover {
            background: #f5f5f5;
        }
        
        .comment-menu-item.delete {
            color: #d32f2f;
        }
        
        .comment-menu-item.delete:hover {
            background: #ffebee;
        }
        
        .comment-menu-divider {
            height: 1px;
            background: #eee;
            margin: 4px 0;
        }
        
        /* Reply box */
        .reply-box {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-top: 8px;
            margin-left: 40px;
        }
        
        .reply-input {
            flex: 1;
            min-height: 36px;
            max-height: 100px;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 18px;
            font-size: 14px;
            overflow-y: auto;
            outline: none;
            background: #f5f5f5;
        }
        
        .reply-input:focus {
            background: white;
            border-color: #2196f3;
        }
        
        .reply-send-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: #2196f3;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
        }
        
        .reply-send-btn:hover {
            background: #1976d2;
        }
        
        .reply-send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        /* Reply list */
        .reply-list {
            margin-left: 40px;
            margin-top: 8px;
            border-left: 2px solid #eee;
            padding-left: 12px;
        }
        
        .reply-loading,
        .reply-empty,
        .reply-error {
            padding: 12px;
            color: #666;
            font-size: 14px;
            text-align: center;
        }
        
        .view-replies {
            color: #2196f3;
            font-size: 13px;
            cursor: pointer;
            margin-top: 4px;
            display: inline-block;
        }
        
        .view-replies:hover {
            text-decoration: underline;
        }
        
        /* Comment reported */
        .comment.reported {
            border-left: 3px solid #ff9800;
            background: #fff8e1;
        }
        
        /* Comment deleting animation */
        .comment.deleting {
            opacity: 0.5;
            transform: scale(0.95);
            transition: all 0.3s ease;
        }
        
        /* Animation */
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    
    document.head.appendChild(style);
}

// ===========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ===========================================

if (typeof window !== 'undefined') {
    // Comment functions
    window.renderCommentItem = renderCommentItem;
    window.toggleCommentMenu = toggleCommentMenu;
    window.editComment = editComment;
    window.cancelEditComment = cancelEditComment;
    window.saveEditComment = saveEditComment;
    window.deleteComment = deleteComment;
    window.hideComment = hideComment;
    window.reportComment = reportComment;
    
    // Reply functions
    window.showReplyBox = showReplyBox;
    window.submitReply = submitReply;
    window.loadReplies = loadReplies;
    
    // Reaction functions
    window.chooseCommentReaction = chooseCommentReaction;
    window.openCommentReactionUserModal = openCommentReactionUserModal;
    
    // Post detail functions
    window.loadPostDetail = loadPostDetail;
    window.attachFollowEventHandlers = attachFollowEventHandlers;
    
    console.log('✅ Post detail functions exported to global scope');
}