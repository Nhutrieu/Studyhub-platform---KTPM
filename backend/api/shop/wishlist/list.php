<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\wishlist\list.php
require_once '../../../../includes/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['username'])) {
    fail('Bạn cần đăng nhập để xem danh sách yêu thích.', 401);
}

// Lấy UserID
$stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
$stmt->bind_param("s", $_SESSION['username']);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    fail('Không tìm thấy tài khoản người dùng.', 404);
}
$userId = (int)$user['UserID'];

// Lấy danh sách wishlist + thông tin sản phẩm
$sql = "
    SELECT 
        w.ProductID,
        w.CreatedAt,
        p.Name,
        p.Price,
        p.ImageURL,
        p.Stock,
        p.SoldCount,
        (SELECT COUNT(*) FROM Wishlist w2 WHERE w2.ProductID = w.ProductID) AS FavoriteCount
    FROM Wishlist w
    JOIN Product p ON w.ProductID = p.ProductID
    WHERE w.UserID = ?
    ORDER BY w.CreatedAt DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();

$items = [];
while ($row = $res->fetch_assoc()) {
    if (!empty($row['ImageURL'])) {
        $row['ImageURL'] = '/' . ltrim($row['ImageURL'], '/');
    } else {
        $row['ImageURL'] = '/HeThongChamSocCaKoi/assets/images/default_product.png';
    }
    $row['FavoriteCount'] = (int)($row['FavoriteCount'] ?? 0);
    $items[] = $row;
}

$stmt->close();

echo json_encode([
    'success' => true,
    'items'   => $items
], JSON_UNESCAPED_UNICODE);
