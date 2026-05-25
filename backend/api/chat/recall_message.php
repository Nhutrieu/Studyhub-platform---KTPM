<?php
// Đường dẫn: /HeThongChamSocCaKoi/backend/api/chat/recall_message.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['userid']) || !isset($_POST['message_id'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid Request']);
    exit;
}

$userId = $_SESSION['userid'];
$msgId = (int)$_POST['message_id'];

// Kiểm tra quyền sở hữu tin nhắn trước khi thu hồi
// Chỉ cho phép thu hồi trong vòng 15 phút (tùy chọn)
$stmt = $conn->prepare("SELECT SenderID, CreatedAt FROM Messages WHERE MessageID = ?");
$stmt->bind_param("i", $msgId);
$stmt->execute();
$res = $stmt->get_result();

if ($row = $res->fetch_assoc()) {
    if ($row['SenderID'] == $userId) {
        // Cập nhật trạng thái thu hồi
        $update = $conn->prepare("UPDATE Messages SET IsRecalled = 1 WHERE MessageID = ?");
        $update->bind_param("i", $msgId);
        
        if ($update->execute()) {
            // (Tùy chọn) Xóa file vật lý nếu muốn tiết kiệm dung lượng
            // Ở đây ta chỉ ẩn trên giao diện để giữ log
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Database Error']);
        }
        $update->close();
    } else {
        echo json_encode(['success' => false, 'error' => 'Không có quyền thu hồi']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Tin nhắn không tồn tại']);
}
$stmt->close();
?>