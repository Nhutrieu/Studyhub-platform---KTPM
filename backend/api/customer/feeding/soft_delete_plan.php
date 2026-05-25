<?php
// FILE: backend/api/customer/feeding/soft_delete_plan.php
// VERSION: V1.0 - Soft Delete Implementation
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_POST['plan_id'])) bail('plan_id required');
$pid = intval($_POST['plan_id']);

// --- Auth ---
if (empty($_SESSION['username'])) bail('Unauthorized', 401);
$u = $_SESSION['username'];

$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail('Unauthorized', 401);

// --- Check Ownership & Status ---
// Chỉ cho phép xóa khi User sở hữu hồ VÀ Plan đã ở trạng thái done/cancelled
$chk = $conn->prepare("
    SELECT fp.PlanID, fp.Status 
    FROM FeedingPlan fp
    JOIN Pond p ON fp.PondID = p.PondID
    WHERE fp.PlanID = ? AND p.UserID = ?
");
$chk->bind_param("ii", $pid, $uid);
$chk->execute();
$row = $chk->get_result()->fetch_assoc();

if (!$row) bail('Plan not found or no permission', 404);

// Chỉ cho phép xóa history (done/cancelled), không cho xóa plan đang chạy (active)
if ($row['Status'] === 'active') {
    bail('Không thể xóa kế hoạch đang chạy (Active). Hãy hủy kế hoạch trước.', 409);
}

// --- Execute Soft Delete ---
$upd = $conn->prepare("UPDATE FeedingPlan SET IsDeleted = 1 WHERE PlanID = ?");
$upd->bind_param("i", $pid);

if ($upd->execute()) {
    echo json_encode(['success'=>true, 'message'=>'Đã xóa kế hoạch khỏi danh sách.']);
} else {
    bail('Database error: ' . $upd->error, 500);
}
?>