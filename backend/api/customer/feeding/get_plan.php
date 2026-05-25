<?php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$pid = intval($_GET['plan_id'] ?? 0);
if ($pid <= 0) bail('plan_id required');

// --- Auth ---
if (empty($_SESSION['username'])) bail('Unauthorized', 401);
$u = $_SESSION['username'];

$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail('Unauthorized', 401);

// --- Lấy plan + kiểm tra quyền ---
$sql = "
    SELECT fp.*
    FROM FeedingPlan fp
    JOIN Pond p ON fp.PondID = p.PondID
    WHERE fp.PlanID = ? AND p.UserID = ?
    LIMIT 1
";
$pst = $conn->prepare($sql);
$pst->bind_param("ii", $pid, $uid);
$pst->execute();
$plan = $pst->get_result()->fetch_assoc();

if (!$plan) bail('Plan not found or no permission', 404);

// --- Lấy list events ---
$est = $conn->prepare("
    SELECT *
    FROM FeedingEvent
    WHERE PlanID = ?
    ORDER BY FeedIndex
");
$est->bind_param("i", $pid);
$est->execute();
$events = $est->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    'success' => true,
    'plan'    => $plan,
    'events'  => $events
], JSON_UNESCAPED_UNICODE);
