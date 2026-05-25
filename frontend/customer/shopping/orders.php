<?php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';
require_once '../../../includes/check_login.php';
$username = $_SESSION['username'] ?? null;
if (!$username) {
    header('Location: /HeThongChamSocCaKoi/frontend/account/login.php');
    exit;
}

// ✅ Lấy thông tin user hiện tại
$uStmt = $conn->prepare("SELECT UserID, FullName FROM Users WHERE Username=? LIMIT 1");
$uStmt->bind_param("s", $username);
$uStmt->execute();
$user = $uStmt->get_result()->fetch_assoc();
if (!$user) {
    die("Không tìm thấy tài khoản người dùng.");
}
$userId   = (int)$user['UserID'];
$fullName = $user['FullName'] ?? '';

// ✅ Lấy danh sách đơn hàng
$sql = "
  SELECT 
    o.OrderID,
    o.OrderDate,
    o.TotalAmount,
    o.Status,
    o.PaymentStatus,
    o.PaymentMethod,
    o.ReceiverPhone,
    o.ReceiverAddress,
    COALESCE(SUM(od.Quantity),0) AS TotalQuantity,
    COUNT(DISTINCT od.OrderDetailID) AS ItemLines
  FROM Orders o
  LEFT JOIN OrderDetail od ON o.OrderID = od.OrderID
  WHERE o.UserID = ?
  GROUP BY 
    o.OrderID, o.OrderDate, o.TotalAmount, o.Status, 
    o.PaymentStatus, o.PaymentMethod, o.ReceiverPhone, o.ReceiverAddress
  ORDER BY o.OrderDate DESC
";
$st = $conn->prepare($sql);
$st->bind_param("i", $userId);
$st->execute();
$orders = $st->get_result()->fetch_all(MYSQLI_ASSOC);

// --- HELPER FUNCTIONS ---

// 1. Trạng thái thanh toán
function humanPaymentStatus($s) {
    $s = strtoupper((string)$s);
    return match($s) {
        'PAID'      => 'Đã thanh toán',
        'FAILED'    => 'Thanh toán thất bại',
        'CANCELLED' => 'Hủy thanh toán',
        default     => 'Chờ thanh toán',
    };
}

function paymentStatusClass($s) {
    $s = strtoupper((string)$s);
    return match($s) {
        'PAID'      => 'status-paid',
        'FAILED'    => 'status-failed',
        'CANCELLED' => 'status-cancelled',
        default     => 'status-pending-pay', // Class riêng cho chờ TT
    };
}

// 2. Trạng thái đơn hàng (Theo Sơ đồ trạng thái)
function humanOrderStatus($s) {
    $s = strtolower((string)$s);
    return match($s) {
        'pending'      => 'Chờ xác nhận',
        'processing'   => 'Đang chuẩn bị hàng',
        'shipped'      => 'Đang giao hàng',    // Hiển thị Shipped là Đang giao
        'completed'    => 'Đã hoàn thành',
        'dispute'      => 'Đang khiếu nại',
        'adminreview'  => 'Chờ Admin xử lý',
        'refunded'     => 'Đã hoàn tiền',
        'cancelled'    => 'Đã hủy',
        default        => 'Trạng thái: ' . ucfirst($s),
    };
}

function orderStatusClass($s) {
    $s = strtolower((string)$s);
    return match($s) {
        'completed'              => 'status-success',   // Xanh lá
        'shipped', 'processing'  => 'status-info',      // Xanh dương
        'dispute', 'adminreview' => 'status-warning',   // Cam/Vàng
        'cancelled', 'refunded'  => 'status-danger',    // Đỏ
        'pending'                => 'status-neutral',   // Xám
        default                  => 'status-neutral',
    };
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đơn hàng của tôi - KoiLover</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/orders.css">
  <!-- Font Awesome cho icon -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>

<?php include '../../../includes/header.php'; ?>

<div class="orders-page">
  <div class="orders-header">
    <h1><i class="fas fa-box-open"></i> Đơn hàng của tôi</h1>
    <p>Xin chào, <strong><?= htmlspecialchars($fullName) ?></strong>. Quản lý trạng thái đơn hàng và lịch sử mua sắm của bạn.</p>
  </div>

  <?php if (empty($orders)): ?>
    <div class="orders-empty">
    <center> 
        <img src="https://img.icons8.com/clouds/300/shopping-cart.png" alt="No orders">
        <p>Bạn chưa có đơn hàng nào.</p>
        <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/products.php" class="btn primary">
            <i class="fas fa-shopping-bag"></i> Bắt đầu mua sắm
        </a>
    </center>
</div>
  <?php else: ?>
    <div class="orders-list">
      <?php foreach ($orders as $o): ?>
        <?php
          $createdAt   = $o['OrderDate'] ? date('H:i d/m/Y', strtotime($o['OrderDate'])) : '-';
          $total       = (float)($o['TotalAmount'] ?? 0);
          $qty         = (int)($o['TotalQuantity'] ?? 0);
          $itemLines   = (int)($o['ItemLines'] ?? 0);
          
          // Xử lý hiển thị
          $pmLabel     = humanPaymentStatus($o['PaymentStatus']);
          $pmClass     = paymentStatusClass($o['PaymentStatus']);
          
          $osLabel     = humanOrderStatus($o['Status']);
          $osClass     = orderStatusClass($o['Status']);
          
          $methodLabel = match($o['PaymentMethod'] ?? '') {
              'vietqr' => 'VietQR',
              'vnpay'  => 'VNPay',
              'cod'    => 'Tiền mặt (COD)',
              default  => ucfirst($o['PaymentMethod'] ?? 'Khác'),
          };
        ?>
        <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/order_detail.php?id=<?= (int)$o['OrderID'] ?>" class="order-card">
          <div class="order-card-top">
            <div class="order-id">
              <i class="fas fa-receipt"></i> Đơn hàng #<?= (int)$o['OrderID'] ?>
            </div>
            <div class="order-badges">
              <!-- Badge Trạng thái Đơn hàng -->
              <span class="status-badge <?= $osClass ?>">
                <?php if($o['Status'] == 'completed') echo '<i class="fas fa-check-circle"></i> '; ?>
                <?php if($o['Status'] == 'shipped') echo '<i class="fas fa-truck"></i> '; ?>
                <?php if($o['Status'] == 'dispute') echo '<i class="fas fa-exclamation-triangle"></i> '; ?>
                <?= htmlspecialchars($osLabel) ?>
              </span>
            </div>
          </div>

          <div class="order-card-middle">
            <div class="order-info-grid">
              <div class="info-item">
                <span class="label">Ngày đặt:</span>
                <span class="value"><?= $createdAt ?></span>
              </div>
              <div class="info-item">
                <span class="label">Số lượng:</span>
                <span class="value"><?= $qty ?> sp (<?= $itemLines ?> loại)</span>
              </div>
              <div class="info-item">
                <span class="label">Thanh toán:</span>
                <span class="value"><?= htmlspecialchars($methodLabel) ?></span>
                <span class="payment-dot <?= $pmClass ?>" title="<?= $pmLabel ?>"></span>
              </div>
            </div>
          </div>

          <div class="order-card-bottom">
            <div class="order-total">
              Tổng tiền: <span><?= number_format($total, 0, ',', '.') ?> đ</span>
            </div>
            <div class="order-action">
              Xem chi tiết <i class="fas fa-arrow-right"></i>
            </div>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>

<?php include '../../../includes/footer.php'; ?>

</body>
</html>