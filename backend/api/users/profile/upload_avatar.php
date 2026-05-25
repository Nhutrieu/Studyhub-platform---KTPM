<?php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$username = $_SESSION['username'];
$response = ['success' => false];

// Kiểm tra xem đang up Avatar hay Cover
$type = 'avatar';
$fileInputName = 'avatar';
$dbColumn = 'AvatarURL';
$uploadSubDir = 'avatars';

if (isset($_FILES['cover'])) {
    $type = 'cover';
    $fileInputName = 'cover';
    $dbColumn = 'CoverURL';
    $uploadSubDir = 'covers';
}

if (!isset($_FILES[$fileInputName])) {
    http_response_code(400);
    echo json_encode(['error' => 'Không có file tải lên']);
    exit;
}

$uploadDir = '../../../../uploads/' . $uploadSubDir . '/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

$file = $_FILES[$fileInputName];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['jpg','jpeg','png','gif','webp'];

if (!in_array($ext, $allowed)) {
    http_response_code(400);
    echo json_encode(['error' => 'Định dạng ảnh không hợp lệ']);
    exit;
}

// Tạo tên file duy nhất
$newName = $type . '_' . $username . '_' . time() . '.' . $ext;
$path = $uploadDir . $newName;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Không thể lưu ảnh']);
    exit;
}

// Đường dẫn lưu vào DB (tương đối)
// Lưu ý: Đường dẫn trong DB không nên chứa '..' hay đường dẫn tuyệt đối của hệ thống file
// File update.php dùng: /HeThongChamSocCaKoi/assets/uploads/users/
// File này dùng: HeThongChamSocCaKoi/uploads/covers/ (thiếu assets) -> Đảm bảo đồng bộ đường dẫn
$relPath = 'HeThongChamSocCaKoi/uploads/' . $uploadSubDir . '/' . $newName;

$stmt = $conn->prepare("UPDATE Users SET $dbColumn=? WHERE Username=?");
$stmt->bind_param("ss", $relPath, $username);

if ($stmt->execute()) {
    // Update session nếu là avatar
    if ($type === 'avatar') {
        $_SESSION['avatarurl'] = $relPath;
    }
    
    echo json_encode([
        'success' => true, 
        'imageUrl' => '/' . $relPath,
        'type' => $type
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Lỗi cập nhật CSDL']);
}
?>