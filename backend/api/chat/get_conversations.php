<?php
// Đường dẫn: /HeThongChamSocCaKoi/backend/api/chat/get_conversations.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['userid'])) { 
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']); 
    exit; 
}

$userId = (int)$_SESSION['userid'];
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'Customer';

// Query linh động theo Role
if ($role === 'Shop' || $role === 'Admin') {
    $sql = "SELECT c.ConversationID, c.CustomerID AS PartnerID, c.LastMessage, c.LastMessageAt, c.UnreadCountShop AS UnreadCount,
            u.FullName AS PartnerName, u.AvatarURL AS PartnerAvatar
            FROM Conversations c
            JOIN Users u ON c.CustomerID = u.UserID
            WHERE c.ShopID = ?
            ORDER BY c.LastMessageAt DESC";
} else {
    $sql = "SELECT c.ConversationID, c.ShopID AS PartnerID, c.LastMessage, c.LastMessageAt, c.UnreadCountCus AS UnreadCount,
            u.FullName AS PartnerName, u.AvatarURL AS PartnerAvatar
            FROM Conversations c
            JOIN Users u ON c.ShopID = u.UserID
            WHERE c.CustomerID = ?
            ORDER BY c.LastMessageAt DESC";
}

try {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    $now = new DateTime();

    while ($row = $result->fetch_assoc()) {
        // Xử lý hiển thị thời gian
        $msgTime = new DateTime($row['LastMessageAt']);
        $diff = $now->diff($msgTime);
        
        if ($diff->d > 0) $row['TimeAgo'] = $diff->d . ' ngày trước';
        else if ($diff->h > 0) $row['TimeAgo'] = $diff->h . ' giờ trước';
        else if ($diff->i > 0) $row['TimeAgo'] = $diff->i . ' phút trước';
        else $row['TimeAgo'] = 'Vừa xong';

        // --- FIX LỖI AVATAR 404 ---
        // Nếu có Avatar nhưng đường dẫn không bắt đầu bằng 'http' (link ngoài) hoặc '/' (tuyệt đối)
        if (!empty($row['PartnerAvatar'])) {
            $avatar = $row['PartnerAvatar'];
            if (strpos($avatar, 'http') !== 0 && $avatar[0] !== '/') {
                // Thêm dấu / vào đầu để thành đường dẫn tuyệt đối từ root
                $row['PartnerAvatar'] = '/' . $avatar;
            }
        } else {
            // Fallback avatar mặc định
            $row['PartnerAvatar'] = '/HeThongChamSocCaKoi/assets/images/\logo_koi6.png'; 
        }

        $data[] = $row;
    }
    
    echo json_encode($data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>