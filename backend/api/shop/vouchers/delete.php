<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\delete.php
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

if (!$userId || !in_array($role, ['Admin', 'Shop'])) {
    json_response(['success' => false, 'error' => 'Bạn không có quyền.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    json_response(['success' => false, 'error' => 'Phương thức không hợp lệ.'], 405);
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

$voucherId = (int)($data['VoucherID'] ?? 0);
if ($voucherId <= 0) {
    json_response(['success' => false, 'error' => 'VoucherID không hợp lệ.']);
}

// --- Load voucher ---
$sql = "SELECT VoucherID, ShopID, Scope FROM Voucher WHERE VoucherID = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $voucherId);
$stmt->execute();
$rs = $stmt->get_result();
$voucher = $rs->fetch_assoc();
$stmt->close();

if (!$voucher) {
    json_response(['success' => false, 'error' => 'Không tìm thấy voucher.'], 404);
}

// Check quyền
if ($role === 'Shop') {
    if ($voucher['Scope'] !== 'shop' || (int)$voucher['ShopID'] !== (int)$userId) {
        json_response(['success' => false, 'error' => 'Bạn không được phép xoá voucher này.'], 403);
    }
}

// --- Kiểm tra đã có đơn sử dụng voucher chưa ---
$sql = "SELECT COUNT(*) AS Cnt FROM OrderVoucher WHERE VoucherID = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $voucherId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int)($row['Cnt'] ?? 0) > 0) {
    json_response([
        'success' => false,
        'error'   => 'Voucher này đã được sử dụng trong đơn hàng, không thể xoá. Hãy chuyển trạng thái sang "Ngừng hoạt động" thay vì xoá.'
    ]);
}

// --- Xoá voucher ---
$sql = "DELETE FROM Voucher WHERE VoucherID = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $voucherId);
if (!$stmt->execute()) {
    json_response(['success' => false, 'error' => 'Lỗi xoá voucher: ' . $stmt->error]);
}
$stmt->close();

json_response(['success' => true, 'message' => 'Xoá voucher thành công.']);
