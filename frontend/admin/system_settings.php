<?php
// frontend/admin/system_settings.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

if ($_SESSION['role'] !== 'Admin') {
    header("Location: /");
    exit;
}

// XỬ LÝ LƯU CẤU HÌNH
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $settings = $_POST['settings']; // Array [key => value]
    
    foreach ($settings as $key => $value) {
        // Dùng INSERT ON DUPLICATE để an toàn
        $stmt = $conn->prepare("INSERT INTO SystemSettings (SettingKey, SettingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE SettingValue = ?");
        $stmt->bind_param("sss", $key, $value, $value);
        $stmt->execute();
    }
    $success = "Đã cập nhật cấu hình hệ thống thành công!";
}

// Lấy toàn bộ cấu hình
$result = $conn->query("SELECT * FROM SystemSettings");
$settings = [];
while ($row = $result->fetch_assoc()) {
    $settings[$row['SettingKey']] = $row;
}

$page_title = "Cấu hình hệ thống";
include '../../includes/header.php';
?>

<!-- Import FontAwesome -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<div class="container" style="max-width: 800px; margin: 40px auto; padding: 0 15px; font-family: system-ui, -apple-system, sans-serif;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="color:#1e293b; margin:0;">⚙️ Cấu hình Tham số Hệ thống</h2>
        <a href="dashboard.php" style="text-decoration:none; padding:8px 16px; background:#64748b; color:white; border-radius:6px;">Quay lại Dashboard</a>
    </div>

    <?php if(isset($success)): ?>
        <div style="background:#dcfce7; color:#166534; padding:15px; border-radius:8px; margin-bottom:20px;">
            <i class="fa-solid fa-check-circle"></i> <?= $success ?>
        </div>
    <?php endif; ?>

    <form method="POST" style="background:white; padding:30px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Nhóm Tài Chính -->
        <h3 style="color:#4f46e5; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-top:0;">
            <i class="fa-solid fa-coins"></i> Tài chính & Phí
        </h3>
        
        <div class="form-group" style="margin-bottom:20px;">
            <label style="display:block; font-weight:600; margin-bottom:8px;">Phí sàn mặc định (%)</label>
            <input type="number" step="0.01" name="settings[platform_fee_percent]" 
                   value="<?= htmlspecialchars($settings['platform_fee_percent']['SettingValue'] ?? '0.05') ?>" 
                   style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
            <small style="color:#64748b;">Phí này sẽ được áp dụng cho các đơn hàng mới.</small>
        </div>

        <div class="form-group" style="margin-bottom:20px;">
            <label style="display:block; font-weight:600; margin-bottom:8px;">Tỷ lệ phạt thua kiện (%)</label>
            <input type="number" step="0.01" name="settings[dispute_penalty_rate]" 
                   value="<?= htmlspecialchars($settings['dispute_penalty_rate']['SettingValue'] ?? '0.02') ?>" 
                   style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
            <small style="color:#64748b;">Số phần trăm giá trị đơn hàng Shop bị phạt nếu thua khiếu nại.</small>
        </div>

        <div class="form-group" style="margin-bottom:20px;">
            <label style="display:block; font-weight:600; margin-bottom:8px;">Tỷ lệ Đòn bẩy Ký quỹ (1:X)</label>
            <input type="number" step="1" name="settings[deposit_leverage_ratio]" 
                   value="<?= htmlspecialchars($settings['deposit_leverage_ratio']['SettingValue'] ?? '50') ?>" 
                   style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
            <small style="color:#64748b;">Ví dụ: 50 nghĩa là cọc 1 triệu bán được tối đa 50 triệu đơn hàng đang xử lý.</small>
        </div>

        <!-- Nhóm Vận hành -->
        <h3 style="color:#059669; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-top:30px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Vận hành
        </h3>

        <div class="form-group" style="margin-bottom:20px;">
            <label style="display:block; font-weight:600; margin-bottom:8px;">Tự động huỷ đơn treo sau (Ngày)</label>
            <input type="number" step="1" name="settings[auto_cancel_days]" 
                   value="<?= htmlspecialchars($settings['auto_cancel_days']['SettingValue'] ?? '3') ?>" 
                   style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
            <small style="color:#64748b;">Đơn hàng ở trạng thái chờ quá lâu sẽ tự huỷ.</small>
        </div>

        <div style="margin-top:30px; text-align:right;">
            <button type="submit" style="background:#4f46e5; color:white; padding:12px 30px; border:none; border-radius:8px; font-weight:600; cursor:pointer; box-shadow:0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                <i class="fa-solid fa-save"></i> Lưu Cấu Hình
            </button>
        </div>

    </form>
</div>

<?php include '../../includes/footer.php'; ?>