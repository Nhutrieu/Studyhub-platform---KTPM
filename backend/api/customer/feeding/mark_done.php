<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../../../../includes/db.php';

if (empty($_POST['plan_id'])) {
    echo json_encode(['success'=>false,'error'=>'plan_id required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pid = intval($_POST['plan_id']);
$conn->begin_transaction();

try {
    // 1. Lấy PondID từ kế hoạch
    $q = $conn->prepare("SELECT PondID FROM FeedingPlan WHERE PlanID = ?");
    $q->bind_param("i", $pid);
    $q->execute();
    $row = $q->get_result()->fetch_assoc();
    if (!$row) {
        throw new Exception("Kế hoạch không tồn tại");
    }
    $pondId = (int)$row['PondID'];

    // 2. Lấy nhiệt độ nước gần nhất
    $waterTemp = null;
    $qTemp = $conn->prepare("
        SELECT Temperature 
        FROM WaterParameter
        WHERE PondID = ?
        ORDER BY RecordedAt DESC
        LIMIT 1
    ");
    $qTemp->bind_param("i", $pondId);
    $qTemp->execute();
    $tmp = $qTemp->get_result()->fetch_assoc();
    if ($tmp && $tmp['Temperature'] !== null) {
        $waterTemp = (float)$tmp['Temperature'];
    }

    // 3. Auto-fill FeedingEvent (kèm WaterTempSnapshot nếu có)
    if ($waterTemp !== null) {
        $u1 = $conn->prepare("
            UPDATE FeedingEvent
            SET AmountGiven       = COALESCE(AmountGiven, AmountExpected),
                ExecutedAt        = COALESCE(ExecutedAt, NOW()),
                Observation       = COALESCE(Observation, 'normal'),
                LeftoverFlag      = COALESCE(LeftoverFlag, 0),
                WaterTempSnapshot = COALESCE(WaterTempSnapshot, ?),
                AutoFeedFlag      = 0,
                AIAdjusted        = 0
            WHERE PlanID = ?
        ");
        $u1->bind_param("di", $waterTemp, $pid);
    } else {
        // fallback: không có nhiệt độ
        $u1 = $conn->prepare("
            UPDATE FeedingEvent
            SET AmountGiven       = COALESCE(AmountGiven, AmountExpected),
                ExecutedAt        = COALESCE(ExecutedAt, NOW()),
                Observation       = COALESCE(Observation, 'normal'),
                LeftoverFlag      = COALESCE(LeftoverFlag, 0),
                AutoFeedFlag      = 0,
                AIAdjusted        = 0
            WHERE PlanID = ?
        ");
        $u1->bind_param("i", $pid);
    }
    $u1->execute();

    // 4. Đánh dấu plan done
    $u2 = $conn->prepare("UPDATE FeedingPlan SET Status='done' WHERE PlanID = ?");
    $u2->bind_param("i", $pid);
    $u2->execute();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    echo json_encode(['success'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. Trigger AI Learning cho hồ (non-blocking)
$secretKey = "@Learn01060501";
$url = "http://localhost:8080/HeThongChamSocCaKoi/backend/api/customer/feeding/ai_learn.php"
     . "?pond_id={$pondId}&cron_key={$secretKey}";
@file_get_contents($url);

echo json_encode(['success'=>true], JSON_UNESCAPED_UNICODE);
