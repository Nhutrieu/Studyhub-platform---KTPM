<?php
// frontend/admin/deposit_management.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

if ($_SESSION['role'] !== 'Admin') {
    header("Location: /");
    exit;
}

// XỬ LÝ FORM: PHẠT HOẶC TĂNG KÝ QUỸ
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $shopId = intval($_POST['shop_id']);
    $amount = floatval($_POST['amount']);
    $reason = trim($_POST['reason']);
    $action = $_POST['action'];

    if ($amount > 0 && !empty($reason)) {
        if ($action === 'penalty') {
            // 1. Trừ tiền (Phạt)
            $conn->query("UPDATE Users SET DepositBalance = DepositBalance - $amount WHERE UserID = $shopId");
            
            // Log transaction (Type = fee)
            $stmtLog = $conn->prepare("INSERT INTO ShopTransactions (UserID, Type, Amount, Description) VALUES (?, 'fee', ?, ?)");
            $desc = "Phạt vi phạm: " . $reason;
            $stmtLog->bind_param("ids", $shopId, $amount, $desc);
            $stmtLog->execute();
            
            $success = "Đã phạt Shop ID #$shopId số tiền " . number_format($amount) . "đ";

        } elseif ($action === 'increase') {
            // 2. Cộng tiền (Nạp quỹ)
            $conn->query("UPDATE Users SET DepositBalance = DepositBalance + $amount WHERE UserID = $shopId");
            
            // Log transaction (Type = income)
            $stmtLog = $conn->prepare("INSERT INTO ShopTransactions (UserID, Type, Amount, Description) VALUES (?, 'income', ?, ?)");
            $desc = "Admin nạp quỹ bảo đảm: " . $reason;
            $stmtLog->bind_param("ids", $shopId, $amount, $desc);
            $stmtLog->execute();
            
            $success = "Đã thêm " . number_format($amount) . "đ vào quỹ của Shop ID #$shopId";
        }
    } else {
        $error = "Vui lòng nhập số tiền và lý do hợp lệ.";
    }
}

// Lấy danh sách Shop có ký quỹ
$sql = "SELECT UserID, FullName, Email, Phone, DepositBalance, AccountBalance FROM Users WHERE Role = 'Shop' ORDER BY DepositBalance DESC";
$result = $conn->query($sql);

$page_title = "Quản lý Ký quỹ";
include '../../includes/header.php';
?>

<!-- Import FontAwesome -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

<div class="container" style="max-width: 1200px; margin: 40px auto; padding: 0 15px; font-family: system-ui, -apple-system, sans-serif;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="color:#1e293b; margin:0;">🛡️ Quản lý Quỹ Bảo Đảm (Shop Deposit)</h2>
        <a href="dashboard.php" style="text-decoration:none; padding:8px 16px; background:#64748b; color:white; border-radius:6px;">Quay lại Dashboard</a>
    </div>

    <?php if(isset($success)): ?>
        <div style="background:#dcfce7; color:#166534; padding:15px; border-radius:8px; margin-bottom:20px;">
            <i class="fa-solid fa-check-circle"></i> <?= $success ?>
        </div>
    <?php endif; ?>
    
    <?php if(isset($error)): ?>
        <div style="background:#fee2e2; color:#991b1b; padding:15px; border-radius:8px; margin-bottom:20px;">
            <i class="fa-solid fa-triangle-exclamation"></i> <?= $error ?>
        </div>
    <?php endif; ?>

    <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;">
                    <th style="padding:15px;">Shop Info</th>
                    <th style="padding:15px;">Liên hệ</th>
                    <th style="padding:15px;">Ví chính</th>
                    <th style="padding:15px; color:#7e22ce;">Quỹ bảo đảm</th>
                    <th style="padding:15px; text-align:right;">Hành động</th>
                </tr>
            </thead>
            <tbody>
                <?php while($row = $result->fetch_assoc()): ?>
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:15px;">
                        <div style="font-weight:600; color:#0f172a;"><?= htmlspecialchars($row['FullName']) ?></div>
                        <div style="font-size:0.85rem; color:#64748b;">ID: #<?= $row['UserID'] ?></div>
                    </td>
                    <td style="padding:15px; font-size:0.9rem;">
                        <div><i class="fa-regular fa-envelope"></i> <?= htmlspecialchars($row['Email']) ?></div>
                        <div style="margin-top:4px;"><i class="fa-solid fa-phone"></i> <?= htmlspecialchars($row['Phone']) ?></div>
                    </td>
                    <td style="padding:15px; font-weight:500;">
                        <?= number_format($row['AccountBalance'], 0, ',', '.') ?> đ
                    </td>
                    <td style="padding:15px;">
                        <span style="background:#f3e8ff; color:#7e22ce; padding:5px 10px; border-radius:6px; font-weight:700;">
                            <?= number_format($row['DepositBalance'], 0, ',', '.') ?> đ
                        </span>
                    </td>
                    <td style="padding:15px; text-align:right;">
                        <!-- Nút Nạp (Increase) -->
                        <button onclick="openIncreaseModal(<?= $row['UserID'] ?>, '<?= htmlspecialchars($row['FullName']) ?>')" 
                                style="background:#dcfce7; color:#166534; border:1px solid #86efac; padding:6px 12px; border-radius:6px; cursor:pointer; margin-right:5px;">
                            <i class="fa-solid fa-plus-circle"></i> Nạp
                        </button>

                        <!-- Nút Phạt (Penalty) -->
                        <?php if($row['DepositBalance'] > 0): ?>
                            <button onclick="openPenaltyModal(<?= $row['UserID'] ?>, '<?= htmlspecialchars($row['FullName']) ?>', <?= $row['DepositBalance'] ?>)" 
                                    style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; padding:6px 12px; border-radius:6px; cursor:pointer;">
                                <i class="fa-solid fa-gavel"></i> Phạt
                            </button>
                        <?php else: ?>
                            <button disabled style="background:#f1f5f9; color:#94a3b8; border:1px solid #e2e8f0; padding:6px 12px; border-radius:6px; cursor:not-allowed;">
                                <i class="fa-solid fa-gavel"></i> Phạt
                            </button>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal Phạt -->
<div id="penaltyModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
    <div style="background:white; padding:30px; border-radius:12px; width:400px; max-width:90%;">
        <h3 style="margin-top:0; color:#dc2626;">Phạt vi phạm Shop</h3>
        <p id="penaltyModalName" style="color:#64748b; margin-bottom:20px;"></p>
        
        <form method="POST">
            <input type="hidden" name="action" value="penalty">
            <input type="hidden" name="shop_id" id="penaltyModalShopId">
            
            <div style="margin-bottom:15px;">
                <label style="display:block; font-weight:500; margin-bottom:5px;">Số tiền phạt (VNĐ)</label>
                <input type="number" name="amount" id="penaltyModalMaxAmount" max="" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
                <small style="color:#64748b;">Tối đa: <span id="displayMax"></span> đ</small>
            </div>
            
            <div style="margin-bottom:20px;">
                <label style="display:block; font-weight:500; margin-bottom:5px;">Lý do phạt</label>
                <textarea name="reason" rows="3" required placeholder="VD: Bán hàng giả, gian lận..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit;"></textarea>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" onclick="closeModal('penaltyModal')" style="padding:10px 20px; border:none; background:#f1f5f9; cursor:pointer; border-radius:6px;">Hủy</button>
                <button type="submit" style="padding:10px 20px; border:none; background:#dc2626; color:white; font-weight:600; cursor:pointer; border-radius:6px;">Xác nhận phạt</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Nạp (Increase) -->
<div id="increaseModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; justify-content:center; align-items:center;">
    <div style="background:white; padding:30px; border-radius:12px; width:400px; max-width:90%;">
        <h3 style="margin-top:0; color:#166534;">Nạp quỹ bảo đảm</h3>
        <p id="increaseModalName" style="color:#64748b; margin-bottom:20px;"></p>
        
        <form method="POST">
            <input type="hidden" name="action" value="increase">
            <input type="hidden" name="shop_id" id="increaseModalShopId">
            
            <div style="margin-bottom:15px;">
                <label style="display:block; font-weight:500; margin-bottom:5px;">Số tiền nạp (VNĐ)</label>
                <input type="number" name="amount" required style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px;">
            </div>
            
            <div style="margin-bottom:20px;">
                <label style="display:block; font-weight:500; margin-bottom:5px;">Ghi chú / Lý do</label>
                <textarea name="reason" rows="3" required placeholder="VD: Nạp cọc ban đầu, thưởng..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit;"></textarea>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button type="button" onclick="closeModal('increaseModal')" style="padding:10px 20px; border:none; background:#f1f5f9; cursor:pointer; border-radius:6px;">Hủy</button>
                <button type="submit" style="padding:10px 20px; border:none; background:#16a34a; color:white; font-weight:600; cursor:pointer; border-radius:6px;">Xác nhận nạp</button>
            </div>
        </form>
    </div>
</div>

<script>
    function openPenaltyModal(id, name, balance) {
        document.getElementById('penaltyModal').style.display = 'flex';
        document.getElementById('penaltyModalShopId').value = id;
        document.getElementById('penaltyModalName').innerText = "Shop: " + name;
        document.getElementById('penaltyModalMaxAmount').max = balance;
        document.getElementById('displayMax').innerText = new Intl.NumberFormat().format(balance);
    }

    function openIncreaseModal(id, name) {
        document.getElementById('increaseModal').style.display = 'flex';
        document.getElementById('increaseModalShopId').value = id;
        document.getElementById('increaseModalName').innerText = "Shop: " + name;
    }
    
    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Đóng modal khi click ra ngoài
    window.onclick = function(event) {
        if (event.target.id === 'penaltyModal') {
            closeModal('penaltyModal');
        }
        if (event.target.id === 'increaseModal') {
            closeModal('increaseModal');
        }
    }
</script>

<?php include '../../includes/footer.php'; ?>