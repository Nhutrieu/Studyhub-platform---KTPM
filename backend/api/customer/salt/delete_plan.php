<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/delete_plan.php
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

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
if ($id<=0) json_error('Thiếu id kế hoạch');

$st = $conn->prepare("SELECT p.PlanID, p.Status, d.UserID FROM SaltPlan p JOIN Pond d ON p.PondID=d.PondID WHERE p.PlanID=?");
$st->bind_param("i",$id); $st->execute();
$r=$st->get_result()->fetch_assoc();
if(!$r) json_error('Không tìm thấy kế hoạch',404);
if((int)$r['UserID']!==(int)$userId) json_error('Không có quyền',403);
if(!in_array($r['Status'], ['done','cancelled'])) json_error('Chỉ xóa kế hoạch ở trạng thái đã hoàn tất/đã hủy');

$del1 = $conn->prepare("DELETE FROM SaltDoseStep WHERE PlanID=?");
$del1->bind_param("i",$id);
if(!$del1->execute()) json_error('Lỗi database (xóa bước): '.$del1->error,500);

$del2 = $conn->prepare("DELETE FROM SaltPlan WHERE PlanID=?");
$del2->bind_param("i",$id);
if(!$del2->execute()) json_error('Lỗi database (xóa kế hoạch): '.$del2->error,500);

json_ok('Đã xóa kế hoạch khỏi lịch sử',['PlanID'=>$id]);
