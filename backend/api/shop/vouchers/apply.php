<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\apply.php

require_once '../../../../includes/db.php';
require_once __DIR__ . '/_calculate_discount.php';

header('Content-Type: application/json; charset=utf-8');

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$code    = isset($data['code']) ? trim($data['code']) : '';
$orderID = isset($data['order_id']) ? (int)$data['order_id'] : 0;
// amount từ FE gửi lên sẽ KHÔNG dùng tới nữa (tránh bị chỉnh tay)

if ($code === '' || $orderID <= 0) {
    echo json_encode([
        'success' => false,
        'error'   => 'Thiếu mã giảm giá hoặc đơn hàng không hợp lệ.'
    ]);
    exit;
}

// Lấy subtotal và UserID của đơn
$stmt = $conn->prepare("
    SELECT 
        COALESCE(SubTotal, TotalAmount) AS SubTotal,
        UserID
    FROM Orders
    WHERE OrderID = ?
    LIMIT 1
");
$stmt->bind_param("i", $orderID);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode([
        'success' => false,
        'error'   => 'Không tìm thấy đơn hàng.'
    ]);
    exit;
}

$subtotal = (float)$row['SubTotal'];
$userID   = (int)$row['UserID'];

$result = calculateVoucher($conn, $code, $subtotal, $orderID, $userID);

// Trả về cho FE hiển thị – KHÔNG lưu bất cứ thứ gì vào DB
echo json_encode($result);
exit;
