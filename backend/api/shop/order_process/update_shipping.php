<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\order_process\update_shipping.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['userid']) || !in_array($_SESSION['role'], ['Shop', 'Admin'])) {
    echo json_encode(['success' => false, 'error' => 'Không có quyền truy cập.']);
    exit;
}

$userId = $_SESSION['userid'];
$orderId = isset($_POST['order_id']) ? (int)$_POST['order_id'] : 0;
$carrier = trim($_POST['carrier'] ?? '');
$code    = trim($_POST['code'] ?? '');
$fee     = (float)($_POST['fee'] ?? 0);
$carrierContact = trim($_POST['carrier_contact'] ?? '');
$estimatedDate  = $_POST['estimated_date'] ?? null;
$shippingNote   = trim($_POST['shipping_note'] ?? '');

if ($orderId <= 0 || empty($carrier)) {
    echo json_encode(['success' => false, 'error' => 'Thiếu thông tin bắt buộc.']);
    exit;
}

// Upload ảnh
$evidencePath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../../../assets/uploads/shipping/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $fileName = 'ship_' . $orderId . '_' . time() . '.' . $ext;
    if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
        $evidencePath = '/HeThongChamSocCaKoi/assets/uploads/shipping/' . $fileName;
    }
}

try {
    $conn->begin_transaction();

    // Check Status & Payment
    $stmt = $conn->prepare("SELECT Status, PaymentStatus FROM Orders WHERE OrderID = ? FOR UPDATE");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) throw new Exception("Đơn hàng không tồn tại.");
    
    // 🔥 FIX: Chặn giao hàng nếu chưa thanh toán (Trừ khi bạn muốn hỗ trợ COD thì bỏ check PaymentStatus)
    if ($order['Status'] !== 'Processing') {
        throw new Exception("Trạng thái đơn hàng không hợp lệ.");
    }
    if ($order['PaymentStatus'] !== 'PAID') {
        throw new Exception("Đơn hàng chưa được thanh toán (PaymentStatus: " . $order['PaymentStatus'] . "). Không thể giao hàng.");
    }

    $sql = "UPDATE Orders SET Status = 'Shipped', ShippingCarrier=?, ShippingCode=?, ShippingFeeEstimate=?, CarrierContact=?, EstimatedArrival=?, ShippingNote=?";
    if ($evidencePath) $sql .= ", DeliveryImage=?";
    $sql .= " WHERE OrderID=?";

    $stmt = $conn->prepare($sql);
    if ($evidencePath) {
        $stmt->bind_param("ssdssssi", $carrier, $code, $fee, $carrierContact, $estimatedDate, $shippingNote, $evidencePath, $orderId);
    } else {
        $stmt->bind_param("ssdsssi", $carrier, $code, $fee, $carrierContact, $estimatedDate, $shippingNote, $orderId);
    }
    $stmt->execute();

    // Log
    $note = "Shop đã gửi hàng ($carrier - $code).";
    $conn->query("INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) VALUES ($orderId, 'Processing', 'Shipped', '$note', $userId)");

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Cập nhật giao hàng thành công!']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>