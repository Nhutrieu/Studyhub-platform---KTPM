<?php
// /HeThongChamSocCaKoi/frontend/customer/salt.php
// VERSION: V9.2 - FIXED UI & SYNC WITH FEEDING

require_once '../../includes/check_login.php';
session_start();
if (!isset($_SESSION['username'])) { 
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php"); 
    exit; 
}
$page_title = "Tính muối & Điều trị (Expert System)";
$active_menu = 'salt';
include '../../includes/header.php';
?>

<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Material+Icons&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/salt.css?v=9.2">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/salt-expert.css">

<div class="main-content">
    <!-- Expert System Header -->
    <div class="expert-header" style="background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
            <span class="material-icons">science</span>
            Hệ thống tính muối Expert
        </h1>
        <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">
            Hệ thống thông minh với kiểm tra an toàn sinh học và vòng lặp phản hồi
        </div>
    </div>
    
    <!-- Main Grid -->
    <div class="salt-grid">
        <!-- LEFT PANEL: INPUT & CONTROLS -->
        <section class="salt-card">
            <div class="salt-card__header">
                <h3><span class="material-icons" style="color:var(--primary)">settings</span> Điều khiển hệ thống</h3>
            </div>

            <div class="salt-body" style="padding: 20px;">
                <div class="salt-row">
                    <div class="salt-field">
                        <label>Chọn hồ cá</label>
                        <select id="pond-select" class="form-control"></select>
                    </div>
                    <div class="salt-field">
                        <label>Chế độ tự động</label>
                        <select id="auto-open" class="form-control">
                            <option value="yes">Bật (Expert Mode)</option>
                            <option value="no">Tắt</option>
                        </select>
                    </div>
                </div>

                <div id="pond-brief" class="pond-brief" style="display:none;">
                    <img id="pond-img" src="/HeThongChamSocCaKoi/assets/images/no-pond.jpg" alt="pond">
                    <div>
                        <div id="pond-name" class="pond-brief__name">Hồ</div>
                        <div class="pond-brief__sub" id="pond-info">--</div>
                    </div>
                </div>

                <div class="actions-center" style="margin-top:20px;">
                    <button id="btn-open-planner" class="btn btn-primary" style="width:100%;">
                        <span class="material-icons">add_chart</span> Lập kế hoạch Expert
                    </button>
                    <button id="btn-refresh-plans" class="btn btn-outline" style="width:100%; margin-top:10px;">
                        <span class="material-icons">sync</span> Cập nhật dữ liệu
                    </button>
                </div>
                
                <!-- Safety Guidelines -->
                <div class="expert-warning-box expert-warning-box--info" style="margin-top:20px;">
                    <div class="expert-warning-header">
                        <span class="material-icons">shield</span>
                        Quy tắc an toàn sinh học
                    </div>
                    <div class="expert-warning-content">
                        <ul style="margin:0; padding-left:20px;">
                            <li><strong>Ngưỡng tử vong:</strong> &gt; 0.7% (Tuyệt đối không vượt)</li>
                            <li><strong>Cảnh báo oxy:</strong> &gt; 0.3% cần sục khí mạnh</li>
                            <li><strong>Cá con:</strong> Tối đa 0.15%</li>
                            <li><strong>Cây thủy sinh:</strong> Tối đa 0.10%</li>
                            <li><strong>Tăng an toàn:</strong> ≤ 0.2%/bước</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- RIGHT PANEL: ACTIVE PLANS (Always visible by default) -->
        <section class="salt-card salt-right" id="salt-right-panel">
            <div class="salt-card__header" style="display:flex; justify-content:space-between;">
                <h3>📋 Kế hoạch đang chạy</h3>
                <button id="btn-open-history" class="btn btn-sm btn-outline">
                    <span class="material-icons">history</span> Lịch sử
                </button>
            </div>
            <div id="salt-plans-mini" class="plans-mini" style="padding:15px;">
                <div class="hint text-center">Đang tải dữ liệu...</div>
            </div>
        </section>
    </div>
</div>

<!-- ================= MODALS ================= -->

<!-- 1. PLANNER MODAL -->
<div id="salt-planner-modal" class="salt-modal">
  <div class="salt-modal__backdrop" data-close="1"></div>
  <div class="salt-modal__content">
    <div class="salt-modal__header">
      <h3><span class="material-icons">science</span> Thiết lập thông số Expert</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="salt-modal__body">
      <div class="form-grid">
        <label>
          Mục đích sử dụng
          <select id="plan-mode" class="form-control">
            <option value="maintenance">Duy trì (0.10–0.20%)</option>
            <option value="anti_nitrite">Khử độc Nitrite (0.20–0.30%)</option>
            <option value="treatment">Điều trị bệnh (0.30–0.50%)</option>
            <option value="intensive">Điều trị tích cực (0.40–0.50%)</option>
          </select>
        </label>
        
        <label>
          Độ mặn mục tiêu (%)
          <input id="target-salinity" type="number" step="0.01" min="0" max="0.7" placeholder="0.15">
          <div class="small-hint">
            Ngưỡng an toàn: ≤ 0.7%
          </div>
        </label>
        
        <label>
          Độ mặn hiện tại (%)
          <input id="current-salinity" type="number" step="0.01" min="0" placeholder="0.00">
        </label>
        
        <label>
          Thể tích hồ (Lít)
          <input id="pond-volume" type="number" step="1" min="0" placeholder="1000">
        </label>

        <!-- Source Water Field (Conditional) -->
        <div class="source-water-field hidden">
          <label style="color:var(--primary); font-weight:600;">
            <span class="material-icons">water_drop</span>
            Độ mặn nước nguồn cấp vào (%)
          </label>
          <input id="source-salinity" type="number" step="0.01" min="0" value="0" class="form-control">
          <div class="small-hint">
            Chỉ cần thiết khi giảm độ mặn bằng cách thay nước
          </div>
        </div>
        
        <label>
          Đối tượng nhạy cảm
          <select id="fragile" class="form-control">
            <option value="none">Cá trưởng thành (Khỏe)</option>
            <option value="fry">Có cá con (Tosai/Fry)</option>
            <option value="plants">Có cây thủy sinh</option>
            <option value="fry_plants">Có cả cá con & cây thủy sinh</option>
          </select>
        </label>
        
        <label style="grid-column:1/-1">
          Ghi chú kế hoạch
          <textarea id="plan-note" class="form-control" rows="3" placeholder="Ghi chú thêm..."></textarea>
        </label>
      </div>

      <div class="expert-warning-box expert-warning-box--warning" style="margin-top:15px;">
          <div class="expert-warning-header">
              <span class="material-icons">warning</span>
              Lưu ý an toàn
          </div>
          <div class="expert-warning-content">
              <ul style="margin:0; padding-left:20px;">
                  <li>Hệ thống tự động áp dụng giới hạn an toàn sinh học</li>
                  <li>Độ mặn > 0.3%: Bắt buộc sục khí mạnh</li>
                  <li>Mỗi bước tăng tối đa 0.2%</li>
                  <li>Kết quả chỉ mang tính tham khảo</li>
              </ul>
          </div>
      </div>

      <div class="actions-center" style="margin-top:20px;">
        <button id="btn-calc-salt" class="btn btn-primary" style="width:100%;">
          <span class="material-icons">calculate</span> Phân tích Expert
        </button>
      </div>
    </div>
  </div>
</div>

<!-- 2. RESULT MODAL -->
<div id="salt-result-modal" class="salt-modal">
  <div class="salt-modal__backdrop" data-close="1"></div>
  <div class="salt-modal__content">
    <div class="salt-modal__header">
      <h3><span class="material-icons">analytics</span> Kết quả phân tích Expert</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="salt-modal__body">
      <div id="salt-result-body">
        <div style="text-align:center; padding:40px 20px;">
          <div class="spinner"></div>
          <div class="hint">Đang phân tích an toàn sinh học...</div>
        </div>
      </div>
    </div>
    <div class="salt-modal__footer salt-modal__footer--single">
      <button class="btn btn-outline" data-close="1">Quay lại</button>
      <button id="btn-save-plan-2" class="btn btn-success" disabled>
        <span class="material-icons">save</span> Kích hoạt quy trình
      </button>
    </div>
  </div>
</div>

<!-- 3. DETAIL MODAL -->
<div id="salt-detail-modal" class="salt-modal">
  <div class="salt-modal__backdrop" data-close="1"></div>
  <div class="salt-modal__content">
    <div class="salt-modal__header">
      <h3><span class="material-icons">list_alt</span> Chi tiết thực hiện</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="salt-modal__body" id="salt-detail-body">
      <div class="hint">Đang tải chi tiết...</div>
    </div>
    <div class="salt-modal__footer salt-modal__footer--single">
      <button id="btn-done-all" class="btn btn-success" style="width:100%;">
        <span class="material-icons">done_all</span> Đánh dấu hoàn tất toàn bộ
      </button>
    </div>
  </div>
</div>

<!-- 4. HISTORY MODAL -->
<div id="salt-history-modal" class="salt-modal">
  <div class="salt-modal__backdrop" data-close="1"></div>
  <div class="salt-modal__content">
    <div class="salt-modal__header">
      <h3><span class="material-icons">history</span> Lịch sử hoạt động</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="salt-modal__body" id="salt-history-list">
      <div class="hint">Đang tải lịch sử...</div>
    </div>
  </div>
</div>

<!-- 5. NOTIFY MODAL -->
<div id="notify-modal" class="salt-modal alert-modal">
  <div class="salt-modal__backdrop" data-close="1"></div>
  <div class="salt-modal__content">
    <div class="salt-modal__header">
      <h3 id="notify-title">Xác nhận</h3>
      <button class="modal-close" data-close="1">×</button>
    </div>
    <div class="salt-modal__body" id="notify-message">-</div>
    <div class="salt-modal__footer">
      <button class="btn btn-outline" data-close="1">Hủy</button>
      <button class="btn btn-primary" id="notify-confirm">Xác nhận</button>
    </div>
  </div>
</div>

<!-- JavaScript -->
<script src="/HeThongChamSocCaKoi/assets/js/customer/salt.js?v=9.2"></script>

<script>
// Custom confirm function
function showConfirm(message, onConfirm, title = 'Xác nhận') {
  const modal = document.getElementById('notify-modal');
  const titleEl = document.getElementById('notify-title');
  const messageEl = document.getElementById('notify-message');
  const confirmBtn = document.getElementById('notify-confirm');
  
  titleEl.textContent = title;
  messageEl.innerHTML = message;
  
  modal.classList.add('show');
  
  const closeModal = () => {
    modal.classList.remove('show');
    confirmBtn.removeEventListener('click', handleConfirm);
    modal.querySelector('[data-close="1"]').removeEventListener('click', closeModal);
  };
  
  const handleConfirm = () => {
    closeModal();
    onConfirm?.();
  };
  
  confirmBtn.addEventListener('click', handleConfirm, { once: true });
  modal.querySelector('[data-close="1"]').addEventListener('click', closeModal, { once: true });
}

// Make available globally
window.showConfirm = showConfirm;
</script>

<?php include '../../includes/footer.php'; ?>