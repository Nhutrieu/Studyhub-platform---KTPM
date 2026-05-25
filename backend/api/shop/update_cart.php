<?php
/**
 * update_cart.php — Cập nhật số lượng sản phẩm trong giỏ hàng
 * Author: Giang (2025)
 */

require_once '../../../includes/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Bạn chưa đăng nhập']);
    exit;
}

$username = $_SESSION['username'];

// ✅ Lấy UserID
$stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$userID = $user['UserID'] ?? 0;

if (!$userID) {
    echo json_encode(['error' => 'Không tìm thấy người dùng']);
    exit;
}

// ✅ Đọc dữ liệu gửi lên
$data = $_POST['quantities'] ?? null;
if (!$data || !is_array($data)) {
    echo json_encode(['error' => 'Không có dữ liệu cập nhật']);
    exit;
}

$updated = 0;
foreach ($data as $cartID => $qty) {
    $qty = max(1, intval($qty)); // ít nhất là 1
    $stmt = $conn->prepare("UPDATE Cart SET Quantity=? WHERE CartID=? AND UserID=?");
    $stmt->bind_param("iii", $qty, $cartID, $userID);
    $stmt->execute();
    if ($stmt->affected_rows > 0) $updated++;
}

echo json_encode(['success' => true, 'updated' => $updated]);
?>
