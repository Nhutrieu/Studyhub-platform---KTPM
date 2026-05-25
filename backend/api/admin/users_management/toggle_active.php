<?php
// backend/api/admin/users_management/toggle_active.php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code=400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

    $input = json_decode(file_get_contents("php://input"), true);
    $UserID = (int)($input['UserID'] ?? 0);
    $Action = $input['action'] ?? ''; // 'disable' or 'enable'
    
    if ($UserID <= 0) json_fail('Thiếu UserID');

    if ($UserID === (int)$me['UserID']) json_fail('Không thể thay đổi trạng thái tài khoản của chính bạn');

    // Lấy user mục tiêu
    $st = $conn->prepare("SELECT UserID, Role, IsActive, IsDeleted FROM Users WHERE UserID=?");
    $st->bind_param("i", $UserID);
    $st->execute();
    $u = $st->get_result()->fetch_assoc();
    if (!$u) json_fail('Không tìm thấy user', 404);

    if ($u['IsDeleted'] == 1) json_fail('Không thể thay đổi trạng thái tài khoản đã bị xóa mềm. Vui lòng khôi phục trước.');
    if ($u['Role'] === 'Admin') json_fail('Không thể thao tác trạng thái với tài khoản Admin khác');
    
    // Nếu là Admin và đang disable -> cần bảo vệ admin cuối cùng (chỉ áp dụng nếu ta cho phép disable Admin)
    // Hiện tại: đã chặn mọi thao tác với Admin khác.

    $new = ($Action === 'disable') ? 0 : 1;
    $st = $conn->prepare("UPDATE Users SET IsActive=? WHERE UserID=?");
    $st->bind_param("ii", $new, $UserID);
    $st->execute();

    echo json_encode(['success'=>true,'UserID'=>$UserID,'IsActive'=>$new], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}