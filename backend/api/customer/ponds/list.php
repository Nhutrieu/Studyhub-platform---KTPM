<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION['username'])) json_fail('Chưa đăng nhập', 401);

    $username = $_SESSION['username'];
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) json_fail('Không tìm thấy user', 404);

    $user_id = (int)$user['UserID'];

    // ✅ Đếm số lượng cá Koi trong mỗi hồ (JOIN + COUNT)
    $sql = "
        SELECT 
            p.*,
            COUNT(k.FishID) AS FishCount
        FROM Pond p
        LEFT JOIN KoiFish k ON p.PondID = k.PondID
        WHERE p.UserID = ?
        GROUP BY p.PondID
        ORDER BY p.PondID DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $ponds = [];
    while ($row = $result->fetch_assoc()) {
        $ponds[] = $row;
    }

    echo json_encode($ponds, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
