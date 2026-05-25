<?php
require_once '../../includes/check_login.php';
session_start();
if (!isset($_SESSION['username'])) {
  header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php"); exit;
}
$page_title = "Giám Sát Thông Minh (Expert)";
include '../../includes/header.php';
$active_menu = 'water';
?>

<!-- Libraries -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Material+Icons+Round&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<!-- CSS Premium -->
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/water_para.css?v=6.0">

<div class="water-expert-container">
    
    <!-- Top Header -->
    <div class="top-header">
        <div class="header-left">
            <h1>
                <span class="material-icons-round" style="color:var(--primary-500)">analytics</span>
                Trung Tâm Thông Số Nước
            </h1>
            <!-- Nút chọn hồ hiển thị tên -->
            <div class="current-pond-badge" onclick="openPondSelectModal()">
                <span class="material-icons-round" style="font-size:16px">water_drop</span>
                <span id="current-pond-name">Chọn hồ giám sát...</span>
                <span class="material-icons-round" style="font-size:16px; color:var(--text-muted)">expand_more</span>
            </div>
        </div>
        
        <div style="display:flex; gap:12px;">
            <button class="btn btn-outline" onclick="openPondSelectModal()">
                <span class="material-icons-round">swap_horiz</span> Đổi Hồ
            </button>
            <button class="btn btn-primary" onclick="openWaterForm('add')">
                <span class="material-icons-round">add</span> Ghi Chỉ Số
            </button>
        </div>
    </div>

    <!-- Main Content Root -->
    <div id="water-dashboard-root">
        <!-- Skeleton Loading -->
        <div class="hero-panel" style="height:300px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">
            <div class="spinner"></div>&nbsp; Đang khởi tạo hệ thống...
        </div>
    </div>

</div>

<!-- MODAL 1: CHỌN HỒ (GRID STYLE FIX) -->
<div id="pond-select-modal" class="custom-modal">
    <div class="modal-content" style="width:1000px; max-width:95%;">
        <div class="modal-header">
            <h3>Chọn Hồ Giám Sát</h3>
            <button class="modal-close" id="pond-modal-close">&times;</button>
        </div>
        <!-- Container cho Grid Hồ -->
        <div id="pond-card-list" class="pond-grid-container">
            <!-- JS sẽ điền Grid card hồ + Card dấu cộng vào đây -->
        </div>
    </div>
</div>

<!-- MODAL 2: FORM NHẬP LIỆU (CÓ CO2) -->
<div id="water-form-modal" class="custom-modal">
    <div class="modal-content" style="width:700px;">
        <div class="modal-header">
            <h3 id="water-form-title">Ghi Nhật Ký</h3>
            <button class="modal-close" onclick="closeWaterForm()">&times;</button>
        </div>
        <form id="water-form">
            <input type="hidden" name="ParameterID">
            
            <div class="form-group-row">
                <div><label class="form-label">pH</label><input name="pH" class="form-input" type="number" step="0.1" placeholder="7.5"></div>
                <div><label class="form-label">Nhiệt độ (°C)</label><input name="Temperature" class="form-input" type="number" step="0.1" placeholder="25"></div>
            </div>
            
            <div class="form-group-row">
                <div><label class="form-label" style="color:var(--danger-text)">NH3 (mg/L)</label><input name="Ammonia" class="form-input" type="number" step="0.01" style="background:#fff1f2; border-color:#fecaca;" placeholder="0.00"></div>
                <div><label class="form-label" style="color:var(--danger-text)">NO2 (mg/L)</label><input name="Nitrite" class="form-input" type="number" step="0.01" style="background:#fff1f2; border-color:#fecaca;" placeholder="0.00"></div>
            </div>
            
             <div class="form-group-row">
                <div><label class="form-label">Oxy (mg/L)</label><input name="Oxygen" class="form-input" type="number" step="0.1" placeholder="7.0"></div>
                <div><label class="form-label">Muối (%)</label><input name="Salt" class="form-input" type="number" step="0.01" placeholder="0.3"></div>
            </div>
            
            <div class="form-group-row">
                <div><label class="form-label">KH (dKH)</label><input name="CH" class="form-input" type="number" step="1" placeholder="6"></div>
                <div><label class="form-label">GH (dGH)</label><input name="GH" class="form-input" type="number" step="1" placeholder="10"></div>
            </div>
            
            <div class="form-group-row">
                <div><label class="form-label">NO3 (mg/L)</label><input name="Nitrate" class="form-input" type="number" step="1" placeholder="10"></div>
                <!-- ĐÃ THÊM INPUT CO2 VÀO FORM -->
                <div><label class="form-label">CO2 (mg/L)</label><input name="CO2" class="form-input" type="number" step="1" placeholder="15"></div>
            </div>
            
            <div class="form-group-row">
                <div><label class="form-label">Thời gian</label><input name="RecordedAt" class="form-input" type="datetime-local"></div>
            </div>
            
            <div style="margin-bottom:20px;">
                <label class="form-label">Ghi chú</label>
                <textarea name="Note" class="form-input" rows="2" placeholder="Tình trạng nước..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%">Lưu Dữ Liệu</button>
        </form>
    </div>
</div>

<script src="/HeThongChamSocCaKoi/assets/js/customer/water_para.js?v=6.0"></script>
<?php include '../../includes/footer.php'; ?>