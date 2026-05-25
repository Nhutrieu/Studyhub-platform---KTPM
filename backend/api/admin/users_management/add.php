<?php
// backend/api/admin/users_management/add.php
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
    return (int)$me['UserID'];
}

try {
    ensure_admin($conn);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_fail('Phương thức không hợp lệ', 405);

    // Lấy dữ liệu từ $_POST (dùng FormData trong JS)
    $FullName   = trim($_POST['FullName'] ?? '');
    $Email      = trim($_POST['Email'] ?? '');
    $Username   = trim($_POST['Username'] ?? '');
    $Password   = $_POST['Password'] ?? '';
    $Role       = $_POST['Role'] ?? 'Customer';
    $Provider   = $_POST['AuthProvider'] ?? 'local';
    
    // Các trường tùy chọn (đặt giá trị mặc định rỗng)
    $Phone      = trim($_POST['Phone'] ?? '');
    $Address    = trim($_POST['Address'] ?? '');
    $ProviderID = trim($_POST['ProviderID'] ?? '');
    $AvatarURL  = trim($_POST['AvatarURL'] ?? '');

    // Validation
    if ($Email === '' || $Username === '' || $FullName === '') json_fail('Họ tên, Email và Username là bắt buộc');
    if (!filter_var($Email, FILTER_VALIDATE_EMAIL)) json_fail('Email không hợp lệ');
    if (!in_array($Role, ['Admin','Shop','Customer'])) json_fail('Role không hợp lệ');
    if (!in_array($Provider, ['local','google','facebook','github'])) json_fail('AuthProvider không hợp lệ');

    // Unique
    $st = $conn->prepare("SELECT 1 FROM Users WHERE Email=? OR Username=? LIMIT 1");
    $st->bind_param("ss", $Email, $Username);
    $st->execute();
    if ($st->get_result()->fetch_assoc()) json_fail('Email hoặc Username đã tồn tại');

    // Password processing
    if ($Provider === 'local') {
        if ($Password === '' || strlen($Password) < 6) {
            json_fail('Mật khẩu cho tài khoản local là bắt buộc và tối thiểu 6 ký tự.');
        }
        $PasswordHash = password_hash($Password, PASSWORD_BCRYPT);
    } else {
        $PasswordHash = null; // đăng nhập qua provider ngoài
    }

    $sql = "INSERT INTO Users
             (FullName, Email, PasswordHash, Username, Phone, Address, Role, AuthProvider, ProviderID, AvatarURL, IsActive, IsDeleted)
             VALUES (?,?,?,?,?,?,?,?,?,?, 1, 0)";
    $st = $conn->prepare($sql);
    $st->bind_param("ssssssssss",
        $FullName, $Email, $PasswordHash, $Username, $Phone, $Address, $Role, $Provider, $ProviderID, $AvatarURL
    );
    $st->execute();

    echo json_encode(['success'=>true, 'message' => 'Người dùng mới đã được tạo thành công.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_fail('Lỗi hệ thống: '.$e->getMessage(), 500);
}