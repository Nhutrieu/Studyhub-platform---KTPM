// community-admin-menu.js
// ================== ADMIN POST MENU FUNCTIONS ==================
// PHẢI LOAD FILE NÀY TRƯỚC KHI HTML RENDER

// Định nghĩa các hàm TRƯỚC KHI HTML được render
// Thêm vào ĐẦU FILE community-main.js
// ================== FIX: ĐẢM BẢO HÀM ADMIN TỒN TẠI ==================

// Hàm kiểm tra admin
if (typeof window.isAdmin === 'undefined') {
    window.isAdmin = function() {
        return window.CURRENT_USER_ROLE && window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
    };
}

// Hàm placeholder cho các hàm admin (sẽ được ghi đè sau)
if (typeof window.adminWarnUserFromPost === 'undefined') {
    window.adminWarnUserFromPost = function(postId) {
        console.warn('⚠️ adminWarnUserFromPost chưa được tải, sử dụng hàm tạm');
        
        // Hàm tạm thời
        if (confirm('Bạn muốn cảnh cáo người đăng bài viết này?')) {
            const BASE_URL = window.BASE_URL || "/HeThongChamSocCaKoi";
            fetch(`${BASE_URL}/backend/api/community/admin/warn_user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `post_id=${postId}&reason=Vi phạm cộng đồng`
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('✅ Đã cảnh cáo người dùng');
                } else {
                    alert('❌ Lỗi: ' + (data.error || 'Không thể cảnh cáo'));
                }
            });
        }
        return false;
    };
}

if (typeof window.adminBanUserFromPost === 'undefined') {
    window.adminBanUserFromPost = function(postId) {
        console.warn('⚠️ adminBanUserFromPost chưa được tải, sử dụng hàm tạm');
        alert('Tính năng chặn người dùng đang tải...');
        return false;
    };
}

if (typeof window.adminDeletePost === 'undefined') {
    window.adminDeletePost = function(postId) {
        console.warn('⚠️ adminDeletePost chưa được tải, sử dụng hàm tạm');
        
        if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
            const BASE_URL = window.BASE_URL || "/HeThongChamSocCaKoi";
            fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `post_id=${postId}&admin_action=1`
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('✅ Đã xóa bài viết');
                    window.location.reload();
                } else {
                    alert('❌ Lỗi: ' + (data.error || 'Không thể xóa'));
                }
            });
        }
        return false;
    };
}

if (typeof window.showAdminNotification === 'undefined') {
    window.showAdminNotification = function(message, type = 'info') {
        console.log('📢 Thông báo admin:', message);
        
        // Hiển thị thông báo đơn giản
        const notification = document.createElement('div');
        notification.className = 'temp-admin-notification';
        notification.innerHTML = `
            <div style="position:fixed; top:20px; right:20px; background:white; padding:12px 20px; 
                       border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:99999;
                       border-left:4px solid ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'}">
                <span style="font-weight:600;">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    };
}
if (typeof window !== 'undefined') {
    // Biến global
    window.BASE_URL = window.BASE_URL || "/HeThongChamSocCaKoi";
    
    // Hàm kiểm tra admin
    window.isAdmin = function() {
        return window.CURRENT_USER_ROLE && window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
    };
    
    // Hàm placeholder cho đến khi được định nghĩa đầy đủ
    window.adminDeletePost = function(postId) {
        console.warn('⚠️ adminDeletePost not fully loaded yet, calling fallback');
        // Fallback function
        if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
            fetch(`${window.BASE_URL}/backend/api/community/admin/delete_post.php`, {
                method: 'POST',
                body: new FormData().append('post_id', postId).append('admin_action', '1')
            }).then(res => res.json())
              .then(data => {
                  if (data.success) {
                      alert('✅ Đã xóa bài viết');
                      location.reload();
                  } else {
                      alert('❌ Lỗi: ' + (data.error || 'Không thể xóa'));
                  }
              });
        }
    };
    
    window.adminWarnUserFromPost = function(postId) {
        console.warn('⚠️ adminWarnUserFromPost not fully loaded yet');
        alert('Tính năng cảnh cáo đang tải...');
    };
    
    window.adminBanUserFromPost = function(postId) {
        console.warn('⚠️ adminBanUserFromPost not fully loaded yet');
        alert('Tính năng chặn người dùng đang tải...');
    };
    
    // Hàm thông báo tạm thời
    window.showAdminNotification = function(message, type = 'info') {
        alert(type.toUpperCase() + ': ' + message);
    };
    
    console.log('🟡 Admin placeholder functions loaded');
}

// Đợi DOM ready để định nghĩa đầy đủ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🟡 DOM ready, loading full admin functions...');
    
    const BASE_URL = window.BASE_URL || "/HeThongChamSocCaKoi";

    // Đảm bảo hàm adminWarnUserFromPost được định nghĩa
    if (typeof window !== 'undefined') {
        // Hàm placeholder - sẽ được ghi đè khi DOM ready
        window.adminWarnUserFromPost = function(postId) {
            console.log('🟡 adminWarnUserFromPost placeholder called');
            
            // Fallback: mở modal cảnh cáo đơn giản
            if (confirm('Bạn muốn cảnh cáo người đăng bài viết này?')) {
                const post = document.querySelector(`[data-post-id="${postId}"]`);
                if (post) {
                    const userId = post.dataset.userId;
                    const userName = post.querySelector('.author-name')?.textContent || 'Người dùng';
                    
                    const reason = prompt(`Nhập lý do cảnh cáo ${userName}:`);
                    if (reason) {
                        fetch(`${BASE_URL}/backend/api/community/admin/warn_user.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `user_id=${userId}&reason=${encodeURIComponent(reason)}&post_id=${postId}`
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                alert('✅ Đã cảnh cáo người dùng');
                            } else {
                                alert('❌ Lỗi: ' + (data.error || 'Không thể cảnh cáo'));
                            }
                        });
                    }
                }
            }
        };
    }
        
    /* ===== HÀM ĐẦY ĐỦ ===== */
    
    // Hàm kiểm tra quyền admin
    window.isAdmin = function() {
        return window.CURRENT_USER_ROLE && window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
    };
    
    // Hàm thông báo admin
    window.showAdminNotification = function(message, type = 'info') {
        // Xóa thông báo cũ
        const oldNotif = document.querySelector('.admin-notification');
        if (oldNotif) oldNotif.remove();
        
        // Tạo thông báo mới
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        
        notification.innerHTML = `
            <span class="material-icons admin-notification-icon">${icons[type] || 'info'}</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    };
    
    /* ===== CÁC HÀM CHÍNH ===== */
    
    /**
     * Xóa bài viết (admin)
     */
    window.adminDeletePost = async function(postId) {
        if (!confirm('Bạn có chắc muốn xóa bài viết này? Hành động này không thể hoàn tác.')) {
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('post_id', postId);
            formData.append('admin_action', '1');
            
            const response = await fetch(`${BASE_URL}/backend/api/community/admin/delete_post.php`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAdminNotification('✅ Đã xóa bài viết thành công', 'success');
                
                // Ẩn bài viết khỏi giao diện
                const post = document.querySelector(`[data-post-id="${postId}"]`);
                if (post) {
                    post.style.opacity = '0.5';
                    post.style.pointerEvents = 'none';
                    setTimeout(() => post.remove(), 500);
                }
            } else {
                showAdminNotification('❌ ' + (data.error || 'Không thể xóa bài viết'), 'error');
            }
        } catch (error) {
            console.error('Delete post error:', error);
            showAdminNotification('❌ Lỗi kết nối', 'error');
        }
    };
    
    /**
     * Cảnh cáo người dùng từ bài viết
     */
    window.adminWarnUserFromPost = function(postId) {
        // Kiểm tra quyền admin
        if (!isAdmin()) {
            showAdminNotification('Bạn không có quyền thực hiện hành động này', 'error');
            return;
        }
        
        // Lấy user ID từ bài viết
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (!post) {
            showAdminNotification('Không tìm thấy bài viết', 'error');
            return;
        }
        
        const userId = post.dataset.userId || post.querySelector('[data-user-id]')?.dataset.userId;
        if (!userId) {
            showAdminNotification('Không thể xác định người dùng', 'error');
            return;
        }
        
        showWarnUserModal(userId, postId);
    };
    
    /**
     * Chặn người dùng từ bài viết
     */
    window.adminBanUserFromPost = function(postId) {
        // Kiểm tra quyền admin
        if (!isAdmin()) {
            showAdminNotification('Bạn không có quyền thực hiện hành động này', 'error');
            return;
        }
        
        // Lấy user ID từ bài viết
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (!post) {
            showAdminNotification('Không tìm thấy bài viết', 'error');
            return;
        }
        
        const userId = post.dataset.userId || post.querySelector('[data-user-id]')?.dataset.userId;
        if (!userId) {
            showAdminNotification('Không thể xác định người dùng', 'error');
            return;
        }
        
        showBanUserModal(userId, postId);
    };
    
    /* ===== MODAL FUNCTIONS ===== */
    
    window.showWarnUserModal = function(userId, postId = null) {
        // Xóa modal cũ nếu có
        const oldModal = document.querySelector('.admin-modal-overlay');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.className = 'admin-modal-overlay';
        modal.innerHTML = `
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <span class="material-icons admin-warning-icon">warning</span>
                    <h3>Cảnh cáo người dùng</h3>
                    <button class="admin-modal-close" onclick="closeAdminModal()">×</button>
                </div>
                <div class="admin-modal-body">
                    <div class="admin-form-group">
                        <label for="warn-reason">Lý do cảnh cáo:</label>
                        <textarea id="warn-reason" class="admin-form-control textarea" 
                                  placeholder="Nhập lý do cảnh cáo người dùng..." 
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="admin-form-group">
                        <label>Mức độ nghiêm trọng:</label>
                        <div class="admin-radio-group">
                            <label class="admin-radio-label">
                                <input type="radio" name="warn-severity" value="low" checked>
                                <span>Thấp</span>
                            </label>
                            <label class="admin-radio-label">
                                <input type="radio" name="warn-severity" value="medium">
                                <span>Trung bình</span>
                            </label>
                            <label class="admin-radio-label">
                                <input type="radio" name="warn-severity" value="high">
                                <span>Cao</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="admin-form-group">
                        <label for="warn-duration">Thời hạn cảnh cáo (ngày):</label>
                        <div class="admin-duration-input">
                            <input type="number" id="warn-duration" class="admin-form-control" 
                                   value="30" min="1" max="365">
                            <span class="admin-duration-unit">ngày</span>
                        </div>
                    </div>
                </div>
                <div class="admin-modal-footer">
                    <button class="admin-btn admin-btn-secondary" onclick="closeAdminModal()">
                        Hủy
                    </button>
                    <button class="admin-btn admin-btn-warning" onclick="submitWarnUser(${userId}, ${postId})">
                        <span class="material-icons">warning</span>
                        Gửi cảnh cáo
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    };
    
    window.showBanUserModal = function(userId, postId = null) {
    // Xóa modal cũ nếu có
    const oldModal = document.querySelector('.admin-modal-overlay');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal" style="max-width: 450px;">
            <div class="admin-modal-header">
                <span class="material-icons" style="color: #d32f2f; font-size: 24px;">block</span>
                <h3 style="font-size: 18px;">Cấm người dùng</h3>
                <button class="admin-modal-close" onclick="closeAdminModal()">×</button>
            </div>
            <div class="admin-modal-body">
                <div class="admin-form-group">
                    <label for="ban-reason">Lý do cấm:</label>
                    <textarea id="ban-reason" class="admin-form-control textarea" 
                              placeholder="Nhập lý do cấm người dùng..." 
                              rows="3" required style="min-height: 80px;"></textarea>
                </div>
                
                <div class="admin-form-group">
                    <label>Phạm vi cấm:</label>
                    <div class="admin-radio-group" style="display: grid; gap: 8px;">
                        <label class="admin-radio-label" style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="ban-scope" value="post_only" checked>
                            <div>
                                <strong style="display: block; font-size: 14px;">📝 Chỉ đăng bài</strong>
                                <small style="color: #666; font-size: 12px;">Người dùng không thể đăng bài mới</small>
                            </div>
                        </label>
                        <label class="admin-radio-label" style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="ban-scope" value="comment_only">
                            <div>
                                <strong style="display: block; font-size: 14px;">💬 Chỉ bình luận</strong>
                                <small style="color: #666; font-size: 12px;">Người dùng không thể bình luận</small>
                            </div>
                        </label>
                        <label class="admin-radio-label" style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="ban-scope" value="full_ban">
                            <div>
                                <strong style="display: block; font-size: 14px;">⛔ Cấm hoàn toàn</strong>
                                <small style="color: #666; font-size: 12px;">Không thể đăng bài và bình luận</small>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="admin-form-group">
                    <label>Thời hạn cấm:</label>
                    <div class="admin-radio-group" style="display: flex; gap: 15px;">
                        <label class="admin-radio-label">
                            <input type="radio" name="ban-type" value="temp" checked 
                                   onclick="toggleBanDuration(true)">
                            <span>Tạm thời</span>
                        </label>
                        <label class="admin-radio-label">
                            <input type="radio" name="ban-type" value="perm" 
                                   onclick="toggleBanDuration(false)">
                            <span>Vĩnh viễn</span>
                        </label>
                    </div>
                </div>
                
                <div class="admin-form-group" id="ban-duration-group">
                    <label for="ban-days">Số ngày cấm:</label>
                    <div class="admin-duration-input" style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" id="ban-days" class="admin-form-control" 
                               value="7" min="1" max="365" style="width: 80px;">
                        <span class="admin-duration-unit" style="color: #666;">ngày</span>
                        <small style="color: #999; font-size: 12px;">(Tối đa 365 ngày)</small>
                    </div>
                </div>
                
                <div style="font-size: 13px; color: #666; margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span>
                    Người dùng sẽ nhận được thông báo chi tiết về lý do và thời hạn cấm.
                </div>
            </div>
            <div class="admin-modal-footer">
                <button class="admin-btn admin-btn-secondary" onclick="closeAdminModal()" style="padding: 8px 16px;">
                    Hủy
                </button>
                <button class="admin-btn admin-btn-danger" onclick="submitBanUser(${userId}, ${postId || 'null'})" 
                        style="padding: 8px 16px;">
                    <span class="material-icons" style="font-size: 18px;">gavel</span>
                    Xác nhận cấm
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Focus vào textarea
    setTimeout(() => {
        const textarea = document.getElementById('ban-reason');
        if (textarea) textarea.focus();
    }, 100);
};
    
    window.closeAdminModal = function() {
        const modal = document.querySelector('.admin-modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    };
    
    window.toggleBanDuration = function(show) {
        const durationGroup = document.getElementById('ban-duration-group');
        if (durationGroup) {
            durationGroup.style.display = show ? 'block' : 'none';
        }
    };
    
    window.submitWarnUser = async function(userId, postId = null) {
        const reason = document.getElementById('warn-reason')?.value.trim();
        const severity = document.querySelector('input[name="warn-severity"]:checked')?.value;
        const duration = parseInt(document.getElementById('warn-duration')?.value || 30);
        
        if (!reason) {
            showAdminNotification('Vui lòng nhập lý do cảnh cáo', 'error');
            return;
        }
        
        try {
            const formData = new URLSearchParams();
            formData.append('user_id', userId);
            formData.append('post_id', postId);
            formData.append('reason', reason);
            formData.append('severity', severity);
            formData.append('duration', duration);
            
            const response = await fetch(`${BASE_URL}/backend/api/community/admin/warn_user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });
            
            const data = await response.json();
            
            if (data.success) {
                closeAdminModal();
                showAdminNotification('✅ Đã cảnh cáo người dùng thành công', 'success');
            } else {
                throw new Error(data.error || 'Không thể cảnh cáo');
            }
        } catch (error) {
            console.error('Warn user error:', error);
            showAdminNotification('❌ Lỗi: ' + error.message, 'error');
        }
    };
    
    // Thêm vào file community-admin-menu.js, trong phần DOMContentLoaded

window.submitBanUser = async function(userId, postId = null) {
    const reason = document.getElementById('ban-reason')?.value.trim();
    const banType = document.querySelector('input[name="ban-type"]:checked')?.value || 'temp';
    const duration = banType === 'temp' ? parseInt(document.getElementById('ban-days')?.value || 7) : 0;
    const banScope = document.querySelector('input[name="ban-scope"]:checked')?.value || 'post_only';
    
    if (!reason) {
        showAdminNotification('Vui lòng nhập lý do chặn', 'error');
        return;
    }
    
    // Disable nút submit
    const submitBtn = document.querySelector('.admin-btn-danger');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang xử lý...';
    }
    
    try {
        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('reason', reason);
        formData.append('duration', duration);
        formData.append('ban_type', banScope);
        if (postId) formData.append('post_id', postId);
        
        const response = await fetch(`${BASE_URL}/backend/api/community/admin/ban_user.php`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeAdminModal();
            
            // Hiển thị form chi tiết thay vì alert
            showBanDetailsModal(data);
            
        } else {
            throw new Error(data.error || 'Không thể chặn người dùng');
        }
    } catch (error) {
        console.error('Ban user error:', error);
        showAdminNotification('❌ Lỗi: ' + error.message, 'error');
    } finally {
        // Re-enable nút submit
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-icons">block</span> Chặn người dùng';
        }
    }
};

// Thêm hàm hiển thị form chi tiết khi cấm thành công
// Thêm hàm hiển thị form chi tiết khi cấm thành công
window.showBanDetailsModal = function(banData) {
    // Xóa modal cũ nếu có
    const oldModal = document.querySelector('.ban-details-modal');
    if (oldModal) oldModal.remove();
    
    // Xác định tên hiển thị - Ưu tiên username
    const username = banData.user?.username || '';
    const userId = banData.user?.id || '';
    
    // Luôn hiển thị username
    const displayName = username || 'Người dùng';
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay ban-details-modal';
    modal.innerHTML = `
        <div class="admin-modal" style="max-width: 500px;">
            <div class="admin-modal-header" style="background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white;">
                <span class="material-icons" style="font-size: 28px;">gavel</span>
                <h3 style="color: white; margin: 0;">ĐÃ CHẶN NGƯỜI DÙNG THÀNH CÔNG</h3>
                <button class="admin-modal-close" onclick="closeAdminModal()" style="color: white;">×</button>
            </div>
            <div class="admin-modal-body" style="padding: 20px;">
                <div class="ban-success-icon" style="text-align: center; margin: 20px 0;">
                    <span class="material-icons" style="font-size: 60px; color: #4caf50;">check_circle</span>
                </div>
                
                <div class="ban-details-section">
                    <h4 style="color: #d32f2f; border-bottom: 2px solid #ffcdd2; padding-bottom: 8px;">📋 Chi tiết lệnh cấm</h4>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">👤 Người dùng:</div>
                        <div class="ban-detail-value">
                            <strong style="font-size: 18px; color: #d32f2f;">${escapeHtml(displayName)}</strong>
                        </div>
                    </div>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">🎯 Phạm vi cấm:</div>
                        <div class="ban-detail-value">
                            <span class="ban-type-badge ${banData.ban_info?.type}">
                                ${banData.ban_info?.type_text || "Đăng bài viết"}
                            </span>
                        </div>
                    </div>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">⏱️ Thời hạn:</div>
                        <div class="ban-detail-value">
                            <strong>${banData.ban_info?.duration || '7 ngày'}</strong>
                        </div>
                    </div>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">📝 Lý do:</div>
                        <div class="ban-detail-value">
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; border-left: 3px solid #d32f2f;">
                                ${escapeHtml(banData.ban_info?.reason)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">👮 Người thực hiện:</div>
                        <div class="ban-detail-value">
                            ${escapeHtml(banData.admin?.name || 'Quản trị viên')}
                        </div>
                    </div>
                    
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">🆔 Mã lệnh cấm:</div>
                        <div class="ban-detail-value">
                            <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px;">#BAN-${banData.ban_id}</code>
                        </div>
                    </div>
                    
                    ${banData.ban_info?.expires_at ? `
                    <div class="ban-detail-row">
                        <div class="ban-detail-label">📅 Hết hạn:</div>
                        <div class="ban-detail-value">
                            ${formatDateTime(banData.ban_info.expires_at)}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="ban-warning-box" style="background: #fff3e0; border: 2px solid #ffb74d; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span class="material-icons" style="color: #ff9800;">info</span>
                        <strong style="color: #d84315;">Thông tin cho người dùng:</strong>
                    </div>
                    <p style="margin: 0; color: #5d4037;">
                        Người dùng <strong>${escapeHtml(displayName)}</strong> sẽ nhận được thông báo về việc bị cấm thông qua hệ thống thông báo của cộng đồng với đầy đủ chi tiết.
                    </p>
                </div>
            </div>
            <div class="admin-modal-footer" style="justify-content: space-between;">
                <button class="admin-btn admin-btn-outline" onclick="copyBanDetails(${banData.ban_id}, '${escapeHtml(displayName)}')">
                    <span class="material-icons">content_copy</span>
                    Sao chép thông tin
                </button>
                <button class="admin-btn admin-btn-primary" onclick="closeAdminModal()">
                    <span class="material-icons">check</span>
                    Hoàn tất
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Thêm CSS cho modal ban details
    addBanDetailsStyles();
};

// Hàm định dạng thời gian
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Hàm escape HTML để tránh XSS
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

// Hàm sao chép thông tin lệnh cấm
window.copyBanDetails = function(banId, displayName) {
    const text = `Lệnh cấm #BAN-${banId} đã được thực hiện thành công cho người dùng: ${displayName}`;
    navigator.clipboard.writeText(text).then(() => {
        showAdminNotification('✅ Đã sao chép thông tin', 'success');
    });
};
// Thêm CSS cho ban details modal
window.addBanDetailsStyles = function() {
    const styleId = 'ban-details-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ban-details-section {
            background: white;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        
        .ban-detail-row {
            display: flex;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #eee;
        }
        
        .ban-detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .ban-detail-label {
            flex: 0 0 140px;
            font-weight: 600;
            color: #555;
            font-size: 14px;
        }
        
        .ban-detail-value {
            flex: 1;
            font-size: 14px;
        }
        
        .ban-type-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        
        .ban-type-badge.post_only {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
        
        .ban-type-badge.comment_only {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        }
        
        .ban-type-badge.full_ban {
            background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
        }
        
        .admin-btn-outline {
            background: transparent;
            border: 2px solid #2196f3;
            color: #2196f3;
        }
        
        .admin-btn-outline:hover {
            background: #2196f3;
            color: white;
        }
    `;
    
    document.head.appendChild(style);
};
    
    console.log('✅ Full admin menu functions loaded');
});