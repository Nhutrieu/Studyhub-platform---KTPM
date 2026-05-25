<?php
session_start();
$active_menu = 'ai-detect';
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}

$page_title = "Quản Lý Cá Koi";

// Lưu trang trước khi vào AI (chỉ khi GET) – có kiểm tra domain để tránh spoof
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $defaultPrev = '/HeThongChamSocCaKoi/frontend/dashboards/dashboard.php';
    $ref = $_SERVER['HTTP_REFERER'] ?? '';

    if ($ref && isset($_SERVER['HTTP_HOST']) && strpos($ref, $_SERVER['HTTP_HOST']) !== false) {
        $_SESSION['prev_ai_page'] = $ref;
    } elseif (!isset($_SESSION['prev_ai_page'])) {
        $_SESSION['prev_ai_page'] = $defaultPrev;
    }
}

// --- LIÊN KẾT MODULE: Lấy thông tin cá nếu có ID ---
$fishInfo = null;
$fid = null;

if (isset($_GET['fish_id'])) {
    $fid = intval($_GET['fish_id']);
    $stmt = $conn->prepare("SELECT FishID, Name, ImageURL, HealthStatus FROM KoiFish WHERE FishID = ?");
    $stmt->bind_param("i", $fid);
    $stmt->execute();
    $result = $stmt->get_result();
    $fishInfo = $result->num_rows > 0 ? $result->fetch_assoc() : null;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KOI HEALTH CHECK - AI SCAN</title>

    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
    <link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/ai-detect/health-check.css">
</head>

<body>
<?php include '../../../includes/header.php'; ?>
<!-- APP HEADER -->
<div class="app-header">
    <div class="header-left">
        <a href="<?= $_SESSION['prev_ai_page'] ?? '/HeThongChamSocCaKoi/frontend/dashboards/dashboard.php' ?>"
           class="back-button" title="Quay lại">
            <span class="material-icons-round">arrow_back</span> <span>Quay lại</span>
        </a>
        
        <div class="header-brand">
            <span class="material-icons-round" style="color:var(--primary)">medical_services</span>
            KOI DOCTOR AI
        </div>
    </div>
    
    <div class="header-actions">
        <!-- Nút chọn cá để lưu hồ sơ -->
        <button id="btn-select-fish" title="Chọn cá để lưu hồ sơ">
            <span class="material-icons-round">🐟</span> Chọn Cá
        </button>
    </div>
</div>

<div class="container">

    <!-- LEFT SIDE -->
    <div class="panel-left">

        <!-- HIỂN THỊ CONTEXT CÁ NẾU CÓ -->
        <div class="fish-context-card" id="fish-context-card"
             style="display: <?= $fishInfo ? 'flex' : 'none' ?>;">
            <img
                src="<?= isset($fishInfo['ImageURL']) && $fishInfo['ImageURL'] ? htmlspecialchars($fishInfo['ImageURL']) : 'https://placehold.co/100' ?>"
                onerror="this.src='https://placehold.co/100';"
                class="fish-avatar"
                id="fish-avatar"
            >
            <div style="flex: 1;">
                <div style="font-size:0.8rem; color:#64748b; font-weight:700; text-transform:uppercase">
                    Đang khám cho:
                </div>
                <div style="font-size:1.1rem; font-weight:800; color:#0f172a"
                     id="fish-name-display">
                    <?= htmlspecialchars($fishInfo['Name'] ?? 'Chưa chọn') ?>
                </div>
                <input type="hidden" id="current-fish-id" value="<?= $fishInfo['FishID'] ?? '' ?>">
            </div>
            <button onclick="clearFishSelection()" 
                    class="fish-clear-btn"
                    title="Bỏ chọn cá">
                <span class="material-icons-round">close</span>
            </button>
        </div>

        <h1>Kiểm tra sức khỏe</h1>
        <p class="subtitle">
            Tải ảnh cá Koi, hệ thống sẽ phân tích vùng nghi ngờ bệnh và đưa ra tư vấn
        </p>

        <form id="scanForm" method="POST" enctype="multipart/form-data"
              style="display:flex;flex-direction:column;height:100%;">
            <label for="image-input"
                   class="upload-area"
                   id="drop-zone">

                <span class="material-icons-round upload-icon">add_a_photo</span>

                <div class="upload-text">
                    Chọn hoặc kéo thả ảnh vào đây
                    <span class="material-icons-round help-icon"
                          title="Gợi ý chụp ảnh:
                        - Chụp rõ toàn thân cá (chỗ nghi ngờ bệnh)
                        - Không để mặt nước chói sáng
                        - Không quá gần hoặc quá mờ
                        - Nên chụp trong ánh sáng tốt để AI phân tích chính xác hơn">
                        help_outline
                    </span>
                </div>

                <div class="upload-sub">Hỗ trợ JPG, PNG (Tối đa 10MB)</div>
            </label>

            <!-- File input (AJAX sẽ bắt sự kiện submit, không dùng POST PHP) -->
            <input type="file" name="image" id="image-input" accept="image/*">

            <div class="preview-container" id="preview-box">
                <div class="change-img-btn" onclick="document.getElementById('image-input').click()">
                    <span class="material-icons-round" style="font-size:16px;">refresh</span> Đổi ảnh
                </div>
                <img id="preview-img" src="" alt="Preview">
            </div>

            <!-- Hiện tại lỗi runtime sẽ do JS hiển thị bằng modal -->

            <!-- Nút submit sẽ được enable khi chọn ảnh (JS) -->
            <button type="submit" class="btn-analyze" id="submit-btn" disabled>
                <div class="spinner" id="loading-spinner" style="display:none;"></div>
                <span id="btn-text">Phân tích ngay</span>
                <span class="material-icons-round" id="btn-icon">analytics</span>
            </button>

            <div class="tips-widget" id="tips-box">
                <div class="tips-title">
                    <span class="material-icons-round" style="color:#f59e0b">lightbulb</span>
                    Mẹo chụp ảnh chuẩn AI
                </div>
                <div class="tip-item">
                    <span class="material-icons-round tip-icon">check_circle</span>
                    Chụp rõ toàn thân cá (vùng nghi ngờ)
                </div>
                <div class="tip-item">
                    <span class="material-icons-round tip-icon">check_circle</span>
                    Tránh ánh sáng phản chiếu mặt nước
                </div>
                <div class="tip-item">
                    <span class="material-icons-round tip-icon">check_circle</span>
                    Đảm bảo cá nằm trọn trong khung hình
                </div>
            </div>
        </form>

    </div>

    <!-- RIGHT SIDE RESULT (JS/AJAX sẽ cập nhật) -->
    <div class="panel-right">

        <div class="result-header">
            <h3>Kết quả phân tích</h3>

            <span id="status-badge" class="status-badge status-empty">
                Chờ dữ liệu
            </span>
        </div>

        <div class="result-content">
            <div id="skeleton-loading" style="display:none;"></div>
            <div id="result-section"></div>

            <div id="empty-state" class="empty-state">
                <div class="material-icons-round empty-icon">image_search</div>
                <p>Hãy tải ảnh lên để bắt đầu phân tích sức khỏe cá</p>
            </div>

            <!-- WIDGET: Các bệnh thường gặp -->
            <div id="disease-widget" style="margin-top:40px; padding:20px; background:white; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(0,0,0,0.04);">

                <p style="
                    font-weight:700;
                    font-size:0.95rem;
                    margin-bottom:15px;
                    display:flex;
                    align-items:center;
                    gap:8px;
                    color:#334155;
                ">
                    <span class="material-icons-round" style="color:#3b82f6; font-size:18px;">health_and_safety</span>
                    Các bệnh thường gặp ở cá Koi
                </p>

                <div class="disease-grid">
                    <div class="disease-card">
                        <span class="material-icons-round disease-icon" style="color:#ef4444;">coronavirus</span>
                        <div class="disease-name">Nấm</div>
                        <div class="disease-note">Thường gặp khi nước lạnh &amp; dơ</div>
                    </div>

                    <div class="disease-card">
                        <span class="material-icons-round disease-icon" style="color:#f59e0b;">pest_control</span>
                        <div class="disease-name">Ký sinh trùng</div>
                        <div class="disease-note">Cá cọ mình, bơi bất thường</div>
                    </div>

                    <div class="disease-card">
                        <span class="material-icons-round disease-icon" style="color:#3b82f6;">water_damage</span>
                        <div class="disease-name">Xuất huyết</div>
                        <div class="disease-note">Đỏ vây, đỏ thân, stress nước</div>
                    </div>

                    <div class="disease-card">
                        <span class="material-icons-round disease-icon" style="color:#10b981;">healing</span>
                        <div class="disease-name">Thối vây</div>
                        <div class="disease-note">Vi khuẩn tấn công mô vây</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- Biến global cho JS (AJAX sẽ cập nhật) -->
<script>
    window.detectedDiseases = [];
    window.analysisResult = {};
</script>
<script src="/HeThongChamSocCaKoi/assets/js/ai-detect/health-check.js"></script>

<!-- Gemini Overlay -->
<div id="gemini-overlay" class="gemini-overlay">
    <div class="gemini-loading-box">
        <div class="glow-icon">✨</div>
        <p class="loading-title">Đang lập phác đồ điều trị...</p>

        <div class="typing-dots-3">
            <div></div><div></div><div></div>
        </div>
    </div>
</div>

<!-- Custom Modal Overlay -->
<div id="custom-modal-overlay" class="custom-modal-overlay"
     onclick="if(event.target.id === 'custom-modal-overlay') closeModal('custom-modal-overlay')">
    <div class="custom-modal-box">
        <div id="modal-icon-bg" class="modal-icon-wrapper error">
            <span id="modal-icon" class="material-icons-round">error</span>
        </div>
        <div id="modal-title" class="modal-title">Lỗi!</div>
        <div id="modal-message" class="modal-message">Nội dung thông báo tùy chỉnh.</div>
        <div id="modal-actions" class="modal-actions">
            <!-- Buttons được render bởi JS -->
        </div>
    </div>
</div>

<!-- Select Fish Modal -->
<div id="select-fish-modal" class="custom-modal-overlay"
     onclick="if(event.target.id === 'select-fish-modal') closeModal('select-fish-modal')">
    <div class="custom-modal-box" style="max-width: 550px; text-align: left; padding: 0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px 24px; color: white;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.2rem;">
                <span class="material-icons-round">🐟</span> 
                Chọn Cá Koi Để Khám
            </h3>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.9rem; font-weight: 400;">
                Kết quả phân tích sẽ được lưu vào hồ sơ bệnh án của cá
            </p>
        </div>
        
        <div id="fish-list-container"
             style="max-height: 400px; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <!-- Fish options loaded by JS -->
        </div>
        
        <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
            <button onclick="closeModal('select-fish-modal')" 
                    style="width: 100%; padding: 12px 24px; border: 2px solid #e2e8f0; background: white; color: #64748b; 
                           border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.95rem;
                           display: flex; align-items: center; justify-content: center; gap: 8px;"
                    onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1'; this.style.color='#475569';"
                    onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0'; this.style.color='#64748b';">
                <span class="material-icons-round" style="font-size: 20px;">close</span>
                Đóng
            </button>
        </div>
    </div>
</div>

<style>
    /* Style for Select Fish Modal options */
    .fish-option {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 14px 16px;
        border-radius: 12px;
        background: white;
        border: 2px solid #e2e8f0;
        cursor: pointer;
        transition: all 0.2s;
    }
    .fish-option:hover {
        background: #eff6ff;
        border-color: #3b82f6;
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    .fish-option img {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e2e8f0;
    }
    .fish-option .fish-info {
        flex: 1;
    }
    .fish-option .fish-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 1rem;
        margin-bottom: 2px;
    }
    .fish-option .fish-status {
        font-size: 0.85rem;
        color: #64748b;
    }
    .fish-option .check-icon {
        color: #3b82f6;
        font-size: 24px;
    }
    
    /* Empty state for fish list */
    .fish-list-empty {
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
    }
    .fish-list-empty .material-icons-round {
        font-size: 64px;
        opacity: 0.3;
        margin-bottom: 12px;
    }
    .fish-list-empty p {
        margin: 0;
        font-size: 0.95rem;
    }
</style>

</body>
</html>