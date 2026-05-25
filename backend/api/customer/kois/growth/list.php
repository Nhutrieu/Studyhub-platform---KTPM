<?php
require_once '../../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
$fish_id = intval($_GET['id'] ?? 0);

// SỬ DỤNG DATE_FORMAT để định dạng MeasuredAt theo chuẩn DATETIME ISO cho JS parse (YYYY-MM-DD HH:MM:SS)
$sql = "SELECT 
    GrowthID, 
    DATE_FORMAT(MeasuredAt, '%Y-%m-%d %H:%i:%s') AS MeasuredAt, 
    Length, 
    Weight, 
    Note
FROM KoiGrowthHistory 
WHERE FishID = $fish_id
ORDER BY MeasuredAt DESC";  // Sắp xếp theo thời gian giảm dần

$res = $conn->query($sql);
echo json_encode(['success' => true, 'data' => $res->fetch_all(MYSQLI_ASSOC)]);
?>