<?php
// backend/api/users/profile/update.php
session_start();
header('Content-Type: application/json');

require_once '../../../../includes/db.php'; // Đường dẫn DB theo file gốc bạn cung cấp

// 1. Kiểm tra đăng nhập
// Lưu ý: Kiểm tra key session cho chính xác với hệ thống của bạn (userid hay UserID)
$userId = 0;
if (isset($_SESSION['userid'])) {
    $userId = $_SESSION['userid'];
} elseif (isset($_SESSION['UserID'])) {
    $userId = $_SESSION['UserID'];
}

if ($userId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Bạn chưa đăng nhập.']);
    exit;
}

// 2. Xử lý method POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// 3. Lấy dữ liệu Text
$fullName = trim($_POST['display_name'] ?? '');
$title    = trim($_POST['title'] ?? '');
$bio      = trim($_POST['bio'] ?? '');
$phone    = trim($_POST['phone'] ?? '');
$address  = trim($_POST['address'] ?? '');

// Validate cơ bản
if (empty($fullName)) {
    echo json_encode(['success' => false, 'message' => 'Tên hiển thị không được để trống.']);
    exit;
}

// 4. Xử lý Upload Ảnh (Avatar & Cover)
$uploadDir = '../../../../assets/uploads/users/'; // Đường dẫn vật lý
$dbPathDir = '/HeThongChamSocCaKoi/assets/uploads/users/'; // Đường dẫn lưu DB

if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Hàm upload file
function handleUpload($fileInputName, $prefix, $userId, $uploadDir, $dbPathDir) {
    if (isset($_FILES[$fileInputName]) && $_FILES[$fileInputName]['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES[$fileInputName]['tmp_name'];
        $fileName    = $_FILES[$fileInputName]['name'];
        // $fileSize    = $_FILES[$fileInputName]['size'];
        // $fileType    = $_FILES[$fileInputName]['type'];
        
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));
        
        // Chỉ cho phép ảnh
        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg', 'webp');
        if (in_array($fileExtension, $allowedfileExtensions)) {
            // Tạo tên file mới: prefix_userid_timestamp.ext
            $newFileName = $prefix . '_' . $userId . '_' . time() . '.' . $fileExtension;
            $dest_path = $uploadDir . $newFileName;
            
            if(move_uploaded_file($fileTmpPath, $dest_path)) {
                return $dbPathDir . $newFileName;
            }
        }
    }
    return null;
}

$avatarUrl = handleUpload('avatar', 'avatar', $userId, $uploadDir, $dbPathDir);
$coverUrl  = handleUpload('cover', 'cover', $userId, $uploadDir, $dbPathDir);

// 5. Cập nhật Database
try {
    // --- A. Cập nhật thông tin User ---
    $sql = "UPDATE Users SET FullName = ?, Title = ?, Bio = ?, Phone = ?, Address = ?";
    $params = [$fullName, $title, $bio, $phone, $address];
    $types = "sssss";

    if ($avatarUrl) {
        $sql .= ", AvatarURL = ?";
        $params[] = $avatarUrl;
        $types .= "s";
        $_SESSION['avatar'] = $avatarUrl; // Cập nhật session ngay
    }

    if ($coverUrl) {
        $sql .= ", CoverURL = ?";
        $params[] = $coverUrl;
        $types .= "s";
    }

    $sql .= " WHERE UserID = ?";
    $params[] = $userId;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        // Cập nhật lại Session tên hiển thị
        if(isset($_SESSION['fullname'])) $_SESSION['fullname'] = $fullName;
        if(isset($_SESSION['FullName'])) $_SESSION['FullName'] = $fullName;
        
        echo json_encode([
            'success' => true, 
            'message' => 'Cập nhật hồ sơ thành công!',
            'data' => [
                'avatar' => $avatarUrl,
                'cover' => $coverUrl
            ]
        ]);
    } else {
        throw new Exception("Lỗi thực thi SQL: " . $stmt->error);
    }
    $stmt->close();

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()]);
}
?>