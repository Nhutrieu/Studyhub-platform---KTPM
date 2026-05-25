<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\order_detail.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Chỉ cho Shop hoặc Admin truy cập
if ($_SESSION['role'] !== 'Shop' && $_SESSION['role'] !== 'Admin') {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$shopId = $_SESSION['userid'];
$orderId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($orderId === 0) die("Đơn hàng không tồn tại.");

// 1. LẤY THÔNG TIN ĐƠN HÀNG & NGƯỜI MUA
// Lưu ý: Join với bảng Users để lấy info người mua thực tế
$sqlOrder = "
    SELECT 
        o.*, 
        u.FullName as BuyerName, u.Username as BuyerUser, u.Email as BuyerEmail, u.Phone as BuyerPhone,
        p.PaymentMethod as PayMethodDetail, p.PaymentStatus as PayStatusDetail, p.PaidAt
    FROM Orders o
    JOIN Users u ON o.UserID = u.UserID
    LEFT JOIN Payment p ON o.OrderID = p.OrderID
    WHERE o.OrderID = ?
";
$stmt = $conn->prepare($sqlOrder);
$stmt->bind_param("i", $orderId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$order) die("Không tìm thấy đơn hàng.");

// 2. LẤY CHI TIẾT SẢN PHẨM (CHỈ LẤY SẢN PHẨM CỦA SHOP NÀY)
// Tránh trường hợp đơn hàng gộp nhiều shop (nếu hệ thống sau này mở rộng)
$sqlItems = "
    SELECT od.*, p.Name as ProductName, p.ImageURL, p.Price, p.ShopID
    FROM OrderDetail od
    JOIN Product p ON od.ProductID = p.ProductID
    WHERE od.OrderID = ? AND p.ShopID = ?
";
$stmtItems = $conn->prepare($sqlItems);
$stmtItems->bind_param("ii", $orderId, $shopId);
$stmtItems->execute();
$resultItems = $stmtItems->get_result();
$items = [];
$subTotalShop = 0; // Tính lại tổng tiền hàng của riêng shop này
while ($row = $resultItems->fetch_assoc()) {
    $items[] = $row;
    $subTotalShop += $row['UnitPrice'] * $row['Quantity'];
}
$stmtItems->close();

// Nếu không có sản phẩm nào của shop trong đơn này (hack url)
if (empty($items) && $_SESSION['role'] !== 'Admin') {
    die("Bạn không có quyền xem đơn hàng này.");
}

// 3. TÍNH TOÁN TÀI CHÍNH (Hiển thị cho Shop xem lời lãi)
// Giả sử phí sàn được lưu trong Orders hoặc tính nóng (ở đây lấy từ DB nếu có, hoặc hiển thị tạm)
$platformFee = $order['PlatformFee'] ?? 0;
$netEarnings = $order['NetEarnings'] ?? ($subTotalShop - $platformFee);

$page_title = "Chi tiết đơn hàng #" . $orderId;
include '../../includes/header.php';
?>

<style>
    .order-detail-page { max-width: 1000px; margin: 30px auto; padding: 0 15px; }
    .card-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    
    .section-title { font-size: 1.1rem; font-weight: 700; color: #334155; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .info-item label { display: block; font-size: 0.85rem; color: #64748b; margin-bottom: 4px; }
    .info-item div { font-weight: 600; color: #0f172a; }

    /* Table Styles */
    .item-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .item-table th { text-align: left; padding: 12px; background: #f8fafc; color: #64748b; font-size: 0.9rem; border-bottom: 2px solid #e2e8f0; }
    .item-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .prod-img { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; margin-right: 10px; }
    .prod-name { font-weight: 500; display: flex; align-items: center; }

    /* Financial Summary */
    .financial-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-top: 20px; }
    .fin-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; }
    .fin-row.total { font-weight: 700; font-size: 1.1rem; border-top: 1px dashed #0ea5e9; padding-top: 10px; margin-top: 10px; color: #0284c7; }
    .fin-row.fee { color: #ef4444; }

    /* Badges */
    .badge { padding: 5px 12px; border-radius: 99px; font-size: 0.85rem; font-weight: 600; }
    .badge-PAID { background: #dcfce7; color: #166534; }
    .badge-PENDING { background: #fef9c3; color: #854d0e; }
    .badge-Completed { background: #dcfce7; color: #166534; }
    .badge-Dispute { background: #fee2e2; color: #991b1b; }

    /* Print Styles */
    @media print {
        header, nav, .btn-print, footer, .no-print { display: none !important; }
        .order-detail-page { margin: 0; padding: 0; max-width: 100%; }
        .card-box { border: none; box-shadow: none; padding: 0; margin-bottom: 30px; }
        body { background: white; }
    }
</style>

<div class="order-detail-page">
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;" class="no-print">
        <a href="orders_manage.php" style="text-decoration: none; color: #64748b; font-weight: 500;">&larr; Quay lại danh sách</a>
        <div>
            <button onclick="window.print()" class="btn-action" style="background: #334155; color: white; border:none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                🖨️ In hóa đơn
            </button>
        </div>
    </div>

    <!-- THÔNG TIN CHUNG -->
    <div class="card-box">
        <div class="section-title">
            <span>Thông tin đơn hàng #<?= $orderId ?></span>
            <span class="badge badge-<?= $order['Status'] ?>"><?= $order['Status'] ?></span>
        </div>
        <div class="info-grid">
            <div class="info-item">
                <label>Ngày đặt hàng</label>
                <div><?= date('d/m/Y H:i', strtotime($order['OrderDate'])) ?></div>
            </div>
            <div class="info-item">
                <label>Phương thức thanh toán</label>
                <div><?= $order['PaymentMethod'] ?></div>
            </div>
            <div class="info-item">
                <label>Trạng thái thanh toán</label>
                <div>
                    <?php if($order['PaymentStatus'] == 'PAID'): ?>
                        <span style="color: #16a34a;">✅ Đã thanh toán (<?= date('d/m/Y', strtotime($order['PaidAt'])) ?>)</span>
                    <?php else: ?>
                        <span style="color: #ea580c;">⏳ Chưa thanh toán</span>
                    <?php endif; ?>
                </div>
            </div>
            <div class="info-item">
                <label>Mã vận chuyển</label>
                <div><?= $order['ShippingCode'] ?: 'Chưa có' ?></div>
            </div>
        </div>
    </div>

    <!-- THÔNG TIN KHÁCH HÀNG & GIAO HÀNG -->
    <div class="card-box">
        <div class="section-title">Thông tin giao nhận</div>
        <div class="info-grid">
            <div class="info-item">
                <label>Người nhận</label>
                <div><?= htmlspecialchars($order['ReceiverName']) ?></div>
            </div>
            <div class="info-item">
                <label>Số điện thoại</label>
                <div><?= htmlspecialchars($order['ReceiverPhone']) ?></div>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <label>Địa chỉ giao hàng</label>
                <div><?= htmlspecialchars($order['ReceiverAddress']) ?></div>
            </div>
            <?php if($order['ShippingNote']): ?>
            <div class="info-item" style="grid-column: span 2;">
                <label>Ghi chú giao hàng</label>
                <div style="font-style: italic; color: #64748b;">"<?= htmlspecialchars($order['ShippingNote']) ?>"</div>
            </div>
            <?php endif; ?>
        </div>
        
        <!-- Thông tin người mua gốc (User account) -->
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;">
            <div class="info-item">
                <label>Tài khoản đặt hàng</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="https://ui-avatars.com/api/?name=<?= urlencode($order['BuyerName']) ?>&background=random" style="width: 24px; height: 24px; border-radius: 50%;">
                    <?= htmlspecialchars($order['BuyerName']) ?> (@<?= htmlspecialchars($order['BuyerUser']) ?>)
                    <a href="#" onclick="openChatWith(<?= $order['UserID'] ?>, '<?= htmlspecialchars($order['BuyerName']) ?>'); return false;" class="no-print" style="font-size: 0.8rem; color: #0ea5e9;">💬 Chat ngay</a>
                </div>
            </div>
        </div>
    </div>

    <!-- DANH SÁCH SẢN PHẨM -->
    <div class="card-box">
        <div class="section-title">Sản phẩm</div>
        <table class="item-table">
            <thead>
                <tr>
                    <th>Sản phẩm</th>
                    <th style="text-align: center;">Đơn giá</th>
                    <th style="text-align: center;">SL</th>
                    <th style="text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach($items as $item): 
                    $img = $item['ImageURL'] ? (str_starts_with($item['ImageURL'], '/') ? $item['ImageURL'] : '/HeThongChamSocCaKoi/' . $item['ImageURL']) : '/HeThongChamSocCaKoi/assets/images/default_product.png';
                ?>
                <tr>
                    <td>
                        <div class="prod-name">
                            <img src="<?= htmlspecialchars($img) ?>" class="prod-img">
                            <div>
                                <div><?= htmlspecialchars($item['ProductName']) ?></div>
                                <small style="color: #94a3b8;">ID: #<?= $item['ProductID'] ?></small>
                            </div>
                        </div>
                    </td>
                    <td style="text-align: center;"><?= number_format($item['UnitPrice']) ?> đ</td>
                    <td style="text-align: center;">x<?= $item['Quantity'] ?></td>
                    <td style="text-align: right; font-weight: 600;"><?= number_format($item['UnitPrice'] * $item['Quantity']) ?> đ</td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <!-- Bảng tính tài chính cho Shop -->
        <div class="financial-box">
            <div class="fin-row">
                <span>Tổng tiền hàng (Subtotal)</span>
                <span><?= number_format($subTotalShop) ?> đ</span>
            </div>
            
            <?php if($order['ShippingFeeEstimate'] > 0): ?>
            <div class="fin-row">
                <span>Phí vận chuyển (Thu của khách)</span>
                <span>+ <?= number_format($order['ShippingFeeEstimate']) ?> đ</span>
            </div>
            <?php endif; ?>

            <?php if($order['VoucherDiscount'] > 0): ?>
            <div class="fin-row fee">
                <span>Voucher giảm giá </span>
                <span>- <?= number_format($order['VoucherDiscount']) ?> đ</span>
            </div>
            <?php endif; ?>
            
            <!-- Phí sàn (Giả lập 5% nếu DB chưa lưu, hoặc lấy từ DB) -->
            <div class="fin-row fee">
                <span>Phí dịch vụ sàn (Platform Fee)</span>
                <span>- <?= number_format($platformFee) ?> đ</span>
            </div>

            <div class="fin-row total">
                <span>THỰC NHẬN (Net Earnings)</span>
                <span><?= number_format($netEarnings) ?> đ</span>
            </div>
            <div style="text-align: right; font-size: 0.8rem; color: #64748b; margin-top: 5px;">
                * Số tiền này sẽ được cộng vào ví Shop sau khi đơn hàng hoàn thành.
            </div>
        </div>
    </div>

    <!-- KHIẾU NẠI (NẾU CÓ) -->
    <?php if($order['Status'] == 'Dispute' || $order['Status'] == 'AdminReview' || $order['DisputeReason']): ?>
    <div class="card-box" style="border: 1px solid #fca5a5; background: #fef2f2;">
        <div class="section-title" style="color: #b91c1c; border-bottom-color: #fecaca;">⚠️ Thông tin khiếu nại</div>
        <div style="margin-bottom: 10px;">
            <strong>Lý do khách báo:</strong> <?= htmlspecialchars($order['DisputeReason']) ?>
        </div>
        <?php if($order['DisputeEvidence']): ?>
        <div>
            <strong>Bằng chứng:</strong>
            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <?php 
                $evidences = json_decode($order['DisputeEvidence'], true);
                if(is_array($evidences)) {
                    foreach($evidences as $ev) {
                        echo "<a href='$ev' target='_blank'><img src='$ev' style='height: 60px; border:1px solid #ccc;'></a>";
                    }
                } else {
                    echo "<a href='{$order['DisputeEvidence']}' target='_blank'>Xem bằng chứng</a>";
                }
                ?>
            </div>
        </div>
        <?php endif; ?>
        
        <?php if($order['AdminVerdict']): ?>
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #fecaca; color: #9a3412;">
            <strong>👮 Phán quyết của Admin:</strong> <?= htmlspecialchars($order['AdminVerdict']) ?>
        </div>
        <?php endif; ?>
    </div>
    <?php endif; ?>

</div>

<!-- Nhúng Chat Widget vào để nút Chat hoạt động -->
<?php include 'orders_manage.php_chat_partial.php'; // Hoặc include lại file chat_widget nếu cần ?>
<script src="/HeThongChamSocCaKoi/assets/js/chat/chat_widget.js"></script>

<?php include '../../includes/footer.php'; ?>