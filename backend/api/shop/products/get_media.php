<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\get_media.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$productId = (int)($_GET['product_id'] ?? 0);
if ($productId <= 0) {
    echo json_encode(['items' => []], JSON_UNESCAPED_UNICODE);
    exit;
}

// Có thể kiểm tra role nếu muốn bảo mật chặt hơn, nhưng hiện tại
// JS chỉ gọi file này khi Admin/Shop mở form sửa.

$sql = "
    SELECT 
      ProductImageID,
      ProductID,
      MediaType,
      ImageURL,
      IsPrimary,
      SortOrder
    FROM ProductImage
    WHERE ProductID = ?
    ORDER BY SortOrder ASC, ProductImageID ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $productId);
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($row = $res->fetch_assoc()) {
    // Chuẩn hóa URL
    if (!empty($row['ImageURL'])) {
        $row['ImageURL'] = '/' . ltrim($row['ImageURL'], '/');
    }

    // Nếu bảng chưa có MediaType (hoặc null) thì suy ra từ đuôi file
    if (empty($row['MediaType'])) {
        $ext = strtolower(pathinfo($row['ImageURL'], PATHINFO_EXTENSION));
        $videoExt = ['mp4','mov','avi','mkv','webm','flv','wmv','m4v','3gp'];
        $row['MediaType'] = in_array($ext, $videoExt) ? 'video' : 'image';
    }

    $items[] = $row;
}

echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
