<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\create_order_from_cart.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json');

// ✅ Kiểm tra đăng nhập
if (!isset($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập!']);
    exit;
}

$userID = (int)$_SESSION['userid'];

// ✅ Lấy phương thức thanh toán từ request
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$paymentMethod = $data['PaymentMethod'] ?? 'vietqr';

try {
    $conn->begin_transaction();

    // 🧾 Lấy thông tin nhận hàng mặc định từ Users
    $receiverName      = '';
    $receiverPhone     = '';
    $receiverAddress   = '';

    $uStmt = $conn->prepare("SELECT FullName, Phone, Address FROM Users WHERE UserID = ?");
    $uStmt->bind_param("i", $userID);
    $uStmt->execute();
    $userRow = $uStmt->get_result()->fetch_assoc();
    $uStmt->close();

    if (!empty($userRow)) {
        $receiverName      = $userRow['FullName'] ?? '';
        $receiverPhone     = $userRow['Phone'] ?? '';
        $receiverAddress   = $userRow['Address'] ?? '';
    }

    // 🛒 Lấy danh sách sản phẩm trong giỏ hàng + lock tồn kho
    $cartQuery = $conn->prepare("
        SELECT c.ProductID, c.Quantity, p.Price, p.Stock, p.Name
        FROM Cart c
        JOIN Product p ON c.ProductID = p.ProductID
        WHERE c.UserID = ?
        FOR UPDATE
    ");
    $cartQuery->bind_param("i", $userID);
    $cartQuery->execute();
    $cartResult = $cartQuery->get_result();

    if ($cartResult->num_rows === 0) {
        throw new Exception("Giỏ hàng trống!");
    }

    $totalAmount = 0;
    $cartItems   = [];

    while ($row = $cartResult->fetch_assoc()) {
        $productID = (int)$row['ProductID'];
        $qty       = (int)$row['Quantity'];
        $stock     = (int)$row['Stock'];

        if ($qty <= 0) {
            throw new Exception("Số lượng không hợp lệ cho sản phẩm ID {$productID}.");
        }

        if ($qty > $stock) {
            throw new Exception("Sản phẩm \"{$row['Name']}\" vượt quá số lượng tồn kho!");
        }

        $cartItems[] = $row;
        $totalAmount += ((float)$row['Price']) * $qty;
    }

    $cartQuery->close();

    // 🧾 Tạo đơn hàng
    $stmt = $conn->prepare("
        INSERT INTO Orders (UserID, ReceiverName, ReceiverPhone, ReceiverAddress, TotalAmount, PaymentMethod, Status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    ");
    $stmt->bind_param(
        "isssds",
        $userID,
        $receiverName,
        $receiverPhone,
        $receiverAddress,
        $totalAmount,
        $paymentMethod
    );
    $stmt->execute();
    $orderID = $stmt->insert_id;
    $stmt->close();

    // 📦 Thêm chi tiết đơn hàng
    $detailStmt = $conn->prepare("
        INSERT INTO OrderDetail (OrderID, ProductID, Quantity, UnitPrice)
        VALUES (?, ?, ?, ?)
    ");

    foreach ($cartItems as $item) {
        $pid   = (int)$item['ProductID'];
        $qty   = (int)$item['Quantity'];
        $price = (float)$item['Price'];

        $detailStmt->bind_param("iiid", $orderID, $pid, $qty, $price);
        $detailStmt->execute();

        // Tồn kho sẽ trừ sau khi thanh toán thành công (PayOS / VNPay / KoiPay...)
    }

    $detailStmt->close();

    // 🕒 Lưu lịch sử trạng thái đơn
    $note = 'Tạo đơn hàng từ giỏ hàng';
    $stmtHist = $conn->prepare("
        INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID)
        VALUES (?, NULL, 'Pending', ?, ?)
    ");
    $stmtHist->bind_param("isi", $orderID, $note, $userID);
    $stmtHist->execute();
    $stmtHist->close();

    // [ĐÃ XÓA] Logic xóa giỏ hàng ở đây đã được loại bỏ

    $conn->commit();

    echo json_encode([
        'success'      => true,
        'order_id'     => $orderID,
        'total_amount' => $totalAmount
    ]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}