<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/cancel_plan.php
header('Content-Type: application/json; charset=utf-8');
if (session_status()===PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function json_error($m,$c=400){
  http_response_code($c);
  echo json_encode(['success'=>false,'error'=>$m], JSON_UNESCAPED_UNICODE);
  exit;
}
function json_ok($msg='OK',$extra=[]){
  echo json_encode(array_merge(['success'=>true,'message'=>$msg],$extra), JSON_UNESCAPED_UNICODE);
  exit;
}
function need_login(){
  if (empty($_SESSION['username'])) json_error('Unauthorized',401);
}
function current_user_id($conn){
  $u=$_SESSION['username']??null; if(!$u) return null;
  $st=$conn->prepare("SELECT UserID FROM Users WHERE Username=?");
  $st->bind_param("s",$u);
  $st->execute();
  $r=$st->get_result()->fetch_assoc();
  return $r['UserID']??null;
}

need_login();
$userId=current_user_id($conn);
if(!$userId) json_error('Unauthorized',401);

$id = (int)($_GET['id'] ?? 0);
if ($id<=0) json_error('Thiếu id kế hoạch');

$st = $conn->prepare("
  SELECT sp.PlanID, sp.Status, p.UserID
  FROM SaltPlan sp
  JOIN Pond p ON sp.PondID = p.PondID
  WHERE sp.PlanID = ?
");
$st->bind_param("i",$id);
$st->execute();
$r = $st->get_result()->fetch_assoc();

if(!$r) json_error('Không tìm thấy kế hoạch',404);
if((int)$r['UserID']!==(int)$userId) json_error('Bạn không có quyền hủy kế hoạch này',403);

if($r['Status']==='cancelled' || $r['Status']==='done'){
  json_ok('Kế hoạch đã ở trạng thái hoàn tất hoặc đã hủy trước đó');
}

// Cập nhật trạng thái
$upd = $conn->prepare("UPDATE SaltPlan SET Status='cancelled', EndAt=NOW() WHERE PlanID=? AND Status='active'");
$upd->bind_param("i",$id);
if(!$upd->execute()){
  json_error('Lỗi database khi cập nhật trạng thái: '.$upd->error,500);
}

json_ok('Đã hủy kế hoạch thành công',['PlanID'=>$id]);
