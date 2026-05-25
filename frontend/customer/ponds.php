<?php
require_once '../../includes/check_login.php';

session_start();
if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}
$page_title = "Danh sách hồ cá Koi";
include '../../includes/header.php';
?>

<!-- Load Fonts & Styles -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/pond.css">

<!-- TOAST CONTAINER -->
<div id="feed-toast"></div>

<div class="main-content">
  <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
    <!-- JS sẽ render Header và Grid vào đây -->
    <div id="ponds-table">
        <div style="text-align:center; padding:50px;">
            <span class="material-icons" style="font-size:40px; color:#cbd5e1; animation:spin 1s infinite linear">sync</span>
        </div>
    </div>
  </div>
</div>

<!-- CONFIRM MODAL (Styled like Feeding) -->
<div class="feed-modal" id="confirm-modal">
    <div class="feed-modal__backdrop" onclick="closeModal('confirm-modal')"></div>
    <div class="feed-modal__content" style="width: 400px;">
        <div class="feed-modal__header">
            <h3>XÁC NHẬN</h3>
            <button class="modal-close" onclick="closeModal('confirm-modal')">&times;</button>
        </div>
        <div class="feed-modal__body">
            <p id="confirm-msg" style="font-size: 15px; color: var(--ink); line-height: 1.5;">Nội dung xác nhận...</p>
        </div>
        <div class="feed-modal__footer">
            <button class="btn btn-outline" onclick="closeModal('confirm-modal')">Hủy bỏ</button>
            <button class="btn btn-primary" id="confirm-btn-yes">Đồng ý</button>
        </div>
    </div>
</div>

<!-- ADD/EDIT FORM MODAL -->
<div class="feed-modal" id="pond-form-modal">
    <div class="feed-modal__backdrop" onclick="closeModal('pond-form-modal')"></div>
    <div class="feed-modal__content">
        <div class="feed-modal__header">
            <h3 id="pond-form-title">THÊM HỒ CÁ MỚI</h3>
            <button class="modal-close" onclick="closeModal('pond-form-modal')">&times;</button>
        </div>
        <div class="feed-modal__body">
            <form id="pond-form" enctype="multipart/form-data" class="form-grid">
                <input type="hidden" name="PondID">
                <input type="hidden" name="CurrentImageURL">
                <input type="hidden" name="CreatedAt">
                
                <div class="form-row">
                    <div class="form-field">
                        <label>Tên hồ <span class="required-star">*</span></label>
                        <input name="PondName" required placeholder="Nhập tên hồ (VD: Hồ sân vườn)">
                    </div>
                    <div class="form-field">
                        <label>Thể tích (m³) <span class="required-star">*</span></label>
                        <input name="Volume" type="number" step="0.01" min="0" required placeholder="0.00">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label>Độ sâu (m) <span class="required-star">*</span></label>
                        <input name="Depth" type="number" step="0.1" min="0" required placeholder="0.0">
                    </div>
                    <div class="form-field">
                        <label>Loại hồ</label>
                        <input name="Type" placeholder="VD: Xi măng, Kính...">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-field">
                        <label>Số Drain</label>
                        <input name="DrainCount" type="number" min="0" placeholder="0">
                    </div>
                    <div class="form-field">
                        <label>Số Skimmer</label>
                        <input name="SkimmerCount" type="number" min="0" placeholder="0">
                    </div>
                </div>

                <div class="form-field">
                    <label>Công suất bơm (l/h)</label>
                    <input name="PumpingCapacity" type="number" step="0.01" min="0" placeholder="0">
                </div>
                
                <div class="form-field">
                    <label>Ghi chú</label>
                    <textarea name="Notes" rows="3" placeholder="Ghi chú thêm..."></textarea>
                </div>

                <div class="form-field">
                    <label>Ảnh bìa</label>
                    <input type="file" name="ImageFile" accept="image/*">
                    <img id="pond-preview" src="" alt="Preview" style="width:100%; height:150px; object-fit:cover; border-radius:10px; margin-top:10px; display:none;">
                </div>
            </form>
        </div>
        <div class="feed-modal__footer">
            <button class="btn btn-outline" onclick="closeModal('pond-form-modal')">Hủy</button>
            <button class="btn btn-primary" id="btn-save-pond" onclick="document.getElementById('pond-form').dispatchEvent(new Event('submit'))">Lưu hồ cá</button>
        </div>
    </div>
</div>

<script src="/HeThongChamSocCaKoi/assets/js/customer/pond.js"></script>
<?php include '../../includes/footer.php'; ?>