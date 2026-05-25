<?php
// backend/api/customer/kois/list_by_user.php
/**
 * Dùng để fetch danh sách cá Koi của user đang đăng nhập.
 * Mục đích: Hiển thị danh sách này cho người dùng chọn cá để khám (nếu chưa có fish_id trên URL).
 */
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

try {
    if (!isset($_SESSION['username'])) {
        throw new Exception('Unauthorized', 401);
    }
    
    $username = $_SESSION['username'];
    // Lấy UserID
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $userId = $user['UserID'];

    // Lấy danh sách cá và tên hồ
    $sql = "SELECT k.FishID, k.Name, k.ImageURL, p.PondName 
            FROM KoiFish k 
            JOIN Pond p ON k.PondID = p.PondID 
            WHERE p.UserID = ? 
            ORDER BY k.Name ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $kois = [];
    while ($row = $result->fetch_assoc()) {
        $kois[] = $row;
    }

    echo json_encode(['success' => true, 'kois' => $kois]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>