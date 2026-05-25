// community-user.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 community-user.js loaded");
  console.log("🎯 TARGET_USERNAME from PHP:", TARGET_USERNAME);
  console.log("👤 CURRENT_USERNAME:", window.CURRENT_USERNAME);
  console.log("🏠 IS_OWN_PROFILE:", IS_OWN_PROFILE);

  // 🟢 KHỞI TẠO COMMENT STORE NẾU CHƯA CÓ
  if (typeof window.commentStore === 'undefined') {
    window.commentStore = {};
  }

  if (!TARGET_USERNAME) {
    document.getElementById("user-post-feed").innerHTML = `
      <p class="feed-error">Không xác định được người dùng.</p>`;
    return;
  }
  
  console.log("📝 Loading posts for:", TARGET_USERNAME);
  loadUserPosts(TARGET_USERNAME);
});

async function loadUserPosts(username) {
  const feed = document.getElementById("user-post-feed");
  feed.innerHTML = `<p class="feed-loading">Đang tải bài viết của ${username}...</p>`;

  try {
    const res = await fetch(
      `${BASE_URL}/backend/api/community/posts/list.php?scope=user&username=${encodeURIComponent(username)}`
    );
    const data = await res.json();
    console.log("📊 API Response for", username, ":", data);

    if (data.error) throw new Error(data.error);
    const posts = data.posts || [];

    if (!posts.length) {
      if (IS_OWN_PROFILE) {
        feed.innerHTML = `<div class="empty-feed">
          <svg width="80" height="64" viewBox="0 0 24 24">
            <path fill="#cfd8dc" d="M5 20h14a2 2 0 0 0 2-2v-7h-4l-2-3H9L7 11H3v7a2 2 0 0 0 2 2"/>
          </svg>
          <h3>Bạn chưa có bài viết nào.</h3>
          <p>Hãy chia sẻ câu chuyện đầu tiên về hồ Koi của bạn!</p>
          <button onclick="window.location.href='/HeThongChamSocCaKoi/frontend/community/index.php'" 
                  class="btn primary-btn" style="margin-top: 15px;">
            Đăng bài ngay
          </button>
        </div>`;
      } else {
        feed.innerHTML = `<div class="empty-feed">
          <svg width="80" height="64" viewBox="0 0 24 24">
            <path fill="#cfd8dc" d="M5 20h14a2 2 0 0 0 2-2v-7h-4l-2-3H9L7 11H3v7a2 2 0 0 0 2 2"/>
          </svg>
          <h3>${username} chưa có bài viết nào.</h3>
          <p>Hãy quay lại sau khi họ chia sẻ nội dung đầu tiên.</p>
        </div>`;
      }
      return;
    }

    console.log("✅ Found", posts.length, "posts for", username);
    
    // 🟢 LƯU DỮ LIỆU POSTS ĐỂ MEDIA VIEWER HOẠT ĐỘNG
    window._communityPosts = {};
    posts.forEach(p => window._communityPosts[p.PostID] = p);
    
    // 🟢 CẬP NHẬT TIÊU ĐỀ - CHỈ KHI KHÔNG PHẢI TRANG CÁ NHÂN
    const titleElement = document.getElementById("user-post-name");
    if (titleElement && !IS_OWN_PROFILE) {
      const firstUser = posts[0]?.user?.Username || username;
      titleElement.textContent = firstUser;
    }

    feed.innerHTML = posts.map(renderPostCard).join("");

    // 🟢 Gán lại sự kiện Follow cho các nút
    attachFollowEventHandlers();

    // 🟡 Nếu có highlight → scroll vào bài đó
    if (HIGHLIGHT_ID) highlightPost(HIGHLIGHT_ID);
  } catch (err) {
    console.error("❌ Error loading user posts:", err);
    feed.innerHTML = `<p class="feed-error">Lỗi: ${err.message}</p>`;
  }
}

// 🟢 THÊM CÁC HÀM UTILITY CẦN THIẾT
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
}

function buildAvatarURL(u) {
    if (!u.AvatarURL || u.AvatarURL.trim() === "") return null;

    let url = u.AvatarURL.trim();

    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return BASE_URL + url;

    return `${BASE_URL}/uploads/avatars/${url}`;
}

function displayName(u) {
    if (!u) {
        console.log("❌ displayName: user is null");
        return "Người dùng";
    }
    
    // 🟢 LUÔN trả về Username nếu có
    if (u.Username && u.Username.trim() !== "") {
        return u.Username;
    }
    
    // Fallback
    return u.FullName || "Người dùng";
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

function highlightPost(postId) {
  const postEl = document.querySelector(`[data-post-id="${postId}"]`);
  if (postEl) {
    postEl.scrollIntoView({ behavior: "smooth", block: "center" });
    postEl.classList.add("highlighted-post");
    setTimeout(() => postEl.classList.remove("highlighted-post"), 3000);
  }
}

/* 🧩 Đồng bộ sự kiện Theo dõi sau khi render */
function attachFollowEventHandlers() {
  document.querySelectorAll("[data-user-follow]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute("data-user-follow");
      btn.disabled = true;
      btn.textContent = "Đang xử lý...";
      try {
        await toggleFollow(targetId);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// 🟢 THÊM HÀM MEDIA VIEWER CHO TRANG USER POSTS
function openMediaViewerUser(url, postId, indexOverride = null) {
  const postData = window._communityPosts?.[postId];
  if (!postData) {
    console.error("❌ Post data not found for:", postId);
    return;
  }

  const media = postData.media || [];

  const mediaItems = media.map(m => ({
    type: m.MediaType,
    src: m.FilePath.startsWith("http") 
           ? m.FilePath 
           : window.location.origin + m.FilePath
  }));

  let index = indexOverride;
  if (index === null) {
    index = mediaItems.findIndex(m => m.src === url);
  }
  if (index < 0) index = 0;

  window._mediaSlider = {
    list: mediaItems,
    index
  };

  console.log("🎨 Opening media viewer:", { postId, index, total: mediaItems.length });

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

// 🟢 GHI ĐÈ HÀM RENDER POST CARD GỐC
const originalRenderPostCard = window.renderPostCard;
window.renderPostCard = function(post) {
  // Nếu đang ở trang user posts, sử dụng hàm mới
  if (window.location.pathname.includes('user_posts.php')) {
    return renderPostCardUser(post);
  }
  // Ngược lại sử dụng hàm gốc
  return originalRenderPostCard ? originalRenderPostCard(post) : '';
};
// 🟢 HÀM RENDER POST CARD CHO USER POSTS
function renderPostCardUser(post) {
  const user = post.user || {};
  const name = displayName(user);
  const media = post.media || [];
  const reactions = post.reactions || {};
  const comments = post.comments || { total: 0, items: [] };
  const created = post.CreatedAt ? post.CreatedAt.slice(0, 16) : "";

  // 🟢 Xác định các điều kiện
  const isOwner = !!(user.UserID && window.CURRENT_USER_ID === user.UserID);
  const isFollowing = !!post.isFollowing;
  const currentUserIsAdmin = window.CURRENT_USER_ROLE === 'Admin';

  // 🟢 PHẦN HEADER ACTIONS: NÚT THEO DÕI HOẶC MENU 3 CHẤM
  let headerActionsHtml = '';

  // 1. USER nhìn bài NGƯỜI KHÁC: Hiển thị nút Theo dõi (không phải admin, không phải chủ bài)
  if (!currentUserIsAdmin && !isOwner && user.UserID) {
      headerActionsHtml = `
          <button class="follow-btn ${isFollowing ? "following" : ""}" type="button"
                  data-user-follow="${user.UserID}"
                  onclick="toggleFollow(${user.UserID})">
              ${isFollowing ? "Đang theo dõi" : "Theo dõi"}
          </button>
      `;
  }
  // 2. USER nhìn bài CHÍNH MÌNH: Hiển thị menu 3 chấm
  else if (!currentUserIsAdmin && isOwner) {
      headerActionsHtml = `
          <div class="post-menu">
              <span class="material-icons post-menu-btn" onclick="togglePostMenu(${post.PostID})">
                  more_horiz
              </span>
              <div class="post-menu-dropdown" id="post-menu-${post.PostID}">
                  <button class="post-menu-item edit" onclick="editPostUser(${post.PostID})">
                      <span class="material-icons">edit</span>
                      Chỉnh sửa bài viết
                  </button>
                  <button class="post-menu-item privacy" onclick="changePrivacyUser(${post.PostID})">
                      <span class="material-icons">lock</span>
                      Chỉnh quyền riêng tư
                  </button>
                  <button class="post-menu-item delete" onclick="openDeletePostModalUser(${post.PostID})">
                      <span class="material-icons">delete</span>
                      Xóa bài viết
                  </button>
              </div>
          </div>
      `;
  }
  // 3. ADMIN nhìn bất kỳ bài nào: Chỉ hiển thị menu 3 chấm (không nút theo dõi)
  else if (currentUserIsAdmin) {
      // 🟢 Kiểm tra nếu admin đang xem bài của chính mình
      const isAdminOwnPost = isOwner;
      
      headerActionsHtml = `
          <div class="post-menu">
              <span class="material-icons post-menu-btn" onclick="togglePostMenu(${post.PostID})">
                  more_horiz
              </span>
              <div class="post-menu-dropdown" id="post-menu-${post.PostID}">
                  ${isAdminOwnPost ? `
                      <!-- ADMIN xem bài CHÍNH MÌNH: Menu user -->
                      <button class="post-menu-item edit" onclick="editPostUser(${post.PostID})">
                          <span class="material-icons">edit</span>
                          Chỉnh sửa bài viết
                      </button>
                      <button class="post-menu-item privacy" onclick="changePrivacyUser(${post.PostID})">
                          <span class="material-icons">lock</span>
                          Chỉnh quyền riêng tư
                      </button>
                      <button class="post-menu-item delete" onclick="openDeletePostModalUser(${post.PostID})">
                          <span class="material-icons">delete</span>
                          Xóa bài viết
                      </button>
                  ` : `
                      <!-- ADMIN xem bài NGƯỜI KHÁC: Menu admin -->
                      <div class="admin-section">
                          <div class="admin-section-title">Quản trị viên</div>
                          <button class="admin-action-btn delete" onclick="adminDeletePost(${post.PostID})">
                              <span class="material-icons">delete_forever</span>
                              Xóa bài viết
                          </button>
                          <button class="admin-action-btn hide" onclick="adminHidePost(${post.PostID})">
                              <span class="material-icons">visibility_off</span>
                              Ẩn bài viết
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
                  `}
              </div>
          </div>
      `;
  }

  // 🟢 Nếu là bài chia sẻ
  if (post.OriginalPostID && post.OriginalPost) {
    const original = post.OriginalPost;
    const sharer = user;
    const shareTime = post.CreatedAt ? post.CreatedAt.slice(0, 16) : "";
    const originalUser = original.FullName || original.Username || "Người dùng";
    const originalAvatar = buildAvatarURL(original);
    const sharerAvatar = buildAvatarURL(sharer);

    const totalReact = reactions.total || 0;
    const userReact = reactions.user || null;

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

    const reactLabel = userReact ? reactTextMapLocal[userReact] : "Thích";
    const reactIcon = userReact
      ? reactIconMap[userReact]
      : `${BASE_URL}/assets/images/like-outline.png`;
    const reactColor = userReact ? reactColorMapLocal[userReact] : "#6b6b6b";

    // 🟢 PHẦN HEADER ACTIONS CHO BÀI CHIA SẺ
    let sharedHeaderActionsHtml = '';

    // Xác định các điều kiện cho bài chia sẻ
    const sharerUserId = sharer.UserID || 0;
    const isSharerCurrentUser = sharerUserId == window.CURRENT_USER_ID;
    const isSharerFollowing = !!sharer.isFollowing;

    // 1. USER nhìn bài chia sẻ của NGƯỜI KHÁC: Hiển thị nút Theo dõi
    if (!currentUserIsAdmin && !isSharerCurrentUser && sharerUserId) {
        sharedHeaderActionsHtml = `
            <button class="follow-btn ${isSharerFollowing ? "following" : ""}" type="button"
                    data-user-follow="${sharerUserId}"
                    onclick="toggleFollow(${sharerUserId})">
                ${isSharerFollowing ? "Đang theo dõi" : "Theo dõi"}
            </button>
        `;
    }
    // 2. USER nhìn bài chia sẻ của CHÍNH MÌNH: Hiển thị menu 3 chấm
    else if (!currentUserIsAdmin && isSharerCurrentUser) {
        sharedHeaderActionsHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" onclick="togglePostMenu(${post.PostID})">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}">
                    <button class="post-menu-item edit" onclick="editPostUser(${post.PostID})">
                        <span class="material-icons">edit</span>
                        Chỉnh sửa nội dung chia sẻ
                    </button>
                    <button class="post-menu-item privacy" onclick="changePrivacyUser(${post.PostID})">
                        <span class="material-icons">lock</span>
                        Chỉnh quyền riêng tư
                    </button>
                    <button class="post-menu-item delete" onclick="deletePostUser(${post.PostID})">
                        <span class="material-icons">delete</span>
                        Xóa bài chia sẻ
                    </button>
                </div>
            </div>
        `;
    }
    // 3. ADMIN nhìn bài chia sẻ: Chỉ hiển thị menu 3 chấm
    else if (currentUserIsAdmin) {
        sharedHeaderActionsHtml = `
            <div class="post-menu">
                <span class="material-icons post-menu-btn" onclick="togglePostMenu(${post.PostID})">
                    more_horiz
                </span>
                <div class="post-menu-dropdown" id="post-menu-${post.PostID}">
                    ${isSharerCurrentUser ? `
                        <!-- ADMIN xem bài chia sẻ CHÍNH MÌNH: Menu user -->
                        <button class="post-menu-item edit" onclick="editPostUser(${post.PostID})">
                            <span class="material-icons">edit</span>
                            Chỉnh sửa nội dung chia sẻ
                        </button>
                        <button class="post-menu-item privacy" onclick="changePrivacyUser(${post.PostID})">
                            <span class="material-icons">lock</span>
                            Chỉnh quyền riêng tư
                        </button>
                        <button class="post-menu-item delete" onclick="deletePostUser(${post.PostID})">
                            <span class="material-icons">delete</span>
                            Xóa bài chia sẻ
                        </button>
                    ` : `
                        <!-- ADMIN xem bài chia sẻ NGƯỜI KHÁC: Menu admin -->
                        <div class="admin-section">
                            <div class="admin-section-title">Quản trị viên</div>
                            <button class="admin-action-btn delete" onclick="adminDeletePost(${post.PostID})">
                                <span class="material-icons">delete_forever</span>
                                Xóa bài viết
                            </button>
                            <button class="admin-action-btn hide" onclick="adminHidePost(${post.PostID})">
                                <span class="material-icons">visibility_off</span>
                                Ẩn bài viết
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
                    `}
                </div>
            </div>
        `;
    }

    return `
    <article class="community-post shared-post"
       data-post-id="${post.PostID}"
       data-user-id="${sharer.UserID || 0}"
       data-privacy="${post.Privacy}">
    <header class="post-header">
        <div class="post-avatar" onclick="openUserProfile('${sharer.Username}')">
          ${
            sharerAvatar
              ? `<img src="${sharerAvatar}" class="post-avatar-img"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
              : `<div class="avatar-circle">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>`
          }
          <div class="avatar-circle" style="display:none;">${escapeHtml((sharer.FullName || sharer.Username || "?")[0])}</div>
        </div>

        <div class="post-meta">
          <div class="post-author">
            <span class="author-name" onclick="openUserProfile('${sharer.Username}')">
              ${escapeHtml(displayName(sharer))}
            </span>
            ${
              sharer.Role
                ? `<span class="author-role role-${escapeHtml(sharer.Role.toLowerCase())}">
                    ${escapeHtml(sharer.Role)}
                  </span>`
                : ""
            }
          </div>
          <div class="post-time">${escapeHtml(shareTime)}</div>
        </div>

        <!-- 🟢 PHẦN HEADER ACTIONS CHO BÀI CHIA SẺ -->
        <div class="post-header-actions">
            ${sharedHeaderActionsHtml}
        </div>

    </header>
      ${post.Content ? `<div class="shared-caption">${escapeHtml(post.Content)}</div>` : ""}

      <div class="shared-box">
          <div class="shared-header">
            <div class="shared-avatar" onclick="openUserProfile('${original.Username}')">
              ${
                originalAvatar
                  ? `<img src="${originalAvatar}" class="shared-avatar-img"
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                  : `<div class="avatar-circle">${escapeHtml(displayName(original)[0] || "?")}</div>`
              }
              <div class="avatar-circle" style="display:none;">${escapeHtml(displayName(original)[0] || "?")}</div>
            </div>

            <div class="shared-info">
              <strong class="shared-user-link" onclick="openUserProfile('${original.Username}')">
                ${escapeHtml(displayName(original))}
              </strong>
              <span class="shared-time">${escapeHtml(original.CreatedAt ? original.CreatedAt.slice(0, 16) : "")}</span>
            </div>
          </div>

          <div class="shared-body" onclick="openOriginalPost(event, ${original.PostID}, '${original.Username}')">
            ${original.Content ? escapeHtml(original.Content) : ""}
            ${
              original.media && original.media.length
                ? `<div class="post-media-grid">
                    ${original.media
                      .map((m, i) =>
                        m.MediaType === "video"
                          ? `<div class="media-item"><video controls src="${m.FilePath}"></video></div>`
                          : `<div class="media-item" onclick="openMediaViewerUser('${m.FilePath}', ${original.PostID}, ${i})"><img src="${m.FilePath}" alt=""></div>`
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        </div>
      <div class="post-stats">
        ${
          totalReact > 0
            ? `<div class="stat-item reaction-display">
                ${renderReactionIcons(reactions.summary, post.PostID)}
                <span class="reaction-count"
                  onmouseenter="showReactionUsersTooltip(${post.PostID}, 'all', event)"
                  onmouseleave="hideReactionUsersTooltip()"
                  onclick="openReactionUserModal(${post.PostID}, 'all')">
                  ${totalReact}
                </span>
              </div>`
            : ""
        }
        ${
          comments.total > 0
            ? `<span class="stat-item comment-count clickable"
                  onclick="if(window.toggleComments)window.toggleComments(${post.PostID})">
                  ${comments.total} bình luận
              </span>`
            : ""
        }
      </div>

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
                .map(t => `<button class="reaction-emoji" onclick="chooseReaction(${post.PostID}, '${t}')"><img src="${BASE_URL}/assets/images/${t}.png"></button>`).join("")}
          </div>
        </div>
        <button class="post-action-btn" onclick="if(window.toggleComments)window.toggleComments(${post.PostID})">
          <span class="material-icons">chat_bubble_outline</span>
          <span>Bình luận</span>
        </button>
        <button class="post-action-btn" onclick="sharePost(${original.PostID})">
          <span class="material-icons">share</span>
          <span>Chia sẻ</span>
        </button>
      </div>
      
      <!-- 🟢 SỬ DỤNG COMMENT SYSTEM TỪ COMMUNITY-COMMENTS.JS -->
      <div class="comments-wrapper" 
            id="comments-${post.PostID}" 
            data-loaded="0" 
            data-mode="top" 
            data-open="0" 
            style="display:none;">

          <div class="comment-filter">
            <button type="button" class="comment-filter-btn"
                    id="comment-filter-btn-${post.PostID}"
                    onclick="if(window.toggleCommentFilterMenu)window.toggleCommentFilterMenu(${post.PostID})">
              <span id="comment-filter-text-${post.PostID}">Hot nhất</span>
              <span class="material-icons">expand_more</span>
            </button>
            <div class="comment-filter-menu" id="comment-filter-menu-${post.PostID}">
              <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'hot')">
                <strong>Hot nhất</strong><br>
                <small>Hiển thị bình luận được yêu thích nhiều nhất trước tiên.</small>
              </button>
              <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'newest')">
                <strong>Mới nhất</strong><br>
                <small>Hiển thị các bình luận mới nhất trước tiên.</small>
              </button>
              <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'following')">
                <strong>Người bạn đang theo dõi</strong><br>
                <small>Chỉ hiển thị bình luận từ người bạn theo dõi.</small>
              </button>
              <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'all')">
                <strong>Tất cả bình luận</strong><br>
                <small>Hiển thị tất cả bình luận, bao gồm cả nội dung có thể là spam.</small>
              </button>
            </div>
          </div>

          <div class="comment-list" id="comment-list-${post.PostID}"></div>

          <!-- 🟢 SỬA LẠI COMMENT FORM ĐỂ NÚT GỬI NẰM BÊN PHẢI -->
          <form class="comment-form" onsubmit="event.preventDefault(); if(window.submitComment)window.submitComment(event, ${post.PostID})">
            <input type="text" name="comment" placeholder="Viết bình luận..." autocomplete="off">
            <button type="submit" class="comment-send-btn">
              <span class="material-icons">send</span>
            </button>
          </form>
        </div>
    </article>`;
  }

  // 🟣 Nếu là bài bình thường
  const totalReact = reactions.total || 0;
  const userReact = reactions.user || null;

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

  let reactLabel = userReact ? reactTextMapLocal[userReact] : "Thích";
  let reactIcon = userReact
    ? reactIconMap[userReact]
    : `${BASE_URL}/assets/images/like-outline.png`;

  let reactColor = userReact ? reactColorMapLocal[userReact] : "#6b6b6b";

  // 🟢 SỬA PHẦN MEDIA HTML ĐỂ SỬ DỤNG MEDIA VIEWER
  const mediaHtml = media.length ? `
    <div class="post-media-grid grid-${media.length}">
      ${media.map((m, i) => {
        if (m.MediaType === "video") {
          return `<div class="media-item"><video src="${m.FilePath}" controls></video></div>`;
        } else {
          return `
            <div class="media-item" 
                 onclick="openMediaViewerUser('${m.FilePath}', ${post.PostID}, ${i})">
              <img src="${m.FilePath}">
            </div>
          `;
        }
      }).join("")}
    </div>
  ` : "";

  return `
  <article class="community-post"
       data-post-id="${post.PostID}"
       data-user-id="${user.UserID || 0}"
       data-privacy="${post.Privacy}">
    <header class="post-header">
        <div class="post-avatar" onclick="openUserProfile('${user.Username}')">
          ${
            user.AvatarURL
              ? `<img src="${BASE_URL}/uploads/avatars/${user.AvatarURL}" 
                      class="post-avatar-img"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
              : `<div class="avatar-circle">${escapeHtml((user.FullName || user.Username || "?")[0])}</div>`
          }
          <div class="avatar-circle" style="display:none;">${escapeHtml((user.FullName || user.Username || "?")[0])}</div>
        </div>

        <div class="post-meta">
          <div class="post-author">
            <span class="author-name" onclick="openUserProfile('${user.Username}')">
              ${escapeHtml(user.Username)} 
          </span>
            ${
              user.Role
                ? `<span class="author-role role-${escapeHtml(user.Role.toLowerCase())}">
                    ${escapeHtml(user.Role)}
                  </span>`
                : ""
            }
          </div>
          <div class="post-time">${escapeHtml(created)}</div>
        </div>

        <!-- 🟢 PHẦN HEADER ACTIONS MỚI: NÚT THEO DÕI HOẶC MENU 3 CHẤM -->
        <div class="post-header-actions">
            ${headerActionsHtml}
        </div>

    </header>

    <div class="post-content">${escapeHtml(post.Content)}</div>
    ${mediaHtml}

  <div class="post-stats">
      ${
        totalReact > 0
          ? `<div class="stat-item reaction-display">
              ${renderReactionIcons(reactions.summary, post.PostID)}
              <span class="reaction-count"
                onmouseenter="showReactionUsersTooltip(${post.PostID}, 'all', event)"
                onmouseleave="hideReactionUsersTooltip()"
                onclick="openReactionUserModal(${post.PostID}, 'all')">
                ${totalReact}
              </span>
            </div>`
          : ""
      }
      ${
        comments.total > 0
            ? `<span class="stat-item comment-count clickable"
                  onclick="if(window.toggleComments)window.toggleComments(${post.PostID})">
                  ${comments.total} bình luận
              </span>`
            : ""
      }
    </div>

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
            .map(t => `<button class="reaction-emoji" onclick="chooseReaction(${post.PostID}, '${t}')"><img src="${BASE_URL}/assets/images/${t}.png"></button>`).join("")}
        </div>
      </div>
      <button class="post-action-btn" onclick="if(window.toggleComments)window.toggleComments(${post.PostID})">
        <span class="material-icons">chat_bubble_outline</span><span>Bình luận</span>
      </button>
      <button class="post-action-btn" onclick="sharePost(${post.PostID})">
        <span class="material-icons">share</span><span>Chia sẻ</span>
      </button>
    </div>

    <!-- 🟢 SỬ DỤNG COMMENT SYSTEM TỪ COMMUNITY-COMMENTS.JS -->
    <div class="comments-wrapper" id="comments-${post.PostID}" data-loaded="0" data-mode="top" data-open="0" style="display:none;">
      <div class="comment-filter">
          <button type="button" class="comment-filter-btn"
                  id="comment-filter-btn-${post.PostID}"
                  onclick="if(window.toggleCommentFilterMenu)window.toggleCommentFilterMenu(${post.PostID})">
            <span id="comment-filter-text-${post.PostID}">Hot nhất</span>
            <span class="material-icons">expand_more</span>
          </button>
          <div class="comment-filter-menu" id="comment-filter-menu-${post.PostID}">
            <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'hot')">
              <strong>Hot nhất</strong><br>
              <small>Hiển thị bình luận được yêu thích nhiều nhất trước tiên.</small>
            </button>
            <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'newest')">
              <strong>Mới nhất</strong><br>
              <small>Hiển thị các bình luận mới nhất trước tiên.</small>
            </button>
            <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'following')">
              <strong>Người bạn đang theo dõi</strong><br>
              <small>Chỉ hiển thị bình luận từ người bạn theo dõi.</small>
            </button>
            <button onclick="if(window.changeCommentFilter)window.changeCommentFilter(${post.PostID}, 'all')">
              <strong>Tất cả bình luận</strong><br>
              <small>Hiển thị tất cả bình luận, bao gồm cả nội dung có thể là spam.</small>
            </button>
          </div>
        </div>

      <div class="comment-list" id="comment-list-${post.PostID}"></div>
      
      <!-- 🟢 SỬA LẠI COMMENT FORM ĐỂ NÚT GỬI NẰM BÊN PHẢI -->
      <form class="comment-form" onsubmit="event.preventDefault(); if(window.submitComment)window.submitComment(event, ${post.PostID})">
        <input type="text" name="comment" placeholder="Viết bình luận..." autocomplete="off">
        <button type="submit" class="comment-send-btn"><span class="material-icons">send</span></button>
      </form>
    </div>
  </article>`;
}

// 🟢 THÊM HÀM XÓA BÀI CHIA SẺ CHO USER POSTS
async function deletePostUser(postId) {
    if (!confirm("Bạn có chắc muốn xóa bài chia sẻ này không?")) return;
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: `post_id=${postId}`
        });
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Không thể xóa bài viết.");
        
        alert("✅ Bài viết đã được xóa!");
        loadUserPosts(TARGET_USERNAME); // reload lại user posts
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}

/* ========== POST EDIT FUNCTIONS FOR USER POSTS ========== */

// 🟢 Hàm chỉnh sửa bài viết (tương tự editPost trong post-edit.js)
async function editPostUser(postId) {
    console.log("🟡 User posts - editPostUser called for:", postId);
    
    // Đóng menu
    closeAllPostMenus();
    
    // Kiểm tra và load post-edit.js nếu cần
    if (typeof window.editPost === "undefined") {
        console.log("🟡 Loading post-edit functions...");
        
        // Tạo modal chỉnh sửa riêng cho user posts
        await createEditModalForUser(postId);
    } else {
        // Sử dụng hàm editPost từ post-edit.js
        window.editPost(postId, false); // false = không phải trang detail
    }
}

// 🟢 Hàm tạo modal chỉnh sửa cho user posts
async function createEditModalForUser(postId) {
    console.log("🟡 Creating edit modal for user post:", postId);
    
    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postEl) return;
    
    // Lấy thông tin hiện tại
    let caption = "";
    let privacy = "public";
    
    // Bài bình thường
    const normalContent = postEl.querySelector(".post-content");
    if (normalContent) {
        caption = normalContent.innerText.trim();
    }
    
    // Bài chia sẻ
    const sharedCaption = postEl.querySelector(".shared-caption");
    if (sharedCaption) {
        caption = sharedCaption.innerText.trim();
    }
    
    // Lấy privacy từ data attribute
    privacy = postEl.getAttribute("data-privacy") || "public";
    
    // Lấy avatar và username
    const username = window.CURRENT_USERNAME || "Bạn";
    const avatar = window.CURRENT_USER_AVATAR || `${BASE_URL}/assets/images/default-avatar.png`;
    
    // Tạo modal chỉnh sửa
    const modal = document.createElement("div");
    modal.id = "user-edit-modal";
    modal.className = "edit-modal";
    
    modal.innerHTML = `
        <div class="edit-overlay" onclick="closeUserEditModal()"></div>
        
        <div class="edit-composer">
            <!-- Header -->
            <div class="edit-header">
                <h3>Chỉnh sửa bài viết</h3>
                <button class="edit-close" onclick="closeUserEditModal()">×</button>
            </div>
            
            <!-- User info -->
            <div class="edit-user-info">
                <img src="${avatar}" class="edit-user-avatar" alt="${username}" 
                     onerror="this.onerror=null; this.src='${BASE_URL}/assets/images/default-avatar.png'">
                <div class="edit-user-details">
                    <div class="edit-username">${escapeHtml(username)}</div>
                    <div class="edit-privacy-select" onclick="toggleUserPrivacyMenu()">
                        <span class="edit-privacy-icon" id="user-privacy-icon">${getPrivacyIcon(privacy)}</span>
                        <span class="edit-privacy-text" id="user-privacy-text">${getPrivacyText(privacy)}</span>
                        <span class="material-icons">arrow_drop_down</span>
                    </div>
                    <div class="edit-privacy-menu" id="user-privacy-menu" style="display:none;">
                        <div class="edit-privacy-option" onclick="selectUserPrivacy('public')">
                            <span class="privacy-icon">🌍</span>
                            <div>
                                <div class="privacy-label">Công khai</div>
                                <div class="privacy-desc">Mọi người đều có thể xem</div>
                            </div>
                        </div>
                        <div class="edit-privacy-option" onclick="selectUserPrivacy('followers')">
                            <span class="privacy-icon">👥</span>
                            <div>
                                <div class="privacy-label">Người theo dõi</div>
                                <div class="privacy-desc">Chỉ người theo dõi bạn</div>
                            </div>
                        </div>
                        <div class="edit-privacy-option" onclick="selectUserPrivacy('private')">
                            <span class="privacy-icon">🔒</span>
                            <div>
                                <div class="privacy-label">Chỉ mình tôi</div>
                                <div class="privacy-desc">Chỉ bạn có thể xem</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Content textarea -->
            <div class="edit-content-area">
                <textarea 
                    id="user-edit-content" 
                    class="edit-textarea" 
                    placeholder="${username} ơi, bạn đang nghĩ gì thế?"
                    rows="3"
                >${escapeHtml(caption)}</textarea>
            </div>
            
            <!-- Media preview -->
            <div class="edit-media-preview" id="user-edit-media-preview"></div>
            
            <!-- Footer actions -->
            <div class="edit-footer-actions">
                <div class="edit-action-left">
                    <label class="edit-add-media-btn">
                        <input type="file" id="user-edit-add-media" accept="image/*,video/*" multiple hidden>
                        <span class="material-icons">photo_library</span>
                        <span>Ảnh/Video</span>
                    </label>
                </div>
                
                <div class="edit-action-right">
                    <button class="edit-cancel-btn" onclick="closeUserEditModal()">
                        Hủy
                    </button>
                    <button class="edit-save-btn" onclick="submitUserEditPost(${postId})">
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Load media cũ
    await loadUserEditMedia(postId);
    
    // Setup events
    setupUserEditEvents(postId);
    
    // Focus vào textarea
    setTimeout(() => {
        const textarea = document.getElementById("user-edit-content");
        if (textarea) textarea.focus();
    }, 100);
}

// 🟢 Hàm helper cho privacy
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

// 🟢 Hàm load media cho user edit
async function loadUserEditMedia(postId) {
    const wrap = document.getElementById("user-edit-media-preview");
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
        
        // Render media
        renderUserEditMedia(data.media);
        
    } catch (err) {
        console.error("Lỗi load edit media:", err);
        wrap.innerHTML = '<div class="edit-error">Lỗi tải ảnh</div>';
    }
}

// 🟢 Hàm render media cho user edit
function renderUserEditMedia(mediaList) {
    const wrap = document.getElementById("user-edit-media-preview");
    if (!wrap) return;
    
    wrap.innerHTML = "";
    wrap.className = "edit-media-preview";
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "5px";
    wrap.style.marginTop = "10px";
    
    mediaList.forEach((media, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "user-edit-media-item";
        itemDiv.style.position = "relative";
        itemDiv.style.width = "100px";
        itemDiv.style.height = "100px";
        
        const url = media.FilePath.startsWith("http") 
            ? media.FilePath 
            : window.location.origin + media.FilePath;
        const isVideo = media.MediaType === "video";
        
        itemDiv.innerHTML = `
            ${isVideo ? 
                `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" controls></video>` : 
                `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`
            }
            <button class="user-remove-media-btn" onclick="removeUserEditMedia(this, ${media.MediaID})" 
                    style="position:absolute;top:2px;right:2px;background:red;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;">
                ×
            </button>
        `;
        
        wrap.appendChild(itemDiv);
    });
}

// 🟢 Hàm setup events cho user edit
function setupUserEditEvents(postId) {
    // File input change
    const fileInput = document.getElementById("user-edit-add-media");
    if (fileInput) {
        fileInput.addEventListener("change", function(e) {
            if (!this.files || this.files.length === 0) return;
            
            const wrap = document.getElementById("user-edit-media-preview");
            if (!wrap) return;
            
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "user-edit-media-item";
                    itemDiv.style.position = "relative";
                    itemDiv.style.width = "100px";
                    itemDiv.style.height = "100px";
                    
                    if (file.type.startsWith("video")) {
                        itemDiv.innerHTML = `
                            <video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" controls></video>
                            <button class="user-remove-media-btn" onclick="removeUserNewMedia(this)" 
                                    style="position:absolute;top:2px;right:2px;background:red;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;">
                                ×
                            </button>
                        `;
                    } else {
                        itemDiv.innerHTML = `
                            <img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">
                            <button class="user-remove-media-btn" onclick="removeUserNewMedia(this)" 
                                    style="position:absolute;top:2px;right:2px;background:red;color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;">
                                ×
                            </button>
                        `;
                    }
                    
                    wrap.appendChild(itemDiv);
                };
                reader.readAsDataURL(file);
            });
            
            // Reset input
            this.value = "";
        });
    }
}

// 🟢 Hàm xóa media cũ trong user edit
function removeUserEditMedia(btn, mediaId) {
    if (!window.userRemovedMedia) window.userRemovedMedia = [];
    if (!window.userRemovedMedia.includes(mediaId)) {
        window.userRemovedMedia.push(mediaId);
    }
    btn.parentElement.remove();
}

// 🟢 Hàm xóa media mới trong user edit
function removeUserNewMedia(btn) {
    btn.parentElement.remove();
}

// 🟢 Hàm submit edit cho user posts
async function submitUserEditPost(postId) {
    const contentEl = document.getElementById("user-edit-content");
    if (!contentEl) return;
    
    const content = contentEl.value.trim();
    const privacyIcon = document.getElementById("user-privacy-icon");
    const privacyText = document.getElementById("user-privacy-text");
    
    let privacy = "public";
    if (privacyIcon && privacyText) {
        if (privacyIcon.textContent === "👥") privacy = "followers";
        else if (privacyIcon.textContent === "🔒") privacy = "private";
    }
    
    // Tạo FormData
    const fd = new FormData();
    fd.append("post_id", postId);
    fd.append("content", content);
    fd.append("privacy", privacy);
    
    // Thêm media đã xóa
    if (window.userRemovedMedia && window.userRemovedMedia.length > 0) {
        fd.append("remove_media", JSON.stringify(window.userRemovedMedia));
    }
    
    // Thêm file mới
    const fileInput = document.getElementById("user-edit-add-media");
    if (fileInput && fileInput.files) {
        Array.from(fileInput.files).forEach(file => {
            fd.append("add_media[]", file);
        });
    }
    
    // Disable button
    const btn = document.querySelector(".edit-save-btn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Đang lưu...";
    }
    
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/update.php`, {
            method: "POST",
            body: fd
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Đóng modal
            closeUserEditModal();
            
            // Reload user posts
            loadUserPosts(TARGET_USERNAME);
            
            // Hiển thị thông báo
            alert("✅ Đã cập nhật bài viết!");
        } else {
            alert("❌ Lỗi: " + data.error);
        }
    } catch (err) {
        alert("❌ Lỗi kết nối: " + err.message);
    } finally {
        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Lưu thay đổi";
        }
    }
}

// 🟢 Hàm thay đổi quyền riêng tư cho user posts
function changePrivacyUser(postId) {
    console.log("🟡 User posts - changePrivacyUser called for:", postId);
    
    // Đóng menu
    closeAllPostMenus();
    
    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postEl) return;
    
    const currentPrivacy = postEl.getAttribute("data-privacy") || "public";
    
    // Tạo modal privacy
    openPrivacyModalUser(postId, currentPrivacy);
}

// 🟢 Hàm mở modal privacy cho user posts
function openPrivacyModalUser(postId, currentPrivacy) {
    const old = document.getElementById("user-privacy-modal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "user-privacy-modal";
    modal.className = "privacy-modal";

    const list = [
        { key: "public", icon: "🌍", label: "Công khai", desc: "Bất kỳ ai cũng có thể xem" },
        { key: "followers", icon: "👥", label: "Người theo dõi", desc: "Chỉ những người theo dõi bạn" },
        { key: "private", icon: "🔒", label: "Chỉ mình tôi", desc: "Chỉ có bạn mới xem được" }
    ];

    modal.innerHTML = `
        <div class="pm-overlay" onclick="closePrivacyModalUser()"></div>

        <div class="pm-box">
            <div class="pm-header">
                Chọn đối tượng
                <span class="pm-close" onclick="closePrivacyModalUser()">✕</span>
            </div>

            <div class="pm-list">
                ${list.map(item => `
                    <div class="pm-item ${item.key === currentPrivacy ? "selected" : ""}"
                        onclick="selectPrivacyUser('${item.key}')">
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
                <button class="pm-btn cancel" onclick="closePrivacyModalUser()">Hủy</button>
                <button class="pm-btn save" onclick="savePrivacyUser(${postId})">Lưu</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.userSelectedPrivacy = currentPrivacy;
}

// 🟢 Hàm chọn privacy cho user
function selectPrivacyUser(v) {
    window.userSelectedPrivacy = v;

    document.querySelectorAll(".pm-item").forEach(el => {
        el.classList.remove("selected");
    });

    const selected = document.querySelector(`.pm-item[onclick="selectPrivacyUser('${v}')"]`);
    if (selected) selected.classList.add("selected");
}

// 🟢 Hàm lưu privacy cho user
async function savePrivacyUser(postId) {
    const fd = new FormData();
    fd.append("post_id", postId);
    fd.append("privacy", window.userSelectedPrivacy);

    // Lấy nút và thay đổi trạng thái
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

        // ĐÓNG MODAL
        closePrivacyModalUser();
        
        // CẬP NHẬT UI NGAY LẬP TỨC
        const postEl = document.querySelector(`[data-post-id="${postId}"]`);
        if (postEl) {
            postEl.setAttribute("data-privacy", window.userSelectedPrivacy);
        }
        
        // Hiển thị thông báo
        alert("✅ Đã cập nhật quyền riêng tư");

    } catch (error) {
        console.error("Error saving privacy:", error);
        alert("Lỗi: " + error.message);
    } finally {
        // Reset nút
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu";
        }
    }
}

// 🟢 Hàm đóng modal privacy user
function closePrivacyModalUser() {
    const m = document.getElementById("user-privacy-modal");
    if (m) m.remove();
}

// 🟢 Hàm mở modal xóa bài viết cho user
function openDeletePostModalUser(postId) {
    console.log("🟡 User posts - openDeletePostModalUser called for:", postId);
    
    // Đóng menu
    closeAllPostMenus();
    
    // Tạo modal xóa
    const modal = document.createElement("div");
    modal.id = "user-delete-modal";
    modal.className = "delete-modal";
    
    modal.innerHTML = `
        <div class="delete-overlay" onclick="closeDeleteModalUser()"></div>
        
        <div class="delete-box">
            <div class="delete-header">
                <h3>Xóa bài viết?</h3>
                <button class="delete-close" onclick="closeDeleteModalUser()">×</button>
            </div>
            
            <div class="delete-body">
                Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.
            </div>
            
            <div class="delete-footer">
                <button class="delete-btn cancel" onclick="closeDeleteModalUser()">Hủy</button>
                <button class="delete-btn confirm" onclick="confirmDeleteUserPost(${postId})">Xóa</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 🟢 Hàm xác nhận xóa bài viết cho user
async function confirmDeleteUserPost(postId) {
    try {
        const res = await fetch(`${BASE_URL}/backend/api/community/posts/delete.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `post_id=${postId}`
        });

        const data = await res.json();

        if (!data.success) {
            alert("Lỗi: " + data.error);
            return;
        }

        // Đóng modal
        closeDeleteModalUser();
        
        // Reload user posts
        loadUserPosts(TARGET_USERNAME);
        
        // Hiển thị thông báo
        alert("✅ Đã xóa bài viết!");

    } catch (error) {
        alert("Lỗi khi xóa bài viết: " + error.message);
    }
}

// 🟢 Hàm đóng modal xóa user
function closeDeleteModalUser() {
    const m = document.getElementById("user-delete-modal");
    if (m) m.remove();
}

// 🟢 Hàm đóng modal edit user
function closeUserEditModal() {
    const m = document.getElementById("user-edit-modal");
    if (m) m.remove();
}

// 🟢 Hàm toggle privacy menu cho user
function toggleUserPrivacyMenu() {
    const menu = document.getElementById("user-privacy-menu");
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// 🟢 Hàm select privacy cho user
function selectUserPrivacy(privacy) {
    const icon = document.getElementById("user-privacy-icon");
    const text = document.getElementById("user-privacy-text");
    const menu = document.getElementById("user-privacy-menu");
    
    if (icon) icon.textContent = getPrivacyIcon(privacy);
    if (text) text.textContent = getPrivacyText(privacy);
    if (menu) menu.style.display = 'none';
}

// 🟢 Hàm đóng tất cả menu
function closeAllPostMenus() {
    document.querySelectorAll(".post-menu-dropdown").forEach(menu => {
        menu.style.display = "none";
    });
}

// 🟢 HÀM TOGGLE FOLLOW CHO USER POSTS - HOẠT ĐỘNG NGAY LẬP TỨC
async function toggleFollow(userId) {
    const btn = document.querySelector(`[data-user-follow="${userId}"]`);
    if (!btn) return;

    // Lưu trạng thái hiện tại
    const wasFollowing = btn.classList.contains("following");
    const originalText = btn.textContent;
    
    // Disable button để tránh click nhiều lần
    btn.disabled = true;
    btn.textContent = wasFollowing ? "Đang bỏ theo dõi..." : "Đang theo dõi...";

    try {
        const res = await fetch("/HeThongChamSocCaKoi/backend/api/community/follow/toggle.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `target_id=${encodeURIComponent(userId)}`
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Lỗi theo dõi.");

        // 🟢 CẬP NHẬT UI NGAY LẬP TỨC
        if (data.isFollowing) {
            // Đã follow thành công
            btn.classList.add("following");
            btn.textContent = "Đang theo dõi";
            
            // Hiển thị thông báo
            showUserNotification("✅ Đã theo dõi thành công!", "success");
        } else {
            // Đã unfollow thành công
            btn.classList.remove("following");
            btn.textContent = "Theo dõi";
            
            // Hiển thị thông báo
            showUserNotification("Đã bỏ theo dõi", "info");
        }
        
        // 🟢 CẬP NHẬT TẤT CẢ CÁC NÚT THEO DÕI CÙNG USER ID
        updateAllFollowButtons(userId, data.isFollowing);
        
        // 🟢 CẬP NHẬT SỐ LƯỢNG FOLLOWER NẾU CÓ HIỂN THỊ
        updateFollowerCount(userId, data.isFollowing);

    } catch (err) {
        console.error("❌ Lỗi toggle follow:", err);
        
        // Khôi phục trạng thái cũ nếu có lỗi
        btn.classList.toggle("following", wasFollowing);
        btn.textContent = originalText;
        
        // Hiển thị thông báo lỗi
        showUserNotification("❌ Lỗi: " + err.message, "error");
        
    } finally {
        // Re-enable button
        btn.disabled = false;
    }
}

// 🟢 HÀM CẬP NHẬT TẤT CẢ CÁC NÚT THEO DÕI CÙNG USER ID
function updateAllFollowButtons(userId, isFollowing) {
    // Tìm tất cả các nút theo dõi cho user này
    const allFollowButtons = document.querySelectorAll(`[data-user-follow="${userId}"]`);
    
    allFollowButtons.forEach(btn => {
        if (btn.disabled) return; // Không cập nhật nút đang được xử lý
        
        btn.classList.toggle("following", isFollowing);
        btn.textContent = isFollowing ? "Đang theo dõi" : "Theo dõi";
        
        // Thêm hiệu ứng visual feedback
        btn.classList.add("follow-updated");
        setTimeout(() => {
            btn.classList.remove("follow-updated");
        }, 500);
    });
    
    console.log(`✅ Đã cập nhật ${allFollowButtons.length} nút theo dõi cho user ${userId}`);
}

// 🟢 HÀM CẬP NHẬT SỐ LƯỢNG FOLLOWER (NẾU CÓ HIỂN THỊ)
function updateFollowerCount(userId, isFollowing) {
    // Tìm các phần tử hiển thị số follower
    const followerCountElements = document.querySelectorAll(`[data-follower-user="${userId}"]`);
    
    followerCountElements.forEach(el => {
        const currentCount = parseInt(el.textContent) || 0;
        let newCount = currentCount;
        
        if (isFollowing) {
            newCount = currentCount + 1;
        } else if (currentCount > 0) {
            newCount = currentCount - 1;
        }
        
        // Cập nhật số lượng
        el.textContent = newCount;
        
        // Thêm hiệu ứng
        el.classList.add("fcount-updated");
        setTimeout(() => {
            el.classList.remove("fcount-updated");
        }, 500);
    });
}

// 🟢 HÀM HIỂN THỊ THÔNG BÁO CHO USER
function showUserNotification(message, type = "info") {
    // Xóa thông báo cũ nếu có
    const oldNotification = document.getElementById("user-notification");
    if (oldNotification) oldNotification.remove();
    
    // Tạo thông báo mới
    const notification = document.createElement("div");
    notification.id = "user-notification";
    notification.className = `user-notification ${type}`;
    
    // Icon cho từng loại thông báo
    const icons = {
        success: "✅",
        error: "❌",
        info: "ℹ️",
        warning: "⚠️"
    };
    
    notification.innerHTML = `
        <span class="user-notification-icon">${icons[type] || "ℹ️"}</span>
        <span class="user-notification-text">${message}</span>
    `;
    
    // Thêm vào DOM
    document.body.appendChild(notification);
    
    // Hiệu ứng xuất hiện
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 🟢 THÊM HÀM TOGGLE POST MENU CHO USER POSTS
function togglePostMenu(postId) {
    console.log("🟡 Toggle menu for post in user posts:", postId);
    
    // Lấy menu hiện tại
    const menu = document.getElementById(`post-menu-${postId}`);
    if (!menu) {
        console.error("❌ Menu not found for post:", postId);
        return;
    }
    
    // Kiểm tra nếu menu đang hiển thị
    const isVisible = menu.style.display === "block" || 
                     menu.classList.contains("show");
    
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
}

// 🟢 THÊM EVENT LISTENER CHO CLICK NGOÀI MENU
document.addEventListener("click", function(e) {
    // Nếu click ra ngoài menu 3 chấm
    if (!e.target.closest(".post-menu") && !e.target.closest(".post-menu-dropdown")) {
        document.querySelectorAll(".post-menu-dropdown").forEach(menu => {
            menu.style.display = "none";
            menu.classList.remove("show");
        });
    }
    
    // Nếu click ra ngoài notification
    if (!e.target.closest(".user-notification")) {
        const notification = document.getElementById("user-notification");
        if (notification) {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }
    }
});
function addUserPostEditStyles() {
    if (document.getElementById('user-post-edit-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'user-post-edit-styles';
    style.textContent = `
        /* ===== COMMENT FORM FACEBOOK STYLE ===== */
        .comment-form {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-top: 6px;
            align-items: center;
            width: 100%;
        }
        
        .comment-form input[name="comment"] {
            flex: 1;
            box-sizing: border-box;
            border-radius: 999px;
            border: 1px solid #ddd;
            padding: 8px 45px 8px 14px;
            font-size: 14px;
            min-height: 36px;
            background: #f0f2f5;
            border: none;
        }
        
        .comment-form input[name="comment"]:focus {
            height: 36px !important;
            line-height: 20px !important;
            padding: 8px 45px 8px 12px !important;
            box-sizing: border-box !important;
            outline: none;
            border-color: #1976d2;
            box-shadow: 0 0 0 1px rgba(25,118,210,0.1);
            background: white;
        }
        
        /* Nút mũi tên nằm bên phải input */
        .comment-send-btn {
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: #bcc0c4;
            cursor: default;
            pointer-events: none;
            z-index: 10;
            margin-left: 10px !important;
        }
        .comment-form {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-top: 6px;
            align-items: center;
            gap: 8px; /* 🟢 THÊM DÒNG NÀY - tạo khoảng cách giữa các phần tử */
            }

        .comment-add-image-btn {
            margin-right: 28px !important; /* 🟢 THÊM DÒNG NÀY */
            }
        .comment-send-btn .material-icons {
            font-size: 20px !important;
            line-height: 1 !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Có chữ => active: nền xanh, icon trắng, bấm được */
        .comment-send-btn.active {
            background: #1877f2;
            color: #fff;
            cursor: pointer;
            pointer-events: auto;
        }
        
        /* Hover effect */
        .comment-send-btn.active:hover {
            background: #166fe5;
            transform: translateY(-50%) scale(1.05);
        }
        
        /* ===== REPLY FORM FACEBOOK STYLE ===== */
        .reply-box {
            align-items: center !important;
            justify-content: center !important;
            height: 36px !important;
            position: relative !important;
            margin-left: 45px;
            margin-top: 6px;
            display: none;
            position: relative;
            width: calc(100% - 45px);
        }
        
        .reply-input-wrapper {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            background: #f0f2f5 !important;
            border-radius: 20px !important;
            border: 1px solid transparent !important;
            min-height: 36px !important;
            max-height: 120px !important;
            padding-right: 0px !important;
            transition: all 0.2s !important;
        }
        
        .reply-input {
            flex: 1 !important;
            min-height: 36px !important;
            max-height: 120px !important;
            padding: 8px 12px !important;
            background: transparent !important;
            border: none !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            outline: none !important;
            overflow-y: auto !important;
            resize: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
        }
        
        .reply-input:focus {
            background: white !important;
            border-color: #1877f2 !important;
            box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1) !important;
        }
        
        /* Container cho nút thêm ảnh và gửi */
        .reply-buttons-container {
            position: absolute !important;
            right: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            z-index: 10 !important;
            height: 28px !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Nút thêm ảnh */
        .reply-add-image-btn {
            width: 28px !important;
            height: 28px !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            border: none !important;
            color: #65676b !important;
            cursor: pointer !important;
            border-radius: 50% !important;
            transition: all 0.2s !important;
        }
        
        .reply-add-image-btn:hover {
            background: rgba(0,0,0,0.05) !important;
            color: #1877f2 !important;
        }
        
        /* Nút gửi */
        .reply-send-btn {
           position: absolute !important;
            right: 8px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            cursor: default;
            pointer-events: none;
            z-index: 10;
            transition: all 0.2s ease;
        }
        
        .reply-send-btn.active {
            background: #1877f2 !important;
            color: white !important;
            cursor: pointer !important;
            pointer-events: auto !important;
        }
        
        .reply-send-btn.active:hover {
            background: #166fe5 !important;
            transform: scale(1.05) !important;
        }
        
        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
            .comment-form input[name="comment"] {
                padding: 8px 42px 8px 12px;
            }
            
            .reply-input {
                padding: 8px 42px 8px 10px !important;
            }
            
            .comment-send-btn,
            .reply-send-btn {
                right: 6px;
                width: 26px;
                height: 26px;
            }
            
            .reply-add-image-btn {
                width: 26px !important;
                height: 26px !important;
                right: 35px !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 🟢 Thêm styles khi DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    addUserPostEditStyles();
    
    // 🟢 Đảm bảo comment system được kích hoạt
    initializeCommentSystem();
});

// 🟢 KHỞI TẠO COMMENT SYSTEM CHO USER POSTS
function initializeCommentSystem() {
    console.log("🟡 Initializing comment system for user posts...");
    
    // Kiểm tra nếu các hàm comment đã được định nghĩa
    if (typeof window.toggleComments !== 'undefined' && 
        typeof window.submitComment !== 'undefined') {
        console.log("✅ Comment system already loaded");
        return;
    }
    
    // Tạo placeholder functions để tránh lỗi
    window.toggleComments = window.toggleComments || function(postId) {
        const wrap = document.getElementById(`comments-${postId}`);
        if (!wrap) return;

        const isOpen = wrap.dataset.open === "1";

        if (!isOpen) {
            wrap.style.display = "block";
            wrap.dataset.open = "1";

            const mode = wrap.dataset.mode || "hot";
            window.loadComments && window.loadComments(postId, mode);
        } else {
            wrap.style.display = "none";
            wrap.dataset.open = "0";
        }
    };
    
    window.submitComment = window.submitComment || function(e, postId) {
        e.preventDefault();
        alert("Comment system đang tải...");
    };
    
    window.toggleCommentFilterMenu = window.toggleCommentFilterMenu || function(postId) {
        const menu = document.getElementById(`comment-filter-menu-${postId}`);
        if (!menu) return;
        menu.classList.toggle("open");
    };
    
    window.changeCommentFilter = window.changeCommentFilter || function(postId, mode) {
        const wrap = document.getElementById(`comments-${postId}`);
        if (!wrap) return;
        wrap.dataset.mode = mode;
        const textMap = { hot: "Hot nhất", newest: "Mới nhất", following: "Người bạn đang theo dõi", all: "Tất cả bình luận" };
        const label = document.getElementById(`comment-filter-text-${postId}`);
        if (label) label.textContent = textMap[mode] || textMap.hot;
        const menu = document.getElementById(`comment-filter-menu-${postId}`);
        if (menu) menu.classList.remove("open");
    };
    
    console.log("✅ Placeholder comment functions created");
}

// 🟢 HÀM LOAD COMMENTS FALLBACK (dùng khi community-comments.js chưa load)
window.loadComments = window.loadComments || async function(postId, mode = "hot") {
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
        
        // 🟢 ĐẢM BẢO COMMENT STORE TỒN TẠI
        if (!window.commentStore) window.commentStore = {};
        window.commentStore[postId] = list;

        // Sử dụng renderCommentItem từ community-comments.js nếu có
        if (window.renderCommentItem) {
            renderCommentsForPost(postId, list, mode);
        } else {
            // Fallback render đơn giản
            listEl.innerHTML = list.map(c => `
                <div class="comment-item">
                    <div class="comment-avatar">
                        <div class="avatar-circle">${(c.user?.Username || "?")[0]}</div>
                    </div>
                    <div class="comment-bubble">
                        <div class="comment-name">${escapeHtml(c.user?.Username || "Người dùng")}</div>
                        <div class="comment-text">${escapeHtml(c.Content || "")}</div>
                    </div>
                </div>
            `).join("");
        }
        
        wrap.dataset.loaded = "1";
    } catch (err) {
        listEl.innerHTML = `<p class="comment-error">${escapeHtml(err.message)}</p>`;
    }
};

// 🟢 HÀM RENDER COMMENTS FALLBACK
function renderCommentsForPost(postId, comments, mode) {
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (!listEl) return;

    const sorted = sortComments(comments, mode);
    
    // Sử dụng renderCommentItem từ community-comments.js nếu có
    if (window.renderCommentItem) {
        listEl.innerHTML = sorted.map((c) => window.renderCommentItem(c, postId)).join("");
    } else {
        listEl.innerHTML = sorted.map(c => `
            <div class="comment-item">
                <div class="comment-avatar">
                    <div class="avatar-circle">${(c.user?.Username || "?")[0]}</div>
                </div>
                <div class="comment-bubble">
                    <div class="comment-name">${escapeHtml(c.user?.Username || "Người dùng")}</div>
                    <div class="comment-text">${escapeHtml(c.Content || "")}</div>
                </div>
            </div>
        `).join("");
    }
}

// 🟢 HÀM SORT COMMENTS FALLBACK
function sortComments(comments, mode) {
    let arr = Array.isArray(comments) ? [...comments] : [];

    switch (mode) {
        case "hot":
            arr.sort((a, b) => {
                const ra = (a.reactions && a.reactions.total) || 0;
                const rb = (b.reactions && b.reactions.total) || 0;
                return rb - ra;
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