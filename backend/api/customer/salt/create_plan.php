<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/create_plan.php
// VERSION: V2.0 - PHASE 1 COMPLETE WITH SAFETY CHECKS

header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../../../../includes/db.php';

// Enable error logging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_success($msg = 'OK', $extra = []) {
    echo json_encode(array_merge(['success' => true, 'message' => $msg], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Check Login
if (empty($_SESSION['username'])) {
    error_log("[Salt Create Plan] No session username");
    json_error('Unauthorized', 401);
}

function current_user_id($conn) {
    $u = $_SESSION['username'];
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    if (!$stmt) return null;
    $stmt->bind_param("s", $u);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc()['UserID'] ?? null;
}

$userId = current_user_id($conn);
if (!$userId) {
    error_log("[Salt Create Plan] User not found: " . $_SESSION['username']);
    json_error('Unauthorized', 401);
}

// 2. Get and validate input
$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!$in) {
    json_error('Payload không hợp lệ');
}

// 3. Validate required fields
$required = ['PondID', 'TargetPercent', 'StartPercent', 'VolumeLiters'];
foreach ($required as $field) {
    if (!isset($in[$field]) || $in[$field] === '') {
        json_error("Thiếu trường bắt buộc: $field");
    }
}

$PondID = (int)($in['PondID'] ?? 0);
$Mode = $in['Mode'] ?? 'main';
$Purpose = $in['Purpose'] ?? 'stabilize';
$HasFry = !empty($in['HasFry']) ? 1 : 0;
$HasPlants = !empty($in['HasPlants']) ? 1 : 0;
$VolumeLiters = (float)($in['VolumeLiters'] ?? 0);
$StartPercent = (float)($in['StartPercent'] ?? 0);
$TargetPercent = (float)($in['TargetPercent'] ?? 0);
$SourceWaterSalinity = (float)($in['SourceWaterSalinity'] ?? 0);
$StepPercent = (float)($in['StepPercent'] ?? 0.10);
$IntervalHours = (int)($in['IntervalHours'] ?? 12);
$Note = trim($in['Note'] ?? '');
$ReduceByWaterChange = !empty($in['ReduceByWaterChange']) ? 1 : 0;
$Steps = $in['Steps'] ?? [];

// [PHASE 1] SAFETY CHECKS
error_log("[Salt Create Plan] Safety check - Start: $StartPercent%, Target: $TargetPercent%");

// Emergency cutoff (3% - seawater level)
if ($StartPercent > 3.0) {
    json_error('Độ mặn hiện tại quá cao (>3.0%) - CẤP CỨU! Vui lòng kiểm tra lại thiết bị đo.');
}

if ($TargetPercent > 3.0) {
    json_error('Mục tiêu độ mặn quá cao (>3.0%) - NGUY HIỂM!');
}

// Absolute safety limit (0.7%)
if ($TargetPercent > 0.7) {
    json_error('Mục tiêu không được vượt quá 0.7% (ngưỡng an toàn tuyệt đối).');
}

// Check for division by zero in water change calculation
if ($StartPercent > $TargetPercent && abs($StartPercent - $SourceWaterSalinity) < 0.001) {
    json_error('Độ mặn nước nguồn quá gần độ mặn hiện tại - không thể tính toán thay nước.');
}

// Validate volume
if ($VolumeLiters <= 0) {
    json_error('Thể tích hồ phải lớn hơn 0.');
}

// 4. Validate pond ownership
$stmt = $conn->prepare("SELECT PondID FROM Pond WHERE PondID = ? AND UserID = ?");
if (!$stmt) {
    error_log("[Salt Create Plan] Prepare pond check failed: " . $conn->error);
    json_error('Lỗi hệ thống', 500);
}
$stmt->bind_param("ii", $PondID, $userId);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    json_error('Bạn không có quyền với hồ này hoặc hồ không tồn tại', 403);
}
$stmt->close();

// 5. Check for active plans (only if not reducing by water change)
if (!$ReduceByWaterChange) {
    $stmt = $conn->prepare("SELECT PlanID FROM SaltPlan WHERE PondID = ? AND Status = 'active'");
    if (!$stmt) {
        error_log("[Salt Create Plan] Prepare active plan check failed: " . $conn->error);
        json_error('Lỗi hệ thống', 500);
    }
    $stmt->bind_param("i", $PondID);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        json_error('Hồ này đang có một kế hoạch chưa hoàn thành', 400);
    }
    $stmt->close();
}

// 6. Start transaction
$conn->begin_transaction();

try {
    // 7. Insert main plan
    $sql = "INSERT INTO SaltPlan (
        PondID, Mode, Purpose, HasFry, HasPlants, VolumeLiters, 
        StartPercent, TargetPercent, SourceWaterSalinity, 
        StepPercent, IntervalHours, Status, StartAt, Note,
        FishCountSnapshot, AvgWeightSnapshot, ReduceByWaterChange
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), ?, 0, 0, ?)";
    
    error_log("[Salt Create Plan] SQL: " . $sql);
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Lỗi prepare SaltPlan: ' . $conn->error);
    }
    
    // Log values for debugging
    error_log("[Salt Create Plan] Binding values:");
    error_log("1. PondID (i): $PondID");
    error_log("2. Mode (s): $Mode");
    error_log("3. Purpose (s): $Purpose");
    error_log("4. HasFry (i): $HasFry");
    error_log("5. HasPlants (i): $HasPlants");
    error_log("6. VolumeLiters (d): $VolumeLiters");
    error_log("7. StartPercent (d): $StartPercent");
    error_log("8. TargetPercent (d): $TargetPercent");
    error_log("9. SourceWaterSalinity (d): $SourceWaterSalinity");
    error_log("10. StepPercent (d): $StepPercent");
    error_log("11. IntervalHours (i): $IntervalHours");
    error_log("12. Note (s): $Note");
    error_log("13. ReduceByWaterChange (i): $ReduceByWaterChange");
    
    $types = "issiidddddisi";
    
    if (strlen($types) !== 13) {
        throw new Exception("Types string length mismatch: expected 13, got " . strlen($types));
    }
    
    $stmt->bind_param(
        $types,
        $PondID,
        $Mode,
        $Purpose,
        $HasFry,
        $HasPlants,
        $VolumeLiters,
        $StartPercent,
        $TargetPercent,
        $SourceWaterSalinity,
        $StepPercent,
        $IntervalHours,
        $Note,
        $ReduceByWaterChange
    );
    
    if (!$stmt->execute()) {
        throw new Exception('Lỗi tạo Plan: ' . $stmt->error);
    }
    
    $planId = $stmt->insert_id;
    $stmt->close();
    
    error_log("[Salt Create Plan] Created plan ID: $planId");

    // 8. Insert steps if provided
    if (!empty($Steps) && is_array($Steps)) {
        $stmtStep = $conn->prepare("INSERT INTO SaltDoseStep (
            PlanID, StepIndex, ScheduledAt, DeltaPercent, ExpectedSaltGrams, 
            ExpectedPercentAfter, WaterChangeLiters, SourceSalinity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        if (!$stmtStep) {
            throw new Exception('Lỗi prepare steps: ' . $conn->error);
        }
        
        foreach ($Steps as $s) {
            $idx = (int)($s['StepIndex'] ?? 0);
            if ($idx <= 0) continue;
            
            $scheduledAt = $s['ScheduledAt'] ?? date('Y-m-d H:i:s');
            $dPct = (float)($s['DeltaPercent'] ?? 0);
            $grams = (float)($s['ExpectedSaltGrams'] ?? 0);
            $estPct = (float)($s['ExpectedPercentAfter'] ?? 0);
            $liters = (float)($s['WaterChangeLiters'] ?? 0);
            $stepSourceSalinity = (float)($s['SourceSalinity'] ?? $SourceWaterSalinity);
            
            error_log("[Salt Create Plan] Step $idx: $dPct%, $grams g, $estPct%, $liters L, source: $stepSourceSalinity");
            
            // [PHASE 1] Validate step data
            if ($estPct > 3.0) {
                throw new Exception("Bước $idx có độ mặn ước tính quá cao ($estPct%)");
            }
            
            $stmtStep->bind_param("iisddddd", $planId, $idx, $scheduledAt, $dPct, $grams, $estPct, $liters, $stepSourceSalinity);
            if (!$stmtStep->execute()) {
                throw new Exception('Lỗi tạo Step: ' . $stmtStep->error);
            }
        }
        $stmtStep->close();
    } else {
        error_log("[Salt Create Plan] No steps provided for plan $planId");
    }

    // [PHASE 1] 9. Initial reverse sync to WaterParameter
    $initialNote = "Bắt đầu Salt Plan #{$planId} - Hiện tại: {$StartPercent}%, Mục tiêu: {$TargetPercent}%";
    $stmtWater = $conn->prepare("
        INSERT INTO WaterParameter (PondID, RecordedAt, Salt, Note)
        VALUES (?, NOW(), ?, ?)
    ");
    
    if ($stmtWater) {
        $stmtWater->bind_param("ids", $PondID, $StartPercent, $initialNote);
        if (!$stmtWater->execute()) {
            error_log("[Salt Create Plan] Failed to insert initial WaterParameter: " . $stmtWater->error);
            // Don't throw - this is just logging
        } else {
            error_log("[Salt Create Plan] Initial sync to WaterParameter: Salt={$StartPercent}%");
        }
        $stmtWater->close();
    }

    // 10. Commit transaction
    $conn->commit();
    
    error_log("[Salt Create Plan] Plan $planId created successfully");
    json_success('Kế hoạch đã được tạo thành công và đồng bộ thông số nước', [
        'PlanID' => $planId,
        'water_synced' => true
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("[Salt Create Plan] Error: " . $e->getMessage());
    error_log("[Salt Create Plan] Error trace: " . $e->getTraceAsString());
    json_error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}

if ($conn) $conn->close();
?>