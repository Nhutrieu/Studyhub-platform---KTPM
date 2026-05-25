<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\_calculate_discount.php
// MODULE TÍNH GIẢM GIÁ CHUẨN – KHÔNG CHẠM TỚI BẢNG ĐƠN HÀNG

date_default_timezone_set('Asia/Ho_Chi_Minh');

function calculateVoucher(mysqli $conn, string $code, float $subtotal, int $orderID, int $userID): array
{
    $code = strtoupper(trim($code));

    // Lấy shop của đơn (đơn hiện tại chỉ thuộc 1 shop)
    $qShop = $conn->prepare("
        SELECT DISTINCT p.ShopID
        FROM OrderDetail od 
        JOIN Product p ON p.ProductID = od.ProductID
        WHERE od.OrderID = ?
    ");
    $qShop->bind_param("i", $orderID);
    $qShop->execute();
    $resShop = $qShop->get_result()->fetch_assoc();
    $qShop->close();

    $orderShopID = $resShop ? (int)$resShop['ShopID'] : 0;

    // Tìm voucher phù hợp: system hoặc shop hiện tại
    $q = $conn->prepare("
        SELECT *
        FROM Voucher
        WHERE Code = ?
          AND Status = 'active'
          AND (
                Scope = 'system'
                OR (Scope = 'shop' AND ShopID = ?)
              )
        LIMIT 1
    ");
    $q->bind_param("si", $code, $orderShopID);
    $q->execute();
    $voucher = $q->get_result()->fetch_assoc();
    $q->close();

    if (!$voucher) {
        return [
            'success' => false,
            'error'   => 'Mã giảm giá không hợp lệ cho đơn hàng này.'
        ];
    }

    // Kiểm tra thời gian hiệu lực
    $now   = new DateTimeImmutable();
    $start = new DateTimeImmutable($voucher['StartDate']);
    $end   = new DateTimeImmutable($voucher['EndDate']);

    if ($now < $start) {
        return ['success' => false, 'error' => 'Mã giảm giá này chưa đến thời gian sử dụng.'];
    }
    if ($now > $end) {
        return ['success' => false, 'error' => 'Mã giảm giá này đã hết hạn.'];
    }

    // Kiểm tra đơn tối thiểu
    if ($subtotal < (float)$voucher['MinOrderAmount']) {
        return [
            'success' => false,
            'error'   => 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã.'
        ];
    }

    $voucherID = (int)$voucher['VoucherID'];

    // Giới hạn tổng lượt dùng – CHỈ TÍNH ĐƠN ĐÃ THANH TOÁN (PAID)
    if (!empty($voucher['UsageLimitTotal'])) {
        $q1 = $conn->prepare("
            SELECT COUNT(*) AS used_cnt
            FROM OrderVoucher ov
            JOIN Orders o ON o.OrderID = ov.OrderID
            WHERE ov.VoucherID = ?
              AND o.PaymentStatus = 'PAID'
        ");
        $q1->bind_param("i", $voucherID);
        $q1->execute();
        $row1 = $q1->get_result()->fetch_assoc();
        $q1->close();

        $usedTotal = (int)($row1['used_cnt'] ?? 0);
        if ($usedTotal >= (int)$voucher['UsageLimitTotal']) {
            return ['success' => false, 'error' => 'Mã giảm giá đã hết lượt sử dụng.'];
        }
    }

    // Giới hạn theo từng user – CHỈ TÍNH ĐƠN ĐÃ THANH TOÁN (PAID)
    if (!empty($voucher['UsageLimitPerUser'])) {
        $q2 = $conn->prepare("
            SELECT COUNT(*) AS used_cnt
            FROM OrderVoucher ov
            JOIN Orders o ON o.OrderID = ov.OrderID
            WHERE ov.VoucherID = ?
              AND o.UserID = ?
              AND o.PaymentStatus = 'PAID'
        ");
        $q2->bind_param("ii", $voucherID, $userID);
        $q2->execute();
        $row2 = $q2->get_result()->fetch_assoc();
        $q2->close();

        $usedUser = (int)($row2['used_cnt'] ?? 0);
        if ($usedUser >= (int)$voucher['UsageLimitPerUser']) {
            return ['success' => false, 'error' => 'Bạn đã dùng hết số lượt cho mã này.'];
        }
    }

    // Tính số tiền giảm
    $discount = 0.0;

    if ($voucher['DiscountType'] === 'percent') {
        $discount = $subtotal * ((float)$voucher['DiscountValue'] / 100);

        if (!empty($voucher['MaxDiscountAmount']) &&
            $discount > (float)$voucher['MaxDiscountAmount']) {
            $discount = (float)$voucher['MaxDiscountAmount'];
        }
    } else {
        // Giảm số tiền cố định
        $discount = (float)$voucher['DiscountValue'];
        if ($discount > $subtotal) {
            $discount = $subtotal;
        }
    }

    $final = $subtotal - $discount;

    return [
        'success'         => true,
        'message'         => 'Áp dụng mã thành công.',
        'discount_amount' => $discount,
        'final_total'     => $final,
        'voucher'         => [
            'id'   => $voucherID,
            'code' => $voucher['Code']
        ]
    ];
}
