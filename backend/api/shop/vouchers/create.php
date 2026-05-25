<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\create.php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once '../../../../includes/db.php';

// --- Helper: trả JSON và dừng ---
function json_response($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- Check login & quyền ---
$userId = $_SESSION['userid'] ?? $_SESSION['user_id'] ?? null;
$role   = $_SESSION['role']   ?? $_SESSION['Role']      ?? 'Customer';

if (!$userId || !in_array($role, ['Admin', 'Shop'])) {
    json_response(['success' => false, 'error' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'error' => 'Phương thức không hợp lệ.'], 405);
}

// --- Lấy dữ liệu input (JSON hoặc form) ---
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// --- Lấy & chuẩn hoá field ---
$code   = strtoupper(trim($data['Code'] ?? ''));
$name   = trim($data['Name'] ?? '');               // chỉ dùng để nhét vào Note
$desc   = trim($data['Description'] ?? '');
$scope  = $data['Scope'] ?? 'shop';                // với Shop sẽ bị overwrite

$discType  = $data['DiscountType'] ?? 'percent';
$discValue = (float)($data['DiscountValue'] ?? 0);
$maxDisc   = ($data['MaxDiscountAmount'] ?? '') !== '' ? (float)$data['MaxDiscountAmount'] : null;
$minOrder  = ($data['MinOrderAmount'] ?? '') !== '' ? (float)$data['MinOrderAmount'] : 0;

$startDate = trim($data['StartDate'] ?? '');
$endDate   = trim($data['EndDate'] ?? '');

$usageLimitTotal    = ($data['UsageLimitTotal']    ?? '') !== '' ? (int)$data['UsageLimitTotal']    : null;
$usageLimitPerUser  = ($data['UsageLimitPerUser']  ?? '') !== '' ? (int)$data['UsageLimitPerUser']  : null;

$noteInput = trim($data['Note'] ?? '');

// gộp Name + Description + Note vào cột Note (vì CSDL không có Name, Description)
$noteLines = [];
if ($name !== '') {
    $noteLines[] = '[Tên hiển thị] ' . $name;
}
if ($desc !== '') {
    $noteLines[] = '[Mô tả] ' . $desc;
}
if ($noteInput !== '') {
    $noteLines[] = $noteInput;
}
$noteToSave = implode("\n", $noteLines);

// Admin có thể tạo voucher hệ thống hoặc cho 1 shop cụ thể
$targetShopId = null;
if ($role === 'Admin') {
    if (($data['Scope'] ?? 'system') === 'system') {
        $scope = 'system';
        $targetShopId = null;
    } else {
        $scope = 'shop';
        $targetShopId = isset($data['ShopID']) && $data['ShopID'] !== '' ? (int)$data['ShopID'] : null;
        if (!$targetShopId) {
            json_response(['success' => false, 'error' => 'ShopID không hợp lệ cho voucher shop.']);
        }
    }
} else {
    // Shop chỉ được tạo voucher cho chính mình
    $scope = 'shop';
    $targetShopId = (int)$userId;
}

// --- Validate cơ bản ---
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

// --- Kiểm tra trùng mã (cùng scope / shop) ---
$sqlCheck = "SELECT VoucherID FROM Voucher 
             WHERE Code = ? AND Scope = ? AND IFNULL(ShopID,0) = IFNULL(?,0) 
             LIMIT 1";
$stmt = $conn->prepare($sqlCheck);
$shopIdForCheck = $targetShopId ?? 0;
$stmt->bind_param('ssi', $code, $scope, $shopIdForCheck);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    json_response(['success' => false, 'error' => 'Mã voucher này đã tồn tại.']);
}
$stmt->close();

// --- Insert (theo đúng CSDL hiện tại) ---
// Bảng Voucher:
// Code, Scope, ShopID, DiscountType, DiscountValue, MaxDiscountAmount,
// MinOrderAmount, StartDate, EndDate, UsageLimitTotal, UsageLimitPerUser,
// Status, CreatedByUserID, Note
$sql = "INSERT INTO Voucher (
    Code, Scope, ShopID,
    DiscountType, DiscountValue, MaxDiscountAmount, MinOrderAmount,
    StartDate, EndDate,
    UsageLimitTotal, UsageLimitPerUser,
    Status, CreatedByUserID, Note
) VALUES (
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?,
    ?, ?,
    ?, ?, ?
)";

$status = 'active';
$createdByUserId = (int)$userId;

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    'ssisdddssiisis',
    $code,
    $scope,
    $targetShopId,
    $discType,
    $discValue,
    $maxDisc,
    $minOrder,
    $startDate,
    $endDate,
    $usageLimitTotal,
    $usageLimitPerUser,
    $status,
    $createdByUserId,
    $noteToSave
);

if (!$stmt->execute()) {
    json_response(['success' => false, 'error' => 'Lỗi tạo voucher: ' . $stmt->error]);
}

$vId = $stmt->insert_id;
$stmt->close();

json_response([
    'success'     => true,
    'voucher_id'  => $vId,
    'message'     => 'Tạo voucher thành công.'
]);
