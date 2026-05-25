<?php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json');

// ✅ 1. Kiểm tra đăng nhập
if (!isset($_SESSION['username'])) {
    echo json_encode(['error' => 'Bạn chưa đăng nhập']);
    exit;
}

// ✅ 2. Lấy thông tin người dùng hiện tại
$username = $_SESSION['username'];
$user = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$user->bind_param("s", $username);
$user->execute();
$result_user = $user->get_result();
if ($result_user->num_rows === 0) {
    echo json_encode(['error' => 'Không tìm thấy tài khoản']);
    exit;
}
$uid = $result_user->fetch_assoc()['UserID'];

// ✅ 3. Lấy dữ liệu từ request JSON
$data = json_decode(file_get_contents("php://input"), true);
$productID = intval($data['ProductID'] ?? 0);
$quantity = intval($data['Quantity'] ?? 1);

if ($productID <= 0 || $quantity <= 0) {
    echo json_encode(['error' => 'Dữ liệu không hợp lệ']);
    exit;
}

// ✅ 4. Kiểm tra xem sản phẩm đã tồn tại trong giỏ chưa
$stmt = $conn->prepare("SELECT Quantity FROM Cart WHERE UserID=? AND ProductID=?");
$stmt->bind_param("ii", $uid, $productID);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    // 🔁 Nếu có rồi → tăng số lượng
    $update = $conn->prepare("UPDATE Cart SET Quantity = Quantity + ? WHERE UserID=? AND ProductID=?");
    $update->bind_param("iii", $quantity, $uid, $productID);
    $update->execute();
} else {
    // ➕ Nếu chưa có → thêm mới
    $insert = $conn->prepare("INSERT INTO Cart (UserID, ProductID, Quantity) VALUES (?, ?, ?)");
    $insert->bind_param("iii", $uid, $productID, $quantity);
    $insert->execute();
}

// ✅ 5. Đếm số mặt hàng khác nhau trong giỏ (distinct)
$count_stmt = $conn->prepare("SELECT COUNT(DISTINCT ProductID) AS distinct_items FROM Cart WHERE UserID=?");
$count_stmt->bind_param("i", $uid);
$count_stmt->execute();
$distinct = $count_stmt->get_result()->fetch_assoc()['distinct_items'] ?? 0;

// ✅ 6. Trả kết quả về client
echo json_encode([
    'success' => true,
    'message' => 'Đã thêm sản phẩm vào giỏ hàng',
    'distinct_count' => intval($distinct)
]);
