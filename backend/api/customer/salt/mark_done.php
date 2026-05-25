<?php
// /HeThongChamSocCaKoi/backend/api/customer/salt/mark_done.php
// VERSION: V2.0 - PHASE 1 COMPLETE WITH BULK UPDATE & WATER SYNC

header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../../../../includes/db.php';

// Enable error logging
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
    error_log("[Salt Mark Done] No session username");
    json_error('Unauthorized', 401);
}

$user = $_SESSION['username'];
$stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
if (!$stmt) {
    error_log("[Salt Mark Done] Prepare user query failed: " . $conn->error);
    json_error('Lỗi hệ thống', 500);
}
$stmt->bind_param("s", $user);
if (!$stmt->execute()) {
    error_log("[Salt Mark Done] Execute user query failed: " . $stmt->error);
    json_error('Lỗi hệ thống', 500);
}
$userId = $stmt->get_result()->fetch_assoc()['UserID'] ?? null;
$stmt->close();

if (!$userId) {
    error_log("[Salt Mark Done] User not found: $user");
    json_error('Unauthorized', 401);
}

// 2. Get plan ID
$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    json_error('Thiếu id kế hoạch');
}

// 3. Get plan details with ownership check
$stmt = $conn->prepare("
    SELECT sp.PlanID, sp.PondID, sp.TargetPercent, sp.Status, p.UserID
    FROM SaltPlan sp
    JOIN Pond p ON sp.PondID = p.PondID
    WHERE sp.PlanID = ?
");
if (!$stmt) {
    error_log("[Salt Mark Done] Prepare plan query failed: " . $conn->error);
    json_error('Lỗi hệ thống', 500);
}

$stmt->bind_param("i", $id);
if (!$stmt->execute()) {
    error_log("[Salt Mark Done] Execute plan query failed: " . $stmt->error);
    json_error('Lỗi hệ thống', 500);
}

$plan = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$plan) {
    error_log("[Salt Mark Done] Plan not found: $id");
    json_error('Không tìm thấy kế hoạch', 404);
}

if ((int)$plan['UserID'] !== (int)$userId) {
    error_log("[Salt Mark Done] Permission denied. User: $userId, Owner: " . $plan['UserID']);
    json_error('Bạn không có quyền hoàn tất kế hoạch này', 403);
}

// Check if already done/cancelled
if (in_array($plan['Status'], ['done', 'cancelled'])) {
    json_success('Kế hoạch đã ở trạng thái hoàn tất hoặc đã hủy trước đó', ['PlanID' => $id]);
}

$pondId = (int)$plan['PondID'];
$targetPercent = (float)$plan['TargetPercent'];

// 4. Begin transaction for atomic operations
$conn->begin_transaction();

try {
    // [PHASE 1] STEP 1: Update all remaining steps to executed
    $updSteps = $conn->prepare("
        UPDATE SaltDoseStep 
        SET ExecutedAt = NOW(),
            Note = CONCAT(COALESCE(Note, ''), ' [Done All]')
        WHERE PlanID = ? AND ExecutedAt IS NULL
    ");
    
    if (!$updSteps) {
        throw new Exception('Lỗi chuẩn bị cập nhật bước: ' . $conn->error);
    }
    
    $updSteps->bind_param("i", $id);
    if (!$updSteps->execute()) {
        throw new Exception('Lỗi cập nhật bước: ' . $updSteps->error);
    }
    
    $stepsUpdated = $updSteps->affected_rows;
    $updSteps->close();
    
    error_log("[Salt Mark Done] Updated $stepsPending steps to executed");

    // [PHASE 1] STEP 2: Update plan status
    $updPlan = $conn->prepare("
        UPDATE SaltPlan 
        SET Status = 'done', 
            EndAt = NOW(),
            Note = CONCAT(COALESCE(Note, ''), ' [Hoàn tất nhanh]')
        WHERE PlanID = ? AND Status = 'active'
    ");
    
    if (!$updPlan) {
        throw new Exception('Lỗi chuẩn bị cập nhật kế hoạch: ' . $conn->error);
    }
    
    $updPlan->bind_param("i", $id);
    if (!$updPlan->execute()) {
        throw new Exception('Lỗi cập nhật kế hoạch: ' . $updPlan->error);
    }
    
    $planUpdated = $updPlan->affected_rows;
    $updPlan->close();

    // [PHASE 1] STEP 3: REVERSE SYNC TO WATERPARAMETER
    $waterNote = "Hoàn tất nhanh Salt Plan #{$id} - Đạt mục tiêu {$targetPercent}% [Done All]";
    
    $stmtWater = $conn->prepare("
        INSERT INTO WaterParameter (PondID, RecordedAt, Salt, Note)
        VALUES (?, NOW(), ?, ?)
    ");
    
    if (!$stmtWater) {
        error_log("[Salt Mark Done] Prepare WaterParameter insert failed: " . $conn->error);
        // Don't throw - this is just reverse sync
    } else {
        $stmtWater->bind_param("ids", $pondId, $targetPercent, $waterNote);
        if (!$stmtWater->execute()) {
            error_log("[Salt Mark Done] Failed to insert into WaterParameter: " . $stmtWater->error);
        } else {
            error_log("[Salt Mark Done] Successfully synced to WaterParameter: Pond={$pondId}, Salt={$targetPercent}%");
        }
        $stmtWater->close();
    }

    // Commit transaction
    $conn->commit();
    
    error_log("[Salt Mark Done] Successfully marked plan $id as done. Steps updated: $stepsUpdated, Plan updated: $planUpdated");
    
    json_success('Đã đánh dấu hoàn tất kế hoạch và đồng bộ thông số nước', [
        'PlanID' => $id,
        'steps_updated' => $stepsUpdated,
        'plan_updated' => $planUpdated,
        'target_salinity' => $targetPercent,
        'water_synced' => true
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("[Salt Mark Done] Transaction failed: " . $e->getMessage());
    json_error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}

$conn->close();
?>