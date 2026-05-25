<?php
// frontend/users/profile.php
require_once '../../includes/header.php';

// Kiểm tra đăng nhập
if ($userId <= 0) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}

// Lấy thông tin chi tiết User
$stmt = $conn->prepare("SELECT * FROM Users WHERE UserID = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Lấy danh sách cá của user để chọn Featured
$fishList = [];
$featuredFishList = []; // Mảng chứa các cá nổi bật đã được chọn
$stmt = $conn->prepare("
    SELECT k.FishID, k.Name, k.ImageURL, k.Variety, k.IsFeatured 
    FROM KoiFish k 
    JOIN Pond p ON k.PondID = p.PondID 
    WHERE p.UserID = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
while($row = $result->fetch_assoc()) {
    // Ép kiểu FishID sang số nguyên để nhất quán với thao tác JS
    $row['FishID'] = (int)$row['FishID'];
    $fishList[] = $row;
    if ($row['IsFeatured']) {
        $featuredFishList[] = $row; // Lọc cá nổi bật
    }
}
$stmt->close();

// Avatar & Cover
$avatar = $user['AvatarURL'] ? $user['AvatarURL'] : "https://ui-avatars.com/api/?name=" . urlencode($user['FullName']) . "&background=0ea5e9&color=fff&size=256";
$coverUrl = $user['CoverURL'];
$hasCover = !empty($coverUrl);
?>

<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/users/profile.css">
<style>
    /* CSS cho phần chọn cá */
    .fish-selection-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 15px;
        margin-top: 15px;
        max-height: 400px;
        overflow-y: auto;
        padding: 5px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 15px;
    }
    .fish-select-item {
        position: relative;
        border: 2px solid transparent;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
    }
    .fish-select-item.selected {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-soft);
    }
    .fish-select-item img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
    }
    .fish-select-item .fish-name {
        font-size: 12px;
        text-align: center;
        padding: 5px;
        background: #f8fafc;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .fish-select-item .check-icon {
        position: absolute;
        top: 5px;
        right: 5px;
        background: var(--color-primary);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 10px;
    }
    .fish-select-item.selected .check-icon {
        display: flex;
    }
    /* Ẩn checkbox thật */
    .fish-checkbox { display: none; }

    /* CSS MỚI cho chế độ xem trước */
    .fish-preview-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        padding: 15px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
    }
    .fish-preview-item {
        width: 150px;
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
    }
    .fish-preview-item img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
    }
    .fish-preview-item .fish-name {
        font-size: 12px;
        text-align: center;
        padding: 5px;
        background: #f8fafc;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .edit-selection-btn {
        background: #e0f2f7;
        color: var(--color-primary-dark);
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
    }
    .edit-selection-btn:hover {
        background: #bae6fd;
    }
    .edit-selection-btn i {
        margin-right: 5px;
    }
    .hidden { display: none !important; }
</style>


<div class="container-main" style="padding-top: 40px;">
    <div class="profile-layout">
        
        <!-- SIDEBAR -->
        <div class="sidebar-card card">
            <div class="avatar-section">
                <div class="avatar-wrapper" onclick="document.getElementById('avatarInput').click()">
                    <img src="<?= htmlspecialchars($avatar) ?>" id="previewAvatar" class="avatar-img">
                    <div class="avatar-edit-icon"><i class="fas fa-camera"></i></div>
                </div>
                <h2 class="sidebar-name" id="sidebarFullName"><?= htmlspecialchars($user['FullName']) ?></h2>
                <span class="sidebar-role" id="sidebarRole"><?= htmlspecialchars($user['Role']) ?></span>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            <ul class="menu-list">
                <li class="menu-item"><a href="#" class="menu-link active"><i class="fas fa-user-cog"></i> Cài đặt chung</a></li>
                <li class="menu-item"><a href="#" onclick="openPasswordModal()" class="menu-link"><i class="fas fa-lock"></i> Đổi mật khẩu</a></li>
                <li class="menu-item">
                    <a href="/HeThongChamSocCaKoi/frontend/users/public_profile.php?id=<?= $userId ?>" class="menu-link" style="color: var(--color-primary);">
                        <i class="fas fa-external-link-alt"></i> Xem trang công khai
                    </a>
                </li>
                <li class="menu-item"><a href="/HeThongChamSocCaKoi/backend/api/auth/logout.php" class="menu-link" style="color: #ef4444;"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a></li>
            </ul>
        </div>

        <!-- MAIN FORM -->
        <div class="content-card card">
            <div class="content-header">
                <h3 class="content-title">Chỉnh sửa hồ sơ</h3>
            </div>

            <form id="profileForm" enctype="multipart/form-data">
                <!-- Inputs cũ (Avatar, Cover...) -->
                <input type="file" name="avatar" id="avatarInput" accept="image/*" style="display: none;">
                <input type="file" name="cover" id="coverInput" accept="image/*" style="display: none;">
                <!-- Hidden input for current Avatar/Cover URL to handle "no change" case -->
                <input type="hidden" name="current_avatar_url" value="<?= htmlspecialchars($user['AvatarURL'] ?? '') ?>">
                <input type="hidden" name="current_cover_url" value="<?= htmlspecialchars($user['CoverURL'] ?? '') ?>">


                <!-- SECTION 1 -->
                <div class="form-section-title"><i class="far fa-eye"></i> Hiển thị công khai</div>
                <div style="margin-bottom: 10px; font-size: 13px; color: var(--color-text-muted);">Thông tin này sẽ xuất hiện trên trang cá nhân.</div>

                <div class="form-group full-width" style="margin-bottom: 25px;">
                    <label class="form-label">Ảnh bìa</label>
                    <div class="cover-upload-container" onclick="document.getElementById('coverInput').click()">
                        <img src="<?= $hasCover ? htmlspecialchars($coverUrl) : '' ?>" id="previewCover" class="cover-preview" style="display: <?= $hasCover ? 'block' : 'none' ?>;">
                        <div class="cover-preview" id="coverPlaceholder" style="background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary), #6366f1); display: <?= $hasCover ? 'none' : 'block' ?>;"></div>
                        <div class="cover-upload-btn"><i class="fas fa-cloud-upload-alt" style="font-size: 32px; margin-bottom: 10px;"></i><span>Thay đổi ảnh bìa</span></div>
                    </div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Tên hiển thị</label>
                        <input type="text" class="form-control" name="display_name" id="displayNameInput" value="<?= htmlspecialchars($user['FullName']) ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Danh hiệu</label>
                        <input type="text" class="form-control" name="title" id="titleInput" value="<?= htmlspecialchars($user['Title'] ?? '') ?>">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Giới thiệu (Bio)</label>
                        <textarea class="form-control" name="bio" id="bioInput"><?= htmlspecialchars($user['Bio'] ?? '') ?></textarea>
                    </div>
                </div>

                <!-- SECTION 2: CHỌN CÁ NỔI BẬT (ĐÃ CHỈNH SỬA) -->
                <div class="form-section-title" style="margin-top: 40px; display: flex; justify-content: space-between; align-items: center;">
                    <div><i class="fas fa-star"></i> Chọn cá nổi bật</div>
                    <!-- Nút chỉnh sửa chỉ hiển thị ở chế độ xem -->
                    <button type="button" class="edit-selection-btn <?= count($fishList) === 0 ? 'hidden' : '' ?>" id="editFishBtn" onclick="toggleFishEdit(true)">
                        <i class="fas fa-edit"></i> Chỉnh sửa
                    </button>
                </div>
                <div style="margin-bottom: 10px; font-size: 13px; color: var(--color-text-muted);" id="fishInstruction">Thông tin này sẽ xuất hiện trên trang cá nhân.</div>
                
                <?php if (count($fishList) > 0): ?>
                    <!-- A. HIỂN THỊ CÁ NỔI BẬT ĐÃ CHỌN (Chế độ xem) -->
                    <div id="fishPreviewSection" class="fish-preview-grid">
                        <?php if (count($featuredFishList) > 0): ?>
                            <?php foreach($featuredFishList as $fish): ?>
                                <div class="fish-preview-item">
                                    <img src="<?= $fish['ImageURL'] ? $fish['ImageURL'] : 'https://placehold.co/150x120/e2e8f0/94a3b8?text=No+Image' ?>" alt="<?= htmlspecialchars($fish['Name']) ?>">
                                    <div class="fish-name"><?= htmlspecialchars($fish['Name']) ?></div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div style="color: var(--color-text-muted); font-style: italic;">Chưa có chú cá nổi bật nào được chọn. Bấm "Chỉnh sửa" để chọn.</div>
                        <?php endif; ?>
                    </div>

                    <!-- B. KHUNG CHỌN TẤT CẢ CÁ (Chế độ chỉnh sửa, mặc định ẩn) -->
                    <div id="fishSelectionSection" class="hidden">
                        <!-- Nút Hoàn tất chỉnh sửa -->
                        <div style="text-align: right; margin-bottom: 15px;">
                            <button type="button" class="btn btn-secondary" style="padding: 6px 12px; font-size: 14px;" onclick="saveFeaturedFish()">
                                <i class="fas fa-check"></i> Hoàn tất chỉnh sửa
                            </button>
                        </div>
                        
                        <div class="fish-selection-grid">
                            <?php foreach($fishList as $fish): ?>
                                <label class="fish-select-item <?= $fish['IsFeatured'] ? 'selected' : '' ?>">
                                    <!-- Đảm bảo các checkbox có cùng name="featured_fish[]" -->
                                    <input type="checkbox" name="featured_fish[]" value="<?= $fish['FishID'] ?>" class="fish-checkbox" <?= $fish['IsFeatured'] ? 'checked' : '' ?> onchange="toggleFishSelection(this)">
                                    <img src="<?= $fish['ImageURL'] ? $fish['ImageURL'] : 'https://placehold.co/150x120/e2e8f0/94a3b8?text=No+Image' ?>" alt="<?= htmlspecialchars($fish['Name']) ?>">
                                    <div class="fish-name"><?= htmlspecialchars($fish['Name']) ?></div>
                                    <div class="check-icon"><i class="fas fa-check"></i></div>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php else: ?>
                    <div style="padding: 20px; text-align: center; background: #f8fafc; border-radius: 12px; color: var(--color-text-muted);">
                        Bạn chưa có chú cá nào trong hồ sơ. Hãy thêm cá vào hồ trước nhé!
                    </div>
                <?php endif; ?>

                <!-- SECTION 3: PRIVATE INFO -->
                <div class="form-section-title" style="margin-top: 40px;"><i class="far fa-id-card"></i> Thông tin cá nhân</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" value="<?= htmlspecialchars($user['Email']) ?>" readonly style="background: #f1f5f9;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SĐT</label>
                        <input type="tel" class="form-control" name="phone" value="<?= htmlspecialchars($user['Phone'] ?? '') ?>">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">Địa chỉ</label>
                        <input type="text" class="form-control" name="address" value="<?= htmlspecialchars($user['Address'] ?? '') ?>">
                    </div>
                </div>

                <!-- ACTIONS -->
                <div class="btn-action-group">
                    <button type="button" class="btn btn-secondary" onclick="location.reload()">Hủy bỏ</button>
                    <button type="submit" id="saveProfileBtn" class="btn btn-primary">
                        <span id="btnSpinner" class="hidden"><i class="fas fa-spinner fa-spin"></i></span>
                        <i class="fas fa-save"></i> Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal Password giữ nguyên -->
<div id="password-modal" class="modal">
    <div class="modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 class="content-title" style="font-size:18px;">Đổi mật khẩu</h3>
            <button onclick="closePasswordModal()" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
        </div>
        <form id="passwordForm">
            <div class="form-group" style="margin-bottom:15px;"><label class="form-label">Mật khẩu hiện tại</label><input type="password" name="old_password" class="form-control" required></div>
            <div class="form-group" style="margin-bottom:15px;"><label class="form-label">Mật khẩu mới</label><input type="password" name="new_password" class="form-control" required minlength="6"></div>
            <div class="form-group" style="margin-bottom:20px;"><label class="form-label">Xác nhận mật khẩu mới</label><input type="password" name="confirm_password" class="form-control" required minlength="6"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;"><i class="fas fa-lock"></i> Xác nhận</button>
        </form>
    </div>
</div>

<script>
    // GLOBAL DATA: Inject full fish list for client-side manipulation to update UI without reload
    const ALL_FISH_LIST = <?= json_encode($fishList, JSON_UNESCAPED_UNICODE) ?>;
</script>

<script src="/HeThongChamSocCaKoi/assets/js/users/profile.js"></script>

<script>
    // Hàm xử lý UI khi chọn cá
    function toggleFishSelection(checkbox) {
        const item = checkbox.closest('.fish-select-item');
        if(checkbox.checked) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }

    // Hàm MỚI: Cập nhật hiển thị cá nổi bật sau khi lưu thành công
    function updateFishPreview(selectedIds) {
        const previewSection = document.getElementById('fishPreviewSection');
        let newHtml = '';
        // Lọc danh sách cá dựa trên các ID vừa được chọn
        const selectedFish = ALL_FISH_LIST.filter(fish => selectedIds.includes(fish.FishID));

        if (selectedFish.length > 0) {
            selectedFish.forEach(fish => {
                const imageUrl = fish.ImageURL ? fish.ImageURL : 'https://placehold.co/150x120/e2e8f0/94a3b8?text=No+Image';
                
                newHtml += `
                    <div class="fish-preview-item">
                        <img src="${imageUrl}" alt="${fish.Name}">
                        <div class="fish-name">${fish.Name}</div>
                    </div>
                `;
            });
            // Cập nhật trạng thái IsFeatured trong ALL_FISH_LIST cho lần chỉnh sửa tiếp theo
            ALL_FISH_LIST.forEach(fish => { 
                fish.IsFeatured = selectedIds.includes(fish.FishID);
            });
        } else {
            // Cập nhật trạng thái IsFeatured cho tất cả cá là false
            ALL_FISH_LIST.forEach(fish => { fish.IsFeatured = false; });
            newHtml = '<div style="color: var(--color-text-muted); font-style: italic;">Chưa có chú cá nổi bật nào được chọn. Bấm "Chỉnh sửa" để chọn.</div>';
        }
        
        previewSection.innerHTML = newHtml;

        // Cập nhật trạng thái selected cho các checkbox trong khu vực chỉnh sửa
        document.querySelectorAll('#fishSelectionSection .fish-select-item').forEach(item => {
            const checkbox = item.querySelector('.fish-checkbox');
            const fishId = parseInt(checkbox.value);
            if (selectedIds.includes(fishId)) {
                item.classList.add('selected');
                checkbox.checked = true;
            } else {
                item.classList.remove('selected');
                checkbox.checked = false;
            }
        });
    }

    // Hàm MỚI: Gọi API để lưu danh sách cá nổi bật (Không reload trang)
    async function saveFeaturedFish() {
        const selectedCheckboxes = document.querySelectorAll('#fishSelectionSection .fish-checkbox:checked');
        const selectedFishIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

        const formData = new FormData();
        selectedFishIds.forEach(id => formData.append('featured_fish[]', id));
        
        // UI Loading state
        const saveEditBtn = document.querySelector('#fishSelectionSection button.btn-secondary');
        const originalHtml = saveEditBtn.innerHTML;
        saveEditBtn.disabled = true;
        saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        try {
            const response = await fetch('/HeThongChamSocCaKoi/backend/api/users/profile/update_featured_fish.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast(result.message, 'success');
                // Cập nhật UI ngay lập tức
                updateFishPreview(selectedFishIds);
                toggleFishEdit(false); // Quay lại chế độ xem
            } else {
                showToast("Lỗi lưu cá nổi bật: " + result.message, 'error');
            }
        } catch (error) {
            console.error('Lỗi kết nối API:', error);
            showToast('Lỗi kết nối đến máy chủ.', 'error');
        } finally {
            saveEditBtn.disabled = false;
            saveEditBtn.innerHTML = originalHtml;
        }
    }

    // Hàm: Chuyển đổi giữa chế độ xem trước và chế độ chỉnh sửa
    function toggleFishEdit(isEditing) {
        const previewSection = document.getElementById('fishPreviewSection');
        const selectionSection = document.getElementById('fishSelectionSection');
        const editButton = document.getElementById('editFishBtn');
        const instruction = document.getElementById('fishInstruction');

        if (isEditing) {
            // Chế độ chỉnh sửa: Ẩn preview, hiện selection, ẩn nút Edit, thay đổi hướng dẫn
            previewSection.classList.add('hidden');
            selectionSection.classList.remove('hidden');
            editButton.classList.add('hidden');
            instruction.textContent = "Chọn những chú cá bạn muốn khoe trên trang cá nhân (Tối đa nên chọn 4-8 chú cá đẹp nhất).";
        } else {
            // Chế độ xem: Hiện preview, ẩn selection, hiện nút Edit, khôi phục hướng dẫn
            previewSection.classList.remove('hidden');
            selectionSection.classList.add('hidden');
            // Chỉ hiện nút Edit nếu có cá để chọn (tức là fishList > 0)
            if (document.querySelector('.fish-select-item')) {
                 editButton.classList.remove('hidden');
            }
            
            instruction.textContent = "Thông tin này sẽ xuất hiện trên trang cá nhân.";
        }
    }
</script>
<?php require_once '../../includes/footer.php'; ?>