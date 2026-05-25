<?php
// backend/api/admin/users_management/list.php
error_reporting(E_ALL);
ini_set('display_errors', '1');

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

    // Params
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per  = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
    $q    = trim($_GET['q'] ?? '');
    $role = $_GET['role'] ?? '';
    $prov = $_GET['provider'] ?? '';
    // NEW: status_filter: 'active', 'disabled', 'deleted', 'all'
    $status_filter = $_GET['status_filter'] ?? 'active';
    
    $order_by  = $_GET['order_by']  ?? 'UserID';
    $order_dir = strtoupper($_GET['order_dir'] ?? 'DESC');

    $allow_cols = ['UserID','FullName','Email','Username','Role','AuthProvider','IsActive','LastSeen'];
    if (!in_array($order_by, $allow_cols)) $order_by = 'UserID';
    if (!in_array($order_dir, ['ASC','DESC'])) $order_dir = 'DESC';

    // WHERE builder
    $w = []; $params = []; $types = '';
    
    // 1. Search Query
    if ($q !== '') {
        $w[] = "(FullName LIKE ? OR Email LIKE ? OR Username LIKE ?)";
        $like = "%$q%";
        $params[] = $like; $params[] = $like; $params[] = $like;
        $types .= 'sss';
    }
    
    // 2. Role Filter
    if ($role !== '' && in_array($role, ['Admin','Shop','Customer'])) {
        $w[] = "Role = ?";
        $params[] = $role; $types .= 's';
    }
    
    // 3. Provider Filter
    if ($prov !== '' && in_array($prov, ['local','google','facebook','github'])) {
        $w[] = "AuthProvider = ?";
        $params[] = $prov; $types .= 's';
    }
    
    // 4. Status Filter (New Logic combining IsActive and IsDeleted)
    if ($status_filter === 'active') {
        $w[] = "IsActive = 1 AND IsDeleted = 0";
    } elseif ($status_filter === 'disabled') {
        $w[] = "IsActive = 0 AND IsDeleted = 0";
    } elseif ($status_filter === 'deleted') {
        $w[] = "IsDeleted = 1";
    }
    // If status_filter === 'all', no status condition is added.
    
    $where = $w ? ('WHERE '.implode(' AND ', $w)) : '';

    // Count
    $sql_count = "SELECT COUNT(*) c FROM Users $where";
    $st = $conn->prepare($sql_count);
    if ($params) $st->bind_param($types, ...$params);
    $st->execute();
    $total = (int)$st->get_result()->fetch_assoc()['c'];

    // Data
    $offset = ($page - 1) * $per;
    $sql = "SELECT UserID, FullName, Email, Username, Phone, Address,
                  Role, AuthProvider, ProviderID, AvatarURL,
                  IsActive, IsDeleted, DeletedAt, LastSeen
            FROM Users
            $where
            ORDER BY $order_by $order_dir
            LIMIT ?, ?";
            
    $params2 = $params; $types2 = $types . 'ii';
    $params2[] = $offset; $params2[] = $per;

    $st = $conn->prepare($sql);
    if ($params) $st->bind_param($types2, ...$params2);
    else $st->bind_param('ii', $offset, $per);
    $st->execute();
    $res = $st->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;

    echo json_encode([
        'total' => $total,
        'page'  => $page,
        'per_page' => $per,
        'items' => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}