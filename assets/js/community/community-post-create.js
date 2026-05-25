// community-post-create.js
// ========= PHẦN ĐĂNG BÀI VÀ PREVIEW MEDIA =========

// Lưu file chọn
window.SELECTED_FILES = [];

// Hàm điều hướng đến trang user profile với khả năng quay lại
function goToUserProfileWithBack(username) {
    if (!username || username === 'undefined' || username === 'null') {
        console.error('❌ Không tìm thấy username');
        alert('Không thể mở trang cá nhân');
        return;
    }
    
    console.log('🟡 Mở trang cá nhân của:', username);
    
    // 🟢 LƯU TRẠNG THÁI HIỆN TẠI ĐỂ QUAY LẠI
    localStorage.setItem('community_previous_page', window.location.href);
    localStorage.setItem('community_previous_title', document.title);
    localStorage.setItem('community_previous_scroll', window.scrollY.toString());
    
    let profileUrl;
    
    if (window.CURRENT_USERNAME && username === window.CURRENT_USERNAME) {
        // Mở profile của chính mình
        profileUrl = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/users/public_profile.php?id=${window.CURRENT_USER_ID || 0}`;
    } else {
        // 🟢 FIX: Sử dụng User ID thay vì username
        profileUrl = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/users/public_profile.php?u=${encodeURIComponent(username)}`;
    }
    
    // 🟢 ĐÓNG MODAL TRƯỚC KHI CHUYỂN TRANG
    const modal = document.getElementById("post-modal");
    if (modal && modal.style.display === "flex") {
        closePostModal();
    }
    
    // 🟢 CHUYỂN TRANG TRONG CÙNG TAB
    setTimeout(() => {
        window.location.href = profileUrl;
    }, 100);
}

// Hàm mở profile bằng user ID
function openUserProfileById(userId) {
    console.log("🎯 openUserProfileById called from create:", userId);
    
    // Chuyển đổi sang số
    const id = Number(userId);
    
    // Kiểm tra hợp lệ
    if (!id || isNaN(id) || id <= 0) {
        console.error("❌ Invalid user ID:", userId);
        
        // Fallback: Mở profile của chính mình
        const currentId = Number(window.CURRENT_USER_ID) || 0;
        if (currentId && currentId > 0) {
            console.log("🔄 Falling back to current user ID:", currentId);
            window.location.href = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/users/public_profile.php?id=${currentId}`;
        } else {
            alert("Không tìm thấy thông tin người dùng");
        }
        return false;
    }
    
    // Mở profile
    console.log("✅ Opening profile for ID:", id);
    window.location.href = `${window.BASE_URL || '/HeThongChamSocCaKoi'}/frontend/users/public_profile.php?id=${id}`;
    return true;
}

// ========= KHỞI TẠO KHI DOM LOADED =========
document.addEventListener("DOMContentLoaded", () => {
    // Focus vào textarea khi click input Facebook
    const facebookInput = document.querySelector('.facebook-input');
    if (facebookInput) {
        facebookInput.addEventListener('click', focusTextarea);
    }
    
    // Thêm sự kiện cho nút mở modal từ composer Facebook
    const openModalBtn = document.querySelector('.composer-action-btn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', openPostModal);
    }
    
    // Setup các event listeners cũ
    setupOldComposerEvents();
    
    // 🟢 THIẾT LẬP PROFILE LINKS TRONG COMPOSER
    setupComposerProfileLinks();
    
    // 🟢 THIẾT LẬP PROFILE LINKS TRONG MODAL
    setupModalProfileLinks();
});

// ========= THIẾT LẬP PROFILE LINKS TRONG COMPOSER =========
function setupComposerProfileLinks() {
    console.log("🔗 Setting up profile links in composer...");
    
    // 🟢 1. Avatar trong composer Facebook-style
    const composerAvatar = document.querySelector('.composer-avatar, .composer-user-avatar');
    if (composerAvatar) {
        composerAvatar.style.cursor = 'pointer';
        composerAvatar.title = 'Xem trang cá nhân của bạn';
        
        composerAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const userId = window.CURRENT_USER_ID;
            if (userId) {
                openUserProfileById(userId);
            }
        });
        
        // Nếu có img bên trong, cũng thêm event
        const avatarImg = composerAvatar.querySelector('img');
        if (avatarImg) {
            avatarImg.style.cursor = 'pointer';
            avatarImg.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const userId = window.CURRENT_USER_ID;
                if (userId) {
                    openUserProfileById(userId);
                }
            });
        }
    }
    
    // 🟢 2. Tên trong composer Facebook-style (placeholder)
    const composerInput = document.querySelector('.facebook-input, #community-content');
    if (composerInput && window.CURRENT_USERNAME) {
        // Set placeholder với tên người dùng
        composerInput.placeholder = `${window.CURRENT_USERNAME}, bạn đang nghĩ gì?`;
        
        // Khi click vào input, không mở profile (vì đây là để nhập nội dung)
        composerInput.style.cursor = 'text';
    }
    
    // 🟢 3. Avatar trong composer cũ (community-composer cũ)
    const oldComposerAvatar = document.querySelector('.community-composer:not(.facebook-style) .user-avatar');
    if (oldComposerAvatar) {
        oldComposerAvatar.style.cursor = 'pointer';
        oldComposerAvatar.title = 'Xem trang cá nhân của bạn';
        
        oldComposerAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const userId = window.CURRENT_USER_ID;
            if (userId) {
                openUserProfileById(userId);
            }
        });
    }
    
    console.log("✅ Composer profile links setup complete");
}

// ========= THIẾT LẬP PROFILE LINKS TRONG MODAL =========
function setupModalProfileLinks() {
    console.log("🔗 Setting up profile links in modal...");
    
    // 🟢 1. Avatar trong modal
    const modalAvatar = document.querySelector('.modal-user-avatar, .post-modal-avatar');
    if (modalAvatar) {
        modalAvatar.style.cursor = 'pointer';
        modalAvatar.title = `Xem trang cá nhân của ${window.CURRENT_FULLNAME || window.CURRENT_USERNAME || 'bạn'}`;
        
        modalAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const userId = window.CURRENT_USER_ID;
            if (userId) {
                openUserProfileById(userId);
            }
        });
        
        // Nếu có img bên trong
        const modalAvatarImg = modalAvatar.querySelector('img');
        if (modalAvatarImg) {
            modalAvatarImg.style.cursor = 'pointer';
            modalAvatarImg.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const userId = window.CURRENT_USER_ID;
                if (userId) {
                    openUserProfileById(userId);
                }
            });
        }
    }
    
    // 🟢 2. Tên trong modal
    const modalName = document.querySelector('.modal-user-details strong, .modal-username, .post-modal-user-info strong');
    if (modalName) {
        modalName.style.cursor = 'pointer';
        modalName.style.color = '#385898';
        modalName.title = `Xem trang cá nhân của ${window.CURRENT_FULLNAME || window.CURRENT_USERNAME || 'bạn'}`;
        
        modalName.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const userId = window.CURRENT_USER_ID;
            if (userId) {
                openUserProfileById(userId);
            }
        });
    }
    
    // 🟢 3. Thông tin user trong modal
    const modalUserInfo = document.querySelector('.modal-user-info, .post-modal-user-details');
    if (modalUserInfo) {
        modalUserInfo.style.cursor = 'pointer';
        
        modalUserInfo.addEventListener('click', function(e) {
            // Chỉ xử lý nếu click vào chính phần tử này, không phải các phần tử con khác
            if (e.target === modalUserInfo) {
                e.preventDefault();
                e.stopPropagation();
                
                const userId = window.CURRENT_USER_ID;
                if (userId) {
                    openUserProfileById(userId);
                }
            }
        });
    }
    
    console.log("✅ Modal profile links setup complete");
}

// ========= HÀM XỬ LÝ PREVIEW ẢNH =========
function removePreviewImage(index) {
    // Giải phóng URL trước khi xóa (tùy chọn, để tránh memory leak)
    const file = window.SELECTED_FILES[index];
    if (file && file._url) {
        URL.revokeObjectURL(file._url);
    }
    
    window.SELECTED_FILES.splice(index, 1);
    
    // Gọi renderCreatePreview để cập nhật UI
    renderCreatePreview();
    
    // Focus vào input để tiếp tục nhập
    const postInput = document.getElementById("hidden-community-content");
    if (postInput) postInput.focus();
}

function focusTextarea() {
    const hiddenTextarea = document.getElementById('hidden-community-content');
    if (hiddenTextarea) {
        // Mở composer cũ
        const oldComposer = document.querySelector('.community-composer:not(.facebook-style)');
        if (oldComposer) {
            oldComposer.style.display = 'block';
            // Scroll đến composer
            oldComposer.scrollIntoView({ behavior: 'smooth' });
            // Focus vào textarea
            setTimeout(() => {
                hiddenTextarea.focus();
            }, 100);
        }
    }
}

// Setup các event listeners cho composer cũ
function setupOldComposerEvents() {
    // File input change
    const mediaInput = document.getElementById("community-media");
    if (mediaInput) {
        mediaInput.addEventListener("change", function() {
            // Gộp file cũ + file mới
            window.SELECTED_FILES = window.SELECTED_FILES.concat(Array.from(this.files));
            renderCreatePreview();
            // Reset input để có thể chọn lại cùng 1 file
            this.value = "";
        });
    }

    // Form submit
    const form = document.getElementById("community-post-form");
    if (form) {
        form.addEventListener("submit", submitCommunityPost);
    }
}

// ========= RENDER PREVIEW ẢNH =========
function renderCreatePreview() {
    const wrap = document.getElementById("community-media-preview");
    if (!wrap) return;

    const files = window.SELECTED_FILES;
    
    // Xóa nút "Hủy tất cả" cũ
    const oldClearBtn = document.querySelector('.clear-all-preview');
    if (oldClearBtn) oldClearBtn.remove();
    
    // Reset preview
    wrap.innerHTML = "";
    wrap.className = "media-preview-grid";
    
    if (files.length === 0) {
        wrap.style.display = "none";
        wrap.style.marginTop = "0";
        return;
    }
    
    wrap.style.display = "grid";
    wrap.style.marginTop = "10px";

    // Render layout
    if (files.length === 1) {
        wrap.classList.add("grid-1");
        renderCreateMediaItem(files[0], 0, wrap);
    } else if (files.length === 2) {
        wrap.classList.add("grid-2");
        files.forEach((file, i) => renderCreateMediaItem(file, i, wrap));
    } else if (files.length === 3) {
        wrap.classList.add("grid-3");
        files.forEach((file, i) => renderCreateMediaItem(file, i, wrap));
    } else if (files.length === 4) {
        wrap.classList.add("grid-4");
        files.forEach((file, i) => renderCreateMediaItem(file, i, wrap));
    } else if (files.length === 5) {
        wrap.classList.add("grid-5");
        files.forEach((file, i) => renderCreateMediaItem(file, i, wrap));
    } else if (files.length === 6) {
        wrap.classList.add("grid-6-fixed");
        files.forEach((file, i) => renderCreateMediaItem(file, i, wrap));
    } else {
        wrap.classList.add("grid-6-fixed");
        
        files.slice(0, 6).forEach((file, i) => {
            const isLast = i === 5;
            const remaining = files.length - 6;
            
            if (!file || typeof file !== 'object') return;
            
            const itemDiv = document.createElement("div");
            itemDiv.className = `media-preview-item ${isLast ? 'overlay-item' : ''}`;
            
            itemDiv.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove-preview-btn')) return;
                openPreviewMediaViewer(i);
            });
            
            const url = URL.createObjectURL(file);
            const isVideo = isVideoFileSafe(file);
            
            itemDiv.innerHTML = `
                ${isVideo ? 
                    `<video src="${url}" muted controls class="media-preview-media"></video>` : 
                    `<img src="${url}" class="media-preview-media" alt="Preview">`
                }
                ${isLast && remaining > 0 ? 
                    `<div class="more-overlay">
                        <div class="more-text">+${remaining}</div>
                    </div>` : 
                    ""
                }
                <button class="remove-preview-btn" onclick="removePreviewImage(${i}); event.stopPropagation();">×</button>
            `;
            
            wrap.appendChild(itemDiv);
        });
    }
    
    // 🟢 TẠO NÚT "HỦY TẤT CẢ" VỚI VỊ TRÍ CỐ ĐỊNH
    if (files.length > 0) {
        const clearAllBtn = document.createElement("button");
        clearAllBtn.className = "clear-all-preview";
        clearAllBtn.type = "button";
        clearAllBtn.innerHTML = "✕ Hủy tất cả";
        clearAllBtn.title = "Xóa tất cả ảnh đã chọn";
        
        clearAllBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // GỌI HÀM RESET THAY VÌ CHỈ XÓA ẢNH
        resetComposerForm();
        
        return false;
    });
        
        // 🟢 THÊM VÀO wrapper thay vì sau preview
        const wrapper = wrap.parentElement;
        if (wrapper) {
            wrap.parentElement.style.position = "relative";
            wrap.parentElement.appendChild(clearAllBtn);
        } else {
            // Fallback nếu không có wrapper
            wrap.parentNode.insertBefore(clearAllBtn, wrap.nextSibling);
        }
    }
}

function resetComposerForm() {
    // Reset textarea
    const hiddenTextarea = document.getElementById("hidden-community-content");
    const facebookInput = document.querySelector('.facebook-input');
    
    if (hiddenTextarea) hiddenTextarea.value = "";
    if (facebookInput) facebookInput.value = "";
    
    // Reset SELECTED_FILES và giải phóng bộ nhớ
    window.SELECTED_FILES.forEach(file => {
        if (file && file._url) {
            try {
                URL.revokeObjectURL(file._url);
            } catch (e) {
                console.warn("Không thể giải phóng URL:", e);
            }
            delete file._url;
        }
    });
    
    window.SELECTED_FILES = [];
    
    // Reset preview
    renderCreatePreview();
    
    // Ẩn composer cũ nếu đang hiển thị
    const oldComposer = document.querySelector('.community-composer:not(.facebook-style)');
    if (oldComposer && oldComposer.style.display === 'block') {
        oldComposer.style.display = 'none';
    }
    
    console.log("✅ Composer đã được reset hoàn toàn");
}

// ========= HÀM MỞ MODAL VỚI CÀI ĐẶT MẶC ĐỊNH =========
function openPostModal() {
    const modal = document.getElementById("post-modal");
    if (modal) {
        // 🟢 ĐẢM BẢO RESET TRƯỚC KHI HIỂN THỊ
        resetModalCompletely();
        
        // 🟢 CÀI ĐẶT MẶC ĐỊNH LÀ "CÔNG KHAI"
        const privacySelect = document.getElementById("modal-privacy");
        if (privacySelect) {
            privacySelect.value = "public";
        }
        
        modal.style.display = "flex";
        
        // Focus vào textarea trong modal
        setTimeout(() => {
            const textarea = document.getElementById("modal-content");
            if (textarea) {
                textarea.focus();
                textarea.value = ""; // Đảm bảo textarea trống
            }
        }, 100);
        
        // 🟢 THIẾT LẬP PROFILE LINKS CHO MODAL
        setupModalProfileLinks();
        
        // Thiết lập sự kiện cho form modal
        setupModalEvents();
    }
}

// Đóng modal và RESET HOÀN TOÀN
function closePostModal() {
    const modal = document.getElementById("post-modal");
    if (modal) {
        modal.style.display = "none";
        // 🟢 RESET HOÀN TOÀN TRƯỚC KHI ẨN
        resetModalCompletely();
    }
}

// Reset modal về trạng thái ban đầu - HOÀN TOÀN
function resetModal() {
    // Reset textarea
    const textarea = document.getElementById("modal-content");
    if (textarea) {
        textarea.value = "";
        textarea.style.height = "auto";
    }
    
    // Reset preview
    const preview = document.getElementById("modal-media-preview");
    if (preview) {
        preview.innerHTML = "";
        preview.style.display = "none";
        preview.className = "modal-media-preview";
    }
    
    // Reset file input
    const fileInput = document.getElementById("modal-media");
    if (fileInput) fileInput.value = "";
    
    // Reset nút submit
    const submitBtn = document.getElementById("modal-submit-btn");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Đăng";
    }
    
    // 🟢 QUAN TRỌNG: Xóa nút "Hủy tất cả ảnh" nếu có
    const clearBtn = document.querySelector('.modal-clear-all');
    if (clearBtn) clearBtn.remove();
    
    // 🟢 QUAN TRỌNG: Giải phóng URL objects để tránh memory leak
    if (window.SELECTED_FILES && window.SELECTED_FILES.length > 0) {
        window.SELECTED_FILES.forEach(file => {
            if (file && file._url) {
                try {
                    URL.revokeObjectURL(file._url);
                } catch (e) {
                    console.warn("Không thể giải phóng URL:", e);
                }
                delete file._url;
            }
        });
    }
    
    // 🟢 RESET MẢNG FILES
    window.SELECTED_FILES = [];
}

// 🟢 HÀM MỚI: Reset hoàn toàn (gọi khi đóng modal)
function resetModalCompletely() {
    resetModal();
    
    // 🟢 THÊM: Đảm bảo modal không giữ state cũ
    const modal = document.getElementById("post-modal");
    if (modal) {
        // Reset tất cả input trong modal
        const inputs = modal.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type !== 'file' && input.id !== 'modal-privacy') {
                input.value = '';
            }
            if (input.id === 'modal-privacy') {
                // 🟢 SET LẠI VỀ "CÔNG KHAI" KHI RESET
                input.value = 'public';
            }
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            }
        });
        
        // Reset tất cả preview containers
        const previews = modal.querySelectorAll('.modal-media-preview, .preview-container');
        previews.forEach(preview => {
            preview.innerHTML = '';
            preview.style.display = 'none';
        });
        
        // Reset form nếu có
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // 🟢 SET LẠI PRIVACY SAU KHI RESET FORM
            const privacySelect = form.querySelector('#modal-privacy');
            if (privacySelect) {
                privacySelect.value = 'public';
            }
        }
    }
    
    console.log("✅ Modal đã được reset hoàn toàn về mặc định (Công khai)");
}

// Thiết lập sự kiện cho modal
function setupModalEvents() {
    // Xử lý chọn file trong modal
    const modalFileInput = document.getElementById("modal-media");
    if (modalFileInput) {
        modalFileInput.addEventListener("change", function() {
            handleModalFileSelect(this.files);
        });
    }
    
    // Xử lý submit form modal
    const modalForm = document.getElementById("modal-post-form");
    if (modalForm) {
        modalForm.addEventListener("submit", function(e) {
            e.preventDefault();
            submitModalPost();
        });
    }
    
    // Đóng modal khi click bên ngoài
    const modal = document.getElementById("post-modal");
    if (modal) {
        modal.addEventListener("click", function(e) {
            if (e.target === modal) {
                closePostModal();
            }
        });
    }
}

function handleModalFileSelect(files) {
    if (!files || files.length === 0) return;
    
    // 🟢 ĐẢM BẢO CLEAR CŨ TRƯỚC KHI THÊM MỚI (nếu cần)
    const fileArray = Array.from(files);
    window.SELECTED_FILES = window.SELECTED_FILES.concat(fileArray);
    
    renderModalPreview();
    
    // Tự động cuộn xuống preview sau 100ms
    setTimeout(() => {
        const preview = document.getElementById("modal-media-preview");
        if (preview && preview.scrollHeight > preview.clientHeight) {
            preview.scrollTop = preview.scrollHeight;
        }
    }, 100);
    
    const fileInput = document.getElementById("modal-media");
    if (fileInput) fileInput.value = "";
}

function renderModalPreview() {
    const preview = document.getElementById("modal-media-preview");
    if (!preview) return;
    
    const files = window.SELECTED_FILES;
    
    // Xóa nội dung cũ
    preview.innerHTML = "";
    const oldClearBtn = preview.parentNode.querySelector('.modal-clear-all');
    if (oldClearBtn) oldClearBtn.remove();
    
    if (files.length === 0) {
        preview.style.display = "none";
        return;
    }
    
    preview.style.display = "grid";
    preview.style.height = "auto";
    preview.style.padding = "10px 0";
    preview.style.margin = "10px 0";
    preview.style.borderTop = "1px solid #eee";
    preview.className = "modal-media-grid";
    
    // Grid classes
    if (files.length === 1) {
        preview.classList.add("grid-1");
    } else if (files.length === 2) {
        preview.classList.add("grid-2");
    } else if (files.length === 3) {
        preview.classList.add("grid-3");
    } else if (files.length === 4) {
        preview.classList.add("grid-4");
    } else if (files.length === 5) {
        preview.classList.add("grid-5");
    } else if (files.length === 6) {
        preview.classList.add("grid-6-fixed");
    } else {
        preview.classList.add("grid-6-fixed");
    }
    
    // Render các ảnh
    const totalFiles = files.length;
    let displayCount = totalFiles <= 6 ? totalFiles : 6;
    const showOverlay = totalFiles > 6;
    const overlayCount = totalFiles - 6;
    
    for (let i = 0; i < displayCount; i++) {
        const file = files[i];
        const shouldShowOverlay = showOverlay && i === 5 && overlayCount > 0;
        
        const item = document.createElement("div");
        item.className = `modal-media-item ${shouldShowOverlay ? 'overlay-item' : ''}`;
        
        let url;
        if (file._url) {
            url = file._url;
        } else {
            url = URL.createObjectURL(file);
            file._url = url;
        }
        
        const isVideo = isVideoFileSafe(file);
        
        let mediaElement;
        if (isVideo) {
            mediaElement = document.createElement("video");
            mediaElement.src = url;
            mediaElement.muted = true;
            mediaElement.controls = false;
            mediaElement.className = "feed-video-thumb";
        } else {
            mediaElement = document.createElement("img");
            mediaElement.src = url;
            mediaElement.alt = "Preview";
            mediaElement.className = "feed-image-thumb";
        }
        
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.style.objectFit = "cover";
        item.appendChild(mediaElement);
        
        if (shouldShowOverlay) {
            const overlay = document.createElement("div");
            overlay.className = "more-overlay";
            overlay.innerHTML = `<div class="more-text">+${overlayCount}</div>`;
            item.appendChild(overlay);
        }
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "modal-remove-media";
        removeBtn.innerHTML = "×";
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            removeModalImage(i);
        };
        item.appendChild(removeBtn);
        
        item.addEventListener('click', function(e) {
            if (!e.target.classList.contains('modal-remove-media') && 
                !e.target.classList.contains('more-overlay')) {
                openPreviewMediaViewer(i);
            }
        });
        
        preview.appendChild(item);
    }
    
    // 🟢 TẠO NÚT "HỦY TẤT CẢ" TRONG MODAL - VỊ TRÍ CỐ ĐỊNH
    if (files.length > 0) {
        const clearBtn = document.createElement("button");
        clearBtn.className = "modal-clear-all";
        clearBtn.type = "button";
        clearBtn.textContent = "✕ Hủy tất cả";
        clearBtn.title = "Xóa tất cả ảnh đã chọn";
        
        clearBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Giải phóng URL objects để tránh memory leak
        window.SELECTED_FILES.forEach(file => {
            if (file._url) {
                URL.revokeObjectURL(file._url);
                delete file._url;
            }
        });
        
        // Xóa tất cả files ngay lập tức
        window.SELECTED_FILES = [];
        renderModalPreview();
        
        // Focus vào textarea trong modal
        const modalTextarea = document.getElementById("modal-content");
        if (modalTextarea) modalTextarea.focus();
    });
        
        // 🟢 THÊM VÀO wrapper của modal preview
        const preview = document.getElementById("modal-media-preview");
        if (preview) {
            preview.style.position = "relative";
            preview.parentNode.appendChild(clearBtn);
        } else {
            preview.parentNode.insertBefore(clearBtn, preview.nextSibling);
        }
    }
}

function removeModalImage(index) {
    const file = window.SELECTED_FILES[index];
    
    // Giải phóng URL
    if (file && file._url) {
        URL.revokeObjectURL(file._url);
        delete file._url;
    }
    
    // Xóa khỏi mảng
    window.SELECTED_FILES.splice(index, 1);
    
    // Render lại
    renderModalPreview();
    
    // Focus vào textarea
    const modalTextarea = document.getElementById("modal-content");
    if (modalTextarea) modalTextarea.focus();
}

// Gửi bài từ modal - KHÔNG HIỆN ALERT
async function submitModalPost() {
    const content = document.getElementById("modal-content").value.trim();
    const privacy = document.getElementById("modal-privacy").value;
    const files = window.SELECTED_FILES;
    
    if (!content && files.length === 0) {
        alert("Hãy nhập nội dung hoặc chọn ảnh.");
        return;
    }
    
    const submitBtn = document.getElementById("modal-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang đăng...";
    
    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    
    files.forEach(file => {
        formData.append("media[]", file);
    });
    
    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/posts/create.php", {
            method: "POST",
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // 🟢 ĐÓNG MODAL VÀ RESET HOÀN TOÀN
            closePostModal();
            
            // 🟢 ĐẢM BẢO RESET HOÀN TOÀN TRƯỚC KHI ĐÓNG
            resetModalCompletely();
            
            // Tải lại feed
            if (typeof loadCommunityFeed === 'function') {
                loadCommunityFeed();
            }
            
            console.log("✅ Đăng bài thành công!");
            
        } else {
            alert("Lỗi: " + data.error);
            submitBtn.disabled = false;
            submitBtn.textContent = "Đăng";
        }
    } catch (error) {
        console.error("Lỗi khi đăng bài:", error);
        alert("Lỗi kết nối, vui lòng thử lại!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Đăng";
    }
}

function renderCreateMediaItem(file, index, container) {
    // KIỂM TRA FILE TỒN TẠI
    if (!file || typeof file !== 'object') {
        console.warn('File không hợp lệ trong renderCreateMediaItem:', file);
        return;
    }
    
    const url = URL.createObjectURL(file);
    // SỬ DỤNG HÀM KIỂM TRA AN TOÀN
    const isVideo = isVideoFileSafe(file);
    
    const itemDiv = document.createElement("div");
    itemDiv.className = "media-preview-item";
    
    // Thêm data attribute để lưu thông tin
    itemDiv.dataset.index = index;
    itemDiv.dataset.isVideo = isVideo;
    itemDiv.dataset.url = url;
    
    // Thêm event click để mở viewer
    itemDiv.addEventListener('click', function(e) {
        // Không mở viewer nếu click vào nút xóa
        if (e.target.classList.contains('remove-preview-btn')) {
            return;
        }
        openPreviewMediaViewer(index);
    });
    
    itemDiv.innerHTML = `
        ${isVideo ? 
            `<video src="${url}" muted controls class="media-preview-media"></video>` : 
            `<img src="${url}" class="media-preview-media" alt="Preview">`
        }
        <button class="remove-preview-btn" onclick="removePreviewImage(${index}); event.stopPropagation();">×</button>
    `;
    
    container.appendChild(itemDiv);
}

function isVideoFileSafe(file) {
    if (!file || typeof file !== 'object') return false;
    if (!file.type) return false;
    
    try {
        const fileType = String(file.type);
        return fileType.startsWith && fileType.startsWith("video");
    } catch (error) {
        return false;
    }
}

// Hàm render từng media item
function renderMediaItem(file, index, container) {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video");
    
    const itemDiv = document.createElement("div");
    itemDiv.className = "media-preview-item";
    
    // Thêm data attribute để lưu thông tin
    itemDiv.dataset.index = index;
    itemDiv.dataset.isVideo = isVideo;
    itemDiv.dataset.url = url;
    
    // Thêm event click để mở viewer
    itemDiv.addEventListener('click', function(e) {
        // Không mở viewer nếu click vào nút xóa
        if (e.target.classList.contains('remove-preview-btn')) {
            return;
        }
        openPreviewMediaViewer(index);
    });
    
    itemDiv.innerHTML = `
        ${isVideo ? 
            `<video src="${url}" muted controls class="media-preview-media"></video>` : 
            `<img src="${url}" class="media-preview-media">`
        }
        <button class="remove-preview-btn" onclick="removePreviewImage(${index}); event.stopPropagation();">×</button>
    `;
    
    container.appendChild(itemDiv);
}

// GỬI BÀI - KHÔNG HIỆN ALERT
async function submitCommunityPost(e) {
    e.preventDefault();

    const form = document.getElementById("community-post-form");
    const btn = document.getElementById("community-submit-btn");

    const content = document.getElementById("hidden-community-content").value.trim();
    const files = window.SELECTED_FILES;

    if (!content && files.length === 0) {
        alert("Hãy nhập nội dung hoặc chọn ảnh.");
        return;
    }

    const fd = new FormData();
    fd.append("content", content);
    fd.append("privacy", document.getElementById("community-privacy").value);

    files.forEach(f => fd.append("media[]", f));

    btn.disabled = true;
    btn.innerText = "Đang đăng...";

    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/posts/create.php", {
            method: "POST",
            body: fd
        });

        const data = await res.json();

        btn.disabled = false;
        btn.innerText = "Đăng bài";

        if (data.success) {
            // RESET HOÀN TOÀN FORM
            form.reset();
            window.SELECTED_FILES = [];
            
            // RESET PREVIEW
            const previewWrap = document.getElementById("community-media-preview");
            if (previewWrap) {
                previewWrap.innerHTML = "";
                previewWrap.className = "media-preview-grid";
                previewWrap.style.display = "none";
            }
            
            // XÓA NÚT "HỦY TẤT CẢ"
            const clearBtn = document.querySelector('.clear-all-preview');
            if (clearBtn) clearBtn.remove();
            
            // RESET INPUT FILE
            const mediaInput = document.getElementById("community-media");
            if (mediaInput) mediaInput.value = "";
            
            // ẨN COMPOSER CŨ TRỞ LẠI
            const oldComposer = document.querySelector('.community-composer:not(.facebook-style)');
            if (oldComposer) {
                oldComposer.style.display = 'none';
            }
            
            // RESET INPUT FACEBOOK
            const facebookInput = document.querySelector('.facebook-input');
            if (facebookInput) {
                facebookInput.value = '';
            }
            
            // TẢI LẠI FEED (KHÔNG THÔNG BÁO)
            if (typeof loadCommunityFeed === 'function') {
                loadCommunityFeed();
            }
            
            // 🟢 KHÔNG HIỆN ALERT THÀNH CÔNG
            console.log("✅ Đăng bài thành công!");
            
        } else {
            alert("Lỗi: " + data.error);
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerText = "Đăng bài";
        console.error("Lỗi khi đăng bài:", error);
        alert("Lỗi kết nối, vui lòng thử lại!");
    }
}

function removeClearButtons() {
    const clearBtn = document.querySelector('.clear-all-preview');
    if (clearBtn) {
        clearBtn.style.opacity = "0";
        clearBtn.style.transform = "translateY(20px)";
        setTimeout(() => {
            if (clearBtn.parentNode) clearBtn.remove();
        }, 300);
    }
    
    const modalClearBtn = document.querySelector('.modal-clear-all');
    if (modalClearBtn) {
        modalClearBtn.style.opacity = "0";
        modalClearBtn.style.transform = "scale(0.8)";
        setTimeout(() => {
            if (modalClearBtn.parentNode) modalClearBtn.remove();
        }, 300);
    }
    
    // Xóa class từ composer
    const composer = document.querySelector('.community-composer.old-composer');
    if (composer) {
        composer.classList.remove('has-images');
    }
}

// ========= PREVIEW MEDIA VIEWER =========
function openPreviewMediaViewer(startIndex = 0) {
    const files = window.SELECTED_FILES;
    if (!files || files.length === 0) return;
    
    // Tạo media items từ TẤT CẢ files
    const mediaItems = files.map((file, index) => {
        const url = URL.createObjectURL(file);
        const isVideo = isVideoFileSafe(file);
        return {
            type: isVideo ? "video" : "image",
            src: url,
            index: index
        };
    });
    
    // Lưu vào global variable
    window._previewMediaSlider = {
        list: mediaItems,
        index: startIndex
    };
    
    // Tạo viewer
    const old = document.getElementById("preview-media-viewer");
    if (old) old.remove();
    
    const wrap = document.createElement("div");
    wrap.id = "preview-media-viewer";
    wrap.className = "preview-media-viewer";
    
    wrap.innerHTML = `
        <div class="pmv-overlay" onclick="closePreviewMediaViewer()"></div>
        
        <div class="pmv-container">
            <button class="pmv-close" onclick="closePreviewMediaViewer()">✕</button>
            
            <div class="pmv-nav">
                <button class="pmv-prev" onclick="prevPreviewMedia()">❮</button>
                <button class="pmv-next" onclick="nextPreviewMedia()">❯</button>
            </div>
            
            <div class="pmv-media-container" id="pmv-media-container">
                <!-- Media sẽ được load ở đây -->
            </div>
            
            <div class="pmv-thumbnails" id="pmv-thumbnails">
                <!-- Thumbnails -->
            </div>
        </div>
    `;
    
    document.body.appendChild(wrap);
    updatePreviewMediaSlider();
    updatePreviewThumbnails();
    
    // Chặn scroll body
    document.body.style.overflow = "hidden";
}

// Cập nhật media chính
function updatePreviewMediaSlider() {
    const container = document.getElementById("pmv-media-container");
    if (!container || !window._previewMediaSlider) return;
    
    const slider = window._previewMediaSlider;
    const current = slider.list[slider.index];
    
    container.innerHTML = '';
    
    if (current.type === "image") {
        const img = document.createElement("img");
        img.className = "pmv-main-image";
        img.src = current.src;
        img.alt = `Ảnh ${slider.index + 1}`;
        container.appendChild(img);
    } else {
        const video = document.createElement("video");
        video.className = "pmv-main-video";
        video.src = current.src;
        video.controls = true;
        video.autoplay = true;
        container.appendChild(video);
    }
    
    // Cập nhật số thứ tự
    const counter = document.querySelector('.pmv-counter');
    if (counter) {
        counter.textContent = `${slider.index + 1}/${slider.list.length}`;
    }
}

// Cập nhật thumbnails
function updatePreviewThumbnails() {
    const thumbContainer = document.getElementById("pmv-thumbnails");
    if (!thumbContainer || !window._previewMediaSlider) return;
    
    const slider = window._previewMediaSlider;
    
    thumbContainer.innerHTML = slider.list.map((item, index) => `
        <div class="pmv-thumb ${index === slider.index ? 'active' : ''}" 
             onclick="goToPreviewMedia(${index})">
            ${item.type === "image" ? 
                `<img src="${item.src}" alt="Thumb ${index + 1}">` : 
                `<div class="pmv-thumb-video">
                    <video src="${item.src}" muted></video>
                    <span class="pmv-play-icon">▶</span>
                </div>`
            }
        </div>
    `).join('');
}

function prevPreviewMedia() {
    if (!window._previewMediaSlider) return;
    const s = window._previewMediaSlider;
    s.index = (s.index - 1 + s.list.length) % s.list.length;
    updatePreviewMediaSlider();
    updatePreviewThumbnails();
}

function nextPreviewMedia() {
    if (!window._previewMediaSlider) return;
    const s = window._previewMediaSlider;
    s.index = (s.index + 1) % s.list.length;
    updatePreviewMediaSlider();
    updatePreviewThumbnails();
}

function goToPreviewMedia(index) {
    if (!window._previewMediaSlider) return;
    window._previewMediaSlider.index = index;
    updatePreviewMediaSlider();
    updatePreviewThumbnails();
}

function closePreviewMediaViewer() {
    const viewer = document.getElementById("preview-media-viewer");
    if (viewer) viewer.remove();
    
    // Giải phóng URL objects để tránh memory leak
    if (window._previewMediaSlider && window._previewMediaSlider.list) {
        window._previewMediaSlider.list.forEach(item => {
            if (item.src && item.src.startsWith('blob:')) {
                URL.revokeObjectURL(item.src);
            }
        });
    }
    
    window._previewMediaSlider = null;
    document.body.style.overflow = "";
}

// ========= HÀM MỞ MEDIA VIEWER CHO FEED =========
function openMediaViewer(url, postId, indexOverride = null) {
    // 🟢 Lấy danh sách media từ JSON post, không lấy từ DOM nữa
    const postData = window._communityPosts?.[postId];
    if (!postData) return;

    const media = postData.media || [];

    // Convert media list to viewer format
    const mediaItems = media.map(m => ({
        type: m.MediaType,
        src: m.FilePath.startsWith("http") 
                ? m.FilePath 
                : window.location.origin + m.FilePath
    }));

    // Xác định index
    let index = indexOverride;
    if (index === null) {
        index = mediaItems.findIndex(m => m.src === url);
    }
    if (index < 0) index = 0;

    window._mediaSlider = {
        list: mediaItems,
        index
    };

    // Tạo viewer
    const old = document.getElementById("media-viewer");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "media-viewer";
    wrap.className = "media-viewer";

    wrap.innerHTML = `
        <div class="mv-overlay" onclick="closeMediaViewer()"></div>

        <div class="mv-box">
            <button class="mv-prev" onclick="prevMedia()">❮</button>
            <button class="mv-next" onclick="nextMedia()">❯</button>

            <div class="mv-media" id="mv-media-container"></div>

            <button class="mv-close" onclick="closeMediaViewer()">✕</button>
        </div>
    `;

    document.body.appendChild(wrap);

    updateMediaSlider();
}

function updateMediaSlider() {
    const container = document.getElementById("mv-media-container");
    if (!container || !window._mediaSlider) return;

    const cur = window._mediaSlider.list[window._mediaSlider.index];

    if (cur.type === "image") {
        container.innerHTML = `<img id="mv-main-img" src="${cur.src}">`;
    } else {
        container.innerHTML = `
            <video id="mv-main-video" src="${cur.src}" controls autoplay></video>
        `;
    }
}

function nextMedia() {
    if (!window._mediaSlider) return;
    const s = window._mediaSlider;
    s.index = (s.index + 1) % s.list.length;
    updateMediaSlider();
}

function prevMedia() {
    if (!window._mediaSlider) return;
    const s = window._mediaSlider;
    s.index = (s.index - 1 + s.list.length) % s.list.length;
    updateMediaSlider();
}

function closeMediaViewer() {
    const v = document.getElementById("media-viewer");
    if (v) v.remove();
}

// ========= TOAST NOTIFICATION =========
function showToast(message, type = 'success') {
    // Xóa toast cũ nếu có
    const oldToast = document.getElementById('post-toast');
    if (oldToast) oldToast.remove();
    
    // Tạo toast mới
    const toast = document.createElement('div');
    toast.id = 'post-toast';
    toast.className = `post-toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    `;
    
    // Thêm vào body
    document.body.appendChild(toast);
    
    // Hiển thị
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 3000);
}

// ========= CSS CHO TOAST =========
const toastStyles = `
    .post-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .post-toast.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .post-toast.error {
        background: #f44336;
    }
    
    .post-toast .material-icons {
        font-size: 20px;
    }
`;

// Thêm styles vào trang
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = toastStyles;
    document.head.appendChild(style);
}

// ========= CSS CHO CLICKABLE AVATAR/TÊN =========
const profileLinksStyles = `
    /* Avatar và tên clickable trong composer */
    .composer-avatar,
    .modal-user-avatar,
    .composer-user-avatar,
    .post-modal-avatar,
    .modal-user-avatar img,
    .composer-avatar img,
    .modal-user-details strong,
    .modal-username,
    .post-modal-user-info strong {
        cursor: pointer !important;
        transition: opacity 0.2s, transform 0.2s;
    }
    
    .composer-avatar:hover,
    .modal-user-avatar:hover,
    .composer-avatar img:hover,
    .modal-user-avatar img:hover {
        opacity: 0.8;
        transform: scale(1.05);
    }
    
    .modal-user-details strong:hover,
    .modal-username:hover {
        opacity: 0.8;
        text-decoration: underline;
    }
    
    /* Tooltip */
    .composer-avatar[title],
    .modal-user-avatar[title],
    .modal-user-details strong[title] {
        position: relative;
    }
    
    .composer-avatar[title]:hover::after,
    .modal-user-avatar[title]:hover::after,
    .modal-user-details strong[title]:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
    }
`;

// Thêm styles vào trang
if (!document.getElementById('profile-links-styles')) {
    const style = document.createElement('style');
    style.id = 'profile-links-styles';
    style.textContent = profileLinksStyles;
    document.head.appendChild(style);
}

// ========= EXPORT HÀM RA GLOBAL =========
if (typeof window !== 'undefined') {
    window.openUserProfileById = openUserProfileById;
    window.goToUserProfileWithBack = goToUserProfileWithBack;
    window.setupComposerProfileLinks = setupComposerProfileLinks;
    window.setupModalProfileLinks = setupModalProfileLinks;
    window.openPostModal = openPostModal;
    window.closePostModal = closePostModal;
    window.submitModalPost = submitModalPost;
    window.submitCommunityPost = submitCommunityPost;
    window.openPreviewMediaViewer = openPreviewMediaViewer;
    window.closePreviewMediaViewer = closePreviewMediaViewer;
    window.openMediaViewer = openMediaViewer;
    window.closeMediaViewer = closeMediaViewer;
    window.showToast = showToast;
}