<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\create_order.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json');

// ✅ Bắt buộc đăng nhập
if (!isset($_SESSION['userid'])) {
  echo json_encode(['success' => false, 'error' => 'Bạn cần đăng nhập để mua hàng.']);
  exit;
}

$userID = (int)$_SESSION['userid'];

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?? [];

// Dữ liệu bắt buộc
$productID = isset($data['ProductID']) ? (int)$data['ProductID'] : 0;
$qty       = isset($data['Quantity']) ? (int)$data['Quantity'] : 0;
$method    = $data['PaymentMethod'] ?? 'vietqr';

// ✅ Dữ liệu nhận hàng (chuẩn bị cho flow mới, nếu chưa gửi thì fallback từ Users)
$receiverName    = trim($data['ReceiverName']    ?? '');
$receiverPhone   = trim($data['ReceiverPhone']   ?? '');
$receiverAddress = trim($data['ReceiverAddress'] ?? '');

if ($productID <= 0 || $qty <= 0) {
  echo json_encode(['success' => false, 'error' => 'Dữ liệu sản phẩm hoặc số lượng không hợp lệ.']);
  exit;
}

try {
  $conn->begin_transaction();

  // 🔒 Lấy thông tin sản phẩm + lock tồn kho để kiểm tra
  $stmt = $conn->prepare("
    SELECT Price, Stock
    FROM Product
    WHERE ProductID = ?
    FOR UPDATE
  ");
  $stmt->bind_param("i", $productID);
  $stmt->execute();
  $product = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  if (!$product) {
    throw new Exception('Sản phẩm không tồn tại.');
  }

  if ((int)$product['Stock'] < $qty) {
    throw new Exception('Số lượng đặt vượt quá tồn kho hiện tại.');
  }

  $unitPrice   = (float)$product['Price'];
  $totalAmount = $unitPrice * $qty; // ✅ Tính lại phía server, không tin client

  // 🧾 Nếu chưa có thông tin nhận hàng trong request, lấy từ hồ sơ Users
  if ($receiverName === '' || $receiverPhone === '' || $receiverAddress === '') {
    $uStmt = $conn->prepare("SELECT FullName, Phone, Address FROM Users WHERE UserID = ?");
    $uStmt->bind_param("i", $userID);
    $uStmt->execute();
    $userRow = $uStmt->get_result()->fetch_assoc();
    $uStmt->close();

    if ($receiverName === '' && !empty($userRow['FullName'])) {
      $receiverName = $userRow['FullName'];
    }
    if ($receiverPhone === '' && !empty($userRow['Phone'])) {
      $receiverPhone = $userRow['Phone'];
    }
    if ($receiverAddress === '' && !empty($userRow['Address'])) {
      $receiverAddress = $userRow['Address'];
    }
  }

  // ✅ Tạo đơn hàng (Status: Pending, PaymentStatus: default 'PENDING')
  $stmtOrder = $conn->prepare("
    INSERT INTO Orders (UserID, ReceiverName, ReceiverPhone, ReceiverAddress, TotalAmount, PaymentMethod, Status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
  ");
  $stmtOrder->bind_param(
    "isssds",
    $userID,
    $receiverName,
    $receiverPhone,
    $receiverAddress,
    $totalAmount,
    $method
  );
  $stmtOrder->execute();
  $orderID = $stmtOrder->insert_id;
  $stmtOrder->close();

  // 📦 Thêm chi tiết đơn hàng
  $stmtDetail = $conn->prepare("
    INSERT INTO OrderDetail (OrderID, ProductID, Quantity, UnitPrice)
    VALUES (?, ?, ?, ?)
  ");
  $stmtDetail->bind_param("iiid", $orderID, $productID, $qty, $unitPrice);
  $stmtDetail->execute();
  $stmtDetail->close();

  // ❌ KHÔNG GIẢM TỒN KHO Ở ĐÂY NỮA
  // Tồn kho sẽ chỉ trừ khi thanh toán THÀNH CÔNG (PayOS webhook / VNPay / KoiPay xử lý riêng)

  // 🕒 Ghi lịch sử trạng thái đơn
  $note = 'Tạo đơn hàng (mua ngay 1 sản phẩm)';
  $stmtHist = $conn->prepare("
    INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID)
    VALUES (?, NULL, 'Pending', ?, ?)
  ");
  $stmtHist->bind_param("isi", $orderID, $note, $userID);
  $stmtHist->execute();
  $stmtHist->close();

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
