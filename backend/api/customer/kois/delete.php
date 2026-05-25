<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8'); // Quan trọng: Đảm bảo trả về JSON
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // --- 1. Kiểm tra đăng nhập ---
    if (!isset($_SESSION['username'])) json_fail('Chưa đăng nhập!', 401);

    $FishID = (int)($_GET['id'] ?? 0);
    if ($FishID <= 0) json_fail('ID cá không hợp lệ');

    // Lấy user ID
    $username = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $username);
    $st->execute();
    $user = $st->get_result()->fetch_assoc();
    if (!$user) json_fail('Không tìm thấy tài khoản người dùng', 404);
    $user_id = (int)$user['UserID'];

    // --- 2. Kiểm tra quyền sở hữu cá & lấy ImageURL ---
    $q = "SELECT KF.ImageURL
          FROM KoiFish KF
          JOIN Pond P ON KF.PondID = P.PondID
          WHERE KF.FishID=? AND P.UserID=?";
    $st = $conn->prepare($q);
    $st->bind_param("ii", $FishID, $user_id);
    $st->execute();
    $own = $st->get_result()->fetch_assoc();

    if (!$own) json_fail('Không có quyền xoá cá này hoặc cá không tồn tại', 403);

    // --- 3. Xoá ảnh (nếu có) ---
    if (!empty($own['ImageURL'])) {
        // Dùng $_SERVER['DOCUMENT_ROOT'] để tạo đường dẫn tuyệt đối
        $path = $_SERVER['DOCUMENT_ROOT'] . parse_url($own['ImageURL'], PHP_URL_PATH);
        if (file_exists($path)) @unlink($path);
    }

    // --- 4. Xoá cá khỏi DB ---
    // MySQL sẽ tự động xoá cascade các bảng liên quan (KoiGrowthHistory, AI_Analysis)
    $del = $conn->prepare("DELETE FROM KoiFish WHERE FishID=?");
    $del->bind_param("i", $FishID);
    $del->execute();

    // --- 5. Trả về JSON thành công (thay vì redirect) ---
    echo json_encode(['success' => true]);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>