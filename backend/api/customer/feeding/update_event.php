<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg) {
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================
// Parse JSON
// =============================
$input = json_decode(file_get_contents("php://input"), true);
if (!$input) bail("Invalid JSON");

$eventId = intval($input['event_id'] ?? 0);
$given   = floatval($input['amount_given'] ?? 0);
$note    = $input['observation'] ?? null;
$leftoverFlag = isset($input['leftover_flag']) ? intval($input['leftover_flag']) : 0;

if ($eventId <= 0) bail("event_id invalid");

// =============================
// 1. Lấy PondID + PlanID + ngày ăn
// =============================
$q = $conn->prepare("
    SELECT fe.PlanID, fp.PondID, DATE(fe.ScheduledAt) AS FeedDate
    FROM FeedingEvent fe
    JOIN FeedingPlan fp ON fe.PlanID = fp.PlanID
    WHERE fe.EventID = ?
");
$q->bind_param("i", $eventId);
$q->execute();
$info = $q->get_result()->fetch_assoc();

if (!$info) bail("Event không tồn tại");

$pondId   = intval($info['PondID']);
$planId   = intval($info['PlanID']);
$feedDate = $info['FeedDate']; 

// =============================
// 2. Snapshot nhiệt độ
// =============================
$waterTemp = null;
$q2 = $conn->prepare("SELECT Temperature FROM WaterParameter WHERE PondID = ? ORDER BY RecordedAt DESC LIMIT 1");
$q2->bind_param("i", $pondId);
$q2->execute();
$tmp = $q2->get_result()->fetch_assoc();
if ($tmp) $waterTemp = $tmp['Temperature'];

// =============================
// 3. Update FeedingEvent hiện tại
// =============================
$stmt = $conn->prepare("
    UPDATE FeedingEvent
    SET AmountGiven       = ?,
        ExecutedAt        = NOW(),
        Observation       = ?,
        WaterTempSnapshot = ?,
        LeftoverFlag      = ?,
        AutoFeedFlag      = 0,
        AIAdjusted        = 0
    WHERE EventID = ?
");
$stmt->bind_param("dsdii", $given, $note, $waterTemp, $leftoverFlag, $eventId);
$stmt->execute();

// =============================
// 4. [LOGIC MỚI] Kiểm tra xem còn cữ nào TRONG TƯƠNG LAI chưa làm không?
// =============================
// Thay vì đếm tổng số, ta chỉ tìm xem còn cữ nào chưa có AmountGiven VÀ thời gian > Hiện tại (cho phép trễ 1 chút, ví dụ so với NOW)
// Nếu count = 0 nghĩa là: Các cữ còn lại hoặc là đã xong, hoặc là đã quá khứ (bỏ qua). -> DONE.

$q3 = $conn->prepare("
    SELECT COUNT(*) as remaining
    FROM FeedingEvent
    WHERE PlanID = ?
      AND DATE(ScheduledAt) = ?
      AND AmountGiven IS NULL
      AND ScheduledAt > NOW() 
");
$q3->bind_param("is", $planId, $feedDate);
$q3->execute();
$cnt = $q3->get_result()->fetch_assoc();

$remaining = intval($cnt['remaining'] ?? 0);

// Nếu không còn cữ nào trong tương lai chờ xử lý -> Coi như xong ngày hôm nay
$allDone = ($remaining === 0);

// =============================
// 5. Xử lý hoàn tất
// =============================
if ($allDone) {
    // Đánh dấu plan đã hoàn tất
    $up = $conn->prepare("UPDATE FeedingPlan SET Status='done' WHERE PlanID=?");
    $up->bind_param("i", $planId);
    $up->execute();

    // Trigger AI learn
    $secretKey = "@Learn01060501"; 
    $url = "http://localhost:8080/HeThongChamSocCaKoi/backend/api/customer/feeding/ai_learn.php"
         . "?pond_id={$pondId}&cron_key={$secretKey}";
    
    // Gọi không đồng bộ (timeout cực ngắn để không treo user)
    $ctx = stream_context_create(['http'=>['timeout' => 0.1]]);
    @file_get_contents($url, false, $ctx);
}

echo json_encode([
    'success'  => true,
    'all_done' => $allDone,
    'debug_rem'=> $remaining
], JSON_UNESCAPED_UNICODE);
?>