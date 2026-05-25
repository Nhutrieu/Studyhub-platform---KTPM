// community-notifications.js
// ================== NOTIFICATIONS MODULE ==================

// Sử dụng BASE_URL từ global scope, không khai báo lại
const NOTIFICATION_BASE_URL = window.BASE_URL || "/HeThongChamSocCaKoi";

if (typeof window.isAdmin === 'undefined') {
    window.isAdmin = function() {
        if (!window.CURRENT_USER_ROLE) return false;
        return window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
    };
}

// Hàm đánh dấu thông báo báo cáo đã đọc nếu chưa có
if (typeof window.markReportNotificationAsRead === 'undefined') {
    window.markReportNotificationAsRead = async function(commentId, type = 'comment_reported') {
        console.warn('⚠️ markReportNotificationAsRead - Placeholder function called');
        return false;
    };
}

// Hàm hiển thị panel admin nếu chưa có
if (typeof window.showAdminPanel === 'undefined') {
    window.showAdminPanel = function(commentId) {
        console.warn('⚠️ showAdminPanel - Placeholder function called');
    };
}
if (typeof window.escapeHtml === 'undefined') {
    window.escapeHtml = function(text) {
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
    };
}

// Hàm displayName nếu chưa được định nghĩa
if (typeof window.displayName === 'undefined') {
    window.displayName = function(user) {
        if (!user || typeof user !== 'object') return "Người dùng";
        
        // Ưu tiên Username
        if (user.Username && user.Username.trim() !== "" && user.Username !== "undefined") {
            return user.Username;
        }
        
        // Chỉ dùng FullName nếu không có "Người dùng mới"
        if (user.FullName && user.FullName.trim() !== "" && 
            !user.FullName.includes("Người dùng mới") &&
            !user.FullName.includes("New User")) {
            return user.FullName;
        }
        
        // Nếu FullName có "Người dùng mới", trích xuất phần sau
        if (user.FullName && user.FullName.includes("Người dùng mới")) {
            const parts = user.FullName.split("Người dùng mới");
            if (parts.length > 1 && parts[1].trim() !== "") {
                return parts[1].trim();
            }
        }
        
        return "Người dùng";
    };
}
/* ========= Notifications ========= */
function initNotifications() {
    console.log('🟡 initNotifications called');
    
    const btn = document.getElementById("community-notify-btn");
    const dropdown = document.getElementById("community-notify-dropdown");
    
    console.log('🔍 Elements:', {
        btn: btn,
        dropdown: dropdown,
        btnExists: !!btn,
        dropdownExists: !!dropdown
    });
    
    if (!btn || !dropdown) {
        console.error('❌ Notification elements not found!');
        
        // Tạo nút thông báo nếu không có
        createNotificationButton();
        return;
    }
    
    console.log('✅ Notification elements found, setting up events...');
    
    btn.addEventListener("click", async (e) => {
        console.log('🟡 Notify button clicked');
        e.stopPropagation();
        
        // Toggle dropdown
        const isOpen = dropdown.classList.contains("open");
        console.log('🔍 Dropdown is open?', isOpen);
        
        if (!isOpen) {
            dropdown.classList.add("open");
            console.log('🟡 Loading notifications...');
            await loadNotifications();
        } else {
            dropdown.classList.remove("open");
            console.log('🟡 Closing notifications');
        }
        
        // Thêm class active cho nút
        btn.classList.toggle('active');
    });
    
    // Đóng dropdown khi click ra ngoài
    document.addEventListener("click", function(e) {
        console.log('🔍 Document click - checking if outside dropdown');
        
        const isButton = btn.contains(e.target);
        const isDropdown = dropdown.contains(e.target);
        
        if (!isButton && !isDropdown) {
            console.log('🟡 Click outside, closing dropdown');
            dropdown.classList.remove("open");
            btn.classList.remove('active');
        }
    });
    
    console.log('✅ Notification events setup complete');
    
    // Tự động load thông báo chưa đọc
    refreshNotificationBadge();
}

// Hàm tạo nút thông báo nếu không có
function createNotificationButton() {
    console.log('🟡 Creating notification button...');
    
    const headerRight = document.querySelector('.community-header-right');
    if (!headerRight) {
        console.error('❌ Cannot find header right section');
        return;
    }
    
    // Tạo nút thông báo
    const notifyBtn = document.createElement('button');
    notifyBtn.id = 'community-notify-btn';
    notifyBtn.className = 'notify-btn';
    notifyBtn.type = 'button';
    notifyBtn.innerHTML = `
        <span class="material-icons">notifications</span>
        <span id="community-notify-badge" class="notify-badge" hidden>0</span>
    `;
    
    // Tạo dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'community-notify-dropdown';
    dropdown.className = 'notify-dropdown';
    
    // Thêm vào DOM
    headerRight.appendChild(notifyBtn);
    headerRight.appendChild(dropdown);
    
    console.log('✅ Created notification button');
    
    // Gọi lại init với elements mới
    setTimeout(() => initNotifications(), 100);
}

async function loadNotifications() {
    const dropdown = document.getElementById("community-notify-dropdown");
    if (!dropdown) return;
    dropdown.innerHTML = `<div class="notify-loading">Đang tải thông báo...</div>`;

    try {
        const res = await fetch(
            `${NOTIFICATION_BASE_URL}/backend/api/community/notifications/list.php`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const noti = data.notifications || [];
        const unread = data.unreadCount || 0;
        updateNotificationBadge(unread);

        if (!noti.length) {
            dropdown.innerHTML = `<div class="notify-empty">Chưa có thông báo nào.</div>`;
            return;
        }

        const itemsHtml = noti.map(renderNotificationItem).join("");
        dropdown.innerHTML = `
        <div class="notify-header">
            <span>Thông báo</span>
            <button type="button" class="notify-markall" onclick="markAllNotificationsRead()">Đánh dấu đã đọc</button>
        </div>
        <div class="notify-list">
            ${itemsHtml}
        </div>
        `;
    } catch (err) {
        dropdown.innerHTML = `<div class="notify-error">Lỗi: ${escapeHtml(
            err.message
        )}</div>`;
    }
}

function renderNotificationItem(n) {
    const actor = n.actor || {};
    const time = n.CreatedAt ? n.CreatedAt.slice(0, 16) : "";
    const isUnread = !n.IsRead;
    let msg = "";
    let icon = "";
    let extraClass = "";
    let clickHandler = "";
    let extraAttrs = "";

    const actorName = escapeHtml(displayName(actor));

    switch (n.Type) {
        case 'post_reported':
            msg = `🚨 ${actorName} đã báo cáo một bài viết.`;
            icon = "⚠️";
            extraClass = "report-notification";
            if (n.PostID) {
                clickHandler = `onclick="handleReportNotification(${n.PostID}, null, 'post')"`;
            }
            break;
            
        case 'comment_reported':
            msg = `🚨 ${actorName} đã báo cáo một bình luận.`;
            icon = "⚠️";
            extraClass = "report-notification";
            if (n.PostID && n.CommentID) {
                clickHandler = `onclick="handleReportNotification(${n.PostID}, ${n.CommentID}, 'comment')"`;
            }
            break;
            
        case 'comment_deleted':
            msg = `🗑️ Bình luận của bạn đã bị xóa bởi quản trị viên.`;
            icon = "🗑️";
            if (n.PostID && n.CommentID) {
                clickHandler = `onclick="window.location.href='${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${n.PostID}'"`;
            }
            break;
            
        case 'user_warned':
            let warningData = {};
            let displayMsg = "⚠️ Bạn đã nhận cảnh cáo từ quản trị viên.";
            
            if (n.Message) {
                try {
                    warningData = JSON.parse(n.Message);
                    displayMsg = warningData.display_message || displayMsg;
                } catch(e) {
                    console.log("⚠️ Message is not JSON, showing directly:", n.Message);
                    displayMsg = n.Message || displayMsg;
                }
            }
            
            const msgLines = displayMsg.split('\n');
            const firstLine = msgLines[0];
            const extraLines = msgLines.slice(1).map(line => 
                `<br><small style="color: #666; display: block; margin-top: 2px;">${escapeHtml(line)}</small>`
            ).join('');
            
            msg = firstLine + extraLines;
            icon = "⚠️";
            extraClass = "warning-notification";
            
            const postId = warningData.post_id || n.PostID;
            const warningId = warningData.warning_id;
            
            if (postId) {
                if (warningId) {
                    clickHandler = `onclick="openPostWithWarning(${postId}, ${warningId})"`;
                } else {
                    clickHandler = `onclick="openPostWithWarning(${postId})"`;
                }
            } else {
                clickHandler = `onclick="showWarningDetails(${warningId || 0})"`;
            }
            break;
                        
        case 'user_banned':
            let banMessage = "⛔ Tài khoản của bạn đã bị cấm.";
            let banData = {};
            
            if (n.Message) {
                try {
                    banData = JSON.parse(n.Message);
                    banMessage = banData.display_message || banMessage;
                    
                    const banId = banData.ban_id || n.NotificationID;
                    extraAttrs = `data-ban-id="${banId}" data-type="user_banned"`;
                } catch(e) {
                    console.log("Message không phải JSON:", n.Message);
                }
            }
            
            const banMsgLines = banMessage.split('\n');
            const firstBanLine = banMsgLines[0];
            const extraBanLines = banMsgLines.slice(1).map(line => 
                `<br><small style="color: #666; display: block; margin-top: 2px;">${escapeHtml(line)}</small>`
            ).join('');
            
            msg = firstBanLine + extraBanLines;
            icon = "⛔";
            extraClass = "ban-notification";
            
            clickHandler = `onclick="if(window.userBanChecker) window.userBanChecker.showBanModal(); if(window.markNotificationAsRead) markNotificationAsRead(${n.NotificationID})"`;
            break;
            
        case 'post_reaction':
            msg = `${actorName} đã bày tỏ cảm xúc về bài viết của bạn.`;
            icon = "👍";
            if (n.PostID) {
                clickHandler = `onclick="window.location.href='${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${n.PostID}'"`;
            }
            break;
            
        // Trong hàm renderNotificationItem, cập nhật các case sau:

        case 'comment':
            msg = `${actorName} đã bình luận về bài viết của bạn.`;
            icon = "💬";
            if (n.PostID) {
                // 🟢 CẬP NHẬT: Thêm notificationId và gọi hàm mới
                clickHandler = `onclick="handleCommentNotificationClick(${n.PostID}, ${n.CommentID || 'null'}, null, ${n.NotificationID})"`;
                extraAttrs += ` data-post-id="${n.PostID}" data-comment-id="${n.CommentID || ''}" data-notification-id="${n.NotificationID}"`;
            }
            break;
            
        case 'comment_reaction':
            msg = `${actorName} đã bày tỏ cảm xúc về bình luận của bạn.`;
            icon = "❤️";
            if (n.PostID && n.CommentID) {
                // 🟢 CẬP NHẬT: Dùng hàm riêng cho comment reaction
                clickHandler = `onclick="handleCommentReactionNotificationClick(${n.PostID}, ${n.CommentID}, ${n.NotificationID})"`;
                extraAttrs += ` data-post-id="${n.PostID}" data-comment-id="${n.CommentID}" data-notification-id="${n.NotificationID}"`;
            }
            break;
            
        // 🟢 THÊM CASE MỚI CHO COMMENT REPLY
        case 'comment_reply':
            msg = `${actorName} đã trả lời bình luận của bạn.`;
            icon = "↩️";
            extraClass = "reply-notification";
            
            // 🟢 QUAN TRỌNG: Lấy parent comment ID từ message hoặc database
            let parentCommentId = null;
            if (n.Message) {
                try {
                    const messageData = JSON.parse(n.Message);
                    parentCommentId = messageData.parent_comment_id || null;
                } catch(e) {
                    console.log("⚠️ Message không phải JSON:", n.Message);
                }
            }
            
            if (n.PostID && n.CommentID) {
                // Nếu có parentCommentId, truyền cả parentId
                clickHandler = `onclick="handleCommentNotificationClick(${n.PostID}, ${n.CommentID}, ${parentCommentId || 'null'}, ${n.NotificationID})"`;
                extraAttrs += ` data-post-id="${n.PostID}" data-comment-id="${n.CommentID}" data-parent-comment-id="${parentCommentId || ''}" data-notification-id="${n.NotificationID}"`;
            }
            break;
            
        case 'follow':
            msg = `${actorName} đã bắt đầu theo dõi bạn.`;
            icon = "👤";
            if (actor.Username) {
                clickHandler = `onclick="openUserProfile('${actor.Username}')"`;
            }
            break;
            
        // ⭐⭐ THÊM CASE NÀY CHO KHIẾU NẠI LỆNH CẤM ⭐⭐
        case 'ban_appeal':
            msg = `📣 Người dùng <strong>${actorName}</strong> đã khiếu nại lệnh cấm.`;
            icon = "📣";
            extraClass = "appeal-notification";
            
            // Extract ban_id từ message nếu có
            if (n.Message) {
                const banIdMatch = n.Message.match(/lệnh cấm #(\d+)/);
                if (banIdMatch && banIdMatch[1]) {
                    const banId = banIdMatch[1];
                    clickHandler = `onclick="viewBanAppeal(${banId}, ${n.NotificationID})"`;
                    extraAttrs = `data-ban-id="${banId}" data-notification-id="${n.NotificationID}"`;
                } else {
                    // Fallback: mở trang quản lý khiếu nại
                    clickHandler = `onclick="viewAllAppeals()"`;
                }
            } else {
                // Nếu không có message, mở trang danh sách
                clickHandler = `onclick="viewAllAppeals()"`;
            }
            
            // Thêm data attribute để debug
            extraAttrs += ` data-type="ban_appeal"`;
            break;
            
        default:
            // Nếu có message từ database, dùng message đó
            if (n.Message && n.Message.trim() !== '') {
                msg = n.Message;
                icon = "🔔";
                
                // Kiểm tra nếu là notification khiếu nại nhưng Type không đúng
                if (n.Message.includes('khiếu nại') || n.Message.includes('lệnh cấm')) {
                    extraClass = "appeal-notification";
                    icon = "📣";
                    
                    // Tìm ban_id trong message
                    const banIdMatch = n.Message.match(/#(\d+)/);
                    if (banIdMatch && banIdMatch[1]) {
                        const banId = banIdMatch[1];
                        clickHandler = `onclick="viewBanAppeal(${banId}, ${n.NotificationID})"`;
                        extraAttrs = `data-ban-id="${banId}" data-notification-id="${n.NotificationID}"`;
                    }
                }
            } else {
                msg = `${actorName} vừa tương tác với bạn.`;
                icon = "🔔";
            }
    }

    return `
    <div class="notify-item ${isUnread ? "unread" : ""} ${extraClass}" ${clickHandler} ${extraAttrs}>
        <div class="notify-avatar">
            <div class="avatar-circle small">${icon}</div>
        </div>
        <div class="notify-body">
            <div class="notify-text">${msg}</div>
            <div class="notify-time">${escapeHtml(time)}</div>
        </div>
        ${isUnread ? `<div class="notify-dot"></div>` : ''}
    </div>`;
}
// Thêm các hàm xử lý khiếu nại vào global scope
if (typeof window !== 'undefined') {
    window.viewBanAppeal = async function(banId, notificationId = null) {
        console.log(`🟡 Viewing ban appeal #${banId}`);
        
        // Đánh dấu đã đọc nếu có notificationId
        if (notificationId && window.markNotificationAsRead) {
            await window.markNotificationAsRead(notificationId);
        }
        
        // Mở modal xem chi tiết khiếu nại
        await window.showAppealDetailsModal(banId);
    };
    
    window.viewAllAppeals = function() {
        console.log('🟡 Viewing all appeals');
        window.location.href = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/community/admin/ban_appeals.php`;
    };
    
    window.showAppealDetailsModal = async function(banId) {
        try {
            const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
            
            // Tạo modal
            const modal = document.createElement('div');
            modal.className = 'appeal-modal-overlay';
            modal.innerHTML = `
                <div class="appeal-modal">
                    <div class="appeal-modal-header">
                        <span class="material-icons">gavel</span>
                        <h3>📣 Chi tiết khiếu nại</h3>
                        <button class="appeal-modal-close" onclick="window.closeAppealModal && window.closeAppealModal()">×</button>
                    </div>
                    <div class="appeal-modal-body">
                        <div class="appeal-loading">
                            <div style="text-align: center; padding: 20px;">
                                <div class="spinner" style="margin: 0 auto 15px;"></div>
                                <p>Đang tải thông tin khiếu nại...</p>
                            </div>
                        </div>
                    </div>
                    <div class="appeal-modal-footer">
                        <button class="btn btn-secondary" onclick="window.closeAppealModal && window.closeAppealModal()">Đóng</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            // Load dữ liệu khiếu nại
            await loadAppealDetails(banId, modal);
            
        } catch (error) {
            console.error('Error showing appeal modal:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    };
    
    window.closeAppealModal = function() {
        const modal = document.querySelector('.appeal-modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    };
    
    window.processAppeal = async function(banId, action) {
        const actionText = action === 'approve' ? 'duyệt' : 'từ chối';
        
        if (!confirm(`Bạn có chắc muốn ${actionText} khiếu nại #${banId}?`)) {
            return;
        }
        
        try {
            const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
            const response = await fetch(`${baseUrl}/backend/api/community/admin/process_appeal.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `ban_id=${banId}&action=${action}`
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`✅ Đã ${actionText} khiếu nại thành công`);
                window.closeAppealModal();
                
                // Reload notifications
                if (window.loadNotifications) {
                    setTimeout(() => window.loadNotifications(), 500);
                }
            } else {
                alert(`❌ Lỗi: ${data.error || 'Không thể xử lý'}`);
            }
        } catch (error) {
            console.error('Error processing appeal:', error);
            alert('❌ Lỗi kết nối');
        }
    };
    
    window.viewOriginalBan = function(banId) {
        window.location.href = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/community/admin/user_bans.php?ban_id=${banId}`;
    };
    
    window.removeBan = async function(banId) {
        if (!confirm('Bạn có chắc muốn mở chặn ngay lập tức? Hành động này không thể hoàn tác.')) {
            return;
        }
        
        try {
            const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
            const response = await fetch(`${baseUrl}/backend/api/community/admin/remove_ban.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `ban_id=${banId}`
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ Đã mở chặn thành công');
                window.closeAppealModal();
                
                // Reload notifications
                if (window.loadNotifications) {
                    setTimeout(() => window.loadNotifications(), 500);
                }
            } else {
                alert(`❌ Lỗi: ${data.error || 'Không thể mở chặn'}`);
            }
        } catch (error) {
            console.error('Error removing ban:', error);
            alert('❌ Lỗi kết nối');
        }
    };
}

/**
 * Load chi tiết khiếu nại từ server
 */
async function loadAppealDetails(banId, modal) {
    try {
        const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
        const response = await fetch(`${baseUrl}/backend/api/community/admin/get_appeal.php?ban_id=${banId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const modalBody = modal.querySelector('.appeal-modal-body');
        
        if (data.success && data.data && data.data.appeal) {
            const appeal = data.data.appeal;
            const user = data.data.user || {};
            
            // Tính thời gian còn lại
            const expiresAt = appeal.ExpiresAt || new Date(Date.now() + appeal.BanDuration * 24 * 60 * 60 * 1000);
            const now = new Date();
            const expireDate = new Date(expiresAt);
            const diffTime = expireDate - now;
            const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const remainingHours = Math.ceil((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            const html = `
                <div class="appeal-info">
                    <div class="appeal-field">
                        <strong>Mã khiếu nại:</strong>
                        <span class="appeal-code">#APPEAL-${appeal.BanID}</span>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Người khiếu nại:</strong>
                        <div class="appeal-user-info">
                            <strong>${window.escapeHtml(user.FullName || user.Username || 'Người dùng')}</strong>
                            <div style="margin-top: 5px; font-size: 14px;">
                                <span class="badge">ID: ${appeal.UserID}</span>
                                ${user.Email ? `<span class="badge">Email: ${user.Email}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Lý do khiếu nại:</strong>
                        <div class="appeal-reason-box">${window.escapeHtml(appeal.AppealReason || 'Không có')}</div>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Lý do bị cấm:</strong>
                        <div class="ban-reason-box">${window.escapeHtml(appeal.Reason || 'Không có')}</div>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Loại cấm:</strong>
                        <span class="ban-type-badge ${appeal.BanType}">
                            ${appeal.BanType === 'comment_only' ? 'Chỉ bình luận' : 
                              appeal.BanType === 'post_only' ? 'Chỉ đăng bài' : 
                              'Toàn bộ cộng đồng'}
                        </span>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Thời hạn cấm:</strong>
                        <div>
                            <strong>${appeal.BanDuration} ngày</strong>
                            ${remainingDays > 0 ? 
                                `<small class="ban-remaining">(Còn lại: ${remainingDays} ngày ${remainingHours} giờ)</small>` : 
                                `<small class="ban-remaining" style="color: #f44336;">(Đã hết hạn)</small>`}
                        </div>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Trạng thái khiếu nại:</strong>
                        <span class="appeal-status status-${appeal.AppealStatus || 'pending'}">
                            ${getAppealStatusText(appeal.AppealStatus)}
                        </span>
                    </div>
                    
                    ${appeal.AppealSubmittedAt ? `
                    <div class="appeal-field">
                        <strong>Thời gian khiếu nại:</strong>
                        <span>${formatDate(appeal.AppealSubmittedAt)}</span>
                    </div>
                    ` : ''}
                    
                    ${appeal.AppealResponse ? `
                    <div class="appeal-field">
                        <strong>Phản hồi của quản trị viên:</strong>
                        <div class="appeal-response-box">${window.escapeHtml(appeal.AppealResponse)}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="appeal-actions">
                    ${appeal.AppealStatus !== 'approved' && appeal.AppealStatus !== 'rejected' ? `
                    <button class="btn btn-primary" onclick="window.processAppeal && window.processAppeal(${banId}, 'approve')">
                        <span class="material-icons">check</span>
                        Duyệt khiếu nại
                    </button>
                    <button class="btn btn-warning" onclick="window.processAppeal && window.processAppeal(${banId}, 'reject')">
                        <span class="material-icons">close</span>
                        Từ chối
                    </button>
                    ` : ''}
                    
                    <button class="btn btn-info" onclick="window.viewOriginalBan && window.viewOriginalBan(${banId})">
                        <span class="material-icons">visibility</span>
                        Xem lệnh cấm gốc
                    </button>
                    
                    ${appeal.AppealStatus === 'approved' ? `
                    <button class="btn btn-success" onclick="window.removeBan && window.removeBan(${banId})">
                        <span class="material-icons">lock_open</span>
                        Mở chặn ngay
                    </button>
                    ` : ''}
                </div>
            `;
            
            modalBody.innerHTML = html;
            
        } else {
            modalBody.innerHTML = `
                <div class="appeal-error">
                    <p>❌ Không thể tải thông tin khiếu nại</p>
                    <p>${data.error || 'Lỗi không xác định'}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading appeal details:', error);
        const modalBody = modal.querySelector('.appeal-modal-body');
        modalBody.innerHTML = `
            <div class="appeal-error">
                <p>❌ Lỗi tải dữ liệu</p>
                <p>${window.escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Lấy text trạng thái khiếu nại
 */
function getAppealStatusText(status) {
    const statusMap = {
        'none': '❌ Chưa khiếu nại',
        'pending': '⏳ Đang chờ xử lý',
        'approved': '✅ Đã duyệt',
        'rejected': '🚫 Đã từ chối',
        'reviewed': '👁️ Đã xem xét'
    };
    return statusMap[status] || status;
}

/**
 * Định dạng ngày tháng
 */
function formatDate(dateString) {
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
/**
 * Hàm mở chặn ngay lập tức
 */
window.removeBan = async function(banId) {
    if (!confirm('Bạn có chắc muốn mở chặn ngay lập tức? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    try {
        const baseUrl = window.BASE_URL || '/HeThongChamSocCaKoi';
        const response = await fetch(`${baseUrl}/backend/api/community/admin/remove_ban.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `ban_id=${banId}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã mở chặn thành công');
            window.closeAppealModal();
            
            // Reload notifications
            if (window.loadNotifications) {
                setTimeout(() => window.loadNotifications(), 500);
            }
        } else {
            alert(`❌ Lỗi: ${data.error || 'Không thể mở chặn'}`);
        }
    } catch (error) {
        console.error('Error removing ban:', error);
        alert('❌ Lỗi kết nối');
    }
};

/**
 * Hàm mở profile người dùng
 */
function openPostWithWarning(postId, warningId = null) {
    console.log('🟡 Opening post with warning:', postId, warningId);
    
    // Tạo URL với tham số warning
    let url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
    
    if (warningId && warningId > 0) {
        url += `&warning=${warningId}`;
    } else {
        url += `&show_warning=1`;
    }
    
    console.log('🟡 URL:', url);
    
    // Mở trang bài viết
    window.location.href = url;
}

async function markWarningAsRead(warningId) {
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/admin/mark_warning_read.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `warning_id=${warningId}`
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error marking warning as read:', error);
        return false;
    }
}

/**
 * Xử lý khi click vào thông báo cảnh cáo
 */
function handleWarningNotification(postId, warningId) {
    console.log(`🟡 Xem chi tiết cảnh cáo ${warningId} cho bài viết ${postId}`);
    
    // Đánh dấu thông báo đã đọc
    markWarningAsRead(warningId);
    
    // Mở bài viết liên quan
    if (postId) {
        const url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}&warning=${warningId}`;
        window.location.href = url;
    } else {
        showWarningDetails(warningId);
    }
}

/**
 * Hiển thị chi tiết cảnh cáo trong modal
 */
function showWarningDetails(warningId) {
    // Tạo modal hiển thị chi tiết cảnh cáo
    const modal = document.createElement('div');
    modal.className = 'warning-modal-overlay';
    modal.innerHTML = `
        <div class="warning-modal">
            <div class="warning-modal-header">
                <span class="material-icons" style="color: #ff9800; font-size: 24px;">warning</span>
                <h3>Chi tiết cảnh cáo</h3>
                <button class="warning-modal-close" onclick="closeWarningModal()">×</button>
            </div>
            <div class="warning-modal-body">
                <div class="warning-loading">Đang tải chi tiết cảnh cáo...</div>
            </div>
            <div class="warning-modal-footer">
                <button class="btn btn-primary" onclick="closeWarningModal()">Đã hiểu</button>
                <button class="btn btn-secondary" onclick="acknowledgeWarning(${warningId})">
                    Xác nhận đã đọc
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Load chi tiết cảnh cáo từ server
    loadWarningDetails(warningId, modal);
}

/**
 * Load chi tiết cảnh cáo từ server
 */
async function loadWarningDetails(warningId, modal) {
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/admin/get_warning.php?warning_id=${warningId}`);
        const data = await response.json();
        
        if (data.success) {
            const warning = data.warning;
            const modalBody = modal.querySelector('.warning-modal-body');
            
            let html = `
                <div class="warning-info">
                    <div class="warning-field">
                        <strong>Lý do:</strong>
                        <p>${escapeHtml(warning.Reason)}</p>
                    </div>
                    
                    <div class="warning-field">
                        <strong>Mức độ nghiêm trọng:</strong>
                        <span class="warning-severity severity-${warning.Severity}">
                            ${getSeverityText(warning.Severity)}
                        </span>
                    </div>
                    
                    <div class="warning-field">
                        <strong>Thời hạn:</strong>
                        <span>${formatDate(warning.ExpiresAt)}</span>
                    </div>
                    
                    <div class="warning-field">
                        <strong>Người cảnh cáo:</strong>
                        <span>${escapeHtml(warning.AdminName)}</span>
                    </div>
                    
                    <div class="warning-field">
                        <strong>Thời gian:</strong>
                        <span>${formatDate(warning.CreatedAt)}</span>
                    </div>
                </div>
            `;
            
            // Nếu có liên kết bài viết
            if (warning.PostID) {
                html += `
                    <div class="warning-post-link">
                        <button class="btn btn-outline" onclick="viewRelatedPost(${warning.PostID})">
                            <span class="material-icons">article</span>
                            Xem bài viết liên quan
                        </button>
                    </div>
                `;
            }
            
            modalBody.innerHTML = html;
            
        } else {
            throw new Error(data.error || 'Không thể tải chi tiết cảnh cáo');
        }
    } catch (error) {
        console.error('Error loading warning details:', error);
        const modalBody = modal.querySelector('.warning-modal-body');
        modalBody.innerHTML = `<div class="warning-error">Lỗi: ${escapeHtml(error.message)}</div>`;
    }
}

/**
 * Đánh dấu cảnh cáo đã đọc
 */
async function acknowledgeWarning(warningId) {
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/admin/acknowledge_warning.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `warning_id=${warningId}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Đã xác nhận cảnh cáo');
            closeWarningModal();
            
            // Reload notifications
            if (window.loadNotifications) {
                window.loadNotifications();
            }
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể xác nhận'));
        }
    } catch (error) {
        console.error('Error acknowledging warning:', error);
        alert('❌ Lỗi kết nối');
    }
}

/**
 * Đóng modal cảnh cáo
 */
function closeWarningModal() {
    const modal = document.querySelector('.warning-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

/**
 * Xem bài viết liên quan
 */
function viewRelatedPost(postId) {
    const url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
    window.location.href = url;
}

/**
 * Lấy text cho mức độ nghiêm trọng
 */
function getSeverityText(severity) {
    const map = {
        'low': 'Thấp',
        'medium': 'Trung bình',
        'high': 'Cao',
        'critical': 'Rất cao'
    };
    return map[severity] || severity;
}

/**
 * Định dạng ngày tháng
 */
function formatDate(dateString) {
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

function handleReportNotification(postId, commentId = null, type = 'post') {
    console.log(`🟡 Admin xem báo cáo ${type} ${commentId ? 'comment' : 'post'} ${postId}`);
    
    // 1. Đánh dấu thông báo đã đọc
    if (commentId) {
        markReportNotificationAsRead(commentId, 'comment_reported');
    } else {
        markReportNotificationAsRead(postId, 'post_reported');
    }
    
    // 2. Chuyển đến trang bài viết với highlight
    if (type === 'post') {
        // Chỉ là báo cáo bài viết
        const url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}&admin_view=1`;
        window.location.href = url;
    } else {
        // Báo cáo comment
        const url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}&highlight=${commentId}&admin_view=1`;
        window.location.href = url;
    }
}

// Kiểm tra URL parameter để tự động highlight comment
function checkHighlightComment() {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    const adminView = urlParams.get('admin_view');
    
    if (highlightId && adminView && isAdmin()) {
        // Chờ comment load xong
        setTimeout(() => {
            const commentElement = document.getElementById(`comment-${highlightId}`);
            if (commentElement) {
                // Scroll đến comment
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight comment
                commentElement.classList.add('comment-reported');
                
                // Tự động mở panel admin
                if (typeof showAdminPanel === 'function') {
                    showAdminPanel(highlightId);
                }
                
                // Đánh dấu thông báo đã đọc
                markReportNotificationAsRead(highlightId);
            }
        }, 1500);
    }
}

// Thêm nút "Xem báo cáo" cho các comment
function addAdminViewButtons() {
    // Thêm vào mỗi comment
    setTimeout(() => {
        document.querySelectorAll('.comment-item').forEach(comment => {
            const commentId = comment.id.replace('comment-', '');
            if (commentId && !comment.querySelector('.admin-view-btn')) {
                const btn = document.createElement('button');
                btn.className = 'admin-view-btn';
                btn.innerHTML = '👁️';
                btn.title = 'Xem báo cáo (Admin)';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    showAdminPanel(commentId);
                };
                comment.appendChild(btn);
            }
        });
    }, 2000);
}

// Thêm vào community-notifications.js (nếu chưa có)
function handleNotificationClick(postId, commentId) {
    if (commentId && commentId !== 'null') {
        // Mở bài viết và scroll đến comment cụ thể
        window.location.href = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}&comment=${commentId}`;
    } else {
        window.location.href = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
    }
}

// Hàm đánh dấu thông báo đã đọc
function markNotificationAsRead(notificationId) {
    if (!notificationId) return;
    
    fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/notifications/mark_read.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `notification_id=${notificationId}`
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Đã đánh dấu notification đã đọc:', notificationId);
            // Cập nhật UI nếu cần
            const notificationItem = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.classList.remove('unread');
                const dot = notificationItem.querySelector('.notify-dot');
                if (dot) dot.remove();
            }
        }
    })
    .catch(console.error);
}
function updateNotificationBadge(unread) {
    const badge = document.getElementById("community-notify-badge");
    if (!badge) return;
    if (unread > 0) {
        badge.hidden = false;
        badge.textContent = unread > 9 ? "9+" : String(unread);
    } else {
        badge.hidden = true;
    }
}

async function refreshNotificationBadge() {
    try {
        const res = await fetch(
            `${NOTIFICATION_BASE_URL}/backend/api/community/notifications/list.php?summary=1`
        );
        const data = await res.json();
        if (data.error) return;
        updateNotificationBadge(data.unreadCount || 0);
    } catch (e) {
        // im lặng
    }
}

async function markAllNotificationsRead() {
    try {
        const res = await fetch(
            `${NOTIFICATION_BASE_URL}/backend/api/community/notifications/mark_read.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: "all=1",
            }
        );
        const data = await res.json();
        if (!data.success)
            throw new Error(data.error || "Không thể cập nhật thông báo.");
        await loadNotifications();
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}
async function handleCommentNotificationClick(postId, commentId = null, parentCommentId = null, notificationId = null) {
    console.log('🟡 Handling comment notification click:', { postId, commentId, parentCommentId, notificationId });
    
    // 1. Đánh dấu thông báo đã đọc nếu có notificationId
    if (notificationId && window.markNotificationAsRead) {
        await window.markNotificationAsRead(notificationId);
    }
    
    // 2. Xây dựng URL cho post detail
    let url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
    
    // 3. Thêm tham số comment để auto-scroll
    if (commentId) {
        // Nếu có commentId, thêm vào URL để trang post_detail biết cần scroll đến comment nào
        url += `&comment=${commentId}`;
        
        // Nếu là reply (có parentCommentId), thêm highlight để nhấn mạnh
        if (parentCommentId && parentCommentId !== commentId) {
            url += `&highlight=${commentId}`;
        }
    }
    
    console.log('🔗 Redirecting to:', url);
    
    // 4. Lưu thông tin vào sessionStorage để trang post_detail biết cần xử lý gì
    if (notificationId) {
        sessionStorage.setItem('pendingCommentNotification', JSON.stringify({
            postId: postId,
            commentId: commentId,
            notificationId: notificationId,
            timestamp: Date.now()
        }));
    }
    
    // 5. Chuyển hướng
    window.location.href = url;
}
async function handleCommentReactionNotificationClick(postId, commentId, notificationId = null) {
    console.log('🟡 Handling comment reaction notification:', { postId, commentId, notificationId });
    
    // Đánh dấu đã đọc
    if (notificationId && window.markNotificationAsRead) {
        await window.markNotificationAsRead(notificationId);
    }
    
    // Tạo URL
    const url = `${NOTIFICATION_BASE_URL}/frontend/community/post_detail.php?id=${postId}&comment=${commentId}`;
    
    // Lưu vào sessionStorage
    if (notificationId) {
        sessionStorage.setItem('pendingCommentNotification', JSON.stringify({
            postId: postId,
            commentId: commentId,
            notificationId: notificationId,
            isReaction: true,
            timestamp: Date.now()
        }));
    }
    
    console.log('🔗 Redirecting to:', url);
    window.location.href = url;
}

// Export functions
if (typeof window !== 'undefined') {
    window.handleCommentNotificationClick = handleCommentNotificationClick;
    window.handleCommentReactionNotificationClick = handleCommentReactionNotificationClick;
}
// Trong hàm loadNotifications() hoặc renderNotificationItem():
function markNotificationAsAcknowledged(notificationId) {
    // Gọi API đánh dấu notification đã đọc
    fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/notifications/mark_read.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `notification_id=${notificationId}`
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Đã đánh dấu notification đã đọc');
        }
    })
    .catch(console.error);
}

// Thêm hàm markReportNotificationAsRead vào đây
async function markReportNotificationAsRead(commentId, type = 'comment_reported') {
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('type', type);
        
        const res = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/notifications/mark_read.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            console.log(`✅ Đã đánh dấu thông báo báo cáo cho comment ${commentId} là đã đọc`);
            // Cập nhật badge notification
            if (window.refreshNotificationBadge) {
                window.refreshNotificationBadge();
            }
        } else {
            console.warn('⚠️ Không thể đánh dấu thông báo:', data.error);
        }
        
        return data.success;
        
    } catch (err) {
        console.error('❌ Lỗi đánh dấu thông báo:', err);
        return false;
    }
}

// Export functions to global scope
if (typeof window !== 'undefined') {
    // Export các hàm notifications chính
    window.initNotifications = initNotifications;
    window.loadNotifications = loadNotifications;
    window.refreshNotificationBadge = refreshNotificationBadge;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.updateNotificationBadge = updateNotificationBadge;
    
    // Export các hàm xử lý báo cáo
    window.handleReportNotification = handleReportNotification;
    window.checkHighlightComment = checkHighlightComment;
    window.addAdminViewButtons = addAdminViewButtons;
    window.markReportNotificationAsRead = markReportNotificationAsRead;
    
    // Export các hàm cảnh cáo
    window.handleWarningNotification = handleWarningNotification;
    window.showWarningDetails = showWarningDetails;
    window.closeWarningModal = closeWarningModal;
    window.acknowledgeWarning = acknowledgeWarning;
    window.viewRelatedPost = viewRelatedPost;
    window.markWarningAsRead = markWarningAsRead;
    window.openPostWithWarning = openPostWithWarning;
    
    // Thêm các hàm utility
    window.escapeHtml = escapeHtml || function(text) {
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
    };
    
    window.displayName = displayName || function(user) {
        if (!user || typeof user !== 'object') return "Người dùng";
        if (user.Username && user.Username.trim() !== "" && user.Username !== "undefined") {
            return user.Username;
        }
        if (user.FullName && user.FullName.trim() !== "" && 
            !user.FullName.includes("Người dùng mới") &&
            !user.FullName.includes("New User")) {
            return user.FullName;
        }
        if (user.FullName && user.FullName.includes("Người dùng mới")) {
            const parts = user.FullName.split("Người dùng mới");
            if (parts.length > 1 && parts[1].trim() !== "") {
                return parts[1].trim();
            }
        }
        return "Người dùng";
    };
    
    // Thêm hàm isAdmin nếu chưa có
    window.isAdmin = isAdmin || function() {
        return window.CURRENT_USER_ROLE && window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
    };
    
    console.log('✅ Notifications module loaded');
}

// Khởi tạo khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo thông báo - CHỈ KHI CÓ NÚT THÔNG BÁO
    const notifyBtn = document.getElementById("community-notify-btn");
    if (notifyBtn && typeof initNotifications === 'function') {
        initNotifications();
    }
});
// Thêm vào community-notifications.js (sau hàm renderNotificationItem)

/**
 * Xem chi tiết khiếu nại
 */
function viewBanAppeal(banId, notificationId = null) {
    console.log(`🟡 Viewing ban appeal #${banId}`);
    
    // 1. Đánh dấu đã đọc nếu có notificationId
    if (notificationId) {
        markNotificationAsRead(notificationId);
    }
    
    // 2. Mở modal xem chi tiết khiếu nại
    showAppealDetailsModal(banId);
}

/**
 * Xem tất cả khiếu nại
 */
function viewAllAppeals() {
    console.log('🟡 Viewing all appeals');
    window.location.href = `${NOTIFICATION_BASE_URL}/frontend/community/ban_appeals.php`;
}

/**
 * Hiển thị modal chi tiết khiếu nại
 */
async function showAppealDetailsModal(banId) {
    try {
        // Hiển thị loading
        const modal = document.createElement('div');
        modal.className = 'appeal-modal-overlay';
        modal.innerHTML = `
            <div class="appeal-modal">
                <div class="appeal-modal-header">
                    <span class="material-icons">gavel</span>
                    <h3>Chi tiết khiếu nại</h3>
                    <button class="appeal-modal-close" onclick="closeAppealModal()">×</button>
                </div>
                <div class="appeal-modal-body">
                    <div class="appeal-loading">Đang tải thông tin khiếu nại...</div>
                </div>
                <div class="appeal-modal-footer">
                    <button class="btn btn-secondary" onclick="closeAppealModal()">Đóng</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Load dữ liệu khiếu nại
        await loadAppealDetails(banId, modal);
        
    } catch (error) {
        console.error('Error showing appeal modal:', error);
        alert('Lỗi tải thông tin khiếu nại');
    }
}

/**
 * Load chi tiết khiếu nại từ server
 */
async function loadAppealDetails(banId, modal) {
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/admin/get_appeal.php?ban_id=${banId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const modalBody = modal.querySelector('.appeal-modal-body');
        
        if (data.success && data.appeal) {
            const appeal = data.appeal;
            const user = data.user || {};
            const admin = data.admin || {};
            
            let html = `
                <div class="appeal-info">
                    <div class="appeal-field">
                        <strong>Mã khiếu nại:</strong>
                        <span class="appeal-code">#APPEAL-${appeal.BanID}</span>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Người khiếu nại:</strong>
                        <span class="appeal-user" onclick="openUserProfile('${user.Username || ''}')">
                            ${escapeHtml(user.FullName || user.Username || 'Người dùng')}
                        </span>
                        <small>(ID: ${appeal.UserID})</small>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Lý do khiếu nại:</strong>
                        <div class="appeal-reason-box">${escapeHtml(appeal.AppealReason || 'Không có')}</div>
                    </div>
                    
                    <div class="appeal-field">
                        <strong>Trạng thái:</strong>
                        <span class="appeal-status status-${appeal.AppealStatus}">
                            ${getAppealStatusText(appeal.AppealStatus)}
                        </span>
                    </div>
                    
                    ${appeal.AppealSubmittedAt ? `
                    <div class="appeal-field">
                        <strong>Thời gian khiếu nại:</strong>
                        <span>${formatDate(appeal.AppealSubmittedAt)}</span>
                    </div>
                    ` : ''}
                    
                    ${appeal.AppealResponse ? `
                    <div class="appeal-field">
                        <strong>Phản hồi của quản trị viên:</strong>
                        <div class="appeal-response-box">${escapeHtml(appeal.AppealResponse)}</div>
                    </div>
                    ` : ''}
                    
                    ${appeal.AppealReviewedAt && admin.FullName ? `
                    <div class="appeal-field">
                        <strong>Người xử lý:</strong>
                        <span>${escapeHtml(admin.FullName)}</span>
                        <small>(${formatDate(appeal.AppealReviewedAt)})</small>
                    </div>
                    ` : ''}
                </div>
                
                <div class="appeal-actions">
                    <button class="btn btn-primary" onclick="processAppeal(${banId}, 'approve')">
                        <span class="material-icons">check</span>
                        Duyệt khiếu nại
                    </button>
                    <button class="btn btn-warning" onclick="processAppeal(${banId}, 'reject')">
                        <span class="material-icons">close</span>
                        Từ chối
                    </button>
                    <button class="btn btn-info" onclick="viewOriginalBan(${banId})">
                        <span class="material-icons">visibility</span>
                        Xem lệnh cấm
                    </button>
                </div>
            `;
            
            modalBody.innerHTML = html;
            
        } else {
            modalBody.innerHTML = `
                <div class="appeal-error">
                    <p>❌ Không thể tải thông tin khiếu nại</p>
                    <p>${data.error || 'Lỗi không xác định'}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading appeal details:', error);
        const modalBody = modal.querySelector('.appeal-modal-body');
        modalBody.innerHTML = `
            <div class="appeal-error">
                <p>❌ Lỗi tải dữ liệu</p>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Đóng modal khiếu nại
 */
function closeAppealModal() {
    const modal = document.querySelector('.appeal-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

/**
 * Lấy text trạng thái khiếu nại
 */
function getAppealStatusText(status) {
    const statusMap = {
        'none': 'Chưa khiếu nại',
        'pending': 'Đang chờ xử lý',
        'reviewed': 'Đã xem xét',
        'approved': 'Đã duyệt',
        'rejected': 'Đã từ chối'
    };
    return statusMap[status] || status;
}

/**
 * Xử lý khiếu nại (duyệt/từ chối)
 */
async function processAppeal(banId, action) {
    const actionText = action === 'approve' ? 'duyệt' : 'từ chối';
    
    if (!confirm(`Bạn có chắc muốn ${actionText} khiếu nại này?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${NOTIFICATION_BASE_URL}/backend/api/community/admin/process_appeal.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `ban_id=${banId}&action=${action}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Đã ${actionText} khiếu nại thành công`);
            closeAppealModal();
            
            // Reload notifications
            if (window.loadNotifications) {
                await window.loadNotifications();
            }
        } else {
            alert(`❌ Lỗi: ${data.error || 'Không thể xử lý'}`);
        }
    } catch (error) {
        console.error('Error processing appeal:', error);
        alert('❌ Lỗi kết nối');
    }
}

/**
 * Xem lệnh cấm gốc
 */
function viewOriginalBan(banId) {
    window.location.href = `${NOTIFICATION_BASE_URL}/frontend/community/admin/user_bans.php?ban_id=${banId}`;
}

// Export functions to global scope
if (typeof window !== 'undefined') {
    window.viewBanAppeal = viewBanAppeal;
    window.viewAllAppeals = viewAllAppeals;
    window.showAppealDetailsModal = showAppealDetailsModal;
    window.closeAppealModal = closeAppealModal;
    window.processAppeal = processAppeal;
    window.viewOriginalBan = viewOriginalBan;
}