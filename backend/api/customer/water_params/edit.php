<?php
// FILE: backend/api/customer/water_params/edit.php
error_reporting(E_ALL);
ini_set('display_errors','0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c=400){
  http_response_code($c);
  echo json_encode(['success'=>false, 'error'=>$m], JSON_UNESCAPED_UNICODE);
  exit;
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

  $ParameterID = (int)($_POST['ParameterID'] ?? 0);
  $PondID = (int)($_POST['PondID'] ?? 0);
  
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
  $CO2 = $getFloat('CO2'); // Added
  $CH = $getFloat('CH');
  $GH = $getFloat('GH');
  $Note = ($_POST['Note'] ?? '') === '' ? null : trim($_POST['Note']);
  $RecordedAt = ($_POST['RecordedAt'] ?? '') === '' ? date('Y-m-d H:i:s') : $_POST['RecordedAt'];

  // Check ownership of the RECORD and POND
  $q = "SELECT WP.PondID FROM WaterParameter WP JOIN Pond P ON WP.PondID=P.PondID WHERE WP.ParameterID=? AND P.UserID=?";
  $st = $conn->prepare($q);
  $st->bind_param("ii", $ParameterID, $uid);
  $st->execute();
  if(!$st->get_result()->fetch_assoc()) fail('Không có quyền sửa bản ghi này', 403);

  // Update Query
  $sql = "UPDATE WaterParameter SET 
            PondID=?, RecordedAt=?, pH=?, Temperature=?, Ammonia=?, 
            Nitrite=?, Nitrate=?, Phosphate=?, Hardness=?, Salt=?, 
            Oxygen=?, CO2=?, CH=?, GH=?, Note=? 
          WHERE ParameterID=?";
          
  $st = $conn->prepare($sql);
  $st->bind_param(
    "isddddddddddddsi",
    $PondID, $RecordedAt, 
    $pH, $Temperature, $Ammonia, $Nitrite, $Nitrate, $Phosphate, $Hardness, $Salt, $Oxygen, $CO2, $CH, $GH, 
    $Note, $ParameterID
  );
  $st->execute();

  echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch(Throwable $e) {
  fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>