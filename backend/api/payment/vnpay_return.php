<?php
require_once("config.php");
require_once("../../../includes/db.php");
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2 style='text-align:center;margin-top:50px;'>";

// 1️⃣ Kiểm tra có phản hồi từ VNPay chưa
if (!isset($_GET['vnp_ResponseCode'])) {
    echo "❌ Không nhận được phản hồi từ VNPay!";
    exit;
}

$responseCode = $_GET['vnp_ResponseCode'];
$secureHash   = $_GET['vnp_SecureHash'] ?? '';

// ⚠️ Nếu người dùng hủy giao dịch (24) → chuyển hướng luôn, không cần xác minh chữ ký
if ($responseCode == '24') {
    header("Location: /HeThongChamSocCaKoi/frontend/cancel.php");
    exit;
}

// 2️⃣ Thu thập dữ liệu vnp_*
$inputData = [];
foreach ($_GET as $key => $value) {
    if (substr($key, 0, 4) == "vnp_") {
        $inputData[$key] = $value;
    }
}
unset($inputData['vnp_SecureHash']);
unset($inputData['vnp_SecureHashType']);
ksort($inputData);

// 🔒 Tạo lại chuỗi hash theo chuẩn VNPay SDK
$hashData = '';
foreach ($inputData as $key => $value) {
    $hashData .= $key . '=' . $value . '&';
}
$hashData = rtrim($hashData, '&');

// ✅ Tính hash kiểm tra
$verifiedHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

// 3️⃣ So sánh chữ ký
if ($verifiedHash !== $secureHash) {
    echo "❌ Lỗi xác thực chữ ký! Dữ liệu có thể đã bị thay đổi.";
    echo "<br><small>Vui lòng kiểm tra lại $vnp_HashSecret hoặc cấu hình TMNCode.</small>";
    exit;
}

// 4️⃣ Đọc thông tin đơn hàng
$orderID = intval($_GET['vnp_TxnRef'] ?? 0);
$amount  = floatval(($_GET['vnp_Amount'] ?? 0) / 100);
$bank    = $_GET['vnp_BankCode'] ?? '';
$txnId   = $_GET['vnp_TransactionNo'] ?? '';
$timePay = date('Y-m-d H:i:s');

// 5️⃣ Cập nhật database
try {
    $conn->begin_transaction();

    // Lấy đơn hàng
    $stmt = $conn->prepare("SELECT o.OrderID, o.TotalAmount FROM Orders o WHERE o.OrderID=?");
    $stmt->bind_param("i", $orderID);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) throw new Exception("Không tìm thấy đơn hàng");
    if (floatval($order['TotalAmount']) != $amount) throw new Exception("Số tiền không khớp");

    if ($responseCode == "00") {
        // ✅ Thành công
        $check = $conn->prepare("SELECT PaymentID FROM Payment WHERE OrderID=?");
        $check->bind_param("i", $orderID);
        $check->execute();
        $exists = $check->get_result()->fetch_assoc();

        if ($exists) {
            $update = $conn->prepare("
                UPDATE Payment 
                SET PaymentStatus='PAID', PaymentDate=?, Reference=?, PaymentMethod='VNPay', Bank=?
                WHERE OrderID=?");
            $update->bind_param("sssi", $timePay, $txnId, $bank, $orderID);
            $update->execute();
        } else {
            $insert = $conn->prepare("
                INSERT INTO Payment (UserID, OrderID, Amount, PaymentDate, PaymentStatus, PaymentMethod, Reference, Bank)
                SELECT o.UserID, o.OrderID, o.TotalAmount, ?, 'PAID', 'VNPay', ?, ?
                FROM Orders o WHERE o.OrderID=?");
            $insert->bind_param("sssi", $timePay, $txnId, $bank, $orderID);
            $insert->execute();
        }

        // Cập nhật đơn hàng
        $update2 = $conn->prepare("UPDATE Orders SET Status='Paid' WHERE OrderID=?");
        $update2->bind_param("i", $orderID);
        $update2->execute();

        // ✅ Trừ kho
        $updateStock = $conn->prepare("
            UPDATE Product p
            JOIN OrderDetail od ON p.ProductID = od.ProductID
            SET p.Stock = GREATEST(p.Stock - od.Quantity, 0)
            WHERE od.OrderID = ?");
        $updateStock->bind_param("i", $orderID);
        $updateStock->execute();

        $conn->commit();
        echo "✅ Thanh toán thành công!<br>Cảm ơn bạn đã mua hàng tại <b>Koi Care System</b>.";
    } else {
        // ❌ Thất bại
        $fail = $conn->prepare("
            UPDATE Payment 
            SET PaymentStatus='FAILED', PaymentDate=?, Reference=?, PaymentMethod='VNPay'
            WHERE OrderID=?");
        $fail->bind_param("ssi", $timePay, $txnId, $orderID);
        $fail->execute();

        $fail2 = $conn->prepare("UPDATE Orders SET Status='Failed' WHERE OrderID=?");
        $fail2->bind_param("i", $orderID);
        $fail2->execute();

        $conn->commit();
        echo "❌ Thanh toán thất bại!<br>Mã lỗi: " . htmlspecialchars($responseCode);
    }
} catch (Exception $e) {
    $conn->rollback();
    echo "⚠️ Lỗi xử lý giao dịch: " . htmlspecialchars($e->getMessage());
}

echo "</h2>";
?>
