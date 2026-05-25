/* ===========================
   COMMUNITY COMMENT SYSTEM
   Reaction + Reply (parent & child)
   Avatar kiểu A: Ảnh nếu có, fallback chữ cái
=========================== */
if (typeof window !== 'undefined') {
    // Định nghĩa placeholder trước
    window.showReplyBox = window.showReplyBox || function(commentId, postId) {
        console.log('🔄 showReplyBox placeholder - đang tải...');
        // Gọi lại khi hàm thực sự được định nghĩa
        setTimeout(() => {
            if (window.showReplyBox && window.showReplyBox !== arguments.callee) {
                window.showReplyBox(commentId, postId);
            }
        }, 100);
    };
    
    window.loadReplies = window.loadReplies || function(parentId) {
        console.log('🔄 loadReplies placeholder - đang tải...');
        setTimeout(() => {
            if (window.loadReplies && window.loadReplies !== arguments.callee) {
                window.loadReplies(parentId);
            }
        }, 100);
    };
}

function displayName(u) {
  if (!u) return "Người dùng";
  const name = (u.FullName || "").trim();
  if (!name || name.toLowerCase() === "người dùng mới") {
    return u.Username || "Người dùng";
  }
  return name;
}
async function toggleCommentReaction(commentId, type) {
    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/comment_reactions/toggle.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `comment_id=${encodeURIComponent(commentId)}&type=${encodeURIComponent(type)}`
        });

        const data = await res.json();
        if (!data.success) {
            console.error('Reaction error:', data.error);
            return; // KHÔNG ALERT
        }

        updateCommentReactionUI(commentId, data);
    } catch (err) {
        console.error("Reaction error:", err); // KHÔNG ALERT
    }
}

/* Cập nhật UI cho vùng hiển thị reaction của comment (cha hoặc con) */
function updateCommentReactionUI(commentId, data) {
    // Vùng hiển thị tổng kết cảm xúc
    const wrap =
        document.getElementById(`cmt-react-${commentId}`) ||        // comment cha
        document.getElementById(`cmt-react-reply-${commentId}`);    // comment con

    if (!wrap) return;

    const iconMap = {
        like:  "/HeThongChamSocCaKoi/assets/images/like.png",
        love:  "/HeThongChamSocCaKoi/assets/images/love.png",
        care:  "/HeThongChamSocCaKoi/assets/images/care.png",
        haha:  "/HeThongChamSocCaKoi/assets/images/haha.png",
        wow:   "/HeThongChamSocCaKoi/assets/images/wow.png",
        sad:   "/HeThongChamSocCaKoi/assets/images/sad.png",
        angry: "/HeThongChamSocCaKoi/assets/images/angry.png"
    };

    let html = "";

    if (data.total > 0) {
        html =
            Object.entries(data.summary)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([type]) => `
                    <img class="cmt-react-icon"
                         src="${iconMap[type]}"
                         onmouseenter="showCommentReactionUsersTooltip(${commentId}, '${type}', event)"
                         onmouseleave="hideReactionUsersTooltip()"
                         onclick="openCommentReactionUserModal(${commentId}, '${type}')">
                `)
                .join("") +
            `<span class="react-total">${data.total}</span>`;
    }

    wrap.innerHTML = html;

    // Nút "Thích" dưới comment
    const likeBtn = document.querySelector(`#comment-${commentId} .cmt-action-like`);
    if (!likeBtn) return;

    const colorMap = {
        like:  "#2078f4",
        love:  "#f53b57",
        care:  "#f7b125",
        haha:  "#f7b125",
        wow:   "#f7b125",
        sad:   "#f7b125",
        angry: "#e03023"
    };

    if (data.userReact) {
        const type = data.userReact.toLowerCase();
        likeBtn.classList.add("active");
        likeBtn.style.color = colorMap[type];
        likeBtn.textContent = reactionName(type);
    } else {
        likeBtn.classList.remove("active");
        likeBtn.style.color = "";
        likeBtn.textContent = "Thích";
    }
}

function reactionName(type) {
    return {
        like:  "Thích",
        love:  "Yêu thích",
        care:  "Thương thương",
        haha:  "Haha",
        wow:   "Wow",
        sad:   "Buồn",
        angry: "Tức giận"
    }[type] || "Thích";
}

/* =======================
   2. REACTION PICKER
======================= */
function openCommentReactionPicker(commentId, ev) {
    const wrap   = ev.target.closest(".cmt-like-wrap");
    const picker = document.getElementById(`cmt-react-picker-${commentId}`);

    if (!wrap || !picker) return;

    // Ẩn picker khác
    document.querySelectorAll(".cmt-react-picker.show")
        .forEach(p => p.classList.remove("show"));

    picker.classList.add("show");

    const rect = wrap.getBoundingClientRect();
    requestAnimationFrame(() => {
        picker.style.position = "absolute";
        picker.style.left = (rect.width / 2 - picker.offsetWidth / 2) + "px";
        picker.style.top  = (-picker.offsetHeight - 10) + "px";
    });
}

function closeCommentReactionPicker(commentId) {
    const picker = document.getElementById(`cmt-react-picker-${commentId}`);
    if (!picker) return;

    setTimeout(() => {
        if (picker.matches(":hover")) return;
        picker.classList.remove("show");
    }, 80);
}

function chooseCommentReaction(commentId, type) {
    toggleCommentReaction(commentId, type);
    closeCommentReactionPicker(commentId);
}
function showReplyBox(commentId, postId) {
    console.log('🟡 Opening reply box for comment:', commentId, 'Post:', postId);
    
    const box = document.getElementById(`reply-box-${commentId}`);
    if (!box) {
        console.error('❌ Reply box not found:', `reply-box-${commentId}`);
        return;
    }
    
    // 🟢 QUAN TRỌNG: Đóng tất cả reply box khác
    document.querySelectorAll('.reply-box').forEach(replyBox => {
        if (replyBox.id !== `reply-box-${commentId}`) {
            replyBox.style.display = 'none';
            replyBox.classList.remove('active');
        }
    });
    
    // Hiển thị reply box hiện tại
    box.style.display = "block";
    box.classList.add('active');
    
    const input = box.querySelector(".reply-input");
    if (!input) {
        console.error('❌ Reply input not found in box');
        return;
    }
    
    // Lấy thông tin người dùng từ comment gốc
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) {
        console.error("❌ Không tìm thấy comment element:", commentId);
        return;
    }
    
    // 🟢 LẤY TÊN TỪ DATA ATTRIBUTE
    const targetUserId = commentElement.dataset.userId;
    const targetUsername = commentElement.dataset.username;
    const targetDisplayName = commentElement.dataset.fullname || commentElement.dataset.displayname;
    
    console.log("🟡 Reply to user:", { 
        userId: targetUserId, 
        username: targetUsername, 
        displayName: targetDisplayName 
    });
    
    // 🟢 TÊN HIỂN THỊ CUỐI CÙNG
    let displayNameForTag = targetDisplayName || targetUsername || "Người dùng";
    
    // 🟢 LOẠI BỎ "NGƯỜI DÙNG MỚI" HOÀN TOÀN
    if (displayNameForTag.includes("Người dùng mới") || 
        displayNameForTag.includes("New User")) {
        displayNameForTag = targetUsername || "Người dùng";
    }
    
    console.log("🟡 Final tag name:", displayNameForTag);
    
    // Kiểm tra xem có phải là reply cho chính mình không
    const isReplyingToSelf = (window.CURRENT_USER_ID && parseInt(targetUserId) === parseInt(window.CURRENT_USER_ID)) ||
                             (window.CURRENT_USERNAME && targetUsername === window.CURRENT_USERNAME);
    
    // Xóa toàn bộ nội dung cũ
    input.innerHTML = '';
    input.textContent = '';
    
    // 🟢 FIX: CHỈ THÊM TAG HTML, KHÔNG THÊM TEXT CONTENT
    if (!isReplyingToSelf && displayNameForTag && targetUserId && targetUsername) {
        // Chỉ tạo tag HTML
        const tagHTML = `<span class="user-mention" data-user-id="${targetUserId}" data-username="${targetUsername}" contenteditable="false" style="color:#385898;font-weight:600;cursor:pointer;display:inline;margin:0;padding:0;-webkit-user-select:none;user-select:none;">${displayNameForTag}</span>`;
        
        // 🟢 QUAN TRỌNG: Chỉ set innerHTML, KHÔNG thêm text content
        input.innerHTML = tagHTML;
        
        console.log("✅ Đã thêm tag (chỉ HTML):", displayNameForTag);
    } else if (isReplyingToSelf) {
        console.log("✅ Reply chính mình - không thêm tag");
    }
    
    // 🟢 THÊM DÒNG NÀY: SETUP UPLOAD ẢNH CHO REPLY BOX
    setupReplyImageUpload(commentId, postId);
    
    // Focus
    setTimeout(() => {
        input.focus();
        
        // Đặt cursor sau tag mention
        const sel = window.getSelection();
        const range = document.createRange();
        
        // Nếu có tag mention, đặt cursor sau tag
        const mentionTag = input.querySelector('.user-mention');
        if (mentionTag) {
            // Đặt cursor sau tag
            range.setStartAfter(mentionTag);
            range.setEndAfter(mentionTag);
            
            // 🟢 THÊM KHOẢNG TRẮNG SAU TAG
            const spaceNode = document.createTextNode(' ');
            mentionTag.parentNode.insertBefore(spaceNode, mentionTag.nextSibling);
            range.setStartAfter(spaceNode);
            range.setEndAfter(spaceNode);
        } else {
            // Nếu không có tag, đặt cursor ở cuối
            range.selectNodeContents(input);
            range.collapse(false);
        }
        
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Cho phép Enter để xuống dòng
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.execCommand('insertText', false, '\n');
            }
        });
    }, 100);
    
    // 🟢 THÊM DÒNG NÀY: Kích hoạt nút gửi nếu có nội dung
    updateReplySendButton(commentId);
    
    console.log('✅ Reply box opened successfully');
}
// ===== HÀM MỚI: CHỈ MỞ 1 REPLY BOX CHO COMMENT CON =====
function openSingleReplyBox(commentId, postId) {
    console.log('🟢 Opening single reply box for:', commentId);
    
    // Ẩn tất cả reply box đang mở
    document.querySelectorAll('.reply-box').forEach(box => {
        box.style.display = 'none';
        box.classList.remove('active');
    });
    
    // Hiện reply box của comment được click
    const replyBox = document.getElementById(`reply-box-${commentId}`);
    if (replyBox) {
        replyBox.style.display = 'block';
        replyBox.classList.add('active');
        
        // 🟢 THÊM DÒNG NÀY: Gọi hàm showReplyBox để setup đầy đủ
        if (window.showReplyBox) {
            window.showReplyBox(commentId, postId);
        } else {
            // Nếu không có showReplyBox, setup thủ công
            setupReplyImageUpload(commentId, postId);
            
            // Focus vào input
            setTimeout(() => {
                const replyInput = replyBox.querySelector('.reply-input');
                if (replyInput) {
                    replyInput.focus();
                }
            }, 100);
            
            // Update nút gửi
            updateReplySendButton(commentId);
        }
        
        // Scroll vào view
        replyBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        console.log('✅ Single reply box opened');
    } else {
        console.error('❌ Reply box not found:', `reply-box-${commentId}`);
    }
}
function updateReplySendButton(commentId) {
    const box = document.getElementById(`reply-box-${commentId}`);
    if (!box) return;
    
    const input = box.querySelector('.reply-input');
    const fileInput = box.querySelector('.comment-image-input');
    const sendBtn = box.querySelector('.reply-send-btn');
    
    if (!sendBtn) return;
    
    // Kiểm tra có nội dung text
    let hasText = false;
    if (input) {
        const textContent = input.textContent || '';
        hasText = textContent.trim().length > 0;
    }
    
    // Kiểm tra có ảnh
    const hasImage = fileInput && fileInput.files && fileInput.files.length > 0;
    
    // Active nếu có text HOẶC có ảnh
    if (hasText || hasImage) {
        sendBtn.classList.add('active');
        sendBtn.disabled = false;
    } else {
        sendBtn.classList.remove('active');
        sendBtn.disabled = true;
    }
}
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('reply-input')) {
        const replyInput = e.target;
        const replyBox = replyInput.closest('.reply-box');
        if (replyBox) {
            const replyBoxId = replyBox.id;
            const matches = replyBoxId.match(/reply-box-(\d+)/);
            if (matches && matches[1]) {
                const commentId = matches[1];
                updateReplySendButton(commentId);
            }
        }
    }
});
// Thêm vào file JavaScript của bạn
document.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào nút "Trả lời" trong reply list (comment con)
    if (e.target.classList.contains('cmt-action') && 
        e.target.textContent.includes('Trả lời')) {
        
        // Tìm comment item chứa nút này
        const commentItem = e.target.closest('.comment-item');
        if (!commentItem) return;
        
        // Kiểm tra nếu là reply của comment con (có class reply-list)
        const isReplyOfReply = commentItem.closest('.reply-list');
        
        if (isReplyOfReply) {
            e.preventDefault();
            e.stopPropagation();
            
            // Đóng tất cả reply box trong cùng reply list
            const replyList = commentItem.closest('.reply-list');
            if (replyList) {
                replyList.querySelectorAll('.reply-box').forEach(box => {
                    box.classList.remove('active');
                });
            }
            
            // Mở reply box của comment được click
            const replyBox = commentItem.querySelector('.reply-box');
            if (replyBox) {
                replyBox.classList.add('active');
                
                // Focus vào input
                const replyInput = replyBox.querySelector('.reply-input');
                if (replyInput) {
                    setTimeout(() => {
                        replyInput.focus();
                        // Scroll vào view
                        replyInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            }
        }
    }
    
    // Đóng reply box khi click ra ngoài (cho reply của comment con)
    if (!e.target.closest('.reply-box') && 
        !e.target.closest('.reply-list .cmt-action')) {
        document.querySelectorAll('.reply-list .reply-box').forEach(box => {
            box.classList.remove('active');
        });
    }
});

// Thêm sự kiện cho input reply của comment con
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('reply-input')) {
        const replyBox = e.target.closest('.reply-box');
        if (replyBox && replyBox.closest('.reply-list')) {
            const sendBtn = replyBox.querySelector('.reply-send-btn');
            if (sendBtn) {
                // Kiểm tra nếu có nội dung (bao gồm cả tag mention)
                const hasContent = e.target.textContent.trim().length > 0 || 
                                 e.target.querySelector('.user-mention');
                
                if (hasContent) {
                    sendBtn.classList.add('active');
                } else {
                    sendBtn.classList.remove('active');
                }
            }
        }
    }
});
// Thêm event listener cho reply input (gõ chữ)
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('reply-input')) {
        const replyInput = e.target;
        const replyBox = replyInput.closest('.reply-box');
        if (replyBox) {
            const replyBoxId = replyBox.id;
            const matches = replyBoxId.match(/reply-box-(\d+)/);
            if (matches && matches[1]) {
                const commentId = matches[1];
                updateReplySendButton(commentId);
            }
        }
    }
});

// Thêm event listener cho nút gửi reply (CLICK)
document.addEventListener('click', function(e) {
    // Kiểm tra click vào nút gửi reply
    if (e.target.closest('.reply-send-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        const sendBtn = e.target.closest('.reply-send-btn');
        console.log('🟡 Reply send button clicked:', sendBtn);
        
        // Kiểm tra nếu nút đang active
        if (sendBtn.classList.contains('active') && !sendBtn.disabled) {
            const replyBox = sendBtn.closest('.reply-box');
            if (!replyBox) {
                console.error('❌ Cannot find reply box');
                return;
            }
            
            const replyBoxId = replyBox.id;
            const matches = replyBoxId.match(/reply-box-(\d+)/);
            
            if (matches && matches[1]) {
                const commentId = parseInt(matches[1]);
                const postElement = replyBox.closest('.community-post');
                let postId = null;
                
                // Tìm post ID
                if (postElement) {
                    postId = postElement.dataset.postId || postElement.getAttribute('data-post-id');
                }
                
                // Nếu không tìm thấy trong dataset, thử tìm trong HTML
                if (!postId) {
                    const postIdElement = document.querySelector('[data-post-id]');
                    if (postIdElement) {
                        postId = postIdElement.dataset.postId;
                    }
                }
                
                if (postId) {
                    console.log('🟡 Sending reply:', { postId, commentId });
                    submitReply(postId, commentId);
                } else {
                    console.error('❌ Cannot find post ID');
                    alert('Không tìm thấy bài viết');
                }
            } else {
                console.error('❌ Cannot parse comment ID from reply box ID:', replyBoxId);
            }
        } else {
            console.log('🟡 Send button is not active or is disabled');
        }
    }
});

// Thêm event listener cho Enter key trong reply input
document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('reply-input') && e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        
        const replyInput = e.target;
        const replyBox = replyInput.closest('.reply-box');
        if (replyBox) {
            const replyBoxId = replyBox.id;
            const matches = replyBoxId.match(/reply-box-(\d+)/);
            
            if (matches && matches[1]) {
                const commentId = parseInt(matches[1]);
                const postElement = replyBox.closest('.community-post');
                const postId = postElement ? postElement.dataset.postId : null;
                
                if (postId) {
                    console.log('🟡 Ctrl+Enter pressed, sending reply');
                    submitReply(postId, commentId);
                }
            }
        }
    }
});
function setupReplyImageUpload(commentId, postId) {
    console.log('🟡 Setting up image upload for reply:', commentId);
    
    const box = document.getElementById(`reply-box-${commentId}`);
    if (!box) return;
    
    const fileInput = box.querySelector('.comment-image-input');
    const addImageBtn = box.querySelector('.reply-add-image-btn');
    const previewContainer = box.querySelector('.reply-image-preview-container');
    
    // Setup nút thêm ảnh
    if (addImageBtn && fileInput) {
        addImageBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        };
    }
    
    // Setup file input
    if (fileInput) {
        fileInput.onchange = function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                // Kiểm tra giống comment
                if (file.size > 5 * 1024 * 1024) {
                    alert('Kích thước ảnh tối đa 5MB');
                    fileInput.value = '';
                    updateReplySendButton(commentId);
                    return;
                }
                
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
                    fileInput.value = '';
                    updateReplySendButton(commentId);
                    return;
                }
                
                // Hiển thị preview giống comment
                const reader = new FileReader();
                reader.onload = function(e) {
                if (previewContainer) {
                    const imageUrl = e.target.result;
                    previewContainer.innerHTML = `
                        <div class="comment-image-preview">
                            <div class="comment-image-wrapper" onclick="openSimpleImagePreview('${imageUrl}')">
                                <img src="${imageUrl}" alt="Preview">
                                <div class="comment-image-hover">
                                    <span class="material-icons">zoom_in</span>
                                </div>
                            </div>
                            <button type="button" class="comment-remove-image-btn" 
                                    onclick="removeReplyImagePreview(${commentId})">
                                <span class="material-icons">close</span>
                            </button>
                            <!-- 🟢 XÓA DÒNG HIỂN THỊ TÊN FILE -->
                        </div>
                    `;
                    previewContainer.style.display = 'block';
                    updateReplySendButton(commentId);
                }
            };
                reader.readAsDataURL(file);
            }
        };
    }
    
    console.log('✅ Image upload setup complete');
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const overlay = document.querySelector('.simple-image-overlay');
        if (overlay) {
            closeSimpleImagePreviewOnly();
        }
    }
});
function handleReplyImageUpload(commentId, postId, input) {
    console.log('🟡 Uploading image for reply:', commentId);
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Kiểm tra kích thước (5MB) - GIỐNG COMMENT
        if (file.size > 5 * 1024 * 1024) {
            alert('Kích thước ảnh tối đa 5MB');
            input.value = '';
            updateReplySendButton(commentId);
            return;
        }
        
        // Kiểm tra loại file - GIỐNG COMMENT
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
            input.value = '';
            updateReplySendButton(commentId);
            return;
        }
        
        // Hiển thị preview - GIỐNG COMMENT
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById(`reply-preview-${commentId}`);
            if (previewContainer) {
                const imageUrl = e.target.result;
                previewContainer.innerHTML = `
                    <div class="comment-image-preview">
                        <div class="comment-image-wrapper" onclick="openSimpleImagePreview('${imageUrl}')">
                            <img src="${imageUrl}" alt="Preview">
                            <div class="comment-image-hover">
                                <span class="material-icons">zoom_in</span>
                            </div>
                        </div>
                        <button type="button" class="comment-remove-image-btn" 
                                onclick="removeReplyImagePreview(${commentId})">
                            <span class="material-icons">close</span>
                        </button>
                        <!-- 🟢 XÓA DÒNG HIỂN THỊ TÊN FILE -->
                    </div>
                `;
                previewContainer.style.display = 'block';
                
                // Kích hoạt nút gửi
                updateReplySendButton(commentId);
            }
        };
        reader.readAsDataURL(file);
        
        console.log('✅ Image selected for reply:', file.name);
    }
}
function removeReplyImagePreview(commentId) {
    console.log('🗑️ Removing reply image preview:', commentId);
    
    const box = document.getElementById(`reply-box-${commentId}`);
    if (!box) return;
    
    const previewContainer = box.querySelector('.reply-image-preview-container');
    const fileInput = box.querySelector('.comment-image-input');
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    updateReplySendButton(commentId);
}

// Hàm hiển thị toast thông báo
function showToast(message, type = 'info') {
    // Xóa toast cũ nếu có
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <span class="material-icons" style="font-size:16px;margin-right:5px;">
            ${type === 'success' ? 'check_circle' : 'info'}
        </span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Animation hiển thị
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Tự động ẩn sau 2 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 2000);
}

// Thêm CSS cho toast
const toastCSS = `
.toast-notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    z-index: 99999;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
}

.toast-notification.show {
    opacity: 1;
    transform: translateY(0);
}

.toast-notification.success {
    background: #4caf50;
}

.toast-notification.info {
    background: #2196f3;
}

.toast-notification.warning {
    background: #ff9800;
}

.toast-notification.error {
    background: #f44336;
}
`;

// Thêm CSS vào head
if (!document.getElementById('toast-css')) {
    const style = document.createElement('style');
    style.id = 'toast-css';
    style.textContent = toastCSS;
    document.head.appendChild(style);
}
// =============================================
// 🟢 HÀM MỚI: XÓA PREVIEW ẢNH
// =============================================
function removeImagePreview(commentId) {
    const box = document.getElementById(`reply-box-${commentId}`);
    if (!box) return;
    
    const previewContainer = box.querySelector('.image-preview-container');
    const fileInput = box.querySelector('.comment-image-input');
    
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
}
function handleCommentImageUpload(postId, input) {
    console.log('🟡 Uploading image for comment:', postId);
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Kiểm tra kích thước (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Kích thước ảnh tối đa 5MB');
            input.value = '';
            return;
        }
        
        // Kiểm tra loại file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
            input.value = '';
            return;
        }
        
        // Hiển thị preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById(`comment-preview-${postId}`);
            if (previewContainer) {
                const imageUrl = e.target.result;
                previewContainer.innerHTML = `
                    <div class="comment-image-preview">
                        <div class="comment-image-wrapper" onclick="openSimpleImagePreview('${imageUrl}')">
                            <img src="${imageUrl}" alt="Preview">
                            <div class="comment-image-hover">
                                <span class="material-icons">zoom_in</span>
                            </div>
                        </div>
                        <button type="button" class="comment-remove-image-btn" 
                                onclick="removeCommentImagePreview(${postId})">
                            <span class="material-icons">close</span>
                        </button>
                        <!-- 🟢 XÓA DÒNG HIỂN THỊ TÊN FILE -->
                    </div>
                `;
                previewContainer.style.display = 'block';
                
                // Kích hoạt nút gửi
                const sendBtn = document.querySelector(`#comments-${postId} .comment-send-btn`);
                if (sendBtn) {
                    sendBtn.classList.add('active');
                }
            }
        };
        reader.readAsDataURL(file);
        
        console.log('✅ Image selected:', file.name);
    }
}

// Hàm định dạng kích thước file
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
async function submitReply(postId, parentId) {
    console.log('🟡 Starting submitReply:', { postId, parentId });
    
    const input = document.getElementById(`reply-input-${parentId}`);
    const fileInput = document.querySelector(`#reply-box-${parentId} .comment-image-input`);
    
    if (!input) {
        console.error('❌ Reply input not found');
        alert('Không tìm thấy ô nhập phản hồi');
        return;
    }
    
    console.log('🟡 Input HTML:', input.innerHTML);
    console.log('🟡 Input text:', input.textContent);
    
    // 🟢 FIX: LẤY TOÀN BỘ HTML LÀM NỘI DUNG (giữ nguyên HTML từ PHP)
    let finalContent = input.innerHTML.trim();
    
    // Lấy tag mention nếu có
    const mentionTag = input.querySelector('.clickable-mention');
    let mentionedUserId = 0;
    let mentionedUsername = '';
    let mentionedName = '';
    
    if (mentionTag) {
        mentionedUserId = mentionTag.getAttribute('data-user-id') || 0;
        mentionedUsername = mentionTag.getAttribute('data-username') || '';
        mentionedName = mentionTag.textContent.trim(); // 🟢 CHỈ LẤY TÊN, KHÔNG CÓ @
        
        console.log('🟡 Found mention tag:', { 
            userId: mentionedUserId, 
            username: mentionedUsername, 
            name: mentionedName 
        });
        
        // 🟢 QUAN TRỌNG: KHÔNG CẦN XỬ LÝ LẠI HTML, GIỮ NGUYÊN ĐỂ GỬI LÊN SERVER
        // PHP sẽ xử lý và trả về HTML đã định dạng
        console.log('🟡 Keeping HTML content for server processing');
    }
    
    console.log('🟡 Final content to send:', finalContent);
    
    // Kiểm tra có nội dung HOẶC ảnh
    const hasImage = fileInput && fileInput.files && fileInput.files.length > 0;
    if (!finalContent && !hasImage) {
        alert('Vui lòng nhập nội dung hoặc chọn ảnh');
        return;
    }
    
    // Tạo FormData để gửi ảnh
    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('parent_id', parentId);
    formData.append('content', finalContent || '');
    
    // Chỉ thêm mentioned nếu có tag
    if (mentionTag && mentionedUserId > 0) {
        formData.append('mentioned_user_id', mentionedUserId);
        formData.append('mentioned_username', mentionedUsername);
        console.log('🟡 Adding mention:', { userId: mentionedUserId, username: mentionedUsername });
    }
    
    // Thêm ảnh nếu có
    if (hasImage) {
        formData.append('image', fileInput.files[0]);
        console.log('🖼️ Adding image to reply:', fileInput.files[0].name);
    }
    
    // Debug FormData
    console.log('🟡 FormData entries:');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ', pair[1]);
    }
    
    // Hiển thị loading
    const sendBtn = document.querySelector(`#reply-box-${parentId} .reply-send-btn`);
    const originalHTML = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
        sendBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">refresh</span>';
        sendBtn.disabled = true;
        sendBtn.classList.remove('active');
    }
    
    try {
        console.log('🟡 Sending reply to API...');
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/reply.php`, {
            method: "POST",
            body: formData
        });
        
        console.log('🟡 Response status:', res.status, res.statusText);
        
        // Đọc response text trước khi parse JSON
        const responseText = await res.text();
        console.log('🟡 Raw response:', responseText);
        
        // Kiểm tra nếu response không phải JSON
        if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
            console.error('❌ Response is not JSON:', responseText.substring(0, 200));
            
            // Kiểm tra common errors
            if (responseText.includes('Fatal error') || responseText.includes('Parse error')) {
                throw new Error('Lỗi PHP: ' + responseText.substring(0, 200));
            } else if (responseText.includes('database') || responseText.includes('SQL')) {
                throw new Error('Lỗi database: ' + responseText.substring(0, 200));
            } else {
                throw new Error('Server trả về dữ liệu không hợp lệ: ' + responseText.substring(0, 200));
            }
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('❌ Response text:', responseText);
            throw new Error('Server trả về JSON không hợp lệ');
        }
        
        console.log("🟢 API Response:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Không thể gửi phản hồi");
        }
        
        // Reset
        input.innerHTML = '';
        input.textContent = '';
        
        // Xóa ảnh preview
        if (window.removeReplyImagePreview) {
            removeReplyImagePreview(parentId);
        }
        
        // Ẩn reply box
        const replyBox = document.getElementById(`reply-box-${parentId}`);
        if (replyBox) {
            replyBox.style.display = 'none';
        }
        
        // 🟢 THAY VÌ TẢI LẠI TOÀN BỘ, HÃY THÊM REPLY MỚI TRỰC TIẾP
        if (data.reply) {
            // Tìm reply list
            const replyList = document.querySelector(`#comment-${parentId} .reply-list`);
            if (replyList) {
                console.log('🟢 Found reply list, adding new reply...');
                
                // Render reply mới
                const newReplyHtml = renderReplyItem(data.reply);
                
                // Ẩn nút "Xem phản hồi" nếu có
                const viewRepliesBtn = document.querySelector(`#comment-${parentId} .view-replies`);
                if (viewRepliesBtn) {
                    viewRepliesBtn.style.display = 'none';
                }
                
                // Nếu reply list đang có loading message, xóa nó
                const loadingMessage = replyList.querySelector('.reply-loading');
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                
                // Thêm reply mới vào đầu danh sách
                replyList.insertAdjacentHTML('afterbegin', newReplyHtml);
                
                // Thêm animation
                const newReplyElement = replyList.querySelector(`#comment-${data.reply.CommentID}`);
                if (newReplyElement) {
                    newReplyElement.style.opacity = '0';
                    newReplyElement.style.transform = 'translateY(10px)';
                    
                    setTimeout(() => {
                        newReplyElement.style.transition = 'all 0.3s ease';
                        newReplyElement.style.opacity = '1';
                        newReplyElement.style.transform = 'translateY(0)';
                    }, 10);
                }
                
                console.log('✅ Reply added to DOM:', data.reply.CommentID);
            } else {
                console.warn('⚠️ Reply list not found, falling back to loadReplies');
                if (window.loadReplies) {
                    await loadReplies(parentId);
                }
            }
        } else {
            // Nếu không có data.reply, tải lại toàn bộ replies
            console.warn('⚠️ No reply data in response, loading all replies');
            if (window.loadReplies) {
                await loadReplies(parentId);
            }
        }
        
        console.log("✅ Reply đã được gửi thành công");
        
    } catch (err) {
        console.error("❌ Lỗi gửi reply:", err);
        
        // Hiển thị lỗi chi tiết
        let errorMessage = err.message;
        
        if (errorMessage.includes('JSON') || errorMessage.includes('Parse')) {
            errorMessage = 'Lỗi dữ liệu từ server';
        } else if (errorMessage.includes('HTTP 500')) {
            errorMessage = 'Lỗi server (500). Vui lòng thử lại sau.';
        } else if (errorMessage.includes('HTTP 404')) {
            errorMessage = 'Không tìm thấy API';
        } else if (errorMessage.includes('HTTP 401')) {
            errorMessage = 'Bạn cần đăng nhập để gửi phản hồi';
        } else if (errorMessage.includes('HTTP 403')) {
            errorMessage = 'Không có quyền truy cập';
        }
        
        alert("Lỗi: " + errorMessage);
    } finally {
        // Khôi phục nút gửi
        const sendBtn = document.querySelector(`#reply-box-${parentId} .reply-send-btn`);
        if (sendBtn) {
            sendBtn.innerHTML = originalHTML || '<span class="material-icons">send</span>';
            sendBtn.disabled = false;
        }
    }
}
function showCommentMenuAsModal(button) {
    const menuContent = button.nextElementSibling.innerHTML;
    
    // Tạo modal
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.onclick = () => hideMenuModal();
    
    const modal = document.createElement('div');
    modal.className = 'comment-menu-modal-mode';
    modal.innerHTML = menuContent;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    setTimeout(() => {
        overlay.classList.add('show');
        modal.classList.add('show');
    }, 10);
}

function hideMenuModal() {
    document.querySelectorAll('.menu-overlay, .comment-menu-modal-mode').forEach(el => {
        el.remove();
    });
}
async function sendReplyWithContent(postId, parentId, content, mentionedUserId, mentionedUsername) {
    try {
        const formData = new URLSearchParams();
        formData.append('post_id', postId);
        formData.append('parent_id', parentId);
        formData.append('content', content);
        
        if (mentionedUserId > 0) {
            formData.append('mentioned_user_id', mentionedUserId);
            formData.append('mentioned_username', mentionedUsername);
        }

        const res = await fetch(`${BASE_URL}/backend/api/community/comments/reply.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });

        const data = await res.json();
        console.log("🟢 API Response:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Không thể gửi phản hồi");
        }

        // Reset input
        const input = document.getElementById(`reply-input-${parentId}`);
        if (input) {
            input.innerHTML = '';
            input.textContent = '';
        }
        
        // Tải lại replies
        await loadReplies(parentId);
        
        console.log("✅ Reply đã được gửi thành công");

    } catch (err) {
        console.error("Lỗi gửi reply:", err);
        alert("Lỗi: " + err.message);
    }
}
async function sendReplyWithContent(postId, parentId, content, mentionedUserId, mentionedUsername) {
    try {
        const formData = new URLSearchParams();
        formData.append('post_id', postId);
        formData.append('parent_id', parentId);
        formData.append('content', content);
        
        if (mentionedUserId > 0) {
            formData.append('mentioned_user_id', mentionedUserId);
            formData.append('mentioned_username', mentionedUsername);
        }

        const res = await fetch(`${BASE_URL}/backend/api/community/comments/reply.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });

        const data = await res.json();
        console.log("🟢 API Response:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Không thể gửi phản hồi");
        }

        // Reset input
        const input = document.getElementById(`reply-input-${parentId}`);
        if (input) {
            input.innerHTML = '';
            input.textContent = '';
        }
        
        // Tải lại replies
        await loadReplies(parentId);
        
        console.log("✅ Reply đã được gửi thành công");

    } catch (err) {
        console.error("Lỗi gửi reply:", err);
        alert("Lỗi: " + err.message);
    }
}
async function sendReplyNotification(postId, parentCommentId, replyCommentId, targetUserId) {
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/notifications/create.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `type=comment_reply&target_id=${targetUserId}&post_id=${postId}&comment_id=${replyCommentId}&parent_comment_id=${parentCommentId}`
        });
        
        const data = await res.json();
        if (data.success) {
            console.log("✅ Đã gửi thông báo reply");
        }
    } catch (error) {
        console.error("Lỗi gửi thông báo:", error);
    }
}
async function loadReplies(parentId) {
    const wrap = document.querySelector(`#comment-${parentId} > .comment-body > .reply-list`);
    if (!wrap) {
        console.error(`Không tìm thấy reply-list cho comment ${parentId}`);
        return;
    }

    // Ẩn nút "Xem phản hồi"
    const viewBtn = document.querySelector(`#comment-${parentId} .view-replies`);
    if (viewBtn) {
        viewBtn.style.display = 'none';
    }

    wrap.innerHTML = '<div class="reply-loading">Đang tải phản hồi...</div>';

    try {
        console.log(`🟡 Loading replies for comment ${parentId}`);
        
        const res = await fetch(`/HeThongChamSocCaKoi/backend/api/community/comments/replies.php?comment_id=${parentId}`);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        console.log("🟢 Replies API response:", data);

        if (!data.success) {
            throw new Error(data.error || "API trả về không thành công");
        }

        const replies = data.replies || [];
        
        console.log(`🟢 Found ${replies.length} replies`);

        if (replies.length === 0) {
            wrap.innerHTML = '';
            return;
        }

        // Render từng reply
        let html = '';
        for (let i = 0; i < replies.length; i++) {
            try {
                html += renderReplyItem(replies[i]);
            } catch (err) {
                console.error(`❌ Lỗi render reply ${i}:`, err, replies[i]);
                html += `<div class="reply-error">Lỗi hiển thị phản hồi</div>`;
            }
        }
        
        wrap.innerHTML = html;
        
        // Ẩn nút "Xem phản hồi" vĩnh viễn
        if (viewBtn) {
            viewBtn.remove();
        }

    } catch (err) {
        console.error("❌ Lỗi tải replies:", err);
        wrap.innerHTML = `<div class="reply-error">Lỗi tải phản hồi: ${escapeHtml(err.message)}</div>`;
    }
}
/* Click vào thẻ tag trong reply để đi tới profile */
document.addEventListener("click", e => {
    if (e.target.classList.contains("reply-tag")) {
        const username = e.target.dataset.username;
        window.location.href = `/HeThongChamSocCaKoi/frontend/profile.php?u=${username}`;
    }
});

function insertReplyTag(div, fullName, username) {
    const tag = document.createElement("span");
    tag.className = "reply-tag";
    tag.dataset.username = username;
    tag.innerHTML = `<b>${fullName}</b>`;
    tag.contentEditable = "false";

    const space = document.createTextNode(" ");

    const sel   = window.getSelection();
    const range = sel.getRangeAt(0);

    range.insertNode(space);
    range.insertNode(tag);

    range.setStartAfter(space);
    range.setEndAfter(space);
    sel.removeAllRanges();
    sel.addRange(range);
}
function buildCommentImageURL(imagePath) {
    console.log("🔍 buildCommentImageURL input:", imagePath);
    
    if (!imagePath || imagePath.trim() === '' || 
        imagePath === "undefined" || imagePath === "null") {
        console.log("🔍 No image path");
        return null;
    }
    
    // Nếu đã là URL đầy đủ (http:// hoặc https://)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        console.log("🔍 Already full URL");
        return imagePath;
    }
    
    // Nếu là đường dẫn tương đối
    if (imagePath.includes('/')) {
        // 🟢 FIX QUAN TRỌNG: Kiểm tra nếu bắt đầu bằng 'uploads/comments/'
        if (imagePath.startsWith('uploads/comments/')) {
            const finalPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
            console.log("🔍 Uploads path, adding base URL:", finalPath);
            return BASE_URL + finalPath;
        }
        
        // 🟢 FIX MỚI: Nếu là đường dẫn mới từ server trả về
        if (imagePath.startsWith('/uploads/comments/')) {
            console.log("🔍 Server path with slash:", imagePath);
            return BASE_URL + imagePath;
        }
        
        const finalPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
        console.log("🔍 Other path:", finalPath);
        return BASE_URL + finalPath;
    }
    
    // Nếu chỉ là tên file -> thêm đường dẫn mặc định
    console.log("🔍 Filename only, using default path");
    return `${BASE_URL}/uploads/comments/${imagePath}`;
}
function buildAvatarURL(u) {
    if (!u || !u.AvatarURL || u.AvatarURL.trim() === "") return null;

    let url = u.AvatarURL.trim();

    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    
    // 🔴 FIX LỖI NHÂN ĐÔI BASE_URL
    // Nếu URL bắt đầu bằng '/', nó là đường dẫn tuyệt đối (đã bao gồm BASE_URL)
    if (url.startsWith("/")) return url; 

    return `${BASE_URL}/uploads/avatars/${url}`;
}
function processContentWithMentions(content) {
    if (!content) return '';
    
    // Chuyển đổi user-mention thành clickable link
    return content.replace(
        /<span class="user-mention" data-user-id="(\d+)" data-username="([^"]*)">@([^<]+)<\/span>/g,
        (match, userId, username, fullName) => {
            return `<span class="user-mention" data-user-id="${userId}" data-username="${username}" 
                    onclick="window.openUserProfile && window.openUserProfile('${username}')"
                     style="color: #385898; font-weight: 600; cursor: pointer;">
                    @${fullName}
                </span>`;
        }
    );
}
function renderReplyItem(r) {
    console.log("🟡 Rendering reply:", r);
    
    // Kiểm tra dữ liệu đầu vào
    if (!r || typeof r !== 'object') {
        console.error("❌ Reply data không hợp lệ:", r);
        return '<div class="reply-error">Dữ liệu không hợp lệ</div>';
    }
    
    // 🟢 DEBUG: KIỂM TRA DỮ LIỆU ẢNH TỪ API
    console.log("🔍 DEBUG Reply image data:", {
        HasImage: r.HasImage,
        ImageURL: r.ImageURL,
        ImageWidth: r.ImageWidth,
        ImageHeight: r.ImageHeight,
        fullData: r
    });
    
    const u = r.user || {};
    const name = displayName(u);
    const username = u.Username || '';
    const userId = u.UserID || 0;
    const avatarText = name[0] ? name[0].toUpperCase() : '?';
    const avatarUrl = buildAvatarURL(u) || null;

    // 🟢 KIỂM TRA CÓ PHẢI REPLY CỦA CHÍNH MÌNH KHÔNG
    const isOwnReply = window.CURRENT_USER_ID && parseInt(userId) === parseInt(window.CURRENT_USER_ID);
    
    // 🟢 KIỂM TRA CÓ PHẢI ADMIN KHÔNG
    const isAdmin = window.CURRENT_USER_ROLE === 'Admin';

    // 🟢 KIỂM TRA USER CÓ BỊ CẤM BÌNH LUẬN KHÔNG
    const isCommentBanned = r.is_comment_banned || false;
    const banReason = r.ban_reason || '';
    const banDuration = r.BanDuration || 0;
    const bannedAt = r.BannedAt || '';
    const bannedBy = r.banned_by_username || 'Admin';
    
    console.log("🟡 User ban status:", { 
        isCommentBanned, 
        banReason, 
        banDuration, 
        userId, 
        username 
    });

    // Lấy reactions
    const reactions = r.reactions || {};
    const summary = reactions.summary || {};
    const total = reactions.total || 0;
    const userReact = reactions.user || null;
    
    const ctime = r.CreatedAt ? r.CreatedAt.slice(0, 16) : "";
    const replyCount = r.ReplyCount || 0;

    // Xử lý content
    let contentHTML = r.Content || '';
    contentHTML = cleanCommentContent(contentHTML);
    
    console.log("🔍 Cleaned content:", contentHTML);
    
    // =============================================
    // 🟢 THÊM VÀO: HIỂN THỊ ẢNH NẾU CÓ - GIỐNG COMMENT
    // =============================================
    let imageHTML = '';
    
    // 🟢 DEBUG CHI TIẾT: KIỂM TRA ĐIỀU KIỆN ẢNH
    console.log("🔍 Image check conditions:", {
        HasImage: r.HasImage,
        HasImage_type: typeof r.HasImage,
        HasImage_value: r.HasImage,
        ImageURL: r.ImageURL,
        ImageURL_type: typeof r.ImageURL,
        ImageURL_truthy: !!r.ImageURL,
        condition1: r.HasImage && r.ImageURL,
        condition2: r.HasImage === true && r.ImageURL,
        condition3: r.HasImage === 1 && r.ImageURL,
        condition4: r.HasImage == true && r.ImageURL, // Loose comparison
    });
    
    // Kiểm tra ảnh theo nhiều cách
    const hasImageValue = r.HasImage === true || r.HasImage === 1 || r.HasImage === '1' || r.HasImage === 'true';
    const hasImageURL = r.ImageURL && r.ImageURL.trim() !== '';
    
    if (hasImageValue && hasImageURL) {
        console.log("✅ Image conditions met!");
        const imageUrl = buildCommentImageURL(r.ImageURL);
        console.log("✅ Building image URL:", imageUrl);
        
        imageHTML = `
            <div class="comment-image-container">
                <div class="comment-image" onclick="openCommentImageModal('${imageUrl}')">
                    <img src="${imageUrl}" 
                         alt="Ảnh đính kèm"
                         loading="lazy"
                         ${r.ImageWidth ? `width="${r.ImageWidth}"` : ''}
                         ${r.ImageHeight ? `height="${r.ImageHeight}"` : ''}>
                </div>
            </div>
        `;
        console.log("🖼️ Added image to reply:", imageUrl, "HTML:", imageHTML);
    } else {
        console.log("❌ Image conditions NOT met:", { hasImageValue, hasImageURL, HasImage: r.HasImage, ImageURL: r.ImageURL });
    }

    const iconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`
    };

    // Hiển thị reaction icons
    const reactIconsHtml = total > 0 ?
        Object.entries(summary)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => `
                <img class="cmt-react-icon"
                     src="${iconMap[type] || iconMap.like}"
                     onmouseenter="showCommentReactionUsersTooltip(${r.CommentID}, '${type}', event)"
                     onmouseleave="hideReactionUsersTooltip()"
                     onclick="openCommentReactionUserModal(${r.CommentID}, '${type}')">
            `).join("") : "";

    // 🟢 TẠO MENU 3 CHẤM CHO REPLY - GIỐNG COMMENT
    let replyMenuHtml = '';
    
    // 1. REPLY CỦA CHÍNH MÌNH: Chỉnh sửa + Xóa
    if (isOwnReply) {
        replyMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${r.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${r.CommentID}">
                    <button class="comment-menu-item" onclick="editComment(${r.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">edit</span>
                        Chỉnh sửa
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item delete" onclick="deleteComment(${r.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">delete</span>
                        Xóa
                    </button>
                </div>
            </div>
        `;
    }
    // 2. ADMIN XEM REPLY NGƯỜI KHÁC: Xóa + Cấm bình luận
    else if (isAdmin && !isOwnReply) {
        replyMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${r.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${r.CommentID}">
                    <button class="comment-menu-item delete" onclick="adminDeleteComment(${r.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px; color:#d32f2f;">delete</span>
                        <span style="color:#d32f2f; font-weight:600">Xóa reply</span>
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item ban" onclick="adminBanUserComment(${userId}, '${username}', event)">
                        <span class="material-icons" style="font-size:18px; color:#f57c00;">block</span>
                        <span style="color:#f57c00; font-weight:600">Cấm bình luận user</span>
                    </button>
                </div>
            </div>
        `;
    }
    // 3. USER THƯỜNG XEM REPLY NGƯỜI KHÁC: Ẩn + Báo cáo
    else if (!isOwnReply) {
        replyMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${r.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${r.CommentID}">
                    <button class="comment-menu-item" onclick="hideComment(${r.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">visibility_off</span>
                        Ẩn phản hồi
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item report" onclick="reportComment(${r.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px; color:#ff9800;">flag</span>
                        <span style="color:#ff9800;">Báo cáo phản hồi</span>
                    </button>
                </div>
            </div>
        `;
    }

    // 🟢 THÊM BADGE CẤM VÀO TÊN USER NẾU BỊ CẤM VÀ LÀ ADMIN XEM
    let nameWithBadge = escapeHtml(name);
    
    if (isCommentBanned && isAdmin) {
        const badgeText = banDuration === 0 ? '🔴 CẤM VĨNH VIỄN' : `🔴 CẤM ${banDuration} NGÀY`;
        nameWithBadge = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${nameWithBadge}</span>
                <span class="ban-badge-admin" 
                      title="Lý do: ${escapeHtml(banReason)}\nBị cấm bởi: ${escapeHtml(bannedBy)}\nNgày cấm: ${formatDate(bannedAt)}"
                      style="background:#ff4444;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;cursor:help;display:inline-flex;align-items:center;gap:4px;">
                    <span style="font-size:14px;">⛔</span>
                    <span>${badgeText}</span>
                </span>
            </div>
        `;
        console.log("✅ Added ban badge for user:", username);
    }

    // 🟢 TẠO HTML CHO REPLY BOX VỚI CHỨC NĂNG UPLOAD ẢNH - SỬA ĐỂ HIỂN THỊ ĐÚNG
    const replyBoxHtml = `
        <div class="reply-box" id="reply-box-${r.CommentID}" style="display:none;">
            <div class="reply-input-wrapper">
                <div class="reply-input" id="reply-input-${r.CommentID}" contenteditable="true" placeholder="Viết phản hồi..."></div>
                <div class="reply-buttons-container">
                    <button class="reply-add-image-btn" onclick="document.getElementById('image-input-${r.CommentID}').click()">
                        <span class="material-icons" style="font-size:18px;">image</span>
                    </button>
                    <button class="reply-send-btn" onclick="submitReply(${r.PostID}, ${r.CommentID})">
                        <span class="material-icons">send</span>
                    </button>
                </div>
            </div>
            <div class="reply-image-preview-container" id="reply-preview-${r.CommentID}" style="display:none;"></div>
            <input type="file" class="comment-image-input" id="image-input-${r.CommentID}" accept="image/*" style="display:none;">
        </div>
    `;

    // 🟢 THAY ĐỔI: Thêm class "reply-level" cho reply của comment con
    return `
    <div class="comment-item reply-level" 
         id="comment-${r.CommentID}" 
         data-user-id="${userId}" 
         data-username="${username}"
         data-fullname="${name}"
         data-is-banned="${isCommentBanned ? 1 : 0}"
         data-ban-reason="${escapeHtml(banReason)}"
         data-ban-duration="${banDuration}"
         data-has-image="${hasImageValue ? 1 : 0}"
         data-image-url="${r.ImageURL || ''}">
        
        <div class="comment-avatar" onclick="openUserProfileById(${userId})">
            ${avatarUrl ? `
                <img class="comment-avatar-img"
                     src="${avatarUrl}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
            <div class="avatar-circle" style="${avatarUrl ? "display:none;" : ""}">
                ${avatarText}
            </div>
        </div>

        <div class="comment-body">
            <div class="comment-bubble">
               <div class="comment-name" onclick="openUserProfileById(${userId})">
                    ${nameWithBadge}
                </div>
                <div class="comment-text">${contentHTML}</div>
                
                <!-- 🟢 THÊM PHẦN HIỂN THỊ ẢNH CHO REPLY (GIỐNG COMMENT) -->
                ${imageHTML}
            </div>
            
            ${replyMenuHtml}

            <div class="comment-footer">
                <div class="comment-meta">
                    <span class="comment-time">${escapeHtml(ctime)}</span>

                    <div class="cmt-like-wrap">
                        <span class="cmt-action cmt-action-like ${userReact ? 'active' : ''}"
                              style="${userReact ? `color:${reactColorMap[userReact] || '#2078f4'}` : ''}"
                              onmouseenter="openCommentReactionPicker(${r.CommentID}, event)"
                              onclick="toggleCommentReaction(${r.CommentID}, 'like')">
                            ${userReact ? (reactTextMap[userReact] || 'Thích') : "Thích"}
                        </span>

                        <div class="cmt-react-picker"
                             id="cmt-react-picker-${r.CommentID}"
                             onmouseleave="closeCommentReactionPicker(${r.CommentID})">
                             ${['like','love','care','haha','wow','sad','angry'].map(type => `
                                <button class="cmt-react-emoji"
                                        onclick="event.stopPropagation(); chooseCommentReaction(${r.CommentID}, '${type}')">
                                    <img src="${BASE_URL}/assets/images/${type}.png">
                                </button>
                             `).join("")}
                        </div>
                    </div>

                    <!-- 🟢 SỬA NÚT "Trả lời" ĐỂ CHỈ MỞ 1 REPLY BOX -->
                    <span class="cmt-action reply-btn"
                          data-comment-id="${r.CommentID}"
                          onclick="openSingleReplyBox(${r.CommentID}, ${r.PostID})">
                        Trả lời
                    </span>
                </div>

                <div class="comment-react-right" id="cmt-react-${r.CommentID}">
                    ${reactIconsHtml}
                    ${total > 0 ? `<span class="react-total">${total}</span>` : ""}
                </div>
            </div>

            ${replyCount > 0 ? `
                <div class="view-replies" onclick="if(window.loadReplies)window.loadReplies(${r.CommentID})">
                    Xem ${replyCount} phản hồi
                </div>
            ` : ""}

            <div class="reply-list"></div>

            <!-- 🟢 REPLY BOX VỚI CHỨC NĂNG UPLOAD ẢNH - ĐẶT ĐÚNG VỊ TRÍ -->
            ${replyBoxHtml}
        </div>
    </div>`;
}

// ===== EVENT LISTENER CHO NÚT TRẢ LỜI CỦA REPLY =====
document.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào nút "Trả lời" trong reply list
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn && replyBtn.textContent.includes('Trả lời')) {
        e.preventDefault();
        e.stopPropagation();
        
        const commentId = replyBtn.getAttribute('data-comment-id');
        const postElement = replyBtn.closest('[data-post-id]');
        const postId = postElement ? postElement.getAttribute('data-post-id') : null;
        
        if (commentId && postId) {
            openSingleReplyBox(commentId, postId);
        }
    }
    
    // Đóng reply box khi click ra ngoài
    if (!e.target.closest('.reply-box') && 
        !e.target.closest('.reply-btn') &&
        !e.target.closest('.cmt-action')) {
        document.querySelectorAll('.reply-box').forEach(box => {
            box.style.display = 'none';
            box.classList.remove('active');
        });
    }
});
/* =======================
   6. POPUP DANH SÁCH NGƯỜI REACT (COMMENT)
======================= */
async function openCommentReactionUserModal(commentId, typeClicked = "all") {
    const popup = document.getElementById("fb-reaction-popup");
    const tabWrap = document.getElementById("fb-reaction-tabs");
    const listWrap = document.getElementById("fb-reaction-list");

    popup.classList.add("show");
    tabWrap.innerHTML = "Đang tải...";
    listWrap.innerHTML = "";

    const res = await fetch(`/HeThongChamSocCaKoi/backend/api/community/comment_reactions/list.php?comment_id=${commentId}&all=1`);
    const data = await res.json();

    if (!data || !data.summary) {
        tabWrap.innerHTML = "<p>Lỗi tải dữ liệu</p>";
        return;
    }

    const icons = {
        like: "/HeThongChamSocCaKoi/assets/images/like.png",
        love: "/HeThongChamSocCaKoi/assets/images/love.png",
        care: "/HeThongChamSocCaKoi/assets/images/care.png",
        haha: "/HeThongChamSocCaKoi/assets/images/haha.png",
        wow: "/HeThongChamSocCaKoi/assets/images/wow.png",
        sad: "/HeThongChamSocCaKoi/assets/images/sad.png",
        angry: "/HeThongChamSocCaKoi/assets/images/angry.png"
    };

    let tabs = [];

    tabs.push({
        key: "all",
        label: "Tất cả",
        icon: null,
    });

    for (let key of Object.keys(data.summary)) {
        if (data.summary[key] > 0) {
            tabs.push({
                key,
                label: data.summary[key],
                icon: icons[key],
            });
        }
    }

    tabWrap.innerHTML = tabs
        .map(
            (t) => `
        <div class="fb-tab ${t.key === typeClicked ? "active" : ""}"
             onclick="loadCommentReactionTab(${commentId}, '${t.key}')">
            ${t.icon ? `<img src="${t.icon}">` : ""}
            ${t.label}
        </div>
    `
        )
        .join("");

    loadCommentReactionTab(commentId, typeClicked);
}
async function loadCommentReactionTab(commentId, type) {
    const listWrap = document.getElementById("fb-reaction-list");
    const allTabs  = document.querySelectorAll(".fb-tab");

    allTabs.forEach((t) => t.classList.remove("active"));
    document.querySelector(`.fb-tab[onclick="loadCommentReactionTab(${commentId}, '${type}')"]`)
        ?.classList.add("active");

    listWrap.innerHTML = "Đang tải...";

    const res  = await fetch(`/HeThongChamSocCaKoi/backend/api/community/comment_reactions/list.php?comment_id=${commentId}&type=${type}`);
    const data = await res.json();

    if (!data.users.length) {
        listWrap.innerHTML = "<p>Không có ai</p>";
        return;
    }

    const iconMap = {
        like:  "/HeThongChamSocCaKoi/assets/images/like.png",
        love:  "/HeThongChamSocCaKoi/assets/images/love.png",
        care:  "/HeThongChamSocCaKoi/assets/images/care.png",
        haha:  "/HeThongChamSocCaKoi/assets/images/haha.png",
        wow:   "/HeThongChamSocCaKoi/assets/images/wow.png",
        sad:   "/HeThongChamSocCaKoi/assets/images/sad.png",
        angry: "/HeThongChamSocCaKoi/assets/images/angry.png"
    };

    listWrap.innerHTML = data.users.map((u) => {
        const name = displayName(u);
        const avatar = buildAvatarURL(u);
        const reactIcon = iconMap[u.Type] || "";
        
        // 🟢 QUAN TRỌNG: Kiểm tra nếu là chính người dùng hiện tại
        const isCurrentUser = u.UserID == window.CURRENT_USER_ID;

        return `
        <div class="fb-user-item">
            <div class="fb-avatar-wrap" onclick="openUserProfile('${u.Username}')">
                ${
                    avatar
                        ? `<img class="fb-user-avatar" src="${avatar}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : `<div class="avatar-letter">${(name[0] || "?").toUpperCase()}</div>`
                }
                <img class="fb-react-icon" src="${reactIcon}">
            </div>

            <div class="fb-user-info" onclick="openUserProfile('${u.Username}')">
                <span class="fb-user-name">${escapeHtml(name)}</span>
            </div>

            <!-- 🟢 Ẩn nút Theo dõi nếu là chính mình -->
            ${!isCurrentUser ? `
                <button class="follow-btn ${u.IsFollowing ? 'following' : ''}" 
                        id="follow-btn-${u.UserID}" 
                        onclick="event.stopPropagation(); toggleFollowInPopup(${u.UserID})">
                    ${u.IsFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </button>
            ` : `
                <!-- Hiển thị badge "Bạn" thay thế -->
                <div class="current-user-badge" style="color: #666; font-size: 12px; padding: 5px 10px;">
                    Bạn
                </div>
            `}
        </div>`;
    }).join("");
}

async function toggleFollowInPopup(userId) {
    const btn = document.getElementById(`follow-btn-${userId}`);
    if (!btn) return;

    try {
        btn.disabled = true;

        const res = await fetch(`${BASE_URL}/backend/api/community/follow/toggle.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `target_id=${encodeURIComponent(userId)}`
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Lỗi theo dõi.");

        // Cập nhật lại nút theo dõi
        if (data.isFollowing) {
            btn.classList.add("following");
            btn.textContent = "Đang theo dõi";
        } else {
            btn.classList.remove("following");
            btn.textContent = "Theo dõi";
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
    }
}
function cleanCommentContent(html) {
    if (!html) return '';
    
    console.log("🔍 cleanCommentContent INPUT:", html);
    
    // Tạo element tạm
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Loại bỏ script nguy hiểm
    const scripts = tempDiv.querySelectorAll('script, style, iframe, object, embed');
    scripts.forEach(el => el.remove());
    
    // 🟢 FIX: Xử lý các tag mention - đảm bảo onclick đúng
   // SỬA LẠI THÀNH:
    const mentions = tempDiv.querySelectorAll('.user-mention, .clickable-mention');
    mentions.forEach(mention => {
        const mentionUserId = mention.getAttribute('data-user-id');
        if (mentionUserId) {
            mention.setAttribute('onclick', 
                `openUserProfileById(${mentionUserId}); event.stopPropagation();`
            );
            
            // Đảm bảo có style đúng
            if (!mention.hasAttribute('style')) {
                mention.setAttribute('style', 
                    'color: #1877f2; font-weight: 600; cursor: pointer; text-decoration: none;'
                );
            }
        }
    });
        
    const cleaned = tempDiv.innerHTML;
    console.log("🔍 cleanCommentContent OUTPUT:", cleaned);
    
    return cleaned;
}
(function() {
if (typeof window !== 'undefined') {
    // Export các hàm từ file này
    window.showReplyBox = showReplyBox;
    window.loadReplies = loadReplies;
    window.submitReply = submitReply;
    window.toggleCommentReaction = toggleCommentReaction;
    window.openCommentReactionPicker = openCommentReactionPicker;
    window.closeCommentReactionPicker = closeCommentReactionPicker;
    window.chooseCommentReaction = chooseCommentReaction;
    window.openCommentReactionUserModal = openCommentReactionUserModal;
    window.loadCommentReactionTab = loadCommentReactionTab;
    window.toggleFollowInPopup = toggleFollowInPopup;
    window.cleanCommentContent = cleanCommentContent;
    
    // Các hàm đã có trong community-main.js, chỉ export nếu chưa có
    if (!window.displayName) window.displayName = displayName;
    if (!window.buildAvatarURL) window.buildAvatarURL = buildAvatarURL;
    
    console.log('✅ Comment functions exported to global scope');
}
})();
// Cập nhật hàm toggleCommentMenu - THÊM TÍNH NĂNG TÍNH TOÁN VỊ TRÍ
function toggleCommentMenu(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('🟡 Toggling menu for comment:', commentId);
    
    // Đóng tất cả menu khác
    document.querySelectorAll('.comment-menu-dropdown.show')
        .forEach(menu => {
            if (menu.id !== `comment-menu-${commentId}`) {
                menu.classList.remove('show');
            }
        });
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    const menu = document.getElementById(`comment-menu-${commentId}`);
    
    if (!menu || !commentElement) {
        console.error('❌ Menu or comment element not found');
        return;
    }
    
    const isOpening = !menu.classList.contains('show');
    
    // Đóng menu cũ
    if (!isOpening) {
        menu.classList.remove('show');
        commentElement.classList.remove('menu-open');
        return;
    }
    
    // Mở menu mới
    menu.classList.add('show');
    commentElement.classList.add('menu-open');
    
    // Tính toán vị trí để không bị che
    setTimeout(() => {
        const menuRect = menu.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        console.log('📐 Menu dimensions:', {
            top: menuRect.top,
            bottom: menuRect.bottom,
            height: menuRect.height,
            viewportHeight,
            viewportWidth
        });
        
        // Nếu menu bị che ở dưới (vượt quá viewport)
        if (menuRect.bottom > viewportHeight - 10) {
            console.log('🔼 Menu will be hidden below viewport, moving up');
            
            // Đẩy menu lên trên
            menu.classList.add('above');
            
            // Tính toán lại vị trí
            const newBottom = viewportHeight - menuRect.top + menuRect.height;
            if (newBottom > viewportHeight) {
                // Nếu vẫn bị che, di chuyển sang trái/phải
                if (menuRect.left > viewportWidth / 2) {
                    menu.style.right = 'auto';
                    menu.style.left = '0';
                } else {
                    menu.style.left = 'auto';
                    menu.style.right = '0';
                }
            }
        } else {
            menu.classList.remove('above');
        }
        
        // Nếu menu bị che bên phải
        if (menuRect.right > viewportWidth - 10) {
            console.log('⬅️ Menu will be hidden on right side, moving left');
            menu.style.right = 'auto';
            menu.style.left = '0';
        }
        
    }, 10); // Delay để menu render xong
    
    // Đóng menu khi click ra ngoài
    setTimeout(() => {
        const closeMenuHandler = function(e) {
            if (!menu.contains(e.target) && 
                !e.target.closest('.comment-menu-btn') &&
                !e.target.closest(`#comment-menu-${commentId}`)) {
                
                menu.classList.remove('show');
                commentElement.classList.remove('menu-open');
                document.removeEventListener('click', closeMenuHandler);
            }
        };
        
        // Thêm event listener với delay để không bị đóng ngay lập tức
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 100);
    }, 10);
    
    console.log('✅ Menu toggled');
}
// 🟢 HÀM CHỈNH SỬA COMMENT VỚI GIAO DIỆN ĐẸP HƠN
function editComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    // Đóng menu trước
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.remove('show');
    
    const commentTextElement = commentElement.querySelector('.comment-text');
    const commentImageContainer = commentElement.querySelector('.comment-image-container');
    
    // 🟢 LẤY NỘI DUNG VÀ ẢNH HIỆN TẠI
    let currentHTML = commentTextElement.innerHTML;
    let currentImageUrl = null;
    let hasCurrentImage = false;
    
    if (commentImageContainer) {
        const img = commentImageContainer.querySelector('img');
        if (img) {
            currentImageUrl = img.src;
            hasCurrentImage = true;
        }
    }
    
    // 🟢 CHUYỂN <br> THÀNH \n
    let plainText = currentHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<br>/gi, '\n');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = plainText;
    plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Kiểm tra nếu đang chỉnh sửa rồi
    if (commentElement.querySelector('.comment-edit-box')) return;
    
    // 🟢 TẠO EDIT BOX ĐẸP HƠN
    const editBoxHTML = `
        <div class="comment-edit-box" id="comment-edit-${commentId}">
            <div class="edit-box-header">
                <span class="edit-icon">
                    <span class="material-icons">edit</span>
                </span>
                <h4 class="edit-title">Chỉnh sửa bình luận</h4>
                <button class="edit-close-btn" onclick="cancelCommentEditSimple(${commentId}, event)">
                    <span class="material-icons">close</span>
                </button>
            </div>
            
            <div class="edit-box-body">
                <div class="edit-input-wrapper">
                    <textarea class="comment-edit-input" 
                              placeholder="Nhập nội dung chỉnh sửa..."
                              rows="4">${plainText}</textarea>
                    <div class="edit-char-counter">
                        <span id="char-count-${commentId}">${plainText.length}</span>/2000
                    </div>
                </div>
                
                <div class="edit-image-section">
                    <div class="edit-image-preview" id="edit-preview-${commentId}">
                        ${hasCurrentImage ? `
                            <div class="current-image-preview">
                                <div class="preview-header">
                                    <span class="preview-label">Ảnh hiện tại</span>
                                    <button type="button" class="remove-preview-btn" onclick="removeEditImage(${commentId})">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </div>
                                <div class="image-wrapper">
                                    <img src="${currentImageUrl}" alt="Ảnh hiện tại" 
                                         onclick="openSimpleImagePreview('${currentImageUrl}')">
                                    <div class="image-overlay">
                                        <span class="material-icons">zoom_in</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="edit-image-actions">
                        <label class="add-image-btn" for="edit-image-input-${commentId}">
                            <span class="material-icons">add_photo_alternate</span>
                            <span class="btn-text">Thêm ảnh mới</span>
                        </label>
                        ${hasCurrentImage ? `
                            <button class="remove-image-btn" onclick="removeEditImage(${commentId})">
                                <span class="material-icons">delete</span>
                                <span class="btn-text">Xóa ảnh</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="edit-box-footer">
                <div class="edit-tips">
                    <span class="material-icons" style="font-size:16px;">info</span>
                    <span>Kích thước ảnh tối đa: 5MB. Định dạng: JPG, PNG, GIF, WebP</span>
                </div>
                
                <div class="edit-buttons">
                    <button class="edit-cancel-btn" onclick="cancelCommentEditSimple(${commentId}, event)">
                        <span class="material-icons">cancel</span>
                        Hủy
                    </button>
                    <button class="edit-save-btn" onclick="saveCommentEditSimple(${commentId}, event)">
                        <span class="material-icons">check_circle</span>
                        Lưu thay đổi
                    </button>
                </div>
            </div>
            
            <input type="file" 
                   class="edit-image-input" 
                   id="edit-image-input-${commentId}" 
                   accept="image/*" 
                   style="display:none;"
                   onchange="handleEditImageUpload(${commentId}, this)">
        </div>
    `;
    
    // Ẩn nội dung cũ
    commentTextElement.style.display = 'none';
    if (commentImageContainer) {
        commentImageContainer.style.display = 'none';
    }
    
    // Thêm edit box vào DOM
    commentTextElement.insertAdjacentHTML('afterend', editBoxHTML);
    
    // Focus vào textarea và đếm ký tự
    setTimeout(() => {
        const textarea = document.querySelector(`#comment-edit-${commentId} textarea`);
        if (textarea) {
            textarea.focus();
            textarea.select();
            
            // Đếm ký tự
            textarea.addEventListener('input', function() {
                const charCount = this.value.length;
                document.getElementById(`char-count-${commentId}`).textContent = charCount;
                
                // Đổi màu khi gần giới hạn
                const charCounter = this.parentElement.querySelector('.edit-char-counter');
                if (charCount > 1800) {
                    charCounter.style.color = '#ff9800';
                } else if (charCount > 1900) {
                    charCounter.style.color = '#f44336';
                } else {
                    charCounter.style.color = '#666';
                }
            });
        }
    }, 10);
}
// 🟢 HÀM UPLOAD ẢNH KHI CHỈNH SỬA
function handleEditImageUpload(commentId, input) {
    console.log('🟡 Uploading image for edit:', commentId);
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Kiểm tra kích thước (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Kích thước ảnh tối đa 5MB');
            input.value = '';
            return;
        }
        
        // Kiểm tra loại file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
            input.value = '';
            return;
        }
        
        // Hiển thị preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById(`edit-preview-${commentId}`);
            if (previewContainer) {
                const imageUrl = e.target.result;
                
                // Xóa preview cũ nếu có
                previewContainer.innerHTML = '';
                
                // Thêm preview mới với animation
                previewContainer.innerHTML = `
                    <div class="comment-edit-preview new-image-preview" id="new-image-${commentId}">
                        <div class="edit-image-wrapper" onclick="openSimpleImagePreview('${imageUrl}')">
                            <img src="${imageUrl}" alt="Ảnh mới" style="max-width: 150px; max-height: 150px;">
                            <div class="edit-image-hover">
                                <span class="material-icons">zoom_in</span>
                            </div>
                        </div>
                        <button type="button" class="remove-edit-image" onclick="removeEditImage(${commentId})">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                `;
                
                // Thêm animation
                const newPreview = previewContainer.querySelector('.new-image-preview');
                if (newPreview) {
                    newPreview.style.animation = 'fadeIn 0.3s ease';
                }
                
                console.log('✅ New image preview displayed');
            }
        };
        reader.readAsDataURL(file);
        
        console.log('✅ New image selected for edit:', file.name);
    }
}
const editImagePreviewCSS = `
    /* Edit image preview styles */
    .comment-edit-preview {
        position: relative;
        margin-top: 10px;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 8px;
        border: 1px dashed #ddd;
    }
    
    .edit-image-wrapper {
        width: 150px;
        height: 150px;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        border: 2px solid #e0e0e0;
    }
    
    .edit-image-wrapper:hover {
        border-color: #2196f3;
    }
    
    .edit-image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .edit-image-hover {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .edit-image-wrapper:hover .edit-image-hover {
        opacity: 1;
    }
    
    .edit-image-hover .material-icons {
        color: white;
        font-size: 28px;
    }
    
    .remove-edit-image {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 28px;
        height: 28px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        z-index: 10;
        padding: 0;
        transition: all 0.2s ease;
    }
    
    .remove-edit-image:hover {
        background: #d32f2f;
        transform: scale(1.1);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
`;

// Thêm CSS vào head
if (!document.getElementById('edit-image-preview-css')) {
    const style = document.createElement('style');
    style.id = 'edit-image-preview-css';
    style.textContent = editImagePreviewCSS;
    document.head.appendChild(style);
}
// 🟢 HÀM XÓA ẢNH PREVIEW
function removeEditImage(commentId) {
    const previewContainer = document.getElementById(`edit-preview-${commentId}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
        console.log('🗑️ Image removed from edit');
    }
    
    // Reset file input
    const fileInput = document.getElementById(`edit-image-input-${commentId}`);
    if (fileInput) {
        fileInput.value = '';
    }
}
// 🟢 HÀM LƯU CHỈNH SỬA ĐƠN GIẢN - FIX XỬ LÝ ẢNH
async function saveCommentEditSimple(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    const editBox = document.getElementById(`comment-edit-${commentId}`);
    const textarea = editBox.querySelector('.comment-edit-input');
    const commentTextElement = commentElement.querySelector('.comment-text');
    const commentImageContainer = commentElement.querySelector('.comment-image-container');
    
    if (!textarea) return;
    
    let newContent = textarea.value.trim();
    if (!newContent) {
        alert('Vui lòng nhập nội dung');
        textarea.focus();
        return;
    }
    
    try {
        // 🟢 TẠO FORMDATA VỚI ĐẦY ĐỦ THÔNG TIN
        const formData = new FormData();
        formData.append('comment_id', commentId);
        formData.append('content', newContent.replace(/\n/g, '<br>'));
        
        // 🟢 KIỂM TRA TRẠNG THÁI ẢNH
        const fileInput = document.getElementById(`edit-image-input-${commentId}`);
        const previewContainer = document.getElementById(`edit-preview-${commentId}`);
        
        const hasNewImage = fileInput && fileInput.files && fileInput.files.length > 0;
        const hasPreview = previewContainer && previewContainer.innerHTML.trim() !== '';
        
        console.log('🟡 Edit image status:', { 
            hasNewImage, 
            hasPreview,
            fileExists: fileInput?.files[0]?.name || 'none'
        });
        
        // 🟢 XỬ LÝ ẢNH THEO 3 TRƯỜNG HỢP
        if (hasNewImage) {
            // 1. CÓ ẢNH MỚI - thêm vào formData
            formData.append('image', fileInput.files[0]);
            formData.append('image_action', 'replace');
            console.log('📤 Adding new image to edit');
            
        } else if (!hasPreview) {
            // 2. ĐÃ XÓA ẢNH GỐC - gửi thông tin xóa
            formData.append('image_action', 'remove');
            console.log('🗑️ Removing image from edit');
            
        } else {
            // 3. GIỮ NGUYÊN ẢNH CŨ - gửi thông tin giữ nguyên
            formData.append('image_action', 'keep');
            console.log('💾 Keeping original image');
        }
        
        // 🟢 DEBUG FORMDATA
        console.log('🟡 FormData entries for edit:');
        for (let [key, value] of formData.entries()) {
            if (key === 'image') {
                console.log(`${key}:`, value.name || 'File object');
            } else {
                console.log(`${key}:`, value);
            }
        }
        
        // 🟢 HIỂN THỊ LOADING (FIXED)
        const saveBtn = editBox.querySelector('.comment-edit-send');
        let originalHTML = ''; // 🟢 ĐẶT BIẾN Ở ĐÂY
        if (saveBtn) {
            originalHTML = saveBtn.innerHTML; // 🟢 LƯU HTML GỐC
            saveBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">refresh</span>';
            saveBtn.disabled = true;
        }
        
        // 🟢 GỬI REQUEST ĐẾN API UPDATE VỚI ẢNH
        console.log('🟡 Sending edit request to:', `${BASE_URL}/backend/api/community/comments/update.php`);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/update.php`, {
            method: "POST",
            body: formData
        });
        
        console.log('🟡 Edit response status:', res.status, res.statusText);
        
        // Đọc response text
        const responseText = await res.text();
        console.log('🟡 Raw edit response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('🟢 Parsed edit response:', data);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('❌ Raw response text:', responseText);
            throw new Error('Server trả về dữ liệu không hợp lệ');
        }
        
        // 🟢 DEBUG CHI TIẾT PHẢN HỒI
        console.log('🔍 Detailed edit response:', {
            success: data.success,
            hasImageUrl: !!data.image_url,
            image_url: data.image_url,
            hasCommentImage: !!(data.comment && data.comment.ImageURL),
            commentImage: data.comment?.ImageURL,
            image_removed: data.image_removed,
            fullData: data
        });
        
        if (!data.success) {
            throw new Error(data.error || 'Không thể cập nhật');
        }
        
        // 🟢 CẬP NHẬT GIAO DIỆN DỰA TRÊN KẾT QUẢ TỪ SERVER
        commentTextElement.innerHTML = newContent.replace(/\n/g, '<br>');
        commentTextElement.style.display = 'block';
        
        // 🟢 HÀM FIX URL ẢNH
        function fixImageUrlForDisplay(url) {
            console.log("🛠️ Fixing image URL:", url);
            
            if (!url) return '';
            
            // Nếu đã là URL đầy đủ
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            
            // Nếu bắt đầu bằng 'uploads/comments/' (không có / ở đầu)
            if (url.startsWith('uploads/comments/')) {
                return BASE_URL + '/' + url;
            }
            
            // Nếu bắt đầu bằng '/uploads/comments/' (có / ở đầu)
            if (url.startsWith('/uploads/comments/')) {
                return BASE_URL + url;
            }
            
            // Nếu chỉ là tên file
            if (!url.includes('/')) {
                return BASE_URL + '/uploads/comments/' + url;
            }
            
            // Mặc định
            return BASE_URL + '/' + url;
        }
        
        // 🟢 XỬ LÝ ẢNH THEO PHẢN HỒI TỪ SERVER
        if (data.image_url || (data.comment && data.comment.ImageURL)) {
            // CÓ ẢNH MỚI HOẶC ẢNH ĐƯỢC GIỮ LẠI
            let rawImageUrl = data.image_url || data.comment.ImageURL;
            
            // 🟢 SỬ DỤNG HÀM FIX URL
            let imageUrl = fixImageUrlForDisplay(rawImageUrl);
            console.log("✅ Final image URL (fixed):", imageUrl);
            
            // 🟢 THÊM TIMESTAMP ĐỂ TRÁNH CACHE
            const timestamp = new Date().getTime();
            const imageUrlWithTimestamp = `${imageUrl}?t=${timestamp}`;
            
            // Tạo HTML cho ảnh mới
            const newImageHTML = `
                <div class="comment-image-container" id="comment-image-${commentId}">
                    <div class="comment-image" onclick="openSimpleImagePreview('${imageUrlWithTimestamp}')">
                        <img src="${imageUrlWithTimestamp}" 
                             alt="Ảnh đính kèm" 
                             loading="lazy"
                             onload="console.log('✅ Image loaded successfully:', this.src)"
                             onerror="
                                console.error('❌ Image load failed:', this.src);
                                this.style.display='none';
                                this.parentElement.innerHTML = '<div style=\'color:#f44336;padding:10px;background:#ffebee;border-radius:8px;\'>Không thể tải ảnh</div>';
                             ">
                    </div>
                </div>
            `;
            
            if (commentImageContainer) {
                // Thay thế ảnh cũ
                commentImageContainer.outerHTML = newImageHTML;
            } else {
                // Thêm ảnh mới
                commentTextElement.insertAdjacentHTML('afterend', newImageHTML);
            }
            
            // 🟢 KIỂM TRA NGAY LẬP TỨC NẾU ẢNH LOAD
            setTimeout(() => {
                const newImage = document.querySelector(`#comment-image-${commentId} img`);
                if (newImage) {
                    console.log('🔄 Checking image load status:', {
                        src: newImage.src,
                        complete: newImage.complete,
                        naturalWidth: newImage.naturalWidth,
                        naturalHeight: newImage.naturalHeight
                    });
                    
                    if (!newImage.complete || newImage.naturalWidth === 0) {
                        console.warn('⚠️ Image may not load properly, trying alternative URL');
                        // Thử URL không có timestamp
                        newImage.src = imageUrl + '?t=' + new Date().getTime();
                    }
                }
            }, 100);
            
            console.log('✅ Image updated in UI with timestamp:', imageUrlWithTimestamp);
            
        } else if (data.image_removed) {
            // ĐÃ XÓA ẢNH
            if (commentImageContainer) {
                commentImageContainer.remove();
            }
            console.log('✅ Image removed from UI');
            
        } else {
            // GIỮ NGUYÊN ẢNH CŨ
            if (commentImageContainer) {
                commentImageContainer.style.display = 'block';
                
                // 🟢 THÊM TIMESTAMP ĐỂ TRÁNH CACHE CHO ẢNH CŨ
                const oldImg = commentImageContainer.querySelector('img');
                if (oldImg) {
                    const timestamp = new Date().getTime();
                    const oldSrc = oldImg.src.split('?')[0];
                    oldImg.src = oldSrc + '?t=' + timestamp;
                    console.log('🔄 Added timestamp to old image:', oldImg.src);
                }
            }
            console.log('✅ Image kept unchanged');
        }
        
        // 🟢 XÓA EDIT BOX
        editBox.remove();
        
        // 🟢 THÔNG BÁO THÀNH CÔNG
        showToast('✅ Đã cập nhật bình luận thành công');
        console.log('✅ Edit successful');
        
    } catch (err) {
        console.error("❌ Lỗi chỉnh sửa:", err);
        showToast('❌ Lỗi: ' + err.message, 'error');
        
        // 🟢 FIX: KHÔI PHỤC NÚT (FIXED)
        const saveBtn = editBox?.querySelector('.comment-edit-send');
        if (saveBtn && originalHTML) { // 🟢 KIỂM TRA originalHTML TỒN TẠI
            saveBtn.innerHTML = originalHTML;
            saveBtn.disabled = false;
        }
    }
}

// 🟢 HÀM HỦY CHỈNH SỬA ĐƠN GIẢN
function cancelCommentEditSimple(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    const editBox = document.getElementById(`comment-edit-${commentId}`);
    const commentTextElement = commentElement.querySelector('.comment-text');
    const commentImageContainer = commentElement.querySelector('.comment-image-container');
    
    // Hiện lại nội dung cũ
    if (commentTextElement) commentTextElement.style.display = 'block';
    if (commentImageContainer) commentImageContainer.style.display = 'block';
    
    // Xóa edit box
    if (editBox) editBox.remove();
    
    showToast('Đã hủy chỉnh sửa', 'info');
}
// Xóa comment với animation - XÓA NGAY KHÔNG CẦN CONFIRM
async function deleteComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log(`🟡 Deleting comment ${commentId}...`);
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    // Tìm post chứa comment
    const postElement = commentElement.closest('.community-post');
    
    // 🟢 LẤY SỐ BÌNH LUẬN HIỆN TẠI
    let commentCountElement = null;
    let currentCount = 0;
    
    if (postElement) {
        commentCountElement = postElement.querySelector('.comment-count');
        if (commentCountElement) {
            const currentText = commentCountElement.textContent;
            console.log('🟡 Current comment text:', currentText);
            
            // Lấy số từ "4 bình luận"
            const match = currentText.match(/(\d+)/);
            if (match) {
                currentCount = parseInt(match[1]);
                console.log('🟡 Current count:', currentCount);
            }
        }
    }
    
    // 🟢 ANIMATION XÓA
    commentElement.style.opacity = '0.5';
    commentElement.style.transform = 'translateX(20px)';
    commentElement.style.transition = 'all 0.2s ease';
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/delete.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: `comment_id=${commentId}`
        });
        
        const data = await res.json();
        console.log('🟢 Delete API response:', data);
        
        if (!data.success) {
            // Nếu xóa thất bại
            commentElement.style.opacity = '1';
            commentElement.style.transform = 'translateX(0)';
            console.error('❌ Delete failed:', data.error);
            return;
        }
        
        // 🟢 XÓA SAU 200ms
        setTimeout(() => {
            // Xóa comment khỏi DOM
            commentElement.remove();
            console.log('✅ Comment removed');
            
            // 🟢 CẬP NHẬT SỐ "4 bình luận"
            if (commentCountElement && currentCount > 0) {
                const newCount = currentCount - 1;
                
                if (newCount > 0) {
                    commentCountElement.textContent = `${newCount} bình luận`;
                    console.log(`✅ Updated to: ${newCount} bình luận`);
                } else {
                    commentCountElement.textContent = '0 bình luận';
                    console.log('✅ Updated to: 0 bình luận');
                    
                    // Nếu đang mở khung comment
                    const commentsWrapper = postElement.querySelector('.comments-wrapper');
                    if (commentsWrapper && commentsWrapper.style.display !== 'none') {
                        const commentList = commentsWrapper.querySelector('.comment-list');
                        if (commentList) {
                            commentList.innerHTML = '<p class="comment-loading">Chưa có bình luận nào</p>';
                        }
                    }
                }
                
                // 🟢 THÊM HIỆU ỨNG
                commentCountElement.style.color = '#1877f2';
                commentCountElement.style.transform = 'scale(1.1)';
                
                setTimeout(() => {
                    commentCountElement.style.color = '';
                    commentCountElement.style.transform = '';
                }, 300);
            }
        }, 200);
        
    } catch (err) {
        commentElement.style.opacity = '1';
        commentElement.style.transform = 'translateX(0)';
        console.error("❌ Lỗi xóa comment:", err);
    }
}
function updateCommentCount(postId, increment = 1) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;
    
    const commentCountElement = postElement.querySelector('.comment-count');
    if (commentCountElement) {
        const currentText = commentCountElement.textContent;
        const match = currentText.match(/\d+/);
        
        if (match) {
            const currentCount = parseInt(match[0]);
            const newCount = currentCount + increment;
            commentCountElement.textContent = `${newCount} bình luận`;
        } else {
            // Nếu chưa có số, thêm mới
            commentCountElement.textContent = `${increment} bình luận`;
        }
    }
}
// Hàm cập nhật số lượng comment trên post
function updateCommentCountOnPost(commentElement) {
    const postElement = commentElement.closest('.community-post');
    if (!postElement) return;
    
    const commentCountElement = postElement.querySelector('.comment-count');
    if (commentCountElement) {
        const currentText = commentCountElement.textContent;
        const match = currentText.match(/\d+/);
        if (match) {
            const currentCount = parseInt(match[0]);
            if (currentCount > 1) {
                commentCountElement.textContent = `${currentCount - 1} bình luận`;
            } else if (currentCount === 1) {
                // Nếu xóa comment cuối cùng, ẩn phần bình luận
                commentCountElement.textContent = '0 bình luận';
                // Hoặc xóa luôn phần hiển thị số comment
                // commentCountElement.remove();
            }
        }
    }
}
// Ngăn đóng menu khi click vào menu
document.addEventListener('click', function(e) {
    if (e.target.closest('.comment-menu-dropdown')) {
        e.stopPropagation();
    }
});
// 🟢 HÀM LƯU CHỈNH SỬA - THÊM DEBUG
async function saveCommentEdit(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log('🟡 [DEBUG] Starting saveCommentEdit for comment:', commentId);
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) {
        console.error('❌ Comment element not found');
        return;
    }
    
    const editBox = document.getElementById(`comment-edit-${commentId}`);
    const textarea = editBox?.querySelector('.comment-edit-input');
    const fileInput = document.getElementById(`edit-image-input-${commentId}`);
    
    if (!textarea) {
        console.error('❌ Textarea not found');
        return;
    }
    
    let newContent = textarea.value.trim();
    console.log('🟡 [DEBUG] Content:', newContent);
    
    if (!newContent) {
        alert('Vui lòng nhập nội dung');
        textarea.focus();
        return;
    }
    
    try {
        // 🟢 TẠO FORMDATA
        const formData = new FormData();
        formData.append('comment_id', commentId);
        formData.append('content', newContent.replace(/\n/g, '<br>'));
        
        // 🟢 KIỂM TRA TRẠNG THÁI ẢNH
        const state = window.commentEditState?.[commentId];
        console.log('🟡 [DEBUG] Image state:', state);
        
        const previewContainer = document.getElementById(`edit-preview-${commentId}`);
        const hasPreview = previewContainer && previewContainer.innerHTML.trim() !== '';
        const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
        
        console.log('🟡 [DEBUG] Has preview:', hasPreview);
        console.log('🟡 [DEBUG] Has file:', hasFile);
        console.log('🟡 [DEBUG] File input files:', fileInput?.files);
        
        if (hasFile) {
            // 🟢 CÓ ẢNH MỚI
            console.log('📤 [DEBUG] Uploading new image');
            formData.append('image', fileInput.files[0]);
            formData.append('action', 'replace');
            
        } else if (!hasPreview && state?.originalImageUrl) {
            // 🟢 ĐÃ XÓA ẢNH GỐC
            console.log('🗑️ [DEBUG] Removing original image');
            formData.append('action', 'remove');
            
        } else {
            // 🟢 GIỮ NGUYÊN
            console.log('💾 [DEBUG] Keeping original image');
            formData.append('action', 'keep');
        }
        
        // 🟢 DEBUG FORMDATA
        console.log('🟡 [DEBUG] FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key + ':', value);
        }
        
        // 🟢 HIỂN THỊ LOADING
        const saveBtn = editBox.querySelector('.comment-edit-send');
        const originalHTML = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">refresh</span>';
            saveBtn.disabled = true;
        }
        
        // 🟢 GỬI REQUEST
        console.log('🟡 [DEBUG] Sending request to:', `${BASE_URL}/backend/api/community/comments/update.php`);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/update.php`, {
            method: "POST",
            body: formData
        });
        
        console.log('🟡 [DEBUG] Response status:', res.status, res.statusText);
        
        // Đọc response text
        const responseText = await res.text();
        console.log('🟡 [DEBUG] Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('🟢 [DEBUG] Parsed response:', data);
        } catch (parseError) {
            console.error('❌ [DEBUG] JSON parse error:', parseError);
            console.error('❌ [DEBUG] Raw response text:', responseText);
            throw new Error('Server trả về dữ liệu không hợp lệ');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Không thể cập nhật');
        }
        
        // 🟢 CẬP NHẬT GIAO DIỆN
        const commentTextElement = commentElement.querySelector('.comment-text');
        const commentImageContainer = commentElement.querySelector('.comment-image-container');
        
        // Cập nhật nội dung
        commentTextElement.innerHTML = newContent.replace(/\n/g, '<br>');
        commentTextElement.style.display = 'block';
        
        // Cập nhật ảnh
        if (data.comment?.ImageURL && data.comment?.HasImage) {
            // Có ảnh mới
            const newImageHTML = `
                <div class="comment-image-container">
                    <div class="comment-image" onclick="openSimpleImagePreview('${buildCommentImageURL(data.comment.ImageURL)}')">
                        <img src="${buildCommentImageURL(data.comment.ImageURL)}" alt="Ảnh đính kèm" loading="lazy">
                    </div>
                </div>
            `;
            
            if (commentImageContainer) {
                commentImageContainer.outerHTML = newImageHTML;
            } else {
                commentTextElement.insertAdjacentHTML('afterend', newImageHTML);
            }
            console.log('✅ [DEBUG] Image updated');
            
        } else if (data.image_removed) {
            // Đã xóa ảnh
            if (commentImageContainer) {
                commentImageContainer.remove();
            }
            console.log('✅ [DEBUG] Image removed');
            
        } else if (commentImageContainer) {
            // Giữ nguyên ảnh cũ
            commentImageContainer.style.display = 'block';
            console.log('✅ [DEBUG] Image kept');
        }
        
        // 🟢 XÓA EDIT BOX VÀ STATE
        editBox.remove();
        if (window.commentEditState) {
            delete window.commentEditState[commentId];
        }
        
        // 🟢 THÔNG BÁO
        showToast('✅ Đã cập nhật bình luận');
        console.log('✅ [DEBUG] Update successful');
        
    } catch (err) {
        console.error("❌ [DEBUG] Error:", err);
        showToast('❌ Lỗi: ' + err.message, 'error');
        
        // Khôi phục nút
        const saveBtn = editBox?.querySelector('.comment-edit-send');
        if (saveBtn) {
            saveBtn.innerHTML = originalHTML;
            saveBtn.disabled = false;
        }
    }
}
function formatCommentDisplay(content) {
    if (!content) return '';
    
    console.log('🔍 Formatting comment:', content);
    
    // Nếu đã có <br> thì giữ nguyên
    if (content.includes('<br>')) {
        // Đảm bảo <br> được xử lý đúng
        return content.replace(/<br\s*\/?>/gi, '<br>');
    }
    
    // Nếu có \n thì chuyển thành <br>
    if (content.includes('\n')) {
        return content.replace(/\n/g, '<br>');
    }
    
    return content;
}
document.addEventListener('keydown', function(e) {
    // Esc để hủy chỉnh sửa comment
    if (e.key === 'Escape') {
        const editInput = document.querySelector('.comment-edit-input');
        if (editInput) {
            const commentElement = editInput.closest('.comment-item');
            if (commentElement) {
                const commentId = commentElement.id.replace('comment-', '');
                cancelCommentEdit(commentId, e);
            }
        }
    }
});
// Hủy chỉnh sửa
function cancelCommentEdit(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    const editInput = commentElement.querySelector('.comment-edit-input');
    const editControls = commentElement.querySelector('.comment-edit-controls');
    const commentTextElement = commentElement.querySelector('.comment-text');
    
    if (commentTextElement) commentTextElement.style.display = 'block';
    if (editInput) editInput.remove();
    if (editControls) editControls.remove();
}
// Ẩn comment (chỉ ẩn trên giao diện client)
function hideComment(commentId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (commentElement) {
        commentElement.style.display = 'none';
        alert('Đã ẩn bình luận');
    }
}

// Báo cáo comment
function reportComment(commentId) {
    const reason = prompt('Vui lòng nhập lý do báo cáo bình luận này:');
    
    if (reason && reason.trim()) {
        // Gửi báo cáo đến server
        fetch(`${BASE_URL}/backend/api/community/comments/report.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: `comment_id=${commentId}&reason=${encodeURIComponent(reason)}`
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Đã gửi báo cáo bình luận');
            } else {
                alert('Lỗi: ' + (data.error || 'Không thể gửi báo cáo'));
            }
        })
        .catch(err => {
            console.error("Lỗi báo cáo comment:", err);
            alert("Lỗi: " + err.message);
        });
    }
}

// Đóng menu khi click ra ngoài
document.addEventListener('click', function(e) {
    if (!e.target.closest('.comment-menu-btn')) {
        document.querySelectorAll('.comment-menu-dropdown.show')
            .forEach(menu => menu.classList.remove('show'));
    }
});
(function() {
if (typeof window !== 'undefined') {
    // Export các hàm từ file này
    window.showReplyBox = showReplyBox;
    window.loadReplies = loadReplies;
    window.submitReply = submitReply;
    window.toggleCommentReaction = toggleCommentReaction;
    window.openCommentReactionPicker = openCommentReactionPicker;
    window.closeCommentReactionPicker = closeCommentReactionPicker;
    window.chooseCommentReaction = chooseCommentReaction;
    window.openCommentReactionUserModal = openCommentReactionUserModal;
    window.loadCommentReactionTab = loadCommentReactionTab;
    window.toggleFollowInPopup = toggleFollowInPopup;
    window.cleanCommentContent = cleanCommentContent;
    
    // Export các hàm menu - QUAN TRỌNG!
    window.toggleCommentMenu = toggleCommentMenu;
    window.editComment = editComment;
    window.saveCommentEdit = saveCommentEdit; // Đây là phiên bản KHÔNG ALERT
    window.cancelCommentEdit = cancelCommentEdit;
    window.deleteComment = deleteComment; // Đây là phiên bản KHÔNG ALERT (chỉ confirm)
    window.hideComment = hideComment;
    window.reportComment = reportComment;
    
    // Các hàm đã có trong community-main.js, chỉ export nếu chưa có
    if (!window.displayName) window.displayName = displayName;
    if (!window.buildAvatarURL) window.buildAvatarURL = buildAvatarURL;
    
    console.log('✅ Comment functions exported to global scope');
}
})();
/* ===== CONTENT FORMATTING UTILITIES ===== */
function formatCommentForEdit(content) {
    if (!content) return '';
    
    // Chuyển HTML về text với định dạng
    const temp = document.createElement('div');
    temp.innerHTML = content;
    
    // Chuyển <br> thành \n
    const brs = temp.querySelectorAll('br');
    brs.forEach(br => br.replaceWith('\n'));
    
    // Chuyển user-mention thành @username
    const mentions = temp.querySelectorAll('.user-mention');
    mentions.forEach(mention => {
        const username = mention.getAttribute('data-username') || 
                        mention.textContent.replace('@', '');
        mention.replaceWith(`@${username}`);
    });
    
    return temp.textContent || temp.innerText || '';
}

function formatCommentForDisplay(content) {
    if (!content) return '';
    
    // Giữ nguyên nếu đã là HTML với <br>
    if (content.includes('<br>') || content.includes('</span>')) {
        return content;
    }
    
    // Chuyển \n thành <br>
    return content.replace(/\n/g, '<br>');
}
async function hideComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    console.log(`🟡 Hiding comment ${commentId} for current user...`);
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    // Đóng menu trước
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.remove('show');
    
    // Hiệu ứng ẩn
    commentElement.style.opacity = '0.5';
    commentElement.style.transform = 'translateX(20px)';
    commentElement.style.transition = 'all 0.2s ease';
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/hide.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        const data = await res.json();
        console.log('🟢 Hide API response:', data);
        
        if (!data.success) {
            // Nếu ẩn thất bại, hiện lại comment
            commentElement.style.opacity = '1';
            commentElement.style.transform = 'translateX(0)';
            console.error('❌ Hide failed:', data.error);
            alert('Lỗi: ' + (data.error || 'Không thể ẩn comment'));
            return;
        }
        
        // Xóa comment khỏi DOM sau 200ms
        setTimeout(() => {
            commentElement.remove();
            console.log('✅ Comment hidden for current user');
            
            // Cập nhật số lượng comment
            updateCommentCountAfterHide(commentElement);
            
        }, 200);
        
    } catch (err) {
        commentElement.style.opacity = '1';
        commentElement.style.transform = 'translateX(0)';
        console.error("❌ Lỗi ẩn comment:", err);
        alert("Lỗi: " + err.message);
    }
}

function updateCommentCountAfterHide(commentElement) {
    // Tìm post chứa comment
    const postElement = commentElement.closest('.community-post');
    if (!postElement) return;
    
    // Tìm phần tử hiển thị số comment
    const commentCountElement = postElement.querySelector('.comment-count');
    if (!commentCountElement) return;
    
    // Giảm số lượng comment hiển thị
    const currentText = commentCountElement.textContent;
    const match = currentText.match(/\d+/);
    
    if (match) {
        const currentCount = parseInt(match[0]);
        if (currentCount > 1) {
            commentCountElement.textContent = `${currentCount - 1} bình luận`;
        } else if (currentCount === 1) {
            commentCountElement.textContent = '0 bình luận';
        }
    }
}
/* ===================================
   ADMIN REPORT & BAN SYSTEM
=================================== */

// Kiểm tra xem user có phải admin không
function isAdmin() {
    return window.CURRENT_USER_ROLE === 'Admin' || 
           (window.CURRENT_USER_DATA && window.CURRENT_USER_DATA.role === 'Admin');
}

// Hiển thị panel admin khi xem comment
function showAdminPanel(commentId) {
    if (!isAdmin()) return;
    
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;
    
    // Ẩn panel admin khác nếu có
    hideAllAdminPanels();
    
    // Kiểm tra đã có panel chưa
    const existingPanel = commentElement.querySelector('.admin-panel');
    if (existingPanel) {
        existingPanel.remove();
        commentElement.classList.remove('comment-reported');
        return;
    }
    
    // Thêm badge admin
    if (!commentElement.querySelector('.admin-badge')) {
        const badge = document.createElement('div');
        badge.className = 'admin-badge';
        badge.textContent = 'ADMIN';
        commentElement.appendChild(badge);
    }
    
    // Tạo panel admin
    const panelHtml = `
        <div class="admin-panel" id="admin-panel-${commentId}">
            <h4>Xử lý báo cáo comment</h4>
            
            <div class="ban-options">
                <label>Thời gian cấm user (nếu chọn cấm):</label>
                <div class="ban-option" onclick="selectBanOption(${commentId}, 1)">
                    <input type="radio" name="ban-days-${commentId}" id="ban-1-${commentId}" value="1">
                    <label for="ban-1-${commentId}">1 ngày <span class="days-badge">1</span></label>
                </div>
                <div class="ban-option" onclick="selectBanOption(${commentId}, 3)">
                    <input type="radio" name="ban-days-${commentId}" id="ban-3-${commentId}" value="3">
                    <label for="ban-3-${commentId}">3 ngày <span class="days-badge">3</span></label>
                </div>
                <div class="ban-option" onclick="selectBanOption(${commentId}, 7)">
                    <input type="radio" name="ban-days-${commentId}" id="ban-7-${commentId}" value="7">
                    <label for="ban-7-${commentId}">7 ngày <span class="days-badge">7</span></label>
                </div>
                <div class="ban-option" onclick="selectBanOption(${commentId}, 30)">
                    <input type="radio" name="ban-days-${commentId}" id="ban-30-${commentId}" value="30">
                    <label for="ban-30-${commentId}">30 ngày <span class="days-badge">30</span></label>
                </div>
                <div class="ban-option" onclick="selectBanOption(${commentId}, 0)">
                    <input type="radio" name="ban-days-${commentId}" id="ban-permanent-${commentId}" value="0">
                    <label for="ban-permanent-${commentId}">Vĩnh viễn <span class="days-badge">∞</span></label>
                </div>
            </div>
            
            <div class="admin-actions">
                <button class="btn-admin btn-admin-delete" onclick="adminDeleteComment(${commentId})">
                    🗑️ Xóa comment
                </button>
                <button class="btn-admin btn-admin-ban" onclick="adminBanUser(${commentId})">
                    ⛔ Cấm user
                </button>
                <button class="btn-admin btn-admin-combined" onclick="adminDeleteAndBan(${commentId})">
                    🗑️⛔ Xóa + Cấm
                </button>
                <button class="btn-admin btn-admin-dismiss" onclick="adminDismissReport(${commentId})">
                    ✅ Bỏ qua
                </button>
            </div>
        </div>
    `;
    
    // Thêm panel vào comment
    commentElement.insertAdjacentHTML('beforeend', panelHtml);
    commentElement.classList.add('comment-reported');
    
    // Tự động chọn 7 ngày
    setTimeout(() => {
        selectBanOption(commentId, 7);
    }, 100);
}

// Ẩn tất cả panel admin
function hideAllAdminPanels() {
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.remove();
    });
    document.querySelectorAll('.comment-reported').forEach(comment => {
        comment.classList.remove('comment-reported');
    });
    document.querySelectorAll('.admin-badge').forEach(badge => {
        badge.remove();
    });
}

// Chọn thời gian cấm
function selectBanOption(commentId, days) {
    const panel = document.getElementById(`admin-panel-${commentId}`);
    if (!panel) return;
    
    // Update UI
    const radio = panel.querySelector(`input[name="ban-days-${commentId}"][value="${days}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // Store selection
    window._banSelection = window._banSelection || {};
    window._banSelection[commentId] = days;
}
async function adminDeleteComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // 🟢 LOẠI BỎ CONFIRM - XÓA NGAY LẬP TỨC
    // KHÔNG HIỂN THỊ CONFIRM DIALOG NỮA
    const reason = "Vi phạm nội quy cộng đồng (Admin xóa)"; // Lý do mặc định
    
    // 🟢 ĐÓNG MENU TRƯỚC KHI XÓA
    const menu = document.getElementById(`comment-menu-${commentId}`);
    if (menu) menu.classList.remove('show');
    
    try {
        // 🟢 TẠO FORM DATA CHUẨN
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('is_admin_delete', '1'); // Thêm flag admin delete
        formData.append('admin_id', window.CURRENT_USER_ID || 0);
        formData.append('admin_username', window.CURRENT_USERNAME || 'Admin');
        formData.append('reason', reason.trim());
        formData.append('deleted_by_admin', 'true'); // Thêm thông tin admin
        
        console.log('🟡 Admin deleting comment (no confirmation):', {
            commentId,
            adminId: window.CURRENT_USER_ID,
            adminUsername: window.CURRENT_USERNAME
        });
        
        // 🟢 GỬI REQUEST
        let res;
        try {
            res = await fetch(`${BASE_URL}/backend/api/community/comments/delete.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                },
                credentials: 'include',
                body: formData
            });
        } catch (networkError) {
            console.error('❌ Network error:', networkError);
            return; // KHÔNG HIỂN THỊ ALERT
        }
        
        // 🟢 KIỂM TRA RESPONSE STATUS
        console.log('🟡 Response status:', res.status, res.statusText);
        
        if (!res.ok) {
            // Đọc response để lấy thông tin lỗi chi tiết
            let errorText = '';
            try {
                errorText = await res.text();
            } catch (e) {
                errorText = 'Không thể đọc response';
            }
            
            console.error('❌ HTTP error details:', {
                status: res.status,
                statusText: res.statusText,
                response: errorText.substring(0, 200)
            });
            
            return; // KHÔNG HIỂN THỊ ALERT
        }
        
        // 🟢 KIỂM TRA CONTENT-TYPE
        const contentType = res.headers.get('content-type') || '';
        console.log('🟡 Content-Type:', contentType);
        
        if (!contentType.includes('application/json')) {
            const text = await res.text();
            console.error('❌ Non-JSON response:', text.substring(0, 200));
            return; // KHÔNG HIỂN THỊ ALERT
        }
        
        // 🟢 PARSE JSON
        let data;
        try {
            data = await res.json();
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            const rawText = await res.text();
            console.error('❌ Raw response:', rawText.substring(0, 300));
            return; // KHÔNG HIỂN THỊ ALERT
        }
        
        console.log('🟢 Delete API response:', data);
        
        // 🟢 XỬ LÝ KẾT QUẢ
        if (data.success) {
            // Hiệu ứng xóa
            const comment = document.getElementById(`comment-${commentId}`);
            if (comment) {
                // Thêm animation
                comment.style.transition = 'all 0.3s ease';
                comment.style.opacity = '0.5';
                comment.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    // Xóa khỏi DOM
                    comment.remove();
                    
                    // Cập nhật số lượng comment nếu có
                    updateCommentCountAfterDeletion();
                    
                    // 🟢 KHÔNG HIỂN THỊ THÔNG BÁO THÀNH CÔNG
                    console.log('✅ [ADMIN] Đã xóa bình luận thành công (không thông báo)');
                }, 300);
            } else {
                console.log('✅ [ADMIN] Đã xóa bình luận (không thông báo)');
            }
        } else {
            // Hiển thị lỗi từ server (chỉ trong console)
            console.error('❌ Server error:', data.error);
        }
        
    } catch (err) {
        console.error("❌ Lỗi admin xóa comment:", err);
        // KHÔNG HIỂN THỊ ALERT
    }
}
function renderCommentItem(c, postId) {
    console.log("🎨 Rendering comment:", c);
    
    // Kiểm tra dữ liệu đầu vào
    if (!c || typeof c !== 'object') {
        console.error("❌ Comment data không hợp lệ:", c);
        return '<div class="comment-error">Dữ liệu không hợp lệ</div>';
    }
    
    const u = c.user || {};
    const name = displayName(u);
    const username = u.Username || '';
    const userId = u.UserID || 0;
    const avatarText = name[0] ? name[0].toUpperCase() : '?';
    const avatarUrl = buildAvatarURL(u) || null;

    // 🟢 KIỂM TRA CÓ PHẢI COMMENT CỦA CHÍNH MÌNH KHÔNG
    const isOwnComment = window.CURRENT_USER_ID && parseInt(userId) === parseInt(window.CURRENT_USER_ID);
    
    // 🟢 KIỂM TRA CÓ PHẢI ADMIN KHÔNG
    const isAdmin = window.CURRENT_USER_ROLE === 'Admin';

    // 🟢 KIỂM TRA USER CÓ BỊ CẤM BÌNH LUẬN KHÔNG
    const isCommentBanned = c.is_comment_banned || false;
    const banReason = c.ban_reason || '';
    const banDuration = c.BanDuration || 0;
    const bannedAt = c.BannedAt || '';
    const bannedBy = c.banned_by_username || 'Admin';
    
    console.log("🟡 Comment ban status:", { 
        isCommentBanned, 
        banReason, 
        banDuration, 
        userId, 
        username 
    });

    // Lấy reactions
    const reactions = c.reactions || {};
    const summary = reactions.summary || {};
    const total = reactions.total || 0;
    const userReact = reactions.user || null;
    
    const ctime = c.CreatedAt ? c.CreatedAt.slice(0, 16) : "";
    const replyCount = c.ReplyCount || 0;

    // Xử lý content
    let contentHTML = c.Content || '';
    contentHTML = cleanCommentContent(contentHTML);
    
    console.log("🔍 Cleaned comment content:", contentHTML);

    // =============================================
    // 🟢 THÊM PHẦN HIỂN THỊ ẢNH CHO COMMENT
    // =============================================
    let imageHTML = '';
    if (c.ImageURL && c.HasImage) {
        const imageUrl = buildCommentImageURL(c.ImageURL);
        imageHTML = `
            <div class="comment-image-container">
                <div class="comment-image" onclick="openCommentImageModal('${imageUrl}')">
                    <img src="${imageUrl}" 
                         alt="Ảnh đính kèm"
                         loading="lazy"
                         ${c.ImageWidth ? `width="${c.ImageWidth}"` : ''}
                         ${c.ImageHeight ? `height="${c.ImageHeight}"` : ''}>
                </div>
            </div>
        `;
        console.log("🖼️ Added image to comment:", imageUrl);
    }

    const iconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    // Hiển thị reaction icons
    const reactIconsHtml = total > 0 ?
        Object.entries(summary)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => `
                <img class="cmt-react-icon"
                     src="${iconMap[type] || iconMap.like}"
                     onmouseenter="showCommentReactionUsersTooltip(${c.CommentID}, '${type}', event)"
                     onmouseleave="hideReactionUsersTooltip()"
                     onclick="openCommentReactionUserModal(${c.CommentID}, '${type}')">
            `).join("") : "";

    // 🟢 TẠO MENU 3 CHẤM CHO COMMENT - PHIÊN BẢN ĐƠN GIẢN
    let commentMenuHtml = '';
    
    // 1. COMMENT CỦA CHÍNH MÌNH: Chỉnh sửa + Xóa
    if (isOwnComment) {
        commentMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${c.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">
                    <button class="comment-menu-item" onclick="editComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">edit</span>
                        Chỉnh sửa
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item delete" onclick="deleteComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">delete</span>
                        Xóa
                    </button>
                </div>
            </div>
        `;
    }
    // 2. ADMIN XEM COMMENT NGƯỜI KHÁC: Xóa + Cấm bình luận
    else if (isAdmin && !isOwnComment) {
        commentMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${c.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">
                    <button class="comment-menu-item delete" onclick="adminDeleteComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px; color:#d32f2f;">delete</span>
                        <span style="color:#d32f2f; font-weight:600">Xóa comment</span>
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item ban" onclick="adminBanUserComment(${userId}, '${username}', event)">
                        <span class="material-icons" style="font-size:18px; color:#f57c00;">block</span>
                        <span style="color:#f57c00; font-weight:600">Cấm bình luận user</span>
                    </button>
                </div>
            </div>
        `;
    }
    // 3. USER THƯỜNG XEM COMMENT NGƯỜI KHÁC: Ẩn + Báo cáo
    else if (!isOwnComment) {
        commentMenuHtml = `
            <div class="comment-menu">
                <span class="comment-menu-btn" onclick="toggleCommentMenu(${c.CommentID}, event)">
                    ⋮
                </span>
                <div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">
                    <button class="comment-menu-item" onclick="hideComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px;">visibility_off</span>
                        Ẩn bình luận
                    </button>
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item report" onclick="reportComment(${c.CommentID}, event)">
                        <span class="material-icons" style="font-size:18px; color:#ff9800;">flag</span>
                        <span style="color:#ff9800;">Báo cáo bình luận</span>
                    </button>
                </div>
            </div>
        `;
    }

    // 🟢 THÊM BADGE CẤM VÀO TÊN USER NẾU BỊ CẤM VÀ LÀ ADMIN XEM
    let nameWithBadge = escapeHtml(name);
    
    if (isCommentBanned && isAdmin) {
        const badgeText = banDuration === 0 ? '🔴 CẤM VĨNH VIỄN' : `🔴 CẤM ${banDuration} NGÀY`;
        nameWithBadge = `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${nameWithBadge}</span>
                <span class="ban-badge-admin" 
                      title="Lý do: ${escapeHtml(banReason)}\nBị cấm bởi: ${escapeHtml(bannedBy)}\nNgày cấm: ${formatDate(bannedAt)}"
                      style="background:#ff4444;color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;cursor:help;display:inline-flex;align-items:center;gap:4px;">
                    <span style="font-size:14px;">⛔</span>
                    <span>${badgeText}</span>
                </span>
            </div>
        `;
        console.log("✅ Added ban badge for user:", username);
    }

    // 🟢 TẠO HTML CHO REPLY BOX VỚI CHỨC NĂNG UPLOAD ẢNH (CHO COMMENT CHA)
    const replyBoxHtml = `
        <div class="reply-box" id="reply-box-${c.CommentID}" style="display:none;">
            <div class="reply-input-wrapper">
                <div class="reply-input" id="reply-input-${c.CommentID}" contenteditable="true" placeholder="Viết phản hồi..."></div>
                <div class="reply-buttons-container">
                    <button class="reply-add-image-btn" onclick="document.getElementById('image-input-${c.CommentID}').click()">
                        <span class="material-icons" style="font-size:18px;">image</span>
                    </button>
                    <button class="reply-send-btn" onclick="submitReply(${postId}, ${c.CommentID})">
                        <span class="material-icons">send</span>
                    </button>
                </div>
            </div>
            <div class="reply-image-preview-container" id="reply-preview-${c.CommentID}" style="display:none;"></div>
            <input type="file" class="comment-image-input" id="image-input-${c.CommentID}" accept="image/*" style="display:none;">
        </div>
    `;

    return `
    <div class="comment-item" 
         id="comment-${c.CommentID}" 
         data-user-id="${userId}" 
         data-username="${username}"
         data-fullname="${name}"
         data-is-banned="${isCommentBanned ? 1 : 0}"
         data-ban-reason="${escapeHtml(banReason)}"
         data-ban-duration="${banDuration}"
         data-has-image="${c.HasImage ? 1 : 0}"
         data-image-url="${c.ImageURL || ''}">
        
       <div class="comment-avatar" onclick="openUserProfileById(${userId})">
            ${avatarUrl ? `
                <img class="comment-avatar-img"
                     src="${avatarUrl}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
            <div class="avatar-circle" style="${avatarUrl ? "display:none;" : ""}">
                ${avatarText}
            </div>
        </div>

        <div class="comment-body">
            <div class="comment-bubble">
               <div class="comment-name" onclick="openUserProfileById(${userId})">
                    ${nameWithBadge} <!-- ĐÃ THÊM BADGE VÀO ĐÂY -->
                </div>
                <div class="comment-text">${contentHTML}</div>
                
                <!-- 🟢 THÊM PHẦN HIỂN THỊ ẢNH CHO COMMENT -->
                ${imageHTML}
            </div>
            
            ${commentMenuHtml}

            <div class="comment-footer">
                <div class="comment-meta">
                    <span class="comment-time">${escapeHtml(ctime)}</span>

                    <div class="cmt-like-wrap">
                        <span class="cmt-action cmt-action-like ${userReact ? 'active' : ''}"
                              style="${userReact ? `color:${reactColorMap[userReact] || '#2078f4'}` : ''}"
                              onmouseenter="openCommentReactionPicker(${c.CommentID}, event)"
                              onclick="toggleCommentReaction(${c.CommentID}, 'like')">
                            ${userReact ? (reactTextMap[userReact] || 'Thích') : "Thích"}
                        </span>

                        <div class="cmt-react-picker"
                             id="cmt-react-picker-${c.CommentID}"
                             onmouseleave="closeCommentReactionPicker(${c.CommentID})">
                             ${['like','love','care','haha','wow','sad','angry'].map(type => `
                                <button class="cmt-react-emoji"
                                        onclick="event.stopPropagation(); chooseCommentReaction(${c.CommentID}, '${type}')">
                                    <img src="${BASE_URL}/assets/images/${type}.png">
                                </button>
                             `).join("")}
                        </div>
                    </div>

                    <!-- 🟢 SỬA NÚT "Trả lời" ĐỂ CHỈ MỞ 1 REPLY BOX (CHO COMMENT CHA) -->
                    <span class="cmt-action reply-btn"
                          data-comment-id="${c.CommentID}"
                          onclick="openSingleReplyBox(${c.CommentID}, ${postId})">
                        Trả lời
                    </span>
                </div>

                <div class="comment-react-right" id="cmt-react-${c.CommentID}">
                    ${reactIconsHtml}
                    ${total > 0 ? `<span class="react-total">${total}</span>` : ""}
                </div>
            </div>

            ${replyCount > 0 ? `
                <div class="view-replies" onclick="if(window.loadReplies)window.loadReplies(${c.CommentID})">
                    Xem ${replyCount} phản hồi
                </div>
            ` : ""}

            <div class="reply-list"></div>

            <!-- 🟢 REPLY BOX VỚI CHỨC NĂNG UPLOAD ẢNH (CHO COMMENT CHA) -->
            ${replyBoxHtml}
        </div>
    </div>`;
}

// Cấm user (admin)
async function adminBanUser(commentId) {
    const panel = document.getElementById(`admin-panel-${commentId}`);
    if (!panel) return;
    
    const selectedBan = panel.querySelector(`input[name="ban-days-${commentId}"]:checked`);
    if (!selectedBan) {
        alert('Vui lòng chọn thời gian cấm');
        return;
    }
    
    const banDays = parseInt(selectedBan.value);
    const banText = banDays === 0 ? 'VĨNH VIỄN' : `${banDays} ngày`;
    
    if (!confirm(`Xác nhận CẤM USER ${banText}?\nUser sẽ không thể comment trong thời gian bị cấm.`)) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('action', 'ban');
        formData.append('ban_days', banDays);
        
        const res = await fetch(`${BASE_URL}/backend/api/admin/comments/process.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            hideAllAdminPanels();
        } else {
            alert('❌ Lỗi: ' + data.error);
        }
        
    } catch (err) {
        console.error("Lỗi cấm user:", err);
        alert("Lỗi: " + err.message);
    }
}

// Xóa và cấm (admin)
async function adminDeleteAndBan(commentId) {
    const panel = document.getElementById(`admin-panel-${commentId}`);
    if (!panel) return;
    
    const selectedBan = panel.querySelector(`input[name="ban-days-${commentId}"]:checked`);
    if (!selectedBan) {
        alert('Vui lòng chọn thời gian cấm');
        return;
    }
    
    const banDays = parseInt(selectedBan.value);
    const banText = banDays === 0 ? 'VĨNH VIỄN' : `${banDays} ngày`;
    
    if (!confirm(`Xác nhận XÓA COMMENT và CẤM USER ${banText}?\nHành động này không thể hoàn tác.`)) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('action', 'delete_and_ban');
        formData.append('ban_days', banDays);
        
        const res = await fetch(`${BASE_URL}/backend/api/admin/comments/process.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            // Ẩn comment
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
                commentElement.style.display = 'none';
            }
            // Ẩn panel
            hideAllAdminPanels();
        } else {
            alert('❌ Lỗi: ' + data.error);
        }
        
    } catch (err) {
        console.error("Lỗi xử lý:", err);
        alert("Lỗi: " + err.message);
    }
}

// Bỏ qua báo cáo (admin)
async function adminDismissReport(commentId) {
    if (!confirm('Bỏ qua báo cáo này?\nComment sẽ vẫn hiển thị bình thường.')) {
        return;
    }
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/admin/comments/process.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: `comment_id=${commentId}&action=dismiss`
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            hideAllAdminPanels();
        } else {
            alert('❌ Lỗi: ' + data.error);
        }
        
    } catch (err) {
        console.error("Lỗi bỏ qua báo cáo:", err);
        alert("Lỗi: " + err.message);
    }
}
/* =======================
   BÁO CÁO COMMENT - HIỆN THÔNG BÁO THÀNH CÔNG
======================= */

async function reportComment(commentId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Tạo modal báo cáo
    const modalHtml = `
        <div class="report-modal-overlay" id="report-modal-${commentId}">
            <div class="report-modal">
                <div class="report-modal-header">
                    <h3>📝 Báo cáo bình luận</h3>
                    <button class="close-modal" onclick="closeReportModal(${commentId})">×</button>
                </div>
                <div class="report-modal-body">
                    <p><strong>Chọn lý do báo cáo:</strong></p>
                    <div class="report-types">
                        <label class="report-type">
                            <input type="radio" name="report-type-${commentId}" value="spam" checked>
                            <span>Spam hoặc quảng cáo</span>
                        </label>
                        <label class="report-type">
                            <input type="radio" name="report-type-${commentId}" value="abuse">
                            <span>Nội dung xúc phạm, bạo lực</span>
                        </label>
                        <label class="report-type">
                            <input type="radio" name="report-type-${commentId}" value="inappropriate">
                            <span>Nội dung không phù hợp</span>
                        </label>
                        <label class="report-type">
                            <input type="radio" name="report-type-${commentId}" value="other">
                            <span>Khác</span>
                        </label>
                    </div>
                    
                    <textarea 
                        class="report-reason" 
                        id="report-reason-${commentId}" 
                        placeholder="Mô tả chi tiết lý do báo cáo... (Không bắt buộc)"
                        rows="3"></textarea>
                    
                    <div class="report-tips">
                        <small>💡 Báo cáo sẽ được gửi đến quản trị viên để xem xét.</small>
                    </div>
                </div>
                <div class="report-modal-footer">
                    <button class="btn btn-secondary" onclick="closeReportModal(${commentId})">
                        Hủy
                    </button>
                    <button class="btn btn-primary" onclick="submitReport(${commentId})">
                        Gửi báo cáo
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Thêm modal vào body
    const existingModal = document.getElementById(`report-modal-${commentId}`);
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

async function submitReport(commentId) {
    // Lấy loại báo cáo
    const typeInputs = document.querySelectorAll(`input[name="report-type-${commentId}"]:checked`);
    const reportType = typeInputs.length > 0 ? typeInputs[0].value : 'other';
    
    // Lấy lý do (không bắt buộc)
    const reasonInput = document.getElementById(`report-reason-${commentId}`);
    const reason = reasonInput ? reasonInput.value.trim() : '';
    
    // Lấy tên loại báo cáo để hiển thị
    const reportTypeNames = {
        'spam': 'Spam hoặc quảng cáo',
        'abuse': 'Nội dung xúc phạm, bạo lực',
        'inappropriate': 'Nội dung không phù hợp',
        'other': 'Khác'
    };
    
    // Nếu không có lý do, dùng tên loại báo cáo làm lý do mặc định
    const finalReason = reason || reportTypeNames[reportType] || 'Báo cáo vi phạm';
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('reason', finalReason);
        formData.append('type', reportType);
        
        // 🟢 THÊM LOADING STATE
        const submitBtn = document.querySelector(`#report-modal-${commentId} .btn-primary`);
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Đang gửi...';
        }
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/report.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        // Đọc response để kiểm tra kết quả
        const data = await res.json();
        
        // Đóng modal
        closeReportModal(commentId);
        
        if (data.success) {
            // 🟢 HIỂN THỊ THÔNG BÁO THÀNH CÔNG
            showReportSuccessNotification('✅ Đã gửi báo cáo thành công!');
        } else {
            // 🟢 HIỂN THỊ THÔNG BÁO LỖI
            showReportErrorNotification('❌ Gửi báo cáo thất bại: ' + (data.error || 'Vui lòng thử lại'));
        }
        
    } catch (err) {
        console.error("❌ Lỗi gửi báo cáo:", err);
        
        // Đóng modal
        closeReportModal(commentId);
        
        // 🟢 HIỂN THỊ THÔNG BÁO LỖI
        showReportErrorNotification('❌ Lỗi kết nối. Vui lòng thử lại sau.');
    }
}

function closeReportModal(commentId) {
    const modal = document.getElementById(`report-modal-${commentId}`);
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

/* =======================
   THÔNG BÁO BÁO CÁO - CHỈ HIỆN THÔNG BÁO THÀNH CÔNG
======================= */

function showReportSuccessNotification(message) {
    // Xóa notification cũ nếu có
    const oldNotification = document.getElementById('report-success-notification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.id = 'report-success-notification';
    notification.className = 'report-success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation hiển thị
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

function showReportErrorNotification(message) {
    // Xóa notification cũ nếu có
    const oldNotification = document.getElementById('report-error-notification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.id = 'report-error-notification';
    notification.className = 'report-error-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">⚠️</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation hiển thị
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Tự động ẩn sau 4 giây (lỗi hiển thị lâu hơn một chút)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

/* =======================
   CSS CHO THÔNG BÁO BÁO CÁO
======================= */

const reportNotificationCSS = `
    /* Report Notification Styles */
    .report-success-notification,
    .report-error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 10px;
        padding: 16px 20px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        max-width: 350px;
        border-left: 4px solid;
        animation: slideInRight 0.3s ease forwards;
    }
    
    .report-success-notification {
        border-left-color: #4CAF50;
    }
    
    .report-error-notification {
        border-left-color: #ff9800;
    }
    
    .report-success-notification.show,
    .report-error-notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-icon {
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .report-success-notification .notification-icon {
        color: #4CAF50;
    }
    
    .report-error-notification .notification-icon {
        color: #ff9800;
    }
    
    .notification-text {
        font-size: 14px;
        color: #333;
        line-height: 1.4;
        font-weight: 500;
        flex: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #666;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        margin-left: 8px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }
    
    .notification-close:hover {
        background: #f0f2f5;
    }
    
    /* Spinner for loading */
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
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
    
    /* Modal animations */
    .report-modal-overlay {
        animation: fadeIn 0.3s ease forwards;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .report-modal {
        animation: scaleIn 0.3s ease 0.1s forwards;
        transform: scale(0.9);
        opacity: 0;
    }
    
    @keyframes scaleIn {
        from { 
            transform: scale(0.9);
            opacity: 0;
        }
        to { 
            transform: scale(1);
            opacity: 1;
        }
    }
`;

// Thêm CSS vào head
if (!document.getElementById('report-notification-css')) {
    const style = document.createElement('style');
    style.id = 'report-notification-css';
    style.textContent = reportNotificationCSS;
    document.head.appendChild(style);
}

// Export functions to global scope
if (typeof window !== 'undefined') {
    window.reportComment = reportComment;
    window.submitReport = submitReport;
    window.closeReportModal = closeReportModal;
    window.showReportSuccessNotification = showReportSuccessNotification;
    window.showReportErrorNotification = showReportErrorNotification;
}
// Thêm CSS cho modal báo cáo
const reportModalCSS = `
.report-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
}

.report-modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.report-modal-header {
    padding: 20px;
    border-bottom: 1px solid #e4e6eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.report-modal-header h3 {
    margin: 0;
    font-size: 18px;
    color: #1c1e21;
}

.close-modal {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #65676b;
    padding: 4px 8px;
    border-radius: 50%;
}

.close-modal:hover {
    background: #f0f2f5;
}

.report-modal-body {
    padding: 20px;
}

.report-types {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.report-type {
    display: flex;
    align-items: center;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.report-type:hover {
    background: #f0f2f5;
}

.report-type input {
    margin-right: 10px;
    cursor: pointer;
}

.report-type span {
    font-size: 14px;
    color: #1c1e21;
}

.report-reason {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
    margin-bottom: 10px;
}

.report-reason:focus {
    outline: none;
    border-color: #1877f2;
    box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1);
}

.report-tips {
    color: #65676b;
    font-size: 12px;
    margin-top: 5px;
}

.report-modal-footer {
    padding: 20px;
    border-top: 1px solid #e4e6eb;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.report-modal-footer .btn {
    padding: 10px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
}

.btn-secondary {
    background: #e4e6eb;
    color: #050505;
}

.btn-primary {
    background: #1877f2;
    color: white;
}

.btn-primary:hover {
    background: #166fe5;
}
`;

// Thêm CSS vào head
if (!document.getElementById('report-modal-css')) {
    const style = document.createElement('style');
    style.id = 'report-modal-css';
    style.textContent = reportModalCSS;
    document.head.appendChild(style);
}

// Kiểm tra user bị cấm khi comment
async function checkUserBanBeforeComment() {
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/user/check_ban.php`);
        const data = await res.json();
        
        if (data.success && data.is_banned) {
            const banInfo = data.ban_info;
            const remaining = banInfo.remaining_days > 0 ? 
                `Còn ${banInfo.remaining_days} ngày` : 
                'Vĩnh viễn';
            
            alert(`⛔ Tài khoản của bạn đã bị tạm ngưng bình luận.\n\n` +
                  `Lý do: ${banInfo.reason}\n` +
                  `Thời hạn: ${remaining}\n` +
                  `Người cấm: ${banInfo.banned_by || 'Quản trị viên'}\n\n` +
                  `Liên hệ quản trị viên nếu cần hỗ trợ.`);
            
            return false; // Không cho comment
        }
        
        return true; // Cho phép comment
        
    } catch (err) {
        console.error('Lỗi kiểm tra ban:', err);
        return true; // Cho phép comment nếu có lỗi
    }
}

// Cập nhật hàm submitComment để kiểm tra ban
async function submitCommentWithBanCheck(e, postId) {
    // Kiểm tra ban trước
    const canComment = await checkUserBanBeforeComment();
    if (!canComment) {
        e.preventDefault();
        return;
    }
    
    // Gọi hàm submitComment gốc
    submitComment(e, postId);
}
async function submitCommentWithImage(e, postId) {
    e.preventDefault();
    
    const form = e.target;
    const input = form.querySelector('input[name="comment"]');
    const fileInput = document.getElementById(`comment-image-input-${postId}`);
    
    if (!input) return;
    
    const content = input.value.trim();
    
    // 🟢 KIỂM TRA: CÓ NỘI DUNG HOẶC CÓ ẢNH
    const hasContent = content !== "";
    const hasImage = fileInput && fileInput.files && fileInput.files.length > 0;
    
    if (!hasContent && !hasImage) {
        alert('Vui lòng nhập nội dung hoặc chọn ảnh');
        return;
    }
    
    // Tạo FormData để gửi ảnh
    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('content', content);
    
    // Thêm ảnh nếu có
    if (hasImage) {
        formData.append('image', fileInput.files[0]);
    }
    
    // Hiển thị loading
    const sendBtn = form.querySelector('.comment-send-btn');
    const originalHTML = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
        sendBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">refresh</span>';
        sendBtn.disabled = true;
    }
    
    try {
        // 🟢 SỬ DỤNG CÙNG FILE create.php
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/create.php`, {
            method: "POST",
            body: formData // KHÔNG cần headers với FormData
        });
        
        const data = await res.json();
        
        if (!data.success) {
            throw new Error(data.error || "Không thể gửi bình luận");
        }
        
        // Reset form
        input.value = '';
        
        // Xóa preview ảnh
        const previewContainer = document.getElementById(`comment-preview-${postId}`);
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        }

        // Reset file input
        if (fileInput) {
            fileInput.value = '';
        }
        
        // 🟢 THÊM COMMENT MỚI VÀO DANH SÁCH
        addNewCommentToList(postId, data.comment);
        
        // Cập nhật số lượng comment
        updateCommentCount(postId, 1);
        
        console.log("✅ Comment đã được gửi thành công", data.comment);
        
    } catch (err) {
        console.error("Lỗi gửi comment:", err);
        alert("Lỗi: " + err.message);
    } finally {
        // Khôi phục nút gửi
        if (sendBtn) {
            sendBtn.innerHTML = originalHTML || '<span class="material-icons">send</span>';
            sendBtn.disabled = false;
        }
    }
}
function addNewCommentToList(postId, commentData) {
    const commentList = document.getElementById(`comment-list-${postId}`);
    if (!commentList) return;
    
    // Tạo HTML cho comment mới
    const commentHtml = renderCommentItem(commentData, postId);
    
    // Thêm vào đầu danh sách
    commentList.insertAdjacentHTML('afterbegin', commentHtml);
}
function removeCommentImagePreview(postId) {
    console.log('🗑️ Removing image preview for post:', postId);
    
    // 1. Xóa preview container
    const previewContainer = document.getElementById(`comment-preview-${postId}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
    }
    
    // 2. Reset file input
    const fileInput = document.getElementById(`comment-image-input-${postId}`);
    if (fileInput) {
        fileInput.value = '';
    }
    
    // 3. Vô hiệu hóa nút gửi nếu không có nội dung
    const textInput = document.querySelector(`#comments-${postId} input[name="comment"]`);
    const sendBtn = document.querySelector(`#comments-${postId} .comment-send-btn`);
    
    if (sendBtn && (!textInput || textInput.value.trim() === '')) {
        sendBtn.classList.remove('active');
    }
    
    // 4. Thông báo ngắn
    showImageRemovedToast();
}

function showImageRemovedToast() {
    // Xóa toast cũ nếu có
    const oldToast = document.querySelector('.image-removed-toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'image-removed-toast';
    toast.innerHTML = '<span class="material-icons">check_circle</span> Đã xóa ảnh';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}
// 🟢 SỬA HÀM MỞ PREVIEW ẢNH LỚN
function openSimpleImagePreview(imageUrl) {
    console.log('👁️ Opening image preview modal');
    
    // Tạo overlay
    const overlay = document.createElement('div');
    overlay.className = 'simple-image-overlay';
    overlay.id = 'simple-image-overlay'; // Thêm ID để dễ quản lý
    
    overlay.innerHTML = `
        <div class="simple-image-container">
            <button class="simple-image-close" onclick="closeSimpleImagePreviewOnly()">
                <span class="material-icons">close</span>
            </button>
            <img src="${imageUrl}" alt="Xem ảnh" class="simple-image-full">
        </div>
    `;
    
    // 🟢 QUAN TRỌNG: Chỉ đóng modal khi click vào overlay, không ảnh hưởng reply box
    overlay.onclick = function(e) {
        if (e.target === overlay || e.target.classList.contains('simple-image-close')) {
            closeSimpleImagePreviewOnly();
        }
    };
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // 🟢 LƯU LẠI TRẠNG THÁI CỦA REPLY BOX HIỆN TẠI
    const activeReplyBox = document.querySelector('.reply-box.active');
    if (activeReplyBox) {
        window._activeReplyBoxId = activeReplyBox.id;
        console.log('🟢 Active reply box:', window._activeReplyBoxId);
    }
}
function closeSimpleImagePreviewOnly() {
    console.log('🟢 Closing image preview modal only');
    
    const overlay = document.querySelector('.simple-image-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
            
            // 🟢 ĐẢM BẢO REPLY BOX VẪN MỞ SAU KHI ĐÓNG MODAL
            if (window._activeReplyBoxId) {
                const replyBox = document.getElementById(window._activeReplyBoxId);
                if (replyBox) {
                    replyBox.style.display = 'block';
                    replyBox.classList.add('active');
                    
                    // Focus lại vào input nếu cần
                    const input = replyBox.querySelector('.reply-input');
                    if (input) {
                        setTimeout(() => input.focus(), 10);
                    }
                }
                delete window._activeReplyBoxId; // Xóa biến tạm
            }
        }, 300);
    }
}

// Hàm đóng preview
function closeSimpleImagePreview() {
    const overlay = document.querySelector('.simple-image-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// Tải ảnh xuống
function downloadImage(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'comment-image-' + Date.now() + '.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// Thêm CSS này vào
const simpleImagePreviewCSS = `
    /* Container preview ảnh */
    .comment-image-preview {
        position: relative;
        width: 120px;
        margin-top: 10px;
    }
    
    /* Wrapper ảnh */
    .comment-image-wrapper {
        width: 120px;
        height: 120px;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        border: 2px solid #e0e0e0;
        transition: all 0.2s ease;
    }
    
    .comment-image-wrapper:hover {
        border-color: #2196f3;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }
    
    .comment-image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    /* Overlay khi hover */
    .comment-image-hover {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .comment-image-wrapper:hover .comment-image-hover {
        opacity: 1;
    }
    
    .comment-image-hover .material-icons {
        color: white;
        font-size: 32px;
        font-weight: bold;
    }
    
    /* Nút xóa (dấu ×) */
    .comment-remove-image-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 28px;
        height: 28px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        z-index: 10;
        padding: 0;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    
    .comment-remove-image-btn:hover {
        background: #d32f2f;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    
    /* Tên file */
    .comment-image-name {
        margin-top: 6px;
        font-size: 12px;
        color: #666;
        text-align: center;
        word-break: break-all;
        max-width: 120px;
    }
    
    /* Overlay xem ảnh lớn */
    .simple-image-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        animation: fadeIn 0.2s ease;
    }
    
    .simple-image-container {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        animation: zoomIn 0.3s ease;
    }
    
    .simple-image-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: background 0.2s;
    }
    
    .simple-image-close:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .simple-image-full {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    
    /* Toast thông báo */
    .image-removed-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .image-removed-toast.fade-out {
        animation: slideOutRight 0.3s ease forwards;
    }
    
    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes zoomIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .comment-image-preview {
            width: 100px;
        }
        
        .comment-image-wrapper {
            width: 100px;
            height: 100px;
        }
        
        .comment-remove-image-btn {
            width: 24px;
            height: 24px;
            top: -6px;
            right: -6px;
        }
        
        .comment-image-name {
            max-width: 100px;
            font-size: 11px;
        }
    }
`;

// Thêm CSS vào head
if (!document.getElementById('simple-image-preview-css')) {
    const style = document.createElement('style');
    style.id = 'simple-image-preview-css';
    style.textContent = simpleImagePreviewCSS;
    document.head.appendChild(style);
}

// Thêm CSS vào head
if (!document.getElementById('comment-image-preview-styles')) {
    const style = document.createElement('style');
    style.id = 'comment-image-preview-styles';
    document.head.appendChild(style);
}
document.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào nút xóa ảnh trong preview comment
    if (e.target.closest('.remove-image-btn')) {
        const removeBtn = e.target.closest('.remove-image-btn');
        const postId = removeBtn.closest('.image-preview-wrapper')?.id?.replace('comment-preview-', '');
        
        if (postId) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Clicked remove image button for post:', postId);
            removeCommentImagePreview(postId);
        }
    }
});
// =============================================
// 🟢 HÀM MỞ MODAL XEM ẢNH COMMENT
// =============================================
function openCommentImageModal(imageUrl) {
    // Xóa modal cũ nếu có
    const oldModal = document.getElementById('comment-image-modal');
    if (oldModal) oldModal.remove();
    
    // Tạo modal mới
    const modal = document.createElement('div');
    modal.id = 'comment-image-modal';
    modal.className = 'comment-image-modal';
    modal.innerHTML = `
        <div class="comment-image-overlay" onclick="closeCommentImageModal()"></div>
        <div class="comment-image-container">
            <button class="comment-image-close" onclick="closeCommentImageModal()">×</button>
            <img src="${imageUrl}" alt="Ảnh bình luận" class="comment-full-image">
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeCommentImageModal() {
    const modal = document.getElementById('comment-image-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}
/* =======================
   ADMIN: CẤM BÌNH LUẬN USER - VỚI BANNER NOTIFICATION
======================= */
async function adminBanUserComment(userId, username, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Ẩn menu comment trước
    const menu = document.getElementById(`comment-menu-${userId}`);
    if (menu) menu.classList.remove('show');
    
    // Tạo modal banner cho admin nhập thông tin
    const modalHtml = `
        <div class="admin-ban-modal-overlay" id="ban-modal-${userId}">
            <div class="admin-ban-modal">
                <div class="admin-ban-header">
                    <div class="admin-ban-icon">
                        <span class="material-icons">block</span>
                    </div>
                    <h3>CẤM BÌNH LUẬN USER</h3>
                    <button class="admin-ban-close" onclick="closeBanModal(${userId})">×</button>
                </div>
                
                <div class="admin-ban-body">
                    <div class="ban-user-info">
                        <div class="ban-user-avatar">
                            <div class="avatar-circle">${username.charAt(0).toUpperCase()}</div>
                        </div>
                        <div class="ban-user-details">
                            <h4>${username}</h4>
                            <span>User ID: ${userId}</span>
                        </div>
                    </div>
                    
                    <div class="ban-form">
                        <div class="form-group">
                            <label for="ban-reason-${userId}">
                                <span class="material-icons">report</span>
                                Lý do cấm
                            </label>
                            <textarea 
                                id="ban-reason-${userId}" 
                                class="ban-reason-input" 
                                placeholder="Nhập lý do cấm bình luận..."
                                rows="3"
                            >Vi phạm chính sách bình luận</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="ban-duration-${userId}">
                                <span class="material-icons">schedule</span>
                                Thời gian cấm
                            </label>
                            <div class="duration-options">
                                <button class="duration-btn" data-user-id="${userId}" data-days="1" onclick="selectDuration(${userId}, 1)">1 ngày</button>
                                <button class="duration-btn active" data-user-id="${userId}" data-days="7" onclick="selectDuration(${userId}, 7)">7 ngày</button>
                                <button class="duration-btn" data-user-id="${userId}" data-days="30" onclick="selectDuration(${userId}, 30)">30 ngày</button>
                                <button class="duration-btn permanent" data-user-id="${userId}" data-days="0" onclick="selectDuration(${userId}, 0)">Vĩnh viễn</button>
                            </div>
                            <input type="hidden" id="ban-duration-${userId}" value="7">
                        </div>
                        
                        <div class="ban-warning">
                            <span class="material-icons">warning</span>
                            <span>User sẽ không thể bình luận trong thời gian bị cấm.</span>
                        </div>
                    </div>
                </div>
                
                <div class="admin-ban-footer">
                    <button class="ban-btn cancel" onclick="closeBanModal(${userId})">
                        Hủy
                    </button>
                    <button class="ban-btn confirm" onclick="submitBanComment(${userId}, '${username}')">
                        <span class="material-icons">check_circle</span>
                        Xác nhận cấm
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Xóa modal cũ nếu có
    const oldModal = document.getElementById(`ban-modal-${userId}`);
    if (oldModal) oldModal.remove();
    
    // Thêm modal vào body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    
    // Focus vào textarea
    setTimeout(() => {
        const textarea = document.getElementById(`ban-reason-${userId}`);
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

// Hàm chọn thời gian
function selectDuration(userId, days) {
    // Sử dụng data attribute thay vì class với số
    const buttons = document.querySelectorAll(`.duration-btn[data-user-id="${userId}"]`);
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const selectedBtn = document.querySelector(`.duration-btn[data-user-id="${userId}"][data-days="${days}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    document.getElementById(`ban-duration-${userId}`).value = days;
}

// Hàm đóng modal
function closeBanModal(userId) {
    const modal = document.getElementById(`ban-modal-${userId}`);
    if (modal) {
        modal.classList.add('fade-out');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

async function submitBanComment(userId, username) {
    console.log('🟡 Starting ban process for user:', userId, username);
    
    const reasonInput = document.getElementById(`ban-reason-${userId}`);
    const durationInput = document.getElementById(`ban-duration-${userId}`);
    
    if (!reasonInput || !durationInput) {
        console.error('❌ Form elements not found');
        showBanResult('error', 'Lỗi form không hợp lệ');
        return;
    }
    
    const reason = reasonInput.value.trim();
    const duration = parseInt(durationInput.value) || 7;
    
    console.log('🟡 Ban parameters:', { reason, duration });
    
    if (!reason) {
        showBanResult('error', 'Vui lòng nhập lý do cấm');
        reasonInput.focus();
        return;
    }
    
    // Disable button và hiển thị loading
    const confirmBtn = document.querySelector(`#ban-modal-${userId} .ban-btn.confirm`);
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang xử lý...';
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('user_id', userId);
        formData.append('username', username);
        formData.append('reason', reason);
        formData.append('duration', duration);
        
        console.log('🟡 Sending ban request:', {
            url: `${BASE_URL}/backend/api/community/admin/ban_comment.php`,
            data: Object.fromEntries(formData)
        });
        
        const res = await fetch(`${BASE_URL}/backend/api/community/admin/ban_comment.php`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: formData
        });
        
        console.log('🟡 Response status:', res.status, res.statusText);
        
        // Đọc response text trước
        const responseText = await res.text();
        console.log('🟡 Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError, responseText);
            throw new Error(`Server trả về dữ liệu không hợp lệ: ${responseText.substring(0, 200)}`);
        }
        
        console.log('🟢 Parsed response:', data);
        
        // Đóng modal sau khi thành công
        setTimeout(() => closeBanModal(userId), 100);
        
        if (data.success) {
            // Hiển thị banner kết quả
            showBanResult('success', data.message || `Đã cấm bình luận ${username} thành công`);
            
            // Cập nhật UI - thêm badge vào các comment của user này
            updateUserBanUI(userId, username, duration, reason);
            
        } else {
            console.error('❌ API returned error:', data);
            showBanResult('error', data.error || 'Không thể cấm user');
        }
        
    } catch (err) {
        console.error("❌ Lỗi cấm bình luận:", err);
        
        // Đóng modal
        closeBanModal(userId);
        
        // Hiển thị lỗi cụ thể
        let errorMessage = 'Lỗi kết nối đến server';
        if (err.message.includes('JSON')) {
            errorMessage = 'Server trả về dữ liệu không hợp lệ';
        } else if (err.message.includes('HTTP')) {
            errorMessage = `Lỗi server (${err.message})`;
        }
        
        showBanResult('error', errorMessage + '. Vui lòng kiểm tra console để biết chi tiết.');
    } finally {
        // Re-enable button
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="material-icons">check_circle</span> Xác nhận cấm';
        }
    }
}

// Hiển thị kết quả bằng banner đẹp
function showBanResult(type, message) {
    // Xóa banner cũ
    const oldBanner = document.getElementById('ban-result-banner');
    if (oldBanner) oldBanner.remove();
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning'
    };
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800'
    };
    
    const banner = document.createElement('div');
    banner.id = 'ban-result-banner';
    banner.className = `ban-result-banner ${type}`;
    banner.innerHTML = `
        <div class="ban-result-content">
            <span class="material-icons">${icons[type] || 'info'}</span>
            <span>${message}</span>
        </div>
        <button class="ban-result-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(banner);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (banner.parentNode) {
            banner.classList.add('fade-out');
            setTimeout(() => banner.remove(), 300);
        }
    }, 5000);
}

// Cập nhật UI khi user bị cấm
function updateUserBanUI(userId, username, duration, reason) {
    // Tìm tất cả comment của user này
    const commentElements = document.querySelectorAll(`[data-user-id="${userId}"]`);
    
    commentElements.forEach(comment => {
        const nameElement = comment.querySelector('.comment-name');
        if (nameElement && !nameElement.querySelector('.ban-badge')) {
            const badge = document.createElement('span');
            badge.className = 'ban-badge';
            badge.title = `Đã cấm bình luận: ${reason}`;
            badge.innerHTML = `<span class="material-icons" style="font-size:14px;vertical-align:middle;">block</span> Cấm ${duration === 0 ? 'vĩnh viễn' : duration + ' ngày'}`;
            nameElement.appendChild(badge);
        }
        
        // Vô hiệu hóa nút trả lời nếu có
        const replyBtn = comment.querySelector('.cmt-action[onclick*="showReplyBox"]');
        if (replyBtn) {
            replyBtn.style.opacity = '0.5';
            replyBtn.style.cursor = 'not-allowed';
            replyBtn.title = 'User đã bị cấm bình luận';
            
            // Xóa onclick để không thể click
            replyBtn.removeAttribute('onclick');
            replyBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };
        }
    });
    
    // Hiển thị toast notification nhỏ
    showMiniNotification(`${username} đã bị cấm bình luận`, 'admin');
}
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}
// Hiển thị notification nhỏ
function showMiniNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `mini-notification ${type}`;
    notification.innerHTML = `
        <span class="material-icons">${type === 'admin' ? 'admin_panel_settings' : 'info'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('slide-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions to global scope
if (typeof window !== 'undefined') {
    window.adminBanUserComment = adminBanUserComment;
    window.closeBanModal = closeBanModal;
    window.selectDuration = selectDuration;
    window.submitBanComment = submitBanComment;
}

// Export functions to global scope
if (typeof window !== 'undefined') {
    window.adminBanUserComment = adminBanUserComment;
}
// Export functions to global scope
if (typeof window !== 'undefined') {
    window.showAdminPanel = showAdminPanel;
    window.hideAllAdminPanels = hideAllAdminPanels;
    window.adminDeleteComment = adminDeleteComment;
    window.adminBanUser = adminBanUser;
    window.adminDeleteAndBan = adminDeleteAndBan;
    window.adminDismissReport = adminDismissReport;
    window.selectBanOption = selectBanOption;
    window.reportComment = reportComment;
    window.closeReportModal = closeReportModal;
    window.submitReport = submitReport;
    window.checkUserBanBeforeComment = checkUserBanBeforeComment;
    window.submitCommentWithBanCheck = submitCommentWithBanCheck;
    
    console.log('✅ Admin comment system loaded');
}