// assets/js/community/check_user_ban.js
// ================== USER BAN CHECKER MODULE ==================
// Kiểm tra và hiển thị thông tin khi user bị cấm

const BAN_CHECK_API = '/HeThongChamSocCaKoi/backend/api/community/admin/get_ban_info.php';

class UserBanChecker {
    constructor() {
        this.isChecking = false;
        this.banModal = null;
        this.banStatusBar = null;
        this.currentBanData = null;
        this.appealModal = null;
        
        // Tự động khởi động khi load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 500);
        }
    }

    async init() {
        console.log('🟡 Initializing User Ban Checker...');
        
        // Intercept các hành động
        this.setupInterceptors();
        
        // Setup click cho thông báo
        this.setupNotificationClick();
    }

    async checkBanStatus(checkType = 'post_only') {
        if (this.isChecking) return null;
        
        this.isChecking = true;
        
        try {
            const response = await fetch(`${BAN_CHECK_API}?check_type=${checkType}&_=${Date.now()}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            
            if (data.success && data.has_ban) {
                this.currentBanData = data;
                return data;
            }
            
            return null;
        } catch (error) {
            return null;
        } finally {
            this.isChecking = false;
        }
    }

    // Hàm kiểm tra và HIỂN THỊ MODAL NGAY nếu bị cấm
    async checkAndShowBanModal(checkType = 'post_only') {
        const banData = await this.checkBanStatus(checkType);
        
        if (banData && banData.should_block) {
            // Hiển thị modal ngay lập tức
            this.showBanModal(banData);
            return false; // Không cho phép hành động
        }
        
        return true; // Cho phép hành động
    }

    showBanModal(banData = null) {
        // Xóa modal cũ nếu có
        this.hideBanModal();
        
        const data = banData || this.currentBanData;
        if (!data) return;
        
        const ban = data.ban_info;
        const display = data.display_info;
        
        // Sử dụng warning_message từ API
        const warningMessage = ban.warning_message || 'Tài khoản của bạn đã bị hạn chế quyền đăng bài/bình luận trong cộng đồng.';
        
        this.banModal = document.createElement('div');
        this.banModal.className = 'user-ban-modal-overlay';
        this.banModal.innerHTML = `
            <div class="user-ban-modal">
                <div class="ban-modal-header">
                    <span class="material-icons">gavel</span>
                    <h2>${display.title}</h2>
                    <button class="ban-modal-close" onclick="if(window.userBanChecker) window.userBanChecker.hideBanModal()">×</button>
                </div>
                
                <div class="ban-modal-body">
                    <div class="ban-alert-icon">
                        <span class="material-icons">block</span>
                    </div>
                    
                    <div class="ban-info-section">
                        <div class="ban-info-row">
                            <div class="ban-info-label">📋 Loại cấm:</div>
                            <div class="ban-info-value">
                                <span class="ban-type-badge ${ban.ban_type}">
                                    ${ban.ban_type_text}
                                </span>
                                <small class="ban-remaining-time" style="display: block; margin-top: 5px;">
                                    (Hạn chế ${ban.restriction_text})
                                </small>
                            </div>
                        </div>
                        
                        <div class="ban-info-row">
                            <div class="ban-info-label">📝 Lý do:</div>
                            <div class="ban-info-value">
                                <div class="ban-reason-box">${this.escapeHtml(ban.reason)}</div>
                            </div>
                        </div>
                        
                        <div class="ban-info-row">
                            <div class="ban-info-label">⏱️ Thời hạn:</div>
                            <div class="ban-info-value">
                                <strong>${ban.duration} ngày</strong>
                                <small class="ban-remaining-time">
                                    (Còn lại: ${ban.remaining_days} ngày ${ban.remaining_hours} giờ)
                                </small>
                            </div>
                        </div>
                        
                        <div class="ban-info-row">
                            <div class="ban-info-label">📅 Hết hạn:</div>
                            <div class="ban-info-value">
                                ${this.formatDate(ban.expires_at)}
                            </div>
                        </div>
                        
                        <div class="ban-info-row">
                            <div class="ban-info-label">👮 Người thực hiện:</div>
                            <div class="ban-info-value">
                                ${this.escapeHtml(ban.admin_name || ban.admin_username || 'Quản trị viên')}
                            </div>
                        </div>
                        
                        <div class="ban-info-row">
                            <div class="ban-info-label">🆔 Mã cấm:</div>
                            <div class="ban-info-value">
                                <code class="ban-code">${display.ban_code}</code>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ban-warning-section">
                        <div class="ban-warning-icon">
                            <span class="material-icons">warning</span>
                        </div>
                        <div class="ban-warning-text">
                            <p>${warningMessage}</p>
                            <p>Vui lòng liên hệ quản trị viên nếu có thắc mắc về lệnh cấm này.</p>
                        </div>
                    </div>
                </div>
                
                <div class="ban-modal-footer">
                    <button class="ban-modal-btn secondary" onclick="if(window.userBanChecker) window.userBanChecker.hideBanModal()">
                        <span class="material-icons">check</span>
                        Đã hiểu
                    </button>
                    <button class="ban-modal-btn primary" onclick="if(window.userBanChecker) window.userBanChecker.showAppealModal(${ban.ban_id})">
                        <span class="material-icons">contact_support</span>
                        Khiếu nại
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.banModal);
        document.body.style.overflow = 'hidden';
    }

    hideBanModal() {
        if (this.banModal) {
            this.banModal.remove();
            this.banModal = null;
            document.body.style.overflow = '';
        }
    }

    setupInterceptors() {
        // 1. Intercept form đăng bài
        this.interceptPostActions();
        
        // 2. Intercept các hành động comment (comment mới, reply)
        this.interceptCommentActions();
        
        // 3. Intercept các nút chỉnh sửa comment
        this.interceptEditCommentActions();
        
        // 4. Intercept các nút thêm ảnh trong comment
        this.interceptImageUploadActions();
        
        // 5. Override các hàm có sẵn
        this.overrideExistingFunctions();
    }

    interceptPostActions() {
        // Intercept form đăng bài
        const postForm = document.querySelector('#community-post-form, .post-form');
        if (postForm) {
            postForm.addEventListener('submit', async (e) => {
                const canPost = await this.checkAndShowBanModal('post_only');
                if (!canPost) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
        
        // Intercept khi click vào input đăng bài
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#community-content, textarea[name="content"]')) {
                await this.checkAndShowBanModal('post_only');
            }
        });
        
        // Intercept khi focus vào input đăng bài
        document.addEventListener('focusin', async (e) => {
            if (e.target.matches('#community-content, textarea[name="content"]')) {
                await this.checkAndShowBanModal('post_only');
            }
        });
    }

    interceptCommentActions() {
        // Intercept tất cả form comment và reply
        document.addEventListener('submit', async (e) => {
            if (e.target.matches('.comment-form, .reply-form')) {
                const canComment = await this.checkAndShowBanModal('comment_only');
                if (!canComment) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
        
        // Intercept khi click vào input comment hoặc reply
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.comment-form textarea, .reply-form textarea, .comment-form input, .reply-form input')) {
                await this.checkAndShowBanModal('comment_only');
            }
        });
        
        // Intercept nút gửi comment và reply
        document.addEventListener('click', async (e) => {
            const submitBtn = e.target.closest('.comment-submit-btn, .reply-submit-btn, .btn-comment, .btn-reply, button[type="submit"]');
            if (submitBtn && (submitBtn.closest('.comment-form') || submitBtn.closest('.reply-form'))) {
                const canComment = await this.checkAndShowBanModal('comment_only');
                if (!canComment) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            // Nút reply riêng
            const replyBtn = e.target.closest('.reply-btn, .btn-reply, .comment-reply-btn');
            if (replyBtn) {
                const canReply = await this.checkAndShowBanModal('comment_only');
                if (!canReply) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
    }

    interceptEditCommentActions() {
        // Intercept nút chỉnh sửa comment
        document.addEventListener('click', async (e) => {
            // Phát hiện nút chỉnh sửa comment
            const editBtn = e.target.closest('.edit-comment-btn, .btn-edit-comment, [class*="edit-comment"]');
            if (editBtn) {
                const canEdit = await this.checkAndShowBanModal('comment_only');
                if (!canEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            
            // Phát hiện nút cập nhật comment (trong form chỉnh sửa)
            const updateBtn = e.target.closest('.update-comment-btn, .btn-update-comment, [class*="update-comment"]');
            if (updateBtn) {
                const canUpdate = await this.checkAndShowBanModal('comment_only');
                if (!canUpdate) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });
        
        // Intercept form chỉnh sửa comment
        document.addEventListener('submit', async (e) => {
            if (e.target.matches('.edit-comment-form, [class*="edit-comment-form"]')) {
                const canEdit = await this.checkAndShowBanModal('comment_only');
                if (!canEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });
    }

    interceptImageUploadActions() {
        // Intercept nút thêm ảnh trong comment
        document.addEventListener('click', async (e) => {
            // Phát hiện nút thêm ảnh trong khu vực comment
            const imageBtn = e.target.closest('.add-image-btn, .upload-image-btn, .image-upload-btn, [class*="image-btn"]');
            if (imageBtn && imageBtn.closest('.comment-form, .reply-form, .comment-item, .comments-section')) {
                const canUpload = await this.checkAndShowBanModal('comment_only');
                if (!canUpload) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            
            // Phát hiện icon thêm ảnh (material icons)
            if (e.target.classList.contains('material-icons') && 
                (e.target.textContent.includes('image') || e.target.textContent.includes('photo'))) {
                const imageIcon = e.target.closest('button, .btn, [role="button"]');
                if (imageIcon && imageIcon.closest('.comment-form, .reply-form, .comment-item')) {
                    const canUpload = await this.checkAndShowBanModal('comment_only');
                    if (!canUpload) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }
            }
        });
        
        // Intercept khi click vào input file trong comment
        document.addEventListener('click', async (e) => {
            if (e.target.type === 'file' && e.target.closest('.comment-form, .reply-form, .comment-item')) {
                const canUpload = await this.checkAndShowBanModal('comment_only');
                if (!canUpload) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Ngăn chặn mở file picker
                    e.target.disabled = true;
                    setTimeout(() => {
                        e.target.disabled = false;
                    }, 100);
                    return false;
                }
            }
        });
        
        // Intercept khi thay đổi input file (đã chọn file)
        document.addEventListener('change', async (e) => {
            if (e.target.type === 'file' && e.target.closest('.comment-form, .reply-form, .comment-item')) {
                const canUpload = await this.checkAndShowBanModal('comment_only');
                if (!canUpload) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Xóa file đã chọn
                    e.target.value = '';
                    
                    // Hiển thị modal cảnh báo
                    const banData = await this.checkBanStatus('comment_only');
                    if (banData && banData.should_block) {
                        this.showBanModal(banData);
                    }
                    
                    return false;
                }
            }
        });
    }

    overrideExistingFunctions() {
        // Override hàm submitComment
        if (typeof window.submitComment === 'function') {
            const originalSubmitComment = window.submitComment;
            window.submitComment = async function(e, postId) {
                if (window.userBanChecker) {
                    const canComment = await window.userBanChecker.checkAndShowBanModal('comment_only');
                    if (!canComment) {
                        e.preventDefault();
                        return false;
                    }
                }
                return originalSubmitComment.call(this, e, postId);
            };
        }
        
        // Override hàm editComment
        if (typeof window.editComment === 'function') {
            const originalEditComment = window.editComment;
            window.editComment = async function(commentId) {
                if (window.userBanChecker) {
                    const canEdit = await window.userBanChecker.checkAndShowBanModal('comment_only');
                    if (!canEdit) {
                        return false;
                    }
                }
                return originalEditComment.call(this, commentId);
            };
        }
        
        // Override hàm updateComment
        if (typeof window.updateComment === 'function') {
            const originalUpdateComment = window.updateComment;
            window.updateComment = async function(e, commentId) {
                if (window.userBanChecker) {
                    const canUpdate = await window.userBanChecker.checkAndShowBanModal('comment_only');
                    if (!canUpdate) {
                        e.preventDefault();
                        return false;
                    }
                }
                return originalUpdateComment.call(this, e, commentId);
            };
        }
        
        // Override hàm replyComment
        if (typeof window.replyComment === 'function') {
            const originalReplyComment = window.replyComment;
            window.replyComment = async function(commentId) {
                if (window.userBanChecker) {
                    const canReply = await window.userBanChecker.checkAndShowBanModal('comment_only');
                    if (!canReply) {
                        return false;
                    }
                }
                return originalReplyComment.call(this, commentId);
            };
        }
        
        // Override hàm uploadImage (nếu có)
        if (typeof window.uploadImage === 'function') {
            const originalUploadImage = window.uploadImage;
            window.uploadImage = async function() {
                if (window.userBanChecker) {
                    const canUpload = await window.userBanChecker.checkAndShowBanModal('comment_only');
                    if (!canUpload) {
                        return false;
                    }
                }
                return originalUploadImage.apply(this, arguments);
            };
        }
    }

    setupNotificationClick() {
        document.addEventListener('click', (e) => {
            const notification = e.target.closest('.notify-item.ban-notification, .notify-item[data-type="user_banned"]');
            if (notification && this.currentBanData) {
                e.preventDefault();
                e.stopPropagation();
                this.showBanModal();
                
                if (typeof window.markNotificationAsRead === 'function') {
                    const notificationId = notification.dataset.notificationId;
                    if (notificationId) {
                        window.markNotificationAsRead(notificationId);
                    }
                }
            }
        });
    }

    // Hiển thị popup khiếu nại
    showAppealModal(banId) {
        this.hideBanModal();
        
        this.appealModal = document.createElement('div');
        this.appealModal.className = 'appeal-modal-overlay';
        this.appealModal.innerHTML = `
            <div class="appeal-modal">
                <div class="appeal-modal-header">
                    <span class="material-icons">contact_support</span>
                    <h2>Khiếu Nại Lệnh Cấm</h2>
                    <button class="appeal-modal-close" onclick="if(window.userBanChecker) window.userBanChecker.hideAppealModal()">×</button>
                </div>
                
                <div class="appeal-modal-body">
                    <div class="appeal-info">
                        <p><span class="material-icons">info</span> Vui lòng trình bày lý do khiếu nại của bạn.</p>
                        <p class="appeal-note"><span class="material-icons">lightbulb</span> Lưu ý: Khiếu nại của bạn sẽ được xem xét bởi quản trị viên trong thời gian sớm nhất.</p>
                    </div>
                    
                    <div class="appeal-form">
                        <div class="form-group">
                            <label for="appealReason">
                                <span class="material-icons">description</span>
                                Lý do khiếu nại:
                            </label>
                            <textarea 
                                id="appealReason" 
                                class="appeal-reason-input" 
                                placeholder="Nhập lý do khiếu nại của bạn tại đây..." 
                                rows="5"></textarea>
                        </div>
                    </div>
                </div>
                
                <div class="appeal-modal-footer">
                    <button class="appeal-modal-btn secondary" onclick="if(window.userBanChecker) window.userBanChecker.hideAppealModal()">
                        <span class="material-icons">close</span>
                        Hủy
                    </button>
                    <button class="appeal-modal-btn primary" onclick="if(window.userBanChecker) window.userBanChecker.submitAppeal(${banId})">
                        <span class="material-icons">send</span>
                        Gửi Khiếu Nại
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.appealModal);
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const textarea = this.appealModal.querySelector('#appealReason');
            if (textarea) {
                textarea.focus();
            }
        }, 100);
    }

    hideAppealModal() {
        if (this.appealModal) {
            this.appealModal.remove();
            this.appealModal = null;
            document.body.style.overflow = '';
        }
    }

    async submitAppeal(banId) {
        const textarea = document.querySelector('#appealReason');
        if (!textarea) return;
        
        const reason = textarea.value.trim();
        
        if (!reason) {
            this.showAppealError('Vui lòng nhập lý do khiếu nại.');
            return;
        }
        
        const submitBtn = this.appealModal?.querySelector('.appeal-modal-btn.primary');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang gửi...';
            submitBtn.disabled = true;
            
            try {
                const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
                const apiUrl = `${baseUrl}/backend/api/community/admin/appeal_ban.php`;
                
                const formData = new URLSearchParams();
                formData.append('ban_id', banId);
                formData.append('reason', reason);
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    credentials: 'include',
                    body: formData.toString()
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showAppealSuccess(data.message);
                    
                    if (this.currentBanData) {
                        this.currentBanData.ban_info.appeal_status = 'pending';
                    }
                    
                    setTimeout(() => {
                        this.hideAppealModal();
                    }, 2000);
                } else {
                    this.showAppealError(data.error || 'Không thể gửi khiếu nại. Vui lòng thử lại.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                this.showAppealError('Lỗi kết nối. Vui lòng thử lại sau.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    showAppealError(message) {
        const oldError = this.appealModal?.querySelector('.appeal-error');
        if (oldError) oldError.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'appeal-error';
        errorDiv.innerHTML = `
            <span class="material-icons">error</span>
            <span>${message}</span>
        `;
        
        const form = this.appealModal?.querySelector('.appeal-form');
        if (form) {
            form.appendChild(errorDiv);
        }
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showAppealSuccess(message) {
        const modalBody = this.appealModal?.querySelector('.appeal-modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = `
            <div class="appeal-success">
                <div class="success-icon">
                    <span class="material-icons">check_circle</span>
                </div>
                <h3>Gửi Khiếu Nại Thành Công!</h3>
                <p>${message}</p>
                <p class="success-note">Khiếu nại của bạn đã được gửi đến quản trị viên. Vui lòng chờ phản hồi qua thông báo hệ thống.</p>
                <div class="success-actions">
                    <button class="success-btn" onclick="if(window.userBanChecker) window.userBanChecker.hideAppealModal()">
                        <span class="material-icons">check</span>
                        Đã hiểu
                    </button>
                </div>
            </div>
        `;
        
        const modalFooter = this.appealModal?.querySelector('.appeal-modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'none';
        }
    }

    // Utility functions
    escapeHtml(text) {
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

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Khởi tạo và gắn vào global
if (typeof window !== 'undefined') {
    window.userBanChecker = new UserBanChecker();
    
    // Export các hàm để sử dụng từ các file JS khác
    window.checkAndShowBanInfo = async function(actionType) {
        if (window.userBanChecker) {
            return await window.userBanChecker.checkAndShowBanModal(actionType);
        }
        return true;
    };
    
    window.showBanModal = function(banData) {
        if (window.userBanChecker) {
            window.userBanChecker.showBanModal(banData);
        }
    };
    
    window.closeBanModal = function() {
        if (window.userBanChecker) {
            window.userBanChecker.hideBanModal();
        }
    };
    
    console.log('✅ User Ban Checker loaded');
}