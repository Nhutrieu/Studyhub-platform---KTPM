<?php
// Trả về danh sách cá + tên hồ
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
require_once '../../../../includes/db.php';
session_start();

try {
    if (!isset($_SESSION['username'])) throw new Exception('Unauthorized', 401);
    
    $username = $_SESSION['username'];
    // Lấy UserID
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $uid = $stmt->get_result()->fetch_assoc()['UserID'] ?? 0;

    $sql = "SELECT k.*, p.PondName 
            FROM KoiFish k 
            JOIN Pond p ON k.PondID = p.PondID 
            WHERE p.UserID = ? 
            ORDER BY k.FishID DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $uid);
    $stmt->execute();
    $res = $stmt->get_result();
    
    $kois = [];
    while($row = $res->fetch_assoc()) {
        // Ép kiểu số để JS tính toán chuẩn
        $row['Length'] = (float)$row['Length'];
        $row['Weight'] = (float)$row['Weight'];
        $row['Age'] = (float)$row['Age'];
        $row['PurchasePrice'] = (float)$row['PurchasePrice'];
        $kois[] = $row;
    }

    echo json_encode(['success' => true, 'kois' => $kois]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>