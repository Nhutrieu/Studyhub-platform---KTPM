<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\admin\users_management\soft_delete.php
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_fail($msg, $code = 400) {
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
    $UserID = $input['UserID'] ?? null;
    $action = $input['action'] ?? null;

    if (!is_numeric($UserID) || $UserID <= 0) json_fail('UserID không hợp lệ');
    if (!in_array($action, ['soft_delete', 'restore'])) json_fail('Hành động không hợp lệ');

    if ((int)$UserID === (int)$me['UserID']) json_fail('Không thể thực hiện xóa mềm/khôi phục tài khoản của chính bạn');

    // Lấy user mục tiêu để kiểm tra role
    $st = $conn->prepare("SELECT Role FROM Users WHERE UserID=?");
    $st->bind_param("i", $UserID);
    $st->execute();
    $u = $st->get_result()->fetch_assoc();
    if (!$u) json_fail('Không tìm thấy user', 404);
    
    if ($u['Role'] === 'Admin') json_fail('Không thể xóa mềm/khôi phục tài khoản Admin khác');
    
    $conn->begin_transaction();
    
    if ($action === 'soft_delete') {
        // Xóa mềm: Set IsDeleted=1, IsActive=0, và ghi lại thời gian
        $stmt = $conn->prepare("UPDATE Users SET IsDeleted=1, IsActive=0, DeletedAt=NOW() WHERE UserID=?");
        $stmt->bind_param("i", $UserID);
        $stmt->execute();
    } else if ($action === 'restore') {
        // Khôi phục: Set IsDeleted=0, IsActive=1, và xóa thời gian
        $stmt = $conn->prepare("UPDATE Users SET IsDeleted=0, IsActive=1, DeletedAt=NULL WHERE UserID=?");
        $stmt->bind_param("i", $UserID);
        $stmt->execute();
    }

    $conn->commit();
    
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    $conn->rollback();
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}