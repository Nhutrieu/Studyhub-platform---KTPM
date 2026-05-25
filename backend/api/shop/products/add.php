<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\add.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['username'])) {
    fail('Chưa đăng nhập', 401);
}

// ===== cấu hình giới hạn dung lượng (MB) =====
$MAX_MAIN_IMAGE_MB = 10;   
$MAX_MEDIA_FILE_MB = 50;   

$MAX_MAIN_IMAGE = $MAX_MAIN_IMAGE_MB * 1024 * 1024;
$MAX_MEDIA_FILE = $MAX_MEDIA_FILE_MB * 1024 * 1024;

// Lấy thông tin user + role + userID
$stmtUser = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ?");
$stmtUser->bind_param("s", $_SESSION['username']);
$stmtUser->execute();
$userRow = $stmtUser->get_result()->fetch_assoc();

$role   = $userRow['Role']   ?? 'Customer';
$userId = (int)($userRow['UserID'] ?? 0);

if (!in_array($role, ['Admin', 'Shop'])) {
    fail('Không có quyền tạo sản phẩm', 403);
}

$CategoryID  = (int)($_POST['CategoryID'] ?? 0);
$Name        = trim($_POST['Name'] ?? '');
$Description = trim($_POST['Description'] ?? '');
$Price       = (float)($_POST['Price'] ?? 0);
$Stock       = (int)($_POST['Stock'] ?? 0);

if ($Name === '' || $CategoryID <= 0 || $Price < 0) {
    fail('Thiếu dữ liệu bắt buộc');
}

$ShopID = ($role === 'Shop' && $userId > 0) ? $userId : null;

// Xử lý thư mục upload
$uploadDir = '../../../../uploads/products/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

// ===== Ảnh đại diện (chỉ ảnh) =====
$ImageURL = null;
if (!empty($_FILES['ImageFile']['name'])) {
    $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
    $allowedImg = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','heic'];

    if (!in_array($ext, $allowedImg)) {
        fail('Định dạng ảnh đại diện không hợp lệ');
    }
    if (!empty($_FILES['ImageFile']['size']) && $_FILES['ImageFile']['size'] > $MAX_MAIN_IMAGE) {
        fail('Ảnh đại diện vượt quá ' . $MAX_MAIN_IMAGE_MB . 'MB');
    }

    $newName = 'product_main_' . time() . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
    if (!move_uploaded_file($_FILES['ImageFile']['tmp_name'], $uploadDir . $newName)) {
        fail('Không lưu được ảnh đại diện');
    }
    $ImageURL = '/HeThongChamSocCaKoi/uploads/products/' . $newName;
}

$conn->begin_transaction();

try {
    // Thêm sản phẩm
    $stmt = $conn->prepare("
        INSERT INTO Product (CategoryID, ShopID, Name, Description, Price, Stock, ImageURL)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        "iissdis",
        $CategoryID,
        $ShopID,
        $Name,
        $Description,
        $Price,
        $Stock,
        $ImageURL
    );
    $stmt->execute();
    $productId = (int)$conn->insert_id;

    // ===== Thêm thư viện ảnh / video (MediaFiles[]) =====
    if (!empty($_FILES['MediaFiles']['name']) && is_array($_FILES['MediaFiles']['name'])) {
        $allowedImg   = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','heic'];
        $allowedVideo = ['mp4','mov','avi','mkv','webm','flv','wmv','m4v','3gp'];

        $stmtMedia = $conn->prepare("
            INSERT INTO ProductImage (ProductID, MediaType, ImageURL, IsPrimary, SortOrder)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($_FILES['MediaFiles']['name'] as $i => $origName) {
            if ($_FILES['MediaFiles']['error'][$i] !== UPLOAD_ERR_OK) {
                continue;
            }

            $tmpName = $_FILES['MediaFiles']['tmp_name'][$i];
            $size    = (int)$_FILES['MediaFiles']['size'][$i];

            if ($size <= 0 || $size > $MAX_MEDIA_FILE) {
                continue;
            }

            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            $mediaType = null;

            if (in_array($ext, $allowedImg)) {
                $mediaType = 'image';
            } elseif (in_array($ext, $allowedVideo)) {
                $mediaType = 'video';
            } else {
                continue;
            }

            $baseName = 'media_' . $productId . '_' . time() . '_' . bin2hex(random_bytes(3));
            $newName  = $baseName . '.' . $ext;
            // Dùng realpath để lấy đường dẫn tuyệt đối cho an toàn khi gọi CLI
            $destPath = realpath($uploadDir) . DIRECTORY_SEPARATOR . $newName; 
            
            // Nếu chưa có thư mục, move_uploaded_file cần path tương đối hoặc tuyệt đối đúng
            // Ở trên mình dùng $uploadDir (tương đối) để move, sau đó mới lấy realpath
            if (!move_uploaded_file($tmpName, $uploadDir . $newName)) {
                continue;
            }
            
            // Cập nhật lại destPath tuyệt đối chính xác để gửi cho Worker
            $absoluteDestPath = realpath($uploadDir . $newName);

            // Lưu đường dẫn web tạm thời
            $mediaUrl  = '/HeThongChamSocCaKoi/uploads/products/' . $newName;
            $isPrimary = 0;
            $sortOrder = (int)$i;

            $stmtMedia->bind_param("issii", $productId, $mediaType, $mediaUrl, $isPrimary, $sortOrder);
            $stmtMedia->execute();
            
            // Lấy ID vừa insert để gửi cho Worker update lại sau khi convert
            $productImageId = $stmtMedia->insert_id;

            // === LOGIC GỌI WORKER CHẠY NGẦM (BACKGROUND) ===
            if ($mediaType === 'video' && $ext !== 'mp4') {
                $workerPath = __DIR__ . '/convert_worker.php';
                
                // Cấu trúc lệnh Windows: start /B php "đường dẫn worker" "file gốc" "ID"
                // Lưu ý: Đảm bảo 'php' có trong biến môi trường PATH, nếu không phải dùng đường dẫn full tới php.exe
                // Ví dụ: C:\xampp\php\php.exe
                
                $cmd = sprintf(
                    'start /B php "%s" "%s" %d',
                    $workerPath,
                    $absoluteDestPath,
                    $productImageId
                );
                
                // Thực thi lệnh và đóng ngay lập tức (không đợi kết quả)
                pclose(popen($cmd, "r"));
            }
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'product_id' => $productId], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $conn->rollback();
    fail('Lỗi khi lưu sản phẩm: ' . $e->getMessage(), 500);
}