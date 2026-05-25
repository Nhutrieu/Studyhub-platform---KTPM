<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\delete.php
require_once '../../../../includes/db.php';
session_start();

if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}

$stmtUser = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username = ?");
$stmtUser->bind_param("s", $_SESSION['username']);
$stmtUser->execute();
$userRow = $stmtUser->get_result()->fetch_assoc();

$role   = $userRow['Role']   ?? 'Customer';
$userId = (int)($userRow['UserID'] ?? 0);

if (!in_array($role, ['Admin', 'Shop'])) {
    echo "<script>alert('Không có quyền xóa sản phẩm'); history.back();</script>";
    exit;
}

$ProductID = (int)($_GET['id'] ?? 0);
if ($ProductID <= 0) {
    header("Location: /HeThongChamSocCaKoi/frontend/shop/products.php");
    exit;
}

// Kiểm tra quyền sở hữu nếu là shop
$stmtCheck = $conn->prepare("SELECT ShopID FROM Product WHERE ProductID = ?");
$stmtCheck->bind_param("i", $ProductID);
$stmtCheck->execute();
$prodRow = $stmtCheck->get_result()->fetch_assoc();

if (!$prodRow) {
    echo "<script>alert('Sản phẩm không tồn tại'); history.back();</script>";
    exit;
}

$ownerShopId = (int)($prodRow['ShopID'] ?? 0);
if ($role === 'Shop' && $ownerShopId !== $userId) {
    echo "<script>alert('Bạn không thể xóa sản phẩm của shop khác'); history.back();</script>";
    exit;
}

// Xoá sản phẩm (ProductImage đã có ON DELETE CASCADE)
$conn->query("DELETE FROM Product WHERE ProductID = " . $ProductID);

header("Location: /HeThongChamSocCaKoi/frontend/shop/products.php");
exit;
