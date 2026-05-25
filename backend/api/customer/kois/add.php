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
  if (!$user) json_fail('Không tìm thấy tài khoản', 404);
  $user_id = (int)$user['UserID'];

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

  // ===== Lấy dữ liệu =====
  $PondID        = isset($_POST['PondID']) ? (int)$_POST['PondID'] : 0;
  $Name          = trim($_POST['Name'] ?? '');
  $Age           = ($_POST['Age'] ?? '') === '' ? null : (int)$_POST['Age'];
  $Length        = ($_POST['Length'] ?? '') === '' ? null : (float)$_POST['Length'];
  $Weight        = ($_POST['Weight'] ?? '') === '' ? null : (float)$_POST['Weight'];
  $Color         = $_POST['Color'] ?? null;
  $HealthStatus  = $_POST['HealthStatus'] ?? null;
  $Sex           = $_POST['Sex'] ?? 'Unknown';
  $Variety       = $_POST['Variety'] ?? null;
  $PondSince     = $_POST['PondSince'] ?? date('Y-m-d');
  $Breeder       = $_POST['Breeder'] ?? null;
  $PurchasePrice = ($_POST['PurchasePrice'] ?? '') === '' ? null : (float)$_POST['PurchasePrice'];
  $Remarks       = $_POST['Remarks'] ?? null;

  if ($Name === '') json_fail('Tên cá không được để trống!');

  // ===== Kiểm tra quyền hồ =====
  $chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
  $chk->bind_param("ii", $PondID, $user_id);
  $chk->execute();
  if (!$chk->get_result()->fetch_assoc()) json_fail('Không tìm thấy hồ hoặc không có quyền', 403);

  // ===== Upload ảnh =====
  $ImageURL = null;
  if (!empty($_FILES['ImageFile']['name'])) {
    $uploadDir = __DIR__ . '/../../../../uploads/kois/';
    if (!is_dir($uploadDir)) @mkdir($uploadDir, 0777, true);
    $ext = strtolower(pathinfo($_FILES['ImageFile']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','gif','webp'];
    if (!in_array($ext, $allowed)) json_fail('Định dạng ảnh không hợp lệ!');
    if (!empty($_FILES['ImageFile']['size']) && $_FILES['ImageFile']['size'] > 5*1024*1024)
      json_fail('Ảnh vượt quá 5MB!');
    $newName = 'koi_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $uploadDir . $newName;
    if (!move_uploaded_file($_FILES['ImageFile']['tmp_name'], $dest))
      json_fail('Không thể lưu ảnh lên server!');
    $ImageURL = '/HeThongChamSocCaKoi/uploads/kois/' . $newName;
  }

  // ===== Thêm cá Koi =====
  $sql = "INSERT INTO `KoiFish`
          (`PondID`,`Name`,`Age`,`Length`,`Weight`,`Color`,`HealthStatus`,
           `Sex`,`Variety`,`PondSince`,`Breeder`,`PurchasePrice`,
           `Remarks`,`ImageURL`)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

  $st = $conn->prepare($sql);
  $st->bind_param(
    "isiddsssssssds",
    $PondID, $Name, $Age, $Length, $Weight, $Color, $HealthStatus,
    $Sex, $Variety, $PondSince, $Breeder, $PurchasePrice,
    $Remarks, $ImageURL
  );
  $st->execute();

  // ===== Lấy ID cá vừa thêm =====
  $FishID = $st->insert_id;

  // ===== Thêm bản ghi lịch sử tăng trưởng đầu tiên =====
  if (!is_null($Length) && !is_null($Weight)) {
    $note = "Lần đo đầu tiên";
    $st2 = $conn->prepare("INSERT INTO `KoiGrowthHistory`
                           (`FishID`, `MeasuredAt`, `Length`, `Weight`, `Note`)
                           VALUES (?, CURDATE(), ?, ?, ?)");
    $st2->bind_param("idds", $FishID, $Length, $Weight, $note);
    $st2->execute();
  }

  echo json_encode(['success' => true, 'FishID' => $FishID], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>
