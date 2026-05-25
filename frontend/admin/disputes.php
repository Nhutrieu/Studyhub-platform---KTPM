<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\admin\disputes.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

if ($_SESSION['role'] !== 'Admin') die("Access Denied");

$tab = isset($_GET['tab']) ? $_GET['tab'] : 'pending';

// Điều kiện lọc
if ($tab === 'history') {
    // Lấy các đơn ĐÃ XỬ LÝ (Completed hoặc Refunded) mà có lý do khiếu nại (tức là từng có tranh chấp)
    $whereClause = "o.Status IN ('Completed', 'Refunded') AND o.DisputeReason IS NOT NULL";
} else {
    // Mặc định: Đang chờ xử lý
    $whereClause = "o.Status = 'AdminReview'";
}

// Query lấy dữ liệu + Kèm Subquery lấy phán quyết cuối cùng của Admin
$sql = "
    SELECT o.*, u.FullName as CustomerName, s.FullName as ShopName,
    (
        SELECT Note 
        FROM OrderStatusHistory 
        WHERE OrderID = o.OrderID AND NewStatus = 'AdminReview' 
        ORDER BY ChangedAt DESC LIMIT 1
    ) as ShopReason,
    (
        SELECT Note 
        FROM OrderStatusHistory 
        WHERE OrderID = o.OrderID AND (NewStatus = 'Completed' OR NewStatus = 'Refunded') AND Note LIKE 'Admin%'
        ORDER BY ChangedAt DESC LIMIT 1
    ) as AdminVerdict
    FROM Orders o
    JOIN Users u ON o.UserID = u.UserID
    JOIN OrderDetail od ON o.OrderID = od.OrderID
    JOIN Product p ON od.ProductID = p.ProductID
    JOIN Users s ON p.ShopID = s.UserID
    WHERE $whereClause
    GROUP BY o.OrderID
    ORDER BY o.OrderID DESC
";
$result = $conn->query($sql);
?>

<?php 
$page_title = "Admin - Xử lý tranh chấp";
include '../../includes/header.php';
?>

<style>
    .admin-container { max-width:1100px; margin:30px auto; padding:15px; font-family: sans-serif; }
    
    /* Tabs */
    .tabs { display: flex; gap: 10px; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
    .tab { padding: 10px 20px; text-decoration: none; color: #64748b; font-weight: 600; border-radius: 5px 5px 0 0; }
    .tab:hover { background: #f8fafc; }
    .tab.active { border-bottom: 2px solid #0ea5e9; color: #0ea5e9; background: #f0f9ff; }

    /* Cards */
    .dispute-card { border:1px solid #e2e8f0; padding:20px; margin-bottom:20px; background:#fff; border-radius:12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .d-header { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
    .d-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; background:#f8fafc; padding:15px; border-radius:8px; }
    
    .media-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .media-item { width: 80px; height: 80px; object-fit: cover; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; background: #000; }

    .verdict-box { margin-top: 15px; padding: 15px; border-radius: 8px; font-weight: 500; }
    .verdict-win { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .verdict-refund { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
</style>

<div class="admin-container">
    <h1>⚖️ Tòa án Admin (Dispute Resolution)</h1>
    
    <div class="tabs">
        <a href="?tab=pending" class="tab <?= $tab == 'pending' ? 'active' : '' ?>">⏳ Đang chờ xử lý</a>
        <a href="?tab=history" class="tab <?= $tab == 'history' ? 'active' : '' ?>">📜 Lịch sử phán quyết</a>
    </div>
    
    <?php if ($result->num_rows == 0): ?>
        <div style="text-align:center; padding:40px; color:#64748b;">Không có dữ liệu.</div>
    <?php else: ?>
        <?php while ($row = $result->fetch_assoc()): ?>
            <div class="dispute-card">
                <div class="d-header">
                    <h3>Đơn hàng #<?= $row['OrderID'] ?> - <span style="color:#b91c1c;"><?= number_format($row['TotalAmount']) ?> đ</span></h3>
                    <div>
                        Trạng thái: <strong><?= $row['Status'] ?></strong>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:0.95rem;">
                    <div>👤 <strong>Khách (Nguyên đơn):</strong> <?= htmlspecialchars($row['CustomerName']) ?></div>
                    <div>🏪 <strong>Shop (Bị đơn):</strong> <?= htmlspecialchars($row['ShopName']) ?></div>
                </div>
                
                <div class="d-grid">
                    <div>
                        <strong style="color:#dc2626;">Lý do khiếu nại (Khách):</strong>
                        <p style="background:#fff; padding:10px; border:1px solid #e2e8f0; margin-top:5px; border-radius:5px;">
                            <?= htmlspecialchars($row['DisputeReason']) ?>
                        </p>
                        
                        <strong>Bằng chứng:</strong>
                        <div class="media-grid">
                            <?php 
                                $files = json_decode($row['DisputeEvidence'], true);
                                if (is_array($files)) {
                                    foreach ($files as $file) {
                                        $ext = pathinfo($file, PATHINFO_EXTENSION);
                                        if (in_array(strtolower($ext), ['mp4','mov'])) {
                                            echo "<a href='$file' target='_blank'><video src='$file' class='media-item'></video></a>";
                                        } else {
                                            echo "<a href='$file' target='_blank'><img src='$file' class='media-item'></a>";
                                        }
                                    }
                                } else if ($row['DisputeEvidence']) {
                                    echo "<a href='{$row['DisputeEvidence']}' target='_blank'><img src='{$row['DisputeEvidence']}' class='media-item'></a>";
                                }
                            ?>
                        </div>
                    </div>

                    <div style="border-left:1px solid #e2e8f0; padding-left:20px;">
                        <strong style="color:#0f172a;">Lý do từ chối (Shop):</strong>
                        <p style="background:#fff; padding:10px; border:1px solid #e2e8f0; margin-top:5px; border-radius:5px;">
                            <?= $row['ShopReason'] ? htmlspecialchars($row['ShopReason']) : 'Shop chưa phản hồi hoặc tự nguyện hoàn tiền.' ?>
                        </p>
                    </div>
                </div>

                <?php if ($tab === 'history'): ?>
                    <div class="verdict-box <?= $row['Status'] == 'Completed' ? 'verdict-win' : 'verdict-refund' ?>">
                        👮 <strong>Kết quả:</strong> <?= htmlspecialchars($row['AdminVerdict'] ?: 'Đã xử lý xong.') ?>
                    </div>
                <?php else: ?>
                    <div style="margin-top:20px; text-align:right;">
                        <button onclick="verdict(<?= $row['OrderID'] ?>, 'customer_win')" style="padding:12px 24px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                            🧑‍⚖️ Khách thắng (Hoàn tiền)
                        </button>
                        <button onclick="verdict(<?= $row['OrderID'] ?>, 'shop_win')" style="padding:12px 24px; background:#22c55e; color:white; border:none; border-radius:6px; cursor:pointer; margin-left:10px; font-weight:bold;">
                            🧑‍⚖️ Shop thắng (Trả tiền Shop)
                        </button>
                    </div>
                <?php endif; ?>
            </div>
        <?php endwhile; ?>
    <?php endif; ?>
</div>

<script>
function verdict(orderId, winner) {
    const reason = prompt("Nhập lý do phán quyết (Bắt buộc):");
    if (!reason) return;

    fetch('/HeThongChamSocCaKoi/backend/api/admin/final_verdict.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ order_id: orderId, verdict: winner, reason: reason })
    })
    .then(r => r.json())
    .then(data => {
        if(data.success) { alert("✅ " + data.message); location.reload(); }
        else alert("❌ " + data.error);
    });
}
</script>

<?php include '../../includes/footer.php'; ?>