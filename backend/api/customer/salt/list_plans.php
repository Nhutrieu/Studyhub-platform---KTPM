<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/list_plans.php
// FIXED VERSION: Trả về JSON đúng định dạng
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
    if (empty($_SESSION['username'])) json_error('Unauthorized', 401); 
}

function current_user_id($conn){
    $u = $_SESSION['username'] ?? null; 
    if(!$u) return null;
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $u); 
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    return $r['UserID'] ?? null;
}

need_login();
$userId = current_user_id($conn);
if(!$userId) json_error('Unauthorized', 401);

$status = $_GET['status'] ?? 'active'; // active | history | all
$limit  = (int)($_GET['limit'] ?? 300);
if ($limit <= 0 || $limit > 1000) $limit = 300;

// Xây dựng điều kiện WHERE
$where = "po.UserID = ?";
$params = [$userId];
$types = "i";

if ($status === 'active') {
    $where .= " AND sp.Status = 'active'";
} elseif ($status === 'history') {
    $where .= " AND sp.Status IN ('done','cancelled')";
}
// else: all - không thêm điều kiện

// Câu lệnh SQL
$sql = "SELECT sp.PlanID, sp.PondID, po.PondName, sp.Status, sp.TargetPercent, 
               sp.VolumeLiters, sp.StartAt, sp.SourceWaterSalinity, sp.Mode, sp.Purpose,
               sp.StartPercent
        FROM SaltPlan sp
        JOIN Pond po ON sp.PondID = po.PondID
        WHERE $where
        ORDER BY sp.StartAt DESC
        LIMIT ?";
        
$params[] = $limit;
$types .= "i";

$st = $conn->prepare($sql);
if (!$st) {
    json_error('Lỗi chuẩn bị truy vấn: ' . $conn->error);
}

$st->bind_param($types, ...$params);
if (!$st->execute()) {
    json_error('Lỗi thực thi truy vấn: ' . $st->error);
}

$rs = $st->get_result();

$out = [];
while($row = $rs->fetch_assoc()){
    $planId = (int)$row['PlanID'];
    
    // Lấy steps
    $st2 = $conn->prepare("SELECT StepIndex, ExpectedSaltGrams, ExpectedPercentAfter 
                          FROM SaltDoseStep 
                          WHERE PlanID = ? 
                          ORDER BY StepIndex ASC 
                          LIMIT 3");
    $steps = [];
    if ($st2) {
        $st2->bind_param("i", $planId);
        $st2->execute();
        $r2 = $st2->get_result();
        while($s = $r2->fetch_assoc()){
            $steps[] = [
                'Index' => (int)$s['StepIndex'],
                'AddGrams' => (float)$s['ExpectedSaltGrams'],
                'EstSalinity' => (float)$s['ExpectedPercentAfter']
            ];
        }
        $st2->close();
    }

    $out[] = [
        'PlanID' => $planId,
        'PondID' => (int)$row['PondID'],
        'PondName' => $row['PondName'] ?? 'Chưa đặt tên',
        'Status' => $row['Status'],
        'TargetSalinity' => (float)$row['TargetPercent'],
        'StartSalinity' => (float)($row['StartPercent'] ?? 0),
        'Volume' => (float)$row['VolumeLiters'],
        'StartDate' => $row['StartAt'],
        'Mode' => $row['Mode'] ?? 'main',
        'Purpose' => $row['Purpose'] ?? 'stabilize',
        'SourceWaterSalinity' => (float)($row['SourceWaterSalinity'] ?? 0),
        'Steps' => $steps
    ];
}

json_success($out);
?>