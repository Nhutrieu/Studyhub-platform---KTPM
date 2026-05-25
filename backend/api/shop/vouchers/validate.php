<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\validate.php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once '../../../../includes/db.php';

function json_response($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = $_SESSION['userid'] ?? $_SESSION['user_id'] ?? null;
$role   = $_SESSION['role']   ?? $_SESSION['Role']      ?? 'Customer';

if (!$userId) {
    json_response(['success' => false, 'error' => 'Vui lòng đăng nhập để áp dụng voucher.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Phương thức không hợp lệ.'], 405);
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

$code    = strtoupper(trim($data['Code'] ?? ''));
$shopId  = isset($data['ShopID']) ? (int)$data['ShopID'] : null;
$subTotal = isset($data['SubTotal']) ? (float)$data['SubTotal'] : 0;

if ($code === '') {
    json_response(['success' => false, 'error' => 'Vui lòng nhập mã voucher.']);
}
if ($subTotal <= 0) {
    json_response(['success' => false, 'error' => 'Tổng tiền không hợp lệ để áp dụng voucher.']);
}
if (!$shopId) {
    json_response(['success' => false, 'error' => 'Thiếu thông tin shop của đơn hàng.']);
}

// --- Lấy thông tin voucher ---
// Scope = system => áp dụng cho mọi shop
// Scope = shop   => chỉ áp dụng nếu ShopID khớp
$sql = "SELECT *
        FROM Voucher
        WHERE Code = ?
          AND Status = 'active'
          AND (
                Scope = 'system'
                OR (Scope = 'shop' AND ShopID = ?)
              )
        LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param('si', $code, $shopId);
$stmt->execute();
$rs = $stmt->get_result();
$voucher = $rs->fetch_assoc();
$stmt->close();

if (!$voucher) {
    json_response(['success' => false, 'error' => 'Mã voucher không tồn tại hoặc không áp dụng cho shop này.']);
}

// --- Kiểm tra thời gian hiệu lực ---
$now = date('Y-m-d H:i:s');
if ($now < $voucher['StartDate']) {
    json_response(['success' => false, 'error' => 'Voucher chưa tới thời gian sử dụng.']);
}
if ($now > $voucher['EndDate']) {
    json_response(['success' => false, 'error' => 'Voucher đã hết hạn.']);
}

// --- Kiểm tra đơn tối thiểu ---
$minOrder = (float)$voucher['MinOrderAmount'];
if ($subTotal < $minOrder) {
    json_response([
        'success' => false,
        'error'   => 'Đơn hàng cần tối thiểu ' . number_format($minOrder, 0, ',', '.') . 'đ để dùng mã này.'
    ]);
}

// --- Kiểm tra số lượt dùng (tổng) ---
// Chỉ tính các đơn đã thanh toán thành công (PaymentStatus = 'PAID')
if (!empty($voucher['UsageLimitTotal'])) {
    $sql = "SELECT COUNT(*) AS cnt
            FROM OrderVoucher ov
            JOIN Orders o ON ov.OrderID = o.OrderID
            WHERE ov.VoucherID = ?
              AND o.PaymentStatus = 'PAID'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $voucher['VoucherID']);
    $stmt->execute();
    $used = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $usedTotal = (int)($used['cnt'] ?? 0);
    if ($usedTotal >= (int)$voucher['UsageLimitTotal']) {
        json_response(['success' => false, 'error' => 'Mã voucher đã hết lượt sử dụng.']);
    }
}

// --- Kiểm tra số lượt dùng / user ---
if (!empty($voucher['UsageLimitPerUser'])) {
    $sql = "SELECT COUNT(*) AS cnt
            FROM OrderVoucher ov
            JOIN Orders o ON ov.OrderID = o.OrderID
            WHERE ov.VoucherID = ?
              AND o.UserID = ?
              AND o.PaymentStatus = 'PAID'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $voucher['VoucherID'], $userId);
    $stmt->execute();
    $used = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $usedUser = (int)($used['cnt'] ?? 0);
    if ($usedUser >= (int)$voucher['UsageLimitPerUser']) {
        json_response(['success' => false, 'error' => 'Bạn đã sử dụng hết số lần cho mã này.']);
    }
}

// --- Tính số tiền giảm ---
$discount = 0;
if ($voucher['DiscountType'] === 'percent') {
    $discount = $subTotal * ((float)$voucher['DiscountValue'] / 100);
    if (!is_null($voucher['MaxDiscountAmount']) && $voucher['MaxDiscountAmount'] > 0) {
        $discount = min($discount, (float)$voucher['MaxDiscountAmount']);
    }
} else { // fixed
    $discount = (float)$voucher['DiscountValue'];
}

if ($discount > $subTotal) {
    $discount = $subTotal;
}

$final = $subTotal - $discount;
if ($final < 0) $final = 0;

// --- Trả kết quả ---
json_response([
    'success'         => true,
    'voucher_id'      => (int)$voucher['VoucherID'],
    'code'            => $voucher['Code'],
    'discount_type'   => $voucher['DiscountType'],
    'discount_value'  => (float)$voucher['DiscountValue'],
    'discount_amount' => round($discount, 2),
    'final_amount'    => round($final, 2),
    'message'         => 'Áp dụng mã thành công.'
]);
