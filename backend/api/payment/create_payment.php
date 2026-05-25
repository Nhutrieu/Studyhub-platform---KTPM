<?php
/**
 * create_payment.php — Phiên bản Hợp nhất (2025)
 * ✅ Giữ nguyên tích hợp PayOS/VNPay từ file cũ.
 * ✅ Thêm xử lý đơn hàng 0đ (Free/Voucher) từ file mới.
 * ✅ Fix lỗi trùng mã giao dịch VNPay khi thanh toán lại.
 */

session_start();
require_once "../../../includes/db.php";
require_once __DIR__ . "/config.php";

// 1. Kiểm tra đăng nhập
if (!isset($_SESSION['userid'])) {
    http_response_code(401);
    die("❌ Bạn chưa đăng nhập!");
}

$userID = (int)$_SESSION['userid'];

// 2. Lấy Order ID
$orderIdParam = $_GET['orderId'] ?? null;
if (!$orderIdParam || !ctype_digit($orderIdParam)) {
    http_response_code(400);
    die("❌ Thiếu hoặc sai orderId.");
}
$orderId = (int)$orderIdParam;

// 3. Lấy phương thức
$paymentMethod = strtolower($_GET['payment_method'] ?? 'vietqr');
$clientIp      = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

// === Base URL ===
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
$base   = rtrim($scheme . '://' . $host, '/');

// === Lấy cấu hình từ config.php ===
$vnp_TmnCode    = $config['vnpay']['tmncode'];
$vnp_HashSecret = $config['vnpay']['hashsecret'];
$vnp_Returnurl  = $config['vnpay']['returnurl'];
$vnp_Url        = $config['vnpay']['url'];

$PAYOS_CLIENT_ID = $config['payos']['client_id'];
$PAYOS_API_KEY   = $config['payos']['api_key'];
$PAYOS_CHECKSUM  = $config['payos']['checksum_key'];

// === URL trả về ===
$returnUrl = $base . "/HeThongChamSocCaKoi/frontend/thanks.php?order={$orderId}";
$cancelUrl = $base . "/HeThongChamSocCaKoi/frontend/cancel.php?order={$orderId}";

// ====================================================
// 🔎 LẤY THÔNG TIN ĐƠN HÀNG TỪ DB
// ====================================================
$stmtOrder = $conn->prepare("
  SELECT OrderID, UserID, TotalAmount, Status, PaymentStatus
  FROM Orders
  WHERE OrderID = ?
");
$stmtOrder->bind_param("i", $orderId);
$stmtOrder->execute();
$orderRow = $stmtOrder->get_result()->fetch_assoc();
$stmtOrder->close();

if (!$orderRow) {
    http_response_code(404);
    die("❌ Đơn hàng không tồn tại.");
}

// 🚫 Check quyền
if ((int)$orderRow['UserID'] !== $userID) {
    http_response_code(403);
    die("❌ Bạn không có quyền thanh toán đơn hàng này.");
}

// 🚫 Check trạng thái
if (strtoupper((string)$orderRow['PaymentStatus']) === 'PAID') {
    // Chuyển hướng luôn nếu đã thanh toán
    header("Location: " . $returnUrl);
    exit;
}

// 🔢 Lấy số tiền (Làm tròn thành số nguyên VND)
$amountRaw = (int)round((float)$orderRow['TotalAmount']);

// ====================================================
// 🔥 [MỚI] XỬ LÝ ĐƠN HÀNG 0đ (Do Voucher giảm 100%)
// ====================================================
if ($amountRaw <= 0) {
    // Tự động cập nhật thành công
    $conn->query("
        UPDATE Orders 
        SET PaymentStatus = 'PAID', 
            Status = 'Processing', 
            PaymentMethod = 'Free/Voucher' 
        WHERE OrderID = $orderId
    ");
    
    // Chuyển hướng đến trang cảm ơn ngay lập tức
    header("Location: " . $returnUrl);
    exit;
}

// Cập nhật PaymentMethod vào DB để lưu lại lựa chọn của khách
$methodLabel = ($paymentMethod === 'vnpay') ? 'vnpay' : 'vietqr';
$updMethod = $conn->prepare("UPDATE Orders SET PaymentMethod = ? WHERE OrderID = ?");
$updMethod->bind_param("si", $methodLabel, $orderId);
$updMethod->execute();
$updMethod->close();


// ====================================================
// 🟢 XỬ LÝ PAYOS (VIETQR - Code cũ giữ nguyên)
// ====================================================
if ($paymentMethod === 'vietqr') {
    // Mô tả: KOI + 6 số cuối orderId
    $description = 'KOI' . substr((string)$orderId, -6);

    $baseSign = 'amount=' . $amountRaw
              . '&cancelUrl=' . $cancelUrl
              . '&description=' . $description
              . '&orderCode=' . $orderId
              . '&returnUrl=' . $returnUrl;

    $signature = hash_hmac('sha256', $baseSign, $PAYOS_CHECKSUM);

    $payload = [
        'orderCode'   => $orderId,
        'amount'      => $amountRaw,
        'description' => $description,
        'cancelUrl'   => $cancelUrl,
        'returnUrl'   => $returnUrl,
        'signature'   => $signature
    ];

    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-client-id: ' . $PAYOS_CLIENT_ID,
            'x-api-key: ' . $PAYOS_API_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode($payload)
    ]);

    $respBody = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300) {
        file_put_contents(__DIR__ . '/payos_error.log', "[" . date('Y-m-d H:i:s') . "] HTTP {$httpCode} - {$respBody}\n", FILE_APPEND);
        die("⚠️ PayOS API ERROR. Vui lòng thử lại sau.");
    }

    $resp = json_decode($respBody, true);
    $checkoutUrl = $resp['data']['checkoutUrl'] ?? null;

    if (!$checkoutUrl) {
        die("⚠️ Lỗi kết nối PayOS: Không nhận được link thanh toán.");
    }

    // Lưu vào bảng Payment
    $stmt = $conn->prepare("INSERT INTO Payment (UserID, OrderID, PaymentMethod, Provider, PaymentStatus, Amount, PaymentLink) VALUES (?, ?, 'VietQR', 'vietqr', 'Pending', ?, ?)");
    $stmt->bind_param("iids", $userID, $orderId, $amountRaw, $checkoutUrl);
    $stmt->execute();

    header("Location: " . $checkoutUrl);
    exit;
}


// ====================================================
// 💳 XỬ LÝ VNPAY (Code cũ + Fix lỗi trùng mã)
// ====================================================
if ($paymentMethod === 'vnpay') {
    // 🔥 [FIX] Thêm time() để tránh lỗi "Order already exists" khi thanh toán lại
    $vnp_TxnRef     = $orderId . "_" . time(); 
    
    $vnp_OrderInfo  = "Thanh toan don hang KOI #" . $orderId;
    $vnp_Amount     = $amountRaw * 100; // VNPAY yêu cầu nhân 100
    $vnp_ExpireDate = date('YmdHis', strtotime('+15 minutes'));

    $inputData = [
        "vnp_Version"    => "2.1.0",
        "vnp_Command"    => "pay",
        "vnp_TmnCode"    => $vnp_TmnCode,
        "vnp_Amount"     => $vnp_Amount,
        "vnp_CurrCode"   => "VND",
        "vnp_TxnRef"     => $vnp_TxnRef,
        "vnp_OrderInfo"  => $vnp_OrderInfo,
        "vnp_OrderType"  => "billpayment",
        "vnp_Locale"     => "vn",
        "vnp_IpAddr"     => $clientIp,
        "vnp_CreateDate" => date('YmdHis'),
        "vnp_ExpireDate" => $vnp_ExpireDate,
        "vnp_ReturnUrl"  => $vnp_Returnurl
    ];

    ksort($inputData);
    $query = "";
    $i = 0;
    $hashdata = "";
    foreach ($inputData as $key => $value) {
        if ($i == 1) {
            $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
        } else {
            $hashdata .= urlencode($key) . "=" . urlencode($value);
            $i = 1;
        }
        $query .= urlencode($key) . "=" . urlencode($value) . '&';
    }

    $vnp_Url_full = $vnp_Url . "?" . $query;
    if (isset($vnp_HashSecret)) {
        $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
        $vnp_Url_full .= 'vnp_SecureHash=' . $vnpSecureHash;
    }

    // Lưu Payment
    $stmt = $conn->prepare("INSERT INTO Payment (UserID, OrderID, PaymentMethod, Provider, PaymentStatus, Amount) VALUES (?, ?, 'VNPay', 'vnpay', 'Pending', ?)");
    $stmt->bind_param("iid", $userID, $orderId, $amountRaw);
    $stmt->execute();

    header("Location: " . $vnp_Url_full);
    exit;
}

// ====================================================
// ❌ Nếu không khớp cổng nào
// ====================================================
http_response_code(400);
die("Phương thức thanh toán không hợp lệ!");
?>