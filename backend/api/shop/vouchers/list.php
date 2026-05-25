<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\vouchers\list.php
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once '../../../../includes/db.php';

function json_response($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = $_SESSION['userid'] ?? $_SESSION['user_id'] ?? null;
$role   = $_SESSION['role']   ?? $_SESSION['Role']       ?? 'Customer';

if (!$userId || !in_array($role, ['Admin', 'Shop'], true)) {
    json_response(['success' => false, 'error' => 'Bạn không có quyền truy cập.'], 403);
}

$page    = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$perPage = isset($_GET['per_page']) ? max(1, min(50, (int)$_GET['per_page'])) : 10;

$status = $_GET['status'] ?? '';
$scope  = $_GET['scope']  ?? 'all';   // all | system | shop
$scope  = $scope === '' ? 'all' : $scope;

$search = trim($_GET['search'] ?? '');

// sort param: ví dụ "CreatedAt|DESC"
$sortParam = isset($_GET['sort']) ? trim($_GET['sort']) : 'CreatedAt|DESC';

// Mapping sort an toàn
$sortMap = [
    'CreatedAt|DESC' => 'v.CreatedAt DESC',
    'StartDate|ASC'  => 'v.StartDate ASC',
    'EndDate|ASC'    => 'v.EndDate ASC',
    'Code|ASC'       => 'v.Code ASC',
    'Usage|DESC'     => 'v.UsedCount DESC'
];

$orderBySql = $sortMap['CreatedAt|DESC'];
if ($sortParam !== '' && isset($sortMap[$sortParam])) {
    $orderBySql = $sortMap[$sortParam];
}

$offset = ($page - 1) * $perPage;

// --- Build WHERE for Query ---
$where  = [];
$params = [];
$types  = '';
$uid = (int)$userId;
$now = date('Y-m-d H:i:s'); 


// 1. Scope Restriction (Determines what the user is allowed to see)
if ($role === 'Shop') {
    if ($scope === 'system') {
        $where[] = "v.Scope = 'system'";
    } elseif ($scope === 'shop') {
        $where[]  = "v.Scope = 'shop' AND v.ShopID = ?";
        $params[] = $uid;
        $types  .= 'i';
    } else { // all (system or shop's own)
        $where[]  = "(v.Scope = 'system' OR (v.Scope = 'shop' AND v.ShopID = ?))";
        $params[] = $uid;
        $types  .= 'i';
    }
} else { // Admin
    if ($scope === 'system') {
        $where[] = "v.Scope = 'system'";
    } elseif ($scope === 'shop') {
        $where[] = "v.Scope = 'shop'";
    }
    // else: Admin sees all (no extra WHERE for scope)
}

// 2. Status Filtering (Filter based on frontend selection)
if ($status === 'active') {
    // FIX: Chỉ hiện active VÀ chưa hết hạn
    $where[]   = "v.Status = 'active' AND v.EndDate >= ?";
    $params[]  = $now;
    $types    .= 's';
} elseif ($status === 'inactive') {
    // FIX: Hiện inactive (tắt thủ công) HOẶC (active VÀ đã hết hạn)
    $where[]   = "(v.Status = 'inactive' OR (v.Status = 'active' AND v.EndDate < ?))";
    $params[]  = $now;
    $types    .= 's';
}

// 3. Search Term
if ($search !== '') {
    $where[]   = "(v.Code LIKE CONCAT('%',?,'%') OR v.Note LIKE CONCAT('%',?,'%'))";
    $params[]  = $search;
    $params[]  = $search;
    $types    .= 'ss';
}

$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

// --- Count total (theo bộ lọc hiện tại) ---
$sqlCount = "SELECT COUNT(*) AS cnt FROM Voucher v $whereSql";
$stmt = $conn->prepare($sqlCount);
if ($types !== '') {
    // Sử dụng array_values để loại bỏ key string (nếu có từ 'ss')
    $stmt->bind_param($types, ...array_values($params)); 
}
$stmt->execute();
$res   = $stmt->get_result()->fetch_assoc();
$total = (int)($res['cnt'] ?? 0); // Total matching the current filter
$stmt->close();


// --- FIX: Calculate Global Stats (Total, Active, Inactive/Expired) ---
// Tính toán thống kê trên TẤT CẢ các vouchers mà user có thể thấy (không bị ảnh hưởng bởi filter status/search)
$sqlGlobalStats = "
    SELECT
        SUM(1) AS total_all_vouchers,
        SUM(CASE WHEN v.Status = 'active' AND v.EndDate >= ? THEN 1 ELSE 0 END) AS total_active,
        SUM(CASE WHEN v.Status = 'inactive' OR v.EndDate < ? THEN 1 ELSE 0 END) AS total_inactive
    FROM Voucher v
    WHERE 1=1 
";

$globalStatsParams = [$now, $now];
$globalStatsTypes = 'ss';

// Áp dụng giới hạn scope cho thống kê
$scopeWhereStats = [];
if ($role === 'Shop') {
    $scopeWhereStats[] = "(v.Scope = 'system' OR (v.Scope = 'shop' AND v.ShopID = ?))";
    $globalStatsParams[] = $uid;
    $globalStatsTypes .= 'i';
}

// Nếu $scopeWhereStats có, thêm vào $sqlGlobalStats
if ($scopeWhereStats) {
    $sqlGlobalStats .= " AND " . implode(' AND ', $scopeWhereStats);
}

$stmtStats = $conn->prepare($sqlGlobalStats);
if ($globalStatsTypes !== '') {
    $stmtStats->bind_param($globalStatsTypes, ...$globalStatsParams);
} else {
    // Trường hợp Admin và không có scopeWhereStats
}
$stmtStats->execute();
$stats = $stmtStats->get_result()->fetch_assoc();
$stmtStats->close();

$totalAllVouchers = (int)($stats['total_all_vouchers'] ?? 0);
$totalActive = (int)($stats['total_active'] ?? 0);
$totalInactive = (int)($stats['total_inactive'] ?? 0); // Inactive HOẶC Expired


// --- Query items ---
$sql = "SELECT 
             v.*,
             u.FullName AS CreatedByName,
             s.FullName AS ShopName
        FROM Voucher v
        LEFT JOIN Users u ON v.CreatedByUserID = u.UserID
        LEFT JOIN Users s ON v.ShopID        = s.UserID
        $whereSql
        ORDER BY $orderBySql
        LIMIT ? OFFSET ?";

$types2   = $types . 'ii';
$params2  = $params;
$params2[] = $perPage;
$params2[] = $offset;

$stmt = $conn->prepare($sql);
if ($types2 !== '') {
    $stmt->bind_param($types2, ...array_values($params2)); // Dùng array_values ở đây
}
$stmt->execute();
$rs = $stmt->get_result();

$items = [];
while ($row = $rs->fetch_assoc()) {
    // Quyền thao tác do backend quyết định
    $canEdit = false;

    if ($role === 'Admin') {
        // Admin sửa được tất cả
        $canEdit = true;
    } elseif ($role === 'Shop') {
        // Shop chỉ được sửa mã Scope=shop của chính shop mình
        if ($row['Scope'] === 'shop' && (int)$row['ShopID'] === $uid) {
            $canEdit = true;
        }
    }

    // Gửi flag CanEdit sang frontend
    $row['CanEdit'] = $canEdit ? 1 : 0;

    $items[] = $row;
}
$stmt->close();


json_response([
    'success'       => true,
    'items'         => $items,
    'page'          => $page,
    'per_page'      => $perPage,
    'total'         => $total,        // tổng theo bộ lọc hiện tại (dùng cho pagination)
    'total_active'  => $totalActive,  // FIX: Tổng số mã Đang hoạt động (cho Stats)
    'total_inactive'=> $totalInactive, // FIX: Tổng số mã Ngừng/Hết hạn (cho Stats)
    'total_all_vouchers' => $totalAllVouchers, // FIX: Tổng số mã (cho Stats)
    'sort'          => $sortParam
]);