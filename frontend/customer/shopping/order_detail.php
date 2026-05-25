<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\customer\shopping\order_detail.php
session_start();
require_once '../../../includes/db.php';
require_once '../../../includes/check_login.php';

$orderId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$userId = $_SESSION['userid'];

// 1. Lấy thông tin đơn hàng
$sql = "SELECT * FROM Orders WHERE OrderID = ? AND UserID = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $orderId, $userId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) exit("Không tìm thấy đơn hàng.");

// 2. Lấy chi tiết sản phẩm (Lấy thêm ShopID để biết chủ shop)
$sqlItems = "SELECT od.*, p.Name, p.ImageURL, p.ShopID 
             FROM OrderDetail od 
             JOIN Product p ON od.ProductID = p.ProductID 
             WHERE od.OrderID = ?";
$stmtItems = $conn->prepare($sqlItems);
$stmtItems->bind_param("i", $orderId);
$stmtItems->execute();
$resItems = $stmtItems->get_result();
$items = [];
while ($row = $resItems->fetch_assoc()) $items[] = $row;

// Xác định ShopID của đơn hàng này (Lấy từ sản phẩm đầu tiên)
$shopId = !empty($items) ? (int)$items[0]['ShopID'] : 0;

// 3. LOGIC MỚI: Lấy phản hồi của Shop (nếu có tranh chấp)
$shopResponse = "";
if (
    $order['Status'] == 'AdminReview' ||
    ($order['DisputeReason'] && ($order['Status'] == 'Completed' || $order['Status'] == 'Refunded'))
) {
    $stmtHist = $conn->prepare("
        SELECT Note 
        FROM OrderStatusHistory 
        WHERE OrderID = ? AND NewStatus = 'AdminReview' 
        ORDER BY ChangedAt DESC 
        LIMIT 1
    ");
    $stmtHist->bind_param("i", $orderId);
    $stmtHist->execute();
    $hist = $stmtHist->get_result()->fetch_assoc();
    if ($hist) {
        $shopResponse = $hist['Note'];
    }
}

$page_title = "Chi tiết đơn hàng #" . $orderId;
include '../../../includes/header.php';
?>

<style>
    /* === Order Detail Styles (Đã loại bỏ Chat CSS) === */
    .order-detail-container { max-width: 900px; margin: 30px auto; padding: 0 15px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding: 25px; margin-bottom: 20px; }
    .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
    
    .status-badge { padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
    .status-Pending { background: #fff7ed; color: #c2410c; }
    .status-Processing { background: #eff6ff; color: #1d4ed8; }
    .status-Shipped { background: #fef08a; color: #854d0e; }
    .status-Completed { background: #dcfce7; color: #15803d; }
    .status-Dispute { background: #fee2e2; color: #b91c1c; } 
    .status-AdminReview { background: #ffedd5; color: #9a3412; }
    .status-Refunded { background: #f3f4f6; color: #374151; text-decoration: line-through; }

    .shipping-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; margin-top: 20px; }
    .ship-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; }
    .ship-label { color: #64748b; }
    .ship-val { font-weight: 600; color: #0f172a; }
    
    .item-row { display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #f1f5f9; }
    .item-img { width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
    .item-info { flex: 1; }
    .item-price { font-weight: 600; }

    /* Dispute Section Styles */
    .dispute-timeline { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .dispute-header { background: #fee2e2; padding: 15px; font-weight: 700; color: #b91c1c; display: flex; align-items: center; gap: 10px; }
    .dispute-body { padding: 20px; background: #fff; }
    
    .d-step { margin-bottom: 20px; padding-left: 15px; border-left: 3px solid #e5e7eb; position: relative; }
    .d-step:last-child { margin-bottom: 0; border-left: none; }
    .d-step.active { border-left-color: #ef4444; }
    .d-title { font-weight: 700; color: #374151; margin-bottom: 5px; }
    .d-content { font-size: 0.95rem; color: #4b5563; background: #f9fafb; padding: 10px; border-radius: 8px; }
    
    .evidence-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .ev-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; cursor: pointer; }

    /* Action Buttons */
    .action-buttons { display: flex; gap: 10px; margin-top: 20px; }
    .btn-action { flex: 1; padding: 12px; border-radius: 8px; border: none; font-weight: 600; font-size: 1rem; cursor: pointer; transition: 0.2s; }
    .btn-confirm { background: #22c55e; color: white; }
    .btn-confirm:hover { background: #16a34a; }
    .btn-dispute { background: #ef4444; color: white; }
    .btn-dispute:hover { background: #dc2626; }

    /* Modal */
    .modal { display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
    .modal-content { background: #fff; margin: 5% auto; padding: 25px; width: 90%; max-width: 500px; border-radius: 12px; position: relative; }
    .close-modal { position: absolute; right: 20px; top: 15px; cursor: pointer; font-size: 24px; }
    .form-group { margin-bottom: 15px; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
</style>

<div class="order-detail-container">
    <a href="orders.php" style="color:#64748b; text-decoration:none;">&larr; Quay lại danh sách</a>
    <h1 style="margin-top:10px;">Chi tiết đơn hàng #<?= $orderId ?></h1>

    <div class="card">
        <div class="header-row">
            <div>
                <div style="font-size:0.9rem; color:#64748b;">
                    Ngày đặt: <?= date('d/m/Y H:i', strtotime($order['OrderDate'])) ?>
                </div>
                <div style="margin-top:5px;">
                    Thanh toán: <strong><?= htmlspecialchars($order['PaymentMethod']) ?></strong>
                </div>
            </div>
            
            <?php 
                $statusLabel = $order['Status'];
                if ($order['Status'] == 'Dispute')      $statusLabel = 'ĐANG KHIẾU NẠI';
                if ($order['Status'] == 'AdminReview') $statusLabel = 'CHỜ ADMIN PHÁN QUYẾT';
                if ($order['Status'] == 'Refunded')     $statusLabel = 'ĐÃ HOÀN TIỀN';
            ?>
            <span class="status-badge status-<?= $order['Status'] ?>">
                <?= $statusLabel ?>
            </span>
        </div>

        <h3>Sản phẩm</h3>
        <?php foreach ($items as $item): 
            $img = $item['ImageURL']
                ? (str_starts_with($item['ImageURL'], '/') ? $item['ImageURL'] : '/' . ltrim($item['ImageURL'], '/'))
                : '/HeThongChamSocCaKoi/assets/images/default_product.png';
        ?>
        <div class="item-row">
            <img src="<?= htmlspecialchars($img) ?>" class="item-img" alt="<?= htmlspecialchars($item['Name']) ?>">
            <div class="item-info">
                <div style="font-weight:600;"><?= htmlspecialchars($item['Name']) ?></div>
                <div style="color:#64748b; font-size:0.9rem;">x <?= (int)$item['Quantity'] ?></div>
            </div>
            <div class="item-price"><?= number_format($item['UnitPrice']) ?> đ</div>
        </div>
        <?php endforeach; ?>
        
        <div style="text-align:right; margin-top:15px; font-size:1.2rem; font-weight:700; color:#b91c1c;">
            Tổng tiền: <?= number_format($order['TotalAmount']) ?> đ
        </div>

        <?php if ($order['ShippingCarrier']): ?>
        <div class="shipping-box">
            <h3>🚚 Thông tin vận chuyển</h3>
            <div class="ship-row">
                <span class="ship-label">Nhà xe:</span>
                <span class="ship-val"><?= htmlspecialchars($order['ShippingCarrier']) ?></span>
            </div>
            <div class="ship-row">
                <span class="ship-label">Mã vận đơn:</span>
                <span class="ship-val"><?= htmlspecialchars($order['ShippingCode']) ?></span>
            </div>
            
            <?php if ($order['CarrierContact']): ?>
            <div class="ship-row">
                <span class="ship-label">Liên hệ:</span>
                <span class="ship-val">
                    <a href="tel:<?= htmlspecialchars($order['CarrierContact']) ?>">
                        <?= htmlspecialchars($order['CarrierContact']) ?>
                    </a>
                </span>
            </div>
            <?php endif; ?>

            <?php if ($order['EstimatedArrival']): ?>
            <div class="ship-row">
                <span class="ship-label">Dự kiến đến:</span>
                <span class="ship-val" style="color:#0ea5e9;">
                    <?= date('H:i - d/m/Y', strtotime($order['EstimatedArrival'])) ?>
                </span>
            </div>
            <?php endif; ?>

            <?php if ($order['ShippingNote']): ?>
            <div class="ship-row" style="display:block; margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:10px;">
                <span class="ship-label">📝 Hướng dẫn:</span>
                <span class="ship-val" style="font-weight:400;">
                    <?= nl2br(htmlspecialchars($order['ShippingNote'])) ?>
                </span>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php if (
            $order['Status'] == 'Dispute' ||
            $order['Status'] == 'AdminReview' ||
            ($order['DisputeReason'] && ($order['Status'] == 'Completed' || $order['Status'] == 'Refunded'))
        ): ?>
            
            <div class="dispute-timeline">
                <div class="dispute-header">🚨 TIẾN TRÌNH GIẢI QUYẾT KHIẾU NẠI</div>
                <div class="dispute-body">
                    
                    <div class="d-step active">
                        <div class="d-title">1. Bạn đã gửi yêu cầu:</div>
                        <div class="d-content">
                            <strong>Lý do:</strong> <?= htmlspecialchars($order['DisputeReason']) ?>
                            <div class="evidence-grid">
                                <?php 
                                    // Xử lý hiển thị nhiều ảnh JSON
                                    $files = json_decode($order['DisputeEvidence'], true);
                                    if (is_array($files)) {
                                        foreach($files as $f) {
                                            $safe = htmlspecialchars($f);
                                            echo "<a href='{$safe}' target='_blank'><img src='{$safe}' class='ev-thumb'></a>";
                                        }
                                    } else {
                                        // Fallback data cũ (chỉ 1 file)
                                        if ($order['DisputeEvidence']) {
                                            $safe = htmlspecialchars($order['DisputeEvidence']);
                                            echo "<a href='{$safe}' target='_blank'><img src='{$safe}' class='ev-thumb'></a>";
                                        }
                                    }
                                ?>
                            </div>
                        </div>
                    </div>

                    <?php if ($order['Status'] == 'AdminReview' || $order['Status'] == 'Refunded' || ($order['Status'] == 'Completed' && $order['DisputeReason'])): ?>
                        <div class="d-step active">
                            <div class="d-title">2. Phản hồi từ Shop:</div>
                            <div class="d-content" style="background:#fff1f2; color:#b91c1c;">
                                <?php if ($order['Status'] == 'Refunded' && !$shopResponse): ?>
                                    <em>Shop đã chấp nhận hoàn tiền.</em>
                                <?php else: ?>
                                    <strong>Shop từ chối với lý do:</strong><br>
                                    <?= htmlspecialchars($shopResponse ?: "Đang chờ admin trích xuất dữ liệu...") ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="d-step">
                            <div class="d-title" style="color:#9ca3af;">2. Chờ Shop phản hồi...</div>
                        </div>
                    <?php endif; ?>

                    <?php if ($order['Status'] == 'AdminReview'): ?>
                        <div class="d-step">
                            <div class="d-title" style="color:#d97706;">3. ⚖️ Đang chờ Admin phán quyết...</div>
                            <div class="d-content">Admin đang xem xét bằng chứng hai bên. Vui lòng chờ.</div>
                        </div>
                    <?php elseif ($order['Status'] == 'Refunded'): ?>
                        <div class="d-step active">
                            <div class="d-title" style="color:#16a34a;">3. Kết quả: Hoàn tiền</div>
                            <div class="d-content">Tiền sẽ được hoàn về ví/tài khoản của bạn.</div>
                        </div>
                    <?php elseif ($order['Status'] == 'Completed' && $order['DisputeReason']): ?>
                        <div class="d-step active">
                            <div class="d-title" style="color:#b91c1c;">3. Kết quả: Khiếu nại bị từ chối</div>
                            <div class="d-content">Admin phán quyết Shop thắng. Tiền đã chuyển cho Shop.</div>
                        </div>
                    <?php endif; ?>

                </div>
            </div>

        <?php endif; ?>

        <?php if ($order['Status'] == 'Shipped'): ?>
            <div class="action-buttons">
                <button class="btn-action btn-dispute" onclick="openDisputeModal()">🚨 Khiếu nại / Hoàn tiền</button>
                <button class="btn-action btn-confirm" onclick="confirmReceipt(<?= $orderId ?>)">✅ Đã nhận (Cá khỏe)</button>
            </div>
        <?php endif; ?>

    </div>
</div>

<!-- Modal Khiếu nại -->
<div id="disputeModal" class="modal">
    <div class="modal-content">
        <span class="close-modal" onclick="document.getElementById('disputeModal').style.display='none'">&times;</span>
        <h2 style="color:#b91c1c;">🚨 Yêu cầu hoàn tiền</h2>
        <form id="disputeForm" onsubmit="submitDispute(event)">
            <input type="hidden" name="order_id" value="<?= $orderId ?>">
            
            <div class="form-group">
                <label>Lý do khiếu nại (Cá chết, sai loại...)</label>
                <textarea name="reason" rows="3" required placeholder="Mô tả chi tiết tình trạng cá..."></textarea>
            </div>
            
            <div class="form-group">
                <label>Ảnh/Video bằng chứng (Bắt buộc)</label>
                <input type="file" name="evidence[]" accept="image/*,video/*" multiple required>
                <small style="color:#64748b;">Giữ phím <strong>Ctrl</strong> để chọn nhiều ảnh/video cùng lúc.</small>
            </div>
            
            <button type="submit" class="btn-action btn-dispute">Gửi yêu cầu</button>
        </form>
    </div>
</div>

<!-- ============================================== -->
<!-- Nhúng Chat Widget từ file include riêng -->
<!-- ============================================== -->
<?php include_once '../../../includes/chat_widget_include.php'; ?>

<!-- Script cho Order (Đã loại bỏ Chat Logic UI) -->
<script>
    // --- Logic Order ---
    async function confirmReceipt(orderId) {
        if (!confirm("Bạn xác nhận cá KHỎE MẠNH? Tiền sẽ được chuyển cho Shop ngay lập tức.")) return;
        try {
            const res = await fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/confirm_receipt.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ order_id: orderId })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                location.reload();
            } else {
                alert(data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            alert("Lỗi kết nối");
        }
    }

    function openDisputeModal() {
        document.getElementById('disputeModal').style.display = 'block';
    }
    
    async function submitDispute(e) {
        e.preventDefault();
        const formEl   = document.getElementById('disputeForm');
        const formData = new FormData(formEl);
        const btn      = formEl.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.innerText = "Đang tải ảnh lên...";

        try {
            const res = await fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/submit_dispute.php', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                alert("✅ " + data.message);
                location.reload();
            } else {
                alert("❌ Lỗi: " + (data.error || 'Không gửi được khiếu nại'));
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi kết nối server");
        } finally {
            btn.disabled = false;
            btn.innerText = "Gửi yêu cầu";
        }
    }
    
    window.onclick = function(event) {
        if (event.target === document.getElementById('disputeModal')) {
            document.getElementById('disputeModal').style.display = "none";
        }
    }
</script>

<?php include '../../../includes/footer.php'; ?>