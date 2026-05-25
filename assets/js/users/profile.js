// --- TOAST NOTIFICATION UTILITIES ---

/**
 * Đảm bảo container cho Toast đã tồn tại trong DOM.
 * @returns {HTMLElement} Container div.
 */
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Tailwind classes: fixed position top-right, high z-index, space between toasts
        container.className = 'fixed top-4 right-4 z-[1000] space-y-3 w-full max-w-xs';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Hiển thị một thông báo Toast.
 * @param {string} message Nội dung thông báo.
 * @param {'success'|'error'|'warning'} type Loại thông báo để chọn màu sắc.
 */
function showToast(message, type = 'success') {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    
    let colorClasses;
    let iconSvg;

    switch (type) {
        case 'error':
            colorClasses = 'bg-red-500 text-white border-red-700';
            iconSvg = `<svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
            break;
        case 'warning':
            colorClasses = 'bg-yellow-500 text-white border-yellow-700';
            iconSvg = `<svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
            break;
        case 'success':
        default:
            colorClasses = 'bg-green-500 text-white border-green-700';
            iconSvg = `<svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
            break;
    }

    // Initial styles for transition (hidden off-screen)
    toast.className = `p-4 flex items-center rounded-xl shadow-2xl border-2 transition-all duration-300 transform translate-x-full opacity-0 ${colorClasses}`;
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        toast.classList.add('translate-x-0', 'opacity-100');
    }, 50);

    // Animate out and remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('translate-x-0', 'opacity-100');
        toast.classList.add('translate-x-full', 'opacity-0');
        
        // Remove from DOM after transition
        setTimeout(() => {
            container.removeChild(toast);
        }, 300); 
    }, 5000);
}


// --- MODAL FUNCTIONS (Global scope) ---
function openPasswordModal() {
    const modal = document.getElementById('password-modal'); 
    if(!modal) return;
    modal.style.display = 'flex'; 
    setTimeout(() => modal.classList.add('show'), 10);
}

function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if(!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// --- FOLLOW TOGGLE LOGIC ---
// NOTE: handleFollowToggle đã được chuyển sang script inline trong public_profile.php
// để đảm bảo event listener được gắn đúng lúc.
// --- END FOLLOW TOGGLE LOGIC ---


document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. IMAGE PREVIEW LOGIC ---
    function handleImagePreview(inputId, imgId, placeholderId = null) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Cập nhật thẻ img
                    const imgElement = document.getElementById(imgId);
                    if (imgElement) {
                        imgElement.src = e.target.result;
                        imgElement.style.display = 'block';
                    }
                    
                    // Ẩn placeholder div nếu có (dùng cho Cover Photo)
                    if (placeholderId) {
                        const placeholder = document.getElementById(placeholderId);
                        if (placeholder) {
                            placeholder.style.display = 'none';
                        }
                    }
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Kích hoạt listener cho Avatar và Cover
    handleImagePreview('avatarInput', 'previewAvatar');
    handleImagePreview('coverInput', 'previewCover', 'coverPlaceholder');

    // --- 4. FOLLOW BUTTON LISTENER (ĐÃ XÓA khỏi đây) ---
    // Logic Follow được xử lý hoàn toàn trong public_profile.php inline script.
    // --- END FOLLOW BUTTON LISTENER ---


    // --- Close modal when clicking outside ---
    const modal = document.getElementById('password-modal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePasswordModal();
            }
        });
    }

    // --- 2. PROFILE UPDATE SUBMIT ---
    const profileForm = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveProfileBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const sidebarFullName = document.getElementById('sidebarFullName');
    const previewAvatar = document.getElementById('previewAvatar');

    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Lấy giá trị hiện tại của form để cập nhật UI sau này
            const displayName = document.getElementById('displayNameInput')?.value || '';
            const avatarInput = document.getElementById('avatarInput');

            // UI Loading state
            if(saveBtn) {
                saveBtn.disabled = true;
                saveBtn.classList.add('opacity-75', 'cursor-not-allowed');
            }
            if(btnSpinner) btnSpinner.classList.remove('hidden');

            const formData = new FormData(this);

            fetch('/HeThongChamSocCaKoi/backend/api/users/profile/update.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Hiển thị Toast
                    showToast('Cập nhật hồ sơ thành công!', 'success');
                    
                    // --- Cập nhật UI mà không cần reload ---
                    
                    // 1. Cập nhật Tên hiển thị trên sidebar
                    if (sidebarFullName) {
                        sidebarFullName.textContent = displayName;
                    }

                    // 2. Cập nhật Avatar nếu server trả về URL mới (cho cả trường hợp upload và không upload)
                    if (data.data && data.data.avatarUrl && previewAvatar) {
                         previewAvatar.src = data.data.avatarUrl;
                    }
                    
                    // ----------------------------------------
                    
                } else {
                    // Hiển thị Toast
                    showToast('Lỗi: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Hiển thị Toast
                showToast('Có lỗi xảy ra khi kết nối server.', 'error');
            })
            .finally(() => {
                // Tắt trạng thái loading
                if(saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
                if(btnSpinner) btnSpinner.classList.add('hidden');
            });
        });
    }

    // --- 3. PASSWORD CHANGE SUBMIT ---
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);

            if (formData.get('new_password') !== formData.get('confirm_password')) {
                // Hiển thị Toast
                showToast('Mật khẩu xác nhận không khớp!', 'warning');
                return;
            }

            fetch('/HeThongChamSocCaKoi/backend/api/users/profile/change_password.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Hiển thị Toast
                    showToast(data.message, 'success');
                    closePasswordModal();
                    passwordForm.reset();
                } else {
                    // Hiển thị Toast
                    showToast('Lỗi: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Hiển thị Toast
                showToast('Có lỗi xảy ra.', 'error');
            });
        });
    }
});