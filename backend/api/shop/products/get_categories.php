<?php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$res = $conn->query("SELECT CategoryID, CategoryName FROM Category ORDER BY CategoryName ASC");
$cats = [];
while ($row = $res->fetch_assoc()) $cats[] = $row;
echo json_encode($cats, JSON_UNESCAPED_UNICODE);
