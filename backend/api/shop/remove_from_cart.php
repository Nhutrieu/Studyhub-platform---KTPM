<?php
/**
 * remove_from_cart.php — Xóa sản phẩm khỏi giỏ hàng
 * Author: Giang (cập nhật 2025)
 */

require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

// ✅ Kiểm tra đăng nhập
if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Bạn chưa đăng nhập']);
    exit;
}

$username = $_SESSION['username'];

// ⚠️ Lấy dữ liệu từ POST JSON Body
$data = json_decode(file_get_contents('php://input'), true);
$cartID = isset($data['cart_id']) ? (int)$data['cart_id'] : 0;

if ($cartID <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Thiếu ID giỏ hàng']);
    exit;
}

// ✅ Lấy UserID để đảm bảo người dùng chỉ được xóa giỏ hàng của mình
$stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Không tìm thấy người dùng']);
    exit;
}

$userID = $user['UserID'];

// ✅ Xóa sản phẩm thuộc về người dùng
$del = $conn->prepare("DELETE FROM Cart WHERE CartID = ? AND UserID = ?");
$del->bind_param("ii", $cartID, $userID);

if ($del->execute() && $del->affected_rows > 0) {
    // Luôn trả về JSON do luồng JS đã thay đổi
    echo json_encode(['success' => true, 'message' => 'Đã xóa sản phẩm khỏi giỏ hàng']);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Không thể xóa sản phẩm (hoặc không thuộc quyền sở hữu của bạn)']);
}
?>