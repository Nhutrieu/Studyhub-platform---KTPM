<?php
// FILE: backend/api/customer/feeding/create_plan.php
// VERSION: V3.2 - FIX MANUAL PRO MEAL TIME
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input) bail('Invalid JSON');

$pond_id = intval($input['pond_id'] ?? 0);
if ($pond_id <= 0) bail('pond_id required');

// ---------- Auth ----------
if (empty($_SESSION['username'])) bail('Unauthorized', 401);
$u = $_SESSION['username'];

$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail('Unauthorized', 401);

// Kiểm tra quyền sở hữu hồ
$chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii", $pond_id, $uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) bail('Forbidden', 403);

// =======================================================================
// [FIX 1] Check Active Plan
// =======================================================================
// Lưu ý: Chỉ chặn nếu có plan active, nhưng nếu lưu cho ngày mai thì logic này có thể cần nới lỏng
// Tuy nhiên để an toàn, nếu đang có 1 plan chưa xong thì không nên tạo thêm plan mới kể cả cho ngày mai (tránh chồng chéo).
$chkActive = $conn->prepare("SELECT PlanID FROM FeedingPlan WHERE PondID = ? AND Status = 'active'");
$chkActive->bind_param("i", $pond_id);
$chkActive->execute();
if ($chkActive->get_result()->fetch_assoc()) {
    bail('Hồ này đang có một kế hoạch chưa hoàn thành. Vui lòng vào "Kế hoạch đang chạy" để hoàn tất hoặc hủy kế hoạch cũ trước khi tạo mới.', 409);
}

// ---------- Chuẩn bị dữ liệu ----------
$f = $input;
$objective = $f['objective'] ?? 'growth';
$mode = $f['mode'] ?? 'ai';
$source = ($mode === 'manual') ? 'manual' : 'ai';

// Ghi chú & Recommendation
$userNote = trim($f['note'] ?? '');
$aiRec = trim($f['recommendation'] ?? '');
if ($userNote && $aiRec) {
    $note = $userNote . "\n\n---\nGợi ý AI:\n" . $aiRec;
} else {
    $note = $userNote ?: $aiRec;
}

// [V3.0] Xử lý Weather Risk lưu vào DB
$weatherData = $f['weather_risk'] ?? null;
$weatherCondition = "stable"; // Mặc định

if ($weatherData && isset($weatherData['level']) && $weatherData['level'] !== 'safe') {
    $weatherCondition = $weatherData['level']; // 'danger' hoặc 'warning'
    
    // Tự động append vào Note để lưu bằng chứng tại sao giảm ăn
    $weatherMsg = $weatherData['message'] ?? 'Phát hiện rủi ro thời tiết.';
    $note .= "\n\n[System] ⚠️ " . $weatherMsg;
}

$feedType = 'floating';
if (!empty($f['feed_type']) && in_array($f['feed_type'], ['floating','sinking','mixed'], true)) {
    $feedType = $f['feed_type'];
}

// Input data
$feedRatePct = floatval($f['feed_rate_pct'] ?? 0);
$dailyFeed = floatval($f['daily_feed_g'] ?? 0);
$fishCount = intval($f['fish_count'] ?? 0);
$avgWeight = floatval($f['avg_weight'] ?? 0);
$proteinPct = isset($f['protein_pct']) ? floatval($f['protein_pct']) : null;
$waterTemp = isset($f['water_temp']) ? floatval($f['water_temp']) : null;

// [MỚI V3.1] Nhận ngày áp dụng từ Client (planning_date)
// Định dạng yêu cầu: YYYY-MM-DD
$reqDate = $f['planning_date'] ?? '';
if ($reqDate && preg_match("/^\d{4}-\d{2}-\d{2}$/", $reqDate)) {
    $planningDate = $reqDate;
    // append note để biết là lưu trước
    if ($planningDate > date("Y-m-d")) {
        $note .= "\n(Kế hoạch được tạo trước cho ngày: $planningDate)";
    }
} else {
    $planningDate = date("Y-m-d");
}

if ($planningDate < date("Y-m-d", strtotime("-1 day"))) {
    bail("Không thể tạo kế hoạch cho quá khứ xa.");
}

// Sanity check cơ bản (Dù advisor đã check, check lại cho chắc)
// Lưu ý: Nếu weather risk = danger thì dailyFeed có thể = 0, nên ta cho phép dailyFeed >= 0
if ($feedRatePct < 0 || $dailyFeed < 0 || $fishCount <= 0 || $avgWeight <= 0) {
    bail('Dữ liệu kế hoạch không hợp lệ.', 400);
}

// ---------- INSERT FeedingPlan ----------
// [UPDATE] Thêm cột PlanningDate và WeatherCondition
$sqlInsert = "
    INSERT INTO FeedingPlan
    (PondID, Objective, FeedRatePct, DailyFeedGrams, FishCount, AvgWeight,
    ProteinPct, WaterTemp, FeedType, Note, Source, WeatherCondition, PlanningDate)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
";

$stmt = $conn->prepare($sqlInsert);
$stmt->bind_param(
    "isddidddsssss",
    $pond_id,
    $objective,
    $feedRatePct,
    $dailyFeed,
    $fishCount,
    $avgWeight,
    $proteinPct,
    $waterTemp,
    $feedType,
    $note,
    $source,
    $weatherCondition,
    $planningDate
);

if (!$stmt->execute()) {
    bail('Database insert failed: ' . $stmt->error, 500);
}

$planId = $conn->insert_id;

// =======================================================================
// [FIX V3.2] TẠO EVENTS THEO LỊCH MANUAL PRO NẾU CÓ
// =======================================================================

$st = $conn->prepare("
    INSERT INTO FeedingEvent (PlanID, FeedIndex, ScheduledAt, AmountExpected)
    VALUES (?, ?, ?, ?)
");

// Kiểm tra xem có dữ liệu Manual Meals được gửi lên không
$manualMeals = $f['manual_meals'] ?? null;

if ($dailyFeed == 0) {
    // Trường hợp đặc biệt: Ngừng ăn
    $scheduledAt = $planningDate . " 08:00";
    $zero = 0;
    $idx = 1;
    $st->bind_param("iisd", $planId, $idx, $scheduledAt, $zero);
    $st->execute();
} elseif ($source === 'manual' && is_array($manualMeals) && count($manualMeals) > 0) {
    // Trường hợp 1: Manual Pro (Ưu tiên lịch và tỷ lệ của người dùng)
    $totalRatio = array_sum(array_column($manualMeals, 'ratio'));
    $factor = $totalRatio > 0 ? 1 / $totalRatio : 0; // Tỷ lệ chuẩn hóa

    foreach ($manualMeals as $i => $meal) {
        $ratio = floatval($meal['ratio'] ?? 0);
        $mealTime = trim($meal['time'] ?? '00:00'); // Lấy giờ tùy chỉnh

        if ($ratio <= 0 || $mealTime === '00:00') continue; // Bỏ qua cữ 0% hoặc không có giờ

        // Tính lại amount dựa trên tỷ lệ chuẩn hóa
        $pct = $ratio * $factor;
        $amt = round($dailyFeed * $pct, 2);
        $idx = $i + 1; // Index 1-based

        // ScheduledAt phải ghép theo PlanningDate và MealTime tùy chỉnh
        $scheduledAt = $planningDate . " " . $mealTime . ":00"; // Thêm giây

        $st->bind_param("iisd", $planId, $idx, $scheduledAt, $amt);
        $st->execute();
    }

} else {
    // Trường hợp 2: AI Mode (Dùng split mặc định hoặc từ AI tính toán)
    $split = $f['split'] ?? [0.4, 0.3, 0.3];
    $stdTimes = ['08:00','13:00','17:00', '21:00'];

    foreach ($split as $i => $pct) {
        $pct = floatval($pct);
        if ($pct <= 0) continue;

        $mealTime = $stdTimes[$i] ?? '08:00'; // Giờ dự kiến

        // ScheduledAt phải ghép theo PlanningDate (ngày mai nếu được chọn), không phải ngày hiện tại
        $scheduledAt = $planningDate . " " . $mealTime . ":00"; // Thêm giây

        $amt = round($dailyFeed * $pct, 2);
        $idx = $i + 1;

        $st->bind_param("iisd", $planId, $idx, $scheduledAt, $amt);
        $st->execute();
    }
}

echo json_encode(['success'=>true, 'plan_id'=>$planId], JSON_UNESCAPED_UNICODE);
?>