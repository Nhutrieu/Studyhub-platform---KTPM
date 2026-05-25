<?php
require_once '../../../includes/db.php';
require_once __DIR__ . '/config.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

// === Luôn tạo file log ===
$logFile = __DIR__ . '/payos_webhook_log.txt';
$logEntry = "\n\n==== [Webhook call at " . date('Y-m-d H:i:s') . "] ====\n";

try {
    $fh = fopen($logFile, 'a');
    fwrite($fh, $logEntry);
    fclose($fh);
} catch (Throwable $e) {
    error_log("Webhook log error: " . $e->getMessage());
}

// === Đọc dữ liệu JSON từ PayOS ===
$raw = file_get_contents('php://input');
file_put_contents($logFile, "Raw data: $raw\n", FILE_APPEND);

$payload = json_decode($raw, true);
if (!$payload || !isset($payload['data'])) {
    http_response_code(400);
    file_put_contents($logFile, "❌ ERROR: Invalid or missing payload\n", FILE_APPEND);
    exit("Invalid payload");
}

$data      = $payload['data'];
$signature = $payload['signature'] ?? '';

// Build chuỗi để verify chữ ký
ksort($data);
$parts = [];
foreach ($data as $k => $v) {
    if (is_array($v)) {
        $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    $parts[] = "$k=$v";
}
$signStr = implode('&', $parts);
$calc    = hash_hmac('sha256', $signStr, $config['payos']['checksum_key']);

file_put_contents(
    $logFile,
    "Signature check:\n- Received: $signature\n- Calculated: $calc\n",
    FILE_APPEND
);

if (!hash_equals($calc, $signature)) {
    file_put_contents($logFile, "❌ ERROR: Signature mismatch!\n", FILE_APPEND);
    http_response_code(401);
    exit("Invalid signature");
}

// === Dữ liệu thanh toán ===
$orderCode = intval($data['orderCode'] ?? 0);
$amount    = floatval($data['amount'] ?? 0);
$code      = $data['code'] ?? '';
$reference = $data['reference'] ?? '';
$txnTime   = $data['transactionDateTime'] ?? date('Y-m-d H:i:s');

file_put_contents(
    $logFile,
    "Data parsed:\n- OrderCode: $orderCode\n- Amount: $amount\n- Code: $code\n",
    FILE_APPEND
);

try {
    $conn->begin_transaction();

    // Tìm đơn hàng tương ứng
    $stmt = $conn->prepare("SELECT OrderID, UserID, TotalAmount FROM Orders WHERE OrderID = ?");
    $stmt->bind_param("i", $orderCode);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Không tìm thấy -> bỏ qua
    if (!$order) {
        file_put_contents($logFile, "⚠ OrderID $orderCode not found – Test webhook? Ignored.\n", FILE_APPEND);
        $conn->rollback();
        http_response_code(200);
        echo "IGNORED_NO_ORDER";
        exit;
    }

    // Sai số tiền -> bỏ qua
    if (floatval($order['TotalAmount']) != $amount) {
        file_put_contents($logFile, "⚠ Amount mismatch OrderID $orderCode.\n", FILE_APPEND);
        $conn->rollback();
        http_response_code(200);
        echo "IGNORED_AMOUNT_MISMATCH";
        exit;
    }

    if ($code === '00') {
        // ✅ THANH TOÁN THÀNH CÔNG
        $txnTimeEsc = $conn->real_escape_string($txnTime);
        $refEsc     = $conn->real_escape_string($reference);
        $userID     = (int)$order['UserID']; // Lấy UserID từ đơn hàng

        // 1. Update bảng Payment
        $conn->query("
            UPDATE Payment 
            SET PaymentStatus='PAID',
                PaymentDate='{$txnTimeEsc}',
                Reference='{$refEsc}',
                PaymentMethod='VietQR'
            WHERE OrderID = {$orderCode}
        ");

        // 2. Update bảng Orders (QUAN TRỌNG: Thêm PaymentStatus='PAID')
        $conn->query("
            UPDATE Orders 
            SET Status='Processing',       -- Chuyển trạng thái đơn sang 'Chờ xử lý'
                PaymentStatus='PAID'       -- <--- BỔ SUNG DÒNG NÀY
            WHERE OrderID = {$orderCode}
        ");

        // 3. Trừ tồn kho (Stock)
        $conn->query("
            UPDATE Product p 
            JOIN OrderDetail od ON p.ProductID = od.ProductID
            SET p.Stock = GREATEST(p.Stock - od.Quantity, 0)
            WHERE od.OrderID = {$orderCode}
        ");
        
        // 4. [MỚI] Xóa giỏ hàng của User sau khi thanh toán thành công
        if ($userID > 0) {
            $conn->query("DELETE FROM Cart WHERE UserID = {$userID}");
            file_put_contents($logFile, "☑ Cart deleted for UserID={$userID}\n", FILE_APPEND);
        }

        $conn->commit();
        file_put_contents($logFile, "✅ Payment SUCCESS and Cart Deleted for OrderID={$orderCode}\n", FILE_APPEND);
        http_response_code(200);
        echo "OK";

    } else {
        // ❌ THANH TOÁN THẤT BẠI / HUỶ
        $refEsc = $conn->real_escape_string($reference);

        // 1. Update bảng Payment
        $conn->query("
            UPDATE Payment 
            SET PaymentStatus='CANCELLED',
                Reference='{$refEsc}',
                PaymentMethod='VietQR'
            WHERE OrderID = {$orderCode}
        ");

        // 2. Update bảng Orders
        $conn->query("
            UPDATE Orders 
            SET Status='Cancelled',
                PaymentStatus='CANCELLED'  -- <--- BỔ SUNG DÒNG NÀY (hoặc FAILED)
            WHERE OrderID = {$orderCode}
        ");

        $conn->commit();
        file_put_contents($logFile, "❌ Payment CANCELLED for OrderID={$orderCode}\n", FILE_APPEND);
        http_response_code(200);
        echo "CANCEL";
    }

} catch (Exception $e) {
    $conn->rollback();
    file_put_contents($logFile, "❌ Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo "ERROR: " . $e->getMessage();
}