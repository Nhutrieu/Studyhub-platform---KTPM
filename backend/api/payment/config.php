<?php
/**
 * config.php
 * - Cấu hình dùng cho cả VNPay (test) và PayOS (VietQR thật)
 */

date_default_timezone_set('Asia/Ho_Chi_Minh');

// ======================
// ⚙️ Cấu hình VNPay (test)
// ======================
$vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"; // môi trường test
$vnp_Returnurl = "https://koicares.xyz/HeThongChamSocCaKoi/backend/api/payment/vnpay_return.php";
$vnp_TmnCode = "Y320E57S"; // mã test sandbox
$vnp_HashSecret = "9UAP42A3OW0TYU88WR1HI5OMS7BXQMF2"; // key bí mật test

// ======================
// ⚙️ Cấu hình PayOS (thật - VietQR)
// ======================
// Bạn có thể điền trực tiếp, hoặc đặt trong biến môi trường hệ thống (ENV)
$payos_client_id    = getenv('PAYOS_CLIENT_ID') ?: "74130345-46c2-44b9-81cf-0ee866aba14c"; // Thay thế bằng Client ID thực tế
$payos_api_key      = getenv('PAYOS_API_KEY') ?: "167bc45f-dede-4055-a54f-055a1094406e"; // Thay thế bằng API Key thực tế
$payos_checksum_key = getenv('PAYOS_CHECKSUM_KEY') ?: "17b9da044836207ec4c683f65f698d1dcd8217f22f255018e702b8ef2ac248c8"; // Thay thế bằng Checksum Key thực tế

// URL webhook của bạn (đã cấu hình trong Dashboard PayOS)
$payos_webhook_url  = "https://koicares.xyz/HeThongChamSocCaKoi/backend/api/payment/payos_webhook.php";

// URL quay lại sau thanh toán
$payos_return_url   = "https://koicares.xyz/HeThongChamSocCaKoi/frontend/thanks.php";
$payos_cancel_url   = "https://koicares.xyz/HeThongChamSocCaKoi/frontend/cancel.php";

// Mảng cấu hình cho các file PHP khác include vào
$config = [
  'vnpay' => [
    'url' => $vnp_Url,
    'returnurl' => $vnp_Returnurl,
    'tmncode' => $vnp_TmnCode,
    'hashsecret' => $vnp_HashSecret
  ],
  'payos' => [
    'client_id'    => $payos_client_id,
    'api_key'      => $payos_api_key,
    'checksum_key' => $payos_checksum_key,
    'webhook_url'  => $payos_webhook_url,
    'return_url'   => $payos_return_url,
    'cancel_url'   => $payos_cancel_url
  ]
];
?>
