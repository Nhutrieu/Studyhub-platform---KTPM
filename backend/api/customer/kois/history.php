<?php
// backend/api/customer/kois/history.php
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

try {
    if (!isset($_SESSION['username'])) throw new Exception('Unauthorized', 401);
    
    $fishId = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($fishId <= 0) throw new Exception('Invalid Fish ID');

    // Lấy lịch sử từ bảng AI_Analysis
    $sql = "SELECT a.AnalysisID, a.Result, a.CreatedAt
            FROM AI_Analysis a
            JOIN KoiFish k ON a.FishID = k.FishID
            JOIN Pond p ON k.PondID = p.PondID
            JOIN Users u ON p.UserID = u.UserID
            WHERE a.FishID = ? AND u.Username = ? AND a.AnalysisType = 'disease_detection'
            ORDER BY a.CreatedAt DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $fishId, $_SESSION['username']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $history = [];
    while ($row = $result->fetch_assoc()) {
        // Decode JSON kết quả
        $decoded = json_decode($row['Result']);
        
        // Nếu decode thất bại hoặc null (do dữ liệu cũ bị lỗi), trả về object rỗng để frontend không crash
        $row['Result'] = $decoded ? $decoded : (object)[]; 
        
        $history[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $history]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>