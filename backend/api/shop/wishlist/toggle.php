<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\wishlist\toggle.php
require_once '../../../../includes/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['username'])) {
    fail('Bạn cần đăng nhập để thao tác với danh sách yêu thích.', 401);
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

// Đọc JSON
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$productId = (int)($data['ProductID'] ?? 0);
if ($productId <= 0) {
    fail('Thiếu ProductID.');
}

// Kiểm tra sản phẩm
$chk = $conn->prepare("SELECT ProductID FROM Product WHERE ProductID = ? LIMIT 1");
$chk->bind_param("i", $productId);
$chk->execute();
$exists = $chk->get_result()->num_rows > 0;
$chk->close();

if (!$exists) {
    fail('Sản phẩm không tồn tại.', 404);
}

// Toggle
$check = $conn->prepare("SELECT 1 FROM Wishlist WHERE UserID = ? AND ProductID = ? LIMIT 1");
$check->bind_param("ii", $userId, $productId);
$check->execute();
$existsWl = $check->get_result()->num_rows > 0;
$check->close();

$favorited = false;
$message   = '';

if ($existsWl) {
    // Xóa khỏi wishlist
    $del = $conn->prepare("DELETE FROM Wishlist WHERE UserID = ? AND ProductID = ?");
    $del->bind_param("ii", $userId, $productId);
    $del->execute();
    $del->close();

    $favorited = false;
    $message   = 'Đã bỏ khỏi danh sách yêu thích.';
} else {
    // Thêm vào wishlist
    $ins = $conn->prepare("INSERT INTO Wishlist (UserID, ProductID, CreatedAt) VALUES (?, ?, NOW())");
    $ins->bind_param("ii", $userId, $productId);
    $ins->execute();
    $ins->close();

    $favorited = true;
    $message   = 'Đã thêm vào danh sách yêu thích.';
}

// Đếm lại số người yêu thích sản phẩm này
$countStmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM Wishlist WHERE ProductID = ?");
$countStmt->bind_param('i', $productId);
$countStmt->execute();
$countRes = $countStmt->get_result()->fetch_assoc();
$countStmt->close();

$favoriteCount = (int)($countRes['cnt'] ?? 0);

echo json_encode([
    'success'        => true,
    'favorited'      => $favorited,      // true nếu vừa thêm, false nếu vừa bỏ
    'favorite_count' => $favoriteCount,  // dùng cho UI
    'message'        => $message
], JSON_UNESCAPED_UNICODE);
exit;
