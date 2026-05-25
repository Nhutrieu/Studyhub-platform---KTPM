<?php
// backend/api/admin/users_management/stats.php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function ensure_admin($conn) {
    if (!isset($_SESSION['username'])) json_fail('Unauthorized', 401);
    $st = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username=?");
    $st->bind_param("s", $_SESSION['username']);
    $st->execute();
    $me = $st->get_result()->fetch_assoc();
    if (!$me || $me['Role'] !== 'Admin') json_fail('Forbidden', 403);
    return (int)$me['UserID'];
}

try {
    ensure_admin($conn);
    
    $stats = [];
    
    // 1. Total
    $stats['total'] = (int)$conn->query("SELECT COUNT(*) c FROM Users")->fetch_assoc()['c'];
    
    // 2. Active (IsActive=1 AND IsDeleted=0)
    $stats['active'] = (int)$conn->query("SELECT COUNT(*) c FROM Users WHERE IsActive=1 AND IsDeleted=0")->fetch_assoc()['c'];
    
    // 3. Disabled (IsActive=0 AND IsDeleted=0)
    $stats['disabled'] = (int)$conn->query("SELECT COUNT(*) c FROM Users WHERE IsActive=0 AND IsDeleted=0")->fetch_assoc()['c'];
    
    // 4. Deleted (IsDeleted=1)
    $stats['deleted'] = (int)$conn->query("SELECT COUNT(*) c FROM Users WHERE IsDeleted=1")->fetch_assoc()['c'];
    
    echo json_encode($stats, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}