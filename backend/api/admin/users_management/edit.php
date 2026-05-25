<?php
// backend/api/admin/users_management/edit.php
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
    return $me; // ['UserID'=>.., 'Role'=>'Admin']
}
function count_admins($conn) {
    $r = $conn->query("SELECT COUNT(*) c FROM Users WHERE Role='Admin'")->fetch_assoc();
    return (int)$r['c'];
}

try {
    $me = ensure_admin($conn);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

    $UserID = (int)($_POST['UserID'] ?? 0);
    if ($UserID <= 0) json_fail('Thiếu UserID');

    // Lấy user hiện tại
    $st = $conn->prepare("SELECT * FROM Users WHERE UserID=?");
    $st->bind_param("i", $UserID);
    $st->execute();
    $u = $st->get_result()->fetch_assoc();
    if (!$u) json_fail('Không tìm thấy user', 404);

    // Admin Protection: Không chỉnh sửa Admin khác
    if ($u['Role'] === 'Admin' && (int)$UserID !== (int)$me['UserID']) {
        json_fail('Không thể chỉnh sửa thông tin của Admin khác', 403);
    }
    
    // Input (giữ nguyên nếu không gửi)
    $FullName   = isset($_POST['FullName']) ? trim($_POST['FullName']) : $u['FullName'];
    $Email      = isset($_POST['Email']) ? trim($_POST['Email']) : $u['Email'];
    $Username   = isset($_POST['Username']) ? trim($_POST['Username']) : $u['Username'];
    $Role       = isset($_POST['Role']) ? $_POST['Role'] : $u['Role'];
    $Provider   = isset($_POST['AuthProvider']) ? $_POST['AuthProvider'] : $u['AuthProvider'];
    $NewPass    = $_POST['Password'] ?? null; // nếu null => không đổi

    // Các trường tùy chọn (dùng giá trị cũ nếu không gửi)
    $Phone      = isset($_POST['Phone']) ? trim($_POST['Phone']) : $u['Phone'];
    $Address    = isset($_POST['Address']) ? trim($_POST['Address']) : $u['Address'];
    $ProviderID = isset($_POST['ProviderID']) ? trim($_POST['ProviderID']) : $u['ProviderID'];
    $AvatarURL  = isset($_POST['AvatarURL']) ? trim($_POST['AvatarURL']) : $u['AvatarURL'];


    if (!in_array($Role, ['Admin','Shop','Customer'])) json_fail('Role không hợp lệ');
    if (!in_array($Provider, ['local','google','facebook','github'])) json_fail('AuthProvider không hợp lệ');

    // Unique Email/Username (trừ chính mình)
    $st = $conn->prepare("SELECT 1 FROM Users WHERE (Email=? OR Username=?) AND UserID<>?");
    $st->bind_param("ssi", $Email, $Username, $UserID);
    $st->execute();
    if ($st->get_result()->fetch_assoc()) json_fail('Email hoặc Username đã tồn tại');

    // Bảo vệ: không được làm mất Admin cuối cùng
    $admin_count = count_admins($conn);
    $demote_admin = ($u['Role'] === 'Admin' && $Role !== 'Admin');
    if ($demote_admin && $admin_count <= 1) {
        json_fail('Không thể hạ quyền Admin cuối cùng');
    }

    // Nếu đổi mật khẩu cho account local hoặc chuyển sang local và có nhập pass mới
    $PasswordHash = $u['PasswordHash'];
    if ($Provider === 'local') {
        if ($NewPass !== null && $NewPass !== '') {
            if (strlen($NewPass) < 6) json_fail('Mật khẩu tối thiểu 6 ký tự.');
            $PasswordHash = password_hash($NewPass, PASSWORD_BCRYPT);
        }
    } else {
        // provider ngoài -> không set password hash
        $PasswordHash = null;
    }

    $sql = "UPDATE Users SET
                FullName=?,
                Email=?,
                PasswordHash=?,
                Username=?,
                Phone=?,
                Address=?,
                Role=?,
                AuthProvider=?,
                ProviderID=?,
                AvatarURL=?
            WHERE UserID=?";
    $st = $conn->prepare($sql);
    $st->bind_param("ssssssssssi",
        $FullName, $Email, $PasswordHash, $Username, $Phone, $Address,
        $Role, $Provider, $ProviderID, $AvatarURL, $UserID
    );
    $st->execute();

    echo json_encode(['success'=>true], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}