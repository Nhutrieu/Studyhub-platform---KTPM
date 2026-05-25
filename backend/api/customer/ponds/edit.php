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
    if (!$user) json_fail('Không tìm thấy user', 404);
    $user_id = (int)$user['UserID'];

    $PondID = (int)($_POST['PondID'] ?? 0);
    $PondName = $_POST['PondName'] ?? '';
    $Volume = ($_POST['Volume'] ?? '') === '' ? null : (float)$_POST['Volume'];
    $Depth = ($_POST['Depth'] ?? '') === '' ? null : (float)$_POST['Depth'];
    $Type = $_POST['Type'] ?? null;
    $CreatedAt = $_POST['CreatedAt'] ?? null;
    $Notes = $_POST['Notes'] ?? null;
    $DrainCount = ($_POST['DrainCount'] ?? '') === '' ? null : (int)$_POST['DrainCount'];
    $SkimmerCount = ($_POST['SkimmerCount'] ?? '') === '' ? null : (int)$_POST['SkimmerCount'];
    $PumpingCapacity = ($_POST['PumpingCapacity'] ?? '') === '' ? null : (float)$_POST['PumpingCapacity'];
    $CurrentImage = $_POST['CurrentImageURL'] ?? null;

    $check = $conn->prepare("SELECT ImageURL FROM Pond WHERE PondID=? AND UserID=?");
    $check->bind_param("ii", $PondID, $user_id);
    $check->execute();
    $old = $check->get_result()->fetch_assoc();
    if (!$old) json_fail('Không tìm thấy hồ hoặc không có quyền', 403);

    $ImageURL = $CurrentImage;

    if (!empty($_FILES['ImageFile']['name'])) {
        $uploadDir = __DIR__ . '/../../../../uploads/ponds/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);

        $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp'];
        if (!in_array($ext, $allowed)) json_fail('Định dạng ảnh không hợp lệ');
        
        // [ĐÃ SỬA] Tăng giới hạn từ 5MB lên 15MB
        if ($_FILES['ImageFile']['size'] > 15 * 1024 * 1024) json_fail('Ảnh vượt quá 15MB');

        $newName = 'pond_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $uploadDir . $newName;
        if (!move_uploaded_file($_FILES['ImageFile']['tmp_name'], $destPath))
            json_fail('Không thể lưu ảnh lên server');

        $ImageURL = '/HeThongChamSocCaKoi/uploads/ponds/' . $newName;
    }

    $sql = "UPDATE Pond SET PondName=?, Volume=?, Depth=?, Type=?, CreatedAt=?, Notes=?, ImageURL=?, DrainCount=?, SkimmerCount=?, PumpingCapacity=? WHERE PondID=? AND UserID=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sddssssiiidi", $PondName, $Volume, $Depth, $Type, $CreatedAt, $Notes, $ImageURL, $DrainCount, $SkimmerCount, $PumpingCapacity, $PondID, $user_id);
    $stmt->execute();

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
