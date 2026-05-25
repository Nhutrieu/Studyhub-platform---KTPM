<?php
require_once "../../../includes/db.php";
require_once "../../../includes/mail_helper.php";
session_start();
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ!']);
    exit;
}

// CSRF
if (!empty($_SESSION['csrf_token'])) {
    if (empty($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'message' => 'Mã bảo mật không hợp lệ, vui lòng tải lại trang.']);
        exit;
    }
}

$username         = trim($_POST['username'] ?? '');
$rawPassword      = $_POST['password'] ?? '';
$confirmPassword  = $_POST['confirm_password'] ?? '';
$fullName         = trim($_POST['full_name'] ?? '');
$email            = trim($_POST['email'] ?? '');
$phone            = trim($_POST['phone'] ?? '');   // tùy chọn
$address          = ""; // bỏ address luôn

// =====================
//  VALIDATE INPUT
// =====================

// Phone KHÔNG bắt buộc nữa
if ($username === "" || $rawPassword === "" || $confirmPassword === "" ||
    $fullName === "" || $email === "") {

    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
    exit;
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email không hợp lệ.']);
    exit;
}

// Validate phone chỉ khi có nhập
if ($phone !== "" && !preg_match('/^[0-9]{9,12}$/', $phone)) {
    echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ (9–12 số).']);
    exit;
}

// Validate confirm password
if ($rawPassword !== $confirmPassword) {
    echo json_encode(['success' => false, 'message' => 'Mật khẩu xác nhận không khớp.']);
    exit;
}

// Validate password mạnh
$pwdPattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/';
if (!preg_match($pwdPattern, $rawPassword)) {
    echo json_encode([
        'success' => false,
        'message' => 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ thường, chữ hoa và số.'
    ]);
    exit;
}

$hashedPassword = password_hash($rawPassword, PASSWORD_DEFAULT);

// =====================
//  CHECK TRÙNG USERNAME
// =====================
$checkUsername = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
$checkUsername->bind_param("s", $username);
$checkUsername->execute();
$checkUsername->store_result();
if ($checkUsername->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Tên đăng nhập đã tồn tại.']);
    exit;
}
$checkUsername->close();

// =====================
//  CHECK TRÙNG EMAIL
// =====================
$checkEmail = $conn->prepare("SELECT UserID FROM Users WHERE Email = ?");
$checkEmail->bind_param("s", $email);
$checkEmail->execute();
$checkEmail->store_result();
if ($checkEmail->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'Email đã được sử dụng.']);
    exit;
}
$checkEmail->close();

// =====================
//  CHECK TRÙNG PHONE (nếu có nhập)
// =====================
if ($phone !== "") {
    $checkPhone = $conn->prepare("SELECT UserID FROM Users WHERE Phone = ?");
    $checkPhone->bind_param("s", $phone);
    $checkPhone->execute();
    $checkPhone->store_result();
    if ($checkPhone->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Số điện thoại đã được sử dụng.']);
        exit;
    }
    $checkPhone->close();
}

$role         = 'Customer';
$authProvider = 'local';
$avatarURL    = '/uploads/avatars/default.png';

// =====================
//  INSERT USER
// =====================

$stmt = $conn->prepare("
    INSERT INTO Users (FullName, Email, PasswordHash, Username, Phone, Address, Role, AuthProvider, AvatarURL)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->bind_param(
    "sssssssss",
    $fullName,
    $email,
    $hashedPassword,
    $username,
    $phone,
    $address,
    $role,
    $authProvider,
    $avatarURL
);

if ($stmt->execute()) {
    $userId = $stmt->insert_id;
    $stmt->close();

    // Tạo token xác minh email (24h)
    $token     = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + 24 * 60 * 60);

    $insToken = $conn->prepare("
        INSERT INTO EmailVerificationTokens (UserID, Token, ExpiresAt)
        VALUES (?, ?, ?)
    ");
    $insToken->bind_param("iss", $userId, $token, $expiresAt);
    $insToken->execute();
    $insToken->close();

    // Gửi email xác minh
    $emailSent = sendVerificationEmail($email, $fullName, $token);

    if (!$emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Đăng ký thành công, nhưng hiện chưa gửi được email xác minh. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.'
    ]);
} else {
    $stmt->close();
    echo json_encode(['success' => false, 'message' => 'Lỗi khi đăng ký, vui lòng thử lại sau.']);
}

exit;

?>
