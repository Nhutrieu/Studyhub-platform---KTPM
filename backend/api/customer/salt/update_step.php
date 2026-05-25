<?php
header('Content-Type: application/json; charset=utf-8');
if (session_status()===PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function json_error($m,$c=400){ http_response_code($c); echo json_encode(['success'=>false,'error'=>$m], JSON_UNESCAPED_UNICODE); exit; }
function json_ok($m='OK',$extra=[]){ echo json_encode(array_merge(['success'=>true,'message'=>$m],$extra), JSON_UNESCAPED_UNICODE); exit; }
function need_login(){ if(empty($_SESSION['username'])) json_error('Unauthorized',401); }
function current_user_id($conn){
  $u=$_SESSION['username']??null; if(!$u) return null;
  $st=$conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s",$u); $st->execute();
  $r=$st->get_result()->fetch_assoc(); return $r['UserID']??null;
}

need_login();
$userId=current_user_id($conn);
if(!$userId) json_error('Unauthorized',401);

$stepId = (int)($_POST['StepID'] ?? 0);
if ($stepId<=0) json_error('Thiếu StepID');

$st = $conn->prepare("
  SELECT s.*, p.PondID, pd.UserID AS OwnerID
  FROM SaltDoseStep s
  JOIN SaltPlan p ON s.PlanID=p.PlanID
  JOIN Pond pd ON p.PondID=pd.PondID
  WHERE s.StepID=?
");
$st->bind_param("i",$stepId); $st->execute();
$s = $st->get_result()->fetch_assoc();
if(!$s) json_error('Không tìm thấy bước',404);
if((int)$s['OwnerID']!==(int)$userId) json_error('Không có quyền',403);

$AddedSaltGrams = $_POST['AddedSaltGrams'] ?? null;
$WaterChangeLiters = $_POST['WaterChangeLiters'] ?? null;
$MeasuredPercent = $_POST['MeasuredPercent'] ?? null;

$upd = $conn->prepare("
  UPDATE SaltDoseStep 
  SET ExecutedAt=NOW(), AddedSaltGrams=?, WaterChangeLiters=?, MeasuredPercent=? 
  WHERE StepID=?
");
$upd->bind_param("dddi",$AddedSaltGrams,$WaterChangeLiters,$MeasuredPercent,$stepId);
if(!$upd->execute()) json_error('Lỗi database: '.$upd->error,500);

// Kiểm tra nếu tất cả bước đã xong
$planId = (int)$s['PlanID'];
$chk = $conn->prepare("SELECT COUNT(*) AS remain FROM SaltDoseStep WHERE PlanID=? AND ExecutedAt IS NULL");
$chk->bind_param("i",$planId); $chk->execute();
$remain = $chk->get_result()->fetch_assoc()['remain'] ?? 0;
if ((int)$remain === 0){
  $done = $conn->prepare("UPDATE SaltPlan SET Status='done', EndAt=NOW() WHERE PlanID=?");
  $done->bind_param("i",$planId);
  $done->execute();
}

json_ok('Đã cập nhật bước châm muối',['PlanID'=>$planId]);
