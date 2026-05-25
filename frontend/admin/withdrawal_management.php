<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\admin\withdrawal_management.php
session_start();
require_once '../../includes/db.php';
require_once '../../includes/check_login.php';

// Bảo mật: Chỉ Admin
if ($_SESSION['role'] !== 'Admin') {
    header("Location: /HeThongChamSocCaKoi/index.php");
    exit;
}

$adminId = (int)$_SESSION['userid'];
$page_title = "Quản lý Rút tiền";
$notification = '';

// [BỔ SUNG] Hàm gửi thông báo trực tiếp vào DB
function sendNotificationToUser($conn, $userId, $type, $title, $message, $link = null) {
    $sql = "INSERT INTO SystemNotifications (UserID, Type, Title, Message, Link, IsRead, CreatedAt) VALUES (?, ?, ?, ?, ?, 0, NOW())";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        // Log the error but don't stop the main transaction
        error_log("Notification Prepare Error: " . $conn->error);
        return false;
    }
    $stmt->bind_param("issss", $userId, $type, $title, $message, $link);
    $result = $stmt->execute();
    $stmt->close();
    if (!$result) {
        error_log("Notification Execute Error: " . $stmt->error);
    }
    return $result;
}

// Hàm dịch trạng thái sang tiếng Việt
function getStatusVietnamese($status) {
    switch ($status) {
        case 'Pending':
            return 'Đang chờ';
        case 'Completed':
            return 'Hoàn tất';
        case 'Rejected':
            return 'Đã từ chối';
        default:
            return $status;
    }
}

// ====================================================
// XỬ LÝ HÀNH ĐỘNG CỦA ADMIN (APPROVE / REJECT)
// ====================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $requestId = (int)$_POST['request_id'];
    $action = $_POST['action'];
    $adminNote = trim($_POST['admin_note'] ?? '');

    // 1. Lấy thông tin yêu cầu
    $stmtRequest = $conn->prepare("SELECT UserID, Amount, Status, BankName, AccountNumber FROM WithdrawalRequests WHERE RequestID = ?");
    $stmtRequest->bind_param("i", $requestId);
    $stmtRequest->execute();
    $request = $stmtRequest->get_result()->fetch_assoc();
    $stmtRequest->close();

    if (!$request || $request['Status'] !== 'Pending') {
        $notification = "Lỗi: Yêu cầu không tồn tại hoặc đã được xử lý.";
    } else {
        // Thông tin chung cho thông báo
        $shopId = (int)$request['UserID'];
        $amount = $request['Amount'];
        $amountFormatted = number_format($amount, 0, ',', '.');
        $walletUrl = '/HeThongChamSocCaKoi/frontend/shop/wallet.php';
        $transactionId = null;

        $conn->begin_transaction();
        try {
            if ($action === 'approve') {
                
                $description = "Rút tiền về tài khoản ngân hàng (Admin duyệt)";

                // 2. Trừ tiền khỏi số dư User
                $stmtDebit = $conn->prepare("UPDATE Users SET AccountBalance = AccountBalance - ? WHERE UserID = ? AND AccountBalance >= ?");
                $stmtDebit->bind_param("idi", $amount, $shopId, $amount);
                $stmtDebit->execute();
                
                if ($stmtDebit->affected_rows === 0) {
                    throw new Exception("Lỗi trừ tiền: Số dư Shop không đủ hoặc UserID không hợp lệ.");
                }

                // 3. Ghi log giao dịch ShopTransactions
                $stmtTrans = $conn->prepare("
                    INSERT INTO ShopTransactions (UserID, Type, Amount, Description) 
                    VALUES (?, 'withdraw', ?, ?)
                ");
                $stmtTrans->bind_param("ids", $shopId, $amount, $description);
                $stmtTrans->execute();
                $transactionId = $conn->insert_id;

                // 4. Cập nhật trạng thái yêu cầu rút tiền
                $stmtUpdate = $conn->prepare("
                    UPDATE WithdrawalRequests 
                    SET Status = 'Completed', ProcessedAt = NOW(), ProcessedByAdminID = ?, AdminNote = ?, TransactionID = ?
                    WHERE RequestID = ?
                ");
                $stmtUpdate->bind_param("isii", $adminId, $adminNote, $transactionId, $requestId);
                $stmtUpdate->execute();

                // 5. Gửi thông báo đến Shop (Thành công)
                $notiTitle = "✅ Rút tiền thành công: {$amountFormatted} đ";
                $notiMsg = "Yêu cầu rút tiền #{$requestId} của bạn với số tiền <strong>{$amountFormatted} đ</strong> đã được Admin phê duyệt và hoàn tất. Tiền đã được chuyển khoản.";
                sendNotificationToUser($conn, $shopId, 'success', $notiTitle, $notiMsg, $walletUrl);

                $notification = "✅ Phê duyệt thành công yêu cầu rút tiền #{$requestId}. Đã trừ " . $amountFormatted . " đ khỏi ví Shop.";
            
            } elseif ($action === 'reject') {
                // 2. Chỉ cập nhật trạng thái yêu cầu rút tiền
                $stmtUpdate = $conn->prepare("
                    UPDATE WithdrawalRequests 
                    SET Status = 'Rejected', ProcessedAt = NOW(), ProcessedByAdminID = ?, AdminNote = ?
                    WHERE RequestID = ?
                ");
                $stmtUpdate->bind_param("isi", $adminId, $adminNote, $requestId);
                $stmtUpdate->execute();
                
                // 3. Gửi thông báo đến Shop (Từ chối)
                $notiTitle = "❌ Rút tiền bị từ chối: {$amountFormatted} đ";
                $reason = empty($adminNote) ? "Vui lòng liên hệ hỗ trợ để biết chi tiết." : "Lý do: {$adminNote}";
                $notiMsg = "Yêu cầu rút tiền #{$requestId} của bạn ({$amountFormatted} đ) đã bị Admin từ chối. {$reason}";
                sendNotificationToUser($conn, $shopId, 'danger', $notiTitle, $notiMsg, $walletUrl);


                $notification = "❌ Đã từ chối yêu cầu rút tiền #{$requestId}.";
            }

            $conn->commit();
            // Sau khi xử lý POST, chuyển hướng về trang hiện tại để làm mới (hoặc sử dụng AJAX load lại)
            // Lấy lại trạng thái đang lọc để không bị mất
            $statusFilter = $_POST['current_status'] ?? 'Pending';
            header("Location: withdrawal_management.php?status=" . urlencode($statusFilter) . "&msg=" . urlencode($notification));
            exit;

        } catch (Exception $e) {
            $conn->rollback();
            $notification = "Lỗi xử lý giao dịch: " . $e->getMessage();
        }
    }
}

// ====================================================
// HÀM TẠO HTML CHO BẢNG KẾT QUẢ (Dùng chung cho cả load trang và AJAX)
// ====================================================
function generateTableHtml($conn, $statusFilter, $adminId) {
    // Đã loại bỏ 'Processing'
    $allowedStatuses = ['Pending', 'Completed', 'Rejected'];
    if (!in_array($statusFilter, $allowedStatuses)) {
        $statusFilter = 'Pending';
    }

    $sql = "
        SELECT 
            wr.*, 
            u.FullName as ShopName, 
            u.AccountBalance as CurrentBalance
        FROM WithdrawalRequests wr
        JOIN Users u ON wr.UserID = u.UserID
        WHERE wr.Status = ?
        ORDER BY wr.RequestedAt DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $statusFilter);
    $stmt->execute();
    $requests = $stmt->get_result();

    $html = '';

    if ($requests->num_rows > 0) {
        $html .= '<table class="request-table">';
        $html .= '<thead>
                    <tr>
                        <th>ID</th>
                        <th>Shop</th>
                        <th>Số tiền</th>
                        <th>Tài khoản nhận</th>
                        <th>Thời gian yêu cầu</th>
                        <th>Số dư Shop</th>
                        <th style="width: 200px;">Hành động</th>
                    </tr>
                </thead>';
        $html .= '<tbody>';

        while ($row = $requests->fetch_assoc()) {
            $html .= '<tr>';
            $html .= '<td>#' . $row['RequestID'] . '</td>';
            $html .= '<td>' . htmlspecialchars($row['ShopName']) . ' (ID: ' . $row['UserID'] . ')</td>';
            $html .= '<td class="amount-cell">' . number_format($row['Amount'], 0, ',', '.') . ' đ</td>';
            $html .= '<td>
                        <div class="bank-info">
                            <strong>' . htmlspecialchars($row['BankName']) . '</strong>
                            <br>STK: ' . htmlspecialchars($row['AccountNumber']) . '
                            <br>Chủ TK: ' . htmlspecialchars($row['AccountName']) . '
                        </div>
                      </td>';
            $html .= '<td>' . date('H:i d/m/Y', strtotime($row['RequestedAt'])) . '</td>';
            $html .= '<td>' . number_format($row['CurrentBalance'], 0, ',', '.') . ' đ';
            if ($row['CurrentBalance'] < $row['Amount']) {
                $html .= '<span class="current-balance-warning" style="font-size:0.8rem;">(Không đủ!)</span>';
            }
            $html .= '</td>';
            $html .= '<td>';

            if ($row['Status'] === 'Pending') {
                $html .= '<button class="action-btn btn-approve" onclick="openActionModal(' . $row['RequestID'] . ', \'approve\', \'' . htmlspecialchars($row['ShopName']) . '\', ' . $row['Amount'] . ', \'' . $statusFilter . '\')">Duyệt</button>';
                $html .= '<button class="action-btn btn-reject" onclick="openActionModal(' . $row['RequestID'] . ', \'reject\', \'' . htmlspecialchars($row['ShopName']) . '\', ' . $row['Amount'] . ', \'' . $statusFilter . '\')">Từ chối</button>';
            } else {
                $html .= '<span class="status-badge badge-' . $row['Status'] . '">' . getStatusVietnamese($row['Status']) . '</span>';
                if (!empty($row['AdminNote'])) {
                    $html .= '<p style="font-size:0.75rem; color:#6b7280; margin-top:5px; line-height:1.2;">Ghi chú: ' . htmlspecialchars($row['AdminNote']) . '</p>';
                }
                if ($row['Status'] === 'Completed') {
                    $html .= '<p style="font-size:0.75rem; color:#6b7280; margin-top:5px;">Thời gian xử lý: ' . date('d/m H:i', strtotime($row['ProcessedAt'])) . '</p>';
                }
            }
            $html .= '</td>';
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';
    } else {
        $html .= '<p style="text-align: center; padding: 40px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    Không có yêu cầu rút tiền nào với trạng thái <strong>' . getStatusVietnamese($statusFilter) . '</strong>.
                   </p>';
    }

    return $html;
}

// ====================================================
// XỬ LÝ AJAX REQUEST (Chỉ trả về HTML bảng)
// ====================================================
if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    $statusFilter = $_GET['status'] ?? 'Pending';
    echo generateTableHtml($conn, $statusFilter, $adminId);
    exit;
}

// ====================================================
// LOAD TRANG CHÍNH (HTML)
// ====================================================

$statusFilter = $_GET['status'] ?? 'Pending';
$allowedStatuses = ['Pending', 'Completed', 'Rejected'];
if (!in_array($statusFilter, $allowedStatuses)) {
    $statusFilter = 'Pending';
}

// Hiển thị thông báo sau khi POST thành công (nếu có)
if (isset($_GET['msg'])) {
    $notification = htmlspecialchars($_GET['msg']);
}

include '../../includes/header.php';
?>

<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
<style>
    .admin-container { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    .page-header { margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
    .page-header h1 { font-size: 1.8rem; color: #1f2937; margin: 0; }

    /* Tab navigation */
    .status-tabs { display: flex; margin-bottom: 25px; border-bottom: 2px solid #e5e7eb; }
    .status-tab { 
        padding: 10px 15px; cursor: pointer; color: #6b7280; font-weight: 600; 
        transition: color 0.2s, border-bottom 0.2s; border-bottom: 2px solid transparent; 
        text-decoration: none;
    }
    .status-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
    .status-tab:hover { color: #3b82f6; } /* Highlight on hover */

    /* Table styles */
    .request-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .request-table th, .request-table td { padding: 15px; text-align: left; border-bottom: 1px solid #f3f4f6; }
    .request-table th { background-color: #f9fafb; font-size: 0.9rem; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .amount-cell { font-weight: 700; color: #dc2626; }
    .bank-info { font-size: 0.9rem; color: #4b5563; line-height: 1.4; }
    .bank-info strong { color: #1f2937; }

    .action-btn { padding: 8px 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-right: 5px; }
    .btn-approve { background-color: #10b981; color: white; }
    .btn-approve:hover { background-color: #05926a; }
    .btn-reject { background-color: #f59e0b; color: white; }
    .btn-reject:hover { background-color: #d97706; }

    .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
    .badge-Pending { background-color: #fffbeb; color: #d97706; }
    .badge-Completed { background-color: #d1fae5; color: #065f46; }
    .badge-Rejected { background-color: #fef2f2; color: #991b1b; }

    .notification { padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; }
    .notification-success { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .notification-error { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

    /* Modal styles */
    .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
    .modal-content { background-color: #fefefe; margin: 10% auto; padding: 30px; border-radius: 12px; width: 90%; max-width: 450px; }
    .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; }
    .close:hover, .close:focus { color: black; text-decoration: none; cursor: pointer; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; }
    .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; resize: vertical; }
    .modal-actions { display: flex; justify-content: space-between; margin-top: 20px; }

    .current-balance-warning { font-weight: 700; color: #ef4444; }
    
    .loading-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255, 255, 255, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 50;
        border-radius: 8px;
    }

</style>

<div class="admin-container">
    <div class="page-header">
        <h1>Quản lý Yêu cầu Rút tiền</h1>
        <p style="color: #6b7280;">Xem xét và xử lý các yêu cầu rút tiền từ các Shop.</p>
    </div>

    <?php if ($notification): ?>
        <div class="notification <?= strpos($notification, 'thành công') !== false ? 'notification-success' : 'notification-error' ?>">
            <?= $notification ?>
        </div>
    <?php endif; ?>

    <div class="status-tabs">
        <?php foreach ($allowedStatuses as $status): ?>
            <a href="#" 
               class="status-tab <?= $statusFilter === $status ? 'active' : '' ?>"
               data-status="<?= $status ?>"
               onclick="loadRequests('<?= $status ?>', this); return false;">
                <?= getStatusVietnamese($status) ?>
            </a>
        <?php endforeach; ?>
    </div>

    <!-- Container cho bảng kết quả AJAX -->
    <div id="requestTableContainer" style="position: relative;">
        <!-- Loading overlay -->
        <div id="loadingOverlay" class="loading-overlay">
            <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: #3b82f6;"></i>
        </div>
        
        <?php 
        // Lần đầu tiên load trang, hiển thị kết quả mặc định
        echo generateTableHtml($conn, $statusFilter, $adminId); 
        ?>
    </div>
</div>

<!-- Action Modal -->
<div id="actionModal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeModal('actionModal')">&times;</span>
        <h3 id="modalTitle" style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-top: 0;"></h3>
        <p id="modalShopInfo" style="font-weight: 600;"></p>
        <p id="modalWarning" style="color:#dc2626; font-size:0.9rem; margin-top: 5px;"></p>
        
        <form method="POST" action="withdrawal_management.php">
            <input type="hidden" name="request_id" id="modalRequestId">
            <input type="hidden" name="action" id="modalAction">
            <input type="hidden" name="current_status" id="modalCurrentStatus">
            
            <div class="form-group">
                <label for="adminNote">Ghi chú của Admin (Tùy chọn)</label>
                <textarea id="adminNote" name="admin_note" rows="3" placeholder="Lý do từ chối hoặc xác nhận giao dịch..."></textarea>
            </div>

            <div class="modal-actions">
                <button type="button" onclick="closeModal('actionModal')" class="action-btn" style="background-color:#6b7280;">Hủy</button>
                <button type="submit" id="modalSubmitBtn" class="action-btn"></button>
            </div>
        </form>
    </div>
</div>

<script>
    // Hàm tải yêu cầu rút tiền bằng AJAX
    function loadRequests(status) {
        const container = document.getElementById('requestTableContainer');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const tabs = document.querySelectorAll('.status-tab');

        // Cập nhật trạng thái Active của tab
        tabs.forEach(tab => {
            if (tab.getAttribute('data-status') === status) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Hiện overlay loading
        loadingOverlay.style.display = 'flex';
        container.style.minHeight = '200px'; // Giữ chiều cao để tránh CLS

        // Tải dữ liệu qua AJAX
        fetch(`withdrawal_management.php?ajax=1&status=${status}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Lỗi mạng khi tải dữ liệu.');
                }
                return response.text();
            })
            .then(html => {
                // Đảm bảo không ghi đè overlay nếu nó đã được thêm vào container
                const currentOverlay = document.getElementById('loadingOverlay');
                container.innerHTML = html;
                
                // Sau khi gán innerHTML, cần thêm lại overlay và ẩn nó
                if (currentOverlay) {
                    container.appendChild(currentOverlay);
                }
                loadingOverlay.style.display = 'none'; 
                container.style.minHeight = '0';
            })
            .catch(error => {
                const currentOverlay = document.getElementById('loadingOverlay');
                console.error('Lỗi tải yêu cầu:', error);
                container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 40px;">Đã xảy ra lỗi khi tải dữ liệu: ${error.message}</p>`;
                
                // Thêm lại overlay và ẩn nó
                if (currentOverlay) {
                    container.appendChild(currentOverlay);
                }
                loadingOverlay.style.display = 'none';
                container.style.minHeight = '0';
            });
    }

    function openActionModal(id, action, shopName, amount) {
        const modal = document.getElementById('actionModal');
        const title = document.getElementById('modalTitle');
        const info = document.getElementById('modalShopInfo');
        const warning = document.getElementById('modalWarning');
        const submitBtn = document.getElementById('modalSubmitBtn');
        const currentStatus = document.querySelector('.status-tab.active').getAttribute('data-status');

        document.getElementById('modalRequestId').value = id;
        document.getElementById('modalAction').value = action;
        document.getElementById('modalCurrentStatus').value = currentStatus; // Thêm trạng thái hiện tại
        
        const amountFormatted = new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
        
        if (action === 'approve') {
            title.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Xác nhận PHÊ DUYỆT Rút tiền';
            info.innerHTML = `Shop: <strong>${shopName}</strong> - Số tiền: <strong style="color:#10b981;">${amountFormatted}</strong>`;
            warning.textContent = 'Hành động này sẽ TRỪ tiền khỏi ví Shop và ghi nhận giao dịch rút tiền. Vui lòng đảm bảo tiền đã được chuyển đi.';
            submitBtn.textContent = 'XÁC NHẬN DUYỆT';
            submitBtn.className = 'action-btn btn-approve';
        } else {
            title.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:#f59e0b;"></i> Xác nhận TỪ CHỐI Rút tiền';
            info.innerHTML = `Shop: <strong>${shopName}</strong> - Số tiền: <strong style="color:#f59e0b;">${amountFormatted}</strong>`;
            warning.textContent = 'Hành động này sẽ Đóng yêu cầu Rút tiền. Tiền KHÔNG bị trừ khỏi ví Shop. Vui lòng ghi rõ lý do từ chối vào ghi chú.';
            submitBtn.textContent = 'XÁC NHẬN TỪ CHỐI';
            submitBtn.className = 'action-btn btn-reject';
        }

        modal.style.display = 'block';
    }

    function closeModal(id) {
        document.getElementById(id).style.display = "none";
        document.getElementById('adminNote').value = ''; // Clear note on close
    }

    // Đóng modal khi click ra ngoài
    window.onclick = function(event) {
        const modal = document.getElementById('actionModal');
        if (event.target == modal) {
            closeModal('actionModal');
        }
    }
    
    // Khởi tạo trang khi load lần đầu (giữ nguyên trạng thái từ PHP)
    document.addEventListener('DOMContentLoaded', () => {
        // Nếu có thông báo, hiển thị và sau đó load lại request table (vì POST có thể thay đổi status)
        <?php if (isset($_GET['msg'])): ?>
            const currentStatus = '<?= $statusFilter ?>';
            loadRequests(currentStatus);
        <?php endif; ?>
    });
</script>

<?php include '../../includes/footer.php'; ?>