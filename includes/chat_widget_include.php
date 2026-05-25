<!-- D:\Xampp\htdocs\HeThongChamSocCaKoi\includes\chat_widget_include.php -->
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* --- CSS SCOPING --- */
    #chat-widget-container {
        font-family: 'Inter', sans-serif; 
        position: fixed; 
        bottom: 24px; 
        right: 24px; 
        z-index: 99999; 
        display: flex;
        flex-direction: column;
        align-items: flex-end; 
        
        /* Variables */
        --chat-primary: #0891b2;
        --chat-primary-grad: linear-gradient(135deg, #06b6d4, #0891b2);
        --chat-bg: #f3f4f6;
        --chat-white: #ffffff;
        --chat-text: #1e293b;
        --chat-gray: #64748b;
        --chat-border: #e2e8f0;
        --chat-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    }

    #chat-widget-container * {
        box-sizing: border-box;
    }
    
    /* Toggle Button */
    #chat-widget-container .chat-toggle {
        width: 60px; height: 60px; 
        background: var(--chat-primary-grad);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center; 
        color: white; cursor: pointer; 
        box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
        transition: transform 0.2s;
    }
    #chat-widget-container .chat-toggle:hover { transform: scale(1.05); }
    #chat-widget-container .chat-window.open ~ .chat-toggle { display: none; }
    
    #chat-widget-container .unread-badge-global {
        position: absolute; top: 0; right: 0; 
        background: #ef4444; color: white;
        font-size: 11px; font-weight: 700;
        padding: 3px 6px; border-radius: 99px; 
        border: 2px solid white; display: none;
    }

    /* Window */
    #chat-widget-container .chat-window {
        display: none; 
        width: 380px; 
        height: 600px; 
        max-height: 85vh; 
        background: var(--chat-white);
        border-radius: 16px; 
        box-shadow: var(--chat-shadow);
        flex-direction: column; 
        overflow: hidden; 
        border: 1px solid var(--chat-border);
        margin-bottom: 16px;
        animation: chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative; /* Để modal absolute theo window */
    }
    @keyframes chatSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    #chat-widget-container .chat-window.open { display: flex; }

    /* Header */
    #chat-widget-container .chat-header {
        background: var(--chat-primary-grad); 
        color: white; padding: 16px;
        display: flex; justify-content: space-between; align-items: center; 
        flex-shrink: 0;
    }
    #chat-widget-container .chat-header-info { font-weight: 600; display: flex; align-items: center; gap: 8px; }
    #chat-widget-container .chat-close { cursor: pointer; opacity: 0.8; padding: 4px; }
    #chat-widget-container .chat-close:hover { opacity: 1; }

    /* Inbox */
    #chat-widget-container .chat-inbox { flex: 1; overflow-y: auto; display: none; background: white; }
    #chat-widget-container .chat-inbox.active { display: block; }
    
    #chat-widget-container .conv-item { padding: 14px 16px; display: flex; gap: 12px; border-bottom: 1px solid #f8fafc; cursor: pointer; transition: bg 0.2s; }
    #chat-widget-container .conv-item:hover { background: #f1f5f9; }
    #chat-widget-container .conv-item.is-unread { background: #ecfeff; }
    #chat-widget-container .conv-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #e2e8f0; }
    #chat-widget-container .conv-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
    #chat-widget-container .conv-name { font-weight: 600; font-size: 14px; margin: 0; color: var(--chat-text); }
    #chat-widget-container .conv-message { font-size: 13px; color: var(--chat-gray); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #chat-widget-container .conv-time { font-size: 11px; color: #94a3b8; }

    /* Detail View */
    #chat-widget-container .chat-detail { 
        flex: 1; display: none; flex-direction: column; overflow: hidden; background: var(--chat-bg);
    }
    #chat-widget-container .back-bar { 
        padding: 10px 16px; background: white; border-bottom: 1px solid var(--chat-border); 
        font-size: 13px; font-weight: 500; color: var(--chat-gray); cursor: pointer; 
        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    }
    #chat-widget-container .back-bar:hover { color: var(--chat-primary); }

    /* Messages Area */
    #chat-widget-container .chat-messages { 
        flex: 1; 
        overflow-y: auto; 
        overflow-x: hidden; 
        padding: 16px; 
        display: flex; 
        flex-direction: column; 
        gap: 12px; 
    }
    
    #chat-widget-container .msg-container { display: flex; flex-direction: column; width: 100%; max-width: 100%; }
    #chat-widget-container .msg-container.me { align-items: flex-end; }
    #chat-widget-container .msg-container.them { align-items: flex-start; }
    
    /* Message Bubble Row (Bubble + 3 Dot) */
    #chat-widget-container .msg-bubble-row {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        max-width: 100%;
    }
    
    /* SỬA LỖI 1: Đổi vị trí 3 chấm sang trái cho 'me' bằng row-reverse */
    #chat-widget-container .msg-container.me .msg-bubble-row { flex-direction: row-reverse; }
    #chat-widget-container .msg-container.them .msg-bubble-row { flex-direction: row; }

    /* FIXED: SỬA LỖI TEXT BỊ NGẮT TỪ VÀ NỀN KHÔNG ÔM TRỌN TEXT */
    #chat-widget-container .chat-msg-bubble { 
        padding: 10px 14px; 
        border-radius: 18px; 
        font-size: 14px; 
        line-height: 1.5; 
        max-width: 85%;
        position: relative;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        
        /* FIX: Nền ôm trọn text và không ngắt từ tùy tiện */
        /* overflow-wrap: break-word;  Tự xuống dòng khi từ quá dài */
        /* word-wrap: break-word;      Hỗ trợ trình duyệt cũ */
        white-space: normal;        /* Cho phép xuống dòng tự nhiên */
        word-break: normal;         /* Không bẻ gãy từ một cách tùy tiện */
        hyphens: manual;            /* Chỉ ngắt từ khi có dấu gạch nối */
        
        /* Đảm bảo nền ôm trọn text */
        width: fit-content;
        min-width: 20px; /* Đảm bảo không quá nhỏ */
        max-width: 100%;
    }
    
    /* Tối ưu cho ngôn ngữ không dùng dấu cách */
    #chat-widget-container .chat-msg-bubble:lang(vi),
    #chat-widget-container .chat-msg-bubble:lang(th),
    #chat-widget-container .chat-msg-bubble:lang(ja),
    #chat-widget-container .chat-msg-bubble:lang(ko),
    #chat-widget-container .chat-msg-bubble:lang(zh) {
        word-break: keep-all;       /* Giữ nguyên từ không ngắt */
        word-wrap: normal;          /* Không bọc từ */
    }
    
    #chat-widget-container .msg-container.me .chat-msg-bubble { 
        background: var(--chat-primary-grad); 
        color: white; 
        border-bottom-right-radius: 4px;
        text-align: left;
        align-self: flex-end;
    }
    
    #chat-widget-container .msg-container.them .chat-msg-bubble { 
        background: white; 
        color: var(--chat-text); 
        border: 1px solid #e2e8f0; 
        border-bottom-left-radius: 4px;
        align-self: flex-start;
    }

    /* --- 3 DOTS OPTIONS MENU --- */
    #chat-widget-container .msg-options-wrapper {
        position: relative;
        height: 24px;
        display: flex; align-items: center;
    }

    #chat-widget-container .msg-options-btn {
        width: 24px; height: 24px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #94a3b8;
        cursor: pointer;
        transition: background 0.2s;
        opacity: 0; 
    }
    
    #chat-widget-container .msg-container:hover .msg-options-btn,
    #chat-widget-container .msg-options-btn:hover,
    #chat-widget-container .msg-options-menu.show ~ .msg-options-btn {
        opacity: 1;
    }
    
    #chat-widget-container .msg-options-btn:hover {
        background: #e2e8f0;
        color: #64748b;
    }

    /* Dropdown Menu */
    #chat-widget-container .msg-options-menu {
        position: absolute;
        top: 100%;
        right: auto; 
        left: 0; /* Menu bung ra từ bên trái nút */
        
        background: white;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-radius: 8px;
        padding: 4px;
        min-width: 110px;
        z-index: 10;
        display: none;
        flex-direction: column;
        animation: fadeIn 0.1s ease-out;
    }
    
    #chat-widget-container .msg-options-menu.show { display: flex; }
    
    #chat-widget-container .msg-option-item {
        padding: 6px 12px;
        font-size: 13px;
        color: #334155;
        cursor: pointer;
        display: flex; align-items: center; gap: 6px;
        border-radius: 4px;
        transition: background 0.1s;
    }
    #chat-widget-container .msg-option-item:hover { background: #f1f5f9; }
    #chat-widget-container .msg-option-item.recall { color: #ef4444; }
    #chat-widget-container .msg-option-item.recall:hover { background: #fef2f2; }

    /* Metadata */
    #chat-widget-container .msg-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        justify-content: flex-end; 
        padding-right: 4px;
    }
    #chat-widget-container .them .msg-meta {
        justify-content: flex-start; 
        padding-left: 4px;
    }

    #chat-widget-container .msg-time-detail { font-size: 10px; color: #94a3b8; }
    
    /* Media Styles */
    #chat-widget-container .file-attachment-container {
        display: flex; flex-direction: column; gap: 6px; margin-bottom: 6px; width: 100%; 
    }
    #chat-widget-container .msg-image-item img {
        display: block; max-width: 100%; height: auto; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer;
    }
    #chat-widget-container .msg-video-item video, 
    #chat-widget-container .msg-audio-item audio {
        width: 100%; max-width: 300px; outline: none; border-radius: 8px;
    }
    #chat-widget-container .msg-file-item {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.9); padding: 8px 12px; border-radius: 10px;
        border: 1px solid #e2e8f0; text-decoration: none; color: #334155;
        max-width: 100%; cursor: pointer; transition: background 0.2s;
    }
    #chat-widget-container .msg-file-item:hover { background: #f8fafc; }
    #chat-widget-container .msg-container.me .msg-file-item {
        background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white;
    }

    /* Spinner */
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    #chat-widget-container .sending-spinner {
        display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%; border-top-color: white; animation: spin 1s linear infinite; margin-right: 6px;
    }
    #chat-widget-container .msg-container.pending { opacity: 0.75; }

    /* Input */
    #chat-widget-container .chat-input-wrapper { flex-shrink: 0; background: white; padding: 12px; border-top: 1px solid var(--chat-border); display: flex; flex-direction: column; gap: 8px; }
    #chat-widget-container #attachments-preview { display: none; gap: 8px; padding-bottom: 4px; flex-wrap: wrap; max-height: 80px; overflow-y: auto; }
    #chat-widget-container .attachment-tag { background: #f1f5f9; font-size: 12px; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 6px; border: 1px solid #e2e8f0; }
    #chat-widget-container .remove-attachment { cursor: pointer; color: #ef4444; font-weight: bold; }
    #chat-widget-container .input-row { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 4px 8px; transition: border-color 0.2s; }
    #chat-widget-container .input-row:focus-within { border-color: var(--chat-primary); background: white; }
    #chat-widget-container .chat-input { flex: 1; border: none; background: transparent; padding: 8px 4px; outline: none; font-size: 14px; color: var(--chat-text); min-width: 10px; }
    #chat-widget-container .btn-icon { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; color: var(--chat-gray); display: flex; align-items: center; justify-content: center; }
    #chat-widget-container .btn-icon:hover { color: var(--chat-primary); background: #e2e8f0; }
    #chat-widget-container .btn-send { color: var(--chat-primary); }

    /* --- TOAST NOTIFICATION CSS --- */
    #chat-toast-container {
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
        z-index: 100000; display: flex; flex-direction: column; align-items: center; gap: 10px;
        pointer-events: none;
    }
    
    .chat-toast {
        background: white; color: #334155; padding: 10px 16px; border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15); font-size: 13px; font-weight: 500;
        display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateY(-20px);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto;
        min-width: 200px; border: 1px solid #e2e8f0;
    }
    
    .chat-toast.show { opacity: 1; transform: translateY(0); }
    .chat-toast.success { border-left: 4px solid #10b981; }
    .chat-toast.success svg { color: #10b981; }
    .chat-toast.error { border-left: 4px solid #ef4444; }
    .chat-toast.error svg { color: #ef4444; }
    .chat-toast.info { border-left: 4px solid #0891b2; }
    .chat-toast.info svg { color: #0891b2; }

    /* --- SỬA LỖI 3: CONFIRMATION MODAL CSS --- */
    #chat-widget-container .chat-modal-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); z-index: 50;
        display: none; align-items: center; justify-content: center;
        backdrop-filter: blur(1px);
    }
    #chat-widget-container .chat-modal-overlay.show { display: flex; animation: fadeIn 0.2s; }

    #chat-widget-container .chat-modal-box {
        background: white; width: 85%; max-width: 300px;
        border-radius: 12px; padding: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        text-align: center;
        animation: scaleIn 0.2s;
    }
    @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    #chat-widget-container .chat-modal-title { font-weight: 700; font-size: 16px; color: #1e293b; margin-bottom: 8px; }
    #chat-widget-container .chat-modal-desc { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
    
    #chat-widget-container .chat-modal-actions { display: flex; gap: 10px; justify-content: center; }
    #chat-widget-container .chat-btn {
        flex: 1; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s;
    }
    #chat-widget-container .chat-btn.cancel { background: #f1f5f9; color: #475569; }
    #chat-widget-container .chat-btn.cancel:hover { background: #e2e8f0; }
    #chat-widget-container .chat-btn.danger { background: #ef4444; color: white; }
    #chat-widget-container .chat-btn.danger:hover { background: #dc2626; }

    @media (max-width: 480px) {
        #chat-widget-container .chat-window { width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; margin: 0; right: 0; bottom: 0; position: fixed; }
        #chat-widget-container { right: 0; bottom: 0; width: 100%; pointer-events: none; }
        #chat-widget-container .chat-window, #chat-widget-container .chat-toggle { pointer-events: auto; }
        #chat-widget-container .chat-toggle { margin: 0 0 20px 20px; }
        
        /* Mobile optimization for text bubbles */
        #chat-widget-container .chat-msg-bubble {
            max-width: 90%;
        }
    }
</style>

<div id="chat-widget-container">
    <!-- Chat Window -->
    <div class="chat-window" id="chat-window">
        <!-- Header -->
        <div class="chat-header">
            <div class="chat-header-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                <span id="chat-title">Hỗ Trợ Khách Hàng</span>
            </div>
            <div class="chat-close" onclick="toggleGlobalChat()" title="Đóng">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        </div>

        <!-- Inbox -->
        <div class="chat-inbox active" id="chat-inbox">
            <div style="padding: 40px; text-align: center; color: #94a3b8; font-size: 13px;">Đang tải danh sách...</div>
        </div>

        <!-- Detail -->
        <div class="chat-detail" id="chat-detail">
            <div class="back-bar" onclick="navigateGlobalBackToInbox()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                <span>Quay lại</span>
            </div>
            
            <div class="chat-messages" id="chat-messages"></div>
            
            <div class="chat-input-wrapper">
                <div id="attachments-preview"></div>
                <div class="input-row">
                    <button class="btn-icon btn-attach" onclick="document.getElementById('chat-file-upload').click()" title="Gửi ảnh/file">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    <input type="file" id="chat-file-upload" multiple style="display:none" onchange="handleFileSelection(event)">
                    
                    <input type="text" id="chat-input" class="chat-input" placeholder="Nhập tin nhắn..." autocomplete="off" onkeypress="if(event.key==='Enter') sendMsg()">
                    
                    <button class="btn-icon btn-send" onclick="sendMsg()" title="Gửi">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- NEW: Custom Modal Markup -->
        <div class="chat-modal-overlay" id="chat-confirm-modal">
            <div class="chat-modal-box">
                <div class="chat-modal-title">Thu hồi tin nhắn</div>
                <div class="chat-modal-desc">Bạn có chắc chắn muốn thu hồi tin nhắn này không? Hành động này không thể hoàn tác.</div>
                <div class="chat-modal-actions">
                    <button class="chat-btn cancel" onclick="closeRecallModal()">Hủy</button>
                    <button class="chat-btn danger" onclick="executeRecall()">Thu hồi</button>
                </div>
            </div>
        </div>

    </div>

    <!-- Toggle Button -->
    <div class="chat-toggle" onclick="toggleGlobalChat()">
        <span id="unread-count-global" class="unread-badge-global">0</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
</div>

<script src="/HeThongChamSocCaKoi/assets/js/chat/chat_widget.js?v=<?= time() ?>"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof loadConversations === 'function') loadConversations();
    });
</script>