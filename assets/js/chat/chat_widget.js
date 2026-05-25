/**
 * CHAT WIDGET LOGIC - FIXED: DISPLAY & MODAL
 * Path: /HeThongChamSocCaKoi/assets/js/chat/chat_widget.js
 */

console.log("%c--- CHAT WIDGET LOADED (DISPLAY FIXED) ---", "background: #0891b2; color: white; padding: 4px;");

const CONFIG = {
    BASE_URL: '/HeThongChamSocCaKoi/backend/api/chat',
    DEFAULT_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ij48L2NpcmNsZT48cGF0aCBkPSJNMjAgMjF2LTIgYSA0IDQgMCAwIDAtNC00SThhNCA0IDAgMCAwLTQtNHYyIj48L3BhdGg+PC9zdmc+',
    SOUND_URL: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    MAX_FILE_SIZE: 50 * 1024 * 1024
};

// ĐỔI TÊN state -> chatState ĐỂ TRÁNH TRÙNG LẶP
let chatState = {
    currentPartnerId: 0,
    chatInterval: null,
    inboxInterval: null,
    isChatOpen: false,
    lastMsgCount: 0,
    selectedFiles: [],
    fileCounter: 0,
    activeMenuId: null,
    pendingRecallMsgId: null // ID tin nhắn đang chờ xác nhận thu hồi
};

const notiSound = new Audio(CONFIG.SOUND_URL);

// --- TOAST NOTIFICATION SYSTEM ---
window.showToast = (message, type = 'info') => {
    let container = document.getElementById('chat-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chat-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `chat-toast ${type}`;
    
    let icon = '';
    if (type === 'success') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    else if (type === 'error') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    else icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300); 
    }, 3000);
};

// --- HELPER FUNCTIONS ---
const getFileIcon = (fileName) => {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
        zip: '📦', rar: '📦', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', 
        mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
        mp3: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵'
    };
    return icons[ext] || '📎';
};

const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return "";
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const formatTime = (dateString) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
};

const playNotificationSound = () => {
    try { notiSound.currentTime = 0; notiSound.play().catch(() => {}); } catch (e) {}
};

// --- FILE HANDLING ---
window.handleFileSelection = (event) => {
    const files = event.target.files;
    if (!files.length) return;
    Array.from(files).forEach(file => {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            showToast(`File ${file.name} quá lớn (Max 50MB).`, 'error');
            return;
        }
        file.uniqueId = chatState.fileCounter++;
        chatState.selectedFiles.push(file);
    });
    updateAttachmentsPreview();
    event.target.value = null; 
};

window.removeFile = (fileId) => {
    chatState.selectedFiles = chatState.selectedFiles.filter(f => f.uniqueId !== fileId);
    updateAttachmentsPreview();
};

const updateAttachmentsPreview = () => {
    const previewArea = document.getElementById('attachments-preview');
    if (!previewArea) return;
    if (chatState.selectedFiles.length === 0) {
        previewArea.innerHTML = '';
        previewArea.style.display = 'none';
        return;
    }
    previewArea.style.display = 'flex';
    previewArea.innerHTML = chatState.selectedFiles.map(file => `
        <div class="attachment-tag">
            <span>${getFileIcon(file.name)} ${escapeHtml(file.name)}</span>
            <span class="remove-attachment" onclick="removeFile(${file.uniqueId})">&times;</span>
        </div>
    `).join('');
};

const renderAttachments = (attachments) => {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return '';
    const items = attachments.map(att => {
        if (!att || !att.name) return '';
        const title = escapeHtml(att.name);
        const url = att.url;
        const ext = att.name.split('.').pop().toLowerCase();
        
        const isImage = (att.type === 'image') || ['jpg','jpeg','png','gif','webp'].includes(ext);
        if (isImage) return `<div class="msg-image-item" onclick="window.open('${url}', '_blank')"><img src="${url}" alt="${title}" loading="lazy"></div>`;
        
        const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext);
        if (isVideo) return `<div class="msg-video-item" style="max-width:100%; margin-top:4px;"><video controls preload="metadata"><source src="${url}" type="video/${ext === 'mov' ? 'mp4' : ext}"><source src="${url}" type="video/mp4"></video></div>`;

        const isAudio = ['mp3', 'wav', 'mpeg', 'm4a'].includes(ext);
        if (isAudio) return `<div class="msg-audio-item" style="margin-top:4px; width:100%; min-width:200px;"><audio controls><source src="${url}" type="audio/${ext === 'mp3' ? 'mpeg' : ext}"></audio></div>`;

        return `<div class="msg-file-item" onclick="window.open('${url}', '_blank')"><div style="font-size:24px; line-height:1;">${getFileIcon(att.name)}</div><div style="flex:1; overflow:hidden;"><div style="font-weight:600; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</div><div style="font-size:11px; opacity:0.8;">Nhấn để tải về</div></div></div>`;
    }).join('');
    return `<div class="file-attachment-container">${items}</div>`;
};

// --- MENU HANDLING (3 DOTS) ---
window.toggleMsgMenu = (event, menuId) => {
    event.stopPropagation();
    const menu = document.getElementById(menuId);
    if (!menu) return;

    if (chatState.activeMenuId && chatState.activeMenuId !== menuId) {
        const oldMenu = document.getElementById(chatState.activeMenuId);
        if (oldMenu) oldMenu.classList.remove('show');
    }

    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
        chatState.activeMenuId = null;
    } else {
        menu.classList.add('show');
        chatState.activeMenuId = menuId;
    }
};

document.addEventListener('click', (e) => {
    if (chatState.activeMenuId) {
        const menu = document.getElementById(chatState.activeMenuId);
        if (menu && !menu.contains(e.target) && !e.target.closest('.msg-options-btn')) {
            menu.classList.remove('show');
            chatState.activeMenuId = null;
        }
    }
});

// --- CORE FUNCTIONS ---

window.openGlobalChatWith = (partnerId, partnerName) => {
    const w = document.getElementById('chat-window');
    const inbox = document.getElementById('chat-inbox');
    const detail = document.getElementById('chat-detail');
    if (!w || !inbox || !detail) return;

    w.classList.add('open');
    chatState.isChatOpen = true;
    inbox.classList.remove('active');
    detail.style.display = 'flex';
    document.getElementById('chat-title').innerText = partnerName;

    chatState.currentPartnerId = partnerId;
    chatState.lastMsgCount = 0;
    chatState.selectedFiles = [];
    updateAttachmentsPreview();

    document.getElementById('chat-messages').innerHTML = '';
    loadMessages();
    startChatPolling();
    stopInboxPolling();
};

window.toggleGlobalChat = () => {
    const w = document.getElementById('chat-window');
    if (!w) return;
    w.classList.toggle('open');
    chatState.isChatOpen = w.classList.contains('open');
    if (!chatState.isChatOpen) {
        stopChatPolling();
        stopInboxPolling();
        chatState.currentPartnerId = 0;
    } else {
        if (chatState.currentPartnerId) {
            startChatPolling();
        } else {
            loadConversations();
            startInboxPolling();
        }
    }
};

window.navigateGlobalBackToInbox = () => {
    stopChatPolling();
    chatState.currentPartnerId = 0;
    document.getElementById('chat-detail').style.display = 'none';
    document.getElementById('chat-inbox').classList.add('active');
    document.getElementById('chat-title').innerText = 'Hỗ Trợ Khách Hàng';
    
    loadConversations();
    startInboxPolling();
};

// --- NEW RECALL LOGIC WITH MODAL ---
window.recallMessage = (msgId) => {
    // Thay vì dùng confirm() mặc định, mở modal
    chatState.pendingRecallMsgId = msgId;
    const modal = document.getElementById('chat-confirm-modal');
    if (modal) modal.classList.add('show');
    
    // Đóng menu 3 chấm nếu đang mở
    if (chatState.activeMenuId) {
        const menu = document.getElementById(chatState.activeMenuId);
        if(menu) menu.classList.remove('show');
        chatState.activeMenuId = null;
    }
};

window.closeRecallModal = () => {
    chatState.pendingRecallMsgId = null;
    const modal = document.getElementById('chat-confirm-modal');
    if (modal) modal.classList.remove('show');
};

window.executeRecall = () => {
    const msgId = chatState.pendingRecallMsgId;
    if (!msgId) return;

    // Đóng modal trước khi gọi API
    closeRecallModal();

    const fd = new FormData();
    fd.append('message_id', msgId);
    fetch(`${CONFIG.BASE_URL}/recall_message.php`, { method: 'POST', body: fd })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const msgEl = document.getElementById(`msg-${msgId}`);
                if (msgEl) {
                    msgEl.classList.add('recalled');
                    const bubble = msgEl.querySelector('.chat-msg-bubble');
                    if (bubble) bubble.innerHTML = '<div style="color:#94a3b8; font-style:italic; font-size:13px;"><i class="fas fa-ban mr-1"></i> Tin nhắn đã thu hồi</div>';
                    
                    const optBtn = msgEl.querySelector('.msg-options-wrapper');
                    if(optBtn) optBtn.remove();
                }
                showToast('Thu hồi tin nhắn thành công', 'success');
            } else {
                showToast('Lỗi: ' + (data.error || 'Không thể thu hồi'), 'error');
            }
        })
        .catch(err => {
            showToast('Lỗi kết nối server', 'error');
        });
};

// --- DATA FETCHING & POLLING ---

window.loadConversations = () => {
    const listArea = document.getElementById('chat-inbox');
    if (!listArea || !chatState.isChatOpen) return;

    fetch(`${CONFIG.BASE_URL}/get_conversations.php?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                listArea.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8; font-size:13px;">Chưa có tin nhắn nào.</div>';
                return;
            }
            const totalUnread = data.reduce((sum, item) => sum + (item.UnreadCount || 0), 0);
            const badge = document.getElementById('unread-count-global');
            if(badge) {
                 badge.innerText = totalUnread > 9 ? '9+' : totalUnread;
                 badge.style.display = totalUnread > 0 ? 'block' : 'none';
            }
            listArea.innerHTML = data.map(item => {
                const isActive = item.UnreadCount > 0 ? 'is-unread' : '';
                return `
                <div class="conv-item ${isActive}" onclick="openGlobalChatWith(${item.PartnerID}, '${escapeHtml(item.PartnerName)}')">
                    <img src="${item.PartnerAvatar}" class="conv-avatar" onerror="this.src='${CONFIG.DEFAULT_AVATAR}'">
                    <div class="conv-info">
                        <div class="conv-name">${escapeHtml(item.PartnerName)}</div>
                        <div class="conv-message">${escapeHtml(item.LastMessage || 'File đính kèm')}</div>
                    </div>
                    <div class="conv-right">
                        <div class="conv-time">${item.TimeAgo}</div>
                        ${item.UnreadCount > 0 ? `<span style="background:#ef4444; color:white; font-size:10px; padding:2px 6px; border-radius:10px;">${item.UnreadCount}</span>` : ''}
                    </div>
                </div>`;
            }).join('');
        })
        .catch(() => {});
};

window.loadMessages = () => {
    if (!chatState.currentPartnerId || !chatState.isChatOpen) return;

    fetch(`${CONFIG.BASE_URL}/get_messages.php?partner_id=${chatState.currentPartnerId}&t=${Date.now()}`)
        .then(res => res.json())
        .then(msgs => {
            const area = document.getElementById('chat-messages');
            if (!area) return;

            if (msgs.length > chatState.lastMsgCount && chatState.lastMsgCount !== 0) {
                const lastMsg = msgs[msgs.length - 1];
                if (!lastMsg.is_me) playNotificationSound();
            }
            chatState.lastMsgCount = msgs.length;

            const isAtBottom = area.scrollHeight - area.scrollTop <= area.clientHeight + 150;

            msgs.forEach(m => {
                const msgId = `msg-${m.MessageID}`;
                const existingEl = document.getElementById(msgId);
                const isRecalled = m.IsRecalled == 1;

                let contentHtml = '';
                if (isRecalled) {
                    contentHtml = `<div style="color:#94a3b8; font-style:italic; font-size:13px;"><i class="fas fa-ban mr-1"></i> Tin nhắn đã thu hồi</div>`;
                } else {
                    contentHtml = `${renderAttachments(m.Attachments)}${m.Content ? `<div>${escapeHtml(m.Content)}</div>` : ''}`;
                }

                // --- 3 DOTS MENU LOGIC ---
                let optionsHtml = '';
                if (m.is_me && !isRecalled) {
                    const menuId = `menu-${m.MessageID}`;
                    optionsHtml = `
                        <div class="msg-options-wrapper">
                            <div class="msg-options-btn" onclick="toggleMsgMenu(event, '${menuId}')">
                                <svg style="position: relative; top: 10px;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </div>
                            <div class="msg-options-menu" id="${menuId}">
                                <div class="msg-option-item recall" onclick="recallMessage(${m.MessageID})">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
                                    Thu hồi
                                </div>
                            </div>
                        </div>
                    `;
                }

                if (existingEl) {
                    if (isRecalled && !existingEl.classList.contains('recalled')) {
                        existingEl.classList.add('recalled');
                        const bubble = existingEl.querySelector('.chat-msg-bubble');
                        if (bubble) bubble.innerHTML = contentHtml;
                        const opts = existingEl.querySelector('.msg-options-wrapper');
                        if(opts) opts.remove();
                    }
                } else {
                    const isMe = m.is_me;
                    const msgDiv = document.createElement('div');
                    msgDiv.id = msgId;
                    msgDiv.className = `msg-container ${isMe ? 'me' : 'them'} ${isRecalled ? 'recalled' : ''}`;
                    
                    msgDiv.innerHTML = `
                        <div class="msg-bubble-row">
                            <div class="chat-msg-bubble">
                                ${contentHtml}
                            </div>
                            ${optionsHtml}
                        </div>
                        <div class="msg-meta">
                            <span class="msg-time-detail">${formatTime(m.CreatedAt)}</span>
                        </div>
                    `;
                    area.appendChild(msgDiv);
                }
            });

            if (isAtBottom) scrollToBottom();
        })
        .catch(() => {});
};

window.sendMsg = () => {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    const files = chatState.selectedFiles;

    if (!txt && files.length === 0) return;
    if (!chatState.currentPartnerId) return;

    const area = document.getElementById('chat-messages');
    const mockAtt = files.map(f => ({ type: 'image', name: f.name, url: URL.createObjectURL(f) })); 
    
    const tempId = `temp-${Date.now()}`;
    const tempDiv = document.createElement('div');
    tempDiv.id = tempId;
    tempDiv.className = "msg-container me pending";
    tempDiv.innerHTML = `
        <div class="msg-bubble-row">
            <div class="chat-msg-bubble">
                <div style="display:flex; align-items:center; margin-bottom:4px; font-size:12px; opacity:0.9;">
                    <span class="sending-spinner"></span> Đang gửi...
                </div>
                ${renderAttachments(mockAtt)}
                ${txt ? `<div>${escapeHtml(txt)}</div>` : ''}
            </div>
        </div>
        <div class="msg-meta"><span class="msg-time-detail">Vừa xong</span></div>
    `;
    area.appendChild(tempDiv);
    scrollToBottom();

    input.value = '';
    chatState.selectedFiles = [];
    updateAttachmentsPreview();

    const fd = new FormData();
    fd.append('receiver_id', chatState.currentPartnerId);
    fd.append('content', txt);
    files.forEach(f => fd.append('files[]', f));

    fetch(`${CONFIG.BASE_URL}/send_message.php`, { method: 'POST', body: fd })
        .then(res => res.json())
        .then(data => {
            const el = document.getElementById(tempId);
            if(el) el.remove();
            loadMessages();
        })
        .catch(() => {
            const el = document.getElementById(tempId);
            if(el) el.innerHTML = `<div class="chat-msg-bubble" style="background:#fee2e2; color:#b91c1c;">Lỗi gửi tin.</div>`;
            showToast('Lỗi gửi tin nhắn', 'error');
        });
};

const startChatPolling = () => {
    stopChatPolling();
    chatState.chatInterval = setInterval(loadMessages, 1000); 
};
const stopChatPolling = () => {
    if (chatState.chatInterval) clearInterval(chatState.chatInterval);
    chatState.chatInterval = null;
};

const startInboxPolling = () => {
    stopInboxPolling();
    chatState.inboxInterval = setInterval(loadConversations, 1000); 
};
const stopInboxPolling = () => {
    if (chatState.inboxInterval) clearInterval(chatState.inboxInterval);
    chatState.inboxInterval = null;
};

const scrollToBottom = () => {
    const area = document.getElementById('chat-messages');
    if (area) area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
};