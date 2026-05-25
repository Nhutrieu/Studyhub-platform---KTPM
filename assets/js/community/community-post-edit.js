// community-post-edit.js
// ========= PHẦN CHỈNH SỬA BÀI VIẾT, ĐỐI TƯỢNG XEM, XÓA BÀI VIẾT =========

// Biến toàn cục
window._editRemovedMedia = [];
window._editNewFiles = [];
window._editOldMedia = [];
window._editSelectedPrivacy = "public";

// 🆕 Hàm escape HTML để chống XSS
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
}

// Import hàm từ community-main.js nếu có
if (typeof getSafeAvatarURL === 'undefined' && typeof window !== 'undefined') {
    window.getSafeAvatarURL = function(avatarPath) {
        const BASE = window.BASE_URL || '/HeThongChamSocCaKoi';
        
        if (!avatarPath || avatarPath.trim() === '' || 
            avatarPath === "undefined" || avatarPath === "null") {
            return `${BASE}/assets/images/default-avatar.png`;
        }
        
        if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
            return avatarPath;
        }
        
        if (avatarPath.startsWith('/')) {
            return avatarPath;
        }
        
        if (avatarPath.includes('uploads/avatars/')) {
            return `${BASE}/${avatarPath}`;
        }
        
        return `${BASE}/uploads/avatars/${avatarPath}`;
    };
}

/* ========= CHỈNH SỬA BÀI VIẾT ========= */
async function editPost(postId, isDetailPage = false) {
    const old = document.getElementById("edit-modal");
    if (old) old.remove();

    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postEl) return;

    // 🟢 KIỂM TRA ĐÂY CÓ PHẢI BÀI CHIA SẺ KHÔNG
    const isSharedPost = postEl.classList.contains('shared-post') || 
                         postEl.querySelector('.shared-post-container') !== null;
    
    console.log("🟡 Edit post check:", { postId, isSharedPost });

    // Lấy thông tin hiện tại
    let caption = "";
    let privacy = "public";
    
    if (isSharedPost) {
        const sharedCaption = postEl.querySelector(".shared-caption");
        if (sharedCaption) {
            caption = sharedCaption.innerText.trim();
        }
    } else {
        const normalContent = postEl.querySelector(".post-content");
        if (normalContent) {
            caption = normalContent.innerText.trim();
        }
    }
    
    // Lấy privacy từ API
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/get.php?id=${postId}`);
        const data = await res.json();
        if (data && data.post && data.post.Privacy) {
            privacy = data.post.Privacy;
        }
    } catch (err) {
        console.error("Lỗi lấy privacy:", err);
    }

    // Xử lý avatar
    let username = window.CURRENT_USERNAME || "Bạn";
    let avatar = "";

    const avatarImg = postEl.querySelector('.post-avatar-img');
    const avatarCircle = postEl.querySelector('.avatar-circle');
    
    if (avatarImg && avatarImg.src) {
        avatar = avatarImg.src;
    } else if (postEl.querySelector('.post-avatar')) {
        const avatarDiv = postEl.querySelector('.post-avatar');
        if (avatarDiv.style.backgroundImage) {
            const bg = avatarDiv.style.backgroundImage;
            avatar = bg.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
        }
    }
    
    if (!avatar || avatar === "" || avatar === "undefined") {
        const avatarPath = window.CURRENT_USER_AVATAR || "";
        if (avatarPath && avatarPath.trim() !== '' && avatarPath !== "undefined" && avatarPath !== "null") {
            if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
                avatar = avatarPath;
            } else if (avatarPath.startsWith('/')) {
                avatar = window.location.origin + avatarPath;
            } else if (avatarPath.includes('uploads/avatars/')) {
                if (!avatarPath.includes(BASE_URL)) {
                    avatar = `${BASE_URL}/${avatarPath}`;
                } else {
                    avatar = avatarPath;
                }
            } else if (!avatarPath.includes('/') && !avatarPath.includes('\\')) {
                avatar = `${BASE_URL}/uploads/avatars/${avatarPath}`;
            } else {
                avatar = avatarPath;
            }
        }
    }
    
    if (!avatar || avatar === "" || avatar === "undefined") {
        const initial = username.charAt(0).toUpperCase();
        const colors = ['0084ff', '44bec7', 'ffc300', 'fa3c4c', 'd696bb'];
        const colorIndex = username.length % colors.length;
        avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${colors[colorIndex]}&color=fff&size=100&bold=true`;
    }

    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(username.charAt(0))}&background=0084ff&color=fff&size=100`;
    const avatarWithFallback = `onerror="this.onerror=null; this.src='${avatarFallback}'"`;

    // KHỞI TẠO BIẾN TẠM
    window._editRemovedMedia = [];
    window._editNewFiles = [];
    window._editSelectedPrivacy = privacy;
    window._editIsSharedPost = isSharedPost;
    
    // 🟢 TẠO NỘI DUNG MODAL KHÁC NHAU CHO BÀI CHIA SẺ
    let mediaPreviewHTML = '';
    let footerActionsHTML = '';
    
    if (isSharedPost) {
        mediaPreviewHTML = `
            <div class="edit-shared-note">
                <span class="material-icons">info</span>
                <span>Bài chia sẻ chỉ có thể chỉnh sửa nội dung. Ảnh/video thuộc về bài viết gốc.</span>
            </div>
        `;
        
        footerActionsHTML = `
            <div class="edit-action-left">
            </div>
            
            <div class="edit-action-right">
                <button class="edit-cancel-btn" onclick="document.getElementById('edit-modal').remove()">
                    Hủy
                </button>
                <button class="edit-save-btn" onclick="submitEditPost(${postId})">
                    Lưu thay đổi
                </button>
            </div>
        `;
    } else {
        mediaPreviewHTML = '<div class="edit-media-preview" id="edit-media-preview"></div>';
        
        footerActionsHTML = `
            <div class="edit-action-left">
                <label class="edit-add-media-btn">
                    <input type="file" id="edit-add-media" accept="image/*,video/*" multiple hidden>
                    <span class="material-icons">photo_library</span>
                    <span>Ảnh/Video</span>
                </label>
            </div>
            
            <div class="edit-action-right">
                <button class="edit-cancel-btn" onclick="document.getElementById('edit-modal').remove()">
                    Hủy
                </button>
                <button class="edit-save-btn" onclick="submitEditPost(${postId})">
                    Lưu thay đổi
                </button>
            </div>
        `;
    }

    // Tạo modal
    const modal = document.createElement("div");
    modal.id = "edit-modal";
    modal.className = "edit-modal";
    
    modal.innerHTML = `
        <div class="edit-overlay" onclick="document.getElementById('edit-modal').remove()"></div>
        
        <div class="edit-composer">
            <div class="edit-header">
                <h3>${isSharedPost ? 'Chỉnh sửa bài chia sẻ' : 'Chỉnh sửa bài viết'}</h3>
                <button class="edit-close" onclick="document.getElementById('edit-modal').remove()">×</button>
            </div>
            
            <div class="edit-user-info">
                <img src="${avatar}" class="edit-user-avatar" alt="${username}" 
                     ${avatarWithFallback}>
                <div class="edit-user-details">
                    <div class="edit-username">${escapeHtml(username)}</div>
                    <div class="edit-privacy-select" onclick="toggleEditPrivacyMenu()">
                        <span class="edit-privacy-icon" id="edit-privacy-icon">${getPrivacyIcon(privacy)}</span>
                        <span class="edit-privacy-text" id="edit-privacy-text">${getPrivacyText(privacy)}</span>
                        <span class="material-icons">arrow_drop_down</span>
                    </div>
                    <div class="edit-privacy-menu" id="edit-privacy-menu" style="display:none;">
                        <div class="edit-privacy-option" onclick="selectEditPrivacy('public')">
                            <span class="privacy-icon">🌍</span>
                            <div>
                                <div class="privacy-label">Công khai</div>
                                <div class="privacy-desc">Mọi người đều có thể xem</div>
                            </div>
                        </div>
                        <div class="edit-privacy-option" onclick="selectEditPrivacy('followers')">
                            <span class="privacy-icon">👥</span>
                            <div>
                                <div class="privacy-label">Người theo dõi</div>
                                <div class="privacy-desc">Chỉ người theo dõi bạn</div>
                            </div>
                        </div>
                        <div class="edit-privacy-option" onclick="selectEditPrivacy('private')">
                            <span class="privacy-icon">🔒</span>
                            <div>
                                <div class="privacy-label">Chỉ mình tôi</div>
                                <div class="privacy-desc">Chỉ bạn có thể xem</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="edit-content-area">
                <textarea 
                    id="edit-content" 
                    class="edit-textarea" 
                    placeholder="${isSharedPost ? 'Bạn đang nghĩ gì về bài viết này?' : username + ' ơi, bạn đang nghĩ gì thế?'}"
                    rows="3"
                >${escapeHtml(caption)}</textarea>
            </div>
            
            ${mediaPreviewHTML}
            
            <div class="edit-footer-actions">
                ${footerActionsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    if (!isSharedPost) {
        loadEditMedia(postId);
        setupEditEvents(postId);
    } else {
        setupSharedEditEvents();
    }
    
    setTimeout(() => {
        const textarea = document.getElementById("edit-content");
        if (textarea) textarea.focus();
    }, 100);
}

/**
 * Setup events cho bài chia sẻ
 */
function setupSharedEditEvents() {
    document.addEventListener("click", function(e) {
        const privacySelect = document.querySelector(".edit-privacy-select");
        const privacyMenu = document.getElementById("edit-privacy-menu");
        
        if (privacySelect && privacyMenu && 
            !privacySelect.contains(e.target) && 
            !privacyMenu.contains(e.target)) {
            privacyMenu.style.display = "none";
        }
    });
    
    if (!window._editSelectedPrivacy) {
        const privacyText = document.getElementById("edit-privacy-text");
        if (privacyText) {
            const text = privacyText.textContent.trim();
            if (text === "Công khai") window._editSelectedPrivacy = "public";
            else if (text === "Người theo dõi") window._editSelectedPrivacy = "followers";
            else if (text === "Chỉ mình tôi") window._editSelectedPrivacy = "private";
            else window._editSelectedPrivacy = "public";
        }
    }
}

// Hàm helper cho privacy
function getPrivacyIcon(privacy) {
    switch(privacy) {
        case 'public': return '🌍';
        case 'followers': return '👥';
        case 'private': return '🔒';
        default: return '🌍';
    }
}

function getPrivacyText(privacy) {
    switch(privacy) {
        case 'public': return 'Công khai';
        case 'followers': return 'Người theo dõi';
        case 'private': return 'Chỉ mình tôi';
        default: return 'Công khai';
    }
}

// Privacy menu functions
function toggleEditPrivacyMenu() {
    const menu = document.getElementById("edit-privacy-menu");
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function selectEditPrivacy(privacy) {
    const icon = document.getElementById("edit-privacy-icon");
    const text = document.getElementById("edit-privacy-text");
    const menu = document.getElementById("edit-privacy-menu");
    
    if (icon) icon.textContent = getPrivacyIcon(privacy);
    if (text) text.textContent = getPrivacyText(privacy);
    if (menu) menu.style.display = 'none';
    
    window._editSelectedPrivacy = privacy;
}

async function loadEditMedia(postId) {
    const wrap = document.getElementById("edit-media-preview");
    if (!wrap) return;
    
    wrap.innerHTML = '<div class="edit-loading">Đang tải ảnh...</div>';
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/get_media.php?post_id=${postId}`);
        const data = await res.json();
        
        if (!data.media || !data.media.length) {
            wrap.innerHTML = '';
            wrap.style.display = 'none';
            return;
        }
        
        window._editOldMedia = data.media.map(m => ({
            MediaID: parseInt(m.MediaID),
            FilePath: m.FilePath,
            MediaType: m.MediaType,
            PostID: m.PostID
        }));
        
        window._editRemovedMedia = [];
        window._editNewFiles = [];
        
        renderEditMediaPreviewCorrectLayout(window._editOldMedia);
        
    } catch (err) {
        console.error("Lỗi load edit media:", err);
        wrap.innerHTML = '<div class="edit-error">Lỗi tải ảnh</div>';
    }
}

function renderEditMediaPreviewCorrectLayout(mediaList) {
    const wrap = document.getElementById("edit-media-preview");
    if (!wrap) return;
    
    wrap.innerHTML = "";
    wrap.className = "edit-media-preview";
    wrap.style.display = "grid";
    wrap.style.marginTop = "12px";
    wrap.style.gap = "2px";
    wrap.style.background = "#000";
    wrap.style.borderRadius = "8px";
    wrap.style.overflow = "hidden";
    wrap.style.border = "none";
    wrap.style.padding = "0";
    
    const count = mediaList.length;
    
    if (count === 0) {
        wrap.style.display = "none";
        return;
    }
    
    // Xác định layout dựa trên số lượng ảnh
    if (count === 1) {
        wrap.classList.add("grid-1");
        wrap.style.gridTemplateColumns = "1fr";
        wrap.style.gridTemplateRows = "350px";
        wrap.style.height = "350px";
    } 
    else if (count === 2) {
        wrap.classList.add("grid-2");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px";
        wrap.style.height = "200px";
    }
    else if (count === 3) {
        wrap.classList.add("grid-3");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px 200px";
        wrap.style.height = "400px";
    }
    else if (count === 4) {
        wrap.classList.add("grid-4");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px 200px";
        wrap.style.height = "400px";
    }
    else if (count === 5) {
        wrap.classList.add("grid-5");
        wrap.style.gridTemplateColumns = "2fr 1fr 1fr";
        wrap.style.gridTemplateRows = "1fr 1fr";
        wrap.style.height = "400px";
        wrap.style.maxHeight = "500px";
    }
    else if (count >= 6) {
        wrap.classList.add("grid-6-fixed");
        wrap.style.gridTemplateColumns = "2fr 1fr 1fr";
        wrap.style.gridTemplateRows = "1fr 1fr 1fr";
        wrap.style.height = "400px";
        wrap.style.maxHeight = "500px";
    }
    
    const displayCount = Math.min(count, 6);
    const remaining = count - 6;
    
    for (let i = 0; i < displayCount; i++) {
        const media = mediaList[i];
        const isLast = i === 5 && remaining > 0;
        
        const itemDiv = document.createElement("div");
        itemDiv.className = `media-item media-${i} ${isLast && remaining > 0 ? 'overlay-item' : ''}`;
        itemDiv.dataset.index = i;
        
        // Xác định mediaId
        const mediaId = media.MediaID;
        itemDiv.dataset.mediaId = mediaId;
        
        // Xử lý URL ảnh
        let mediaUrl = "";
        let isVideo = false;
        
        if (media.MediaType === "video" || (media.file && media.file.type.startsWith('video'))) {
            isVideo = true;
        }
        
        // Lấy URL đúng
        if (media.FilePath) {
            if (media.FilePath.startsWith("blob:")) {
                mediaUrl = media.FilePath; // URL object
            } else if (media.FilePath.startsWith("http")) {
                mediaUrl = media.FilePath; // URL đầy đủ
            } else {
                mediaUrl = window.location.origin + (media.FilePath.startsWith('/') ? media.FilePath : '/' + media.FilePath);
            }
        }
        
        // Tạo HTML cho ảnh/video
        if (mediaUrl) {
            if (isVideo) {
                itemDiv.innerHTML = `
                    <video src="${mediaUrl}" class="media-preview" controls muted></video>
                `;
            } else {
                itemDiv.innerHTML = `
                    <img src="${mediaUrl}" class="media-preview" loading="lazy" alt="Ảnh ${i + 1}">
                `;
            }
        } else {
            itemDiv.innerHTML = `
                <div class="media-preview-error" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:white;">
                    ❌ Lỗi hiển thị
                </div>
            `;
        }
        
        // 🟢 SỬA: Tạo nút xóa với mediaId đúng
        let removeOnClick = '';
        if (typeof mediaId === 'string' && mediaId.startsWith('new_')) {
            // Ảnh mới: truyền string
            removeOnClick = `removeEditMedia(this, '${mediaId}')`;
        } else {
            // Ảnh cũ: truyền number
            removeOnClick = `removeEditMedia(this, ${mediaId})`;
        }
        
        itemDiv.innerHTML += `
            <button class="remove-preview-btn" 
                    onclick="${removeOnClick}; event.stopPropagation();">×</button>
        `;
        
        // Thêm overlay "+N" nếu cần
        if (isLast && remaining > 0) {
            itemDiv.innerHTML += `
                <div class="more-overlay">
                    <div class="more-text">+${remaining}</div>
                </div>
            `;
        }
        
        // Thêm sự kiện click để xem ảnh lớn
        itemDiv.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-preview-btn') || 
                e.target.closest('.remove-preview-btn')) {
                return;
            }
            openEditMediaViewer(i);
        });
        
        wrap.appendChild(itemDiv);
    }
}
function addEditModalStyles() {
    if (document.getElementById('edit-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'edit-modal-styles';
    style.textContent = `
        .edit-shared-note {
            background: #f0f9ff;
            border: 1px solid #b3e0ff;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #0066cc;
            font-size: 14px;
        }
        
        .edit-shared-note .material-icons {
            font-size: 18px;
            color: #0066cc;
        }
        
        .edit-action-left[style*="display: none"] {
            display: none !important;
        }
        
        .edit-media-preview {
            display: grid;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            margin-top: 12px;
        }
        
        .edit-media-preview.grid-1 {
            grid-template-columns: 1fr;
            height: 350px;
        }
        
        .edit-media-preview.grid-2 {
            grid-template-columns: 1fr 1fr;
            height: 200px;
        }
        
        .edit-media-preview.grid-3 {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 200px 200px;
            height: 400px;
        }
        
        .edit-media-preview.grid-3 .media-item:nth-child(1) {
            grid-column: 1 / 2;
            grid-row: 1 / 3;
        }
        
        .edit-media-preview.grid-3 .media-item:nth-child(2) {
            grid-column: 2 / 3;
            grid-row: 1 / 2;
        }
        
        .edit-media-preview.grid-3 .media-item:nth-child(3) {
            grid-column: 2 / 3;
            grid-row: 2 / 3;
        }
        
        .edit-media-preview.grid-4 {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 200px 200px;
            height: 400px;
        }
        
        .edit-media-preview.grid-5 {
            grid-template-columns: 2fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            height: 400px;
        }
        
        .edit-media-preview.grid-5 .media-item:nth-child(1) {
            grid-column: 1 / 2;
            grid-row: 1 / 3;
        }
        
        .edit-media-preview.grid-5 .media-item:nth-child(2) {
            grid-column: 2 / 3;
            grid-row: 1 / 2;
        }
        
        .edit-media-preview.grid-5 .media-item:nth-child(3) {
            grid-column: 3 / 4;
            grid-row: 1 / 2;
        }
        
        .edit-media-preview.grid-5 .media-item:nth-child(4) {
            grid-column: 2 / 3;
            grid-row: 2 / 3;
        }
        
        .edit-media-preview.grid-5 .media-item:nth-child(5) {
            grid-column: 3 / 4;
            grid-row: 2 / 3;
        }
        
        /* ========== THÊM LAYOUT CHO 6 ẢNH GIỐNG CREATE MODAL ========== */
        .edit-media-preview.grid-6-fixed {
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(2, 1fr) !important;
            height: 400px !important;
            max-height: 500px !important;
        }
        
        .edit-media-preview .media-item {
            position: relative;
            overflow: hidden;
        }
        
        .edit-media-preview .media-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        .edit-media-preview video.media-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .edit-media-preview .remove-preview-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        
        .edit-media-preview .remove-preview-btn:hover {
            background: rgba(0, 0, 0, 0.9);
        }
        
        .edit-media-preview .overlay-item {
            position: relative;
        }
        
        .edit-media-preview .more-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
        }
        
        .edit-media-preview .more-text {
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        
        /* Responsive cho mobile */
        @media (max-width: 768px) {
            .edit-media-preview.grid-6-fixed {
                height: 300px !important;
                max-height: 350px !important;
            }
            
            .edit-media-preview.grid-6-fixed .more-text {
                font-size: 20px !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}
// Setup events
function setupEditEvents(postId) {
    const fileInput = document.getElementById("edit-add-media");
    if (fileInput) {
        fileInput.addEventListener("change", function(e) {
            if (!this.files || this.files.length === 0) return;
            
            if (!window._editNewFiles) window._editNewFiles = [];
            if (!window._editRemovedMedia) window._editRemovedMedia = [];
            
            const newFiles = Array.from(this.files);
            
            // 🟢 Gán tempId cho từng file mới
            newFiles.forEach((file, index) => {
                const newIndex = window._editNewFiles.length;
                file.tempId = `new_${newIndex}`;
                window._editNewFiles.push(file);
            });
            
            updateEditGridLayoutAfterRemoval();
            
            this.value = "";
        });
    }
    
    document.addEventListener("click", function(e) {
        const privacySelect = document.querySelector(".edit-privacy-select");
        const privacyMenu = document.getElementById("edit-privacy-menu");
        
        if (privacySelect && privacyMenu && 
            !privacySelect.contains(e.target) && 
            !privacyMenu.contains(e.target)) {
            privacyMenu.style.display = "none";
        }
    });
    
    const previewWrap = document.getElementById("edit-media-preview");
    if (previewWrap) {
        previewWrap.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-preview-btn') || 
                e.target.closest('.remove-preview-btn')) {
                
                const btn = e.target.classList.contains('remove-preview-btn') 
                    ? e.target 
                    : e.target.closest('.remove-preview-btn');
                
                const item = btn.closest('.media-preview-item');
                if (!item) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                const mediaId = item.dataset.mediaId;
                
                if (mediaId && mediaId !== 'undefined') {
                    removeEditMedia(btn, parseInt(mediaId));
                } else {
                    const index = item.dataset.index;
                    removeEditNewFile(btn, parseInt(index));
                }
            }
        });
    }
    
    if (!window._editSelectedPrivacy) {
        const privacyText = document.getElementById("edit-privacy-text");
        if (privacyText) {
            const text = privacyText.textContent.trim();
            if (text === "Công khai") window._editSelectedPrivacy = "public";
            else if (text === "Người theo dõi") window._editSelectedPrivacy = "followers";
            else if (text === "Chỉ mình tôi") window._editSelectedPrivacy = "private";
            else window._editSelectedPrivacy = "public";
        }
    }
}

function removeEditNewFile(btn, fileIndex) {
    if (!window._editNewFiles || window._editNewFiles.length === 0) {
        return;
    }
    
    if (fileIndex >= 0 && fileIndex < window._editNewFiles.length) {
        const item = btn.closest('.media-preview-item');
        if (item) {
            const media = item.querySelector('img, video');
            if (media && media.src && media.src.startsWith('blob:')) {
                URL.revokeObjectURL(media.src);
            }
        }
        
        window._editNewFiles.splice(fileIndex, 1);
    }
    
    const item = btn.closest('.media-preview-item');
    if (item) {
        item.remove();
    }
    
    updateEditGridLayoutAfterRemoval();
}
function removeEditMedia(btn, mediaId) {
    if (!window._editRemovedMedia) window._editRemovedMedia = [];
    if (!window._editNewFiles) window._editNewFiles = [];
    
    const item = btn.closest('.media-item');
    if (!item) {
        console.error("❌ Không tìm thấy media item");
        return;
    }
    
    // Giải phóng URL object nếu là ảnh mới
    const mediaElement = item.querySelector('img, video');
    if (mediaElement && mediaElement.src && mediaElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(mediaElement.src);
    }
    
    // Xử lý dựa trên loại media
    if (typeof mediaId === 'number' || (!isNaN(mediaId) && mediaId > 100)) {
        // Đây là ảnh cũ từ database
        console.log("🟡 Removing OLD media with ID:", mediaId);
        
        if (!window._editRemovedMedia.includes(mediaId)) {
            window._editRemovedMedia.push(mediaId);
        }
    } else if (typeof mediaId === 'string' && mediaId.startsWith('new_')) {
        // Đây là ảnh mới vừa thêm
        const index = parseInt(mediaId.split('_')[1]);
        
        if (index >= 0 && index < window._editNewFiles.length) {
            // Xóa file khỏi mảng
            window._editNewFiles.splice(index, 1);
            
            // 🟢 QUAN TRỌNG: Cập nhật lại MediaID cho các file còn lại
            window._editNewFiles.forEach((file, newIndex) => {
                file.tempId = `new_${newIndex}`;
            });
        }
    }
    
    // Xóa ảnh preview khỏi DOM
    item.remove();
    
    // Cập nhật UI
    updateEditGridLayoutAfterRemoval();
}
function renderEditMediaPreviewAfterRemoval() {
    const allMedia = [];
    
    if (window._editMediaOrder && window._editMediaOrder.length > 0) {
        window._editMediaOrder.forEach(item => {
            if (typeof item === 'number') {
                const media = window._editOldMedia?.find(m => m.MediaID === item);
                if (media && !window._editRemovedMedia?.includes(item)) {
                    allMedia.push({
                        ...media,
                        isOld: true
                    });
                }
            } else if (typeof item === 'string' && item.startsWith('new_')) {
                const file = window._editNewFiles?.find(f => f.tempId === item);
                if (file) {
                    allMedia.push({
                        isNew: true,
                        file: file,
                        tempId: file.tempId,
                        MediaType: file.type.startsWith('video') ? 'video' : 'image'
                    });
                }
            }
        });
    } else {
        if (window._editOldMedia) {
            window._editOldMedia.forEach(media => {
                if (window._editRemovedMedia && window._editRemovedMedia.includes(media.MediaID)) {
                    return;
                }
                allMedia.push({
                    ...media,
                    isOld: true
                });
            });
        }
        
        if (window._editNewFiles) {
            window._editNewFiles.forEach((file, index) => {
                allMedia.push({
                    isNew: true,
                    file: file,
                    tempId: file.tempId || `new_${index}`,
                    MediaType: file.type.startsWith('video') ? 'video' : 'image'
                });
            });
        }
    }
    
    renderEditMediaPreviewFacebookStyle(allMedia);
}
// Sửa hàm renderEditMediaPreviewFacebookStyle để dùng layout giống renderEditMediaPreviewCorrectLayout
function renderEditMediaPreviewFacebookStyle(mediaList) {
    const wrap = document.getElementById("edit-media-preview");
    if (!wrap) {
        console.error("❌ Không tìm thấy edit-media-preview container");
        return;
    }
    
    wrap.innerHTML = "";
    wrap.className = "edit-media-preview";
    wrap.style.display = "grid";
    wrap.style.marginTop = "12px";
    wrap.style.gap = "2px";
    wrap.style.background = "#000";
    wrap.style.borderRadius = "8px";
    wrap.style.overflow = "hidden";
    wrap.style.border = "none";
    wrap.style.padding = "0";
    
    const count = mediaList.length;
    
    if (count === 0) {
        wrap.style.display = "none";
        return;
    }
    
    // SỬA: SỬ DỤNG CÙNG LOGIC LAYOUT NHƯ HÀM CHÍNH
    if (count === 1) {
        wrap.classList.add("grid-1");
        wrap.style.gridTemplateColumns = "1fr";
        wrap.style.gridTemplateRows = "350px";
        wrap.style.height = "350px";
    } 
    else if (count === 2) {
        wrap.classList.add("grid-2");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px";
        wrap.style.height = "200px";
    }
    else if (count === 3) {
        wrap.classList.add("grid-3");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px 200px";
        wrap.style.height = "400px";
    }
    else if (count === 4) {
        wrap.classList.add("grid-4");
        wrap.style.gridTemplateColumns = "1fr 1fr";
        wrap.style.gridTemplateRows = "200px 200px";
        wrap.style.height = "400px";
    }
    else if (count === 5) {
        wrap.classList.add("grid-5");
        wrap.style.gridTemplateColumns = "2fr 1fr 1fr";
        wrap.style.gridTemplateRows = "1fr 1fr";
        wrap.style.height = "400px";
        wrap.style.maxHeight = "500px";
    }
    else if (count >= 6) {
        // SỬA: DÙNG CÙNG LAYOUT VỚI HÀM CHÍNH
        wrap.classList.add("grid-6-fixed");
        wrap.style.gridTemplateColumns = "1fr 1fr 1fr";
        wrap.style.gridTemplateRows = "1fr 1fr";
        wrap.style.height = "400px";
        wrap.style.maxHeight = "500px";
    }
    
    const displayCount = Math.min(count, 6);
    const remaining = count - 6;
    
    for (let i = 0; i < displayCount; i++) {
        const media = mediaList[i];
        const isLast = i === 5 && remaining > 0;
        
        const itemDiv = document.createElement("div");
        itemDiv.className = `media-item media-${i} ${isLast && remaining > 0 ? 'overlay-item' : ''}`;
        itemDiv.dataset.index = i;
        
        if (media.isOld) {
            itemDiv.dataset.mediaId = media.MediaID;
        } else {
            itemDiv.dataset.fileIndex = media.index;
        }
        
        // SỬA: ĐƠN GIẢN HÓA, KHÔNG CẦN ĐIỀU CHỈNH THỦ CÔNG
        // CSS sẽ tự xử lý layout
        
        itemDiv.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-preview-btn') || 
                e.target.closest('.remove-preview-btn') ||
                e.target.classList.contains('more-overlay') ||
                e.target.closest('.more-overlay')) {
                return;
            }
            openEditMediaViewer(i);
        });
        
        let mediaUrl = "";
        let isVideo = false;
        
        if (media.isOld) {
            mediaUrl = media.FilePath.startsWith("http") 
                ? media.FilePath 
                : window.location.origin + media.FilePath;
            isVideo = media.MediaType === "video";
        } else {
            try {
                mediaUrl = URL.createObjectURL(media.file);
                isVideo = media.file.type.startsWith("video");
            } catch (error) {
                console.error("❌ Error creating object URL:", error);
                mediaUrl = "";
            }
        }
        
        if (mediaUrl) {
            if (isVideo) {
                itemDiv.innerHTML = `
                    <video src="${mediaUrl}" class="media-preview" controls muted></video>
                `;
            } else {
                itemDiv.innerHTML = `
                    <img src="${mediaUrl}" class="media-preview" loading="lazy" alt="Ảnh ${i + 1}">
                `;
            }
        } else {
            itemDiv.innerHTML = `
                <div class="media-preview-error">
                    ❌ Lỗi hiển thị
                </div>
            `;
        }
        
        if (isLast && remaining > 0) {
            itemDiv.innerHTML += `
                <div class="more-overlay">
                    <div class="more-text">+${remaining}</div>
                </div>
            `;
        }
        
        const removeFunc = media.isOld ? 
            `removeEditMedia(this, ${media.MediaID})` : 
            `removeEditMedia(this, 'new_${media.index}')`;
        
        itemDiv.innerHTML += `
            <button class="remove-preview-btn" 
                    onclick="${removeFunc}; event.stopPropagation();">×</button>
        `;
        
        wrap.appendChild(itemDiv);
    }
}
function updateEditGridLayoutAfterRemoval() {
    const allRemainingMedia = [];
    
    // Lấy ảnh cũ chưa bị xóa
    if (window._editOldMedia && window._editRemovedMedia) {
        window._editOldMedia.forEach(media => {
            if (!window._editRemovedMedia.includes(media.MediaID)) {
                allRemainingMedia.push({
                    MediaID: media.MediaID,
                    FilePath: media.FilePath,
                    MediaType: media.MediaType,
                    PostID: media.PostID
                });
            }
        });
    }
    
    // Lấy ảnh mới đã thêm
    if (window._editNewFiles && window._editNewFiles.length > 0) {
        window._editNewFiles.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            allRemainingMedia.push({
                MediaID: file.tempId || `new_${index}`, // 🟢 Dùng tempId nếu có
                FilePath: url,
                MediaType: file.type.startsWith('video') ? 'video' : 'image',
                file: file
            });
        });
    }
    
    // Kiểm tra nếu không còn ảnh nào
    if (allRemainingMedia.length === 0) {
        const wrap = document.getElementById("edit-media-preview");
        if (wrap) {
            wrap.innerHTML = "";
            wrap.style.display = "none";
            wrap.className = "edit-media-preview";
            wrap.style.cssText = "";
        }
        return;
    }
    
    // Render với media list đã được xử lý đúng
    renderEditMediaPreviewCorrectLayout(allRemainingMedia);
}
// 🆕 Hàm reset các biến edit
function resetEditVariables() {
    window._editRemovedMedia = [];
    window._editNewFiles = [];
    window._editOldMedia = [];
    window._editMediaOrder = [];
    window._editSelectedPrivacy = "public";
    window._editIsSharedPost = false;
}

/* ========= XỬ LÝ BÀI CHIA SẺ KHI BÀI GỐC BỊ XÓA ========= */

/**
 * 🆕 QUAN TRỌNG: KHI BÀI GỐC BỊ XÓA, HIỆN THÔNG BÁO RÕ RÀNG
 */
function updateSharedPostWhenOriginalDeleted(postId, responseData) {
    console.log("🟡 Cập nhật bài chia sẻ khi bài gốc bị xóa:", postId);
    
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) {
        console.error("❌ Không tìm thấy post element");
        return;
    }
    
    // 1. ĐÁNH DẤU LÀ BÀI CHIA SẺ CÓ BÀI GỐC ĐÃ XÓA
    postElement.classList.add('original-deleted');
    postElement.classList.add('shared-post-deleted');
    postElement.setAttribute('data-original-deleted', 'true');
    
    // 2. ẨN TOÀN BỘ MEDIA CỦA BÀI GỐC
    const mediaContainers = postElement.querySelectorAll(
        '.post-media-grid, .shared-media-container, .post-media, [data-original="true"]'
    );
    mediaContainers.forEach(container => {
        container.style.display = 'none';
        container.innerHTML = '';
    });
    
    // 3. ẨN NỘI DUNG BÀI GỐC (NẾU CÓ)
    const originalContent = postElement.querySelector('.original-content, .shared-original-text, .shared-from-content');
    if (originalContent) {
        originalContent.style.display = 'none';
        originalContent.innerHTML = '';
    }
    
    // 4. ẨN THÔNG TIN USER GỐC
    const originalUserInfo = postElement.querySelector('.shared-from-user, .original-user-info, .shared-original-user');
    if (originalUserInfo) {
        originalUserInfo.style.display = 'none';
    }
    
    // 5. THAY ĐỔI NỘI DUNG BÀI CHIA SẺ THÀNH THÔNG BÁO
    const sharedCaption = postElement.querySelector('.shared-caption, .post-content');
    if (sharedCaption) {
        const currentContent = sharedCaption.textContent.trim();
        sharedCaption.innerHTML = `
            <div style="margin-bottom: 10px;">
                ${escapeHtml(currentContent)}
            </div>
            <div class="deleted-original-notice" style="margin-top: 10px;">
                <div class="deleted-original-content">
                    <span class="material-icons" style="color: #f44336; margin-right: 8px;">warning</span>
                    <span class="deleted-text" style="color: #f44336; font-weight: 500;">
                        ⚠️ Bài viết gốc không còn khả dụng
                    </span>
                </div>
            </div>
        `;
    }
    
    // 6. THÊM THÔNG BÁO LỚN NỔI BẬT
    let bigNotice = postElement.querySelector('.original-deleted-big-notice');
    if (!bigNotice) {
        bigNotice = document.createElement('div');
        bigNotice.className = 'original-deleted-big-notice';
        bigNotice.style.cssText = `
            background: #fff3cd;
            border: 2px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin: 15px 0;
            text-align: center;
        `;
        
        bigNotice.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                <span class="material-icons" style="color: #e74c3c; font-size: 24px;">block</span>
                <h4 style="margin: 0; color: #e74c3c;">Bài viết gốc đã bị xóa</h4>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">
                Bài viết mà bạn đang xem là một bài chia sẻ. Bài viết gốc đã không còn khả dụng.
            </p>
            <div style="margin-top: 10px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px dashed #ddd;">
                <small style="color: #888;">
                    📝 <strong>Nội dung hiện tại:</strong> Lời chia sẻ của người dùng
                </small>
            </div>
        `;
        
        const postContent = postElement.querySelector('.post-body, .post-content-wrapper');
        if (postContent) {
            postContent.prepend(bigNotice);
        } else {
            postElement.prepend(bigNotice);
        }
    }
    
    // 7. ẨN NÚT "XEM BÀI GỐC" NẾU CÓ
    const viewOriginalBtn = postElement.querySelector('.view-original-btn, .see-original-post');
    if (viewOriginalBtn) {
        viewOriginalBtn.style.display = 'none';
        viewOriginalBtn.innerHTML = '<span class="material-icons">block</span> Bài gốc không khả dụng';
        viewOriginalBtn.disabled = true;
        viewOriginalBtn.style.opacity = '0.5';
        viewOriginalBtn.style.cursor = 'not-allowed';
    }
    
    // 8. CẬP NHẬT PRIVACY HIỂN THỊ
    const privacyBadge = postElement.querySelector('.privacy-badge');
    if (privacyBadge && responseData.post && responseData.post.Privacy) {
        const privacyMap = {
            'public': 'Công khai',
            'followers': 'Người theo dõi',
            'private': 'Chỉ mình tôi'
        };
        privacyBadge.textContent = `🔒 ${privacyMap[responseData.post.Privacy] || 'Công khai'}`;
        privacyBadge.style.background = '#f8f9fa';
        privacyBadge.style.color = '#6c757d';
    }
    
    // 9. THÊM DÒNG THỜI GIAN "Đã chia sẻ khi bài gốc còn tồn tại"
    const timeElement = postElement.querySelector('.post-time, .post-date');
    if (timeElement) {
        const originalTime = timeElement.textContent;
        timeElement.innerHTML = `
            <span>${originalTime}</span>
            <span style="color: #999; font-size: 12px; margin-left: 5px;">
                • Đã chia sẻ khi bài gốc còn tồn tại
            </span>
        `;
    }
    
    console.log("✅ Đã cập nhật UI: Bài chia sẻ hiển thị thông báo rõ ràng");
    
    // 10. HIỂN THỊ THÔNG BÁO CHO NGƯỜI DÙNG
    showPostNotification("⚠️ Bài viết bạn đang xem là bài chia sẻ. Bài gốc đã bị xóa.", 'warning');
}

/**
 * 🆕 KIỂM TRA TẤT CẢ BÀI CHIA SẺ TRÊN TRANG - CHẠY TỰ ĐỘNG (ĐÃ SỬA)
 */
async function checkAllSharedPostsForDeletedOriginal() {
    console.log("🔍 Tự động kiểm tra bài chia sẻ có bài gốc bị xóa...");
    
    const allPosts = document.querySelectorAll('[data-post-id]');
    let checkedCount = 0;
    let errorCount = 0;
    
    for (const postElement of allPosts) {
        const postId = postElement.dataset.postId;
        
        // Kiểm tra xem có phải bài chia sẻ không
        const isShared = postElement.classList.contains('shared-post') || 
                         postElement.querySelector('.shared-post-container') !== null ||
                         postElement.querySelector('[data-original-post-id]') !== null;
        
        if (!isShared || !postId) continue;
        
        checkedCount++;
        
        try {
            console.log(`🟡 Kiểm tra bài chia sẻ ${postId}...`);
            
            // Gọi API để kiểm tra trạng thái bài gốc
            const res = await fetch(`${BASE_URL}/backend/api/community/posts/get.php?id=${postId}`);
            
            if (!res.ok) {
                console.error(`❌ Lỗi HTTP ${res.status} khi kiểm tra bài ${postId}`);
                errorCount++;
                continue;
            }
            
            const data = await res.json();
            
            if (!data.success) {
                console.error(`❌ API lỗi cho bài ${postId}:`, data.error);
                errorCount++;
                continue;
            }
            
            if (data.post && data.post.IsSharedPost) {
                console.log(`🟡 Bài chia sẻ ${postId}:`, {
                    isShared: data.post.IsSharedPost,
                    originalPostId: data.post.OriginalPostID,
                    originalExists: data.original_post ? data.original_post.exists : false
                });
                
                // NẾU BÀI GỐC BỊ XÓA
                if (data.original_post && (!data.original_post.exists || data.original_post.deleted)) {
                    console.log(`⚠️ Bài chia sẻ ${postId} có bài gốc đã bị xóa!`);
                    
                    // Cập nhật UI ngay lập tức
                    updateSharedPostWhenOriginalDeleted(postId, data);
                    
                    // Lưu vào localStorage để không kiểm tra lại
                    localStorage.setItem(`post_${postId}_original_deleted`, 'true');
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi kiểm tra bài chia sẻ ${postId}:`, error);
            errorCount++;
        }
        
        // Chờ 100ms giữa các request để không quá tải server
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Đã kiểm tra ${checkedCount} bài chia sẻ, ${errorCount} lỗi`);
}

/**
 * 🆕 SỬA HÀM KIỂM TRA KHI TRANG TẢI - Chỉ kiểm tra khi cần
 */
async function checkForDeletedOriginalPostsOnLoad() {
    console.log("🎯 Kiểm tra bài chia sẻ cần cập nhật khi trang tải...");
    
    // Chỉ chạy nếu có bài chia sẻ trên trang
    const sharedPosts = document.querySelectorAll('.shared-post, [data-original-post-id]');
    
    if (sharedPosts.length === 0) {
        console.log("🟡 Không có bài chia sẻ trên trang, bỏ qua kiểm tra");
        return;
    }
    
    console.log(`🟡 Tìm thấy ${sharedPosts.length} bài chia sẻ, bắt đầu kiểm tra...`);
    
    // Đợi 2 giây để trang load hoàn tất
    setTimeout(async () => {
        await checkAllSharedPostsForDeletedOriginal();
    }, 2000);
}

/**
 * 🆕 THÊM CSS CHO BÀI CHIA SẺ CÓ BÀI GỐC BỊ XÓA
 */
function addDeletedPostNotificationStyles() {
    if (document.getElementById('deleted-post-notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'deleted-post-notification-styles';
    style.textContent = `
        .post-item.original-deleted {
            border-left: 4px solid #ff9800;
            background: #fffbf0;
        }
        
        .post-item.shared-post-deleted {
            position: relative;
        }
        
        .post-item.shared-post-deleted::before {
            content: "⚠️ BÀI CHIA SẺ";
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff9800;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 4px;
            z-index: 10;
        }
        
        .original-deleted-big-notice {
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .original-deleted .post-media-grid,
        .original-deleted .shared-media-container,
        .original-deleted [data-original="true"] {
            display: none !important;
        }
        
        .original-deleted .shared-caption,
        .original-deleted .post-content {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #6c757d;
        }
        
        .deleted-original-notice {
            background: #ffeaa7;
            border: 1px solid #fdcb6e;
            border-radius: 6px;
            padding: 8px 12px;
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .view-original-btn:disabled {
            background: #e9ecef !important;
            color: #6c757d !important;
            border-color: #dee2e6 !important;
            cursor: not-allowed !important;
        }
        
        .shared-post-deleted .post-avatar::after {
            content: "↩️";
            position: absolute;
            bottom: -5px;
            right: -5px;
            background: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            border: 1px solid #ddd;
        }
    `;
    
    document.head.appendChild(style);
}

async function submitEditPost(postId) {
    console.log("🟡 ========== SUBMIT EDIT ==========");
    
    const contentEl = document.getElementById("edit-content");
    if (!contentEl) {
        console.error("❌ Không tìm thấy textarea edit content");
        alert("Lỗi: Không tìm thấy nội dung chỉnh sửa");
        return;
    }
    
    const content = contentEl.value.trim();
    const privacy = window._editSelectedPrivacy || "public";
    const isSharedPost = window._editIsSharedPost || false;
    
    console.log("🟡 Edit data:", { 
        content, 
        privacy, 
        postId, 
        isSharedPost 
    });
    
    if (isSharedPost) {
        if (!content) {
            alert("Hãy nhập nội dung cho bài chia sẻ.");
            return;
        }
    } else {
        const hasOldMedia = window._editOldMedia && window._editOldMedia.length > 0;
        const hasNewFiles = window._editNewFiles && window._editNewFiles.length > 0;
        const hasRemovedMedia = window._editRemovedMedia && window._editRemovedMedia.length > 0;
        
        const remainingOldMedia = hasOldMedia ? 
            window._editOldMedia.filter(m => !window._editRemovedMedia.includes(m.MediaID)) : [];
        
        const totalMediaCount = remainingOldMedia.length + (window._editNewFiles ? window._editNewFiles.length : 0);
        
        if (!content && totalMediaCount === 0) {
            alert("Hãy nhập nội dung hoặc chọn ít nhất một ảnh.");
            return;
        }
    }
    
    const fd = new FormData();
    fd.append("post_id", postId);
    fd.append("content", content);
    fd.append("privacy", privacy);
    
    if (!isSharedPost) {
        if (window._editMediaOrder && window._editMediaOrder.length > 0) {
            const orderJson = JSON.stringify(window._editMediaOrder);
            fd.append("media_order", orderJson);
        }
        
        if (window._editRemovedMedia && window._editRemovedMedia.length > 0) {
            const removedJson = JSON.stringify(window._editRemovedMedia);
            fd.append("remove_media", removedJson);
        }
        
        if (window._editNewFiles && window._editNewFiles.length > 0) {
            const orderedNewFiles = [];
            if (window._editMediaOrder) {
                window._editMediaOrder.forEach(item => {
                    if (typeof item === 'string' && item.startsWith('new_')) {
                        const file = window._editNewFiles.find(f => f.tempId === item);
                        if (file) {
                            orderedNewFiles.push(file);
                        }
                    }
                });
            } else {
                orderedNewFiles.push(...window._editNewFiles);
            }
            
            orderedNewFiles.forEach((file, index) => {
                fd.append(`add_media[]`, file);
            });
        }
    } else {
        fd.append("is_shared_post", "1");
    }
    
    const btn = document.querySelector(".edit-save-btn");
    if (!btn) {
        console.error("❌ Không tìm thấy nút lưu");
        return;
    }
    
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Đang lưu...";
    
    try {
        console.log("🟡 Sending edit request...");
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/update.php`, {
            method: "POST",
            body: fd,
            credentials: "include"
        });
        
        console.log("🟡 Response status:", res.status);
        
        const data = await res.json();
        console.log("🟢 Server response:", data);
        
        if (!data.success) {
            alert("❌ Lỗi: " + (data.error || "Không thể cập nhật bài viết"));
            
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }
        
        console.log("✅ Edit successful!");
        
        // 🆕 QUAN TRỌNG: KIỂM TRA BÀI GỐC NẾU LÀ BÀI CHIA SẺ
        if (isSharedPost && data.original_post) {
            console.log("🟡 Bài chia sẻ - Kiểm tra bài gốc:", data.original_post);
            
            if (!data.original_post.exists || data.original_post.deleted) {
                console.log("⚠️ Bài gốc đã bị xóa, cập nhật UI đặc biệt...");
                
                updateSharedPostWhenOriginalDeleted(postId, data);
                
                showPostNotification("⚠️ Đã cập nhật bài CHIA SẺ. Bài gốc không còn khả dụng.", 'warning');
                
                const modal = document.getElementById("edit-modal");
                if (modal) modal.remove();
                
                resetEditVariables();
                
                return;
            }
        }
        
        const modal = document.getElementById("edit-modal");
        if (modal) {
            modal.remove();
        }
        
        if (!isSharedPost && window._editNewFiles && window._editNewFiles.length > 0) {
            window._editNewFiles.forEach(file => {
                const mediaElements = document.querySelectorAll('.media-preview-media, .media-preview');
                mediaElements.forEach(el => {
                    if (el.src && el.src.startsWith('blob:')) {
                        URL.revokeObjectURL(el.src);
                    }
                });
            });
        }
        
        showPostNotification("✅ Đã cập nhật bài viết thành công!", 'success');
        
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (err) {
        console.error("❌ Edit error:", err);
        alert("❌ Lỗi: " + err.message);
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
        
    } finally {
        if (!(isSharedPost && data && data.original_post && 
              (!data.original_post.exists || data.original_post.deleted))) {
            resetEditVariables();
        }
        
        console.log("🟡 ========== SUBMIT EDIT END ==========");
    }
}

// 🆕 TỰ ĐỘNG CHẠY KHI TRANG TẢI - ĐÃ SỬA
document.addEventListener('DOMContentLoaded', function() {
    console.log("🎯 Tự động kiểm tra bài chia sẻ có bài gốc bị xóa...");
    
    // Thêm CSS - ĐÃ SỬA: XÓA DÒNG GỌI addSharedPostDeletedStyles()
    addDeletedPostNotificationStyles();
    addEditModalStyles();
    addPostNotificationStyles();
    
    // Chỉ chạy kiểm tra nếu có bài chia sẻ
    const hasSharedPosts = document.querySelectorAll('.shared-post, [data-original-post-id]').length > 0;
    
    if (hasSharedPosts) {
        // Chờ 3 giây để DOM load xong, sau đó kiểm tra
        setTimeout(() => {
            checkAllSharedPostsForDeletedOriginal();
        }, 3000);
    } else {
        console.log("🟡 Không có bài chia sẻ, bỏ qua kiểm tra");
    }
    
    // KIỂM TRA LẠI KHI CÓ POST MỚI ĐƯỢC LOAD (ajax, scroll, v.v.)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                // Kiểm tra xem có bài chia sẻ mới không
                const newSharedPosts = [];
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (node.classList.contains('shared-post') || node.querySelector('[data-original-post-id]'))) {
                            newSharedPosts.push(node);
                        }
                        // Kiểm tra trong children
                        const childrenShared = node.querySelectorAll('.shared-post, [data-original-post-id]');
                        if (childrenShared.length > 0) {
                            newSharedPosts.push(...childrenShared);
                        }
                    }
                });
                
                if (newSharedPosts.length > 0) {
                    console.log(`🟡 Phát hiện ${newSharedPosts.length} bài chia sẻ mới`);
                    // Chờ 1 giây để post mới render xong
                    setTimeout(() => {
                        checkAllSharedPostsForDeletedOriginal();
                    }, 1000);
                }
            }
        });
    });
    
    // Quan sát toàn bộ body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

/**
 * 🆕 HÀM KIỂM TRA MỘT BÀI CHIA SẺ CỤ THỂ
 */
async function checkSingleSharedPost(postId) {
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/get.php?id=${postId}`);
        const data = await res.json();
        
        if (data.success && data.post && data.post.IsSharedPost) {
            if (data.original_post && (!data.original_post.exists || data.original_post.deleted)) {
                console.log(`⚠️ Bài ${postId} là bài chia sẻ có gốc bị xóa`);
                updateSharedPostWhenOriginalDeleted(postId, data);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`❌ Lỗi kiểm tra bài ${postId}:`, error);
        return false;
    }
}

/* ========= ĐỐI TƯỢNG XEM (CHANGE PRIVACY) ========= */
function changePrivacy(postId) {
    const post = window._communityPosts?.[postId];
    const currentPrivacy = post?.Privacy || "public";
    openPrivacyModal(postId, currentPrivacy);
}

function openPrivacyModal(postId, currentPrivacy) {
    const old = document.getElementById("privacy-modal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "privacy-modal";
    modal.className = "privacy-modal";

    const list = [
        { key: "public", icon: "🌍", label: "Công khai", desc: "Bất kỳ ai cũng có thể xem" },
        { key: "followers", icon: "👥", label: "Người theo dõi", desc: "Chỉ những người theo dõi bạn" },
        { key: "private", icon: "🔒", label: "Chỉ mình tôi", desc: "Chỉ có bạn mới xem được" }
    ];

    modal.innerHTML = `
        <div class="pm-overlay" onclick="closePrivacyModal()"></div>

        <div class="pm-box">
            <div class="pm-header">
                Chọn đối tượng
                <span class="pm-close" onclick="closePrivacyModal()">✕</span>
            </div>

            <div class="pm-list">
                ${list.map(item => `
                    <div class="pm-item ${item.key === currentPrivacy ? "selected" : ""}"
                        onclick="selectPrivacy('${item.key}')">
                        <div class="pm-left-icon">${item.icon}</div>
                        <div class="pm-text">
                            <div class="pm-label">${item.label}</div>
                            <div class="pm-desc">${item.desc}</div>
                        </div>
                        <div class="pm-radio">
                            <span class="circle"></span>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="pm-footer">
                <button class="pm-btn cancel" onclick="closePrivacyModal()">Hủy</button>
                <button class="pm-btn save" onclick="savePrivacy(${postId})">Lưu</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.SELECTED_PRIVACY = currentPrivacy;
}

function selectPrivacy(v) {
    window.SELECTED_PRIVACY = v;

    document.querySelectorAll(".pm-item").forEach(el => {
        el.classList.remove("selected");
    });

    const selected = document.querySelector(`.pm-item[onclick="selectPrivacy('${v}')"]`);
    if (selected) selected.classList.add("selected");
}

function saveEditedPost(postId) {
    console.log("🟡 saveEditedPost called for:", postId);
    submitEditPost(postId);
}

async function savePrivacy(postId) {
    const fd = new FormData();
    fd.append("post_id", postId);
    fd.append("privacy", window.SELECTED_PRIVACY);

    const saveBtn = document.querySelector('.pm-btn.save');
    if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
    }

    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/update_privacy.php`, {
            method: "POST",
            body: fd
        });

        const data = await res.json();

        if (!data.success) {
            alert(data.error);
            return;
        }

        closePrivacyModal();
        
        updatePostPrivacyUI(postId, window.SELECTED_PRIVACY);
        
        showPostNotification("✅ Đã cập nhật quyền riêng tư");

    } catch (error) {
        console.error("Error saving privacy:", error);
        alert("Lỗi: " + error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu";
        }
    }
}

function updatePostPrivacyUI(postId, newPrivacy) {
    console.log("🟡 Updating privacy UI for post:", postId, "to:", newPrivacy);
    
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) {
        console.error("❌ Không tìm thấy post element");
        return;
    }
    
    postElement.setAttribute("data-privacy", newPrivacy);
    
    const privacyIcon = postElement.querySelector(".privacy-icon");
    if (privacyIcon) {
        const iconMap = {
            'public': '🌍',
            'followers': '👥',
            'private': '🔒'
        };
        privacyIcon.textContent = iconMap[newPrivacy] || '🌍';
    }
    
    const privacyText = postElement.querySelector(".privacy-text");
    if (privacyText) {
        const textMap = {
            'public': 'Công khai',
            'followers': 'Người theo dõi',
            'private': 'Chỉ mình tôi'
        };
        privacyText.textContent = textMap[newPrivacy] || 'Công khai';
    }
    
    console.log("✅ Privacy UI updated");
}

function closePrivacyModal() {
    const m = document.getElementById("privacy-modal");
    if (m) m.remove();
}

function confirmDeletePost(postId) {
    openDeletePostModal(postId);
}

// Hàm hiển thị modal xác nhận xóa
function openDeletePostModal(postId) {
    const old = document.getElementById("delete-post-modal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "delete-post-modal";
    modal.className = "delete-post-modal";

    modal.innerHTML = `
        <div class="dp-overlay" onclick="closeDeletePostModal()"></div>

        <div class="dp-box">
            <div class="dp-title">Xóa bài viết?</div>
            <div class="dp-text">Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.</div>

            <div class="dp-footer">
                <button class="dp-btn cancel" onclick="closeDeletePostModal()">Hủy</button>
                <button class="dp-btn delete" onclick="executeDeletePost(${postId})">Xóa</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeDeletePostModal() {
    const m = document.getElementById("delete-post-modal");
    if (m) m.remove();
}

// 🆕 Hàm thực hiện xóa sau khi đã xác nhận
async function executeDeletePost(postId) {
    // Lấy nút xóa và thay đổi trạng thái
    const deleteBtn = document.querySelector('.dp-btn.delete');
    const originalText = deleteBtn?.textContent || "Xóa";
    
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Đang xóa...";
    }

    try {
        console.log("🟡 Bắt đầu xóa bài viết:", postId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: `post_id=${postId}`
        });

        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            console.warn("⚠️ Response không phải JSON, coi như thành công");
            data = { success: true };
        }

        // Đóng modal xóa
        closeDeletePostModal();

        if (!data || !data.success) {
            const errorMsg = data?.error || data?.message || "Không thể xóa bài viết";
            console.error("❌ Lỗi xóa bài viết:", errorMsg);
            
            showPostNotification(`❌ ${errorMsg}`, 'error');
            return;
        }

        console.log("✅ Xóa bài viết thành công:", data);
        
        // Hiển thị thông báo thành công
        let notificationMsg = "✅ Đã xóa bài viết thành công!";
        if (data.is_original_post) {
            notificationMsg = "✅ Đã xóa bài viết.";
        }
        
        showPostNotification(notificationMsg, 'success');

        // Xóa bài viết khỏi giao diện với hiệu ứng
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            postElement.style.opacity = '0';
            postElement.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                if (postElement.parentNode) {
                    postElement.remove();
                }
            }, 300);
        }

        // Nếu là bài gốc bị xóa, tự động kiểm tra lại các bài chia sẻ
        if (data.is_original_post) {
            setTimeout(() => {
                console.log("🔄 Tự động kiểm tra bài chia sẻ sau khi xóa bài gốc...");
                checkAllSharedPostsForDeletedOriginal();
            }, 800);
        }

    } catch (error) {
        console.error("❌ Lỗi khi xóa bài viết:", error);
        closeDeletePostModal();
        showPostNotification("❌ Lỗi kết nối khi xóa bài viết", 'error');
    }
}

// 🆕 Thêm CSS cho modal xóa
function addDeleteModalStyles() {
    if (document.getElementById('delete-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'delete-modal-styles';
    style.textContent = `
        .delete-post-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .dp-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .dp-box {
            position: relative;
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: fadeInUp 0.3s ease;
            overflow: hidden;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .dp-title {
            padding: 24px 24px 8px;
            font-size: 20px;
            font-weight: 600;
            color: #333;
        }
        
        .dp-text {
            padding: 0 24px 24px;
            color: #666;
            line-height: 1.5;
            font-size: 15px;
        }
        
        .dp-footer {
            display: flex;
            border-top: 1px solid #eee;
            padding: 16px 24px;
            gap: 12px;
        }
        
        .dp-btn {
            flex: 1;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }
        
        .dp-btn.cancel {
            background: #f5f5f5;
            color: #333;
        }
        
        .dp-btn.cancel:hover {
            background: #e8e8e8;
        }
        
        .dp-btn.delete {
            background: #ff4444;
            color: white;
        }
        
        .dp-btn.delete:hover {
            background: #ff3333;
        }
        
        .dp-btn.delete:disabled {
            background: #ff9999;
            cursor: not-allowed;
        }
        
        .dp-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #666;
            font-size: 18px;
        }
        
        .dp-close:hover {
            background: #e8e8e8;
        }
    `;
    
    document.head.appendChild(style);
}

// 🆕 Tìm và sửa tất cả các nút xóa bài viết để dùng popup custom
function replaceAllDeleteConfirmations() {
    // Tìm tất cả nút xóa hiện có
    const deleteButtons = document.querySelectorAll('[onclick*="deletePost"], [onclick*="confirmDelete"]');
    
    deleteButtons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            // Tìm postId trong onclick
            const match = onclickAttr.match(/deletePost\((\d+)\)/);
            if (match && match[1]) {
                const postId = match[1];
                // Thay thế bằng hàm custom
                button.setAttribute('onclick', `confirmDeletePost(${postId})`);
            }
        }
    });
}

// 🆕 Chạy khi trang load
document.addEventListener('DOMContentLoaded', function() {
    addDeleteModalStyles();
    setTimeout(replaceAllDeleteConfirmations, 1000);
    
    // Quan sát DOM để cập nhật nút xóa mới
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                replaceAllDeleteConfirmations();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
function checkAndUpdateSharedPosts() {
    // Tìm tất cả bài chia sẻ trên trang
    const sharedPosts = document.querySelectorAll('[data-post-id]');
    
    sharedPosts.forEach(postElement => {
        const postId = postElement.dataset.postId;
        
        // Gọi API kiểm tra
        fetch(`${BASE_URL}/backend/api/community/posts/get.php?id=${postId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.post.IsSharedPost) {
                    if (data.original_post && data.original_post.deleted) {
                        // Cập nhật UI: hiển thị thông báo bài gốc đã xóa
                        const contentElement = postElement.querySelector('.post-content');
                        if (contentElement) {
                            contentElement.innerHTML += `<div style="color: #f44336; margin-top: 10px; padding: 10px; background: #ffebee; border-radius: 5px;">⚠️ Bài viết gốc đã bị xóa</div>`;
                        }
                    }
                }
            })
            .catch(console.error);
    });
}

/* ========= MEDIA VIEWER ========= */
function openEditMediaViewer(startIndex = 0) {
    const allMedia = [];
    
    if (window._editOldMedia && window._editRemovedMedia) {
        window._editOldMedia.forEach((media, index) => {
            if (window._editRemovedMedia.includes(media.MediaID)) {
                return;
            }
            
            const url = media.FilePath.startsWith("http") 
                ? media.FilePath 
                : window.location.origin + media.FilePath;
            
            allMedia.push({
                type: media.MediaType === "video" ? "video" : "image",
                src: url,
                isOld: true,
                mediaId: media.MediaID,
                index: allMedia.length
            });
        });
    }
    
    if (window._editNewFiles) {
        window._editNewFiles.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith("video");
            
            allMedia.push({
                type: isVideo ? "video" : "image",
                src: url,
                isNew: true,
                fileIndex: index,
                index: allMedia.length
            });
        });
    }
    
    if (allMedia.length === 0) return;
    
    let adjustedIndex = startIndex;
    if (adjustedIndex >= allMedia.length) {
        adjustedIndex = 0;
    }
    
    window._editMediaViewer = {
        list: allMedia,
        index: adjustedIndex
    };
    
    const old = document.getElementById("edit-media-viewer");
    if (old) old.remove();
    
    const wrap = document.createElement("div");
    wrap.id = "edit-media-viewer";
    wrap.className = "edit-media-viewer";
    
    wrap.innerHTML = `
        <div class="emv-overlay" onclick="closeEditMediaViewer()"></div>
        
        <div class="emv-container">
            <button class="emv-close" onclick="closeEditMediaViewer()">✕</button>
            
            <div class="emv-counter" id="emv-counter"></div>
            
            <div class="emv-nav">
                <button class="emv-prev" onclick="prevEditMedia()">❮</button>
                <button class="emv-next" onclick="nextEditMedia()">❯</button>
            </div>
            
            <div class="emv-media-container" id="emv-media-container"></div>
            
            <div class="emv-thumbnails" id="emv-thumbnails"></div>
        </div>
    `;
    
    document.body.appendChild(wrap);
    updateEditMediaViewer();
    updateEditThumbnails();
    
    document.body.style.overflow = "hidden";
}

function updateEditMediaViewer() {
    const container = document.getElementById("emv-media-container");
    const counter = document.getElementById("emv-counter");
    
    if (!container || !counter || !window._editMediaViewer) return;
    
    const viewer = window._editMediaViewer;
    const current = viewer.list[viewer.index];
    
    container.innerHTML = '';
    
    counter.textContent = `${viewer.index + 1}/${viewer.list.length}`;
    
    if (current.type === "image") {
        const img = document.createElement("img");
        img.className = "emv-main-image";
        img.src = current.src;
        img.alt = `Ảnh ${viewer.index + 1}`;
        container.appendChild(img);
    } else {
        const video = document.createElement("video");
        video.className = "emv-main-video";
        video.src = current.src;
        video.controls = true;
        video.autoplay = true;
        container.appendChild(video);
    }
}

function updateEditThumbnails() {
    const thumbContainer = document.getElementById("emv-thumbnails");
    if (!thumbContainer || !window._editMediaViewer) return;
    
    const viewer = window._editMediaViewer;
    
    thumbContainer.innerHTML = viewer.list.map((item, index) => `
        <div class="emv-thumb ${index === viewer.index ? 'active' : ''}" 
             onclick="goToEditMedia(${index})">
            ${item.type === "image" ? 
                `<img src="${item.src}" alt="Thumb ${index + 1}">` : 
                `<div class="emv-thumb-video">
                    <video src="${item.src}" muted></video>
                    <span class="emv-play-icon">▶</span>
                </div>`
            }
        </div>
    `).join('');
}

function prevEditMedia() {
    if (!window._editMediaViewer) return;
    const viewer = window._editMediaViewer;
    viewer.index = (viewer.index - 1 + viewer.list.length) % viewer.list.length;
    updateEditMediaViewer();
    updateEditThumbnails();
}

function nextEditMedia() {
    if (!window._editMediaViewer) return;
    const viewer = window._editMediaViewer;
    viewer.index = (viewer.index + 1) % viewer.list.length;
    updateEditMediaViewer();
    updateEditThumbnails();
}

function goToEditMedia(index) {
    if (!window._editMediaViewer) return;
    window._editMediaViewer.index = index;
    updateEditMediaViewer();
    updateEditThumbnails();
}

function closeEditMediaViewer() {
    const viewer = document.getElementById("edit-media-viewer");
    if (viewer) viewer.remove();
    
    if (window._editMediaViewer && window._editMediaViewer.list) {
        window._editMediaViewer.list.forEach(item => {
            if (item.isNew && item.src && item.src.startsWith('blob:')) {
                URL.revokeObjectURL(item.src);
            }
        });
    }
    
    window._editMediaViewer = null;
    document.body.style.overflow = "";
}

/**
 * Hiển thị thông báo cho post actions
 */
function showPostNotification(message, type = 'success') {
    const oldNotification = document.getElementById('post-notification');
    if (oldNotification) oldNotification.remove();
    
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
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

/**
 * Thêm CSS cho post notification
 */
function addPostNotificationStyles() {
    if (document.getElementById('post-notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'post-notification-styles';
    style.textContent = `
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
        
        .post-notification-icon {
            font-size: 20px;
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
        
        .post-updated {
            animation: highlightPost 2s ease;
        }
        
        @keyframes highlightPost {
            0% {
                background: rgba(33, 150, 243, 0.1);
                box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.5);
            }
            50% {
                background: rgba(33, 150, 243, 0.2);
                box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
            }
            100% {
                background: transparent;
                box-shadow: none;
            }
        }
        
        .privacy-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #f0f2f5;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            color: #65676b;
            margin-left: 8px;
        }
        
        .privacy-badge.public {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .privacy-badge.followers {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        
        .privacy-badge.private {
            background: #ffebee;
            color: #d32f2f;
        }
    `;
    
    document.head.appendChild(style);
}

// Chạy khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Chờ 2 giây rồi kiểm tra
    setTimeout(checkAndUpdateSharedPosts, 2000);
}); 