<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\get_one.php
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(['error' => 'Thiếu ID sản phẩm'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lấy thông tin sản phẩm + loại + địa chỉ shop
$stmt = $conn->prepare("
    SELECT P.*, C.CategoryName, U.Address AS ShopAddress
    FROM Product P
    LEFT JOIN Category C ON P.CategoryID = C.CategoryID
    LEFT JOIN Users U ON P.ShopID = U.UserID
    WHERE P.ProductID = ?
");
$stmt->bind_param("i", $id);
$stmt->execute();
$product = $stmt->get_result()->fetch_assoc();

if (!$product) {
    echo json_encode(['error' => 'Không tìm thấy sản phẩm'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!empty($product['ImageURL'])) {
    $product['ImageURL'] = '/' . ltrim($product['ImageURL'], '/');
}

// Lấy thư viện media (ảnh / video)
$media = [];
$stmtM = $conn->prepare("
    SELECT ProductImageID, MediaType, ImageURL, IsPrimary, SortOrder
    FROM ProductImage
    WHERE ProductID = ?
    ORDER BY IsPrimary DESC, SortOrder ASC, ProductImageID ASC
");
$stmtM->bind_param("i", $id);
$stmtM->execute();
$rs = $stmtM->get_result();
while ($row = $rs->fetch_assoc()) {
    $row['ImageURL'] = '/' . ltrim($row['ImageURL'], '/');
    $media[] = $row;
}

$product['Media'] = $media;

echo json_encode($product, JSON_UNESCAPED_UNICODE);
