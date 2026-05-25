<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\update.php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
$sql = "SELECT * FROM Voucher WHERE VoucherID = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $voucherId);
$stmt->execute();
$rs = $stmt->get_result();
$voucher = $rs->fetch_assoc();
$stmt->close();

if (!$voucher) {
    json_response(['success' => false, 'error' => 'Không tìm thấy voucher.'], 404);
}

// Check quyền sở hữu
if ($role === 'Shop') {
    if ($voucher['Scope'] !== 'shop' || (int)$voucher['ShopID'] !== (int)$userId) {
        json_response(['success' => false, 'error' => 'Bạn không được phép sửa voucher này.'], 403);
    }
}

// --- Lấy dữ liệu mới ---
$name   = trim($data['Name'] ?? '');           // vẫn cho đi kèm Note
$desc   = trim($data['Description'] ?? '');

$discType  = $data['DiscountType'] ?? $voucher['DiscountType'];
$discValue = isset($data['DiscountValue']) ? (float)$data['DiscountValue'] : (float)$voucher['DiscountValue'];

$maxDisc   = array_key_exists('MaxDiscountAmount', $data)
             ? (($data['MaxDiscountAmount'] !== '') ? (float)$data['MaxDiscountAmount'] : null)
             : $voucher['MaxDiscountAmount'];

$minOrder  = isset($data['MinOrderAmount']) ? (float)$data['MinOrderAmount'] : (float)$voucher['MinOrderAmount'];

$startDate = $data['StartDate'] ?? $voucher['StartDate'];
$endDate   = $data['EndDate']   ?? $voucher['EndDate'];

$usageLimitTotal = array_key_exists('UsageLimitTotal', $data)
    ? (($data['UsageLimitTotal'] !== '') ? (int)$data['UsageLimitTotal'] : null)
    : $voucher['UsageLimitTotal'];

$usageLimitPerUser = array_key_exists('UsageLimitPerUser', $data)
    ? (($data['UsageLimitPerUser'] !== '') ? (int)$data['UsageLimitPerUser'] : null)
    : $voucher['UsageLimitPerUser'];

$noteInput = trim($data['Note'] ?? $voucher['Note']);

// Scope & ShopID chỉ cho Admin sửa (nếu thật sự cần)
$scope   = $voucher['Scope'];
$shopID  = $voucher['ShopID'];

if ($role === 'Admin' && isset($data['Scope'])) {
    if ($data['Scope'] === 'system') {
        $scope = 'system';
        $shopID = null;
    } elseif ($data['Scope'] === 'shop') {
        $scope = 'shop';
        if (isset($data['ShopID']) && $data['ShopID'] !== '') {
            $shopID = (int)$data['ShopID'];
        }
    }
}

// --- Validate tương tự create ---
if ($voucher['Code'] !== null) {
    // code mới: nếu gửi thì dùng, không thì dùng code cũ
}
$code = strtoupper(trim($data['Code'] ?? $voucher['Code']));

if ($code === '' || $name === '') {
    json_response(['success' => false, 'error' => 'Mã và tên voucher không được để trống.']);
}
if (!in_array($discType, ['percent', 'fixed'], true)) {
    json_response(['success' => false, 'error' => 'Loại giảm giá không hợp lệ.']);
}
if ($discValue <= 0) {
    json_response(['success' => false, 'error' => 'Giá trị giảm phải lớn hơn 0.']);
}
if ($discType === 'percent' && $discValue > 100) {
    json_response(['success' => false, 'error' => 'Giảm theo % không được lớn hơn 100%.']);
}
if ($startDate === '' || $endDate === '') {
    json_response(['success' => false, 'error' => 'Vui lòng chọn thời gian hiệu lực.']);
}
if (strtotime($endDate) <= strtotime($startDate)) {
    json_response(['success' => false, 'error' => 'Thời gian kết thúc phải sau thời gian bắt đầu.']);
}

// gộp Name/Description + Note
$noteLines = [];
if ($name !== '')  $noteLines[] = '[Tên hiển thị] ' . $name;
if ($desc !== '')  $noteLines[] = '[Mô tả] ' . $desc;
if ($noteInput !== '') $noteLines[] = $noteInput;
$noteToSave = implode("\n", $noteLines);

// Kiểm tra trùng mã (trừ chính nó)
$sqlCheck = "SELECT VoucherID FROM Voucher 
             WHERE Code = ? 
               AND Scope = ?
               AND IFNULL(ShopID,0) = IFNULL(?,0)
               AND VoucherID <> ?
             LIMIT 1";
$stmt = $conn->prepare($sqlCheck);
$shopCheck = $shopID ?? 0;
$stmt->bind_param('ssii', $code, $scope, $shopCheck, $voucherId);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    json_response(['success' => false, 'error' => 'Mã voucher này đã tồn tại.']);
}
$stmt->close();

// --- Update theo đúng CSDL hiện tại ---
$sql = "UPDATE Voucher
        SET Code = ?,
            Scope = ?,
            ShopID = ?,
            DiscountType = ?,
            DiscountValue = ?,
            MaxDiscountAmount = ?,
            MinOrderAmount = ?,
            StartDate = ?,
            EndDate = ?,
            UsageLimitTotal = ?,
            UsageLimitPerUser = ?,
            Note = ?,
            UpdatedAt = NOW()
        WHERE VoucherID = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    'ssisdddssiisi',
    $code,
    $scope,
    $shopID,
    $discType,
    $discValue,
    $maxDisc,
    $minOrder,
    $startDate,
    $endDate,
    $usageLimitTotal,
    $usageLimitPerUser,
    $noteToSave,
    $voucherId
);

if (!$stmt->execute()) {
    json_response(['success' => false, 'error' => 'Lỗi cập nhật voucher: ' . $stmt->error]);
}
$stmt->close();

json_response(['success' => true, 'message' => 'Cập nhật voucher thành công.']);
