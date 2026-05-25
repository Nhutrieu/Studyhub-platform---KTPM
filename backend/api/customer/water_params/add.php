<?php
// FILE: backend/api/customer/water_params/add.php
// VERSION: V3.0 - Supports CO2 & Notification
error_reporting(E_ALL);
ini_set('display_errors','0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m,$c=400){
  http_response_code($c);
  echo json_encode(['success'=>false,'error'=>$m], JSON_UNESCAPED_UNICODE);
  exit;
}

// Notification Logic
function checkAndNotify($conn, $uid, $params) {
    $alerts = [];
    if (!is_null($params['Ammonia']) && $params['Ammonia'] > 0.02) $alerts[] = "NH3 cao ({$params['Ammonia']} mg/L)";
    if (!is_null($params['Nitrite']) && $params['Nitrite'] > 0.05) $alerts[] = "NO2 cao ({$params['Nitrite']} mg/L)";
    if (!is_null($params['pH']) && ($params['pH'] < 6.5 || $params['pH'] > 8.5)) $alerts[] = "pH bất thường ({$params['pH']})";
    if (!is_null($params['Salt']) && $params['Salt'] > 0.7) $alerts[] = "Độ mặn quá cao ({$params['Salt']}%)";

    if (!empty($alerts)) {
        $title = "Cảnh báo chất lượng nước";
        $msg = "Phát hiện chỉ số nguy hiểm: " . implode(", ", $alerts);
        $link = "/HeThongChamSocCaKoi/frontend/customer/water_para.php";
        
        $sql = "INSERT INTO SystemNotifications (UserID, Type, Title, Message, Link, IsRead) VALUES (?, 'danger', ?, ?, ?, 0)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isss", $uid, $title, $msg, $link);
        $stmt->execute();
    }
}

try {
  if(!isset($_SESSION['username'])) fail('Chưa đăng nhập!', 401);
  $u = $_SESSION['username'];
  $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s", $u); 
  $st->execute();
  $user = $st->get_result()->fetch_assoc();
  if(!$user) fail('Không tìm thấy tài khoản', 404);
  $uid = (int)$user['UserID'];

  if($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Phương thức không hợp lệ', 405);

  $PondID = (int)($_POST['PondID'] ?? 0);
  
  // Helper function to get float or null
  $getFloat = fn($key) => ($_POST[$key] ?? '') === '' ? null : (float)$_POST[$key];

  $pH = $getFloat('pH');
  $Temperature = $getFloat('Temperature');
  $Ammonia = $getFloat('Ammonia');
  $Nitrite = $getFloat('Nitrite');
  $Nitrate = $getFloat('Nitrate');
  $Phosphate = $getFloat('Phosphate');
  $Hardness = $getFloat('Hardness');
  $Salt = $getFloat('Salt');
  $Oxygen = $getFloat('Oxygen');
  $CO2 = $getFloat('CO2'); // CO2 added
  $CH = $getFloat('CH');
  $GH = $getFloat('GH');
  $Note = ($_POST['Note'] ?? '') === '' ? null : trim($_POST['Note']);
  $RecordedAt = ($_POST['RecordedAt'] ?? '') === '' ? date('Y-m-d H:i:s') : $_POST['RecordedAt'];

  // Check ownership
  $c = $conn->prepare("SELECT 1 FROM Pond WHERE PondID=? AND UserID=?");
  $c->bind_param("ii", $PondID, $uid);
  $c->execute();
  if(!$c->get_result()->fetch_assoc()) fail('Hồ không thuộc tài khoản của bạn', 403);

  // Insert Query (Updated with CO2)
  $sql = "INSERT INTO WaterParameter 
          (PondID, RecordedAt, pH, Temperature, Ammonia, Nitrite, Nitrate, Phosphate, Hardness, Salt, Oxygen, CO2, CH, GH, Note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  $st = $conn->prepare($sql);
  
  // Bind params: i (1) + s (1) + d (12 metrics) + s (1) = "isdddddddddddds"
  $st->bind_param(
    "isdddddddddddds",
    $PondID, $RecordedAt, 
    $pH, $Temperature, $Ammonia, $Nitrite, $Nitrate, $Phosphate, $Hardness, $Salt, $Oxygen, $CO2, $CH, $GH, 
    $Note
  );
  $st->execute();

  // Trigger Notification
  checkAndNotify($conn, $uid, ['Ammonia' => $Ammonia, 'Nitrite' => $Nitrite, 'pH' => $pH, 'Salt' => $Salt]);

  echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>