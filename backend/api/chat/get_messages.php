<?php
// Đường dẫn: /HeThongChamSocCaKoi/backend/api/chat/get_messages.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['userid']) || !isset($_GET['partner_id'])) { 
    echo json_encode([]); 
    exit; 
}

$userId = (int)$_SESSION['userid'];
$partnerId = (int)$_GET['partner_id'];

// --- FIX LOGIC ROLE ---
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'Customer';
$isShopOrAdmin = (strcasecmp($role, 'Shop') === 0 || strcasecmp($role, 'Admin') === 0);

if ($isShopOrAdmin) {
    $shopId = $userId;
    $cusId  = $partnerId;
    $myUnreadCol = 'UnreadCountShop';
} else {
    $shopId = $partnerId;
    $cusId  = $userId;
    $myUnreadCol = 'UnreadCountCus';
}

// 1. Tìm ConversationID
$stmt = $conn->prepare("SELECT ConversationID FROM Conversations WHERE ShopID = ? AND CustomerID = ? LIMIT 1");
$stmt->bind_param("ii", $shopId, $cusId);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) { 
    echo json_encode([]); 
    exit; 
}

$convId = $res->fetch_assoc()['ConversationID'];
$stmt->close();

// 2. Reset Unread
$conn->query("UPDATE Conversations SET $myUnreadCol = 0 WHERE ConversationID = $convId");

// 3. Lấy tin nhắn (Kèm Attachment)
$sql = "SELECT m.*, 
        a.AttachmentID, a.FileName, a.FilePath, a.FileType 
        FROM Messages m
        LEFT JOIN Attachments a ON m.MessageID = a.MessageID
        WHERE m.ConversationID = ? 
        ORDER BY m.CreatedAt ASC, a.AttachmentID ASC";

$stmtMsg = $conn->prepare($sql);
$stmtMsg->bind_param("i", $convId);
$stmtMsg->execute();
$result = $stmtMsg->get_result();

$messages = [];
$tempMsgMap = [];

while ($row = $result->fetch_assoc()) {
    $msgId = $row['MessageID'];
    
    if (!isset($tempMsgMap[$msgId])) {
        $tempMsgMap[$msgId] = [
            'MessageID' => $row['MessageID'],
            'SenderID' => $row['SenderID'],
            'Content' => $row['Content'],
            'CreatedAt' => $row['CreatedAt'],
            'is_me' => ($row['SenderID'] == $userId),
            'IsRecalled' => $row['IsRecalled'] ?? 0,
            'MsgType' => $row['MsgType'],
            'Attachments' => []
        ];
    }

    if ($row['AttachmentID']) {
        $tempMsgMap[$msgId]['Attachments'][] = [
            'id' => $row['AttachmentID'],
            'name' => $row['FileName'],
            'url' => $row['FilePath'],
            'type' => $row['FileType']
        ];
    }
}

echo json_encode(array_values($tempMsgMap));
?>