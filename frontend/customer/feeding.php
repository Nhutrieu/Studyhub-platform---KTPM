<?php
require_once '../../includes/check_login.php';
session_start();
if (!isset($_SESSION['username'])) {
  header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
  exit;
}
$page_title   = "Tính thức ăn";
$active_menu  = 'feeding';
include '../../includes/header.php';
?>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Material+Icons&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/feeding.css?v=2">
<div class="main-content">
    <!-- Expert System Header -->
    <div class="expert-header" style="background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
            <span class="material-icons">science</span>
            Hệ thống tính thức ăn Expert
        </h1>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">
            Hệ thống thông minh với kiểm tra an toàn sinh học và vòng lặp phản hồi
        </div>
    </div>
<div class="main-content">
  <div class="feed-grid">
    <!-- Cột trái -->
    <section class="feed-card">
      <div class="feed-card__header">
        <h3>🍽️ Tính & lập kế hoạch cho ăn</h3>
      </div>

      <div class="feed-row">
        <div class="feed-field">
          <label>Chọn hồ</label>
          <select id="pond-select"></select>
        </div>
        <div class="feed-field">
          <label>Tự mở bộ tính khi vào trang</label>
          <select id="auto-open">
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </div>
      </div>

      <div id="pond-brief" class="pond-brief" style="display:none;">
        <img id="pond-img" src="/HeThongChamSocCaKoi/assets/images/no-pond.jpg" alt="pond">
        <div>
          <div id="pond-name" class="pond-brief__name">Hồ</div>
          <div class="pond-brief__sub" id="pond-info">Số cá: -, thể tích: -</div>
        </div>
      </div>

      <div class="actions-center">
        <button id="btn-open-planner" class="btn btn-primary">
          <span class="material-icons">calculate</span> Mở bộ tính thức ăn
        </button>
        <button id="btn-refresh-plans" class="btn btn-outline">
          <span class="material-icons">list_alt</span> Kế hoạch đang chạy
        </button>
      </div>

      <p class="hint">
        Lưu ý: lượng thức ăn phụ thuộc trọng lượng, nhiệt độ, và mục tiêu (tăng trưởng, duy trì, phục hồi).
      </p>
    </section>

    <!-- Cột phải -->
    <section class="feed-card feed-right" id="feed-right-panel">
      <div class="feed-card__header">
        <h3>📋 Kế hoạch đang chạy</h3>
        <button id="btn-open-history" class="btn btn-outline" title="Lịch sử">
          <span class="material-icons">history</span>
        </button>
      </div>
      <div id="feed-plans-mini" class="plans-mini"></div>
    </section>
  </div>
</div>

<!-- Modal bộ tính -->
<div id="feed-planner-modal" class="feed-modal">
  <div class="feed-modal__backdrop" data-close="1"></div>
  <div class="feed-modal__content">
    <div class="feed-modal__header">
      <h3>Bộ tính & lập kế hoạch cho ăn</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="feed-modal__body">
      <div class="form-grid">
        <label>Mục tiêu
          <select id="feed-objective">
            <option value="growth">Tăng trưởng</option>
            <option value="maintenance">Duy trì</option>
            <option value="color">Lên màu</option>
            <option value="recovery">Phục hồi</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </label>

        <!-- === CHẾ ĐỘ TÍNH: AI / MANUAL PRO === -->
        <label style="grid-column:1/-1">Chế độ tính
          <div class="mode-row">
            <label class="mode-pill">
              <input type="radio" name="calc-mode" value="ai" checked> AI
            </label>
            <label class="mode-pill">
              <input type="radio" name="calc-mode" value="manual"> Manual Pro
            </label>
          </div>
        </label>

        <!-- === PANEL MANUAL PRO (ẨN/HIỆN THEO RADIO) === -->
        <div id="manual-rate-wrap" class="hidden" style="grid-column:1/-1;border-radius:10px;padding:10px;margin-top:4px;background:#f8fafc;border:1px dashed var(--line-soft);">
          <div style="font-weight:500;margin-bottom:6px;">Manual Pro – bạn tự định nghĩa khẩu phần</div>

          <div class="feed-row" style="margin-bottom:6px;">
            <div class="feed-field" style="margin:0;">
              <label>Kiểu nhập khẩu phần</label>
              <select id="manual-source">
                <option value="percent">% trọng lượng / ngày</option>
                <option value="per_fish">Gram / con / ngày</option>
                <option value="total_grams">Tổng gram / ngày</option>
              </select>
            </div>
            <div class="feed-field" style="margin:0;">
              <label id="manual-input-label">% tỷ lệ cho ăn (/ngày)</label>
              <input id="manual-value" type="number" step="0.1" placeholder="2.0">
              <div id="manual-input-hint" class="small-hint">
                Ví dụ 1.5–2.5% trọng lượng/ngày cho koi khoẻ. Hệ thống sẽ clamp trong khoảng an toàn 0–3%.
              </div>
            </div>
          </div>

          <div class="feed-field" style="margin-top:4px;">
            <label>Chia số cữ trong ngày</label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <select id="manual-meals-count" style="max-width:90px;">
                <option value="2">2 cữ</option>
                <option value="3" selected>3 cữ</option>
                <option value="4">4 cữ</option>
              </select>
              <select id="manual-meals-preset">
                <option value="grow">Preset: tăng trưởng (40–30–30)</option>
                <option value="color">Preset: lên màu (35–25–40)</option>
                <option value="even">Preset: chia đều</option>
                <option value="custom">Tự chỉnh tỉ lệ</option>
              </select>
            </div>
          </div>

          <div id="manual-meals-config" style="margin-top:6px;"></div>
        </div>

        <label>% Protein trong thức ăn
          <input id="protein-pct" type="number" step="0.1" placeholder="35">
        </label>
        <label>Nhiệt độ nước (°C)
          <input id="water-temp" type="number" step="0.1" placeholder="0">
        </label>
        <label>Trọng lượng trung bình (kg)
          <input id="avg-weight" type="number" step="0.01" placeholder="0.35">
        </label>
        <label>Số lượng cá
          <input id="fish-count" type="number" step="1" placeholder="20">
        </label>
        <label style="grid-column:1/-1">
          Ghi chú
          <textarea id="feed-note" rows="2" placeholder="Ghi chú thêm..."></textarea>
        </label>
      </div>

      <div class="actions-center">
        <button id="btn-calc-feed" class="btn btn-primary">
          <span class="material-icons">calculate</span> Tính lượng thức ăn
        </button>
      </div>

      <div id="feed-preview" style="margin-top:10px"></div>
    </div>
  </div>
</div>

<!-- Modal kết quả kế hoạch -->
<div id="feed-result-modal" class="feed-modal">
  <div class="feed-modal__backdrop" data-close="1"></div>
  <div class="feed-modal__content">
    <div class="feed-modal__header">
      <h3>Kế hoạch cho ăn</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="feed-modal__body" id="feed-result-body">
      <div style="text-align:center">
        <div class="spinner"></div>
        <div class="hint">Đang tính toán...</div>
      </div>
    </div>
    <div class="feed-modal__footer feed-modal__footer--single">
      <button id="btn-save-plan" class="btn btn-success">
        <span class="material-icons">save</span> Lưu kế hoạch
      </button>
    </div>
  </div>
</div>

<!-- Modal chi tiết kế hoạch -->
<div id="feed-detail-modal" class="feed-modal">
  <div class="feed-modal__backdrop" data-close="1"></div>
  <div class="feed-modal__content">
    <div class="feed-modal__header">
      <h3>Chi tiết kế hoạch cho ăn</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="feed-modal__body" id="feed-detail-body">
      <div class="hint">Đang tải chi tiết...</div>
    </div>
    <div class="feed-modal__footer feed-modal__footer--single">
      <button id="btn-done-all" class="btn btn-outline-gray">Đánh dấu hoàn thành tất cả</button>
    </div>
  </div>
</div>

<!-- Modal lịch sử -->
<div id="feed-history-modal" class="feed-modal">
  <div class="feed-modal__backdrop" data-close="1"></div>
  <div class="feed-modal__content">
    <div class="feed-modal__header">
      <h3>Lịch sử kế hoạch cho ăn</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="feed-modal__body" id="feed-history-list">
      <div class="hint">Đang tải lịch sử...</div>
    </div>
  </div>
</div>

<!-- Modal thông báo -->
<div id="notify-modal" class="feed-modal alert-modal">
  <div class="feed-modal__backdrop" data-close="1"></div>
  <div class="feed-modal__content">
    <div class="feed-modal__header">
      <h3 id="notify-title">Thông báo</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="feed-modal__body" id="notify-message">-</div>
    <div class="feed-modal__footer" id="notify-actions">
      <button class="btn btn-outline" data-close="1">Đóng</button>
    </div>
  </div>
</div>

<!-- jQuery phải đứng trước feeding.js -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/HeThongChamSocCaKoi/assets/js/customer/feeding.js?v=<?php echo time(); ?>"></script>
<?php include '../../includes/footer.php'; ?>
