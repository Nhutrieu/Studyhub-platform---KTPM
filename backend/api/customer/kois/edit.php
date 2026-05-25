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
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $username);
    $st->execute();
    $user = $st->get_result()->fetch_assoc();
    if (!$user) json_fail('Không tìm thấy user', 404);
    $user_id = (int)$user['UserID'];

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

    // ===== Lấy dữ liệu =====
    $FishID         = (int)($_POST['FishID'] ?? 0);
    $PondID         = (int)($_POST['PondID'] ?? 0);
    $Name           = trim($_POST['Name'] ?? '');
    $Age            = ($_POST['Age'] ?? '') === '' ? null : (float)$_POST['Age']; // Đổi sang float cho tuổi bán lẻ
    $Length         = ($_POST['Length'] ?? '') === '' ? null : (float)$_POST['Length'];
    $Weight         = ($_POST['Weight'] ?? '') === '' ? null : (float)$_POST['Weight'];
    $Color          = $_POST['Color'] ?? null;
    $HealthStatus   = $_POST['HealthStatus'] ?? null;

    // Map giới tính về đúng ENUM trong DB
    $SexInput = $_POST['Sex'] ?? '';
    $Sex = match ($SexInput) {
        'Đực' => 'Male',
        'Cái' => 'Female',
        'Male', 'Female', 'Unknown' => $SexInput,
        default => 'Unknown',
    };

    $Variety        = $_POST['Variety'] ?? null;
    $PondSince      = $_POST['PondSince'] ?? date('Y-m-d');
    $Breeder        = $_POST['Breeder'] ?? null;
    // Xóa định dạng tiền tệ trước khi chuyển sang float
    $price_str = str_replace(['.', ','], '', $_POST['PurchasePrice'] ?? ''); 
    $PurchasePrice = ($price_str === '' || $price_str === '0') ? null : (float)$price_str;
    
    $Remarks        = $_POST['Remarks'] ?? null;
    $CurrentImage   = $_POST['CurrentImageURL'] ?? null;

    if ($Name === '') json_fail('Tên cá không được để trống!');
    if ($FishID <= 0) json_fail('ID cá không hợp lệ cho việc chỉnh sửa');

    // ===== Kiểm tra quyền sở hữu cá & lấy thông tin cũ =====
    $q = "SELECT KF.ImageURL, KF.Length AS OldLength, KF.Weight AS OldWeight
          FROM KoiFish KF
          JOIN Pond P ON KF.PondID = P.PondID
          WHERE KF.FishID=? AND P.UserID=?";
    $st = $conn->prepare($q);
    $st->bind_param("ii", $FishID, $user_id);
    $st->execute();
    $own = $st->get_result()->fetch_assoc();
    if (!$own) json_fail('Không tìm thấy cá hoặc không có quyền', 403);

    $OldLength = (float)$own['OldLength'];
    $OldWeight = (float)$own['OldWeight'];

    // ===== Nếu đổi hồ, xác nhận hồ mới vẫn thuộc user =====
    $chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
    $chk->bind_param("ii", $PondID, $user_id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) json_fail('Hồ được chọn không thuộc tài khoản của bạn', 403);

    // ===== Upload ảnh mới (nếu có) VÀ XOÁ ẢNH CŨ =====
    $ImageURL = $CurrentImage ?: $own['ImageURL'];
    if (!empty($_FILES['ImageFile']['name'])) {
        $uploadDir = __DIR__ . '/../../../../uploads/kois/';
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
        
        $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($ext, $allowed)) json_fail('Định dạng ảnh không hợp lệ');
        if (!empty($_FILES['ImageFile']['size']) && $_FILES['ImageFile']['size'] > 5 * 1024 * 1024)
            json_fail('Ảnh vượt quá 5MB');
        
        $newName = 'koi_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest = $uploadDir . $newName;
        
        if (move_uploaded_file($_FILES['ImageFile']['tmp_name'], $dest)) {
            // XÓA ẢNH CŨ SAU KHI UPLOAD THÀNH CÔNG
            if (!empty($own['ImageURL'])) {
                $old_path = $_SERVER['DOCUMENT_ROOT'] . parse_url($own['ImageURL'], PHP_URL_PATH);
                if (file_exists($old_path) && strpos($old_path, 'uploads/kois/') !== false) {
                    @unlink($old_path);
                }
            }
            $ImageURL = '/HeThongChamSocCaKoi/uploads/kois/' . $newName;
        } else {
            json_fail('Không thể lưu ảnh lên server');
        }
    }

    // ===== Cập nhật dữ liệu =====
    $sql = "UPDATE `KoiFish`
             SET `PondID`=?, `Name`=?, `Age`=?, `Length`=?, `Weight`=?, `Color`=?, 
                 `HealthStatus`=?, `Sex`=?, `Variety`=?, `PondSince`=?, 
                 `Breeder`=?, `PurchasePrice`=?, `Remarks`=?, `ImageURL`=?
             WHERE `FishID`=? AND `PondID` IN (SELECT PondID FROM Pond WHERE UserID=?)";

    // Chuyển Age từ float về int nếu Age không null (chỉ đảm bảo tương thích với DB)
    $AgeForDb = is_null($Age) ? null : round($Age); 

    $st = $conn->prepare($sql);
    $st->bind_param(
        "isiddsssssssdsii",
        $PondID, $Name, $AgeForDb, $Length, $Weight, $Color,
        $HealthStatus, $Sex, $Variety, $PondSince,
        $Breeder, $PurchasePrice, $Remarks, $ImageURL,
        $FishID, $user_id
    );
    $st->execute();

    // ===== Nếu có thay đổi về chiều dài hoặc cân nặng → lưu lịch sử tăng trưởng =====
    // So sánh Length và Weight hiện tại với OldLength/OldWeight
    $CurrentLength = is_null($Length) ? 0 : $Length;
    $CurrentWeight = is_null($Weight) ? 0 : $Weight;

    if ($CurrentLength > 0 && $CurrentWeight > 0 && ($CurrentLength != $OldLength || $CurrentWeight != $OldWeight)) {
        $note = "Cập nhật tăng trưởng (Hồ sơ)";
        $st2 = $conn->prepare("INSERT INTO `KoiGrowthHistory`
                               (`FishID`, `MeasuredAt`, `Length`, `Weight`, `Note`)
                               VALUES (?, NOW(), ?, ?, ?)"); // Dùng NOW() để không bị trùng khóa MeasuredAt (nếu có đo nhiều lần trong ngày)
        $st2->bind_param("idds", $FishID, $CurrentLength, $CurrentWeight, $note);
        $st2->execute();
    }

    echo json_encode(['success' => true, 'image' => $ImageURL, 'sex' => $Sex], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>