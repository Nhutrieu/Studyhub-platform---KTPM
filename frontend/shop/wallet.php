<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\wallet.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Chỉ Shop/Admin được vào
if ($_SESSION['role'] !== 'Shop' && $_SESSION['role'] !== 'Admin') {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$userId = $_SESSION['userid'];

// Danh sách các ngân hàng lớn tại Việt Nam (Dùng cho Dropdown)
$vietnameseBanks = [
    '' => '--- Chọn Ngân hàng ---', // Placeholder option
    'Vietcombank' => 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    'VietinBank' => 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
    'BIDV' => 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
    'Agribank' => 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)',
    'Techcombank' => 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)',
    'MBBank' => 'Ngân hàng TMCP Quân đội (MBBank)',
    'ACB' => 'Ngân hàng TMCP Á Châu (ACB)',
    'VPBank' => 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)',
    'Sacombank' => 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)',
    'HDBank' => 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh (HDBank)',
    'TPBank' => 'Ngân hàng TMCP Tiên Phong (TPBank)',
    'VIB' => 'Ngân hàng TMCP Quốc tế Việt Nam (VIB)',
    'Eximbank' => 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam (Eximbank)',
    'SHB' => 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)',
    'MSB' => 'Ngân hàng TMCP Hàng Hải Việt Nam (MSB)',
    'SeABank' => 'Ngân hàng TMCP Đông Nam Á (SeABank)',
    'OCB' => 'Ngân hàng TMCP Phương Đông (OCB)',
    'LPBank' => 'Ngân hàng TMCP Bưu điện Liên Việt (LPBank)',
    'Nam A Bank' => 'Ngân hàng TMCP Nam Á',
    'VietBank' => 'Ngân hàng TMCP Việt Nam Thương Tín (VietBank)',
    'BaoVietBank' => 'Ngân hàng TMCP Bảo Việt',
    'PVcomBank' => 'Ngân hàng TMCP Đại Chúng Việt Nam (PVcomBank)',
    // Thêm các ngân hàng nước ngoài lớn tại VN nếu cần
    'HSBC' => 'Ngân hàng TNHH MTV HSBC (Việt Nam)',
    'Standard Chartered' => 'Ngân hàng Standard Chartered Bank (Việt Nam)',
    'Shinhan Bank' => 'Ngân hàng Shinhan Bank (Việt Nam)',
];


// Khởi tạo biến cho thông báo rút tiền
$withdrawal_message = '';
$withdrawal_status = ''; // 'success' hoặc 'error'
$pending_request = null;
$currentBalance = 0; // Khởi tạo trước

// ====================================================
// 1. Xử lý yêu cầu Rút tiền (Chỉ cho Shop)
// ====================================================
if ($_SESSION['role'] === 'Shop' && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_withdrawal'])) {
    $amount = filter_var($_POST['amount'] ?? 0, FILTER_VALIDATE_FLOAT);
    $bankName = trim($_POST['bank_name'] ?? '');
    $accountName = trim($_POST['account_name'] ?? '');
    $accountNumber = trim($_POST['account_number'] ?? '');

    // 1.1. Validation
    if ($amount <= 0 || $amount < 50000) { // Ví dụ: Rút tối thiểu 50k
        $withdrawal_message = "Số tiền rút không hợp lệ hoặc phải lớn hơn 50,000 đ.";
        $withdrawal_status = 'error';
    } elseif (empty($bankName) || empty($accountName) || empty($accountNumber)) {
        $withdrawal_message = "Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.";
        $withdrawal_status = 'error';
    } else {
        // 1.2. Kiểm tra số dư hiện tại (lấy lại số dư)
        $stmtBalanceCheck = $conn->prepare("SELECT AccountBalance FROM Users WHERE UserID = ?");
        $stmtBalanceCheck->bind_param("i", $userId);
        $stmtBalanceCheck->execute();
        $balanceCheckResult = $stmtBalanceCheck->get_result();
        $currentBalance = $balanceCheckResult->fetch_assoc()['AccountBalance'] ?? 0;
        $stmtBalanceCheck->close();

        if ($amount > $currentBalance) {
            $withdrawal_message = "Số dư khả dụng không đủ để thực hiện giao dịch này.";
            $withdrawal_status = 'error';
        } else {
            // 1.3. Kiểm tra yêu cầu rút tiền đang chờ
            $stmtPendingCheck = $conn->prepare("SELECT RequestID FROM WithdrawalRequests WHERE UserID = ? AND Status = 'Pending'");
            $stmtPendingCheck->bind_param("i", $userId);
            $stmtPendingCheck->execute();
            if ($stmtPendingCheck->get_result()->num_rows > 0) {
                $withdrawal_message = "Bạn đã có yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi Admin duyệt trước khi gửi yêu cầu mới.";
                $withdrawal_status = 'error';
            } else {
                // 1.4. Chèn yêu cầu rút tiền vào DB
                // Lấy Tên đầy đủ ngân hàng để lưu vào DB (dễ nhìn hơn)
                $fullBankName = $vietnameseBanks[$bankName] ?? $bankName; 

                $stmtInsert = $conn->prepare("
                    INSERT INTO WithdrawalRequests (UserID, Amount, BankName, AccountName, AccountNumber, Status)
                    VALUES (?, ?, ?, ?, ?, 'Pending')
                ");
                // Chú ý: dùng $fullBankName để lưu, nhưng vẫn đảm bảo $bankName không rỗng
                $stmtInsert->bind_param("idsss", $userId, $amount, $fullBankName, $accountName, $accountNumber);
                
                if ($stmtInsert->execute()) {
                    $withdrawal_message = "Yêu cầu rút tiền <strong>" . number_format($amount, 0, ',', '.') . " đ</strong> đã được gửi thành công. Admin sẽ xử lý trong vòng 24 giờ.";
                    $withdrawal_status = 'success';
                } else {
                    $withdrawal_message = "Lỗi hệ thống khi gửi yêu cầu. Vui lòng thử lại sau. (" . $stmtInsert->error . ")";
                    $withdrawal_status = 'error';
                }
                $stmtInsert->close();
            }
            $stmtPendingCheck->close();
        }
    }
}


// 2. Lấy thông tin số dư hiện tại VÀ số dư ký quỹ
// Đã thêm DepositBalance vào câu lệnh SELECT
$stmtUser = $conn->prepare("SELECT FullName, AccountBalance, DepositBalance FROM Users WHERE UserID = ?");
$stmtUser->bind_param("i", $userId);
$stmtUser->execute();
$user = $stmtUser->get_result()->fetch_assoc();
$stmtUser->close();
$currentBalance = $user['AccountBalance'] ?? 0; // Cập nhật lại số dư sau khi POST

// Lấy yêu cầu rút tiền đang chờ (chỉ cho Shop/Admin)
$stmtPending = $conn->prepare("
    SELECT Amount, RequestedAt FROM WithdrawalRequests 
    WHERE UserID = ? 
    AND Status = 'Pending' 
    ORDER BY RequestedAt DESC LIMIT 1
");
$stmtPending->bind_param("i", $userId);
$stmtPending->execute();
$pending_result = $stmtPending->get_result();
$pending_request = $pending_result->fetch_assoc();
$stmtPending->close();


// 3. Lấy lịch sử giao dịch (Mới nhất lên đầu)
$stmtTrans = $conn->prepare("
    SELECT * FROM ShopTransactions 
    WHERE UserID = ? 
    ORDER BY CreatedAt DESC
");
$stmtTrans->bind_param("i", $userId);
$stmtTrans->execute();
$transactions = $stmtTrans->get_result(); 
?>

<?php 
$page_title = "Ví của Shop";
include '../../includes/header.php';
?>

<style>
    .wallet-container { max-width: 1000px; margin: 40px auto; padding: 0 15px; font-family: system-ui, -apple-system, sans-serif; }
    
    /* Custom Alert */
    .custom-alert {
        padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.95rem;
        display: flex; align-items: center; gap: 10px;
    }
    .alert-success { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-error { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-icon { font-size: 1.2rem; }
    
    /* Layout Grid cho 2 loại ví */
    .balance-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
    }
    
    @media (max-width: 768px) {
        .balance-grid { grid-template-columns: 1fr; }
    }

    /* Style chung cho Card */
    .balance-card {
        color: white;
        padding: 25px;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 180px;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s;
        box-shadow: 0 5px 15px -5px rgba(0, 0, 0, 0.2);
    }
    .balance-card:hover { transform: translateY(-5px); }

    /* Card Số dư khả dụng (Xanh) */
    .card-available {
        background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
    }

    /* Card Ký quỹ (Tím/Hồng) */
    .card-deposit {
        background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);
    }

    .balance-label { font-size: 0.95rem; opacity: 0.9; font-weight: 500; display: flex; align-items: center; gap: 8px; }
    .balance-amount { font-size: 2.2rem; font-weight: 700; margin: 15px 0; letter-spacing: -1px; }
    
    .card-actions { margin-top: auto; }
    
    .btn-wallet {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.4);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
        display: inline-block;
        font-size: 0.9rem;
        /* Thêm style cho nút bị disable */
        opacity: 1; /* Override default opacity */
    }
    .btn-wallet:hover:not(:disabled) { background: rgba(255,255,255,0.35); }
    .btn-wallet:disabled {
        cursor: not-allowed;
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
    }

    /* Icon trang trí nền */
    .bg-icon {
        position: absolute;
        right: -20px;
        bottom: -20px;
        font-size: 8rem;
        opacity: 0.1;
        pointer-events: none;
    }

    /* Yêu cầu rút tiền đang chờ */
    .pending-withdrawal {
        background-color: #fffbe6; color: #d97706; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; margin-top: 15px;
        font-size: 0.9rem; margin-bottom: 25px;
        display: flex; align-items: center; gap: 10px;
    }
    .pending-withdrawal strong { font-weight: 700; }

    /* Lịch sử giao dịch */
    .history-section h3 { color: #334155; margin-bottom: 15px; font-size: 1.2rem; }
    .trans-list { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .trans-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #f1f5f9;
        transition: 0.1s;
    }
    .trans-item:last-child { border-bottom: none; }
    .trans-item:hover { background-color: #f8fafc; }

    .trans-icon {
        width: 45px; height: 45px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
        margin-right: 15px;
        flex-shrink: 0;
    }
    .icon-income { background: #dcfce7; color: #16a34a; }   /* Xanh lá - Tiền vào */
    .icon-fee { background: #fee2e2; color: #dc2626; }      /* Đỏ - Phí sàn */
    .icon-withdraw { background: #bfdbfe; color: #1d4ed8; } /* Xanh dương - Rút tiền */

    .trans-details { flex: 1; }
    .trans-desc { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .trans-date { font-size: 0.85rem; color: #64748b; }
    
    .trans-amount { font-weight: 700; font-size: 1.1rem; }
    .amount-plus { color: #16a34a; }
    .amount-minus { color: #dc2626; }
    
    /* Modal Styles */
    .modal {
        display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%;
        overflow: auto; background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
        background-color: #fefefe; margin: 10% auto; padding: 30px; border: 1px solid #888;
        width: 90%; max-width: 500px; border-radius: 12px; position: relative;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; }
    .close:hover, .close:focus { color: black; text-decoration: none; cursor: pointer; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
    .form-group input, .form-group select { 
        width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; 
    }
    .btn-submit { background-color: #3b82f6; color: white; padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-weight: 600; }
    .btn-submit:hover { background-color: #2563eb; }
</style>

<div class="wallet-container">
    <h2 style="color: #1f2937;">Xin chào Shop: <?= htmlspecialchars($user['FullName']) ?></h2>
    
    <?php if ($withdrawal_message): ?>
        <div class="custom-alert alert-<?= $withdrawal_status ?>">
            <span class="alert-icon">
                <i class="fa-solid fa-<?= $withdrawal_status === 'success' ? 'circle-check' : 'circle-xmark' ?>"></i>
            </span>
            <p style="margin:0;"><?= $withdrawal_message ?></p>
        </div>
    <?php endif; ?>

    <div class="balance-grid">
        <!-- Card 1: Số dư khả dụng -->
        <div class="balance-card card-available">
            <div class="bg-icon">💸</div>
            <div>
                <div class="balance-label">
                    <i class="fas fa-wallet"></i> Số dư khả dụng
                </div>
                <div class="balance-amount">
                    <?= number_format($currentBalance, 0, ',', '.') ?> đ
                </div>
            </div>
            <div class="card-actions">
                <button onclick="showWithdrawalModal()" 
                        class="btn-wallet" 
                        <?= $currentBalance < 50000 || $pending_request ? 'disabled' : '' ?>
                >
                    <i class="fas fa-arrow-down"></i> Rút tiền về NH
                </button>
            </div>
        </div>

        <!-- Card 2: Tiền ký quỹ -->
        <div class="balance-card card-deposit">
            <div class="bg-icon">🛡️</div>
            <div>
                <div class="balance-label">
                    <i class="fas fa-shield-alt"></i> Quỹ bảo đảm (Ký quỹ)
                </div>
                <div class="balance-amount">
                    <?= number_format($user['DepositBalance'] ?? 0, 0, ',', '.') ?> đ
                </div>
            </div>
            <div class="card-actions">
                <button onclick="showDepositInfoModal()" class="btn-wallet">
                    <i class="fas fa-info-circle"></i> Chính sách
                </button>
            </div>
        </div>
    </div>
    
    <?php if ($pending_request): ?>
        <div class="pending-withdrawal">
            <i class="fa-solid fa-hourglass-half" style="margin-right: 5px;"></i>
            <strong>Yêu cầu Rút tiền đang chờ xử lý:</strong>
            <?= number_format($pending_request['Amount'], 0, ',', '.') ?> đ. 
            Gửi lúc: <?= date('d/m/Y H:i', strtotime($pending_request['RequestedAt'])) ?>.
            <small style="margin-left: auto; color:#b45309;">(Bạn không thể tạo yêu cầu mới lúc này)</small>
        </div>
    <?php elseif ($currentBalance < 50000): ?>
        <div class="pending-withdrawal" style="background-color: #f0f9ff; border-color: #38bdf8; color: #075985;">
            <i class="fa-solid fa-circle-info" style="margin-right: 5px;"></i>
            <strong>Thông báo:</strong>
            Số dư tối thiểu để rút là 50.000 đ.
        </div>
    <?php endif; ?>


    <div class="history-section">
        <h3>Lịch sử biến động số dư</h3>
        
        <div class="trans-list">
            <?php if ($transactions->num_rows > 0): ?>
                <?php while ($row = $transactions->fetch_assoc()): ?>
                    <?php
                        // Xác định Icon và Màu sắc dựa trên loại giao dịch
                        $iconClass = '';
                        $iconSymbol = '';
                        $amountClass = '';
                        $sign = '';

                        switch ($row['Type']) {
                            case 'income':
                                $iconClass = 'icon-income';
                                $iconSymbol = '💰'; // Tiền vào
                                $amountClass = 'amount-plus';
                                $sign = '+';
                                break;
                            case 'fee':
                                $iconClass = 'icon-fee';
                                $iconSymbol = '🧾'; // Phí
                                $amountClass = 'amount-minus';
                                $sign = '-';
                                break;
                            case 'withdraw':
                                $iconClass = 'icon-withdraw';
                                $iconSymbol = '🏦'; // Rút
                                $amountClass = 'amount-minus';
                                $sign = '-';
                                break;
                            default:
                                $iconClass = 'icon-withdraw';
                                $iconSymbol = '🔄';
                        }
                    ?>
                    <div class="trans-item">
                        <div style="display:flex; align-items:center;">
                            <div class="trans-icon <?= $iconClass ?>">
                                <?= $iconSymbol ?>
                            </div>
                            <div class="trans-details">
                                <div class="trans-desc">
                                    <?= htmlspecialchars($row['Description']) ?>
                                    <?php if($row['OrderID']): ?>
                                        <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/order_detail.php?id=<?= $row['OrderID'] ?>" style="font-size:0.8rem; text-decoration:none; color:#3b82f6;">(Xem đơn)</a>
                                    <?php endif; ?>
                                </div>
                                <div class="trans-date"><?= date('H:i - d/m/Y', strtotime($row['CreatedAt'])) ?></div>
                            </div>
                        </div>
                        <div class="trans-amount <?= $amountClass ?>">
                            <?= $sign ?> <?= number_format($row['Amount'], 0, ',', '.') ?> đ
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <div style="padding:40px; text-align:center; color:#64748b;">
                    Chưa có giao dịch nào. Hãy bán thêm cá nhé! 🐟
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Modal Rút tiền -->
<div id="withdrawalModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeModal('withdrawalModal')">&times;</span>
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-top: 0; color: #3b82f6;">Gửi yêu cầu Rút tiền</h3>
        <p style="font-size: 0.9rem; color: #64748b;">
            Số dư khả dụng: <strong><?= number_format($currentBalance, 0, ',', '.') ?> đ</strong>. 
            Tối thiểu: 50.000 đ.
        </p>
        <form method="POST" action="wallet.php">
            <div class="form-group">
                <label for="amount">Số tiền muốn rút</label>
                <input type="number" id="amount" name="amount" min="50000" step="1000" max="<?= floor($currentBalance) ?>" required>
            </div>
            <h4 style="margin-top: 25px; margin-bottom: 15px;">Thông tin tài khoản nhận</h4>
            
            <div class="form-group">
                <label for="bank_name">Tên Ngân hàng</label>
                <!-- START: Thay thế input text bằng dropdown select -->
                <select id="bank_name" name="bank_name" required>
                    <?php foreach ($vietnameseBanks as $shortName => $fullName): ?>
                        <option value="<?= htmlspecialchars($shortName) ?>" <?= empty($shortName) ? 'disabled selected' : '' ?>>
                            <?= htmlspecialchars($fullName) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <!-- END: Thay thế input text bằng dropdown select -->
            </div>

            <div class="form-group">
                <label for="account_name">Tên Chủ tài khoản</label>
                <input type="text" id="account_name" name="account_name" required placeholder="Ví dụ: NGUYEN VAN A">
            </div>
            <div class="form-group">
                <label for="account_number">Số Tài khoản</label>
                <input type="text" id="account_number" name="account_number" required placeholder="Ví dụ: 0011000123456">
            </div>

            <!-- START: Cảnh báo quan trọng -->
            <div style="padding: 10px; background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem;">
                <strong><i class="fas fa-triangle-exclamation"></i> Cảnh báo quan trọng:</strong> Vui lòng kiểm tra kỹ thông tin Ngân hàng, Tên chủ khoản, và Số tài khoản. Nếu nhập sai thông tin và dẫn đến việc chuyển khoản sai địa chỉ, Admin sẽ **KHÔNG** chịu trách nhiệm.
            </div>
            <!-- END: Cảnh báo quan trọng -->

            <input type="hidden" name="submit_withdrawal" value="1">
            <button type="submit" class="btn-submit">Gửi yêu cầu Rút tiền</button>
        </form>
    </div>
</div>

<!-- Modal Thông tin Ký quỹ -->
<div id="depositInfoModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeModal('depositInfoModal')">&times;</span>
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-top: 0; color: #8b5cf6;">Quỹ Bảo đảm Ký quỹ</h3>
        <p style="font-size: 0.95rem; color: #334155;">
            Đây là số tiền bạn ký quỹ để đảm bảo uy tín và chất lượng dịch vụ của Shop. 
            Quỹ này được sử dụng để thanh toán các khoản bồi thường, phạt vi phạm hoặc các khoản chi phí phát sinh khác theo chính sách của hệ thống.
        </p>
        <ul style="list-style: disc; margin-left: 20px; font-size: 0.9rem; color: #475569;">
            <li>Đảm bảo uy tín cho các giao dịch lớn.</li>
            <li>Được hoàn trả khi Shop đóng cửa và đã hoàn tất mọi nghĩa vụ.</li>
            <li>Không thể rút tiền từ quỹ này.</li>
        </ul>
        <button onclick="closeModal('depositInfoModal')" style="padding:10px 15px; border-radius:6px; border:none; background-color:#ccc; color:#333; cursor:pointer; margin-top: 20px;">Đóng</button>
    </div>
</div>


<script>
    // Hàm hiển thị modal
    function showModal(id) {
        document.getElementById(id).style.display = "block";
    }

    // Hàm đóng modal
    function closeModal(id) {
        document.getElementById(id).style.display = "none";
    }
    
    // Hàm mới: thay thế requestWithdraw()
    function showWithdrawalModal() {
        showModal('withdrawalModal');
    }
    
    // Hàm mới: thay thế depositInfo()
    function showDepositInfoModal() {
        showModal('depositInfoModal');
    }

    // Đóng modal khi click ra ngoài
    window.onclick = function(event) {
        const withdrawalModal = document.getElementById('withdrawalModal');
        const depositInfoModal = document.getElementById('depositInfoModal');

        if (withdrawalModal && event.target == withdrawalModal) {
            closeModal('withdrawalModal');
        }
        if (depositInfoModal && event.target == depositInfoModal) {
            closeModal('depositInfoModal');
        }
    }
    
    // Thêm hàm cũ để tránh lỗi (DÙNG TRÁNH LỖI, NHƯNG ĐÃ REPLACE Ở HTML)
    function requestWithdraw() { showWithdrawalModal(); }
    function depositInfo() { showDepositInfoModal(); }
</script>

<?php include '../../includes/footer.php'; ?>
<?php $stmtTrans->close(); ?>