<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\order_process\submit_dispute.php

require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

// 1. Kiểm tra đăng nhập
$userId = (int)($_SESSION['userid'] ?? 0);
$orderId = (int)($_POST['order_id'] ?? 0);
$reason = trim($_POST['reason'] ?? '');

if ($userId <= 0) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($orderId <= 0 || empty($reason)) {
    echo json_encode(['success' => false, 'error' => 'Dữ liệu không hợp lệ. Vui lòng nhập lý do.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// =======================================================================
// 2. LOGIC UPLOAD FILE (Được khôi phục từ file cũ - Bắt buộc phải có)
// =======================================================================
$uploadedFiles = [];
$uploadDir = '../../../../assets/uploads/disputes/';

if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

if (isset($_FILES['evidence']) && is_array($_FILES['evidence']['name'])) {
    $count = count($_FILES['evidence']['name']);

    for ($i = 0; $i < $count; $i++) {
        if ($_FILES['evidence']['error'][$i] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['evidence']['name'][$i], PATHINFO_EXTENSION));
            // Các định dạng cho phép (Ảnh & Video)
            $allowed = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'];

            if (in_array($ext, $allowed, true)) {
                $fileName   = 'dispute_' . $orderId . '_' . time() . '_' . $i . '.' . $ext;
                $targetPath = $uploadDir . $fileName;

                if (move_uploaded_file($_FILES['evidence']['tmp_name'][$i], $targetPath)) {
                    // Đường dẫn tương đối để lưu vào DB
                    $uploadedFiles[] = '/HeThongChamSocCaKoi/assets/uploads/disputes/' . $fileName;
                }
            }
        }
    }
}

// Logic cũ: Bắt buộc phải có ít nhất 1 bằng chứng
if (empty($uploadedFiles)) {
    echo json_encode([
        'success' => false, 
        'error'   => 'Bắt buộc phải có ít nhất 1 ảnh/video bằng chứng.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Encode JSON đúng format cũ để Frontend đọc được
$evidenceJson = json_encode($uploadedFiles, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// =======================================================================
// 3. LOGIC XỬ LÝ DATABASE (Sử dụng code Mới - An toàn hơn)
// =======================================================================
try {
    $conn->begin_transaction();

    // Sử dụng Atomic Update: Chỉ update nếu Status đang là 'Shipped' và đúng User sở hữu
    // Cách này tránh được Race Condition (xung đột dữ liệu) tốt hơn cách Select rồi mới Update
    $stmt = $conn->prepare("
        UPDATE Orders 
        SET Status = 'Dispute', 
            DisputeReason = ?, 
            DisputeEvidence = ? 
        WHERE OrderID = ? 
          AND UserID = ? 
          AND Status = 'Shipped'
    ");
    
    $stmt->bind_param("ssii", $reason, $evidenceJson, $orderId, $userId);
    $stmt->execute();

    // Kiểm tra xem có dòng nào được update không
    if ($stmt->affected_rows === 0) {
        // Nếu = 0 nghĩa là: Đơn hàng không tồn tại, sai User, hoặc KHÔNG ở trạng thái Shipped
        throw new Exception("Không thể gửi khiếu nại (Đơn hàng không hợp lệ hoặc không còn ở trạng thái đang vận chuyển).");
    }
    $stmt->close();

    // Ghi log lịch sử
    $note = "Khách hàng khiếu nại: " . $reason;
    $hist = $conn->prepare("
        INSERT INTO OrderStatusHistory (OrderID, OldStatus, NewStatus, Note, ChangedByUserID) 
        VALUES (?, 'Shipped', 'Dispute', ?, ?)
    ");
    $hist->bind_param("isi", $orderId, $note, $userId);
    $hist->execute();
    $hist->close();

    $conn->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Đã gửi yêu cầu khiếu nại thành công.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>