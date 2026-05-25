<?php
// Đường dẫn: /HeThongChamSocCaKoi/backend/api/chat/send_message.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$UPLOAD_BASE_DIR = realpath(__DIR__ . '/../../../uploads');
if (!$UPLOAD_BASE_DIR) $UPLOAD_BASE_DIR = 'D:/Xampp/htdocs/HeThongChamSocCaKoi/uploads'; 
$UPLOAD_DIR = $UPLOAD_BASE_DIR . '/chat_attachments';
if (!file_exists($UPLOAD_DIR)) mkdir($UPLOAD_DIR, 0777, true);
$BASE_URL_UPLOADS = '/HeThongChamSocCaKoi/uploads/chat_attachments/';

if (!isset($_SESSION['userid'])) { 
    echo json_encode(['success' => false, 'error' => 'Unauthorized']); 
    exit; 
}

$senderId = (int)$_SESSION['userid'];
$receiverId = isset($_POST['receiver_id']) ? (int)$_POST['receiver_id'] : 0;
$content = isset($_POST['content']) ? trim($_POST['content']) : '';
$files = isset($_FILES['files']) ? $_FILES['files'] : null;

if (empty($content) && (empty($files) || empty($files['name'][0]))) { 
    echo json_encode(['success' => false, 'error' => 'Nội dung trống']); 
    exit; 
}
if ($receiverId === 0 || $receiverId == $senderId) { 
    echo json_encode(['success' => false, 'error' => 'Người nhận không hợp lệ']); 
    exit; 
}

// --- FIX LOGIC ROLE (QUAN TRỌNG) ---
// Sử dụng strcasecmp để so sánh không phân biệt hoa thường
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'Customer';
$isShopOrAdmin = (strcasecmp($role, 'Shop') === 0 || strcasecmp($role, 'Admin') === 0);

if ($isShopOrAdmin) {
    // Nếu là Shop: Người gửi là Shop, Người nhận là Khách
    $shopId = $senderId;
    $cusId  = $receiverId;
    $receiverUnreadCol = 'UnreadCountCus'; 
} else {
    // Nếu là Khách: Người gửi là Khách, Người nhận là Shop
    $shopId = $receiverId;
    $cusId  = $senderId;
    $receiverUnreadCol = 'UnreadCountShop';
}

$conn->begin_transaction();

try {
    // 1. Tìm hoặc Tạo hội thoại
    $convId = 0;
    $stmtCheck = $conn->prepare("SELECT ConversationID FROM Conversations WHERE ShopID = ? AND CustomerID = ?");
    $stmtCheck->bind_param("ii", $shopId, $cusId);
    $stmtCheck->execute();
    $resCheck = $stmtCheck->get_result();

    if ($row = $resCheck->fetch_assoc()) {
        $convId = $row['ConversationID'];
    } else {
        $stmtInsert = $conn->prepare("INSERT INTO Conversations (ShopID, CustomerID, UnreadCountShop, UnreadCountCus) VALUES (?, ?, 0, 0)");
        $stmtInsert->bind_param("ii", $shopId, $cusId);
        $stmtInsert->execute();
        $convId = $conn->insert_id;
        $stmtInsert->close();
    }
    $stmtCheck->close();

    // 2. Insert Tin nhắn
    $hasAttachment = (!empty($files) && !empty($files['name'][0])) ? 1 : 0;
    $msgContentForDB = $content;
    $lastMessagePreview = empty($content) ? ($hasAttachment ? '[Đã gửi tệp đính kèm]' : 'Tin nhắn trống') : $content;

    $msgType = 'text';
    if ($hasAttachment) {
        $firstExt = strtolower(pathinfo($files['name'][0], PATHINFO_EXTENSION));
        if (in_array($firstExt, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) $msgType = 'image';
        elseif (in_array($firstExt, ['mp4', 'mov', 'avi', 'mkv', 'webm'])) $msgType = 'video';
        elseif (in_array($firstExt, ['mp3', 'wav', 'ogg', 'm4a'])) $msgType = 'audio';
        else $msgType = 'file';
    }

    $stmtMsg = $conn->prepare("INSERT INTO Messages (ConversationID, SenderID, Content, HasAttachment, MsgType) VALUES (?, ?, ?, ?, ?)");
    $stmtMsg->bind_param("iisss", $convId, $senderId, $msgContentForDB, $hasAttachment, $msgType);
    
    if (!$stmtMsg->execute()) {
        throw new Exception("Lỗi lưu tin nhắn: " . $conn->error);
    }
    $messageId = $conn->insert_id;
    $stmtMsg->close();

    // 3. Xử lý File Upload (Hỗ trợ nhiều loại file)
    if ($hasAttachment) {
        $count = count($files['name']);
        $stmtAtt = $conn->prepare("INSERT INTO Attachments (MessageID, FileName, FilePath, FileType, FileSize) VALUES (?, ?, ?, ?, ?)");
        
        for ($i = 0; $i < $count; $i++) {
            $fileName = $files['name'][$i];
            $fileTmp  = $files['tmp_name'][$i];
            $fileErr  = $files['error'][$i];
            $fileSize = $files['size'][$i];
            
            if ($fileErr === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                $allowed = [
                    'jpg', 'jpeg', 'png', 'gif', 'webp',
                    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar',
                    'mp4', 'mov', 'avi', 'mkv', 'webm',
                    'mp3', 'wav', 'ogg', 'm4a'
                ];
                
                if (!in_array($ext, $allowed)) continue;

                $newFileName = time() . '_' . uniqid() . '.' . $ext;
                $destPath = $UPLOAD_DIR . '/' . $newFileName;
                $webUrl = $BASE_URL_UPLOADS . $newFileName;
                
                $typeDB = 'file';
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) $typeDB = 'image';
                elseif (in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm'])) $typeDB = 'video';
                elseif (in_array($ext, ['mp3', 'wav', 'ogg', 'm4a'])) $typeDB = 'audio';

                if (move_uploaded_file($fileTmp, $destPath)) {
                    $stmtAtt->bind_param("isssi", $messageId, $fileName, $webUrl, $typeDB, $fileSize);
                    $stmtAtt->execute();
                }
            }
        }
        $stmtAtt->close();
    }

    // 4. Cập nhật Conversation
    $sqlLastUpdate = "UPDATE Conversations SET LastMessage = ?, LastMessageAt = NOW(), $receiverUnreadCol = $receiverUnreadCol + 1 WHERE ConversationID = ?";
    $stmtUpdate = $conn->prepare($sqlLastUpdate);
    $stmtUpdate->bind_param("si", $lastMessagePreview, $convId);
    $stmtUpdate->execute();
    $stmtUpdate->close();

    $conn->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>