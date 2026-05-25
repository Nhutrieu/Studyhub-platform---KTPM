<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/get_plan.php
// FIXED VERSION
header('Content-Type: application/json; charset=utf-8');
if (session_status()===PHP_SESSION_NONE) session_start();

require_once '../../../../includes/db.php';

function json_error($m,$c=400){
  http_response_code($c);
  echo json_encode(['success'=>false,'error'=>$m], JSON_UNESCAPED_UNICODE);
  exit;
}

function json_success($data){
    echo json_encode(['success'=>true,'data'=>$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function need_login(){ 
    if (empty($_SESSION['username'])) json_error('Unauthorized',401); 
}

function current_user_id($conn){
  $u=$_SESSION['username']??null; 
  if(!$u) return null;
  $st=$conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s",$u);
  $st->execute();
  $r=$st->get_result()->fetch_assoc();
  return $r['UserID']??null;
}

need_login();
$userId = current_user_id($conn);
if(!$userId) json_error('Unauthorized',401);

$id = (int)($_GET['id'] ?? 0);
if ($id<=0) json_error('Thiếu id kế hoạch');

$st = $conn->prepare("
  SELECT sp.*, p.PondName, p.UserID
  FROM SaltPlan sp 
  JOIN Pond p ON sp.PondID = p.PondID
  WHERE sp.PlanID = ?
");
if (!$st) json_error('Lỗi chuẩn bị truy vấn: ' . $conn->error);

$st->bind_param("i",$id);
if (!$st->execute()) json_error('Lỗi thực thi truy vấn: ' . $st->error);

$plan = $st->get_result()->fetch_assoc();

if (!$plan) json_error('Không tìm thấy kế hoạch',404);
if ((int)$plan['UserID'] !== (int)$userId) json_error('Bạn không có quyền xem kế hoạch này',403);

// Bỏ UserID để tránh lộ thông tin nội bộ
unset($plan['UserID']);

// Lấy danh sách bước
$st2 = $conn->prepare("
  SELECT StepID, StepIndex, ScheduledAt, DeltaPercent, ExpectedSaltGrams, 
         ExpectedPercentAfter, ExecutedAt, AddedSaltGrams, WaterChangeLiters,
         MeasuredPercent, ParameterID, CreatedAt, Note, SourceSalinity
  FROM SaltDoseStep
  WHERE PlanID = ?
  ORDER BY StepIndex ASC
");
if (!$st2) json_error('Lỗi chuẩn bị truy vấn steps: ' . $conn->error);

$st2->bind_param("i",$id);
if (!$st2->execute()) json_error('Lỗi thực thi truy vấn steps: ' . $st2->error);

$res2 = $st2->get_result();

$steps = [];
while($s = $res2->fetch_assoc()) $steps[] = $s;

json_success(['plan'=>$plan,'steps'=>$steps]);

$conn->close();
?>