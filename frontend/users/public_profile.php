<?php
// frontend/users/public_profile.php
require_once '../../includes/header.php';

// Đảm bảo biến $userId được xác định
$currentUserId = isset($userId) ? intval($userId) : 0;

// Xác định UserID cần xem
$viewUserId = isset($_GET['id']) ? intval($_GET['id']) : ($currentUserId > 0 ? $currentUserId : 0);

if ($viewUserId === 0) {
    echo "<div class='container-main mx-auto p-10 text-center'>Không tìm thấy người dùng. <a href='/HeThongChamSocCaKoi/index.php' class='text-blue-500'>Về trang chủ</a></div>";
    exit;
}

// Lấy thông tin User
$stmt = $conn->prepare("SELECT FullName, Username, AvatarURL, CoverURL, Bio, Title, Role, Email, CreatedAt FROM Users WHERE UserID = ?");
$stmt->bind_param("i", $viewUserId);
$stmt->execute();
$userProfile = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$userProfile) {
    echo "<div class='container-main mx-auto p-10 text-center'>Người dùng không tồn tại.</div>";
    exit;
}

// Avatar & Cover
$avatar = $userProfile['AvatarURL'] ? $userProfile['AvatarURL'] : "https://ui-avatars.com/api/?name=" . urlencode($userProfile['FullName']) . "&background=0ea5e9&color=fff&size=256";
$coverUrl = $userProfile['CoverURL'];
$hasCover = !empty($coverUrl);

// Stats logic
$stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM KoiFish k JOIN Pond p ON k.PondID = p.PondID WHERE p.UserID = ?");
$stmt->bind_param("i", $viewUserId);
$stmt->execute();
$fishCount = $stmt->get_result()->fetch_assoc()['cnt'];
$stmt->close();

$stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM Pond WHERE UserID = ?");
$stmt->bind_param("i", $viewUserId);
$stmt->execute();
$pondCount = $stmt->get_result()->fetch_assoc()['cnt'];
$stmt->close();

$stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM CommunityFollow WHERE FollowingID = ?");
$stmt->bind_param("i", $viewUserId);
$stmt->execute();
$followCount = $stmt->get_result()->fetch_assoc()['cnt'];
$stmt->close();

$isFollowing = false;
if ($currentUserId > 0 && $currentUserId !== $viewUserId) {
    $stmt = $conn->prepare("SELECT 1 FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ?");
    $stmt->bind_param("ii", $currentUserId, $viewUserId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) $isFollowing = true;
    $stmt->close();
}

// Featured Fish (ĐÃ CẬP NHẬT QUERY)
// Chỉ lấy cá có IsFeatured = 1
$featuredFish = [];
$stmt = $conn->prepare("
    SELECT k.*, p.PondName 
    FROM KoiFish k 
    JOIN Pond p ON k.PondID = p.PondID 
    WHERE p.UserID = ? AND k.IsFeatured = 1
    ORDER BY k.FishID DESC
");
$stmt->bind_param("i", $viewUserId);
$stmt->execute();
$resultKois = $stmt->get_result();
while($row = $resultKois->fetch_assoc()) {
    $featuredFish[] = $row;
}
$stmt->close();

?>

<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/users/profile.css">

<!-- VIEW: PUBLIC PROFILE -->
<div id="view-public">
    <!-- Cover Photo & Header -->
    <div class="profile-header">
        <div class="cover-photo" style="<?= $hasCover ? "background-image: url('".htmlspecialchars($coverUrl)."');" : "" ?>"></div>
        
        <div class="container-main">
            <div class="profile-info-bar">
                <div class="profile-identity">
                    <img src="<?= htmlspecialchars($avatar) ?>" alt="Avatar" class="avatar-public">
                    <div class="profile-texts">
                        <h1 class="profile-name">
                            <?= htmlspecialchars($userProfile['FullName']) ?> 
                            <?php if($userProfile['Role'] == 'Admin' || $userProfile['Role'] == 'Shop'): ?>
                                <i class="fas fa-check-circle" style="color: #38bdf8; font-size: 0.7em; vertical-align: middle;" title="Đã xác minh"></i>
                            <?php endif; ?>
                        </h1>
                        <div class="profile-badge">
                            <i class="fas fa-crown" style="color: #fbbf24;"></i> <?= htmlspecialchars($userProfile['Title'] ?? 'Thành viên') ?>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <?php if ($currentUserId === $viewUserId): ?>
                        <a href="/HeThongChamSocCaKoi/frontend/users/profile.php" class="btn btn-message" style="text-decoration: none;">
                            <i class="fas fa-user-cog"></i> Cài đặt
                        </a>
                    <?php elseif ($currentUserId > 0): ?>
                        <!-- Nút Theo dõi - Thêm ID và data-user-id -->
                        <button id="followBtn" data-user-id="<?= $viewUserId ?>" class="btn btn-follow <?= $isFollowing ? 'following' : '' ?>">
                            <i id="followIcon" class="fas <?= $isFollowing ? 'fa-check' : 'fa-user-plus' ?>"></i> <span id="followText"><?= $isFollowing ? 'Đang theo dõi' : 'Theo dõi' ?></span>
                        </button>
                        <!-- <button class="btn btn-message">
                            <i class="fas fa-comment-dots"></i> Nhắn tin
                        </button> -->
                    <?php else: ?>
                         <button id="followBtn" class="btn btn-follow" disabled title="Đăng nhập để theo dõi">
                            <i class="fas fa-user-plus"></i> <span>Theo dõi</span>
                        </button>
                    <?php endif; ?>
                    <button class="btn btn-message" title="Chia sẻ trang cá nhân này" onclick="copyProfileLink()">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Container -->
    <div class="container-main">
        
        <!-- Stats -->
        <div class="stats-bar">
            <div class="stat-item">
                <span class="stat-value"><?= number_format($fishCount) ?></span>
                <span class="stat-label">Chú cá</span>
            </div>
            <div class="stat-item" style="border-left: 1px solid #e2e8f0; padding-left: 80px;">
                <span class="stat-value"><?= number_format($pondCount) ?></span>
                <span class="stat-label">Hồ Koi</span>
            </div>
            <!-- Người theo dõi - Thêm ID -->
            <div class="stat-item" style="border-left: 1px solid #e2e8f0; padding-left: 80px;">
                <span id="followerCount" class="stat-value"><?= number_format($followCount) ?></span>
                <span class="stat-label">Người theo dõi</span>
            </div>
        </div>

        <!-- About -->
        <div class="about-box">
            <h3 class="section-title" style="margin-top:0;">Giới thiệu</h3>
            <p><?= nl2br(htmlspecialchars($userProfile['Bio'] ?? 'Thành viên này chưa viết giới thiệu.')) ?></p>
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: var(--color-text-muted);">
                <i class="fas fa-calendar-alt"></i> Tham gia: <?= date('d/m/Y', strtotime($userProfile['CreatedAt'])) ?>
            </div>
        </div>

        <!-- Collection Gallery -->
        <h3 class="section-title">Bộ sưu tập nổi bật</h3>
        
        <?php if (count($featuredFish) > 0): ?>
            <div class="gallery-grid">
                <?php foreach($featuredFish as $fish): ?>
                    <div class="fish-card" onclick="window.location.href='/HeThongChamSocCaKoi/frontend/customer/fish_details.php?id=<?= $fish['FishID'] ?>'">
                        <div class="fish-img-wrap">
                            <img src="<?= $fish['ImageURL'] ? $fish['ImageURL'] : 'https://placehold.co/400x300/e0f2fe/0ea5e9?text=Koi' ?>" class="fish-img" alt="<?= htmlspecialchars($fish['Name']) ?>">
                            <div class="fish-badge">
                                <i class="fas <?= $fish['Sex'] == 'Male' ? 'fa-mars' : ($fish['Sex'] == 'Female' ? 'fa-venus' : 'fa-question') ?>"></i> 
                                <?= $fish['Sex'] == 'Male' ? 'Đực' : ($fish['Sex'] == 'Female' ? 'Cái' : '?') ?>
                            </div>
                        </div>
                        <div class="fish-info">
                            <span class="fish-variety"><?= htmlspecialchars($fish['Variety']) ?></span>
                            <h4 class="fish-name"><?= htmlspecialchars($fish['Name']) ?></h4>
                            <div class="fish-meta">
                                <span><i class="fas fa-ruler-horizontal"></i> <?= $fish['Length'] ?? '?' ?> cm</span>
                                <span><i class="fas fa-weight-hanging"></i> <?= $fish['Weight'] ?? '?' ?> kg</span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div style="text-align:center; padding: 40px; color: var(--color-text-muted);">
                <i class="fas fa-fish" style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Thành viên này chưa chọn cá nổi bật nào.</p>
            </div>
        <?php endif; ?>
        
    </div>
</div>

<script>
// --- TOAST NOTIFICATION UTILITIES (Moved here for immediate global access) ---

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

// Cập nhật hàm này để dùng showToast thay vì alert()
function copyProfileLink() {
    const url = window.location.href;
    const message = 'Đã sao chép liên kết trang cá nhân!';
    const errorMessage = 'Lỗi khi sao chép.';

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function() {
            showToast(message, 'success');
        }, function(err) { 
            console.error('Copy Error:', err);
            showToast(errorMessage, 'error');
        });
    } else {
        let textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed"; textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        try { 
            document.execCommand('copy'); 
            showToast(message, 'success');
        } 
        catch (err) { 
            console.error('Copy Error:', err);
            showToast(errorMessage, 'error');
        }
        document.body.removeChild(textArea);
    }
}


// --- FOLLOW TOGGLE LOGIC (MOVED HERE) ---
function handleFollowToggle(e) {
    const followBtn = e.currentTarget;
    const followingId = followBtn.dataset.userId;
    const followText = document.getElementById('followText');
    const followIcon = document.getElementById('followIcon');
    const followerCountSpan = document.getElementById('followerCount');

    if (!followingId) return;

    // Tắt nút để tránh double click
    followBtn.disabled = true;
    followBtn.classList.add('opacity-75', 'cursor-not-allowed');

    const formData = new FormData();
    formData.append('following_id', followingId);

    fetch('/HeThongChamSocCaKoi/backend/api/users/profile/toggle_follow.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');

            // Cập nhật UI
            if (data.isFollowing) {
                // Đã theo dõi
                followBtn.classList.add('following');
                if (followText) followText.textContent = 'Đang theo dõi';
                if (followIcon) {
                    followIcon.classList.remove('fa-user-plus');
                    followIcon.classList.add('fa-check');
                }
            } else {
                // Đã bỏ theo dõi
                followBtn.classList.remove('following');
                if (followText) followText.textContent = 'Theo dõi';
                if (followIcon) {
                    followIcon.classList.remove('fa-check');
                    followIcon.classList.add('fa-user-plus');
                }
            }

            // Cập nhật số lượng người theo dõi
            if (followerCountSpan && data.newFollowCount !== undefined) {
                // Định dạng số lượng người theo dõi
                followerCountSpan.textContent = data.newFollowCount.toLocaleString('vi-VN');
            }

        } else {
            showToast('Thao tác thất bại: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error during follow toggle:', error);
        showToast('Có lỗi xảy ra khi kết nối server.', 'error');
    })
    .finally(() => {
        // Mở lại nút
        followBtn.disabled = false;
        followBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    });
}
// --- END FOLLOW TOGGLE LOGIC ---


document.addEventListener('DOMContentLoaded', function() {
    
    // --- GẮN SỰ KIỆN NÚT FOLLOW ---
    const followBtn = document.getElementById('followBtn');
    if (followBtn && !followBtn.disabled) { // Chỉ gắn sự kiện nếu nút không bị disable
        followBtn.addEventListener('click', handleFollowToggle);
    }
});
</script>

<?php require_once '../../includes/footer.php'; ?>