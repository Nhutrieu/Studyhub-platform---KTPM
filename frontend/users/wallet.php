<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\users\wallet.php
session_start();

// Sửa đường dẫn include cho đúng với vị trí frontend/users/
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Chỉ cho phép Customer / Shop / Admin truy cập trang ví
if (!isset($_SESSION['role'])) {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$userId = (int)$_SESSION['userid'];
$role   = $_SESSION['role'];
$page_title = "Ví của tôi";

// 1. Lấy thông tin số dư
$stmtUser = $conn->prepare("SELECT FullName, AccountBalance FROM Users WHERE UserID = ?");
$stmtUser->bind_param("i", $userId);
$stmtUser->execute();
$userResult = $stmtUser->get_result();
$userData = $userResult->fetch_assoc();
$balance = $userData['AccountBalance'] ?? 0;
$stmtUser->close();

// 2. Lấy lịch sử giao dịch
// Tùy vào role mà lấy bảng tương ứng
if ($role === 'Shop') {
    $table = 'ShopTransactions';
    $walletTitle = "Ví Shop (KoiPay)";
} else {
    // Customer hoặc các role khác xem như khách
    $table = 'CustomerTransactions'; 
    $walletTitle = "Ví khách hàng (KoiPay)";
}

// Kiểm tra xem bảng có tồn tại không để tránh lỗi Fatal Error
$transactions = [];
$checkTable = $conn->query("SHOW TABLES LIKE '$table'");
if ($checkTable && $checkTable->num_rows > 0) {
    $sqlHistory = "
        SELECT TransactionID, Type, Amount, Description, CreatedAt, OrderID
        FROM $table
        WHERE UserID = ?
        ORDER BY CreatedAt DESC
        LIMIT 20
    ";
    $stmtHist = $conn->prepare($sqlHistory);
    $stmtHist->bind_param("i", $userId);
    $stmtHist->execute();
    $historyResult = $stmtHist->get_result();
    while ($row = $historyResult->fetch_assoc()) {
        $transactions[] = $row;
    }
    $stmtHist->close();
}

// Hàm map type -> nhãn tiếng Việt
function mapTransactionTypeLabel($type) {
    switch ($type) {
        case 'income':   return 'Doanh thu';
        case 'fee':      return 'Phí / Phạt';
        case 'deposit':  return 'Nạp tiền';
        case 'refund':   return 'Hoàn tiền';
        case 'payment':  return 'Thanh toán đơn';
        case 'withdraw': return 'Rút tiền';
        default:         return ucfirst($type);
    }
}

// Hàm xác định giao dịch dương hay âm
function isPositiveTransaction($type, $table) {
    // Với ví khách: tiền vào = refund, deposit
    if ($table === 'CustomerTransactions') {
        return in_array($type, ['refund', 'deposit'], true);
    }
    // Với ví shop: tiền vào = income
    if ($table === 'ShopTransactions') {
        return in_array($type, ['income'], true);
    }
    // fallback
    return false;
}

include '../../includes/header.php';
?>

<style>
    .wallet-container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
    .balance-card { background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; border-radius: 16px; padding: 30px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .balance-amount { font-size: 2.5rem; font-weight: 700; margin: 0; }
    .history-section { background: white; border-radius: 12px; padding: 25px; border: 1px solid #e2e8f0; }
    .transaction-table { width: 100%; border-collapse: collapse; }
    .transaction-table th, .transaction-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 0.95rem; }
    .amount.positive { color: #10b981; font-weight: 600; }
    .amount.negative { color: #ef4444; font-weight: 600; }
    .page-title { font-size: 1.6rem; margin-bottom: 10px; }
    .wallet-subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 10px; }
</style>

<div class="wallet-container">
    <h1 class="page-title">Ví của tôi</h1>
    <div class="wallet-subtitle">
        <?= htmlspecialchars($walletTitle) ?> • Sử dụng để thanh toán đơn hàng bằng <strong>Ví KoiPay</strong>.
    </div>

    <div class="balance-card">
        <div>
            <h3>Số dư khả dụng</h3>
            <p class="balance-amount"><?= number_format($balance, 0, ',', '.') ?> đ</p>
            <small>Xin chào, <?= htmlspecialchars($userData['FullName']) ?></small>
        </div>
        <div>
            <button onclick="alert('Tính năng nạp tiền đang phát triển')" 
                    style="padding:10px 20px; border-radius:8px; border:1px solid #fff; background:rgba(255,255,255,0.2); color:#fff; cursor:pointer;">
                + Nạp tiền
            </button>
        </div>
    </div>

    <div class="history-section">
        <h2>Lịch sử giao dịch</h2>
        <?php if (empty($transactions)): ?>
            <p style="text-align:center; color:#64748b; padding:20px;">Chưa có giao dịch nào.</p>
        <?php else: ?>
            <table class="transaction-table">
                <thead>
                    <tr>
                        <th>Loại</th>
                        <th>Số tiền</th>
                        <th>Mô tả</th>
                        <th>Thời gian</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($transactions as $trans): 
                        $type       = $trans['Type'];
                        $label      = mapTransactionTypeLabel($type);
                        $isPositive = isPositiveTransaction($type, $table);
                    ?>
                        <tr>
                            <td><?= htmlspecialchars($label) ?></td>
                            <td class="amount <?= $isPositive ? 'positive' : 'negative' ?>">
                                <?= $isPositive ? '+' : '-' ?>
                                <?= number_format($trans['Amount'], 0, ',', '.') ?> đ
                            </td>
                            <td>
                                <?= htmlspecialchars($trans['Description']) ?>
                                <?php if (!empty($trans['OrderID'])): ?>
                                    (Đơn #<?= (int)$trans['OrderID'] ?>)
                                <?php endif; ?>
                            </td>
                            <td><?= date('d/m/Y H:i', strtotime($trans['CreatedAt'])) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
</div>

<?php include '../../includes/footer.php'; ?>
