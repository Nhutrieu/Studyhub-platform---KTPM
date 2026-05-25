// community-main.js
// ================== CORE + FEED + POST + COMMENT CƠ BẢN + NOTIFICATIONS ==================

let COMMUNITY_SCOPE = "all"; // 'all' | 'following'
const BASE_URL = "/HeThongChamSocCaKoi";
const currentUserIsAdmin = window.CURRENT_USER_ROLE === 'Admin';

const reactColorMap = {
    like: "#2078f4",
    love: "#f53b57",
    care: "#f7b125",
    haha: "#f7b125",
    wow: "#f7b125",
    sad: "#f7b125",
    angry: "#e03023",
};

const reactTextMap = {
    like: "Đã thích",
    love: "Yêu thích",
    care: "Thương thương",
    haha: "Haha",
    wow: "Wow",
    sad: "Buồn",
    angry: "Tức giận",
};
function getSafeAvatarURL(avatarPath) {
    console.log("🔍 getSafeAvatarURL input:", avatarPath);
    
    if (!avatarPath || avatarPath.trim() === '' || 
        avatarPath === "undefined" || avatarPath === "null") {
        console.log("🔍 No avatar path, using default");
        return `${BASE_URL}/assets/images/default-avatar.png?_t=${new Date().getTime()}`;
    }
    
    // 🟢 LUÔN THÊM TIMESTAMP ĐỂ TRÁNH CACHE
    const timestamp = new Date().getTime();
    let finalPath = avatarPath;
    
    // Nếu đã là URL đầy đủ
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        console.log("🔍 Already full URL");
        finalPath = avatarPath;
    }
    // Nếu là đường dẫn tuyệt đối từ root
    else if (avatarPath.startsWith('/')) {
        console.log("🔍 Absolute path");
        finalPath = avatarPath;
    }
    // Nếu là đường dẫn tương đối với uploads/avatars/
    else if (avatarPath.includes('uploads/avatars/')) {
        console.log("🔍 Relative path with uploads/avatars/");
        if (!avatarPath.startsWith('/')) {
            finalPath = `/${avatarPath}`;
        } else {
            finalPath = avatarPath;
        }
    }
    // Mặc định: thư mục uploads/avatars/
    else {
        console.log("🔍 Filename only, using uploads/avatars/");
        finalPath = `${BASE_URL}/uploads/avatars/${avatarPath}`;
    }
    
    // 🟢 LUÔN THÊM TIMESTAMP VÀO CUỐI URL
    if (finalPath.includes('?')) {
        return `${finalPath}&_t=${timestamp}`;
    } else {
        return `${finalPath}?_t=${timestamp}`;
    }
}
// Cập nhật biến global CURRENT_USER_AVATAR nếu có
if (typeof window !== 'undefined' && window.CURRENT_USER_AVATAR) {
    window.CURRENT_USER_AVATAR = getSafeAvatarURL(window.CURRENT_USER_AVATAR);
}
const REACTION_TOOLTIP_MAP = {
    like: "Thích",
    love: "Yêu thích",
    care: "Thương thương",
    haha: "Haha",
    wow: "Wow",
    sad: "Buồn",
    angry: "Tức giận"
};

// ===== GET POST ACTIONS HTML =====
function getPostActionsHtml(post, userReact, reactIcon, reactColor, reactLabel) {
    const postId = post.PostID;
    const user = post.user || {};
    const currentUserIsAdmin = window.CURRENT_USER_ROLE === 'Admin';
    const isCurrentUserPost = user.UserID == window.CURRENT_USER_ID;

    // 🟢 1. ADMIN xem bài CHÍNH MÌNH: 3 nút (Thích, Bình luận, Chia sẻ)
    if (currentUserIsAdmin && isCurrentUserPost) {
        return `
        <div class="post-actions">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${postId})"
                onmouseenter="cancelCloseReactionPicker(${postId})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${postId}, 'like')"
                        onmouseenter="openReactionPicker(${postId})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${postId}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${postId}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${postId})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn" onclick="sharePost(${postId})">
                <span class="material-icons">share</span>
                <span>Chia sẻ</span>
            </button>
        </div>
        `;
    } 
    // 🟢 2. ADMIN xem bài NGƯỜI KHÁC: 4 nút (Thích, Bình luận, Chia sẻ, Quản lý)
    else if (currentUserIsAdmin && !isCurrentUserPost) {
        return `
        <div class="post-actions">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${postId})"
                onmouseenter="cancelCloseReactionPicker(${postId})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${postId}, 'like')"
                        onmouseenter="openReactionPicker(${postId})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${postId}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${postId}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${postId})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn" onclick="sharePost(${postId})">
                <span class="material-icons">share</span>
                <span>Chia sẻ</span>
            </button>
            <button class="post-action-btn admin-manage-btn" onclick="showAdminManageMenu(${postId})">
                <span class="material-icons">admin_panel_settings</span>
                <span>Quản lý</span>
            </button>
        </div>
        `;
    }
    // 🟢 3. USER thường: 4 nút (Thích, Bình luận, Chia sẻ, Báo cáo)
    else {
        return `
        <div class="post-actions">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${postId})"
                onmouseenter="cancelCloseReactionPicker(${postId})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${postId}, 'like')"
                        onmouseenter="openReactionPicker(${postId})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${postId}">
                    ${["like","love","care","haha","wow","sad","angry"]
                        .map(t => `
                        <div class="emoji-wrapper" data-type="${t}">
                            <button class="reaction-emoji ${t}" onclick="chooseReaction(${postId}, '${t}')">
                                <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                            </button>
                            <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                        </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${postId})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn" onclick="sharePost(${postId})">
                <span class="material-icons">share</span>
                <span>Chia sẻ</span>
            </button>
            <button class="post-action-btn report-post-btn" onclick="showReportPostModal(${postId})">
                <span class="material-icons">flag</span>
                <span>Báo cáo</span>
            </button>
        </div>
        `;
    }
}
let tooltipTimeout = null;
/* ========== TOUCH SUPPORT FOR REACTION PICKER ========== */
function initReactionPickerTouchSupport() {
    document.addEventListener('touchstart', function(e) {
        const emojiWrapper = e.target.closest('.emoji-wrapper');
        if (emojiWrapper) {
            // Xóa active class từ các wrapper khác
            document.querySelectorAll('.emoji-wrapper.active-touch').forEach(wrapper => {
                wrapper.classList.remove('active-touch');
            });
            
            // Thêm active class cho wrapper hiện tại
            emojiWrapper.classList.add('active-touch');
            
            // Ẩn tooltip sau 2 giây
            setTimeout(() => {
                emojiWrapper.classList.remove('active-touch');
            }, 2000);
        }
    });
    
    // Touch để mở picker
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('.post-action-btn') && e.target.closest('.reaction-main-wrap')) {
            const btn = e.target.closest('.post-action-btn');
            const postId = btn.closest('.community-post').dataset.postId;
            
            // Đóng tất cả picker khác
            document.querySelectorAll('.reaction-picker.show').forEach(picker => {
                picker.classList.remove('show');
            });
            
            // Mở picker hiện tại
            const picker = document.getElementById(`react-picker-${postId}`);
            if (picker) {
                picker.classList.add('show');
            }
        }
    });
    
    // Đóng picker khi touch ra ngoài
    document.addEventListener('touchstart', function(e) {
        if (!e.target.closest('.reaction-picker') && !e.target.closest('.reaction-main-wrap')) {
            document.querySelectorAll('.reaction-picker.show').forEach(picker => {
                picker.classList.remove('show');
            });
            
            document.querySelectorAll('.emoji-wrapper.active-touch').forEach(wrapper => {
                wrapper.classList.remove('active-touch');
            });
        }
    });
}

// Khởi tạo touch support
if ('ontouchstart' in window) {
    document.addEventListener('DOMContentLoaded', initReactionPickerTouchSupport);
}
const commentStore = {};

/* ========= Utils ========= */
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

/* ========= Khởi động ========= */
document.addEventListener("DOMContentLoaded", () => {
    // Thiết lập placeholder cho input khi người dùng đã đăng nhập
    const postInput = document.getElementById("community-content");
    if (postInput && window.CURRENT_USERNAME) {
        postInput.placeholder = `${window.CURRENT_USERNAME}, bạn đang nghĩ gì?`;
    }

    const tabButtons = document.querySelectorAll(".feed-tab-btn");
    if (tabButtons.length > 0) {
        tabButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const scope = btn.dataset.scope || "all";
                // Đổi tab hoạt động
                document.querySelectorAll(".feed-tab-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                loadCommunityFeed(1, scope);
            });
        });
    }

    // ⭐ QUAN TRỌNG: Load feed ban đầu - CHỈ KHI CÓ FEED
    const feed = document.getElementById("community-feed");
    if (feed) {
        loadCommunityFeed();
    }
});

// Đổi trạng thái nút gửi comment theo nội dung input
document.addEventListener("input", function (e) {
    if (!e.target.matches('.comment-form input[name="comment"]')) return;

    const input = e.target;
    const form = input.closest(".comment-form");
    const btn = form.querySelector(".comment-send-btn");
    if (!btn) return;

    if (input.value.trim() !== "") {
        btn.classList.add("active"); // có chữ -> nút xanh
    } else {
        btn.classList.remove("active"); // trống -> nút xám
    }
});

/* ========= Tooltip REACTION cho POST ========= */
async function showReactionUsersTooltip(postId, type, ev) {
    clearTimeout(tooltipTimeout);

    const tooltip = document.getElementById("reaction-tooltip");
    const icon =
        ev.target.closest(".reaction-icon") ||
        ev.target.closest(".reaction-count");
    const rect = icon.getBoundingClientRect();

    tooltip.style.display = "block";
    tooltip.innerHTML = "Đang tải...";

    await new Promise(requestAnimationFrame);

    let url = "";
    if (type === "all") {
        url = `${BASE_URL}/backend/api/community/reactions/list.php?post_id=${postId}&all=1`;
    } else {
        url = `${BASE_URL}/backend/api/community/reactions/list.php?post_id=${postId}&type=${type}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const reactionNames = {
        all: "Tất cả",
        like: "Thích",
        love: "Yêu thích",
        care: "Thương thương",
        haha: "Haha",
        wow: "Wow",
        sad: "Buồn",
        angry: "Phẫn nộ",
    };

    const title = `<div class="tooltip-title">${
        reactionNames[type] || "Cảm xúc"
    }</div>`;
    const divider = `<div class="tooltip-divider"></div>`;

    let users = "";

    if (type === "all") {
        if (!data.users.length) {
            users = "<div class='tooltip-user'>Không có ai</div>";
        } else {
            users = data.users
                .slice(0, 30)
                .map(
                    (u) =>
                        `<div class="tooltip-user">${displayName(u)}</div>`
                )
                .join("");
        }
    } else {
        if (!data.users.length) {
            users = "<div class='tooltip-user'>Không có ai</div>";
        } else {
            users = data.users
                .map(
                    (u) =>
                        `<div class="tooltip-user">${displayName(u)}</div>`
                )
                .join("");
        }
    }

    tooltip.innerHTML = title + divider + users;

    await new Promise(requestAnimationFrame);

    const tWidth = tooltip.offsetWidth;
    const tHeight = tooltip.offsetHeight;

    tooltip.style.left = rect.left + rect.width / 2 - tWidth / 2 + "px";
    tooltip.style.top = rect.top - tHeight - 10 + "px";
}

/* ========= Tooltip REACTION cho COMMENT ========= */
async function showCommentReactionUsersTooltip(commentId, type, ev) {
    clearTimeout(tooltipTimeout);

    const tooltip = document.getElementById("reaction-tooltip");
    const icon = ev.target.closest(".cmt-react-icon");
    
    if (!icon) {
        console.error("Không tìm thấy icon reaction");
        return;
    }
    
    const rect = icon.getBoundingClientRect();

    tooltip.style.display = "block";
    tooltip.innerHTML = "Đang tải...";

    await new Promise(requestAnimationFrame);

    try {
        const url = `${BASE_URL}/backend/api/community/comment_reactions/list.php?comment_id=${commentId}&type=${type}`;
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();

        // Kiểm tra dữ liệu trả về
        if (!data.success) {
            tooltip.innerHTML = `<div class="tooltip-error">Lỗi: ${data.error || 'Không thể tải dữ liệu'}</div>`;
            return;
        }

        const reactionNames = {
            like: "Thích",
            love: "Yêu thích", 
            care: "Thương thương",
            haha: "Haha",
            wow: "Wow",
            sad: "Buồn",
            angry: "Phẫn nộ",
        };

        const title = `<div class="tooltip-title">${reactionNames[type] || "Cảm xúc"}</div>`;
        const divider = `<div class="tooltip-divider"></div>`;

        let users = "";
        
        // Kiểm tra data.users có tồn tại và là mảng
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            users = data.users
                .slice(0, 30)
                .map(u => `<div class="tooltip-user">${displayName(u)}</div>`)
                .join("");
        } else {
            users = "<div class='tooltip-user'>Không có ai</div>";
        }

        tooltip.innerHTML = title + divider + users;

        await new Promise(requestAnimationFrame);

        const tWidth = tooltip.offsetWidth;
        const tHeight = tooltip.offsetHeight;

        tooltip.style.left = Math.min(rect.left + rect.width / 2 - tWidth / 2, window.innerWidth - tWidth - 10) + "px";
        tooltip.style.top = rect.top - tHeight - 10 + "px";

    } catch (error) {
        console.error("Lỗi khi tải tooltip:", error);
        tooltip.innerHTML = `<div class="tooltip-error">Lỗi tải dữ liệu</div>`;
    }
}

// Hiển thị reaction picker khi hover vào icon reaction
function openCommentReactionPicker(commentId, ev) {
    const picker = document.getElementById(`cmt-react-picker-${commentId}`);
    if (picker) picker.classList.add("show");
}

// Ẩn reaction picker khi di chuột ra ngoài
function closeCommentReactionPicker(commentId) {
    const picker = document.getElementById(`cmt-react-picker-${commentId}`);
    if (picker) picker.classList.remove("show");
}

// Thêm reaction vào comment
async function toggleCommentReaction(commentId, type) {
    console.log("🟡 Toggle comment reaction:", commentId, type);
    
    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/comment_reactions/toggle.php", {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" 
            },
            body: `comment_id=${encodeURIComponent(commentId)}&type=${encodeURIComponent(type)}`
        });

        const data = await res.json();
        console.log("🟢 Reaction API response:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Không thể cập nhật cảm xúc.");
        }

        // Cập nhật UI
        updateCommentReactionUI(commentId, data);

    } catch (err) {
        console.error("❌ Lỗi toggle comment reaction:", err);
        alert("Lỗi: " + err.message);
    }
}

function updateFollowButtonInPopup(userId, isFollowing) {
    const followButton = document.getElementById(`follow-btn-${userId}`);
    if (followButton) {
        followButton.classList.toggle("following", isFollowing);
        followButton.textContent = isFollowing ? "Đang theo dõi" : "Theo dõi";
    }
}

// Cập nhật UI reaction cho comment
function updateCommentReactionUI(commentId, data) {
    console.log("🟡 Updating comment UI:", commentId, data);
    
    const comment = document.getElementById(`comment-${commentId}`);
    if (!comment) {
        console.error("Không tìm thấy comment:", commentId);
        return;
    }

    // 🟢 FIX: Lấy dữ liệu từ API response
    const reactions = data.reactions || {};
    const summary = reactions.summary || {};
    const total = reactions.total || 0;
    const userReact = reactions.user || null;

    const iconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    // 1. Cập nhật nút "Thích"
    const likeBtn = comment.querySelector(".cmt-action-like");
    if (likeBtn) {
        if (userReact) {
            likeBtn.classList.add("active");
            likeBtn.style.color = reactColorMap[userReact] || "#2078f4";
            likeBtn.textContent = reactTextMap[userReact] || "Thích";
        } else {
            likeBtn.classList.remove("active");
            likeBtn.style.color = "";
            likeBtn.textContent = "Thích";
        }
    }

    // 2. Cập nhật reaction icons
    const reactContainer = comment.querySelector(".comment-react-right");
    if (reactContainer) {
        let html = "";
        
        if (total > 0 && Object.keys(summary).length > 0) {
            // Hiển thị 3 icon đầu tiên
            Object.entries(summary)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .forEach(([type]) => {
                    html += `
                        <img class="cmt-react-icon"
                            src="${iconMap[type] || iconMap.like}"
                            onmouseenter="showCommentReactionUsersTooltip(${commentId}, '${type}', event)"
                            onmouseleave="hideReactionUsersTooltip()"
                            onclick="openCommentReactionUserModal(${commentId}, '${type}')">
                    `;
                });
            
            html += `<span class="react-total">${total}</span>`;
        }
        
        reactContainer.innerHTML = html;
    }

    console.log("✅ Comment reaction UI updated");
}

function hideReactionUsersTooltip() {
    tooltipTimeout = setTimeout(() => {
        const tooltip = document.getElementById("reaction-tooltip");
        if (tooltip) tooltip.style.display = "none";
    }, 100);
}

/* ========= Load feed ========= */
async function loadCommunityFeed(page = 1, scope = COMMUNITY_SCOPE) {
    COMMUNITY_SCOPE = scope;
    const feed = document.getElementById("community-feed");
    if (!feed) return;
    
    // Reset infinite scroll
    resetInfiniteScroll();
    
    // Nếu là tải trang đầu tiên, hiển thị loading
    if (page === 1) {
        feed.innerHTML = `<div class="feed-loading">
            <div class="loading-spinner">
                <div class="spinner-circle"></div>
                <div class="spinner-circle"></div>
                <div class="spinner-circle"></div>
            </div>
            <p>Đang tải bài viết...</p>
        </div>`;
    }
    
    try {
        // ⭐ THÊM TIMESTAMP ĐỂ TRÁNH CACHE
        const timestamp = new Date().getTime();
        const res = await fetch(
            `${BASE_URL}/backend/api/community/posts/list.php?page=${page}&scope=${encodeURIComponent(scope)}&_=${timestamp}`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const posts = data.posts || [];
        
        if (page === 1) {
            if (!posts.length) {
                feed.innerHTML = `<div class="empty-feed">
                    <svg width="80" height="64" viewBox="0 0 24 24"><path fill="#cfd8dc" d="M5 20h14a2 2 0 0 0 2-2v-7h-4l-2-3H9L7 11H3v7a2 2 0 0 0 2 2"/></svg>
                    <h3>Chưa có bài viết nào.</h3>
                    <p>Hãy là người đầu tiên chia sẻ câu chuyện về hồ Koi của bạn!</p>
                </div>`;
                return;
            }

            feed.innerHTML = posts.map(renderPostCard).join("");
        } else {
            // Nếu không phải trang đầu, thêm vào cuối
            feed.innerHTML += posts.map(renderPostCard).join("");
        }
        
        // Cập nhật global posts data
        window._communityPosts = window._communityPosts || {};
        posts.forEach(p => window._communityPosts[p.PostID] = p);
        
        // Cập nhật phân trang
        currentPage = page;
        const totalPosts = data.total_posts || 0;
        const loadedPosts = document.querySelectorAll('.community-post').length;
        
        if (loadedPosts >= totalPosts) {
            hasMorePosts = false;
        } else {
            hasMorePosts = true;
        }
        
        // Khởi tạo lại các tính năng
        setTimeout(() => {
            if (window.CURRENT_USER_ROLE === 'Admin') {
                initPinFeatures();
            }
            classifyPostByUserRole();
            addEventListenersToNewPosts();
            
            // Kích hoạt infinite scroll sau khi tải xong
            if (page === 1) {
                setupInfiniteScroll();
            }
        }, 100);
        
    } catch (e) {
        console.error('Lỗi tải feed:', e);
        
        if (page === 1) {
            feed.innerHTML = `<div class="feed-error">
                <span class="material-icons">error</span>
                <h3>Lỗi tải dữ liệu</h3>
                <p>${escapeHtml(e.message)}</p>
                <button onclick="retryLoadFeed()" class="retry-btn">
                    <span class="material-icons">refresh</span>
                    Thử lại
                </button>
            </div>`;
        }
    }
}
// Hàm thiết lập infinite scroll
function setupInfiniteScroll() {
    // Xóa event listener cũ nếu có
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('touchmove', handleScroll);
    
    // Thêm event listener mới
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    
    // Thêm event listener cho resize để xử lý responsive
    window.addEventListener('resize', handleScroll);
    
    console.log('✅ Infinite scroll đã được kích hoạt');
}

// Hàm tắt infinite scroll (khi cần)
function disableInfiniteScroll() {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('touchmove', handleScroll);
    window.removeEventListener('resize', handleScroll);
    
    if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer);
    }
    
    console.log('❌ Infinite scroll đã bị tắt');
}
// Thêm CSS cho infinite scroll
const infiniteScrollCSS = `
    /* Loading spinner */
    .loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin: 20px 0;
    }
    
    .spinner-circle {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #1877f2;
        animation: bounce 1.4s infinite ease-in-out both;
    }
    
    .spinner-circle:nth-child(1) {
        animation-delay: -0.32s;
    }
    
    .spinner-circle:nth-child(2) {
        animation-delay: -0.16s;
    }
    
    @keyframes bounce {
        0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    /* Feed loading */
    .feed-loading {
        text-align: center;
        padding: 40px 20px;
        color: #65676b;
    }
    
    .feed-loading .loading-spinner {
        margin-bottom: 15px;
    }
    
    /* Infinite scroll loading */
    .infinite-scroll-loading {
        text-align: center;
        padding: 30px 20px;
        color: #65676b;
        margin: 10px 0;
    }
    
    /* No more posts */
    .no-more-posts {
        text-align: center;
        padding: 30px 20px;
        color: #65676b;
        border-top: 1px solid #e4e6eb;
        margin: 20px 0;
    }
    
    .no-more-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    
    .no-more-content .material-icons {
        font-size: 32px;
        color: #42b72a;
    }
    
    /* Load more error */
    .load-more-error {
        text-align: center;
        padding: 30px 20px;
        color: #f44336;
        border: 1px solid #ffcdd2;
        border-radius: 8px;
        margin: 20px;
        background: #ffebee;
    }
    
    .retry-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #1877f2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        margin-top: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
    }
    
    .retry-btn:hover {
        background: #166fe5;
    }
    
    /* Feed error */
    .feed-error {
        text-align: center;
        padding: 40px 20px;
        color: #f44336;
    }
    
    .feed-error .material-icons {
        font-size: 48px;
        margin-bottom: 15px;
        color: #f44336;
    }
    
    /* Empty feed */
    .empty-feed {
        text-align: center;
        padding: 60px 20px;
        color: #65676b;
    }
    
    .empty-feed svg {
        margin-bottom: 20px;
        opacity: 0.6;
    }
    
    /* Smooth transitions */
    .community-post {
        transition: opacity 0.3s ease;
    }
    
    .community-post.loading {
        opacity: 0.5;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .infinite-scroll-loading,
        .no-more-posts,
        .load-more-error {
            padding: 20px 15px;
            margin: 10px 15px;
        }
        
        .spinner-circle {
            width: 10px;
            height: 10px;
        }
    }
`;

// Thêm CSS vào head
if (!document.getElementById('infinite-scroll-css')) {
    const style = document.createElement('style');
    style.id = 'infinite-scroll-css';
    style.textContent = infiniteScrollCSS;
    document.head.appendChild(style);
}
/* ========= Khởi động ========= */
document.addEventListener("DOMContentLoaded", () => {
    // Thiết lập placeholder cho input khi người dùng đã đăng nhập
    const postInput = document.getElementById("community-content");
    if (postInput && window.CURRENT_USERNAME) {
        postInput.placeholder = `${window.CURRENT_USERNAME}, bạn đang nghĩ gì?`;
    }

    const tabButtons = document.querySelectorAll(".feed-tab-btn");
    if (tabButtons.length > 0) {
        tabButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const scope = btn.dataset.scope || "all";
                // Đổi tab hoạt động
                document.querySelectorAll(".feed-tab-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                
                // Reset và tải feed mới
                resetInfiniteScroll();
                loadCommunityFeed(1, scope);
            });
        });
    }

    // ⭐ QUAN TRỌNG: Load feed ban đầu - CHỈ KHI CÓ FEED
    const feed = document.getElementById("community-feed");
    if (feed) {
        loadCommunityFeed();
        
        // Tự động kích hoạt infinite scroll sau 1 giây
        setTimeout(() => {
            setupInfiniteScroll();
        }, 1000);
    }
    
    // Thêm event listener cho việc reset infinite scroll khi quay lại trang
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Nếu trang được tải từ cache, reset infinite scroll
            resetInfiniteScroll();
            setupInfiniteScroll();
        }
    });
});
// Hàm thử lại khi tải feed lỗi
function retryLoadFeed() {
    loadCommunityFeed(1, COMMUNITY_SCOPE);
}
function renderReactionIcons(summary, postId) {
    if (!summary || Object.keys(summary).length === 0) return "";

    const icons = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    return Object.entries(summary)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(
            ([type]) => `
            <span class="reaction-icon"
                onmouseenter="showReactionUsersTooltip(${postId}, '${type}', event)"
                onmouseleave="hideReactionUsersTooltip()"
                onclick="openReactionUserModal(${postId}, '${type}')"
            >
                <img src="${icons[type]}">
            </span>
        `
        )
        .join("");
}

function processContentWithMentions(content) {
    if (!content) return '';
    
    // Chuyển đổi cả user-tag và user-mention thành clickable link
    let processed = content;
    
    // Xử lý user-tag (cũ)
    processed = processed.replace(
        /<span class="user-tag" data-user-id="(\d+)" data-username="([^"]*)">([^<]+)<\/span>/g,
        (match, userId, username, fullName) => {
            return `<span class="user-mention" data-user-id="${userId}" data-username="${username}" 
                     onclick="openUserProfile('${username}')" 
                     style="color: #385898; font-weight: 600; cursor: pointer;">
                    ${fullName}
                </span>`;
        }
    );
    
    // Xử lý user-mention (mới)
    processed = processed.replace(
        /<span class="user-mention" data-user-id="(\d+)" data-username="([^"]*)">@([^<]+)<\/span>/g,
        (match, userId, username, fullName) => {
            return `<span class="user-mention" data-user-id="${userId}" data-username="${username}" 
                     onclick="openUserProfile('${username}')" 
                     style="color: #385898; font-weight: 600; cursor: pointer;">
                    @${fullName}
                </span>`;
        }
    );
    
    return processed;
}

/* ===== PROCESS MENTIONS IN CONTENT ===== */
function processMentionsInContent(content) {
    if (!content) return '';
    
    console.log("🔍 processMentionsInContent INPUT:", JSON.stringify(content));
    
    let processed = content;
    
    // 🟢 LOẠI BỎ KHOẢNG TRẮNG ĐẦU NGAY LẬP TỨC
    processed = processed.replace(/^[\s\u00A0]+/, '');
    
    // Xử lý user-mention - ĐẢM BẢO KHÔNG THÊM KHOẢNG TRẮNG
    processed = processed.replace(
        /<span class="user-mention"[^>]*data-user-id="(\d+)"[^>]*data-username="([^"]*)"[^>]*>([^<]+)<\/span>/g,
        function(match, userId, username, fullName) {
            fullName = fullName.trim();
            // 🟢 KHÔNG THÊM KHOẢNG TRẮNG, KHÔNG THÊM @
            return `<span class="user-mention" data-user-id="${userId}" data-username="${username}" onclick="if(window.openUserProfile)window.openUserProfile('${username}')" style="color:#385898;font-weight:600;cursor:pointer;margin:0;padding:0;display:inline;">${fullName}</span>`;
        }
    );
    
    // Xử lý user-tag (cũ)
    processed = processed.replace(
        /<span class="user-tag"[^>]*data-user-id="(\d+)"[^>]*data-username="([^"]*)"[^>]*>([^<]+)<\/span>/g,
        function(match, userId, username, fullName) {
            fullName = fullName.trim();
            // 🟢 KHÔNG THÊM KHOẢNG TRẮNG, KHÔNG THÊM @
            return `<span class="user-mention" data-user-id="${userId}" data-username="${username}" onclick="if(window.openUserProfile)window.openUserProfile('${username}')" style="color:#385898;font-weight:600;cursor:pointer;margin:0;padding:0;display:inline;">${fullName}</span>`;
        }
    );
    
    // 🟢 LOẠI BỎ KHOẢNG TRẮNG THỪA
    processed = processed.replace(/\s+/g, ' ');
    processed = processed.trim();
    
    console.log("🔍 processMentionsInContent OUTPUT:", JSON.stringify(processed));
    return processed;
}

/* ========= REACTION POPUP cho POST ========= */
async function openReactionUserModal(postId, typeClicked = "all") {
    const popup = document.getElementById("fb-reaction-popup");
    const tabWrap = document.getElementById("fb-reaction-tabs");
    const listWrap = document.getElementById("fb-reaction-list");

    popup.classList.add("show");
    tabWrap.innerHTML = "Đang tải...";
    listWrap.innerHTML = "";

    try {
        const res = await fetch(
            `${BASE_URL}/backend/api/community/reactions/list.php?post_id=${postId}&all=1`
        );
        const data = await res.json();

        if (!data || !data.summary) {
            tabWrap.innerHTML = "<p>Lỗi tải dữ liệu</p>";
            return;
        }

        const icons = {
            like: `${BASE_URL}/assets/images/like.png`,
            love: `${BASE_URL}/assets/images/love.png`,
            care: `${BASE_URL}/assets/images/care.png`,
            haha: `${BASE_URL}/assets/images/haha.png`,
            wow: `${BASE_URL}/assets/images/wow.png`,
            sad: `${BASE_URL}/assets/images/sad.png`,
            angry: `${BASE_URL}/assets/images/angry.png`,
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
                <div class="fb-tab ${
                    t.key === typeClicked ? "active" : ""
                }"
                    onclick="loadFbReactionTab('${postId}', '${t.key}')">
                    ${t.icon ? `<img src="${t.icon}">` : ""}
                    ${t.label}
                </div>
            `
            )
            .join("");

        await loadFbReactionTab(postId, typeClicked);
    } catch (error) {
        console.error("Error opening reaction modal:", error);
        tabWrap.innerHTML = "<p>Lỗi tải dữ liệu</p>";
    }
}
function closeReactionUserModal() {
    const popup = document.getElementById("fb-reaction-popup");
    if (popup) {
        popup.classList.remove("show");
    }
}

async function loadFbReactionTab(postId, type) {
    const listWrap = document.getElementById("fb-reaction-list");
    const allTabs = document.querySelectorAll(".fb-tab");

    // Cập nhật tab active
    allTabs.forEach((t) => t.classList.remove("active"));
    document
        .querySelector(
            `.fb-tab[onclick="loadFbReactionTab('${postId}', '${type}')"]`
        )
        ?.classList.add("active");

    listWrap.innerHTML = "Đang tải...";

    try {
        const res = await fetch(
            `${BASE_URL}/backend/api/community/reactions/list.php?post_id=${postId}&type=${type}`
        );
        const data = await res.json();

        if (!data.users || !data.users.length) {
            listWrap.innerHTML = "<p class='no-users'>Không có ai</p>";
            return;
        }

        listWrap.innerHTML = data.users
        .map((u) => {
            const name = displayName(u);
            const avatar = u.AvatarURL && u.AvatarURL.trim() !== ""
                ? `${BASE_URL}/uploads/avatars/${u.AvatarURL}`
                : null;
            const firstChar = (name || "?")[0].toUpperCase();

            const iconMap = {
                like: `${BASE_URL}/assets/images/like.png`,
                love: `${BASE_URL}/assets/images/love.png`,
                care: `${BASE_URL}/assets/images/care.png`,
                haha: `${BASE_URL}/assets/images/haha.png`,
                wow: `${BASE_URL}/assets/images/wow.png`,
                sad: `${BASE_URL}/assets/images/sad.png`,
                angry: `${BASE_URL}/assets/images/angry.png`,
            };

            const reactIcon = iconMap[u.Type] || iconMap.like;
            
            // 🟢 QUAN TRỌNG: Kiểm tra nếu là chính người dùng hiện tại thì ẩn nút Theo dõi
            const isCurrentUser = u.UserID == window.CURRENT_USER_ID;

            return `
                <div class="fb-user-item">
                    <div class="fb-avatar-wrap" onclick="openUserProfile('${u.Username}')">
                    ${
                        avatar
                        ? `<img class="fb-user-avatar"
                                src="${avatar}"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : `<div class="avatar-letter">${firstChar}</div>`
                    }
                    <div class="avatar-letter" style="display:none;">${firstChar}</div>
                    <img class="fb-react-icon" src="${reactIcon}">
                    </div>

                    <div class="fb-user-info" onclick="openUserProfile('${u.Username}')">
                    <span class="fb-user-name">${escapeHtml(name)}</span>
                    </div>

                    ${!isCurrentUser ? `
                    <button class="follow-btn ${u.IsFollowing ? 'following' : ''}"
                        id="follow-btn-${u.UserID}"
                        data-user-follow="${u.UserID}"
                        onclick="event.stopPropagation(); toggleFollowInPopup(${u.UserID})">
                        ${u.IsFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                    ` : `
                    <div class="current-user-badge" style="color: #666; font-size: 12px; padding: 5px 10px;">
                        Bạn
                    </div>
                    `}
                </div>`;
        })
        .join("");
    } catch (error) {
        console.error("Error loading reaction tab:", error);
        listWrap.innerHTML = "<p class='error'>Lỗi tải dữ liệu</p>";
    }
}


function closeFbReactionPopup() {
    closeReactionUserModal();
}
function renderPostMediaLayout(media, postId) {
    const count = media.length;
    if (count === 0) return "";
    
    console.log(`🎨 Rendering ${count} media for post ${postId}`);
    console.log('Media data:', media); // Thêm log này để debug

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
    if (count === 1) {
        console.log('✅ Rendering SINGLE image layout');
        return `<div class="post-media-grid grid-1">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    }
    
    if (count === 2) {
        console.log('✅ Rendering 2 images layout');
        return `<div class="post-media-grid grid-2">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    }
    
    if (count === 3) {
        console.log('✅ Rendering 3 images layout');
        return `<div class="post-media-grid grid-3">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    }
    
    if (count === 4) {
        console.log('✅ Rendering 4 images layout');
        return `<div class="post-media-grid grid-4">${media.map((m, i) => itemHTML(m, i)).join('')}</div>`;
    }
    
    // Layout cho 5 ảnh - Facebook style
    if (count === 5) {
        console.log('✅ Rendering 5 images layout');
        let html = `<div class="post-media-grid grid-5">`;
        
        for (let i = 0; i < 5; i++) {
            const mediaItem = media[i];
            const isVideo = mediaItem.MediaType === "video";
            const url = escapeHtml(mediaItem.FilePath);
            
            // Tính toán vị trí grid
            let gridStyle = '';
            if (i === 0) {
                gridStyle = 'grid-column: 1 / 2; grid-row: 1 / 3;'; // Ảnh lớn bên trái chiếm 2 hàng
            } else if (i === 1) {
                gridStyle = 'grid-column: 2 / 3; grid-row: 1 / 2;'; // Ảnh nhỏ 1 (góc trên phải)
            } else if (i === 2) {
                gridStyle = 'grid-column: 3 / 4; grid-row: 1 / 2;'; // Ảnh nhỏ 2 (góc trên phải)
            } else if (i === 3) {
                gridStyle = 'grid-column: 2 / 3; grid-row: 2 / 3;'; // Ảnh nhỏ 3 (góc dưới phải)
            } else if (i === 4) {
                gridStyle = 'grid-column: 3 / 4; grid-row: 2 / 3;'; // Ảnh nhỏ 4 (góc dưới phải)
            }
            
            html += `
                <div class="media-item media-${i}"
                    style="${gridStyle}"
                    onclick="openMediaViewer('${url}', ${postId}, ${i})">
                    ${isVideo ? 
                        `<video controls><source src="${url}" type="video/mp4"></video>` : 
                        `<img src="${url}" alt="Ảnh bài viết" loading="lazy">`
                    }
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }

    // Layout 6+ ảnh - Facebook style
    if (count >= 6) {
        console.log(`✅ Rendering ${count} images layout (6+)`);
        let html = `<div class="post-media-grid grid-many">`;
        
        const displayCount = Math.min(count, 6);
        
        for (let i = 0; i < displayCount; i++) {
            const mediaItem = media[i];
            const isLast = i === 5 && count > 6; // Chỉ là overlay nếu count > 6
            const remaining = count - 6;
            
            // Tính toán vị trí grid
            let gridStyle = '';
            if (i === 0) {
                gridStyle = 'grid-column: 1 / 3; grid-row: 1 / 3;'; // 2x2
            } else if (i === 1) {
                gridStyle = 'grid-column: 3 / 4; grid-row: 1 / 2;';
            } else if (i === 2) {
                gridStyle = 'grid-column: 3 / 4; grid-row: 2 / 3;';
            } else if (i === 3) {
                gridStyle = 'grid-column: 1 / 2; grid-row: 3 / 4;';
            } else if (i === 4) {
                gridStyle = 'grid-column: 2 / 3; grid-row: 3 / 4;';
            } else if (i === 5) {
                gridStyle = 'grid-column: 3 / 4; grid-row: 3 / 4;';
            }
            
            const isVideo = mediaItem.MediaType === "video";
            const url = escapeHtml(mediaItem.FilePath);
            
            html += `
                <div class="media-item media-${i} ${isLast && remaining > 0 ? 'overlay-item' : ''}"
                     style="${gridStyle}"
                     onclick="openMediaViewer('${url}', ${postId}, ${i})">
                    ${isVideo ? 
                        `<video controls><source src="${url}" type="video/mp4"></video>` : 
                        `<img src="${url}" alt="Ảnh bài viết" loading="lazy">`
                    }
                    ${isLast && remaining > 0 ? `<div class="more-text">+${remaining}</div>` : ''}
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }
    
    console.log('❌ No layout matched for count:', count);
    return "";
}
// ===== RENDER POST CARD (FULL FUNCTION WITH TOOLTIP FIX) =====
function renderPostCard(post) {
    const user = post.user || {};
    
    console.log("🎨 Rendering post - User data:", user);
    console.log("🎨 Role:", user.Role);
    
    const media = post.media || [];
    const reactions = post.reactions || {};
    
    const comments = post.comments || { total: 0, items: [] };
    const created = post.CreatedAt ? post.CreatedAt.slice(0, 16) : "";
    
    const currentUserIsAdmin = window.CURRENT_USER_ROLE === 'Admin';
    const isCurrentUserPost = user.UserID == window.CURRENT_USER_ID;
    const isPostByAdmin = user.Role && user.Role.toString().toLowerCase().trim() === 'admin';
    const isPinned = post.IsPinned || post.is_pinned || false;
    
    // 🟢 THÊM: Kiểm tra trạng thái theo dõi
    const isFollowing = (post.isFollowing === true) || 
                    (user.IsFollowing === true) || 
                    (user.IsFollowing === 1) || 
                    (user.IsFollowing === "1") || 
                    false;
    
    const isOriginalDeleted = post.is_original_deleted === 1 || 
                            post.is_original_deleted === true ||
                            post.original_deleted === 1 ||
                            post.original_deleted === true ||
                            false;
    
    console.log("🔄 Post rendering:", {
        postId: post.PostID,
        originalId: post.OriginalPostID,
        isOriginalDeleted: isOriginalDeleted,
        hasOriginal: !!post.OriginalPost
    });
    
    let roleBadgeHtml = '';
    let postClass = isPinned ? 'pinned-post' : '';

    if (user.Role) {
        const role = (user.Role || '').toString().toLowerCase().trim();
        
        if (role === 'admin') {
            roleBadgeHtml = `<span class="author-role-badge role-admin admin-post-badge">Admin</span>`;
            postClass += ' post-by-admin';
        } 
        else if (role === 'customer') {
            roleBadgeHtml = `<span class="author-role-badge role-customer">Customer</span>`;
        }
        else if (role === 'staff') {
            roleBadgeHtml = `<span class="author-role-badge role-staff">Staff</span>`;
        }
        else if (role === 'mod' || role === 'moderator') {
            roleBadgeHtml = `<span class="author-role-badge role-mod">Mod</span>`;
        }
        else if (role === 'vip') {
            roleBadgeHtml = `<span class="author-role-badge role-vip">VIP</span>`;
        }
        else if (role && role !== '') {
            roleBadgeHtml = `<span class="author-role-badge role-${escapeHtml(role)}">${escapeHtml(user.Role)}</span>`;
        }
    }
    
    const reactIconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    const reactTextMapLocal = {
        like: "Đã thích",
        love: "Yêu thích",
        care: "Thương thương",
        haha: "Haha",
        wow: "Wow",
        sad: "Buồn",
        angry: "Tức giận",
    };

    const reactColorMapLocal = {
        like: "#2078f4",
        love: "#f53b57",
        care: "#f7b125",
        haha: "#f7b125",
        wow: "#f7b125",
        sad: "#f7b125",
        angry: "#e03023",
    };
    
    // 🟢 Nếu là bài chia sẻ
    if (post.OriginalPostID && post.OriginalPost) {
        const original = post.OriginalPost;
        const sharer = user;
        const shareTime = post.CreatedAt ? post.CreatedAt.slice(0, 16) : "";
        const sharerAvatar = buildAvatarURL(sharer);
        const totalReact = reactions.total || 0;
        const userReact = reactions.user || null;

        const reactLabel = userReact ? reactTextMapLocal[userReact] : "Thích";
        const reactIcon = userReact
            ? reactIconMap[userReact]
            : `${BASE_URL}/assets/images/like-outline.png`;
        const reactColor = userReact ? reactColorMapLocal[userReact] : "#6b6b6b";

        const isSharerCurrentUser = sharer.UserID == window.CURRENT_USER_ID;
        
        let sharerRoleBadgeHtml = '';
        if (sharer.Role) {
            const role = (sharer.Role || '').toString().toLowerCase().trim();
            if (role === 'admin') {
                sharerRoleBadgeHtml = `<span class="author-role-badge role-admin">Admin</span>`;
            } 
            else if (role === 'customer') {
                sharerRoleBadgeHtml = `<span class="author-role-badge role-customer">Customer</span>`;
            }
        }
        
        // 🟢 THÊM: Nút theo dõi cho người chia sẻ (chỉ khi không phải chính mình)
        let sharerFollowButtonHtml = '';
        if (!isSharerCurrentUser) {
            sharerFollowButtonHtml = `
                <button class="follow-header-btn ${sharer.IsFollowing ? 'following' : ''}" 
                        onclick="toggleFollow(${sharer.UserID})"
                        data-user-id="${sharer.UserID}"
                        style="margin-left: auto; margin-right: 10px; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    ${sharer.IsFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </button>
            `;
        }
        
        // 🟢 QUAN TRỌNG: HIỂN THỊ NẾU BÀI GỐC ĐÃ BỊ XÓA
        if (isOriginalDeleted) {
            console.log("📌 Rendering DELETED original shared post:", post.PostID);
            
            // 🟢 LẤY THÔNG TIN GỐC ĐÃ LƯU
            let originalUser, originalContent, originalAvatar, originalCreatedAt;
            
            originalUser = {
                FullName: post.original_fullname || original?.original_info?.fullname || "Người dùng",
                Username: post.original_username || original?.original_info?.username || "unknown",
                AvatarURL: post.original_avatar || original?.original_info?.avatar || null,
                Role: post.original_role || original?.original_info?.role || null,
                UserID: post.original_user_id || original?.original_info?.user_id || 0
            };
            originalContent = post.original_content || original?.Content || "Nội dung bài viết đã bị xóa";
            originalAvatar = buildAvatarURL(originalUser);
            originalCreatedAt = post.original_created_at || original?.original_info?.created_at || "";

            let actionsHtml = '';
            
            if (isSharerCurrentUser) {
                actionsHtml = `
                <div class="post-actions">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                </div>
                `;
            } else if (currentUserIsAdmin) {
                actionsHtml = `
                <div class="post-actions">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                    <button class="post-action-btn admin-manage-btn" onclick="showAdminManageMenu(${post.PostID})">
                        <span class="material-icons">admin_panel_settings</span>
                        <span>Quản lý</span>
                    </button>
                </div>
                `;
            } else {
                actionsHtml = `
                <div class="post-actions">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                </div>
                `;
            }

            // Menu 3 chấm - ĐÃ SỬA: Thêm event listener trực tiếp
            let menuHtml = '';
            if (isSharerCurrentUser) {
                menuHtml = `
                    <div class="post-menu">
                        <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                            more_horiz
                        </span>
                        <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                            ${currentUserIsAdmin && isPinned !== undefined ? `
                            <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                                <span class="material-icons">push_pin</span>
                                ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                            </button>
                            <div class="post-menu-divider"></div>
                            ` : ''}
                            <button class="post-menu-item delete" onclick="deletePost(${post.PostID})">
                                <span class="material-icons">delete</span>
                                Xóa bài chia sẻ
                            </button>
                        </div>
                    </div>
                `;
            } else if (currentUserIsAdmin) {
                menuHtml = `
                    <div class="post-menu">
                        <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                            more_horiz
                        </span>
                        <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                            ${isPinned !== undefined ? `
                            <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                                <span class="material-icons">push_pin</span>
                                ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                            </button>
                            <div class="post-menu-divider"></div>
                            ` : ''}
                            <div class="admin-section">
                                <div class="admin-section-title">Quản trị viên</div>
                                <button class="admin-action-btn delete" onclick="adminDeletePost(${post.PostID})">
                                    <span class="material-icons">delete_forever</span>
                                    Xóa bài viết
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Xác định class cho bài chia sẻ
            let sharedPostClass = '';
            if (currentUserIsAdmin && !isSharerCurrentUser) {
                sharedPostClass = 'admin-viewing-others';
            } else if (currentUserIsAdmin && isSharerCurrentUser) {
                sharedPostClass = 'admin-viewing-own';
            } else {
                sharedPostClass = 'user-post';
            }

            return `
            <article class="community-post shared-post deleted-original ${sharedPostClass}" 
                     data-post-id="${post.PostID}" 
                     data-user-id="${sharer.UserID || 0}"
                     data-original-user-id="${originalUser.UserID || 0}"
                     data-original-deleted="1">
            
            ${isPinned ? `<div class="pin-badge" title="Bài viết đã được ghim lên đầu trang">📌 ĐÃ GHIM</div>` : ''}
            
            <header class="post-header">
                <!-- 🟢 CẬP NHẬT: Click avatar mở bằng UserID -->
                <div class="post-avatar" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">
                ${sharerAvatar
                    ? `<img src="${sharerAvatar}" class="post-avatar-img"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">`
                    : `<div class="avatar-circle" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>`
                }
                <div class="avatar-circle" style="display:none;">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>
                </div>

                <div class="post-meta">
                <div class="post-author">
                    <!-- 🟢 CẬP NHẬT: Click tên mở bằng UserID -->
                    <span class="author-name" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">
                    ${escapeHtml(displayName(sharer))}
                    </span>
                    ${sharerRoleBadgeHtml}
                </div>
                <div class="post-time">${escapeHtml(shareTime)}</div>
                </div>

                ${sharerFollowButtonHtml}

                ${menuHtml}
                
                ${currentUserIsAdmin ? `
                <div class="pin-icon" onclick="togglePinPost(${post.PostID})" title="${isPinned ? 'Bài đã ghim (bấm để bỏ ghim)' : 'Ghim bài viết'}">
                    <span class="material-icons" ${isPinned ? 'style="color:#ff9800;"' : ''}>push_pin</span>
                </div>
                ` : ''}
            </header>
                ${post.Content ? `<div class="shared-caption">${escapeHtml(post.Content)}</div>` : ""}

                <!-- 🟢 HIỂN THỊ THÔNG BÁO BÀI GỐC ĐÃ BỊ XÓA -->
                <div class="shared-box deleted-content">
                    <div class="deleted-message">
                        <div class="deleted-header">
                            <span class="material-icons" style="color:#ff9800; font-size: 24px;">delete</span>
                            <h3 style="margin:0; color:#333; font-size:16px; font-weight:600;">Bài viết gốc đã bị xóa</h3>
                        </div>
                        <p class="deleted-description" style="color:#666; margin:8px 0 15px 0; font-size:14px;">
                            Bài viết mà bạn chia sẻ đã không còn tồn tại.
                        </p>
                        
                        <!-- THÔNG TIN NGƯỜI ĐĂNG GỐC -->
                        <div class="original-info" style="border-top:1px solid #e0e0e0; padding-top:15px;">
                            <div class="original-user" style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                                <!-- 🟢 CẬP NHẬT: Click avatar mở bằng UserID -->
                                <div class="original-avatar" onclick="openUserProfileById(${originalUser.UserID || 0})" style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#e0e0e0; cursor:pointer;">
                                ${originalAvatar
                                    ? `<img src="${originalAvatar}" style="width:100%; height:100%; object-fit:cover; cursor: pointer;"
                                            onclick="openUserProfileById(${originalUser.UserID || 0})">`
                                    : `<div class="avatar-circle" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#2196f3; color:white; font-weight:bold; font-size:16px; cursor: pointer;"
                                        onclick="openUserProfileById(${originalUser.UserID || 0})">
                                        ${escapeHtml((originalUser.FullName || originalUser.Username || "?")[0])}
                                    </div>`
                                }
                                </div>
                                <div class="original-details" style="flex:1; font-size:14px;">
                                    <!-- 🟢 CẬP NHẬT: Click tên mở bằng UserID -->
                                    <strong class="original-name" onclick="openUserProfileById(${originalUser.UserID || 0})" style="cursor:pointer; color:#385898; font-weight:600; display:block; margin-bottom:2px;">
                                        ${escapeHtml(displayName(originalUser))}
                                    </strong>
                                    <span style="color:#666; font-size:13px;">đã đăng bài viết này</span>
                                    ${originalCreatedAt ? `<span class="original-time" style="color:#999; font-size:12px; margin-left:5px;">• ${escapeHtml(originalCreatedAt.slice(0, 16))}</span>` : ''}
                                </div>
                            </div>
                            
                            <!-- HIỂN THỊ NỘI DUNG CŨ NẾU CÓ -->
                            ${originalContent && originalContent !== "Nội dung bài viết đã bị xóa" ? `
                                <div class="original-preview" style="background:white; padding:12px; border-radius:8px; border-left:3px solid #ff9800; margin-top:10px;">
                                    <p class="original-text" style="color:#666; font-style:italic; margin:0; line-height:1.4; font-size:14px;">
                                        ${escapeHtml(originalContent)}
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
            <div class="post-stats">
                ${totalReact > 0
                    ? `<div class="stat-item reaction-display">
                        ${renderReactionIcons(reactions.summary, post.PostID)}
                        <span class="reaction-count"
                            onmouseenter="showReactionUsersTooltip(${post.PostID}, 'all', event)"
                            onmouseleave="hideReactionUsersTooltip()"
                            onclick="openReactionUserModal(${post.PostID}, 'all')">
                            ${totalReact}
                        </span>
                    </div>` : ""
                }
                ${comments.total > 0
                    ? `<span class="stat-item comment-count clickable"
                            onclick="toggleComments(${post.PostID})">
                            ${comments.total} bình luận
                        </span>` : ""
                }
            </div>

            ${actionsHtml}

            <div class="comments-wrapper" 
                    id="comments-${post.PostID}" 
                    data-loaded="0" 
                    data-mode="top" 
                    data-open="0" 
                    style="display:none;">

                <div class="comment-filter">
                <button type="button" class="comment-filter-btn"
                        id="comment-filter-btn-${post.PostID}"
                        onclick="toggleCommentFilterMenu(${post.PostID})">
                    <span id="comment-filter-text-${post.PostID}">Hot nhất</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="comment-filter-menu" id="comment-filter-menu-${post.PostID}">
                    <button onclick="changeCommentFilter(${post.PostID}, 'hot')">
                    <strong>Hot nhất</strong><br>
                    <small>Hiển thị bình luận được yêu thích nhiều nhất trước tiên.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'newest')">
                    <strong>Mới nhất</strong><br>
                    <small>Hiển thị các bình luận mới nhất trước tiên.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'following')">
                    <strong>Người bạn đang theo dõi</strong><br>
                    <small>Chỉ hiển thị bình luận từ người bạn theo dõi.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'all')">
                    <strong>Tất cả bình luận</strong><br>
                    <small>Hiển thị tất cả bình luận, bao gồm cả nội dung có thể là spam.</small>
                    </button>
                </div>
                </div>

                <div class="comment-list" id="comment-list-${post.PostID}"></div>

                <form class="comment-form" onsubmit="submitComment(event, ${post.PostID})">
                <input type="text" name="comment" placeholder="Viết bình luận..." autocomplete="off">
                <button type="submit" class="comment-send-btn">
                    <span class="material-icons">send</span>
                </button>
                </form>
                </div>
            </article>`;
        } else {
            // 🟢 BÀI CHIA SẺ BÌNH THƯỜNG (bài gốc chưa bị xóa)
            console.log("📌 Rendering NORMAL shared post:", post.PostID);
            
            const originalUser = original;
            const originalContent = original.Content || "";
            const originalAvatar = buildAvatarURL(original);
            const originalCreatedAt = original.CreatedAt ? original.CreatedAt.slice(0, 16) : "";
            
            const isOriginalPostByAdmin = originalUser.Role && originalUser.Role.toString().toLowerCase().trim() === 'admin';
            
            // Xác định trạng thái
            const isSharedAdminViewingOthers = currentUserIsAdmin && !(sharer.UserID == window.CURRENT_USER_ID);
            const isSharedAdminOwnPost = currentUserIsAdmin && (sharer.UserID == window.CURRENT_USER_ID);
            
            // Xử lý role badge
            let originalRoleBadgeHtml = '';
            if (originalUser.Role) {
                const role = originalUser.Role.toLowerCase().trim();
                if (role === 'admin') {
                    originalRoleBadgeHtml = `<span class="author-role role-admin" style="margin-left: 5px; font-size: 10px;">Admin</span>`;
                }
                else if (role === 'customer') {
                    originalRoleBadgeHtml = `<span class="author-role role-customer" style="margin-left: 5px; font-size: 10px;">Customer</span>`;
                }
            }
            
            // 🟢 THÊM: Nút theo dõi cho người chia sẻ
            let sharerFollowButtonHtml = '';
            if (!isSharerCurrentUser) {
                sharerFollowButtonHtml = `
                    <button class="follow-header-btn ${sharer.IsFollowing ? 'following' : ''}" 
                            onclick="toggleFollow(${sharer.UserID})"
                            data-user-id="${sharer.UserID}"
                            style="margin-left: auto; margin-right: 10px; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                        ${sharer.IsFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                `;
            }
            
            // Tạo HTML cho nút actions
            let actionsHtml = '';
            let actionsClass = '';
            
            if (isSharedAdminOwnPost) {
                actionsClass = 'two-buttons';
                actionsHtml = `
                <div class="post-actions ${actionsClass}">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                </div>
                `;
            }
            else if (isSharedAdminViewingOthers && !isOriginalPostByAdmin) {
                actionsClass = '';
                actionsHtml = `
                <div class="post-actions">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                    <button class="post-action-btn" onclick="sharePost(${original.PostID})">
                        <span class="material-icons">share</span>
                        <span>Chia sẻ</span>
                    </button>
                </div>
                `;
            }
            else if (isSharedAdminViewingOthers && isOriginalPostByAdmin) {
                actionsClass = 'two-buttons';
                actionsHtml = `
                <div class="post-actions ${actionsClass}">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                </div>
                `;
            }
            else if (isSharerCurrentUser) {
                actionsClass = 'two-buttons';
                actionsHtml = `
                <div class="post-actions ${actionsClass}">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                </div>
                `;
            }
            else {
                actionsClass = '';
                actionsHtml = `
                <div class="post-actions">
                    <div class="reaction-main-wrap"
                        onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                        onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                        <button class="post-action-btn ${userReact ? "active" : ""}"
                                type="button"
                                onclick="toggleReaction(${post.PostID}, 'like')"
                                onmouseenter="openReactionPicker(${post.PostID})">
                            <img src="${reactIcon}" class="react-main-icon">
                            <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                        </button>
                        <div class="reaction-picker" id="react-picker-${post.PostID}">
                            ${["like","love","care","haha","wow","sad","angry"]
                            .map(t => `
                            <div class="emoji-wrapper" data-type="${t}">
                                <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                                    <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                                </button>
                                <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                            </div>`).join("")}
                        </div>
                    </div>
                    <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>Bình luận</span>
                    </button>
                    <button class="post-action-btn" onclick="sharePost(${original.PostID})">
                        <span class="material-icons">share</span>
                        <span>Chia sẻ</span>
                    </button>
                </div>
                `;
            }

            // Menu 3 chấm - ĐÃ SỬA: Thêm event listener trực tiếp
            let menuHtml = '';
            
            if (isSharedAdminOwnPost) {
                menuHtml = `
                    <div class="post-menu">
                        <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                            more_horiz
                        </span>
                        <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                            ${currentUserIsAdmin ? `
                            <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                                <span class="material-icons">push_pin</span>
                                ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                            </button>
                            <div class="post-menu-divider"></div>
                            ` : ''}
                            <button class="post-menu-item edit" onclick="editPost(${post.PostID})">
                                <span class="material-icons">edit</span>
                                Chỉnh sửa nội dung chia sẻ
                            </button>
                            <button class="post-menu-item privacy" onclick="changePrivacy(${post.PostID})">
                                <span class="material-icons">lock</span>
                                Chỉnh quyền riêng tư
                            </button>
                            <button class="post-menu-item delete" onclick="deletePost(${post.PostID})">
                                <span class="material-icons">delete</span>
                                Xóa bài chia sẻ
                            </button>
                        </div>
                    </div>
                `;
            }
            else if (isSharedAdminViewingOthers && !isOriginalPostByAdmin) {
                menuHtml = `
                    <div class="post-menu">
                        <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                            more_horiz
                        </span>
                        <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                            ${currentUserIsAdmin ? `
                            <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                                <span class="material-icons">push_pin</span>
                                ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                            </button>
                            <div class="post-menu-divider"></div>
                            ` : ''}
                            <div class="admin-section">
                                <div class="admin-section-title">Quản trị viên</div>
                                <button class="admin-action-btn delete" onclick="adminDeletePost(${post.PostID})">
                                    <span class="material-icons">delete_forever</span>
                                    Xóa bài viết
                                </button>
                                <button class="admin-action-btn warn" onclick="adminWarnUserFromPost(${post.PostID})">
                                    <span class="material-icons">warning</span>
                                    Cảnh cáo người đăng
                                </button>
                                <button class="admin-action-btn ban" onclick="adminBanUserFromPost(${post.PostID})">
                                    <span class="material-icons">block</span>
                                    Chặn người dùng
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
            else if (isSharerCurrentUser) {
                menuHtml = `
                    <div class="post-menu">
                        <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                            more_horiz
                        </span>
                        <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                            ${currentUserIsAdmin ? `
                            <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                                <span class="material-icons">push_pin</span>
                                ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                            </button>
                            <div class="post-menu-divider"></div>
                            ` : ''}
                            <button class="post-menu-item edit" onclick="editPost(${post.PostID})">
                                <span class="material-icons">edit</span>
                                Chỉnh sửa nội dung chia sẻ
                            </button>
                            <button class="post-menu-item privacy" onclick="changePrivacy(${post.PostID})">
                                <span class="material-icons">lock</span>
                                Chỉnh quyền riêng tư
                            </button>
                            <button class="post-menu-item delete" onclick="deletePost(${post.PostID})">
                                <span class="material-icons">delete</span>
                                Xóa bài chia sẻ
                            </button>
                        </div>
                    </div>
                `;
            }

            // Xác định class cho bài chia sẻ
            let sharedPostClass = '';
            if (isSharedAdminViewingOthers) {
                sharedPostClass = 'admin-viewing-others';
            } else if (isSharedAdminOwnPost) {
                sharedPostClass = 'admin-viewing-own';
            } else {
                sharedPostClass = 'user-post';
            }

            // 🟢 Render media cho bài gốc
            let originalMediaHtml = '';
            if (original.media && original.media.length > 0) {
                originalMediaHtml = renderPostMediaLayout(original.media, original.PostID || post.OriginalPostID);
            }

            return `
            <article class="community-post shared-post ${sharedPostClass} ${isOriginalPostByAdmin ? 'post-by-admin' : ''} ${isPinned ? 'pinned-post' : ''}" 
                     data-post-id="${post.PostID}" 
                     data-user-id="${sharer.UserID || 0}"
                     data-post-owner-id="${original.UserID || 0}"
                     data-post-owner-role="${original.Role || ''}"
                     data-privacy="${post.Privacy}"
                     data-pinned="${isPinned ? '1' : '0'}"
                     data-original-deleted="0">
        
            ${isPinned ? `<div class="pin-badge" title="Bài viết đã được ghim lên đầu trang">📌 ĐÃ GHIM</div>` : ''}
            
            <header class="post-header">
                <!-- 🟢 CẬP NHẬT: Click avatar mở bằng UserID -->
               <div class="post-avatar" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">
                ${sharerAvatar
                    ? `<img src="${sharerAvatar}" class="post-avatar-img"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">`
                    : `<div class="avatar-circle" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>`
                }
                <div class="avatar-circle" style="display:none;">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>
                </div>

                <div class="post-meta">
                <div class="post-author">
                    <!-- 🟢 CẬP NHẬT: Click tên mở bằng UserID -->
                    <span class="author-name" onclick="openUserProfileById(${sharer.UserID || 0})" style="cursor: pointer;">
                    ${escapeHtml(displayName(sharer))}
                    </span>
                    ${sharerRoleBadgeHtml}
                </div>
                <div class="post-time">${escapeHtml(shareTime)}</div>
                </div>

                ${sharerFollowButtonHtml}

                ${menuHtml}
                
                ${currentUserIsAdmin ? `
                <div class="pin-icon" onclick="togglePinPost(${post.PostID})" title="${isPinned ? 'Bài đã ghim (bấm để bỏ ghim)' : 'Ghim bài viết'}">
                    <span class="material-icons" ${isPinned ? 'style="color:#ff9800;"' : ''}>push_pin</span>
                </div>
                ` : ''}
            </header>
                ${post.Content ? `<div class="shared-caption">${escapeHtml(post.Content)}</div>` : ""}

                <div class="shared-box">
                <div class="shared-header">
                    <!-- 🟢 CẬP NHẬT: Click avatar mở bằng UserID -->
                    <div class="shared-avatar" onclick="openUserProfileById(${originalUser.UserID || 0})" style="cursor: pointer;">
                    ${originalAvatar
                        ? `<img src="${originalAvatar}" class="shared-avatar-img"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                onclick="openUserProfileById(${originalUser.UserID || 0})" style="cursor: pointer;">`
                        : `<div class="avatar-circle" onclick="openUserProfileById(${originalUser.UserID || 0})" style="cursor: pointer;">${escapeHtml(displayName(originalUser)[0] || "?")}</div>`
                    }
                    <div class="avatar-circle" style="display:none;">${escapeHtml(displayName(originalUser)[0] || "?")}</div>
                    </div>

                    <div class="shared-info">
                    <!-- 🟢 CẬP NHẬT: Click tên mở bằng UserID -->
                    <strong class="shared-user-link" onclick="openUserProfileById(${originalUser.UserID || 0})" style="cursor: pointer;">
                        ${escapeHtml(displayName(originalUser))}
                        ${originalRoleBadgeHtml}
                    </strong>
                    <span class="shared-time">${escapeHtml(originalCreatedAt)}</span>
                    </div>
                </div>

                <div class="shared-body" onclick="openOriginalPost(event, ${original.PostID || post.OriginalPostID}, '${originalUser.Username}')">
                    ${originalContent ? escapeHtml(originalContent) : ""}
                    ${originalMediaHtml}
                </div>
                </div>
            <div class="post-stats">
                ${totalReact > 0
                    ? `<div class="stat-item reaction-display">
                        ${renderReactionIcons(reactions.summary, post.PostID)}
                        <span class="reaction-count"
                            onmouseenter="showReactionUsersTooltip(${post.PostID}, 'all', event)"
                            onmouseleave="hideReactionUsersTooltip()"
                            onclick="openReactionUserModal(${post.PostID}, 'all')">
                            ${totalReact}
                        </span>
                    </div>` : ""
                }
                ${comments.total > 0
                    ? `<span class="stat-item comment-count clickable"
                            onclick="toggleComments(${post.PostID})">
                            ${comments.total} bình luận
                        </span>` : ""
                }
            </div>

            ${actionsHtml}

            <div class="comments-wrapper" 
                    id="comments-${post.PostID}" 
                    data-loaded="0" 
                    data-mode="top" 
                    data-open="0" 
                    style="display:none;">

                <div class="comment-filter">
                <button type="button" class="comment-filter-btn"
                        id="comment-filter-btn-${post.PostID}"
                        onclick="toggleCommentFilterMenu(${post.PostID})">
                    <span id="comment-filter-text-${post.PostID}">Hot nhất</span>
                    <span class="material-icons">expand_more</span>
                </button>
                <div class="comment-filter-menu" id="comment-filter-menu-${post.PostID}">
                    <button onclick="changeCommentFilter(${post.PostID}, 'hot')">
                    <strong>Hot nhất</strong><br>
                    <small>Hiển thị bình luận được yêu thích nhiều nhất trước tiên.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'newest')">
                    <strong>Mới nhất</strong><br>
                    <small>Hiển thị các bình luận mới nhất trước tiên.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'following')">
                    <strong>Người bạn đang theo dõi</strong><br>
                    <small>Chỉ hiển thị bình luận từ người bạn theo dõi.</small>
                    </button>
                    <button onclick="changeCommentFilter(${post.PostID}, 'all')">
                    <strong>Tất cả bình luận</strong><br>
                    <small>Hiển thị tất cả bình luận, bao gồm cả nội dung có thể là spam.</small>
                    </button>
                </div>
                </div>

                <div class="comment-list" id="comment-list-${post.PostID}"></div>

                <form class="comment-form" onsubmit="submitComment(event, ${post.PostID})">
                <input type="text" name="comment" placeholder="Viết bình luận..." autocomplete="off">
                <button type="submit" class="comment-send-btn">
                    <span class="material-icons">send</span>
                </button>
                </form>
                </div>
            </article>`;
        }
    }

    // 🟣 Nếu là bài bình thường (không phải bài chia sẻ)
    console.log("📌 Rendering NORMAL post:", post.PostID);
    
    const totalReact = reactions.total || 0;
    const userReact = reactions.user || null;
    const isOwner = !!(post.user && post.user.UserID && window.CURRENT_USER_ID === post.user.UserID);

    let reactLabel = userReact ? reactTextMapLocal[userReact] : "Thích";
    let reactIcon = userReact
        ? reactIconMap[userReact]
        : `${BASE_URL}/assets/images/like-outline.png`;
    let reactColor = userReact ? reactColorMapLocal[userReact] : "#6b6b6b";

    // 🟢 THÊM: Nút theo dõi cho bài viết bình thường (chỉ khi không phải chính mình)
    let followButtonHtml = '';
    if (!isCurrentUserPost) {
        followButtonHtml = `
            <button class="follow-header-btn ${isFollowing ? 'following' : ''}" 
                    onclick="toggleFollow(${user.UserID})"
                    data-user-id="${user.UserID}"
                    style="margin-left: auto; margin-right: 10px; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                ${isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </button>
        `;
    }

    // Tạo HTML cho nút actions - BÀI BÌNH THƯỜNG
    let actionsHtml = '';
    let actionsClass = '';
    
    if (currentUserIsAdmin && isCurrentUserPost) {
        actionsClass = 'two-buttons';
        actionsHtml = `
        <div class="post-actions ${actionsClass}">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
        </div>
        `;
    } 
    else if (currentUserIsAdmin && !isCurrentUserPost && !isPostByAdmin) {
        actionsClass = '';
        actionsHtml = `
        <div class="post-actions">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn" onclick="sharePost(${post.PostID})">
                <span class="material-icons">share</span>
                <span>Chia sẻ</span>
            </button>
        </div>
        `;
    }
    else if (currentUserIsAdmin && !isCurrentUserPost && isPostByAdmin) {
        actionsClass = 'two-buttons';
        actionsHtml = `
        <div class="post-actions ${actionsClass}">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
        </div>
        `;
    }
    else if (!currentUserIsAdmin && isCurrentUserPost) {
        actionsClass = 'two-buttons';
        actionsHtml = `
        <div class="post-actions ${actionsClass}">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
        </div>
        `;
    }
    else if (!currentUserIsAdmin && !isCurrentUserPost && !isPostByAdmin) {
        actionsClass = '';
        actionsHtml = `
        <div class="post-actions">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
            <button class="post-action-btn" onclick="sharePost(${post.PostID})">
                <span class="material-icons">share</span>
                <span>Chia sẻ</span>
            </button>
        </div>
        `;
    }
    else if (!currentUserIsAdmin && !isCurrentUserPost && isPostByAdmin) {
        actionsClass = 'two-buttons';
        actionsHtml = `
        <div class="post-actions ${actionsClass}">
            <div class="reaction-main-wrap"
                onmouseleave="delayedCloseReactionPicker(${post.PostID})"
                onmouseenter="cancelCloseReactionPicker(${post.PostID})">
                <button class="post-action-btn ${userReact ? "active" : ""}"
                        type="button"
                        onclick="toggleReaction(${post.PostID}, 'like')"
                        onmouseenter="openReactionPicker(${post.PostID})">
                    <img src="${reactIcon}" class="react-main-icon">
                    <span style="color:${reactColor}; font-weight:600">${reactLabel}</span>
                </button>
                <div class="reaction-picker" id="react-picker-${post.PostID}">
                ${["like","love","care","haha","wow","sad","angry"]
                    .map(t => `
                    <div class="emoji-wrapper" data-type="${t}">
                        <button class="reaction-emoji ${t}" onclick="chooseReaction(${post.PostID}, '${t}')">
                            <img src="${BASE_URL}/assets/images/${t}.png" alt="${t}">
                        </button>
                        <div class="emoji-tooltip">${REACTION_TOOLTIP_MAP[t] || t}</div>
                    </div>`).join("")}
                </div>
            </div>
            <button class="post-action-btn" onclick="toggleComments(${post.PostID})">
                <span class="material-icons">chat_bubble_outline</span>
                <span>Bình luận</span>
            </button>
        </div>
        `;
    }

    // 🟢 Render media cho bài viết bình thường
    const mediaHtml = media.length ? renderPostMediaLayout(media, post.PostID) : "";
    
    const commentCountText = `${comments.total || 0} bình luận`;

    // 🟢 MENU 3 CHẤM CHO BÀI BÌNH THƯỜNG - ĐÃ SỬA: Thêm event listener trực tiếp
    let menuHtml = '';
    
    if (currentUserIsAdmin && isCurrentUserPost) {
        menuHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                    <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                        <span class="material-icons">push_pin</span>
                        ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                    </button>
                    <div class="post-menu-divider"></div>
                    <button class="post-menu-item edit" onclick="editPost(${post.PostID})">
                        <span class="material-icons">edit</span>
                        Chỉnh sửa bài viết
                    </button>
                    <button class="post-menu-item privacy" onclick="changePrivacy(${post.PostID})">
                        <span class="material-icons">lock</span>
                        Chỉnh quyền riêng tư
                    </button>
                    <button class="post-menu-item delete" onclick="deletePost(${post.PostID})">
                        <span class="material-icons">delete</span>
                        Xóa bài viết
                    </button>
                </div>
            </div>
        `;
    }
    else if (currentUserIsAdmin && !isCurrentUserPost && !isPostByAdmin) {
        menuHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                    <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                        <span class="material-icons">push_pin</span>
                        ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                    </button>
                    <div class="post-menu-divider"></div>
                    <div class="admin-section">
                        <div class="admin-section-title">Quản trị viên</div>
                        <button class="admin-action-btn delete" onclick="adminDeletePost(${post.PostID})">
                            <span class="material-icons">delete_forever</span>
                            Xóa bài viết
                        </button>
                        <button class="admin-action-btn warn" onclick="adminWarnUserFromPost(${post.PostID})">
                            <span class="material-icons">warning</span>
                            Cảnh cáo người đăng
                        </button>
                        <button class="admin-action-btn ban" onclick="adminBanUserFromPost(${post.PostID})">
                            <span class="material-icons">block</span>
                            Chặn người dùng
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    else if (currentUserIsAdmin && !isCurrentUserPost && isPostByAdmin) {
        menuHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                    <button class="post-menu-item pin" onclick="togglePinPost(${post.PostID})">
                        <span class="material-icons">push_pin</span>
                        ${isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                    </button>
                    <div class="post-menu-divider"></div>
                    <button class="post-menu-item" onclick="copyPostLink(${post.PostID})">
                        <span class="material-icons">link</span>
                        Sao chép liên kết
                    </button>
                </div>
            </div>
        `;
    }
    else if (!currentUserIsAdmin && isCurrentUserPost) {
        menuHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" data-post-id="${post.PostID}">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}" style="display:none;">
                    <button class="post-menu-item edit" onclick="editPost(${post.PostID})">
                        <span class="material-icons">edit</span>
                        Chỉnh sửa bài viết
                    </button>
                    <button class="post-menu-item privacy" onclick="changePrivacy(${post.PostID})">
                        <span class="material-icons">lock</span>
                        Chỉnh quyền riêng tư
                    </button>
                    <button class="post-menu-item delete" onclick="deletePost(${post.PostID})">
                        <span class="material-icons">delete</span>
                        Xóa bài viết
                    </button>
                </div>
            </div>
        `;
    }

    // Xác định class cho bài viết
    if (currentUserIsAdmin && isCurrentUserPost) {
        postClass += ' admin-viewing-own';
    } else if (currentUserIsAdmin && !isCurrentUserPost) {
        postClass += ' admin-viewing-others';
    } else {
        postClass += ' user-post';
    }

    return `
    <article class="community-post ${postClass.trim()}" 
             data-post-id="${post.PostID}" 
             data-user-id="${user.UserID || 0}"
             data-user-role="${user.Role || ''}"
             data-privacy="${post.Privacy}"
             data-pinned="${isPinned ? '1' : '0'}"
             data-original-deleted="0">
    
    ${isPinned ? `<div class="pin-badge" title="Bài viết đã được ghim lên đầu trang">📌 ĐÃ GHIM</div>` : ''}
    
    <header class="post-header">
        <!-- 🟢 CẬP NHẬT: Click avatar mở bằng UserID -->
        <div class="post-avatar" onclick="openUserProfileById(${user.UserID || 0})" style="cursor: pointer;">
        ${user.AvatarURL
            ? `<img src="${getSafeAvatarURL(user.AvatarURL)}" 
                    class="post-avatar-img"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'; this.src='${BASE_URL}/assets/images/default-avatar.png?_t=${new Date().getTime()}'"
                    onclick="openUserProfileById(${user.UserID || 0})" style="cursor: pointer;">`
            : `<div class="avatar-circle" onclick="openUserProfileById(${user.UserID || 0})" style="cursor: pointer;">${escapeHtml((user.FullName || user.Username || "?")[0])}</div>`
        }
        <div class="avatar-circle" style="display:none;">${escapeHtml((user.FullName || user.Username || "?")[0])}</div>
        </div>

        <div class="post-meta">
        <div class="post-author">
            <!-- 🟢 CẬP NHẬT: Click tên mở bằng UserID -->
            <span class="author-name" onclick="openUserProfileById(${user.UserID || 0})" style="cursor: pointer;">
            ${escapeHtml(displayName(user))}
            </span>
            ${roleBadgeHtml}
        </div>
        <div class="post-time">${escapeHtml(created)}</div>
        </div>

        ${followButtonHtml}

        ${menuHtml}
        
        ${currentUserIsAdmin ? `
        <div class="pin-icon" onclick="togglePinPost(${post.PostID})" title="${isPinned ? 'Bài đã ghim (bấm để bỏ ghim)' : 'Ghim bài viết'}">
            <span class="material-icons" ${isPinned ? 'style="color:#ff9800;"' : ''}>push_pin</span>
        </div>
        ` : ''}

    </header>

    <div class="post-content">${escapeHtml(post.Content)}</div>
    ${mediaHtml}

    <div class="post-stats">
    ${totalReact > 0
        ? `<div class="stat-item reaction-display">
            ${renderReactionIcons(reactions.summary, post.PostID)}
            <span class="reaction-count"
            onmouseenter="showReactionUsersTooltip(${post.PostID}, 'all', event)"
            onmouseleave="hideReactionUsersTooltip()"
            onclick="openReactionUserModal(${post.PostID}, 'all')">
            ${totalReact}
            </span>
            </div>` : ""
    }
    ${comments.total > 0
        ? `<span class="stat-item comment-count clickable"
            onclick="toggleComments(${post.PostID})">
            ${comments.total} bình luận
        </span>` : ""
    }
    </div>

    ${actionsHtml}

    <div class="comments-wrapper" id="comments-${post.PostID}" data-loaded="0" data-mode="top" data-open="0" style="display:none;">
    <div class="comment-filter">
        <button type="button" class="comment-filter-btn"
                id="comment-filter-btn-${post.PostID}"
                onclick="toggleCommentFilterMenu(${post.PostID})">
        <span id="comment-filter-text-${post.PostID}">Hot nhất</span>
        <span class="material-icons">expand_more</span>
        </button>
        <div class="comment-filter-menu" id="comment-filter-menu-${post.PostID}">
        <button onclick="changeCommentFilter(${post.PostID}, 'hot')">
            <strong>Hot nhất</strong><br>
            <small>Hiển thị bình luận được yêu thích nhiều nhất trước tiên.</small>
        </button>
        <button onclick="changeCommentFilter(${post.PostID}, 'newest')">
            <strong>Mới nhất</strong><br>
            <small>Hiển thị các bình luận mới nhất trước tiên.</small>
        </button>
        <button onclick="changeCommentFilter(${post.PostID}, 'following')">
            <strong>Người bạn đang theo dõi</strong><br>
            <small>Chỉ hiển thị bình luận từ người bạn theo dõi.</small>
        </button>
        <button onclick="changeCommentFilter(${post.PostID}, 'all')">
            <strong>Tất cả bình luận</strong><br>
            <small>Hiển thị tất cả bình luận, bao gồm cả nội dung có thể là spam.</small>
        </button>
        </div>
    </div>

    <div class="comment-list" id="comment-list-${post.PostID}"></div>
    <form class="comment-form" onsubmit="submitComment(event, ${post.PostID})">
        <input type="text" name="comment" placeholder="Viết bình luận..." autocomplete="off">
        <button type="submit" class="comment-send-btn"><span class="material-icons">send</span></button>
    </form>
    </div>
    </article>`;
}
// 🟢 Hàm mở bài gốc khi click vào shared-box
function openOriginalPost(event, postId, originalUsername = null) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // ✅ Nếu có tên người đăng bài gốc → mở trang bài viết chi tiết của họ
    if (originalUsername) {
        const url = `${window.location.origin}${BASE_URL}/frontend/community/post_detail.php?id=${postId}&u=${encodeURIComponent(originalUsername)}`;
        window.location.href = url;
    } else {
        // fallback: mở bài chi tiết bình thường
        const url = `${window.location.origin}${BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
        window.location.href = url;
    }
}
// ========= HÀM ĐƠN GIẢN MỞ PROFILE BẰNG USER ID =========
function openUserProfileById(userId) {
    console.log("🎯 openUserProfileById called with:", userId, "Type:", typeof userId);
    
    // Chuyển đổi sang số
    const id = Number(userId);
    
    // Kiểm tra hợp lệ
    if (!id || isNaN(id) || id <= 0) {
        console.error("❌ Invalid user ID:", userId);
        
        // Fallback: Mở profile của chính mình
        const currentId = Number(window.CURRENT_USER_ID) || 0;
        if (currentId && currentId > 0) {
            console.log("🔄 Falling back to current user ID:", currentId);
            window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=${currentId}`;
        } else {
            alert("Không tìm thấy thông tin người dùng");
        }
        return false;
    }
    
    // Mở profile
    console.log("✅ Opening profile for ID:", id);
    window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=${id}`;
    return true;
}
// 🟢 Thêm event listener cho tất cả avatar và tên
document.addEventListener("DOMContentLoaded", function() {
    // Xử lý click vào avatar
    document.addEventListener("click", function(e) {
        if (e.target.closest(".post-avatar") || 
            e.target.closest(".shared-avatar") || 
            e.target.closest(".original-avatar")) {
            e.preventDefault();
            e.stopPropagation();
            
            const avatar = e.target.closest(".post-avatar, .shared-avatar, .original-avatar");
            const post = avatar.closest(".community-post");
            
            // 🟢 Lấy user ID từ data attribute của post
            const userId = post ? post.dataset.userId : 0;
            
            if (userId && userId > 0) {
                openUserProfileById(userId);
            }
        }
        
        // Xử lý click vào tên
        if (e.target.closest(".author-name") || 
            e.target.closest(".shared-user-link") || 
            e.target.closest(".original-name") ||
            e.target.closest(".author-link")) {
            e.preventDefault();
            e.stopPropagation();
            
            const nameElement = e.target.closest(".author-name, .shared-user-link, .original-name, .author-link");
            const post = nameElement.closest(".community-post");
            
            // 🟢 Lấy user ID từ data attribute của post
            const userId = post ? post.dataset.userId : 0;
            
            if (userId && userId > 0) {
                openUserProfileById(userId);
            }
        }
    });
});
// 🟢 Export hàm mới ra global scope
if (typeof window !== 'undefined') {
    window.openUserProfileById = openUserProfileById;
}
function getMediaGridClass(count) {
    if (count === 1) return "grid-1";
    if (count === 2) return "grid-2";
    if (count === 3) return "grid-3";
    if (count === 4) return "grid-4";
    if (count >= 5) return "grid-many";
    return "";
}

/* ========= Reaction POST ========= */
async function toggleReaction(postId, type) {
    try {
        const res = await fetch(
            `${BASE_URL}/backend/api/community/reactions/toggle.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: `post_id=${encodeURIComponent(postId)}&type=${encodeURIComponent(type)}`,
            }
        );

        const data = await res.json();
        if (!data.success)
            throw new Error(data.error || "Không thể cập nhật cảm xúc.");

        updatePostReactionUI(postId, data);
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}

/* ✅ HÀM CHUẨN KHÔNG LỖI */
function updatePostReactionUI(postId, data) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post) return;

    const reactIconMap = {
        like: `${BASE_URL}/assets/images/like.png`,
        love: `${BASE_URL}/assets/images/love.png`,
        care: `${BASE_URL}/assets/images/care.png`,
        haha: `${BASE_URL}/assets/images/haha.png`,
        wow: `${BASE_URL}/assets/images/wow.png`,
        sad: `${BASE_URL}/assets/images/sad.png`,
        angry: `${BASE_URL}/assets/images/angry.png`,
    };

    const reactTextMapLocal = {
        like: "Đã thích",
        love: "Yêu thích",
        care: "Thương thương",
        haha: "Haha",
        wow: "Wow",
        sad: "Buồn",
        angry: "Phẫn nộ",
    };

    const reactColorMapLocal = {
        like: "#2078f4",
        love: "#f53b57",
        care: "#f7b125",
        haha: "#f7b125",
        wow: "#f7b125",
        sad: "#f7b125",
        angry: "#e03023",
    };

    const type = (data.userReaction || "").trim().toLowerCase();

    const btn = post.querySelector(".reaction-main-wrap .post-action-btn");
    const labelSpan = btn.querySelector("span:last-child");
    const iconImg = btn.querySelector(".react-main-icon");

    // Cập nhật nút cảm xúc chính
    if (!type) {
        iconImg.src = `${BASE_URL}/assets/images/like-outline.png`;
        labelSpan.textContent = "Thích";
        labelSpan.style.color = "#6b6b6b";
        btn.classList.remove("active");
    } else {
        iconImg.src = reactIconMap[type];
        labelSpan.textContent = reactTextMapLocal[type];
        labelSpan.style.color = reactColorMapLocal[type];
        btn.classList.add("active");
    }

    // Đảm bảo phần hiển thị cảm xúc tồn tại
    let display = post.querySelector(".reaction-display");
    if (!display) {
        const stats = post.querySelector(".post-stats");
        if (stats) {
            display = document.createElement("div");
            display.className = "stat-item reaction-display";
            stats.prepend(display);
        }
    }

    // Hiển thị cảm xúc nếu có
    if (data.total > 0 && data.summary) {
        let html = "";
        Object.entries(data.summary)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([key]) => {
                html += `
                <span class="reaction-icon"
                    onmouseenter="showReactionUsersTooltip(${postId}, '${key}', event)"
                    onmouseleave="hideReactionUsersTooltip()"
                    onclick="openReactionUserModal(${postId}, '${key}')">
                    <img src="${BASE_URL}/assets/images/${key}.png">
                </span>`;
            });

        html += `
            <span class="reaction-count"
                onmouseenter="showReactionUsersTooltip(${postId}, 'all', event)"
                onmouseleave="hideReactionUsersTooltip()"
                onclick="openReactionUserModal(${postId}, 'all')">
                ${data.total}
            </span>`;

        display.innerHTML = html;
        display.style.display = "flex";
    } else if (display) {
        // Ẩn hoàn toàn nếu không có cảm xúc
        display.innerHTML = "";
        display.style.display = "none";
    }
}

function openReactionPicker(postId) {
    const picker = document.getElementById(`react-picker-${postId}`);
    if (picker) picker.classList.add("show");
}

function closeReactionPicker(postId) {
    const picker = document.getElementById(`react-picker-${postId}`);
    if (picker) picker.classList.remove("show");
}

function chooseReaction(postId, type) {
    toggleReaction(postId, type);
    closeReactionPicker(postId);
}

// 🕒 Giữ thanh cảm xúc không tắt quá sớm
let reactionCloseTimers = {};

function delayedCloseReactionPicker(postId) {
    if (reactionCloseTimers[postId]) clearTimeout(reactionCloseTimers[postId]);
    reactionCloseTimers[postId] = setTimeout(() => {
        closeReactionPicker(postId);
    }, 700); // trễ 300ms
}

function cancelCloseReactionPicker(postId) {
    if (reactionCloseTimers[postId]) {
        clearTimeout(reactionCloseTimers[postId]);
        delete reactionCloseTimers[postId];
    }
}

/* ========= Comment cơ bản + FILTER ========= */

function focusComment(postId) {
    const input = document.querySelector(
        `#comments-${postId} .comment-form input[name="comment"]`
    );
    if (input) input.focus();
}

// Mở/đóng khung comment khi bấm "Bình luận"
function toggleComments(postId) {
    const wrap = document.getElementById(`comments-${postId}`);
    if (!wrap) return;

    const isOpen = wrap.dataset.open === "1";

    if (!isOpen) {
        wrap.style.display = "block";
        wrap.dataset.open = "1";

        const mode = wrap.dataset.mode || "hot";
        loadComments(postId, mode);
    } else {
        wrap.style.display = "none";
        wrap.dataset.open = "0";
    }
}

// 🔹 Sắp xếp comment theo bộ lọc
function sortComments(comments, mode) {
    let arr = Array.isArray(comments) ? [...comments] : [];

    switch (mode) {
        case "hot":
            arr.sort((a, b) => {
                const ra = (a.reactions && a.reactions.total) || 0;
                const rb = (b.reactions && b.reactions.total) || 0;
                return rb - ra; // nhiều tim nhất trước
            });
            break;

        case "newest":
            arr.sort(
                (a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
            );
            break;

        case "following":
            arr = arr.filter((c) => c.user && c.user.IsFollowed);
            break;

        case "all":
        default:
            arr.sort(
                (a, b) => new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
            );
            break;
    }

    return arr;
}

function renderCommentsForPost(postId, comments, mode) {
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (!listEl) return;

    const sorted = sortComments(comments, mode);
    listEl.innerHTML = sorted.map((c) => renderCommentItem(c, postId)).join("");
}

// 🔹 Hiển thị menu lọc
function toggleCommentFilterMenu(postId) {
    const menu = document.getElementById(`comment-filter-menu-${postId}`);
    if (!menu) return;

    // Đóng các menu khác nếu đang mở
    document.querySelectorAll(".comment-filter-menu.open").forEach((m) => {
        if (m !== menu) m.classList.remove("open");
    });

    menu.classList.toggle("open");
}

// 🔹 Đổi filter (Hot nhất / Mới nhất / Người theo dõi / Tất cả)
async function changeCommentFilter(postId, mode) {
    const wrap = document.getElementById(`comments-${postId}`);
    if (!wrap) return;

    wrap.dataset.mode = mode;

    const textMap = {
        hot: "Hot nhất",
        newest: "Mới nhất",
        following: "Người bạn đang theo dõi",
        all: "Tất cả bình luận",
    };

    const label = document.getElementById(`comment-filter-text-${postId}`);
    if (label) label.textContent = textMap[mode] || textMap.hot;

    const menu = document.getElementById(`comment-filter-menu-${postId}`);
    if (menu) menu.classList.remove("open");

    if (!commentStore[postId]) {
        await loadComments(postId, mode);
    } else {
        renderCommentsForPost(postId, commentStore[postId], mode);
    }
}

// 🔹 Gửi comment
function submitComment(e, postId) {
    e.preventDefault();
    const input = e.target.querySelector('input[name="comment"]');
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    fetch(`${BASE_URL}/backend/api/community/comments/create.php`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `post_id=${encodeURIComponent(postId)}&content=${encodeURIComponent(content)}`,
    })
        .then((res) => res.json())
        .then((data) => {
            if (!data.success) throw new Error(data.error || "Không thể gửi bình luận.");

            input.value = "";

            // cập nhật số bình luận nếu API trả total
            const postEl = document.querySelector(`[data-post-id="${postId}"]`);
            if (postEl && typeof data.total !== "undefined") {
            let countSpan = postEl.querySelector(".comment-count");
            // Nếu chưa có phần bình luận (chưa ai comment lần đầu)
            if (!countSpan) {
                const stats = postEl.querySelector(".post-stats");
                countSpan = document.createElement("span");
                countSpan.className = "stat-item comment-count";
                stats.appendChild(countSpan);
            }
            countSpan.textContent = `${data.total} bình luận`;
        }

            // xoá cache và reload list theo filter hiện tại
            const wrap = document.getElementById(`comments-${postId}`);
            const mode = wrap ? wrap.dataset.mode || "hot" : "hot";
            delete commentStore[postId];
            loadComments(postId, mode);
        })
        .catch((err) => alert("Lỗi: " + err.message));
}

// 🔹 Load comment từ server
async function loadComments(postId, mode = "hot") {
    const wrap = document.getElementById(`comments-${postId}`);
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (!wrap || !listEl) return;

    wrap.dataset.mode = mode;
    listEl.innerHTML = `<p class="comment-loading">Đang tải bình luận...</p>`;

    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/list.php?post_id=${postId}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const list = data.comments || [];
        commentStore[postId] = list;

        renderCommentsForPost(postId, list, mode);
        wrap.dataset.loaded = "1";
        
        // 🟢 QUAN TRỌNG: Thay thế form comment cũ bằng form mới
        const oldForm = wrap.querySelector('.comment-form');
        if (oldForm) {
            oldForm.remove();
        }
        
        // Thêm form comment mới với nút upload ảnh
        wrap.insertAdjacentHTML('beforeend', renderCommentForm(postId));
        
    } catch (err) {
        listEl.innerHTML = `<p class="comment-error">${escapeHtml(err.message)}</p>`;
    }
}

/* ========= Share (tạm placeholder) ========= */
/* ========= SHARE POST (Giao diện giống Facebook) ========= */

function sharePost(postId) {
    // Xóa modal cũ nếu có
    const old = document.getElementById("share-modal");
    if (old) old.remove();

    // Tạo giao diện modal
    const modal = document.createElement("div");
    modal.id = "share-modal";
    modal.className = "share-modal";
    modal.innerHTML = `
    <div class="share-overlay" onclick="closeShareModal()"></div>
    <div class="share-box">
        <div class="share-header">
        <h3>Chia sẻ bài viết</h3>
        <button class="share-close" onclick="closeShareModal()">×</button>
        </div>
        <div class="share-body">
        <textarea id="share-content" placeholder="Hãy nói gì đó về nội dung này..."></textarea>
        <div class="share-privacy">
            <label>Chế độ hiển thị:</label>
            <select id="share-privacy">
            <option value="public">Công khai</option>
            <option value="followers">Người theo dõi</option>
            <option value="private">Chỉ mình tôi</option>
            </select>
        </div>
        </div>
        <div class="share-footer">
        <button class="btn btn-secondary" onclick="copyPostLink(${postId})">
            <span class="material-icons">link</span>
            Sao chép liên kết
        </button>
        <button class="btn btn-primary" onclick="submitShare(${postId})">
            Chia sẻ ngay
        </button>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
}

function closeShareModal() {
    const modal = document.getElementById("share-modal");
    if (modal) modal.remove();
    document.body.style.overflow = "";
}
async function submitShare(postId) {
    const content = document.getElementById("share-content").value.trim();
    const privacy = document.getElementById("share-privacy").value;

    // Hiển thị loading
    const submitBtn = document.querySelector('.share-footer .btn-primary');
    const originalText = submitBtn ? submitBtn.textContent : '';
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang chia sẻ...';
    }

    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/share/create.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `post_id=${encodeURIComponent(postId)}&content=${encodeURIComponent(content)}&privacy=${encodeURIComponent(privacy)}`,
            credentials: "include"
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Không thể chia sẻ bài viết.");

        closeShareModal();
        
        // 🟢 THÔNG BÁO ĐẸP HƠN
        showSuccessNotification("✅ Bài viết đã được chia sẻ thành công!");
        
        // Reload feed sau 1 giây
        setTimeout(() => {
            loadCommunityFeed(1, COMMUNITY_SCOPE);
        }, 1000);
        
    } catch (err) {
        console.error("Lỗi chia sẻ:", err);
        showErrorNotification("❌ Lỗi: " + err.message);
        
    } finally {
        // Khôi phục nút
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText || 'Chia sẻ ngay';
        }
    }
}
/* ========= NOTIFICATION SYSTEM ========= */
function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showInfoNotification(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Xóa thông báo cũ nếu có
    const oldNotification = document.getElementById('custom-notification');
    if (oldNotification) oldNotification.remove();
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.id = 'custom-notification';
    notification.className = `custom-notification ${type}`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="material-icons notification-icon">${icons[type] || 'info'}</span>
            <span class="notification-text">${message}</span>
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

// Thêm CSS cho notification
const notificationCSS = `
    .custom-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 10px;
        padding: 16px 20px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        z-index: 99999;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        max-width: 350px;
        border-left: 4px solid;
        animation: slideInRight 0.3s ease forwards;
    }
    
    .custom-notification.success {
        border-left-color: #4CAF50;
        background: #f1f8e9;
    }
    
    .custom-notification.error {
        border-left-color: #f44336;
        background: #ffebee;
    }
    
    .custom-notification.info {
        border-left-color: #2196f3;
        background: #e3f2fd;
    }
    
    .custom-notification.warning {
        border-left-color: #ff9800;
        background: #fff3e0;
    }
    
    .custom-notification.show {
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
    
    .custom-notification.success .notification-icon {
        color: #4CAF50;
    }
    
    .custom-notification.error .notification-icon {
        color: #f44336;
    }
    
    .custom-notification.info .notification-icon {
        color: #2196f3;
    }
    
    .custom-notification.warning .notification-icon {
        color: #ff9800;
    }
    
    .notification-text {
        font-size: 14px;
        color: #333;
        line-height: 1.4;
        font-weight: 500;
        flex: 1;
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
    
    @keyframes slideOutRight {
        from { 
            transform: translateX(0);
            opacity: 1;
        }
        to { 
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Thêm CSS vào head nếu chưa có
if (!document.getElementById('notification-css')) {
    const style = document.createElement('style');
    style.id = 'notification-css';
    style.textContent = notificationCSS;
    document.head.appendChild(style);
}
// ================== INFINITE SCROLL (PAGINATION) ==================

let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;
let scrollDebounceTimer = null;
let lastScrollPosition = 0;

// Hàm kiểm tra nếu đang ở cuối trang
function isAtBottom() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Khi còn cách đáy 300px thì bắt đầu tải
    return (scrollTop + clientHeight) >= (scrollHeight - 300);
}

// Hàm tải thêm bài viết
async function loadMorePosts() {
    // Nếu đang tải hoặc không còn bài viết, không làm gì
    if (isLoading || !hasMorePosts) return;
    
    const feed = document.getElementById("community-feed");
    if (!feed) return;
    
    isLoading = true;
    currentPage++;
    
    // Hiển thị loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'infinite-scroll-loading';
    loadingIndicator.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-circle"></div>
            <div class="spinner-circle"></div>
            <div class="spinner-circle"></div>
        </div>
        <p>Đang tải thêm bài viết...</p>
    `;
    feed.appendChild(loadingIndicator);
    
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(
            `${BASE_URL}/backend/api/community/posts/list.php?page=${currentPage}&scope=${encodeURIComponent(COMMUNITY_SCOPE)}&_=${timestamp}`
        );
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const posts = data.posts || [];
        
        if (!posts.length) {
            hasMorePosts = false;
            
            // Hiển thị thông báo không còn bài viết
            const noMorePosts = document.createElement('div');
            noMorePosts.className = 'no-more-posts';
            noMorePosts.innerHTML = `
                <div class="no-more-content">
                    <span class="material-icons">check_circle</span>
                    <p>Bạn đã xem hết bài viết</p>
                </div>
            `;
            feed.appendChild(noMorePosts);
            
            // Ẩn loading indicator
            loadingIndicator.remove();
            
            return;
        }
        
        // Xóa loading indicator
        loadingIndicator.remove();
        
        // Thêm bài viết mới vào feed
        posts.forEach(post => {
            const postHtml = renderPostCard(post);
            feed.insertAdjacentHTML('beforeend', postHtml);
        });
        
        // Cập nhật global posts data
        posts.forEach(p => {
            if (!window._communityPosts) window._communityPosts = {};
            window._communityPosts[p.PostID] = p;
        });
        
        // Kiểm tra xem có còn bài viết không
        const totalPosts = data.total_posts || 0;
        const loadedPosts = document.querySelectorAll('.community-post').length;
        
        if (loadedPosts >= totalPosts) {
            hasMorePosts = false;
        }
        
        // Re-initialize các tính năng cho bài viết mới
        setTimeout(() => {
            if (window.CURRENT_USER_ROLE === 'Admin') {
                initPinFeatures();
            }
            classifyPostByUserRole();
            addEventListenersToNewPosts();
        }, 100);
        
    } catch (error) {
        console.error('Lỗi tải thêm bài viết:', error);
        
        // Hiển thị lỗi
        const errorElement = document.createElement('div');
        errorElement.className = 'load-more-error';
        errorElement.innerHTML = `
            <p>Lỗi tải bài viết: ${escapeHtml(error.message)}</p>
            <button onclick="retryLoadMore()" class="retry-btn">
                <span class="material-icons">refresh</span>
                Thử lại
            </button>
        `;
        
        // Thay thế loading indicator bằng lỗi
        if (loadingIndicator.parentNode) {
            loadingIndicator.replaceWith(errorElement);
        }
        
        // Giảm currentPage để thử lại
        currentPage--;
        
    } finally {
        isLoading = false;
    }
}

// Hàm thử lại khi có lỗi
function retryLoadMore() {
    const errorElement = document.querySelector('.load-more-error');
    if (errorElement) {
        errorElement.remove();
    }
    loadMorePosts();
}

// Hàm thêm event listeners cho bài viết mới
function addEventListenersToNewPosts() {
    // Thêm event listener cho các nút menu mới
    document.querySelectorAll('.post-menu-btn').forEach(btn => {
        if (!btn.hasAttribute('data-listener-added')) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const postId = this.closest('.community-post').dataset.postId;
                togglePostMenu(postId);
            });
            btn.setAttribute('data-listener-added', 'true');
        }
    });
    // Thêm event listener cho reaction picker mới
    document.querySelectorAll('.reaction-main-wrap').forEach(wrap => {
        if (!wrap.hasAttribute('data-listener-added')) {
            const postId = wrap.closest('.community-post').dataset.postId;
            
            wrap.addEventListener('mouseenter', () => cancelCloseReactionPicker(postId));
            wrap.addEventListener('mouseleave', () => delayedCloseReactionPicker(postId));
            
            wrap.setAttribute('data-listener-added', 'true');
        }
    });
}

// Hàm reset infinite scroll khi thay đổi tab hoặc reload
function resetInfiniteScroll() {
    currentPage = 1;
    isLoading = false;
    hasMorePosts = true;
    
    const feed = document.getElementById("community-feed");
    if (feed) {
        // Xóa các indicator cũ
        const oldIndicators = feed.querySelectorAll('.infinite-scroll-loading, .no-more-posts, .load-more-error');
        oldIndicators.forEach(el => el.remove());
    }
}

// Hàm xử lý scroll với debounce để tối ưu hiệu suất
function handleScroll() {
    // Debounce để tránh gọi hàm quá nhiều lần
    if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer);
    }
    
    scrollDebounceTimer = setTimeout(() => {
        if (isAtBottom() && !isLoading && hasMorePosts) {
            loadMorePosts();
        }
        
        // Lưu vị trí scroll cuối cùng
        lastScrollPosition = window.scrollY;
        
    }, 200); // Debounce 200ms
}
/* ========= SAO CHÉP LIÊN KẾT (FULL URL) ========= */
function copyPostLink(postId) {
    // 🟢 SAO CHÉP URL ĐẦY ĐỦ (Full URL)
    const domain = window.location.origin;
    const basePath = BASE_URL; // "/HeThongChamSocCaKoi"
    
    // Tạo URL đầy đủ
    const fullUrl = `${domain}${basePath}/frontend/community/post_detail.php?id=${postId}`;
    
    console.log('🔗 Full URL to copy:', fullUrl);
    
    navigator.clipboard.writeText(fullUrl)
        .then(() => {
            showSuccessNotification("📋 Đã sao chép liên kết bài viết!");
            console.log("✅ Link đã sao chép:", fullUrl);
        })
        .catch((err) => {
            console.error("❌ Lỗi sao chép:", err);
            showErrorNotification("Không thể sao chép liên kết.");
            
            // Fallback: Hiển thị link để copy thủ công
            prompt("Sao chép liên kết sau (Ctrl+C):", fullUrl);
        });
}
async function toggleFollow(userId) {
    console.log("🔄 toggleFollow called for user:", userId);
    
    // Lấy tất cả nút theo dõi cho user này
    const btns = document.querySelectorAll(`.follow-header-btn[data-user-id="${userId}"]`);
    if (!btns.length) {
        console.error("❌ Không tìm thấy nút theo dõi cho user:", userId);
        return;
    }
    
    // Lấy nút đầu tiên
    const btn = btns[0];
    const wasFollowing = btn.classList.contains("following");
    
    console.log("🔄 Current UI state:", wasFollowing ? "Đang theo dõi" : "Chưa theo dõi");
    
    // Disable button và hiển thị loading
    btns.forEach(button => {
        button.disabled = true;
        button.innerHTML = wasFollowing ? 
            `<span class="material-icons" style="font-size:16px;">hourglass_empty</span> Đang bỏ theo dõi...` : 
            `<span class="material-icons" style="font-size:16px;">hourglass_empty</span> Đang theo dõi...`;
    });
    
    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/follow/toggle.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `target_id=${encodeURIComponent(userId)}`
        });

        const data = await res.json();
        console.log("📡 API response:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Lỗi theo dõi.");
        }

        // 🟢 CẬP NHẬT STATE MỚI
        const newState = data.isFollowing;
        console.log("🔄 New state:", newState ? "Đang theo dõi" : "Đã bỏ theo dõi");
        
        // 1. Cập nhật UI
        updateAllFollowButtons(userId, newState);
        
        // 2. Cập nhật trong localStorage
        updateFollowStateInStorage(userId, newState);
        
        // 3. Cập nhật trong post data
        updateFollowingStateInPostData(userId, newState);
        
        // 4. Hiển thị thông báo
        showSuccessNotification(newState ? 
            "✅ Đã theo dõi thành công!" : 
            "Đã bỏ theo dõi");
            
        // 🟢 THÊM: Nếu đang ở tab "Following", reload feed
        if (COMMUNITY_SCOPE === 'following') {
            setTimeout(() => {
                loadCommunityFeed(1, 'following');
            }, 500);
        }
        
    } catch (err) {
        console.error("❌ Lỗi toggle follow:", err);
        
        // Khôi phục trạng thái cũ
        btns.forEach(button => {
            button.classList.toggle("following", wasFollowing);
            button.innerHTML = wasFollowing ? 
                `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_remove</span> Đang theo dõi` : 
                `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_add</span> Theo dõi`;
            button.disabled = false;
        });
        
        showErrorNotification("❌ Lỗi: " + err.message);
    }
}
function updateFollowStateInStorage(userId, isFollowing) {
    try {
        const followStates = JSON.parse(localStorage.getItem('followStates') || '{}');
        followStates[userId] = isFollowing;
        localStorage.setItem('followStates', JSON.stringify(followStates));
        console.log(`💾 Saved follow state for user ${userId} to localStorage: ${isFollowing}`);
    } catch (e) {
        console.warn("⚠️ Could not save to localStorage:", e);
    }
}

// 🟢 Hàm cập nhật state theo dõi trong post data
function updateFollowingStateInPostData(userId, isFollowing) {
    if (!window._communityPosts) return;
    
    Object.values(window._communityPosts).forEach(post => {
        const user = post.user || {};
        if (user.UserID == userId) {
            user.IsFollowing = isFollowing;
            console.log(`✅ Updated follow state for user ${userId} in post ${post.PostID}: ${isFollowing}`);
        }
        
        // Cập nhật cho shared posts
        if (post.OriginalPostID && post.OriginalPost) {
            const originalUser = post.OriginalPost.user || {};
            if (originalUser.UserID == userId) {
                originalUser.IsFollowing = isFollowing;
                console.log(`✅ Updated follow state for original user ${userId} in shared post ${post.PostID}`);
            }
        }
    });
}
function updateAllFollowButtons(userId, isFollowing) {
    console.log("🔄 Updating ALL follow buttons for user:", userId, "State:", isFollowing);
    
    // 1. Nút trong header bài viết (tất cả các nút trong trang)
    const headerBtns = document.querySelectorAll(`.follow-header-btn[data-user-id="${userId}"]`);
    
    // 2. Nút trong popup reaction (tooltip)
    const popupBtns = document.querySelectorAll(`[data-user-follow="${userId}"]`);
    
    // 3. Nút trong modal reaction
    const modalBtns = document.querySelectorAll(`#follow-btn-${userId}`);
    
    // 4. Gộp tất cả các nút lại
    const allFollowButtons = [...headerBtns, ...popupBtns, ...modalBtns];
    
    console.log(`📌 Found ${allFollowButtons.length} follow buttons for user ${userId}`);
    
    allFollowButtons.forEach(btn => {
        // Cập nhật class
        btn.classList.toggle("following", isFollowing);
        
        // Cập nhật nội dung với icon đẹp hơn
        btn.innerHTML = isFollowing ? 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_remove</span> Đang theo dõi` : 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_add</span> Theo dõi`;
        
        // Cập nhật trạng thái và data attribute
        btn.disabled = false;
        btn.dataset.isFollowing = isFollowing ? "1" : "0";
        
        // Cập nhật onclick function để đảm bảo tương lai click sẽ gọi đúng hàm
        if (btn.closest('.fb-user-item') || btn.id === `follow-btn-${userId}`) {
            // Nếu là nút trong popup reaction, gán lại onclick
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleFollowInPopup(userId);
            };
        } else {
            // Nếu là nút ngoài giao diện chính
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleFollow(userId);
            };
        }
    });
}
function syncFollowStateFromStorage() {
    try {
        const followStates = JSON.parse(localStorage.getItem('followStates') || '{}');
        
        Object.keys(followStates).forEach(userId => {
            const isFollowing = followStates[userId];
            updateAllFollowButtons(userId, isFollowing);
        });
        
        console.log('🔄 Synced follow states from localStorage');
    } catch (e) {
        console.warn('⚠️ Could not sync from localStorage:', e);
    }
}
// 🟢 SỬA HÀM NÀY - toggleFollowInPopup
// 🟢 SỬA HÀM NÀY - toggleFollowInPopup
async function toggleFollowInPopup(userId) {
    console.log("🔄 toggleFollowInPopup called for user:", userId);
    
    const btn = document.getElementById(`follow-btn-${userId}`);
    if (!btn) {
        console.error("❌ Không tìm thấy nút theo dõi trong popup:", userId);
        return;
    }
    
    const wasFollowing = btn.classList.contains("following");
    
    console.log("🔄 Current UI state in popup:", wasFollowing ? "Đang theo dõi" : "Chưa theo dõi");
    
    // Disable button và hiển thị loading
    btn.disabled = true;
    btn.innerHTML = wasFollowing ? 
        `<span class="material-icons" style="font-size:16px;">hourglass_empty</span> Đang bỏ theo dõi...` : 
        `<span class="material-icons" style="font-size:16px;">hourglass_empty</span> Đang theo dõi...`;
    
    try {
        // Gọi API theo dõi/bỏ theo dõi
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/follow/toggle.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `target_id=${encodeURIComponent(userId)}`
        });

        const data = await res.json();
        console.log("📡 API response from popup:", data);
        
        if (!data.success) {
            throw new Error(data.error || "Lỗi theo dõi.");
        }

        const newState = data.isFollowing;
        console.log("🔄 New state from popup:", newState ? "Đang theo dõi" : "Đã bỏ theo dõi");
        
        // 🟢 1. Cập nhật nút trong POPUP
        btn.classList.toggle("following", newState);
        btn.innerHTML = newState ? 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_remove</span> Đang theo dõi` : 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_add</span> Theo dõi`;
        btn.disabled = false;
        
        // 🟢 2. QUAN TRỌNG: Cập nhật nút NGOÀI TRANG (trong post)
        updateFollowButtonOutside(userId, newState);
        
        // 🟢 3. Lưu vào localStorage
        saveFollowStateToLocalStorage(userId, newState);
        
        // 4. Hiển thị thông báo
        showSuccessNotification(newState ? 
            "✅ Đã theo dõi thành công!" : 
            "Đã bỏ theo dõi");
        
    } catch (err) {
        console.error("❌ Lỗi toggle follow in popup:", err);
        
        // Khôi phục trạng thái cũ
        btn.classList.toggle("following", wasFollowing);
        btn.innerHTML = wasFollowing ? 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_remove</span> Đang theo dõi` : 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_add</span> Theo dõi`;
        btn.disabled = false;
        
        showErrorNotification("❌ Lỗi: " + err.message);
    }
}

// 🟢 THÊM HÀM MỚI: Cập nhật nút theo dõi ngoài trang
function updateFollowButtonOutside(userId, isFollowing) {
    console.log(`🔄 Updating follow button outside for user ${userId}: ${isFollowing ? 'Following' : 'Not following'}`);
    
    // Cập nhật tất cả nút theo dõi có data-user-id tương ứng
    const allFollowButtons = document.querySelectorAll(`.follow-header-btn[data-user-id="${userId}"]`);
    
    allFollowButtons.forEach(btn => {
        btn.classList.toggle("following", isFollowing);
        btn.innerHTML = isFollowing ? 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_remove</span> Đang theo dõi` : 
            `<span class="material-icons" style="font-size:16px;color:#1877f2;">person_add</span> Theo dõi`;
    });
    
    console.log(`✅ Updated ${allFollowButtons.length} follow buttons outside popup`);
}

// 🟢 THÊM HÀM MỚI: Lưu trạng thái vào localStorage
function saveFollowStateToLocalStorage(userId, isFollowing) {
    try {
        let followStates = {};
        const stored = localStorage.getItem('followStates');
        if (stored) {
            followStates = JSON.parse(stored);
        }
        
        followStates[userId] = isFollowing;
        localStorage.setItem('followStates', JSON.stringify(followStates));
        
        console.log(`💾 Saved follow state for user ${userId} to localStorage: ${isFollowing}`);
    } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e);
    }
}
function updateFollowButton(btn, isFollowing) {
    btn.classList.toggle("following", isFollowing);
    btn.textContent = isFollowing ? "Đang theo dõi" : "Theo dõi";
}

async function markWarningAsRead(warningId) {
    try {
        const response = await fetch(`${BASE_URL}/backend/api/community/admin/mark_warning_read.php`, {
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
function buildAvatarURL(user) {
    if (!user || !user.AvatarURL || user.AvatarURL.trim() === "") {
        return getSafeAvatarURL(null); // Trả về default avatar
    }
    
    return getSafeAvatarURL(user.AvatarURL);
}
function displayName(user) {
    if (!user || typeof user !== 'object') return "Người dùng";
    
    // 🟢 ƯU TIÊN TUYỆT ĐỐI USERNAME
    if (user.Username && user.Username.trim() !== "" && user.Username !== "undefined") {
        return user.Username;
    }
    
    // 🟢 CHỈ DÙNG FullName NẾU KHÔNG CÓ "NGƯỜI DÙNG MỚI"
    if (user.FullName && 
        user.FullName.trim() !== "" && 
        !user.FullName.includes("Người dùng mới") &&
        !user.FullName.includes("New User")) {
        return user.FullName;
    }
    
    // 🟢 NẾU FullName CÓ "NGƯỜI DÙNG MỚI", TRÍCH XUẤT PHẦN SAU
    if (user.FullName && user.FullName.includes("Người dùng mới")) {
        // Ví dụ: "Người dùng mới giakiet" → "giakiet"
        const parts = user.FullName.split("Người dùng mới");
        if (parts.length > 1 && parts[1].trim() !== "") {
            return parts[1].trim();
        }
    }
    
    return "Người dùng";
}

function togglePostMenu(postId) {
    console.log("🟡 Toggle menu for post:", postId);
    
    // Lấy menu hiện tại
    const menu = document.getElementById(`post-menu-${postId}`);
    if (!menu) {
        console.error("❌ Menu not found:", `post-menu-${postId}`);
        return;
    }
    
    // Kiểm tra nếu menu đang hiển thị
    const isVisible = menu.style.display === "block" || 
                     window.getComputedStyle(menu).display === "block" ||
                     menu.classList.contains("show");
    
    console.log("🟡 Menu visibility:", isVisible);
    console.log("🟡 Current style:", menu.style.display);
    console.log("🟡 Computed style:", window.getComputedStyle(menu).display);
    
    // Ẩn tất cả menu khác
    document.querySelectorAll(".post-menu-dropdown").forEach(m => {
        if (m !== menu) {
            m.style.display = "none";
            m.classList.remove("show");
        }
    });
    
    // Hiển thị/ẩn menu hiện tại
    if (isVisible) {
        menu.style.display = "none";
        menu.classList.remove("show");
    } else {
        menu.style.display = "block";
        menu.classList.add("show");
        
        // Đặt vị trí để không bị tràn màn hình
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        if (rect.right > viewportWidth - 10) {
            menu.style.right = "auto";
            menu.style.left = "-200px";
        }
    }
    
    console.log("🟡 New style:", menu.style.display);
}

// Đóng menu khi click ra ngoài
document.addEventListener("click", (e) => {
    if (!e.target.closest(".post-menu") && !e.target.closest(".post-menu-dropdown")) {
        document.querySelectorAll(".post-menu-dropdown").forEach(m => {
            m.style.display = "none";
            m.classList.remove("show");
        });
    }
});
document.addEventListener("click", (e) => {
    if (!e.target.closest(".post-menu")) {
        document.querySelectorAll(".post-menu-dropdown").forEach(m => m.style.display = "none");
    }
});

async function deletePost(postId) {
    if (!confirm("Bạn có chắc muốn xóa bài viết này không?")) return;
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: `post_id=${postId}`
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Không thể xóa bài viết.");
        showAdminNotification("✅ Bài viết đã được xóa!", 'success');
        loadCommunityFeed(); // reload lại feed
    } catch (err) {
        showAdminNotification("❌ Lỗi: " + err.message, 'error');
    }
}


async function forceReloadFeed() {
    console.log("🟡 Force reloading feed...");
    
    const feed = document.getElementById("community-feed");
    if (!feed) return;
    
    // Hiển thị loading
    feed.innerHTML = `<p class="feed-loading">Đang cập nhật...</p>`;
    
    try {
        // Tạo URL với timestamp để tránh cache
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        
        const res = await fetch(
            `${BASE_URL}/backend/api/community/posts/list.php?page=1&scope=${encodeURIComponent(COMMUNITY_SCOPE)}&_=${timestamp}&r=${random}`,
            {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }
        );
        
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const posts = data.posts || [];
        if (!posts.length) {
            feed.innerHTML = `<div class="empty-feed">
                <h3>Chưa có bài viết nào.</h3>
            </div>`;
            return;
        }

        feed.innerHTML = posts.map(renderPostCard).join("");
        window._communityPosts = {};
        posts.forEach(p => window._communityPosts[p.PostID] = p);
        
        console.log("✅ Feed reloaded with", posts.length, "posts");
        
    } catch (e) {
        console.error("Force reload error:", e);
        feed.innerHTML = `<p class="feed-error">Lỗi tải dữ liệu</p>`;
        
        // Thử reload bình thường
        setTimeout(() => loadCommunityFeed(1, COMMUNITY_SCOPE), 1000);
    }
    
}

/* ================= MEDIA VIEWER ================= */
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

function closePhotoViewer() {
    const v = document.getElementById("photo-viewer");
    if (v) v.remove();
}

function closeMediaViewer() {
    const v = document.getElementById("media-viewer");
    if (v) v.remove();
}

/* ===== GLOBAL FUNCTION EXPORTS ===== */
// Đảm bảo các hàm có thể gọi được từ HTML onclick
if (typeof window !== 'undefined') {
    // Các hàm từ file này
    window.processMentionsInContent = processMentionsInContent;
    window.displayName = displayName;
    window.buildAvatarURL = buildAvatarURL;
    
    // Các hàm comment (sẽ được ghi đè khi community-comments.js load)
    window.showReplyBox = window.showReplyBox || function(commentId, postId) {
        console.log('showReplyBox called but not loaded yet');
        // Fallback: mở input reply cơ bản
        const box = document.getElementById(`reply-box-${commentId}`);
        if (box) box.style.display = 'block';
    };
    
    window.loadReplies = window.loadReplies || function(parentId) {
        console.log('loadReplies called but not loaded yet');
    };
    
    console.log('✅ Main functions exported to global scope');
}

// ===================================
// ĐÁNH DẤU THÔNG BÁO BÁO CÁO ĐÃ ĐỌC
// ===================================

/**
 * Đánh dấu thông báo báo cáo đã đọc khi admin click vào
 * @param {number} commentId - ID của comment bị báo cáo
 * @param {string} type - Loại thông báo (mặc định: 'comment_reported')
 */
async function markReportNotificationAsRead(commentId, type = 'comment_reported') {
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('type', type);
        
        const res = await fetch(`${BASE_URL}/backend/api/community/notifications/mark_read.php`, {
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
function isAdmin() {
    return window.CURRENT_USER_ROLE && window.CURRENT_USER_ROLE.toLowerCase() === 'admin';
}

/**
 * Hiển thị panel quản trị cho comment bị báo cáo
 */
function showAdminPanel(commentId) {
    if (!isAdmin()) return;
    
    const comment = document.getElementById(`comment-${commentId}`);
    if (!comment) {
        console.error('Không tìm thấy comment:', commentId);
        return;
    }
    
    // Xóa panel cũ nếu có
    const oldPanel = document.getElementById(`admin-panel-${commentId}`);
    if (oldPanel) oldPanel.remove();
    
    // Lấy thông tin người dùng từ data attributes
    const userId = comment.dataset.userId;
    const username = comment.dataset.username;
    const displayName = comment.dataset.displayName;
    
    // Tạo panel admin
    const panel = document.createElement('div');
    panel.id = `admin-panel-${commentId}`;
    panel.className = 'admin-panel';
    panel.innerHTML = `
        <div class="admin-panel-header">
            <h4>🚨 QUẢN TRỊ VIÊN</h4>
            <p class="admin-warning">Comment này đã bị báo cáo</p>
        </div>
        
        <div class="admin-panel-info">
            <div class="admin-user-info">
                <strong>Người đăng:</strong> 
                <span class="admin-user-name" onclick="openUserProfile('${username}')">${displayName || username}</span>
                <span class="admin-user-id">(ID: ${userId})</span>
            </div>
        </div>
        
        <div class="admin-panel-actions">
            <button class="admin-action-btn delete-btn" onclick="adminDeleteComment(${commentId})">
                <span class="material-icons">delete</span>
                Xóa comment
            </button>
            
            <button class="admin-action-btn ban-btn" onclick="adminBanUser(${userId}, '${username}')">
                <span class="material-icons">block</span>
                Cấm chat người dùng
            </button>
            
            <button class="admin-action-btn dismiss-btn" onclick="dismissReport(${commentId})">
                <span class="material-icons">check_circle</span>
                Bỏ qua báo cáo
            </button>
        </div>
        
        <div class="admin-panel-close" onclick="closeAdminPanel(${commentId})">
            <span class="material-icons">close</span>
        </div>
    `;
    
    comment.appendChild(panel);
    
    // Thêm CSS cho panel nếu chưa có
    addAdminPanelStyles();
    
    // Highlight comment bị báo cáo
    highlightReportedComment(commentId);
}

/**
 * Đóng panel admin
 */
function closeAdminPanel(commentId) {
    const panel = document.getElementById(`admin-panel-${commentId}`);
    if (panel) panel.remove();
    
    // Bỏ highlight
    const comment = document.getElementById(`comment-${commentId}`);
    if (comment) {
        comment.classList.remove('reported-comment');
    }
}

/**
 * Highlight comment bị báo cáo
 */
function highlightReportedComment(commentId) {
    const comment = document.getElementById(`comment-${commentId}`);
    if (comment) {
        comment.classList.add('reported-comment');
        
        // Scroll đến comment nếu cần
        comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
async function adminDeleteComment(commentId) {
    if (!confirm('Bạn có chắc muốn xóa comment này? Hành động này không thể hoàn tác.')) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('admin_action', '1');
        
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
                    // Thông báo thành công
                    showAdminNotification('✅ Đã xóa comment thành công');
                }, 300);
            }
            
            // Đóng panel admin
            closeAdminPanel(commentId);
            
            // Đánh dấu thông báo đã đọc
            if (window.markReportNotificationAsRead) {
                markReportNotificationAsRead(commentId, 'comment_reported');
            }
            
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể xóa comment'));
        }
        
    } catch (err) {
        console.error('❌ Lỗi xóa comment:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Cấm chat người dùng
 */
async function adminBanUser(userId, username) {
    if (!confirm(`Bạn có chắc muốn cấm chat người dùng "${username}"? Người dùng này sẽ không thể bình luận cho đến khi được mở lại.`)) {
        return;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('user_id', userId);
        formData.append('duration', '30'); // 30 ngày
        
        const res = await fetch(`${BASE_URL}/backend/api/community/user/check_ban.php`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' 
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Thông báo thành công
            showAdminNotification(`✅ Đã cấm chat người dùng "${username}" thành công`);
            
            // Cập nhật UI nếu cần
            const comment = document.querySelector(`[data-user-id="${userId}"]`);
            if (comment) {
                comment.classList.add('user-banned');
            }
            
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể cấm người dùng'));
        }
        
    } catch (err) {
        console.error('❌ Lỗi cấm người dùng:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Bỏ qua báo cáo
 */
async function dismissReport(commentId) {
    try {
        const formData = new URLSearchParams();
        formData.append('comment_id', commentId);
        formData.append('action', 'dismiss');
        
        const res = await fetch(`${BASE_URL}/backend/api/community/comments/report.php`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' 
            },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Bỏ highlight
            const comment = document.getElementById(`comment-${commentId}`);
            if (comment) {
                comment.classList.remove('reported-comment');
            }
            
            // Đóng panel admin
            closeAdminPanel(commentId);
            
            // Đánh dấu thông báo đã đọc
            if (window.markReportNotificationAsRead) {
                markReportNotificationAsRead(commentId, 'comment_reported');
            }
            
            showAdminNotification('✅ Đã bỏ qua báo cáo');
            
        } else {
            alert('❌ Lỗi: ' + (data.error || 'Không thể bỏ qua báo cáo'));
        }
        
    } catch (err) {
        console.error('❌ Lỗi bỏ qua báo cáo:', err);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
    }
}

/**
 * Hiển thị thông báo cho admin
 */
function showAdminNotification(message) {
    // Xóa thông báo cũ nếu có
    const oldNotification = document.getElementById('admin-notification');
    if (oldNotification) oldNotification.remove();
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    notification.id = 'admin-notification';
    notification.className = 'admin-notification';
    notification.innerHTML = `
        <div class="admin-notification-content">
            <span class="material-icons">admin_panel_settings</span>
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
function updateRenderCommentItem() {
    // Lưu hàm gốc
    const originalRenderCommentItem = window.renderCommentItem || function() {};
    
    // Ghi đè hàm renderCommentItem
    window.renderCommentItem = function(c, postId) {
        let html = originalRenderCommentItem(c, postId);
        
        // Thêm data attributes nếu là admin
        if (isAdmin()) {
            const cu = c.user || {};
            const userId = cu.UserID || 0;
            const username = cu.Username || '';
            const name = displayName(cu);
            
            // Thêm data attributes cho comment
            html = html.replace(
                /<div class="comment-item"/,
                `<div class="comment-item" data-user-id="${userId}" data-username="${username}" data-display-name="${escapeHtml(name)}"`
            );
            
            // Thêm nút admin vào menu
            if (html.includes('comment-menu-dropdown')) {
                const adminMenu = `
                    <div class="comment-menu-divider"></div>
                    <button class="comment-menu-item admin-delete" 
                            onclick="adminDeleteComment(${c.CommentID})">
                        <span class="material-icons" style="font-size:18px; color:#d32f2f;">delete_forever</span>
                        <span style="color:#d32f2f; font-weight:600">Xóa (Admin)</span>
                    </button>
                    <button class="comment-menu-item admin-ban" 
                            onclick="adminBanUser(${userId}, '${username}')">
                        <span class="material-icons" style="font-size:18px; color:#f57c00;">block</span>
                        <span style="color:#f57c00; font-weight:600">Cấm người dùng</span>
                    </button>
                `;
                
                html = html.replace(
                    /<div class="comment-menu-divider"><\/div>\s*<button class="comment-menu-item delete"/,
                    `${adminMenu}<div class="comment-menu-divider"></div><button class="comment-menu-item delete"`
                );
                
                // Nếu không có delete button (comment của người khác)
                if (!html.includes('comment-menu-item delete')) {
                    html = html.replace(
                        /<div class="comment-menu-dropdown" id="comment-menu-\d+">/,
                        `<div class="comment-menu-dropdown" id="comment-menu-${c.CommentID}">${adminMenu}`
                    );
                }
            }
        }
        
        return html;
    };
}
document.addEventListener('DOMContentLoaded', function() {
    // Cập nhật hàm render comment nếu là admin
    if (isAdmin()) {
        updateRenderCommentItem();
        
        // Thêm styles nếu chưa có
        setTimeout(() => {
            if (typeof addAdminPanelStyles === 'function') {
                addAdminPanelStyles();
            }
        }, 100);
        
        // Tự động highlight comment bị báo cáo nếu có trong URL
        const urlParams = new URLSearchParams(window.location.search);
        const highlightCommentId = urlParams.get('highlight');
        const adminView = urlParams.get('admin_view');
        
        if (highlightCommentId && adminView) {
            setTimeout(() => {
                const comment = document.getElementById(`comment-${highlightCommentId}`);
                if (comment) {
                    highlightReportedComment(highlightCommentId);
                    showAdminPanel(highlightCommentId);
                    
                    // Đánh dấu thông báo đã đọc
                    markReportNotificationAsRead(highlightCommentId, 'comment_reported');
                }
            }, 1500);
        }
    }
});

// Export functions to global scope
if (typeof window !== 'undefined') {
    window.isAdmin = isAdmin;
    window.showAdminPanel = showAdminPanel;
    window.closeAdminPanel = closeAdminPanel;
    window.adminDeleteComment = adminDeleteComment;
    window.adminBanUser = adminBanUser;
    window.dismissReport = dismissReport;
    window.highlightReportedComment = highlightReportedComment;
}
/* ========== ADMIN FUNCTIONS ========== */

// Biến toàn cục để kiểm tra quyền admin
let IS_ADMIN = false;

// Khởi tạo admin
function initAdminFeatures() {
    // Kiểm tra nếu là admin
    IS_ADMIN = window.CURRENT_USER_ROLE === 'Admin';
    
    if (IS_ADMIN) {
        console.log('🛡️ Admin features enabled');
        
        // Thêm nút admin toggle
        addAdminToggleButton();
        
        // Thêm admin badge vào tên admin
        addAdminBadges();
        
        // Thêm admin menu vào các bài viết
        addAdminMenusToPosts();
        
        // Thêm sự kiện click cho các nút admin
        document.addEventListener('click', handleAdminActions);
        
        // Kiểm tra URL parameters cho admin view
        checkAdminUrlParams();
    }
}

// Thêm nút toggle admin view
function addAdminToggleButton() {
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'admin-view-toggle';
    toggleBtn.innerHTML = `
        <button class="admin-view-toggle-btn" onclick="toggleAdminView()">
            <span class="material-icons">admin_panel_settings</span>
        </button>
    `;
    document.body.appendChild(toggleBtn);
}

// Chuyển đổi chế độ xem admin
function toggleAdminView() {
    const posts = document.querySelectorAll('.community-post');
    posts.forEach(post => {
        post.classList.toggle('admin-view');
        
        // Hiển thị thông tin báo cáo nếu có
        if (post.classList.contains('admin-view')) {
            showPostReportInfo(post);
        }
    });
    
    showAdminNotification(
        posts[0].classList.contains('admin-view') ? 
        'Đã bật chế độ xem Admin' : 
        'Đã tắt chế độ xem Admin',
        'info'
    );
}

// Hiển thị thông tin báo cáo bài viết
function showPostReportInfo(postElement) {
    const postId = postElement.dataset.postId;
    if (!postId) return;
    
    // Kiểm tra nếu đã có badge báo cáo
    if (postElement.querySelector('.post-reported-badge')) return;
    
    // Gọi API để lấy thông tin báo cáo
    fetch(`${BASE_URL}/backend/api/community/posts/report_info.php?post_id=${postId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.report_count > 0) {
                const badge = document.createElement('div');
                badge.className = 'post-reported-badge';
                badge.innerHTML = `🚨 ${data.report_count} báo cáo`;
                badge.title = `Có ${data.report_count} báo cáo cho bài viết này`;
                postElement.style.position = 'relative';
                postElement.appendChild(badge);
            }
        })
        .catch(console.error);
}

// Thêm admin badge vào tên admin
function addAdminBadges() {
    // Thêm vào tên người dùng trong bài viết
    document.querySelectorAll('.author-name').forEach(nameEl => {
        const username = nameEl.textContent.trim();
        if (username === window.CURRENT_USERNAME) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'Admin';
            nameEl.appendChild(badge);
        }
    });
}

// Thêm menu admin vào các bài viết
function addAdminMenusToPosts() {
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
        const postId = menu.id.replace('post-menu-', '');
        
        // Chỉ thêm nếu chưa có admin actions
        if (!menu.querySelector('.admin-action')) {
            const adminActions = document.createElement('div');
            adminActions.className = 'admin-action';
            adminActions.innerHTML = `
                <button class="post-menu-item admin-btn" onclick="adminWarnUserFromPost(${postId})">
                    <span class="material-icons">warning</span>
                    Cảnh cáo người đăng
                </button>
                <button class="post-menu-item admin-btn" onclick="adminBanUserFromPost(${postId})">
                    <span class="material-icons">block</span>
                    Chặn đăng bài
                </button>
                <button class="post-menu-item admin-btn" onclick="adminDeletePost(${postId})">
                    <span class="material-icons">delete_forever</span>
                    Xóa bài viết
                </button>
                <button class="post-menu-item admin-btn" onclick="adminHidePost(${postId})">
                    <span class="material-icons">visibility_off</span>
                    Ẩn bài viết
                </button>
            `;
            menu.appendChild(adminActions);
        }
    });
}

// Xử lý các hành động admin
function handleAdminActions(e) {
    // Xử lý báo cáo bài viết
    if (e.target.closest('.report-post-btn')) {
        e.preventDefault();
        const postId = e.target.closest('.community-post').dataset.postId;
        if (postId) {
            showReportPostModal(postId);
        }
    }
}

// Hiển thị modal báo cáo bài viết - VERSION FIXED
function showReportPostModal(postId) {
    // Kiểm tra đăng nhập trước
    if (!window.CURRENT_USERNAME) {
        showAdminNotification('Vui lòng đăng nhập để báo cáo bài viết', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal" style="max-width: 400px;">
            <div class="admin-modal-header">
                <span class="material-icons" style="color: #ff9800;">flag</span>
                <h3 style="font-size: 18px;">Báo cáo bài viết</h3>
                <button class="admin-modal-close" onclick="closeAdminModal()">×</button>
            </div>
            <div class="admin-modal-body">
                <div class="admin-form-group">
                    <label>Loại báo cáo:</label>
                    <select id="report-type" class="admin-form-control" style="padding: 8px;">
                        <option value="spam">Spam</option>
                        <option value="abuse">Lăng mạ, quấy rối</option>
                        <option value="inappropriate">Nội dung không phù hợp</option>
                        <option value="copyright">Vi phạm bản quyền</option>
                        <option value="other">Khác</option>
                    </select>
                </div>
                
                <div class="admin-form-group">
                    <label for="report-reason">Lý do chi tiết:</label>
                    <textarea id="report-reason" class="admin-form-control textarea" 
                              placeholder="Mô tả lý do báo cáo..." 
                              rows="4" style="min-height: 80px;" required></textarea>
                </div>
                
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">info</span>
                    Báo cáo của bạn sẽ được xem xét bởi quản trị viên.
                </div>
            </div>
            <div class="admin-modal-footer">
                <button class="admin-btn admin-btn-secondary" onclick="closeAdminModal()" style="padding: 8px 16px;">
                    Hủy
                </button>
                <button class="admin-btn admin-btn-warning" onclick="submitReportPost(${postId})" 
                        style="padding: 8px 16px;">
                    <span class="material-icons" style="font-size: 18px;">flag</span>
                    Gửi báo cáo
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Focus vào textarea
    setTimeout(() => {
        const textarea = document.getElementById('report-reason');
        if (textarea) textarea.focus();
    }, 100);   
}

async function submitReportPost(postId) {
    console.log('=== DEBUG REPORT FUNCTION START ===');
    
    const reasonInput = document.getElementById('report-reason');
    const typeSelect = document.getElementById('report-type');
    
    if (!reasonInput || !typeSelect) {
        console.error('Form elements not found');
        showAdminNotification('Form báo cáo không hợp lệ', 'error');
        return;
    }
    
    const reason = reasonInput.value.trim();
    const reportType = typeSelect.value;
    
    console.log('Input data:', { postId, reason, reportType });
    
    if (!reason) {
        showAdminNotification('Vui lòng nhập lý do báo cáo', 'error');
        return;
    }
    
    // Disable button
    const submitBtn = document.querySelector('.admin-btn[onclick*="submitReportPost"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang gửi...';
    }
    
    try {
        showAdminNotification('⏳ Đang gửi báo cáo...', 'info');
        
        const formData = new URLSearchParams();
        formData.append('post_id', postId);
        formData.append('reason', reason);
        formData.append('report_type', reportType);
        formData.append('_t', Date.now()); // Cache buster
        
        console.log('Sending request to:', '/HeThongChamSocCaKoi/backend/api/community/posts/report.php');
        console.log('Form data:', formData.toString());
        
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/community/posts/report.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData.toString(),
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const responseText = await response.text();
        console.log('Raw response (first 500 chars):', responseText.substring(0, 500));
        
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Parsed JSON:', data);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Server trả về dữ liệu không hợp lệ');
        }
        
        // Xử lý các trạng thái HTTP
        if (response.status === 409) { // Conflict - Đã báo cáo rồi
            closeAdminModal();
            showAdminNotification('ℹ️ ' + (data.message || 'Bạn đã báo cáo bài viết này rồi'), 'info');
            return;
        }
        
        if (response.status === 401) { // Unauthorized
            showAdminNotification('❌ Vui lòng đăng nhập để báo cáo', 'error');
            return;
        }
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || data.message || 'Không thể gửi báo cáo');
        }
        
        // Thành công
        closeAdminModal();
        showAdminNotification('✅ ' + data.message, 'success');
        
        // Cập nhật UI nếu cần
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (post) {
            // Có thể thêm visual feedback ở đây
            const reportBtn = post.querySelector('.report-post-btn');
            if (reportBtn) {
                reportBtn.innerHTML = '<span class="material-icons">flag</span> Đã báo cáo';
                reportBtn.style.color = '#4caf50';
                reportBtn.disabled = true;
            }
        }
        
    } catch (error) {
        console.error('❌ Report post error:', error);
        
        let errorMessage = error.message;
        
        // User-friendly error messages
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Không thể kết nối đến server';
        } else if (error.message.includes('401')) {
            errorMessage = 'Vui lòng đăng nhập để báo cáo';
        } else if (error.message.includes('403')) {
            errorMessage = 'Bạn không có quyền báo cáo';
        } else if (error.message.includes('404')) {
            errorMessage = 'Bài viết không tồn tại';
        } else if (error.message.includes('409')) {
            errorMessage = 'Bạn đã báo cáo bài viết này rồi';
        } else if (error.message.includes('500')) {
            errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }
        
        showAdminNotification('❌ ' + errorMessage, 'error');
        
    } finally {
        console.log('=== DEBUG REPORT FUNCTION END ===');
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-icons">flag</span> Gửi báo cáo';
        }
    }
}
/**
 * Thêm CSS styles cho panel admin
 */
function addAdminPanelStyles() {
    // Kiểm tra xem styles đã được thêm chưa
    if (document.getElementById('admin-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'admin-panel-styles';
    style.textContent = `
        /* Panel admin */
        .admin-panel {
            position: relative;
            background: linear-gradient(135deg, #fff3e0 0%, #ffecb3 100%);
            border: 2px solid #ff9800;
            border-radius: 12px;
            padding: 16px;
            margin-top: 12px;
            margin-bottom: 12px;
            box-shadow: 0 4px 20px rgba(255, 152, 0, 0.2);
            animation: slideDown 0.3s ease;
            z-index: 1000;
        }
        
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .admin-panel-header {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ff9800;
        }
        
        .admin-panel-header h4 {
            margin: 0 0 4px 0;
            color: #d84315;
            font-size: 16px;
        }
        
        .admin-warning {
            margin: 0;
            color: #ff6f00;
            font-size: 14px;
            font-weight: 500;
        }
        
        .admin-panel-info {
            margin-bottom: 16px;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #ffcc80;
        }
        
        .admin-user-info {
            font-size: 14px;
        }
        
        .admin-user-name {
            color: #1976d2;
            cursor: pointer;
            font-weight: 600;
            margin: 0 4px;
        }
        
        .admin-user-name:hover {
            text-decoration: underline;
        }
        
        .admin-user-id {
            color: #666;
            font-size: 12px;
        }
        
        .admin-panel-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .admin-action-btn {
            flex: 1;
            min-width: 140px;
            padding: 10px 12px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        
        .admin-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .delete-btn {
            background: #ffebee;
            color: #d32f2f;
            border: 1px solid #ffcdd2;
        }
        
        .delete-btn:hover {
            background: #ffcdd2;
        }
        
        .ban-btn {
            background: #fff3e0;
            color: #f57c00;
            border: 1px solid #ffe0b2;
        }
        
        .ban-btn:hover {
            background: #ffe0b2;
        }
        
        .dismiss-btn {
            background: #e8f5e8;
            color: #388e3c;
            border: 1px solid #c8e6c9;
        }
        
        .dismiss-btn:hover {
            background: #c8e6c9;
        }
        
        .admin-panel-close {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #666;
            border: 1px solid #ddd;
            transition: all 0.2s ease;
        }
        
        .admin-panel-close:hover {
            background: #f5f5f5;
            color: #d32f2f;
            border-color: #d32f2f;
        }
        
        /* Comment bị báo cáo */
        .reported-comment {
            border: 3px solid #ff9800 !important;
            border-radius: 12px;
            padding: 8px;
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 50%, #fff8e1 100%) !important;
            animation: pulseWarning 2s infinite;
            box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.1);
            position: relative;
        }
        
        .reported-comment::before {
            content: "🚨 BÁO CÁO";
            position: absolute;
            top: -12px;
            right: 10px;
            background: #ff9800;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            z-index: 100;
        }
        
        @keyframes pulseWarning {
            0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 152, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); }
        }
        
        /* Thông báo admin */
        .admin-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            z-index: 99999;
            animation: slideInRight 0.5s ease;
            max-width: 400px;
        }
        
        .admin-notification.fade-out {
            animation: slideOutRight 0.3s ease forwards;
        }
        
        .admin-notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .admin-notification-content .material-icons {
            font-size: 20px;
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        /* Người dùng bị cấm */
        .user-banned .comment-name {
            color: #d32f2f !important;
            text-decoration: line-through;
        }
        
        .user-banned::after {
            content: "⛔ BỊ CẤM";
            display: inline-block;
            background: #ffcdd2;
            color: #d32f2f;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
            vertical-align: middle;
        }
    `;
    
    document.head.appendChild(style);
}

/* ========== UI HELPER FUNCTIONS ========== */

// Hiển thị thông báo admin
function showAdminNotification(message, type = 'info') {
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
}

// Thêm badge cảnh cáo
function addWarningBadge(postElement, userName) {
    const header = postElement.querySelector('.post-header');
    if (header && !header.querySelector('.user-warning-badge')) {
        const badge = document.createElement('span');
        badge.className = 'user-warning-badge';
        badge.innerHTML = '⚠️ Đã cảnh cáo';
        badge.title = `${userName} đã bị cảnh cáo`;
        badge.style.cssText = `
            margin-left: 8px;
            color: #ff9800;
            font-size: 12px;
            font-weight: bold;
            background: #fff3e0;
            padding: 2px 8px;
            border-radius: 12px;
            border: 1px solid #ffcc80;
        `;
        header.appendChild(badge);
    }
}
// Thêm badge báo cáo
function addReportBadge(postElement) {
    if (!postElement.querySelector('.post-reported-badge')) {
        const badge = document.createElement('div');
        badge.className = 'post-reported-badge';
        badge.innerHTML = '🚨 Đã báo cáo';
        badge.title = 'Bài viết này đã được báo cáo';
        postElement.style.position = 'relative';
        postElement.appendChild(badge);
    }
}
/* ===== THÊM NÚT QUẢN LÝ VÀO ACTIONS ===== */
function addManageButtonToPost(post) {
    const postId = post.dataset.postId;
    const actions = post.querySelector('.post-actions');
    
    if (!actions) return;
    
    // Xóa nút báo cáo nếu có
    const reportBtn = actions.querySelector('.report-post-btn');
    if (reportBtn) reportBtn.remove();
    
    // Kiểm tra đã có nút Quản lý chưa
    if (actions.querySelector('.admin-manage-btn')) return;
    
    // Tạo nút Quản lý
    const manageBtn = document.createElement('button');
    manageBtn.className = 'post-action-btn admin-manage-btn';
    manageBtn.innerHTML = `
        <span class="material-icons">admin_panel_settings</span>
        <span>Quản lý</span>
    `;
    manageBtn.dataset.postId = postId;
    manageBtn.onclick = (e) => {
        e.stopPropagation();
        showAdminManageMenu(postId);
    };
    
    // Thêm vào vị trí của nút báo cáo
    actions.appendChild(manageBtn);
}

/* ===== HIỂN THỊ MENU QUẢN LÝ KHI CLICK NÚT ===== */
function showAdminManageMenu(postId) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post) return;
    
    // Tạo menu quản lý popup
    const menu = document.createElement('div');
    menu.className = 'admin-manage-menu-popup';
    menu.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-title">Quản lý bài viết</div>
            <button class="admin-action-btn delete" onclick="adminDeletePost(${postId})">
                <span class="material-icons">delete_forever</span>
                Xóa bài viết
            </button>
            <button class="admin-action-btn warn" onclick="adminWarnUserFromPost(${postId})">
                <span class="material-icons">warning</span>
                Cảnh cáo người đăng
            </button>
            <button class="admin-action-btn ban" onclick="adminBanUserFromPost(${postId})">
                <span class="material-icons">block</span>
                Chặn người dùng
            </button>
        </div>
    `;
    
    // Đặt vị trí và hiển thị
    const manageBtn = post.querySelector('.admin-manage-btn');
    if (manageBtn) {
        const rect = manageBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.left = (rect.left - 150) + 'px';
        menu.style.zIndex = '9999';
        menu.style.background = 'white';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        menu.style.padding = '8px 0';
        menu.style.minWidth = '200px';
    }
    
    document.body.appendChild(menu);
    
    // Đóng menu khi click ra ngoài
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !post.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}
// ========= XÓA HÀM CŨ VÀ THAY THẾ BẰNG HÀM MỚI =========
// Xóa hoàn toàn hàm cũ và thay bằng hàm chỉ nhận số
function safeOpenUserProfile(input) {
    console.log("🔄 safeOpenUserProfile called with:", input, "Type:", typeof input);
    
    // 🟢 Nếu input là số -> dùng trực tiếp
    if (typeof input === 'number' && input > 0) {
        console.log("✅ Using number directly:", input);
        window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=${input}`;
        return;
    }
    
    // 🟢 Nếu input là string, thử parse số
    if (typeof input === 'string') {
        const num = parseInt(input);
        if (!isNaN(num) && num > 0) {
            console.log("✅ Parsed number from string:", input, "->", num);
            window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=${num}`;
            return;
        }
    }
    
    // 🟢 Nếu đến đây, có nghĩa là input là username (nhunhat)
    console.error("❌ safeOpenUserProfile received username:", input);
    console.trace("📍 Trace to see where this is called from");
    
    // TÌM USER ID TỪ DOM BẰNG USERNAME
    let foundUserId = null;
    
    // Tìm trong tất cả bài viết
    document.querySelectorAll('.community-post').forEach(post => {
        // Kiểm tra username trong text content
        const nameElement = post.querySelector('.author-name');
        if (nameElement && nameElement.textContent.trim() === input) {
            foundUserId = post.dataset.userId;
            console.log("🔍 Found user ID for username", input, ":", foundUserId);
        }
    });
    
    if (foundUserId && foundUserId > 0) {
        console.log("✅ Redirecting with found ID:", foundUserId);
        window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=${foundUserId}`;
    } else {
        // Fallback: dùng username trong URL
        console.log("⚠️ Using username in URL as fallback");
        const encodedUsername = encodeURIComponent(input);
        window.location.href = `/HeThongChamSocCaKoi/frontend/users/public_profile.php?u=${encodedUsername}`;
    }
}
// Export functions
if (typeof window !== 'undefined') {
    window.openUserProfile = safeOpenUserProfile;
    window.buildAvatarURL = buildAvatarURL;
    window.displayName = displayName;
}

// Thêm CSS cho avatar clickable
const style = document.createElement('style');
style.textContent = `
    .post-avatar {
        cursor: pointer !important;
        transition: opacity 0.2s ease !important;
    }
    .post-avatar:hover {
        opacity: 0.8 !important;
    }
    .post-avatar:active {
        transform: scale(0.95) !important;
    }
    .author-name {
        cursor: pointer !important;
        color: #385898 !important;
    }
    .author-name:hover {
        text-decoration: underline !important;
    }
`;
document.head.appendChild(style);
document.addEventListener('click', function(e) {
    // Click vào avatar
    if (e.target.closest('.post-avatar')) {
        const avatar = e.target.closest('.post-avatar');
        console.log("🖱️ Clicked on avatar:", avatar);
        
        // Tìm username gần nhất
        const post = avatar.closest('.community-post');
        if (post) {
            const username = post.dataset.username || 
                           post.querySelector('.author-name')?.dataset.username ||
                           post.querySelector('[data-username]')?.dataset.username;
            
            console.log("🔍 Found username in post:", username);
            
            if (username) {
                e.preventDefault();
                e.stopPropagation();
                openUserProfile(username);
            }
        }
    }
    
    // Click vào author name
    if (e.target.closest('.author-name')) {
        const nameElement = e.target.closest('.author-name');
        console.log("🖱️ Clicked on author name:", nameElement);
        
        // Lấy username từ data attribute hoặc text
        const username = nameElement.dataset.username || 
                        nameElement.textContent.trim();
        
        console.log("🔍 Username from author name:", username);
        
        if (username && username !== "Người dùng") {
            e.preventDefault();
            e.stopPropagation();
            openUserProfile(username);
        }
    }
});
// Thêm vào community-main.js
function renderSharedPostMediaLayout(media, postId) {
    const count = media.length;
    if (count === 0) return "";
    
    console.log(`🎨 Rendering ${count} media for shared post ${postId}`);

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
    let gridClass = "grid-1";
    let html = "";
    
    if (count === 1) {
        gridClass = "grid-1";
        html = media.map((m, i) => itemHTML(m, i)).join('');
    } 
    else if (count === 2) {
        gridClass = "grid-2";
        html = media.map((m, i) => itemHTML(m, i)).join('');
    }
    else if (count === 3) {
        gridClass = "grid-3";
        html = media.map((m, i) => itemHTML(m, i)).join('');
    }
    else if (count === 4) {
        gridClass = "grid-4";
        html = media.map((m, i) => itemHTML(m, i)).join('');
    }
    else if (count === 5) {
        gridClass = "grid-5";
        html = media.map((m, i) => itemHTML(m, i)).join('');
    }
    else if (count >= 6) {
        gridClass = "grid-many";
        const displayCount = Math.min(count, 6);
        
        for (let i = 0; i < displayCount; i++) {
            const mediaItem = media[i];
            const isLast = i === 5 && count > 6;
            const remaining = count - 6;
            html += itemHTML(mediaItem, i, isLast, remaining);
        }
    }
    
    return `<div class="post-media-grid ${gridClass}">${html}</div>`;
}
// Thêm vào phần đầu file hoặc trong DOMContentLoaded
function addSharedPostStyles() {
    if (document.getElementById('shared-post-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'shared-post-styles';
    style.textContent = `
        /* Shared post media grid */
        .shared-box .post-media-grid {
            margin: 10px 0;
            display: grid;
            gap: 4px;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
        }
        
        .shared-box .post-media-grid.grid-1 {
            grid-template-columns: 1fr;
            max-height: 500px;
        }
        
        .shared-box .post-media-grid.grid-2 {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr;
        }
        
        .shared-box .post-media-grid.grid-3 {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
        }
        
        .shared-box .post-media-grid.grid-3 .media-0 {
            grid-column: 1 / 3;
            grid-row: 1 / 2;
        }
        
        .shared-box .post-media-grid.grid-4 {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
        }
        
        .shared-box .post-media-grid.grid-5 {
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;
        }
        
        .shared-box .post-media-grid.grid-5 .media-0 {
            grid-column: 1 / 3;
            grid-row: 1 / 3;
        }
        
        .shared-box .post-media-grid.grid-many {
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: 1fr 1fr;
        }
        
        /* Đảm bảo media item hiển thị đúng */
        .shared-box .media-item {
            position: relative;
            overflow: hidden;
            background: #f0f2f5;
            height: 100%;
        }
        
        .shared-box .media-item img,
        .shared-box .media-item video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        /* Fix cho shared box */
        .shared-body {
            cursor: pointer;
        }
        
        /* Đảm bảo media grid không bị ảnh hưởng bởi CSS khác */
        .shared-box .post-media-grid {
            display: grid !important;
            width: 100% !important;
        }
        
        /* Fix cho video trong shared post */
        .shared-box video {
            width: 100%;
            height: auto;
            max-height: 400px;
        }
        
        /* Fix layout nhiều ảnh */
        .shared-box .grid-many .media-item:nth-child(1) {
            grid-column: 1 / 3;
            grid-row: 1 / 3;
        }
        
        .shared-box .grid-many .media-item:nth-child(2) {
            grid-column: 3 / 4;
            grid-row: 1 / 2;
        }
        
        .shared-box .grid-many .media-item:nth-child(3) {
            grid-column: 3 / 4;
            grid-row: 2 / 3;
        }
        
        .shared-box .grid-many .media-item:nth-child(4) {
            grid-column: 1 / 2;
            grid-row: 3 / 4;
        }
        
        .shared-box .grid-many .media-item:nth-child(5) {
            grid-column: 2 / 4;
            grid-row: 3 / 4;
        }
        
        /* Overlay cho ảnh thứ 6+ */
        .shared-box .overlay-item {
            position: relative;
        }
        
        .shared-box .overlay-item::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .shared-box .more-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 24px;
            font-weight: bold;
            z-index: 2;
        }
    `;
    
    document.head.appendChild(style);
}
// Export functions
if (typeof window !== 'undefined') {
    window.openUserProfile = openUserProfile;
    window.buildAvatarURL = buildAvatarURL;
    window.displayName = displayName;
}
function closeAllMenus() {
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
        menu.style.display = 'none';
        menu.classList.remove('show');
    });
    document.querySelectorAll('.admin-manage-menu-popup').forEach(menu => menu.remove());
}
document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu') && 
        !e.target.closest('.post-menu-dropdown') &&
        !e.target.closest('.admin-manage-btn')) {
        closeAllMenus();
    }
});
function classifyPostByUserRole() {
    const posts = document.querySelectorAll('.community-post');
    const currentUserIsAdmin = window.CURRENT_USER_ROLE === 'Admin';
    
    posts.forEach(post => {
        const userId = post.dataset.userId;
        const isCurrentUserPost = userId == window.CURRENT_USER_ID;
        
        // Xóa class cũ
        post.classList.remove('admin-viewing-own', 'admin-viewing-others', 'user-post');
        
        // Thêm class mới
        if (currentUserIsAdmin && isCurrentUserPost) {
            post.classList.add('admin-viewing-own');
        } else if (currentUserIsAdmin && !isCurrentUserPost) {
            post.classList.add('admin-viewing-others');
        } else {
            post.classList.add('user-post');
        }
    });
}

// Gọi hàm phân loại sau khi load feed
setTimeout(() => {
    classifyPostByUserRole();
}, 1000);
/* ===== THÊM MENU ADMIN VÀO MENU 3 CHẤM ===== */
function addAdminMenuToPost(post) {
    const postId = post.dataset.postId;
    const menu = post.querySelector('.post-menu-dropdown');
    
    if (!menu || menu.querySelector('.admin-section')) return;
    
    // Thêm section admin vào menu 3 chấm
    const adminSection = document.createElement('div');
    adminSection.className = 'admin-section';
    adminSection.innerHTML = `
        <div class="admin-section-title">Quản lý</div>
        <button class="admin-btn delete-btn" onclick="adminDeletePost(${postId})">
            <span class="material-icons">delete_forever</span>
            Xóa bài viết
        </button>
        <button class="admin-btn warn-btn" onclick="adminWarnUserFromPost(${postId})">
            <span class="material-icons">warning</span>
            Cảnh cáo người đăng
        </button>
        <button class="admin-btn ban-btn" onclick="adminBanUserFromPost(${postId})">
            <span class="material-icons">block</span>
            Chặn người dùng
        </button>
    `;
    
    menu.appendChild(adminSection);
}

/* ===== ĐÓNG TẤT CẢ MENU ===== */
function closeAllPostMenus() {
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
        menu.style.display = 'none';
        menu.classList.remove('show');
    });
    
    const manageMenu = document.getElementById('admin-manage-menu');
    if (manageMenu) manageMenu.remove();
}

/* ===== ẨN NÚT FOLLOW NẾU LÀ ADMIN ===== */
function hideFollowButton(post) {
    const followBtn = post.querySelector('.follow-btn');
    if (followBtn) {
        followBtn.style.display = 'none';
    }
}

/* ===== THÊM BADGE SỐ BÁO CÁO ===== */
function addReportCountBadge(post) {
    const postId = post.dataset.postId;
    const stats = post.querySelector('.post-stats');
    
    if (!stats) return;
    
    // Kiểm tra đã có badge chưa
    if (stats.querySelector('.report-count')) return;
    
    // Gọi API lấy số báo cáo
    fetch(`${BASE_URL}/backend/api/community/posts/report_info.php?post_id=${postId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.report_count > 0) {
                const badge = document.createElement('span');
                badge.className = 'stat-item report-count clickable';
                badge.innerHTML = `
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">flag</span>
                    ${data.report_count}
                `;
                badge.title = `${data.report_count} báo cáo`;
                badge.onclick = () => showReportInfo(postId);
                stats.appendChild(badge);
            }
        })
        .catch(console.error);
}

/* ===== ĐẢM BẢO NÚT BÁO CÁO CHO USER ===== */
function ensureReportButton(post) {
    const actions = post.querySelector('.post-actions');
    if (!actions) return;
    
    // Xóa nút Quản lý nếu có
    const manageBtn = actions.querySelector('.admin-manage-btn');
    if (manageBtn) manageBtn.remove();
    
    // Thêm nút báo cáo nếu chưa có
    if (!actions.querySelector('.report-post-btn')) {
        const postId = post.dataset.postId;
        const reportBtn = document.createElement('button');
        reportBtn.className = 'post-action-btn report-post-btn';
        reportBtn.innerHTML = `
            <span class="material-icons">flag</span>
            <span>Báo cáo</span>
        `;
        reportBtn.onclick = () => showReportPostModal(postId);
        actions.appendChild(reportBtn);
    }
}

/* ===== CẬP NHẬT HÀM LOAD FEED ===== */
// Ghi đè hàm loadCommunityFeed để tự động phân loại
const originalLoadCommunityFeed = window.loadCommunityFeed;
window.loadCommunityFeed = function(...args) {
    const result = originalLoadCommunityFeed.apply(this, args);
    
    // Sau khi tải feed, phân loại bài viết
    setTimeout(() => {
        classifyPostByUserRole();
        
        // Nếu là admin, thêm event listener cho menu
        if (window.CURRENT_USER_ROLE === 'Admin') {
            document.addEventListener('click', handleAdminMenuClick);
        }
    }, 500);
    
    return result;
};

/* ===== XỬ LÝ CLICK MENU ADMIN ===== */
function handleAdminMenuClick(e) {
    // Ngăn chặn click ra ngoài đóng menu admin
    if (e.target.closest('.post-menu-dropdown') || 
        e.target.closest('.post-menu-btn') ||
        e.target.closest('.admin-manage-btn')) {
        e.stopPropagation();
    }
}
/* ===== EXPORT FUNCTIONS ===== */
if (typeof window !== 'undefined') {
    window.classifyPostByUserRole = classifyPostByUserRole;
    window.showAdminManageMenu = showAdminManageMenu;
    window.closeAllPostMenus = closeAllPostMenus;
}
async function togglePinPost(postId) {
    console.log("🔄 Toggle pin for post:", postId);
    
    try {
        // Kiểm tra quyền admin
        if (!window.CURRENT_USER_ROLE || window.CURRENT_USER_ROLE !== 'Admin') {
            showAdminNotification('❌ Chỉ quản trị viên mới có quyền ghim bài', 'error');
            return;
        }

        // Hiển thị loading
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postElement) {
            showAdminNotification('❌ Không tìm thấy bài viết', 'error');
            return;
        }
        
        const isCurrentlyPinned = postElement.dataset.pinned === '1';
        const pinIcon = postElement.querySelector('.pin-icon');
        const pinMenuBtn = postElement.querySelector('.post-menu-item.pin');
        
        // Hiển thị loading
        if (pinIcon) {
            pinIcon.innerHTML = '<span class="material-icons" style="color:#ff9800;">hourglass_empty</span>';
            pinIcon.style.pointerEvents = 'none';
        }
        
        if (pinMenuBtn) {
            pinMenuBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Đang xử lý...';
            pinMenuBtn.disabled = true;
        }

        // Gọi API
        const response = await fetch(`${BASE_URL}/backend/api/community/posts/pin.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: `post_id=${encodeURIComponent(postId)}&reason=${encodeURIComponent('Ghim bởi Admin')}`
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || "Không thể cập nhật trạng thái ghim.");
        }

        // Cập nhật UI ngay lập tức
        updatePinPostUI(postId, data);
        
        // Hiển thị thông báo
        showAdminNotification(data.message, 'success');
        
        // 🆕 Load lại feed để cập nhật thứ tự
        setTimeout(() => {
            loadCommunityFeed(1, COMMUNITY_SCOPE);
        }, 500);
        
    } catch (err) {
        console.error("❌ Lỗi toggle pin:", err);
        showAdminNotification("❌ Lỗi: " + err.message, 'error');
        
        // Khôi phục UI nếu có lỗi
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        if (post) {
            const pinIcon = post.querySelector('.pin-icon');
            const pinMenuBtn = post.querySelector('.post-menu-item.pin');
            const isPinned = post.dataset.pinned === '1';
            
            if (pinIcon) {
                pinIcon.innerHTML = isPinned ? 
                    '<span class="material-icons" style="color:#ff9800;">push_pin</span>' : 
                    '<span class="material-icons">push_pin</span>';
                pinIcon.style.pointerEvents = 'auto';
            }
            
            if (pinMenuBtn) {
                pinMenuBtn.innerHTML = isPinned ? 
                    '<span class="material-icons">push_pin</span>Bỏ ghim bài viết' : 
                    '<span class="material-icons">push_pin</span>Ghim bài viết';
                pinMenuBtn.disabled = false;
            }
        }
    }
}


/* ===== UPDATE PIN POST UI ===== */
function updatePinPostUI(postId, data) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post) {
        console.error("❌ Không tìm thấy post:", postId);
        return;
    }
    
    const isPinned = data.is_pinned || false;
    
    // Cập nhật data attribute
    post.dataset.pinned = isPinned ? '1' : '0';
    
    // Thêm/Xóa class pinned
    if (isPinned) {
        post.classList.add('pinned-post');
        
        // Thêm badge "📌 ĐÃ GHIM" nếu chưa có
        if (!post.querySelector('.pin-badge')) {
            const pinBadge = document.createElement('div');
            pinBadge.className = 'pin-badge';
            pinBadge.innerHTML = '📌 ĐÃ GHIM';
            pinBadge.title = 'Bài viết đã được ghim lên đầu trang';
            post.style.position = 'relative';
            post.appendChild(pinBadge);
        }
    } else {
        post.classList.remove('pinned-post');
        
        // Xóa badge nếu có
        const pinBadge = post.querySelector('.pin-badge');
        if (pinBadge) {
            pinBadge.remove();
        }
    }
    
    // Cập nhật biểu tượng ghim trong header
    const pinIcon = post.querySelector('.pin-icon');
    if (pinIcon) {
        pinIcon.innerHTML = isPinned ? 
            '<span class="material-icons" style="color:#ff9800;">push_pin</span>' : 
            '<span class="material-icons">push_pin</span>';
        pinIcon.title = isPinned ? 'Bài đã ghim (bấm để bỏ ghim)' : 'Ghim bài viết';
        pinIcon.style.pointerEvents = 'auto';
    }
    
    // Cập nhật text trong menu
    const menuPinBtn = post.querySelector('.post-menu-item.pin');
    if (menuPinBtn) {
        menuPinBtn.innerHTML = isPinned ? 
            '<span class="material-icons">push_pin</span>Bỏ ghim bài viết' : 
            '<span class="material-icons">push_pin</span>Ghim bài viết';
        menuPinBtn.disabled = false;
    }
    
    console.log("✅ Pin UI updated for post:", postId, "Pinned:", isPinned);
}

/* ===== DI CHUYỂN BÀI GHIM LÊN ĐẦU ===== */
function movePinnedPostToTop(postId) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    const feed = document.getElementById("community-feed");
    
    if (!post || !feed) return;
    
    // Tìm tất cả bài ghim
    const pinnedPosts = feed.querySelectorAll('.pinned-post');
    const nonPinnedPosts = feed.querySelectorAll('.community-post:not(.pinned-post)');
    
    // Xóa tất cả bài viết khỏi feed
    feed.innerHTML = '';
    
    // Thêm bài ghim lên đầu
    pinnedPosts.forEach(pinnedPost => {
        if (pinnedPost.dataset.postId !== postId) {
            feed.appendChild(pinnedPost);
        } else {
            // Thêm bài vừa ghim đầu tiên
            feed.prepend(pinnedPost);
        }
    });
    
    // Thêm bài không ghim sau
    nonPinnedPosts.forEach(nonPinnedPost => {
        feed.appendChild(nonPinnedPost);
    });
    
    console.log("📌 Đã sắp xếp lại feed: bài ghim lên đầu");
}
/* ===== ADD PIN BUTTON TO POST HEADER (ADMIN ONLY) ===== */
function addPinButtonToPost(post) {
    const postId = post.dataset.postId;
    const isPinned = post.dataset.pinned === '1';
    
    // Chỉ hiển thị cho admin
    if (!window.CURRENT_USER_ROLE || window.CURRENT_USER_ROLE !== 'Admin') {
        return;
    }
    
    // Kiểm tra nếu đã có pin button
    if (post.querySelector('.pin-icon')) return;
    
    // Thêm icon ghim vào header
    const header = post.querySelector('.post-header');
    if (!header) return;
    
    const pinIcon = document.createElement('div');
    pinIcon.className = 'pin-icon';
    pinIcon.innerHTML = isPinned ? 
        '<span class="material-icons" style="color:#ff9800;">push_pin</span>' : 
        '<span class="material-icons">push_pin</span>';
    pinIcon.title = isPinned ? 'Bài đã ghim (bấm để bỏ ghim)' : 'Ghim bài viết';
    pinIcon.style.cssText = `
        margin-left: auto;
        margin-right: 8px;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
    `;
    
    pinIcon.onclick = (e) => {
        e.stopPropagation();
        togglePinPost(postId);
    };
    
    pinIcon.onmouseenter = () => {
        pinIcon.style.opacity = '1';
        pinIcon.style.transform = 'scale(1.1)';
        pinIcon.style.background = isPinned ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0, 0, 0, 0.05)';
    };
    
    pinIcon.onmouseleave = () => {
        pinIcon.style.opacity = '0.7';
        pinIcon.style.transform = 'scale(1)';
        pinIcon.style.background = 'transparent';
    };
    
    // Chèn trước menu 3 chấm
    const menu = post.querySelector('.post-menu');
    if (menu) {
        header.insertBefore(pinIcon, menu);
    } else {
        header.appendChild(pinIcon);
    }
}

/* ===== ADD PIN OPTION TO MENU 3 CHẤM ===== */
function addPinOptionToMenu(post) {
    const postId = post.dataset.postId;
    const isPinned = post.dataset.pinned === '1';
    const menu = post.querySelector('.post-menu-dropdown');
    
    if (!menu) return;
    
    // Chỉ thêm cho admin
    if (!window.CURRENT_USER_ROLE || window.CURRENT_USER_ROLE !== 'Admin') return;
    
    // Kiểm tra nếu đã có option ghim
    if (menu.querySelector('.pin')) return;
    
    // Tạo menu item ghim
    const pinItem = document.createElement('button');
    pinItem.className = 'post-menu-item pin';
    pinItem.innerHTML = isPinned ? 
        '<span class="material-icons">push_pin</span>Bỏ ghim bài viết' : 
        '<span class="material-icons">push_pin</span>Ghim bài viết';
    
    pinItem.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinPost(postId);
        closeAllPostMenus();
    };
    
    // Chèn vào đầu menu (sau các item user)
    const firstAdminItem = menu.querySelector('.admin-section');
    if (firstAdminItem) {
        menu.insertBefore(pinItem, firstAdminItem);
    } else {
        // Thêm divider trước
        const divider = document.createElement('div');
        divider.className = 'post-menu-divider';
        menu.appendChild(divider);
        menu.appendChild(pinItem);
    }
}

/* ===== ADD PIN STYLES ===== */
function addPinStyles() {
    if (document.getElementById('pin-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'pin-styles';
    style.textContent = `
        /* Bài viết được ghim */
        .pinned-post {
            border-left: 4px solid #ff9800 !important;
            background: linear-gradient(90deg, rgba(255, 248, 225, 0.1) 0%, transparent 100%) !important;
            position: relative;
        }
        
        .pin-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff9800;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            z-index: 10;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
        
        /* Icon ghim */
        .pin-icon {
            margin-left: auto;
            margin-right: 8px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }
        
        .pin-icon:hover {
            opacity: 1;
            background: rgba(255, 152, 0, 0.1);
            transform: scale(1.1);
        }
        
        .pin-icon .material-icons {
            font-size: 20px;
        }
        
        /* Menu item ghim */
        .post-menu-item.pin .material-icons {
            color: #ff9800;
        }
        
        .post-menu-item.pin:hover {
            background: rgba(255, 152, 0, 0.1);
        }
        
        /* Feed sắp xếp */
        #community-feed {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .pinned-post {
            order: -1 !important;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .pin-icon {
                width: 28px;
                height: 28px;
            }
            
            .pin-icon .material-icons {
                font-size: 18px;
            }
            
            .pin-badge {
                font-size: 9px;
                padding: 1px 6px;
                top: 8px;
                right: 8px;
            }
        }
    `;
    
    document.head.appendChild(style);
}
/* ===== INITIALIZE PIN FEATURES ===== */
function initPinFeatures() {
    // Chỉ thêm cho admin
    if (window.CURRENT_USER_ROLE !== 'Admin') return;
    
    // Thêm styles
    addPinStyles();
    
    // Thêm nút ghim cho mỗi bài viết
    document.querySelectorAll('.community-post').forEach(post => {
        addPinButtonToPost(post);
        addPinOptionToMenu(post);
        
        // Thêm badge nếu bài đã ghim
        if (post.dataset.pinned === '1') {
            post.classList.add('pinned-post');
            
            if (!post.querySelector('.pin-badge')) {
                const pinBadge = document.createElement('div');
                pinBadge.className = 'pin-badge';
                pinBadge.innerHTML = '📌 ĐÃ GHIM';
                pinBadge.title = 'Bài viết đã được ghim lên đầu trang';
                post.style.position = 'relative';
                post.appendChild(pinBadge);
            }
        }
    });
    
    console.log("✅ Pin features initialized for admin");
}
if (typeof window !== 'undefined') {
    window.togglePinPost = togglePinPost;
    window.initPinFeatures = initPinFeatures;
    window.addPinButtonToPost = addPinButtonToPost;
    window.addPinOptionToMenu = addPinOptionToMenu;
}

// Gọi init khi load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.CURRENT_USER_ROLE === 'Admin') {
            initPinFeatures();
        }
    }, 1000);
});
// Kiểm tra URL parameters cho admin view
function checkAdminUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const adminView = urlParams.get('admin_view');
    
    if (adminView === '1' && IS_ADMIN) {
        setTimeout(() => toggleAdminView(), 1000);
    }
}
// Thêm hàm này sau các hàm admin khác
function showReportInfo(postId) {
    if (!IS_ADMIN) return;
    
    fetch(`${BASE_URL}/backend/api/community/posts/report_info.php?post_id=${postId}`)
        .then(async res => {
            const responseText = await res.text();
            
            // Kiểm tra nếu response là HTML
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.trim().startsWith('<')) {
                throw new Error('Server returned HTML');
            }
            
            try {
                return JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Invalid JSON response');
            }
        })
        .then(data => {
            if (data && data.success) {
                showAdminNotification(`📊 Bài viết có ${data.report_count} báo cáo`, 'info');
                
                // Nếu có báo cáo, hiển thị chi tiết
                if (data.report_count > 0 && data.reports) {
                    // Có thể thêm modal hiển thị chi tiết báo cáo ở đây
                    console.log('Chi tiết báo cáo:', data);
                }
            } else {
                showAdminNotification('Không thể lấy thông tin báo cáo', 'error');
            }
        })
        .catch(err => {
            console.error('Error loading report info:', err);
            showAdminNotification('Lỗi tải thông tin báo cáo', 'error');
        });
}
if (typeof window !== 'undefined') {
    window.handleReportNotification = function(postId, commentId = null, type = 'post') {
        console.log('🟡 handleReportNotification called from main:', postId, commentId, type);
        
        // Kiểm tra xem hàm thực tế đã được định nghĩa chưa
        if (typeof window._realHandleReportNotification === 'function') {
            return window._realHandleReportNotification(postId, commentId, type);
        }
        
        // Fallback nếu chưa load notifications
        const url = `${BASE_URL}/frontend/community/post_detail.php?id=${postId}`;
        window.location.href = url;
    };
}
// Thêm vào export functions
if (typeof window !== 'undefined') {
    window.showReportInfo = showReportInfo;
}
// Thêm nút báo cáo cho mỗi bài viết
function addReportButtons() {
    document.querySelectorAll('.community-post').forEach(post => {
        if (!post.querySelector('.report-post-btn')) {
            const postId = post.dataset.postId;
            const actions = post.querySelector('.post-actions');
            
            if (actions && postId) {
                const reportBtn = document.createElement('button');
                reportBtn.className = 'report-post-btn';
                reportBtn.innerHTML = `
                    <span class="material-icons">flag</span>
                    Báo cáo
                `;
                reportBtn.dataset.postId = postId;
                actions.appendChild(reportBtn);
            }
        }
    });
}
// =============================================
// 🟢 HÀM RENDER FORM COMMENT VỚI UPLOAD ẢNH
// =============================================
function renderCommentForm(postId) {
    return `
    <div class="comment-form-container">
        <form class="comment-form" onsubmit="submitCommentWithImage(event, ${postId})">
            <div class="comment-input-wrapper">
                <input type="text" name="comment" placeholder="Viết bình luận công khai..." autocomplete="off">
                
                <button type="button" class="comment-add-image-btn" 
                        onclick="document.getElementById('comment-image-input-${postId}').click()"
                        title="Thêm ảnh">
                    <span class="material-icons" style="font-size:20px;">image</span>
                </button>
            </div>
            
            <button type="submit" class="comment-send-btn">
                <span class="material-icons">send</span>
            </button>
        </form>
        
        <!-- 🟢 CHUYỂN PREVIEW RA NGOÀI FORM, DƯỚI Ô COMMENT -->
        <div class="image-preview-wrapper" id="comment-preview-${postId}" style="display:none;"></div>
        
        <!-- Input file vẫn nằm trong form nhưng ẩn -->
        <input type="file" 
               id="comment-image-input-${postId}" 
               class="comment-image-input" 
               accept="image/*" 
               style="display:none;"
               onchange="handleCommentImageUpload(${postId}, this)">
    </div>`;
}
// Hàm helper để kiểm tra ban trước khi đăng bài
async function checkBanBeforePost() {
    if (typeof window.userBanChecker !== 'undefined') {
        return await window.userBanChecker.checkAction('post_only');
    }
    return true;
}

// Hàm helper để kiểm tra ban trước khi bình luận
async function checkBanBeforeComment() {
    if (typeof window.userBanChecker !== 'undefined') {
        return await window.userBanChecker.checkAction('comment_only');
    }
    return true;
}

// Sửa hàm submitComment nếu cần
if (typeof window.submitComment === 'function') {
    const originalSubmitComment = window.submitComment;
    window.submitComment = async function(e, postId) {
        // Kiểm tra ban trước
        const canComment = await checkBanBeforeComment();
        if (!canComment) {
            e.preventDefault();
            return false;
        }
        // Gọi hàm gốc
        return originalSubmitComment.call(this, e, postId);
    };
}

// Export các hàm
if (typeof window !== 'undefined') {
    window.checkBanBeforePost = checkBanBeforePost;
    window.checkBanBeforeComment = checkBanBeforeComment;
}
// Export functions to global scope
if (typeof window !== 'undefined') {
    window.initAdminFeatures = initAdminFeatures;
    window.showReportPostModal = showReportPostModal;
    window.toggleAdminView = toggleAdminView;
    window.submitReportPost = submitReportPost;
}