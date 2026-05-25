<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\edit.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

set_time_limit(300);

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['username'])) {
    fail('Chưa đăng nhập', 401);
}

// ===== CẤU HÌNH =====
$MAX_MAIN_IMAGE_MB = 10;   
$MAX_MEDIA_FILE_MB = 50;   
$LEVERAGE_RATIO    = 50; // Tỷ lệ đòn bẩy

$MAX_MAIN_IMAGE = $MAX_MAIN_IMAGE_MB * 1024 * 1024;
$MAX_MEDIA_FILE = $MAX_MEDIA_FILE_MB * 1024 * 1024;

// Lấy thông tin user + DepositBalance
$stmtUser = $conn->prepare("SELECT UserID, Role, DepositBalance FROM Users WHERE Username = ?");
$stmtUser->bind_param("s", $_SESSION['username']);
$stmtUser->execute();
$userRow = $stmtUser->get_result()->fetch_assoc();

$role   = $userRow['Role']   ?? 'Customer';
$userId = (int)($userRow['UserID'] ?? 0);
$depositBalance = (float)($userRow['DepositBalance'] ?? 0);

if (!in_array($role, ['Admin', 'Shop'])) {
    fail('Không có quyền chỉnh sửa sản phẩm', 403);
}

$ProductID  = (int)($_POST['ProductID']  ?? 0);
$CategoryID = (int)($_POST['CategoryID'] ?? 0);
$Name       = trim($_POST['Name']        ?? '');
$Description= trim($_POST['Description'] ?? '');
$Price      = (float)($_POST['Price']    ?? 0);
$Stock      = (int)($_POST['Stock']      ?? 0);
$CurrentImg = $_POST['CurrentImageURL']  ?? null;
$DeletedMediaIds = trim($_POST['DeletedMediaIds'] ?? '');

if ($ProductID <= 0 || $Name === '' || $CategoryID <= 0) {
    fail('Thiếu dữ liệu bắt buộc');
}

// Kiểm tra quyền sở hữu
$stmtCheck = $conn->prepare("SELECT ShopID FROM Product WHERE ProductID = ?");
$stmtCheck->bind_param("i", $ProductID);
$stmtCheck->execute();
$prodRow = $stmtCheck->get_result()->fetch_assoc();

if (!$prodRow) {
    fail('Sản phẩm không tồn tại', 404);
}

$ownerShopId = (int)($prodRow['ShopID'] ?? 0);
if ($role === 'Shop' && $ownerShopId !== $userId) {
    fail('Bạn không có quyền sửa sản phẩm của shop khác', 403);
}

// ===== 🔥 LOGIC MỚI: KIỂM TRA HẠN MỨC KÝ QUỸ =====
if ($role === 'Shop') {
    $maxAllowedPrice = $depositBalance * $LEVERAGE_RATIO;
    if ($Price > $maxAllowedPrice) {
        $needed = ceil(($Price - $maxAllowedPrice) / $LEVERAGE_RATIO);
        $msg = "Giá sản phẩm mới (" . number_format($Price) . "đ) vượt quá hạn mức bảo đảm.";
        $msg .= "\n• Số dư ký quỹ hiện tại: " . number_format($depositBalance) . "đ";
        $msg .= "\n• Giá trần cho phép (x$LEVERAGE_RATIO): " . number_format($maxAllowedPrice) . "đ";
        $msg .= "\n👉 Vui lòng nạp thêm tối thiểu " . number_format($needed) . "đ vào quỹ bảo đảm.";
        fail($msg, 400);
    }
}
// ==================================================

$uploadDir = '../../../../uploads/products/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

// ===== Ảnh đại diện =====
$ImageURL = $CurrentImg;

if (!empty($_FILES['ImageFile']['name'])) {
    $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
    $allowedImg = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','heic'];

    if (!in_array($ext, $allowedImg)) {
        fail('Định dạng ảnh đại diện không hợp lệ');
    }
    if (!empty($_FILES['ImageFile']['size']) && $_FILES['ImageFile']['size'] > $MAX_MAIN_IMAGE) {
        fail('Ảnh đại diện vượt quá ' . $MAX_MAIN_IMAGE_MB . 'MB');
    }

    $newName = 'product_main_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
    if (!move_uploaded_file($_FILES['ImageFile']['tmp_name'], $uploadDir . $newName)) {
        fail('Không lưu được ảnh đại diện');
    }
    $ImageURL = '/HeThongChamSocCaKoi/uploads/products/' . $newName;
}

$conn->begin_transaction();

try {
    // Update thông tin cơ bản
    $stmt = $conn->prepare("
        UPDATE Product
        SET CategoryID = ?, Name = ?, Description = ?, Price = ?, Stock = ?, ImageURL = ?
        WHERE ProductID = ?
    ");
    $stmt->bind_param("issdisi", $CategoryID, $Name, $Description, $Price, $Stock, $ImageURL, $ProductID);
    $stmt->execute();

    // ===== Thêm media mới =====
    if (!empty($_FILES['MediaFiles']['name']) && is_array($_FILES['MediaFiles']['name'])) {
        $allowedImg   = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','heic'];
        $allowedVideo = ['mp4','mov','avi','mkv','webm','flv','wmv','m4v','3gp'];

        $stmtMedia = $conn->prepare("
            INSERT INTO ProductImage (ProductID, MediaType, ImageURL, IsPrimary, SortOrder)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($_FILES['MediaFiles']['name'] as $i => $origName) {
            if ($_FILES['MediaFiles']['error'][$i] !== UPLOAD_ERR_OK) continue;

            $tmpName = $_FILES['MediaFiles']['tmp_name'][$i];
            $size    = (int)$_FILES['MediaFiles']['size'][$i];

            if ($size <= 0 || $size > $MAX_MEDIA_FILE) continue;

            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            $mediaType = null;

            if (in_array($ext, $allowedImg)) {
                $mediaType = 'image';
            } elseif (in_array($ext, $allowedVideo)) {
                $mediaType = 'video';
            } else {
                continue;
            }

            $baseName = 'media_' . $ProductID . '_' . time() . '_' . bin2hex(random_bytes(3));
            $newName  = $baseName . '.' . $ext;
            
            if (!move_uploaded_file($tmpName, $uploadDir . $newName)) continue;

            $absoluteDestPath = realpath($uploadDir . $newName);
            $mediaUrl  = '/HeThongChamSocCaKoi/uploads/products/' . $newName;
            $isPrimary = 0;
            $sortOrder = (int)$i;

            $stmtMedia->bind_param("issii", $ProductID, $mediaType, $mediaUrl, $isPrimary, $sortOrder);
            $stmtMedia->execute();
            
            $productImageId = $stmtMedia->insert_id;

            if ($mediaType === 'video' && $ext !== 'mp4') {
                $workerPath = __DIR__ . '/convert_worker.php';
                $cmd = sprintf('start /B php "%s" "%s" %d', $workerPath, $absoluteDestPath, $productImageId);
                pclose(popen($cmd, "r"));
            }
        }
    }

    // ===== Xóa media cũ =====
    if ($DeletedMediaIds !== '') {
        $ids = array_filter(array_map('intval', explode(',', $DeletedMediaIds)));
        if (!empty($ids)) {
            $idList = implode(',', $ids);
            $sqlDel = "DELETE FROM ProductImage WHERE ProductID = {$ProductID} AND ProductImageID IN ($idList)";
            $conn->query($sqlDel);
        }
    }

    $conn->commit();
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $conn->rollback();
    fail('Lỗi khi cập nhật sản phẩm: ' . $e->getMessage(), 500);
}