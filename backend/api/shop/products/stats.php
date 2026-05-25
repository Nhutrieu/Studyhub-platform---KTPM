<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\stats.php
require_once '../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$response = [
    'success' => true,
    'data' => [
        'total_products' => 0,
        'total_categories' => 0,
        'low_stock' => 0,
        'out_of_stock' => 0
    ]
];

try {
    // 1. Total Products
    $res = $conn->query("SELECT COUNT(*) as cnt FROM Product");
    $response['data']['total_products'] = $res->fetch_assoc()['cnt'];

    // 2. Total Categories (Used)
    $res = $conn->query("SELECT COUNT(DISTINCT CategoryID) as cnt FROM Product WHERE CategoryID IS NOT NULL");
    $response['data']['total_categories'] = $res->fetch_assoc()['cnt'];

    // 3. Low Stock (<= 10) & Out of Stock (<= 0)
    $res = $conn->query("
        SELECT 
            SUM(CASE WHEN Stock <= 10 AND Stock > 0 THEN 1 ELSE 0 END) as low,
            SUM(CASE WHEN Stock <= 0 THEN 1 ELSE 0 END) as out_stock
        FROM Product
    ");
    $row = $res->fetch_assoc();
    $response['data']['low_stock'] = $row['low'] ?? 0;
    $response['data']['out_of_stock'] = $row['out_stock'] ?? 0;

} catch (Exception $e) {
    $response['success'] = false;
}

echo json_encode($response);