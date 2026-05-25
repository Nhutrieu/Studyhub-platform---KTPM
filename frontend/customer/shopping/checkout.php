<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\customer\shopping\checkout.php

require_once '../../../includes/check_login.php';
require_once '../../../includes/db.php';

$userID = (int)($_SESSION['userid'] ?? 0);
$role = $_SESSION['role'] ?? 'Customer';

// Lấy orderID từ query (?order=...)
$orderID = isset($_GET['order']) ? (int)$_GET['order'] : 0;
if ($orderID <= 0) {
    die("❌ Mã đơn hàng không hợp lệ.");
}

$errors = [];

// ===========================
// 0. LẤY THÔNG TIN USER & CHECK TRẠNG THÁI VERIFY
// ===========================
// Cần lấy IsPhoneVerified để quyết định logic OTP
$stmtUserBasic = $conn->prepare("SELECT Phone, IsPhoneVerified, Address, FullName FROM Users WHERE UserID = ? LIMIT 1");
$stmtUserBasic->bind_param("i", $userID);
$stmtUserBasic->execute();
$currentUserData = $stmtUserBasic->get_result()->fetch_assoc();
$stmtUserBasic->close();

$isUserVerified = isset($currentUserData['IsPhoneVerified']) && (int)$currentUserData['IsPhoneVerified'] === 1;
$userStoredPhone = $currentUserData['Phone'] ?? '';

// ===========================
// XỬ LÝ SUBMIT FORM (POST)
// ===========================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $receiverName      = trim($_POST['receiver_name'] ?? '');
    $receiverPhone     = trim($_POST['receiver_phone'] ?? '');
    
    // --- LOGIC GHÉP ĐỊA CHỈ TỪ 4 TRƯỜNG ---
    $addrStreet = trim($_POST['addr_street'] ?? '');
    $addrWard   = trim($_POST['addr_ward'] ?? '');
    $addrDist   = trim($_POST['addr_dist'] ?? '');
    $addrProv   = trim($_POST['addr_prov'] ?? '');
    
    // Nếu user chọn từ dropdown thì ghép lại, nếu không thì dùng input cũ (fallback)
    if ($addrStreet && $addrWard && $addrDist && $addrProv) {
        $receiverAddress = "$addrStreet, $addrWard, $addrDist, $addrProv";
    } else {
        $receiverAddress = trim($_POST['receiver_address'] ?? '');
    }
    // ---------------------------------------------

    $paymentMethod   = strtolower($_POST['payment_method'] ?? 'vietqr');
    $appliedVoucher  = strtoupper(trim($_POST['voucher_code'] ?? ''));

    // --- [UPDATED] KIỂM TRA OTP ---
    // Logic: Nếu User chưa Verify trong DB HOẶC SĐT nhập khác SĐT trong DB
    // Thì bắt buộc phải check Session OTP
    $needOtpCheck = true;

    if ($isUserVerified && $receiverPhone === $userStoredPhone) {
        $needOtpCheck = false; // Bỏ qua OTP vì đã xác thực và đúng số
    }

    if ($needOtpCheck) {
        // Kiểm tra session OTP đã verify chưa và có đúng số điện thoại đang nhập không
        if (!isset($_SESSION['otp_verified']) || !$_SESSION['otp_verified'] || ($_SESSION['otp_phone'] ?? '') !== $receiverPhone) {
            $errors[] = "SĐT này chưa được xác thực. Vui lòng gửi và nhập mã OTP.";
        }
    }
    // -------------------------

    if ($receiverName === '')     $errors[] = "Vui lòng nhập họ tên người nhận.";
    if ($receiverPhone === '')    $errors[] = "Vui lòng nhập số điện thoại.";
    if ($receiverAddress === '') $errors[] = "Vui lòng nhập đầy đủ địa chỉ nhận hàng.";

    // Thêm koipay vào danh sách payment method hợp lệ
    if (!in_array($paymentMethod, ['vietqr', 'vnpay', 'koipay'], true)) {
        $paymentMethod = 'vietqr';
    }

    if (!$errors) {
        // Kiểm tra quyền & trạng thái đơn
        $stmt = $conn->prepare("
            SELECT UserID, PaymentStatus
            FROM Orders
            WHERE OrderID = ?
            LIMIT 1
        ");
        $stmt->bind_param("i", $orderID);
        $stmt->execute();
        $orderCheck = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$orderCheck) {
            $errors[] = "Đơn hàng không tồn tại.";
        } elseif ((int)$orderCheck['UserID'] !== $userID && $role !== 'Admin') {
            $errors[] = "Bạn không có quyền xử lý đơn hàng này.";
        } elseif (strtoupper((string)$orderCheck['PaymentStatus']) === 'PAID') {
            $errors[] = "Đơn hàng này đã được thanh toán.";
        } else {
            // Cập nhật thông tin nhận hàng + phương thức lên bảng Orders
            $status          = 'Pending';
            $paymentStatus = 'PENDING';

            $stmtUp = $conn->prepare("
                UPDATE Orders
                SET ReceiverName      = ?,
                    ReceiverPhone     = ?,
                    ReceiverAddress = ?,
                    PaymentMethod     = ?,
                    Status            = ?,
                    PaymentStatus     = ?
                WHERE OrderID = ? AND UserID = ?
            ");
            $stmtUp->bind_param(
                "ssssssii",
                $receiverName,
                $receiverPhone,
                $receiverAddress,
                $paymentMethod,
                $status,
                $paymentStatus,
                $orderID,
                $userID
            );
            $stmtUp->execute();
            $stmtUp->close();

            // Cập nhật Phone & Address cho hồ sơ user để lần sau auto fill
            // [UPDATED] Nếu verify qua OTP session thì cập nhật luôn IsPhoneVerified = 1
            $updateVerified = "";
            if (isset($_SESSION['otp_verified']) && $_SESSION['otp_verified'] && ($_SESSION['otp_phone'] ?? '') === $receiverPhone) {
                $updateVerified = ", IsPhoneVerified = 1";
            }

            $sqlUserUpdate = "UPDATE Users SET Phone = ?, Address = ? $updateVerified WHERE UserID = ?";
            $stmtUser = $conn->prepare($sqlUserUpdate);
            $stmtUser->bind_param("ssi", $receiverPhone, $receiverAddress, $userID);
            $stmtUser->execute();
            $stmtUser->close();

            // ==============================
            // ÁP MÃ GIẢM GIÁ KHI NHẤN THANH TOÁN
            // ==============================
            if ($appliedVoucher !== '') {
                require_once '../../../backend/api/shop/vouchers/_calculate_discount.php';

                // Lấy SubTotal gốc của đơn (nếu chưa có thì dùng TotalAmount hiện tại)
                $stmtAmt = $conn->prepare("
                    SELECT COALESCE(SubTotal, TotalAmount) AS SubTotal
                    FROM Orders
                    WHERE OrderID = ?
                    LIMIT 1
                ");
                $stmtAmt->bind_param("i", $orderID);
                $stmtAmt->execute();
                $rowAmt = $stmtAmt->get_result()->fetch_assoc();
                $stmtAmt->close();

                $subtotal = isset($rowAmt['SubTotal']) ? (float)$rowAmt['SubTotal'] : 0.0;
                if ($subtotal <= 0) {
                    $errors[] = "Không xác định được giá trị đơn hàng để áp dụng mã giảm giá.";
                } else {
                    // Tính lại voucher ở server để đảm bảo an toàn
                    $calc = calculateVoucher($conn, $appliedVoucher, $subtotal, $orderID, $userID);

                    if (!$calc['success']) {
                        $errors[] = $calc['error'] ?? 'Mã giảm giá không còn hợp lệ, vui lòng kiểm tra lại.';
                    } else {
                        $discount = (float)$calc['discount_amount'];
                        $final    = (float)$calc['final_total'];
                        $vID      = (int)$calc['voucher']['id'];
                        $vCode    = $calc['voucher']['code'];

                        // Xoá mọi voucher cũ của đơn (nếu có)
                        $del = $conn->prepare("DELETE FROM OrderVoucher WHERE OrderID = ?");
                        $del->bind_param("i", $orderID);
                        $del->execute();
                        $del->close();

                        // Lưu bản ghi OrderVoucher mới
                        $ins = $conn->prepare("
                            INSERT INTO OrderVoucher (OrderID, VoucherID, CodeSnapshot, DiscountAmount)
                            VALUES (?, ?, ?, ?)
                        ");
                        $ins->bind_param("iisd", $orderID, $vID, $vCode, $discount);
                        $ins->execute();
                        $ins->close();

                        // Cập nhật đơn hàng: SubTotal cố định, TotalAmount = số tiền phải trả, + snapshot mã
                        $upVoucher = $conn->prepare("
                            UPDATE Orders
                            SET SubTotal          = COALESCE(SubTotal, ?),
                                VoucherDiscount   = ?,
                                VoucherCodeSnapshot = ?,
                                TotalAmount       = ?
                            WHERE OrderID = ?
                        ");
                        $upVoucher->bind_param("ddsdi", $subtotal, $discount, $vCode, $final, $orderID);
                        $upVoucher->execute();
                        $upVoucher->close();
                    }
                }
            } else {
                // Nếu user KHÔNG chọn mã => xoá voucher cũ (nếu từng áp)
                $del = $conn->prepare("DELETE FROM OrderVoucher WHERE OrderID = ?");
                $del->bind_param("i", $orderID);
                $del->execute();
                $del->close();

                // Reset thông tin voucher về mặc định (TotalAmount = SubTotal nếu có)
                $stmtAmt = $conn->prepare("
                    SELECT COALESCE(SubTotal, TotalAmount) AS SubTotal
                    FROM Orders
                    WHERE OrderID = ?
                    LIMIT 1
                ");
                $stmtAmt->bind_param("i", $orderID);
                $stmtAmt->execute();
                $rowAmt = $stmtAmt->get_result()->fetch_assoc();
                $stmtAmt->close();

                if ($rowAmt) {
                    $subtotal = (float)$rowAmt['SubTotal'];
                    $reset = $conn->prepare("
                        UPDATE Orders
                        SET VoucherDiscount = 0,
                            VoucherCodeSnapshot = NULL,
                            TotalAmount = ?
                        WHERE OrderID = ?
                    ");
                    $reset->bind_param("di", $subtotal, $orderID);
                    $reset->execute();
                    $reset->close();
                }
            }

            // ==============================
            // SAU KHI XỬ LÝ XONG, ĐI THEO TỪNG PAYMENT METHOD
            // ==============================
            if (!$errors) {

                // ===== THANH TOÁN BẰNG VÍ KOIPAY =====
                if ($paymentMethod === 'koipay') {
                    // Lấy lại số tiền phải trả sau khi áp voucher
                    $stmtTotal = $conn->prepare("
                        SELECT TotalAmount 
                        FROM Orders 
                        WHERE OrderID = ? 
                        LIMIT 1
                    ");
                    $stmtTotal->bind_param("i", $orderID);
                    $stmtTotal->execute();
                    $rowTotal = $stmtTotal->get_result()->fetch_assoc();
                    $stmtTotal->close();

                    $amountToPay = isset($rowTotal['TotalAmount']) ? (float)$rowTotal['TotalAmount'] : 0;

                    if ($amountToPay < 0) {
                        $errors[] = "Số tiền thanh toán không hợp lệ.";
                    } else {
                        // Lấy số dư ví hiện tại của user
                        $stmtBal = $conn->prepare("SELECT AccountBalance FROM Users WHERE UserID = ? LIMIT 1");
                        $stmtBal->bind_param("i", $userID);
                        $stmtBal->execute();
                        $rowBal = $stmtBal->get_result()->fetch_assoc();
                        $stmtBal->close();

                        $currentBalance = isset($rowBal['AccountBalance']) ? (float)$rowBal['AccountBalance'] : 0;

                        if ($currentBalance < $amountToPay) {
                            $errors[] = "Số dư ví KoiPay không đủ để thanh toán đơn này. Vui lòng nạp thêm hoặc chọn phương thức khác.";
                        } else {
                            // Tiến hành trừ ví + tạo transaction + cập nhật trạng thái đơn
                            $conn->begin_transaction();
                            try {
                                // 1. Trừ tiền ví
                                $stmtUpdBal = $conn->prepare("
                                    UPDATE Users 
                                    SET AccountBalance = AccountBalance - ? 
                                    WHERE UserID = ?
                                ");
                                $stmtUpdBal->bind_param("di", $amountToPay, $userID);
                                $stmtUpdBal->execute();
                                $stmtUpdBal->close();

                                // 2. Ghi lịch sử giao dịch ví (CustomerTransactions)
                                $type = 'payment';
                                $desc = "Thanh toán đơn hàng #{$orderID} bằng ví KoiPay";
                                $stmtTrans = $conn->prepare("
                                    INSERT INTO CustomerTransactions (UserID, OrderID, Type, Amount, Description)
                                    VALUES (?, ?, ?, ?, ?)
                                ");
                                $stmtTrans->bind_param("iisds", $userID, $orderID, $type, $amountToPay, $desc);
                                $stmtTrans->execute();
                                $stmtTrans->close();

                                // 3. Cập nhật đơn: đã thanh toán bằng ví
                                $paidStatus     = 'Pending';
                                $paymentStatus2 = 'PAID';
                                $paymentMethodK = 'koipay';

                                $stmtUpdOrder = $conn->prepare("
                                    UPDATE Orders
                                    SET Status = ?, 
                                        PaymentStatus = ?, 
                                        PaymentMethod = ?
                                    WHERE OrderID = ?
                                ");
                                $stmtUpdOrder->bind_param("sssi", $paidStatus, $paymentStatus2, $paymentMethodK, $orderID);
                                $stmtUpdOrder->execute();
                                $stmtUpdOrder->close();
                                
                                // 4. [MỚI] Trừ tồn kho (Stock)
                                $conn->query("
                                    UPDATE Product p 
                                    JOIN OrderDetail od ON p.ProductID = od.ProductID
                                    SET p.Stock = GREATEST(p.Stock - od.Quantity, 0)
                                    WHERE od.OrderID = {$orderID}
                                ");

                                // 5. [MỚI] Xóa giỏ hàng của User
                                $conn->query("DELETE FROM Cart WHERE UserID = {$userID}");

                                $conn->commit();

                                // Chuyển tới trang thanks sau khi thành công
                                header("Location: /HeThongChamSocCaKoi/frontend/thanks.php?orderCode={$orderID}&status=PAID&code=00");
                                exit;

                            } catch (Throwable $e) {
                                $conn->rollback();
                                $errors[] = "Không thể thanh toán bằng ví KoiPay. Vui lòng thử lại sau.";
                            }
                        }
                    }

                    // Nếu có lỗi trong nhánh koipay thì KHÔNG redirect, để rơi xuống cuối render lại form
                } else {
                    // ===== CÁC CỔNG KHÁC (VietQR, VNPay) =====
                    // Lấy lại số tiền phải trả sau khi áp voucher (để truyền lên cổng thanh toán)
                    $stmtTotal = $conn->prepare("
                        SELECT TotalAmount 
                        FROM Orders 
                        WHERE OrderID = ? 
                        LIMIT 1
                    ");
                    $stmtTotal->bind_param("i", $orderID);
                    $stmtTotal->execute();
                    $rowTotal = $stmtTotal->get_result()->fetch_assoc();
                    $stmtTotal->close();

                    $amountToPay = isset($rowTotal['TotalAmount']) ? (float)$rowTotal['TotalAmount'] : 0;
                    
                    $pm = urlencode($paymentMethod);
                    header("Location: /HeThongChamSocCaKoi/backend/api/payment/create_payment.php?orderId={$orderID}&amount={$amountToPay}&payment_method={$pm}");
                    exit;
                }
            }
        }
    }
}

// ===========================
// LẤY THÔNG TIN ĐƠN + USER
// (Phần này giữ nguyên)
// ===========================
$stmtOrder = $conn->prepare("
    SELECT 
        o.OrderID, 
        o.UserID, 
        o.TotalAmount, 
        o.SubTotal,
        o.Status, 
        o.PaymentStatus,
        o.ReceiverName, 
        o.ReceiverPhone, 
        o.ReceiverAddress, 
        o.OrderDate,
        o.PaymentMethod,
        o.VoucherDiscount,
        o.VoucherCodeSnapshot,
        u.FullName, 
        u.Phone, 
        u.Address,
        u.AccountBalance,
        u.IsPhoneVerified -- [UPDATED] lấy thêm cột này
    FROM Orders o
    JOIN Users u ON u.UserID = o.UserID
    WHERE o.OrderID = ?
");
$stmtOrder->bind_param("i", $orderID);
$stmtOrder->execute();
$order = $stmtOrder->get_result()->fetch_assoc();
$stmtOrder->close();

if (!$order) {
    die("❌ Không tìm thấy đơn hàng.");
}

if ((int)$order['UserID'] !== $userID && $role !== 'Admin') {
    die("❌ Bạn không có quyền xem đơn hàng này.");
}

// Số dư ví hiện tại của user (để hiển thị)
$walletBalance = isset($order['AccountBalance']) ? (float)$order['AccountBalance'] : 0.0;

// ===========================
// [UPDATED] LOGIC AUTO FILL
// ===========================
// 1. Tìm thông tin từ đơn hàng thành công gần nhất của User này
$stmtLastOrder = $conn->prepare("
    SELECT ReceiverName, ReceiverPhone, ReceiverAddress 
    FROM Orders 
    WHERE UserID = ? 
        AND OrderID != ? 
        AND ReceiverAddress IS NOT NULL 
        AND ReceiverAddress != ''
    ORDER BY OrderID DESC 
    LIMIT 1
");
$stmtLastOrder->bind_param("ii", $userID, $orderID);
$stmtLastOrder->execute();
$lastOrder = $stmtLastOrder->get_result()->fetch_assoc();
$stmtLastOrder->close();

// 2. Logic ưu tiên: 
// - Nếu đơn hiện tại đã điền (do lưu dở) -> dùng nó.
// - Nếu không, dùng đơn hàng cũ gần nhất.
// - Nếu không, dùng thông tin profile.

$prefillName = $order['ReceiverName'];
if (!$prefillName && $lastOrder) $prefillName = $lastOrder['ReceiverName'];
if (!$prefillName) $prefillName = $order['FullName'];

$prefillPhone = $order['ReceiverPhone'];
if (!$prefillPhone && $lastOrder) $prefillPhone = $lastOrder['ReceiverPhone'];
if (!$prefillPhone) $prefillPhone = $order['Phone'];

$prefillAddress = $order['ReceiverAddress'];
if (!$prefillAddress && $lastOrder) $prefillAddress = $lastOrder['ReceiverAddress'];
if (!$prefillAddress) $prefillAddress = $order['Address'];

// Check trạng thái Verify cho frontend
$dbIsVerified = isset($order['IsPhoneVerified']) && (int)$order['IsPhoneVerified'] === 1;
// Nếu số điện thoại hiển thị KHỚP với số trong DB và user đã verify => Cho phép
$isPhoneTrusted = ($dbIsVerified && $prefillPhone === $order['Phone']);

// ===========================
// LẤY DANH SÁCH SẢN PHẨM CỦA ĐƠN
// ===========================
$stmtItems = $conn->prepare("
    SELECT 
        od.ProductID, od.Quantity, od.UnitPrice,
        p.Name, p.ImageURL
    FROM OrderDetail od
    JOIN Product p ON p.ProductID = od.ProductID
    WHERE od.OrderID = ?
");
$stmtItems->bind_param("i", $orderID);
$stmtItems->execute();
$resItems = $stmtItems->get_result();
$orderItems = [];
while ($row = $resItems->fetch_assoc()) {
    $orderItems[] = $row;
}
$stmtItems->close();

// Số tiền hiển thị: tạm tính & tổng thanh toán
$subTotalDisplay = isset($order['SubTotal']) && $order['SubTotal'] > 0
    ? (float)$order['SubTotal']
    : (float)$order['TotalAmount'];

$displayTotal = (float)$order['TotalAmount'];

$currentMethod = $order['PaymentMethod'] ?: 'vietqr';

$page_title = "Xác nhận thanh toán - Đơn #" . $orderID;

include '../../../includes/header.php';
?>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/shopping.css">
<!-- [MỚI] Axios để gọi API hành chính -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.1/axios.min.js"></script>

<style>
    .checkout-page {
        background: radial-gradient(circle at top left, #e0f7ff 0, #fdfcfb 35%, #f1f5f9 100%);
        min-height: calc(100vh - 70px);
        padding: 20px 0 40px;
    }
    .checkout-inner {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 16px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .checkout-header-title {
        margin: 0 0 6px;
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
    }
    .checkout-subtitle {
        margin: 0 0 18px;
        font-size: 13px;
        color: #6b7280;
    }
    .checkout-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        gap: 18px;
    }
    .checkout-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 16px 18px;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .checkout-card h2 {
        margin: 0 0 10px;
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
    }
    .checkout-card small {
        font-size: 12px;
        color: #6b7280;
    }

    .checkout-form-group {
        margin-top: 10px;
    }
    .checkout-form-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 4px;
    }
    .checkout-form-group input,
    .checkout-form-group textarea,
    .checkout-form-group select {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        padding: 8px 10px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
    }
    .checkout-form-group textarea {
        min-height: 70px;
        resize: vertical;
    }
    .checkout-form-group input:focus,
    .checkout-form-group textarea:focus,
    .checkout-form-group select:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 1px rgba(14,165,233,0.35);
    }

    .payment-methods {
        margin-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .payment-method-option {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
    }
    .payment-method-option input {
        margin-top: 3px;
    }
    .payment-method-option strong {
        font-size: 14px;
        color: #0f172a;
    }
    .payment-method-option span {
        display: block;
        font-size: 12px;
        color: #6b7280;
    }
    .payment-method-option:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
    }

    .order-items {
        margin-top: 8px;
        border-top: 1px dashed #e5e7eb;
        padding-top: 8px;
    }
    .order-item-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 6px 0;
    }
    .order-item-thumb img {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        object-fit: cover;
        border: 1px solid #e5e7eb;
    }
    .order-item-info {
        font-size: 13px;
    }
    .order-item-name {
        font-weight: 600;
        color: #0f172a;
    }
    .order-item-meta {
        font-size: 12px;
        color: #6b7280;
    }
    .order-item-total {
        font-size: 13px;
        font-weight: 600;
        color: #b91c1c;
        text-align: right;
    }

    .summary-box-rows {
        margin-top: 8px;
        font-size: 13px;
    }
    .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        color: #4b5563;
    }
    .summary-row.total {
        margin-top: 4px;
        padding-top: 6px;
        border-top: 1px dashed #e5e7eb;
        font-weight: 700;
        color: #b91c1c;
    }

    .btn-primary-full {
        width: 100%;
        border-radius: 999px;
        border: none;
        padding: 9px 14px;
        margin-top: 10px;
        background: linear-gradient(135deg, #0ea5e9, #0369a1);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 12px 30px rgba(14,165,233,0.55);
    }
    .btn-primary-full:hover {
        transform: translateY(-1px);
        box-shadow: 0 16px 40px rgba(14,165,233,0.7);
    }
    /* [MỚI] Style cho nút disabled */
    .btn-primary-full:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
        background: #cbd5e1;
        color: #64748b;
    }

    .btn-outline-link {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        margin-top: 8px;
        width: 100%;
        border-radius: 999px;
        padding: 8px 14px;
        border: 1px solid #cbd5e1;
        background: #fff;
        font-size: 13px;
        font-weight: 500;
        color: #0f172a;
        text-decoration: none;
    }
    .btn-outline-link:hover {
        background: #f9fafb;
    }

    .alert-error {
        margin-bottom: 12px;
        border-radius: 12px;
        padding: 8px 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        font-size: 13px;
    }
    .alert-error ul {
        margin: 0;
        padding-left: 18px;
    }

    .checkout-status {
        font-size: 12px;
        color: #6b7280;
        margin-top: 3px;
    }

    /* ==== VOUCHER UI ==== */
    .voucher-box {
        margin-top: 10px;
        padding: 10px 10px 8px;
        border-radius: 12px;
        background: #f9fafb;
        border: 1px dashed #cbd5e1;
    }
    .voucher-box-label {
        font-size: 12px;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 4px;
    }
    .voucher-row {
        display: flex;
        gap: 8px;
        align-items: center;
    }
    .voucher-row input[type="text"] {
        flex: 1;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        padding: 7px 10px;
        font-size: 13px;
        outline: none;
    }
    .voucher-row input[type="text"]:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 1px rgba(14,165,233,0.25);
    }
    .voucher-row button {
        border-radius: 999px;
        border: none;
        padding: 7px 12px;
        font-size: 13px;
        font-weight: 600;
        background: #0ea5e9;
        color: #fff;
        cursor: pointer;
        white-space: nowrap;
    }
    .voucher-row button:disabled {
        opacity: 0.6;
        cursor: default;
    }
    .voucher-message {
        margin-top: 4px;
        font-size: 11px;
        color: #6b7280;
    }
    .voucher-message.success {
        color: #15803d;
    }
    .voucher-message.error {
        color: #b91c1c;
    }

    /* [MỚI] Style cho Modal OTP */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 9999; }
    .modal-box { background: white; padding: 25px; border-radius: 16px; text-align: center; width: 90%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
    .otp-input { font-size: 24px; text-align: center; letter-spacing: 8px; width: 200px; margin: 20px auto; display: block; padding: 10px; border: 2px solid #0ea5e9; border-radius: 8px; }

    @media (max-width: 900px) {
        .checkout-layout {
            grid-template-columns: minmax(0, 1fr);
        }
    }
</style>

<div class="checkout-page">
    <div class="checkout-inner">
        <h1 class="checkout-header-title">Thanh toán đơn hàng #<?= htmlspecialchars($orderID) ?></h1>
        <p class="checkout-subtitle">
            Vui lòng kiểm tra thông tin nhận hàng, mã giảm giá và phương thức thanh toán trước khi tiếp tục.
        </p>

        <?php if ($errors): ?>
            <div class="alert-error">
                <strong>⚠️ Có lỗi xảy ra:</strong>
                <ul>
                    <?php foreach ($errors as $e): ?>
                        <li><?= htmlspecialchars($e) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form method="post" id="checkout-form">
            <div class="checkout-layout">
                <!-- Cột trái: thông tin nhận hàng + phương thức -->
                <div>
                    <div class="checkout-card">
                        <h2>Thông tin nhận hàng</h2>
                        <small>Hệ thống sử dụng thông tin này để giao hàng / liên hệ khi cần.</small>

                        <div class="checkout-form-group">
                            <label for="receiver_name">Họ và tên</label>
                            <input type="text" id="receiver_name" name="receiver_name"
                                    value="<?= htmlspecialchars($prefillName) ?>" required>
                        </div>

                        <!-- [MỚI] SĐT với OTP - Check trạng thái verify -->
                        <div class="checkout-form-group">
                            <label>Số điện thoại (Xác thực)</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="phone_input" name="receiver_phone" 
                                        value="<?= htmlspecialchars($prefillPhone) ?>" 
                                        required placeholder="Nhập SĐT..." style="flex:1;"
                                        oninput="checkPhoneMatch(this.value)">
                                
                                <?php if($isPhoneTrusted): ?>
                                    <!-- Nếu đã verify thì hiển thị nút màu xanh, không cho click -->
                                    <button type="button" id="btn-otp" disabled
                                        style="background: #22c55e; color: #fff; border: none; padding: 0 15px; border-radius: 10px; font-weight: 600; cursor: default;">
                                        ✅ Đã xác thực
                                    </button>
                                <?php else: ?>
                                    <!-- Nếu chưa verify thì hiện nút Gửi OTP -->
                                    <button type="button" onclick="sendOtp()" id="btn-otp" 
                                        style="background: #fbbf24; color: #000; border: none; padding: 0 15px; border-radius: 10px; cursor: pointer; font-weight: 600;">
                                        Gửi OTP
                                    </button>
                                <?php endif; ?>
                            </div>
                            
                            <!-- Lưu sđt gốc đã verify để JS so sánh -->
                            <input type="hidden" id="trusted_phone" value="<?= $isPhoneTrusted ? htmlspecialchars($prefillPhone) : '' ?>">
                            
                            <small id="otp-hint" style="color:#64748b; margin-top:4px; display:block;">
                                <?php if($isPhoneTrusted): ?>
                                    * Số điện thoại đã được xác thực từ hồ sơ.
                                <?php else: ?>
                                    * Bạn cần xác thực SĐT để đặt hàng.
                                <?php endif; ?>
                            </small>
                        </div>

                        <!-- [MỚI] Địa chỉ với 3 cấp (Tỉnh/Thành) -->
                        <div class="checkout-form-group">
                            <label>Địa chỉ nhận hàng</label>
                            
                            <!-- Input ẩn chứa địa chỉ đầy đủ (Fallback cho PHP) -->
                            <input type="text" name="receiver_address" id="full_address_input" 
                                    value="<?= htmlspecialchars($prefillAddress) ?>" 
                                    placeholder="Nhập địa chỉ đầy đủ nếu không chọn bên dưới..."
                                    style="margin-bottom: 10px; background: #f8fafc; font-style: italic;">

                            <div style="color:#64748b; font-size:12px; margin-bottom:5px;">Hoặc chọn chi tiết:</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                <select id="province" onchange="loadDist(this)">
                                    <option value="">-- Tỉnh/Thành phố --</option>
                                </select>
                                <select id="district" onchange="loadWard(this)">
                                    <option value="">-- Quận/Huyện --</option>
                                </select>
                            </div>
                            <select id="ward" onchange="setAddressNames()" style="margin-bottom:10px;">
                                <option value="">-- Phường/Xã --</option>
                            </select>
                            
                            <input type="text" name="addr_street" placeholder="Số nhà, tên đường...">

                            <!-- Hidden inputs để lưu tên địa chỉ gửi về PHP -->
                            <input type="hidden" name="addr_prov" id="h_prov">
                            <input type="hidden" name="addr_dist" id="h_dist">
                            <input type="hidden" name="addr_ward" id="h_ward">
                        </div>
                    </div>

                    <div class="checkout-card" style="margin-top: 14px;">
                        <h2>Phương thức thanh toán</h2>
                        <small>Hiện tại hệ thống hỗ trợ thanh toán online qua VietQR, VNPay và Ví KoiPay.</small>

                        <div class="payment-methods">
                            <label class="payment-method-option">
                                <input type="radio" name="payment_method" value="vietqr"
                                        <?= $currentMethod === 'vietqr' ? 'checked' : '' ?>>
                                <div>
                                    <strong>💰 VietQR (PayOS – chuyển khoản thật)</strong>
                                    <span>Quét mã QR bằng app ngân hàng, tiền chuyển thẳng vào tài khoản hệ thống KoiCare.</span>
                                </div>
                            </label>

                            <label class="payment-method-option">
                                <input type="radio" name="payment_method" value="vnpay"
                                        <?= $currentMethod === 'vnpay' ? 'checked' : '' ?>>
                                <div>
                                    <strong>💳 VNPay (môi trường test)</strong>
                                    <span>Phù hợp dùng thử luồng thanh toán, không trừ tiền thật.</span>
                                </div>
                            </label>

                            <label class="payment-method-option">
                                <input type="radio" name="payment_method" value="koipay"
                                        <?= $currentMethod === 'koipay' ? 'checked' : '' ?>>
                                <div>
                                    <strong>💼 Ví KoiPay (sử dụng số dư ví)</strong>
                                    <span>Số dư hiện tại: <b><?= number_format($walletBalance, 0, ',', '.') ?> đ</b>. Thanh toán trực tiếp từ ví của bạn.</span>
                                </div>
                            </label>
                        </div>

                        <div class="checkout-status">
                            Trạng thái đơn hiện tại:
                            <strong><?= htmlspecialchars($order['Status']) ?></strong>,
                            thanh toán:
                            <strong><?= htmlspecialchars($order['PaymentStatus']) ?></strong>
                        </div>
                    </div>
                </div>

                <!-- Cột phải: tóm tắt đơn hàng + mã giảm giá -->
                <aside>
                    <div class="checkout-card">
                        <h2>Tóm tắt đơn hàng</h2>
                        <div class="order-meta" style="font-size:12px;color:#6b7280;margin-bottom:4px;">
                            Đặt lúc: <?= htmlspecialchars(date('d/m/Y H:i', strtotime($order['OrderDate']))) ?>
                        </div>

                        <div class="order-items">
                            <?php foreach ($orderItems as $item):
                                $itemTotal = $item['Quantity'] * $item['UnitPrice'];
                                $img = $item['ImageURL']
                                    ? (str_starts_with($item['ImageURL'], '/') ? $item['ImageURL'] : '/' . ltrim($item['ImageURL'], '/'))
                                    : '/HeThongChamSocCaKoi/assets/images/default_product.png';
                            ?>
                                <div class="order-item-row">
                                    <div class="order-item-thumb">
                                        <img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($item['Name']) ?>">
                                    </div>
                                    <div class="order-item-info">
                                        <div class="order-item-name"><?= htmlspecialchars($item['Name']) ?></div>
                                        <div class="order-item-meta">
                                            SL: <?= (int)$item['Quantity'] ?> × <?= number_format($item['UnitPrice'], 0, ',', '.') ?> đ
                                        </div>
                                    </div>
                                    <div class="order-item-total">
                                        <?= number_format($itemTotal, 0, ',', '.') ?> đ
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>

                        <!-- Ô nhập mã giảm giá -->
                        <div class="voucher-box">
                            <div class="voucher-box-label">Mã giảm giá (nếu có)</div>
                            <div class="voucher-row">
                                <input type="text" id="voucher_code_input" placeholder="Nhập mã (vd: KOI7, FREESHIP...)">
                                <button type="button" id="apply-voucher-btn">Áp dụng</button>
                            </div>
                            <div id="voucher-message" class="voucher-message">
                                Mỗi đơn hàng chỉ áp dụng 1 mã giảm giá hợp lệ.
                            </div>
                        </div>

                        <!-- Tóm tắt tiền -->
                        <div class="summary-box-rows" id="summary-box">
                            <div class="summary-row">
                                <span>Tạm tính</span>
                                <span id="summary-subtotal-amount"><?= number_format($subTotalDisplay, 0, ',', '.') ?> đ</span>
                            </div>

                            <div class="summary-row" id="summary-discount-row" style="<?= $order['VoucherDiscount'] > 0 ? '' : 'display:none;' ?>">
                                <span>Giảm giá</span>
                                <span id="summary-discount-amount">
                                    <?= $order['VoucherDiscount'] > 0 ? '-' . number_format($order['VoucherDiscount'], 0, ',', '.') . ' đ' : '-0 đ' ?>
                                </span>
                            </div>

                            <div class="summary-row">
                                <span>Phí vận chuyển</span>
                                <span>Shop tự thoả thuận</span>
                            </div>

                            <div class="summary-row total">
                                <span>TỔNG THANH TOÁN</span>
                                <span id="summary-total-amount"><?= number_format($displayTotal, 0, ',', '.') ?> đ</span>
                            </div>
                        </div>

                        <!-- Hidden: lưu mã voucher đã áp dụng -->
                        <input type="hidden" name="voucher_code" id="voucher_code_hidden"
                                value="<?= htmlspecialchars($order['VoucherCodeSnapshot'] ?? '') ?>">

                        <button type="submit" id="btn-submit" class="btn-primary-full" 
                            <?= $isPhoneTrusted ? '' : 'disabled' ?> 
                            title="<?= $isPhoneTrusted ? '' : 'Vui lòng xác thực SĐT trước' ?>">
                            <?= $isPhoneTrusted ? '🔒 Hoàn tất đặt hàng' : '🔒 Vui lòng xác thực SĐT' ?>
                        </button>

                        <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/cart.php" class="btn-outline-link">
                            ⬅ Quay lại giỏ hàng
                        </a>
                        <!-- Thêm input ẩn để truyền số tiền phải trả lên cổng thanh toán -->
                        <input type="hidden" name="amount_to_pay" id="amount_to_pay" value="<?= $displayTotal ?>">
                    </div>
                </aside>
            </div>
        </form>
    </div>
</div>

<!-- Modal Nhập OTP -->
<div id="otpModal" class="modal-overlay">
    <div class="modal-box">
        <h3 style="font-size:18px; font-weight:700; color:#0f172a; margin-bottom:10px;">Xác thực OTP</h3>
        <p style="font-size:13px; color:#64748b; margin-bottom:20px;">Mã xác thực 6 số đã được gửi tới SĐT <b id="otp-phone-display"></b></p>
        <p id="otp-modal-error" style="color:red; font-size:12px; margin-bottom:10px; display:none;">
            <!-- Vị trí hiển thị lỗi OTP -->
        </p>
        
        <input type="text" id="otp_code" class="otp-input" placeholder="......" maxlength="6">
        
        <div style="display:flex; gap:10px; justify-content:center;">
            <button onclick="verifyOtp()" style="background:#0ea5e9; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600;">Xác nhận</button>
            <button onclick="document.getElementById('otpModal').style.display='none'" style="background:#f1f5f9; color:#64748b; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">Hủy bỏ</button>
        </div>
    </div>
</div>

<script>
// --- 1. JS LOGIC API ĐỊA CHỈ (Hành chính VN) ---
const host = "https://provinces.open-api.vn/api/";
axios.get(host + "?depth=1").then(r => {
    let html = '<option value="">-- Chọn Tỉnh/Thành --</option>';
    r.data.forEach(e => html += `<option value="${e.code}">${e.name}</option>`);
    document.getElementById('province').innerHTML = html;
});

function loadDist(el) {
    document.getElementById('h_prov').value = el.options[el.selectedIndex].text;
    if(!el.value) return;
    axios.get(host + "p/" + el.value + "?depth=2").then(r => {
        let html = '<option value="">-- Chọn Quận/Huyện --</option>';
        r.data.districts.forEach(e => html += `<option value="${e.code}">${e.name}</option>`);
        document.getElementById('district').innerHTML = html;
        document.getElementById('ward').innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    });
}

function loadWard(el) {
    document.getElementById('h_dist').value = el.options[el.selectedIndex].text;
    if(!el.value) return;
    axios.get(host + "d/" + el.value + "?depth=2").then(r => {
        let html = '<option value="">-- Chọn Phường/Xã --</option>';
        r.data.wards.forEach(e => html += `<option value="${e.code}">${e.name}</option>`);
        document.getElementById('ward').innerHTML = html;
    });
}

function setAddressNames() {
    const el = document.getElementById('ward');
    document.getElementById('h_ward').value = el.options[el.selectedIndex].text;
}

// --- 2. JS LOGIC OTP & PHONE CHECK (ĐÃ LOẠI BỎ ALERT) ---

// Hàm hiển thị lỗi OTP ở phần thông tin nhận hàng
function setPhoneError(message) {
    const hint = document.getElementById('otp-hint');
    hint.innerHTML = `<span style="color:red; font-weight:600;">* ${message}</span>`;
}

// Hàm kiểm tra xem SĐT nhập vào có khớp với SĐT đã trust không
function checkPhoneMatch(val) {
    const trusted = document.getElementById('trusted_phone').value;
    const btnOtp = document.getElementById('btn-otp');
    const btnSub = document.getElementById('btn-submit');
    const hint = document.getElementById('otp-hint');

    // Nếu không có trusted phone (user chưa verify bao giờ) -> luôn bắt gửi OTP
    if (!trusted) {
        hint.innerText = "* Bạn cần xác thực SĐT để đặt hàng.";
        return;
    }

    if (val === trusted) {
        // Khớp số đã verify -> Hiển thị "Đã xác thực"
        btnOtp.innerText = "✅ Đã xác thực";
        btnOtp.disabled = true;
        btnOtp.style.background = "#22c55e"; 
        btnOtp.style.color = "white";
        btnOtp.removeAttribute("onclick");
        
        btnSub.disabled = false;
        btnSub.innerHTML = "🔒 Hoàn tất đặt hàng";
        btnSub.title = "";
        
        hint.innerText = "* Số điện thoại đã được xác thực từ hồ sơ.";
    } else {
        // Đổi số khác -> Bắt gửi lại OTP
        btnOtp.innerText = "Gửi OTP";
        btnOtp.disabled = false;
        btnOtp.style.background = "#fbbf24"; 
        btnOtp.style.color = "#000";
        btnOtp.setAttribute("onclick", "sendOtp()");

        btnSub.disabled = true;
        btnSub.innerHTML = "🔒 Vui lòng xác thực SĐT";
        btnSub.title = "Số điện thoại thay đổi cần xác thực lại";

        hint.innerText = "* Số điện thoại thay đổi cần xác thực lại.";
    }
}

function sendOtp() {
    const ph = document.getElementById('phone_input').value;
    const btn = document.getElementById('btn-otp');
    
    // Clear lỗi cũ
    setPhoneError('Hệ thống đang gửi OTP...');
    btn.innerText = "Đang gửi..."; btn.disabled = true;

    if (!ph || ph.length < 10) {
        setPhoneError('Vui lòng nhập số điện thoại hợp lệ.');
        btn.innerText = "Gửi OTP"; btn.disabled = false;
        return; 
    }
    
    const fd = new FormData(); fd.append('action','send'); fd.append('phone', ph);
    fetch('/HeThongChamSocCaKoi/backend/api/auth/otp.php', {method:'POST', body:fd})
    .then(r=>r.json()).then(res => {
        if(res.success) {
            document.getElementById('otp-phone-display').innerText = ph;
            document.getElementById('otp-modal-error').style.display = 'none'; // Ẩn lỗi trong modal
            document.getElementById('otpModal').style.display = 'flex';
            setPhoneError('Mã OTP đã được gửi. Vui lòng kiểm tra tin nhắn.');
        } else {
            setPhoneError('Lỗi gửi OTP: ' + (res.error || "Không gửi được OTP."));
        }
        btn.innerText = "Gửi lại OTP"; btn.disabled = false;
    }).catch(e => { 
        console.error("Fetch error:", e);
        setPhoneError('Lỗi kết nối máy chủ khi gửi OTP. Vui lòng thử lại.');
        btn.innerText = "Gửi lại OTP"; btn.disabled = false;
    });
}

function verifyOtp() {
    const otp = document.getElementById('otp_code').value;
    const ph = document.getElementById('phone_input').value;
    const fd = new FormData(); fd.append('action','verify'); fd.append('phone', ph); fd.append('otp', otp);
    const errorEl = document.getElementById('otp-modal-error');

    errorEl.style.display = 'none';

    fetch('/HeThongChamSocCaKoi/backend/api/auth/otp.php', {method:'POST', body:fd})
    .then(r=>r.json()).then(res => {
        if(res.success) {
            document.getElementById('otpModal').style.display = 'none';
            
            // UI Update khi thành công
            const btnOtp = document.getElementById('btn-otp');
            btnOtp.innerText = "✅ Đã xác thực";
            btnOtp.disabled = true;
            btnOtp.style.background = "#22c55e"; 
            btnOtp.style.color = "white";
            
            // Mở nút submit
            const subBtn = document.getElementById('btn-submit');
            subBtn.disabled = false;
            subBtn.innerHTML = "✅ Hoàn tất đặt hàng";
            subBtn.title = "";
            
            setPhoneError('Xác thực SĐT thành công. Bạn có thể đặt hàng.');
        } else {
            errorEl.textContent = '❌ ' + (res.error || "Mã OTP không đúng. Vui lòng kiểm tra và nhập lại.");
            errorEl.style.display = 'block';
            document.getElementById('otp_code').value = ''; // Xóa mã nhập sai
        }
    });
}

// ====== JS APPLY VOUCHER (GIỮ NGUYÊN) ======
const ORDER_ID = <?= (int)$orderID ?>;
let originalTotal = <?= (float)$subTotalDisplay ?>;
let currentTotal  = <?= (float)$displayTotal ?>;
let currentDiscount = <?= (float)$order['VoucherDiscount'] ?>;

function formatCurrency(n) {
    return Number(n || 0).toLocaleString('vi-VN');
}

document.addEventListener('DOMContentLoaded', () => {
    const voucherInput        = document.getElementById('voucher_code_input');
    const applyBtn            = document.getElementById('apply-voucher-btn');
    const messageEl           = document.getElementById('voucher-message');
    const discountRow         = document.getElementById('summary-discount-row');
    const discountAmountEl    = document.getElementById('summary-discount-amount');
    const subtotalAmountEl    = document.getElementById('summary-subtotal-amount');
    const totalAmountEl       = document.getElementById('summary-total-amount');
    const hiddenVoucherInput  = document.getElementById('voucher_code_hidden');
    const amountToPayInput    = document.getElementById('amount_to_pay'); // [MỚI]

    // Nếu reload lại trang & đã có snapshot mã, set vào input
    if (hiddenVoucherInput.value) {
        voucherInput.value = hiddenVoucherInput.value;
    }

    if (!applyBtn) return;

    applyBtn.addEventListener('click', async () => {
        const code = voucherInput.value.trim().toUpperCase();

        if (!code) {
            messageEl.textContent = 'Vui lòng nhập mã giảm giá trước khi áp dụng.';
            messageEl.className   = 'voucher-message error';
            hiddenVoucherInput.value = '';
            return;
        }

        applyBtn.disabled = true;
        applyBtn.textContent = 'Đang áp dụng...';
        messageEl.textContent = '';
        messageEl.className   = 'voucher-message';

        try {
            const res = await fetch('/HeThongChamSocCaKoi/backend/api/shop/vouchers/apply.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    order_id: ORDER_ID,
                    amount: originalTotal // backend hiện tại bỏ qua, chỉ dùng subtotal từ DB
                })
            });

            const data = await res.json();

            if (!data.success) {
                messageEl.textContent = data.error || 'Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.';
                messageEl.className   = 'voucher-message error';

                hiddenVoucherInput.value = '';
                discountRow.style.display = 'none';
                discountAmountEl.textContent = '-0 đ';
                currentDiscount = 0;
                currentTotal = originalTotal;
                totalAmountEl.textContent = formatCurrency(currentTotal) + ' đ';
                amountToPayInput.value = currentTotal; // [MỚI] Cập nhật số tiền ẩn

                applyBtn.disabled = false;
                applyBtn.textContent = 'Áp dụng';
                return;
            }

            // Thành công
            currentDiscount = Number(data.discount_amount || 0);
            currentTotal    = Number(data.final_total || (originalTotal - currentDiscount));
            if (isNaN(currentDiscount)) currentDiscount = 0;
            if (isNaN(currentTotal))    currentTotal    = originalTotal - currentDiscount;

            hiddenVoucherInput.value = (data.voucher && data.voucher.code) ? data.voucher.code : code;

            messageEl.textContent = data.message || `Áp dụng mã ${hiddenVoucherInput.value} thành công.`;
            messageEl.className   = 'voucher-message success';

            discountRow.style.display = 'flex';
            discountAmountEl.textContent = '-' + formatCurrency(currentDiscount) + ' đ';
            subtotalAmountEl.textContent = formatCurrency(originalTotal) + ' đ';
            totalAmountEl.textContent    = formatCurrency(currentTotal) + ' đ';
            amountToPayInput.value = currentTotal; // [MỚI] Cập nhật số tiền ẩn

        } catch (err) {
            console.error(err);
            messageEl.textContent = 'Lỗi kết nối máy chủ khi áp dụng mã giảm giá.';
            messageEl.className   = 'voucher-message error';
            hiddenVoucherInput.value = '';
        } finally {
            applyBtn.disabled = false;
            applyBtn.textContent = 'Áp dụng';
        }
    });
});
</script>

<?php include '../../../includes/footer.php'; ?>