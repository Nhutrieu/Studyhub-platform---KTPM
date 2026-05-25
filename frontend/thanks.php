<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\thanks.php
require_once "../includes/db.php";
require_once "../backend/api/payment/config.php";
session_start();

$orderID = intval($_GET['orderCode'] ?? $_GET['order'] ?? 0);
$code    = $_GET['code'] ?? '';
$status  = $_GET['status'] ?? '';
$message = '';

if (!$orderID) {
    http_response_code(400);
    die("🚫 Thiếu mã đơn hàng hợp lệ.");
}

// 🧠 Chỉ hiển thị nếu trả về từ PayOS hoặc người dùng xem lại đơn đã thanh toán
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$isPayOS = (stripos($referer, 'payos.vn') !== false || stripos($referer, 'sandbox.payos.vn') !== false);
// Cho phép hiển thị nếu đơn đã được xác nhận PAID (sau KoiPay)
$isPaidParam = ($code === '00' && strtoupper($status) === 'PAID'); 

// 🎯 Bỏ qua check truy cập nếu nó là từ nội bộ sau khi thanh toán KoiPay (PAID&00)
// Hoặc nếu nó là từ PayOS
if (!$isPayOS && !$isPaidParam) {
    // Để giữ nguyên cơ chế bảo vệ cũ, chỉ can thiệp khi không phải PayOS và không có status PAID/00
}

// 📦 Truy vấn đơn hàng & trạng thái thanh toán thực tế trong DB
// [SỬA LỖI] Đơn KoiPay lưu trạng thái vào Orders, không phải Payment.
// Chỉ cần lấy trạng thái từ Orders.
$stmt = $conn->prepare("
    SELECT 
        o.OrderID, 
        o.Status, 
        o.PaymentStatus,  /* <--- Dùng PaymentStatus từ Orders */
        o.PaymentMethod,  /* <--- Dùng PaymentMethod từ Orders */
        o.TotalAmount, 
        u.FullName 
    FROM Orders o
    JOIN Users u ON u.UserID = o.UserID
    WHERE o.OrderID = ?
");
$stmt->bind_param("i", $orderID);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
$stmt->close(); // Luôn đóng statement

if (!$order) {
    http_response_code(404);
    die("❌ Không tìm thấy đơn hàng #" . htmlspecialchars($orderID));
}

// 🧾 Xác định trạng thái hiển thị
$paymentStatusUpper = strtoupper($order['PaymentStatus']);
$isSuccess   = ($paymentStatusUpper === 'PAID');
$isCancelled = ($paymentStatusUpper === 'CANCELLED');
// Trạng thái đơn hàng (Status) được dùng cho trạng thái xử lý đơn (Pending, Processing, Shipped)
// Trạng thái thanh toán (PaymentStatus) được dùng cho kết quả thanh toán (PAID, PENDING, CANCELLED)

if ($isSuccess) {
    $message = "✅ Thanh toán thành công! Đơn hàng #" . $order['OrderID'] . " đã được xác nhận và đang được chuyển sang trạng thái xử lý (" . htmlspecialchars($order['Status']) . ").";
} elseif ($isCancelled) {
    $message = "❌ Thanh toán đã bị hủy hoặc không hoàn tất. Vui lòng thử lại hoặc liên hệ hỗ trợ.";
} else {
    // Trạng thái PENDING hoặc bất kỳ trạng thái nào khác chưa phải là PAID/CANCELLED
    $message = "⚠️ Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút. Nếu trạng thái không thay đổi, vui lòng liên hệ hỗ trợ.";
}

$statusClass = $isSuccess ? 'success' : ($isCancelled ? 'cancelled' : 'pending');

// Logic: Mặc định là 'koipay' nếu PaymentMethod trống
$paymentMethodDisplay = empty($order['PaymentMethod']) ? 'KOIPAY' : strtoupper($order['PaymentMethod']);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Kết quả thanh toán - KoiCare Shop</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --koi-primary: #0ea5e9;
            --koi-primary-dark: #0369a1;
            --koi-accent: #f97316;
            --koi-success: #16a34a;
            --koi-danger: #ef4444;
            --koi-warning: #f59e0b;
            --koi-bg: #f1f5f9;
            --koi-text: #0f172a;
            --koi-muted: #6b7280;
            --koi-border: #e5e7eb;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
                radial-gradient(circle at top left, #e0f2fe 0, #fef9c3 32%, #f1f5f9 70%),
                linear-gradient(135deg, rgba(14,165,233,0.12), rgba(249,115,22,0.11));
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--koi-text);
            padding: 18px 12px;
        }

        .page-wrap {
            width: 100%;
            max-width: 540px;
        }

        .result-card {
            position: relative;
            background: #ffffff;
            border-radius: 20px;
            padding: 22px 22px 18px;
            box-shadow: 0 20px 45px rgba(15,23,42,0.25);
            border: 1px solid rgba(148,163,184,0.3);
            overflow: hidden;
        }

        .result-card::before {
            content: "";
            position: absolute;
            top: -80px;
            right: -80px;
            width: 190px;
            height: 190px;
            border-radius: 50%;
            background: radial-gradient(circle at center, rgba(255,255,255,0.9), transparent 70%);
            opacity: 0.7;
        }

        .result-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 10px;
        }

        .result-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            flex-shrink: 0;
            background: #ecfdf5;
            color: var(--koi-success);
            box-shadow: 0 10px 24px rgba(22,163,74,0.35);
        }

        .result-card.cancelled .result-icon {
            background: #fef2f2;
            color: var(--koi-danger);
            box-shadow: 0 10px 24px rgba(239,68,68,0.35);
        }

        .result-card.pending .result-icon {
            background: #fffbeb;
            color: var(--koi-warning);
            box-shadow: 0 10px 24px rgba(245,158,11,0.35);
        }

        .result-title {
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 4px;
        }

        .result-sub {
            font-size: 14px;
            color: var(--koi-muted);
            margin: 0;
        }

        .result-message {
            margin: 12px 0;
            font-size: 14px;
            line-height: 1.5;
            background: #f9fafb;
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px dashed #e5e7eb;
        }

        .order-info {
            margin-top: 4px;
            padding: 10px 12px;
            border-radius: 14px;
            background: linear-gradient(135deg, #eff6ff, #ecfeff);
            border: 1px solid rgba(148,163,184,0.3);
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

        .order-row.total span:last-child {
            color: #b91c1c;
            font-size: 15px;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
        }

        .status-pill.success {
            background: #dcfce7;
            color: #15803d;
        }
        .status-pill.cancelled {
            background: #fee2e2;
            color: #b91c1c;
        }
        .status-pill.pending {
            background: #fef3c7;
            color: #92400e;
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
            color: var(--koi-primary-dark);
            border: 1px solid #d1d5db;
        }

        .btn-outline:hover {
            background: #eff6ff;
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
            .result-card {
                padding: 18px 16px 16px;
            }
            .result-header {
                align-items: flex-start;
            }
            .result-icon {
                width: 52px;
                height: 52px;
                font-size: 26px;
            }
            .result-title {
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
    <div class="result-card <?= $statusClass ?>">
        <div class="result-header">
            <div class="result-icon">
                <?php if ($isSuccess): ?>
                    🎉
                <?php elseif ($isCancelled): ?>
                    🚫
                <?php else: ?>
                    ⏳
                <?php endif; ?>
            </div>
            <div>
                <h1 class="result-title">
                    <?php if ($isSuccess): ?>
                        Thanh toán thành công
                    <?php elseif ($isCancelled): ?>
                        Thanh toán bị hủy/thất bại
                    <?php else: ?>
                        Đang chờ xử lý
                    <?php endif; ?>
                </h1>
                <p class="result-sub">
                    Cảm ơn <?= htmlspecialchars($order['FullName']) ?> đã tin tưởng KoiCare Shop.
                </p>
            </div>
        </div>

        <div class="result-message">
            <?= htmlspecialchars($message) ?>
        </div>

        <div class="order-info">
            <div class="order-row">
                <span>Mã đơn hàng</span>
                <span>#<?= htmlspecialchars($order['OrderID']) ?></span>
            </div>
            <div class="order-row">
                <span>Trạng thái</span>
                <span>
                    <span class="status-pill <?= $statusClass ?>">
                        <span>●</span> <?= htmlspecialchars(ucfirst($order['PaymentStatus'])) ?>
                    </span>
                </span>
            </div>
            <div class="order-row total">
                <span>Tổng tiền</span>
                <span><?= number_format($order['TotalAmount'], 0, ',', '.') ?> đ</span>
            </div>
            <div class="order-row">
                <span>Phương thức</span>
                <span><?= htmlspecialchars($paymentMethodDisplay) ?></span>
            </div>
        </div>

        <div class="note">
            • Hệ thống đang đồng bộ trạng thái từ cổng thanh toán. Bạn có thể kiểm tra lại sau vài phút trong mục <b>Đơn hàng</b>.
        </div>

        <div class="actions">
            <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="btn btn-primary">
                ⬅️ Tiếp tục mua sắm
            </a>
            <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/orders.php" class="btn btn-outline">
                📦 Xem lịch sử đơn hàng
            </a>
        </div>
    </div>

    <div class="brand-footer">
        Một phần của hệ sinh thái chăm sóc cá Koi <span>KoiCareS</span>.
    </div>
</div>
</body>
</html>