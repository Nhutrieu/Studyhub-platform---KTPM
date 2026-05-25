<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\cancel.php
require_once "../includes/db.php";

$orderID = $_GET['order'] ?? 0;

if ($orderID) {
  $orderID = intval($orderID);
  // Cập nhật trạng thái hủy
  $conn->query("UPDATE Orders SET Status='Cancelled' WHERE OrderID=$orderID");
  $conn->query("UPDATE Payment SET PaymentStatus='CANCELLED' WHERE OrderID=$orderID");
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Thanh toán đã hủy - KoiCare Shop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --koi-primary: #0ea5e9;
      --koi-primary-dark: #0369a1;
      --koi-accent: #f97316;
      --koi-danger: #ef4444;
      --koi-bg: #f1f5f9;
      --koi-text: #0f172a;
      --koi-muted: #6b7280;
      --koi-border: #e5e7eb;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, #fee2e2 0, #fffbeb 30%, #f1f5f9 70%),
        linear-gradient(135deg, rgba(248,113,113,0.15), rgba(249,115,22,0.12));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 12px;
      color: var(--koi-text);
    }

    .page-wrap {
      width: 100%;
      max-width: 520px;
    }

    .cancel-card {
      position: relative;
      background: #ffffff;
      border-radius: 20px;
      padding: 22px 20px 18px;
      box-shadow: 0 20px 45px rgba(15,23,42,0.25);
      border: 1px solid rgba(248,113,113,0.35);
      overflow: hidden;
    }

    .cancel-card::before {
      content: "";
      position: absolute;
      bottom: -90px;
      left: -90px;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle at center, rgba(254,242,242,0.95), transparent 70%);
      opacity: 0.8;
    }

    .cancel-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 10px;
    }

    .cancel-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #fef2f2;
      color: var(--koi-danger);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      flex-shrink: 0;
      box-shadow: 0 10px 24px rgba(239,68,68,0.4);
    }

    .cancel-title {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 4px;
    }

    .cancel-sub {
      font-size: 14px;
      color: var(--koi-muted);
      margin: 0;
    }

    .cancel-message {
      margin: 12px 0 8px;
      font-size: 14px;
      line-height: 1.5;
      background: #fef2f2;
      border-radius: 10px;
      border: 1px dashed #fecaca;
      padding: 8px 10px;
      color: #991b1b;
    }

    .order-info {
      margin-top: 4px;
      padding: 10px 12px;
      border-radius: 14px;
      background: #fff7ed;
      border: 1px solid rgba(251,146,60,0.4);
      font-size: 14px;
    }

    .order-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .order-row span:first-child {
      color: var(--koi-muted);
    }

    .order-row span:last-child {
      font-weight: 600;
    }

    .note {
      margin-top: 8px;
      font-size: 12px;
      color: var(--koi-muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .btn {
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--koi-primary), var(--koi-primary-dark));
      color: #ffffff;
      box-shadow: 0 12px 26px rgba(14,165,233,0.55);
    }

    .btn-primary:hover {
      box-shadow: 0 14px 32px rgba(14,165,233,0.7);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: #ffffff;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .btn-outline:hover {
      background: #fef2f2;
    }

    .brand-footer {
      margin-top: 10px;
      text-align: center;
      font-size: 12px;
      color: var(--koi-muted);
    }
    .brand-footer span {
      font-weight: 700;
      color: var(--koi-primary-dark);
    }

    @media (max-width: 480px) {
      .cancel-card {
        padding: 18px 16px 16px;
      }
      .cancel-header {
        align-items: flex-start;
      }
      .cancel-icon {
        width: 52px;
        height: 52px;
        font-size: 26px;
      }
      .cancel-title {
        font-size: 18px;
      }
      .actions {
        flex-direction: column;
      }
      .actions .btn {
        width: 100%;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
<div class="page-wrap">
  <div class="cancel-card">
    <div class="cancel-header">
      <div class="cancel-icon">❌</div>
      <div>
        <h1 class="cancel-title">Thanh toán đã bị hủy</h1>
        <p class="cancel-sub">
          Giao dịch vừa rồi chưa được hoàn tất qua cổng thanh toán.
        </p>
      </div>
    </div>

    <div class="cancel-message">
      <?php if ($orderID): ?>
        Đơn hàng <strong>#<?= htmlspecialchars($orderID) ?></strong> đã được cập nhật trạng thái
        <strong>ĐÃ HỦY</strong> trong hệ thống KoiCare.
      <?php else: ?>
        Phiên thanh toán đã bị hủy trước khi tạo mã đơn hàng hoàn chỉnh.
      <?php endif; ?>
    </div>

    <?php if ($orderID): ?>
      <div class="order-info">
        <div class="order-row">
          <span>Mã đơn hàng</span>
          <span>#<?= htmlspecialchars($orderID) ?></span>
        </div>
        <div class="order-row">
          <span>Trạng thái</span>
          <span>Đã hủy / Không hoàn tất</span>
        </div>
      </div>
    <?php endif; ?>

    <div class="note">
      • Nếu bạn gặp lỗi trong quá trình thanh toán, bạn có thể tạo lại đơn hàng và thử thanh toán một lần nữa.<br>
      • Trong trường hợp tiền đã bị trừ nhưng đơn hàng hiển thị đã hủy, hãy liên hệ ngân hàng hoặc Hotline KoiCareS để được hỗ trợ.
    </div>

    <div class="actions">
      <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="btn btn-primary">
        ⬅️ Quay lại cửa hàng
      </a>
      <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/orders.php" class="btn btn-outline">
        📦 Xem lịch sử đơn hàng
      </a>
    </div>
  </div>

  <div class="brand-footer">
    Bạn luôn có thể tạo lại đơn mới bất kỳ lúc nào trên <span>KoiCare Shop</span>.
  </div>
</div>
</body>
</html>
