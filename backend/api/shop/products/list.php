<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\list.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

// Lấy user & role (để check quyền xem sản phẩm nếu là Shop)
$userId = null;
$role   = 'Customer';

if (!empty($_SESSION['username'])) {
    $stmtUser = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ?");
    $stmtUser->bind_param("s", $_SESSION['username']);
    $stmtUser->execute();
    $u = $stmtUser->get_result()->fetch_assoc();
    if ($u) {
        $userId = (int)$u['UserID'];
        $role   = $u['Role'] ?? 'Customer';
    }
}

// 1. Nhận các tham số từ Frontend
$page      = max(1, (int)($_GET['page'] ?? 1));
$per_page  = min(50, max(5, (int)($_GET['per_page'] ?? 12)));
$q         = trim($_GET['q'] ?? '');
$category  = trim($_GET['category'] ?? '');
$order_by  = in_array($_GET['order_by'] ?? 'ProductID', ['ProductID','Price','Name','Stock']) ? $_GET['order_by'] : 'ProductID';
$order_dir = (strtoupper($_GET['order_dir'] ?? 'DESC') === 'ASC') ? 'ASC' : 'DESC';

$min_price = isset($_GET['min_price']) && $_GET['min_price'] !== '' ? (float)$_GET['min_price'] : null;
$max_price = isset($_GET['max_price']) && $_GET['max_price'] !== '' ? (float)$_GET['max_price'] : null;
$in_stock  = trim($_GET['in_stock'] ?? '');

// [FIX] Nhận tham số địa chỉ shop
$shop_address = trim($_GET['shop_address'] ?? '');

// 2. Xây dựng câu truy vấn động
$where  = "WHERE 1=1";
$params = [];
$types  = "";

// Nếu là tài khoản Shop -> chỉ xem được sản phẩm của chính mình
if ($role === 'Shop' && $userId) {
    $where   .= " AND P.ShopID = ?";
    $params[] = $userId;
    $types   .= "i";
}

// Lọc theo từ khóa (Tên hoặc Mô tả)
if ($q !== '') {
    $where   .= " AND (P.Name LIKE CONCAT('%', ?, '%') OR P.Description LIKE CONCAT('%', ?, '%'))";
    $params[] = $q;
    $params[] = $q;
    $types   .= "ss";
}

// Lọc theo danh mục
if ($category !== '') {
    $where   .= " AND P.CategoryID = ?";
    $params[] = (int)$category;
    $types   .= "i";
}

// Lọc theo khoảng giá
if ($min_price !== null && $min_price >= 0) {
    $where   .= " AND P.Price >= ?";
    $params[] = $min_price;
    $types   .= "d";
}
if ($max_price !== null && $max_price > 0) {
    $where   .= " AND P.Price <= ?";
    $params[] = $max_price;
    $types   .= "d";
}

// Lọc theo tồn kho
if ($in_stock === '1') {
    $where .= " AND P.Stock > 0";
}

// [FIX] Lọc theo địa chỉ Shop (QUAN TRỌNG)
// Sử dụng bảng Users (U) đã được JOIN ở dưới để lọc theo cột Address
if ($shop_address !== '') {
    $where   .= " AND U.Address LIKE CONCAT('%', ?, '%')";
    $params[] = $shop_address;
    $types   .= "s";
}

// 3. Đếm tổng số bản ghi (Để phân trang)
// Cần JOIN Users ngay tại đây để đếm đúng nếu có lọc theo Address
$count_sql = "SELECT COUNT(*) AS cnt 
              FROM Product P 
              LEFT JOIN Users U ON P.ShopID = U.UserID 
              $where";

$st = $conn->prepare($count_sql);
if ($types) {
    $st->bind_param($types, ...$params);
}
$st->execute();
$total = (int)$st->get_result()->fetch_assoc()['cnt'];

// Tính offset phân trang
$offset = ($page - 1) * $per_page;

// 4. Lấy dữ liệu chi tiết
// Chuẩn bị phần SELECT dấu tim (Yêu thích)
$wishlistSelect = $userId
    ? "CASE WHEN W.ProductID IS NULL THEN 0 ELSE 1 END AS IsFavorite,"
    : "0 AS IsFavorite,";

// Chuẩn bị JOIN wishlist nếu đã đăng nhập
$wishlistJoin = $userId
    ? "LEFT JOIN Wishlist W ON W.ProductID = P.ProductID AND W.UserID = " . (int)$userId
    : "";

$sql = "
    SELECT 
        $wishlistSelect
        (SELECT COUNT(*) FROM Wishlist W2 WHERE W2.ProductID = P.ProductID) AS FavoriteCount,
        P.*, 
        C.CategoryName, 
        U.Address AS ShopAddress
    FROM Product P
    LEFT JOIN Category C ON P.CategoryID = C.CategoryID
    LEFT JOIN Users U ON P.ShopID = U.UserID
    $wishlistJoin
    $where
    ORDER BY P.$order_by $order_dir
    LIMIT ? OFFSET ?
";

$st = $conn->prepare($sql);
if ($types) {
    $types2   = $types . 'ii';
    $params2 = [...$params, $per_page, $offset];
    $st->bind_param($types2, ...$params2);
} else {
    $st->bind_param('ii', $per_page, $offset);
}
$st->execute();
$res = $st->get_result();

$data = [];
while ($row = $res->fetch_assoc()) {
    if (!empty($row['ImageURL'])) {
        $row['ImageURL'] = '/' . ltrim($row['ImageURL'], '/');
    }
    $row['IsFavorite']    = (int)($row['IsFavorite'] ?? 0);
    $row['FavoriteCount'] = (int)($row['FavoriteCount'] ?? 0);
    $data[] = $row;
}

echo json_encode([
    'page'     => $page,
    'per_page' => $per_page,
    'total'    => $total,
    'items'    => $data
], JSON_UNESCAPED_UNICODE);