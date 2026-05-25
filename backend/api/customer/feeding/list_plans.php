<?php
// FILE: backend/api/customer/feeding/list_plans.php
// VERSION: V3.7 - Soft Delete Filter Added
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

if (empty($_SESSION['username'])) { echo json_encode(['success'=>false,'error'=>'Unauthorized']); exit; }
$u = $_SESSION['username'];
$q = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$q->bind_param("s",$u);
$q->execute();
$uid = ($q->get_result()->fetch_assoc()['UserID'] ?? null);
if (!$uid) { echo json_encode(['success'=>false,'error'=>'Unauthorized']); exit; }

// --- [FIX] Thêm logic lọc theo pond_id nếu có tham số gửi lên ---
$pond_id_filter = isset($_GET['pond_id']) ? intval($_GET['pond_id']) : 0;

$sql = "SELECT fp.PlanID, fp.PondID, fp.Objective, fp.DailyFeedGrams, fp.Status, fp.CreatedAt, p.PondName
        FROM FeedingPlan fp
        JOIN Pond p ON fp.PondID=p.PondID
        WHERE p.UserID=? AND fp.IsDeleted = 0"; // [V3.7] Added IsDeleted check

$params = [$uid];
$types  = "i";

// Nếu Client gửi pond_id, lọc luôn để chỉ trả về plan của hồ đó
if ($pond_id_filter > 0) {
    $sql .= " AND fp.PondID=?";
    $params[] = $pond_id_filter;
    $types .= "i";
}

$sql .= " ORDER BY fp.CreatedAt DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode(['success'=>true, 'items'=>$rows]);
?>