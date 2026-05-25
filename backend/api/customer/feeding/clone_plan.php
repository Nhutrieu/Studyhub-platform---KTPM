<?php
// FILE: backend/api/customer/feeding/clone_plan.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$pond_id = intval($input['pond_id'] ?? 0);

if ($pond_id <= 0) bail('Pond ID required');

// --- Auth Check ---
if (empty($_SESSION['username'])) bail('Unauthorized', 401);
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail('Unauthorized', 401);

$chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii", $pond_id, $uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) bail('Forbidden', 403);

// =======================================================================
// FIX LOGIC NGHIỆP VỤ
// =======================================================================

// 1. CHẶN TRÙNG NGÀY: Nếu hôm nay hồ này đã có plan (Active hoặc Done) -> Cấm tạo thêm.
$today = date("Y-m-d");
$chkToday = $conn->prepare("
    SELECT PlanID, Status 
    FROM FeedingPlan 
    WHERE PondID = ? AND DATE(CreatedAt) = ? AND Status != 'cancelled'
");
$chkToday->bind_param("is", $pond_id, $today);
$chkToday->execute();
if ($chkToday->get_result()->fetch_assoc()) {
    bail('Hôm nay hồ này đã có kế hoạch cho ăn rồi. Bạn không cần tạo thêm.', 409);
}

// 2. LẤY NGUỒN COPY: Lấy plan mới nhất
$sqlGetLast = "
    SELECT * FROM FeedingPlan 
    WHERE PondID = ? 
    ORDER BY CreatedAt DESC 
    LIMIT 1
";
$stmtSrc = $conn->prepare($sqlGetLast);
$stmtSrc->bind_param("i", $pond_id);
$stmtSrc->execute();
$sourcePlan = $stmtSrc->get_result()->fetch_assoc();

if (!$sourcePlan) {
    bail('Hồ này chưa có lịch sử cho ăn nào để sao chép.', 404);
}

// --- 3. Tạo Plan Mới (Clone) ---
$newNote = "Sao chép từ kế hoạch #" . $sourcePlan['PlanID'];

$ins = $conn->prepare("
    INSERT INTO FeedingPlan 
    (PondID, Objective, FeedRatePct, DailyFeedGrams, FishCount, AvgWeight, 
     ProteinPct, WaterTemp, FeedType, Source, WeatherCondition, TemplateID, Note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$weather = null; 
$sourceType = 'manual';
$templateID = $sourcePlan['PlanID'];

$ins->bind_param(
    "isddidddsssis",
    $pond_id,
    $sourcePlan['Objective'],
    $sourcePlan['FeedRatePct'],
    $sourcePlan['DailyFeedGrams'],
    $sourcePlan['FishCount'],
    $sourcePlan['AvgWeight'],
    $sourcePlan['ProteinPct'],
    $sourcePlan['WaterTemp'],
    $sourcePlan['FeedType'],
    $sourceType,
    $weather,
    $templateID,
    $newNote
);

if (!$ins->execute()) {
    bail('Lỗi khi tạo bản sao: ' . $ins->error, 500);
}
$newPlanId = $conn->insert_id;

// --- 4. Tạo Events (GIỮ NGUYÊN TẤT CẢ CỮ - KHÔNG BỎ QUA) ---
$evtQ = $conn->prepare("SELECT FeedIndex, AmountExpected FROM FeedingEvent WHERE PlanID = ? ORDER BY FeedIndex ASC");
$evtQ->bind_param("i", $sourcePlan['PlanID']);
$evtQ->execute();
$oldEvents = $evtQ->get_result()->fetch_all(MYSQLI_ASSOC);

$todayStr = date("Y-m-d");
// $currentTimeStr = date("H:i"); // Không cần dùng nữa vì không check skip
$stdTimes = ['08:00', '13:00', '17:00', '21:00']; 

$insEvt = $conn->prepare("INSERT INTO FeedingEvent (PlanID, FeedIndex, ScheduledAt, AmountExpected) VALUES (?, ?, ?, ?)");

foreach ($oldEvents as $k => $evt) {
    $idx = $evt['FeedIndex'];
    $amt = floatval($evt['AmountExpected']);
    $timeStr = $stdTimes[$k] ?? '08:00';
    
    // [FIX QUAN TRỌNG]: Đã xóa đoạn check if ($timeStr < $currentTimeStr) continue;
    // Bây giờ ta cứ insert hết, Frontend (JS) sẽ tự lo việc hiển thị disable nếu quá giờ.
    
    $scheduledAt = $todayStr . " " . $timeStr;
    $insEvt->bind_param("iisd", $newPlanId, $idx, $scheduledAt, $amt);
    $insEvt->execute();
}

echo json_encode([
    'success' => true, 
    'message' => 'Đã áp dụng lại kế hoạch cũ thành công!',
    'plan_id' => $newPlanId
]);
?>