<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION['username'])) json_fail('Chưa đăng nhập!', 401);

    $username = $_SESSION['username'];
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) json_fail('Không tìm thấy tài khoản', 404);
    $user_id = (int)$user['UserID'];

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

    $PondName = $_POST['PondName'] ?? '';
    $Volume = ($_POST['Volume'] ?? '') === '' ? null : (float)$_POST['Volume'];
    $Depth = ($_POST['Depth'] ?? '') === '' ? null : (float)$_POST['Depth'];
    $Type = $_POST['Type'] ?? null;
    $CreatedAt = ($_POST['CreatedAt'] ?? '') === '' ? date('Y-m-d') : $_POST['CreatedAt'];
    $Notes = $_POST['Notes'] ?? null;
    $DrainCount = ($_POST['DrainCount'] ?? '') === '' ? null : (int)$_POST['DrainCount'];
    $SkimmerCount = ($_POST['SkimmerCount'] ?? '') === '' ? null : (int)$_POST['SkimmerCount'];
    $PumpingCapacity = ($_POST['PumpingCapacity'] ?? '') === '' ? null : (float)$_POST['PumpingCapacity'];

    $ImageURL = null;
    if (!empty($_FILES['ImageFile']['name'])) {
        $uploadDir = __DIR__ . '/../../../../uploads/ponds/';
        if (!is_dir($uploadDir)) { @mkdir($uploadDir, 0777, true); }

        $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp'];
        if (!in_array($ext, $allowed)) json_fail('Định dạng ảnh không hợp lệ');
        
        // [ĐÃ SỬA] Tăng giới hạn từ 5MB lên 15MB
        if ($_FILES['ImageFile']['size'] > 15 * 1024 * 1024) json_fail('Ảnh vượt quá 15MB');

        $newName = 'pond_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $uploadDir . $newName;
        if (!move_uploaded_file($_FILES['ImageFile']['tmp_name'], $destPath))
            json_fail('Không thể lưu ảnh');

        $ImageURL = '/HeThongChamSocCaKoi/uploads/ponds/' . $newName;
    }

    $sql = "INSERT INTO Pond
    (UserID, PondName, Volume, Depth, Type, CreatedAt, Notes, ImageURL, DrainCount, SkimmerCount, PumpingCapacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isddssssiid", $user_id, $PondName, $Volume, $Depth, $Type, $CreatedAt, $Notes, $ImageURL, $DrainCount, $SkimmerCount, $PumpingCapacity);
    $stmt->execute();

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
