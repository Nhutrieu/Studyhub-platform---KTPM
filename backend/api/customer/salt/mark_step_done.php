<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/mark_step_done.php
// VERSION: V2.0 - PHASE 1 COMPLETE WITH WATER SYNC

header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../../../../includes/db.php';

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
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
    error_log("[Salt Step Done] No session username");
    json_error('Unauthorized', 401);
}

$user = $_SESSION['username'];
$stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
if (!$stmt) {
    error_log("[Salt Step Done] Prepare user query failed: " . $conn->error);
    json_error('Lỗi hệ thống', 500);
}
$stmt->bind_param("s", $user);
if (!$stmt->execute()) {
    error_log("[Salt Step Done] Execute user query failed: " . $stmt->error);
    json_error('Lỗi hệ thống', 500);
}
$userId = $stmt->get_result()->fetch_assoc()['UserID'] ?? null;
$stmt->close();

if (!$userId) {
    error_log("[Salt Step Done] User not found: $user");
    json_error('Unauthorized', 401);
}

// 2. Get input - support JSON input
$input = file_get_contents('php://input');
if ($input) {
    $data = json_decode($input, true);
    $_POST = is_array($data) ? $data : [];
}

// 3. Parse parameters
$stepId = (int)($_POST['step'] ?? $_GET['step'] ?? 0);
$measured = isset($_POST['measured']) && $_POST['measured'] !== '' ? (float)$_POST['measured'] : null;
$note = trim($_POST['note'] ?? '');

error_log("[Salt Step Done] Received stepId=$stepId, measured=" . ($measured ?? 'null') . ", note='$note'");

if ($stepId <= 0) {
    json_error('Thiếu step id');
}

// 4. Check permission and get step data
$stmt = $conn->prepare("
    SELECT s.*, p.PlanID, p.PondID, pd.UserID AS OwnerID, p.TargetPercent, p.SourceWaterSalinity
    FROM SaltDoseStep s
    JOIN SaltPlan p ON s.PlanID = p.PlanID
    JOIN Pond pd ON p.PondID = pd.PondID
    WHERE s.StepID = ?
");
if (!$stmt) {
    error_log("[Salt Step Done] Prepare step query failed: " . $conn->error);
    json_error('Lỗi hệ thống', 500);
}

$stmt->bind_param("i", $stepId);
if (!$stmt->execute()) {
    error_log("[Salt Step Done] Execute step query failed: " . $stmt->error);
    json_error('Lỗi hệ thống', 500);
}

$step = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$step) {
    error_log("[Salt Step Done] Step not found: $stepId");
    json_error('Không tìm thấy bước', 404);
}

if ((int)$step['OwnerID'] !== (int)$userId) {
    error_log("[Salt Step Done] Permission denied. User: $userId, Owner: " . $step['OwnerID']);
    json_error('Không có quyền', 403);
}

// [PHASE 1] Emergency check for measured value
if ($measured !== null && $measured > 3.0) {
    error_log("[Salt Step Done] Emergency salinity level: $measured%");
    // We still allow it but log as emergency
    $emergencyNote = $note ? $note . " [EMERGENCY: $measured%]" : "[EMERGENCY: $measured%]";
    $note = $emergencyNote;
}

// 5. Update step
$conn->begin_transaction();

try {
    $updateFields = ["ExecutedAt = NOW()"];
    $types = "";
    $params = [];

    if ($measured !== null) {
        $updateFields[] = "MeasuredPercent = ?";
        $types .= "d";
        $params[] = $measured;
    }

    if (!empty($note)) {
        $updateFields[] = "Note = ?";
        $types .= "s";
        $params[] = $note;
    }

    // Add StepID to the end
    $types .= "i";
    $params[] = $stepId;

    $sql = "UPDATE SaltDoseStep SET " . implode(", ", $updateFields) . " WHERE StepID = ?";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception('Lỗi hệ thống khi chuẩn bị câu lệnh: ' . $conn->error . " SQL: $sql");
    }

    // Bind parameters if any
    if (!empty($types)) {
        $stmt->bind_param($types, ...$params);
    }

    if (!$stmt->execute()) {
        throw new Exception('Lỗi database khi cập nhật: ' . $stmt->error);
    }

    $affected = $stmt->affected_rows;
    $stmt->close();

    // 6. [PHASE 1] REVERSE SYNC TO WATERPARAMETER
    $saltValue = $measured ?? $step['ExpectedPercentAfter'];
    if ($saltValue !== null) {
        $pondId = (int)$step['PondID'];
        $planId = (int)$step['PlanID'];
        $stepIndex = (int)$step['StepIndex'];
        $recordedAt = date('Y-m-d H:i:s');
        
        // Create note for water parameter
        $waterNote = "Cập nhật tự động từ Salt Plan #{$planId}, Bước {$stepIndex}";
        if ($measured !== null) {
            $waterNote .= " (Đo được: {$measured}%)";
        } else {
            $waterNote .= " (Ước tính: {$step['ExpectedPercentAfter']}%)";
        }
        if (!empty($note)) {
            $waterNote .= " - " . $note;
        }

        // Insert into WaterParameter
        $stmtWater = $conn->prepare("
            INSERT INTO WaterParameter (PondID, RecordedAt, Salt, Note)
            VALUES (?, ?, ?, ?)
        ");
        
        if ($stmtWater) {
            $stmtWater->bind_param("isds", $pondId, $recordedAt, $saltValue, $waterNote);
            if (!$stmtWater->execute()) {
                error_log("[Salt Step Done] Failed to insert into WaterParameter: " . $stmtWater->error);
                // Don't throw - this is just reverse sync
            }
            $stmtWater->close();
            
            error_log("[Salt Step Done] Successfully synced to WaterParameter: Pond={$pondId}, Salt={$saltValue}%");
        } else {
            error_log("[Salt Step Done] Prepare WaterParameter insert failed: " . $conn->error);
        }
    } else {
        error_log("[Salt Step Done] No salt value to sync to WaterParameter");
    }

    // 7. Check if plan is finished
    $planId = (int)$step['PlanID'];
    $remain = 0;

    $stmt = $conn->prepare("SELECT COUNT(*) AS remain FROM SaltDoseStep WHERE PlanID = ? AND ExecutedAt IS NULL");
    if ($stmt) {
        $stmt->bind_param("i", $planId);
        $stmt->execute();
        $result = $stmt->get_result();
        $remain = (int)($result->fetch_assoc()['remain'] ?? 0);
        $stmt->close();
    }

    // If no remaining steps, mark plan as done
    if ($remain === 0) {
        $stmt = $conn->prepare("UPDATE SaltPlan SET Status = 'done', EndAt = NOW() WHERE PlanID = ? AND Status = 'active'");
        if ($stmt) {
            $stmt->bind_param("i", $planId);
            $stmt->execute();
            $stmt->close();
        }

        // Final reverse sync with target salinity
        $targetPercent = (float)$step['TargetPercent'];
        $finalNote = "Hoàn thành Salt Plan #{$planId} - Đạt mục tiêu {$targetPercent}%";
        
        $stmtWater2 = $conn->prepare("
            INSERT INTO WaterParameter (PondID, RecordedAt, Salt, Note)
            VALUES (?, NOW(), ?, ?)
        ");
        
        if ($stmtWater2) {
            $stmtWater2->bind_param("ids", $pondId, $targetPercent, $finalNote);
            $stmtWater2->execute();
            $stmtWater2->close();
            error_log("[Salt Step Done] Final sync to WaterParameter with target: {$targetPercent}%");
        }
    }

    $conn->commit();
    
    json_success('Đã cập nhật trạng thái bước và đồng bộ thông số nước', [
        'PlanID' => $planId, 
        'plan_completed' => ($remain === 0),
        'affected_rows' => $affected,
        'water_synced' => ($saltValue !== null)
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("[Salt Step Done] Transaction failed: " . $e->getMessage());
    json_error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}

$conn->close();
?>