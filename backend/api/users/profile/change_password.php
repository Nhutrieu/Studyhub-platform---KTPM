<?php
// backend/api/users/profile/change_password.php
session_start();
header('Content-Type: application/json');
require_once '../../../../includes/db.php';

if (!isset($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'message' => 'Bạn chưa đăng nhập.']);
    exit;
}

$userId = $_SESSION['userid'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid method.']);
    exit;
}

$oldPass = $_POST['old_password'] ?? '';
$newPass = $_POST['new_password'] ?? '';
$confirmPass = $_POST['confirm_password'] ?? '';

if (empty($oldPass) || empty($newPass) || empty($confirmPass)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
    exit;
}

if ($newPass !== $confirmPass) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu xác nhận không khớp.']);
    exit;
}

// YÊU CẦU MỚI VỀ ĐỘ PHỨC TẠP MẬT KHẨU
// 1. Mật khẩu phải có ít nhất 8 ký tự.
if (strlen($newPass) < 8) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu mới phải có ít nhất 8 ký tự.']);
    exit;
}

// 2. Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa, và 1 số.
// Regex: (?=.*[a-z]) (chữ thường), (?=.*[A-Z]) (chữ hoa), (?=.*\d) (số)
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/', $newPass)) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu mới phải bao gồm chữ thường, chữ hoa và số.']);
    exit;
}
// KẾT THÚC KIỂM TRA ĐỘ PHỨC TẠM MẬT KHẨU

// Kiểm tra mật khẩu cũ
$stmt = $conn->prepare("SELECT PasswordHash FROM Users WHERE UserID = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$res || !password_verify($oldPass, $res['PasswordHash'])) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu cũ không chính xác.']);
    exit;
}

// Cập nhật mật khẩu mới
$newHash = password_hash($newPass, PASSWORD_DEFAULT);
$stmtUpdate = $conn->prepare("UPDATE Users SET PasswordHash = ? WHERE UserID = ?");
$stmtUpdate->bind_param("si", $newHash, $userId);

if ($stmtUpdate->execute()) {
    echo json_encode(['success' => true, 'message' => 'Đổi mật khẩu thành công!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống, vui lòng thử lại sau.']);
}
$stmtUpdate->close();
?>