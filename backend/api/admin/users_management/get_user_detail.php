<?php
// backend/api/admin/users_management/get_user_detail.php
error_reporting(E_ALL);
ini_set('display_errors', '0'); // Không hiển thị lỗi ra ngoài production

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function ensure_admin($conn) {
    if (!isset($_SESSION['username'])) json_fail('Unauthorized', 401);
    $st = $conn->prepare("SELECT UserID, Role FROM Users WHERE Username=?");
    $st->bind_param("s", $_SESSION['username']);
    $st->execute();
    $me = $st->get_result()->fetch_assoc();
    if (!$me || $me['Role'] !== 'Admin') json_fail('Forbidden', 403);
    return $me;
}

try {
    $me = ensure_admin($conn);
    
    // Kiểm tra phương thức
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_fail('Phương thức không hợp lệ', 405);

    // Lấy UserID từ query string
    $UserID = (int)($_GET['UserID'] ?? 0);
    if ($UserID <= 0) json_fail('Thiếu UserID');

    // Truy vấn lấy tất cả thông tin người dùng
    $sql = "SELECT UserID, FullName, Email, Username, Phone, Address,
                   Role, AuthProvider, ProviderID, AvatarURL,
                   IsActive, IsDeleted, DeletedAt, LastSeen
            FROM Users
            WHERE UserID=?";
    
    $st = $conn->prepare($sql);
    $st->bind_param("i", $UserID);
    $st->execute();
    $user = $st->get_result()->fetch_assoc();

    if (!$user) {
        json_fail('Không tìm thấy người dùng', 404);
    }

    // Xóa trường PasswordHash vì lý do bảo mật (chỉ nên tồn tại ở backend)
    unset($user['PasswordHash']);
    
    // Admin Protection: Mặc dù Admin có thể xem chi tiết Admin khác, 
    // nhưng nếu bạn muốn có logic bảo vệ bổ sung, có thể thêm tại đây.
    
    echo json_encode(['success' => true, 'user' => $user], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}