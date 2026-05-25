<?php
require_once "../../../includes/db.php";
require_once "../../../includes/mail_helper.php";
session_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: ../../../frontend/auth/forgot_password.php");
    exit;
}

// CSRF
if (
    empty($_POST['csrf_token']) ||
    empty($_SESSION['csrf_token']) ||
    !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])
) {
    $_SESSION['forgot_error'] = 'Phiên làm việc không hợp lệ. Vui lòng thử lại.';
    header("Location: ../../../frontend/auth/forgot_password.php");
    exit;
}

$email = trim($_POST['email'] ?? '');

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $_SESSION['forgot_error'] = 'Vui lòng nhập email hợp lệ.';
    header("Location: ../../../frontend/auth/forgot_password.php");
    exit;
}

$stmt = $conn->prepare("
    SELECT UserID, FullName, EmailVerified, IsActive
    FROM Users
    WHERE Email = ?
    LIMIT 1
");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user       = $result->fetch_assoc();
    $userId     = (int)$user['UserID'];
    $fullName   = $user['FullName'];
    $isActive   = ((int)$user['IsActive'] === 1);
    $isVerified = ((int)$user['EmailVerified'] === 1);

    // Tài khoản đang hoạt động & đã xác minh -> gửi mail reset bình thường
    if ($isActive && $isVerified) {
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 60 * 60); // 1 giờ

        $ins = $conn->prepare("
            INSERT INTO PasswordResetTokens (UserID, Token, ExpiresAt)
            VALUES (?, ?, ?)
        ");
        $ins->bind_param("iss", $userId, $token, $expiresAt);
        $ins->execute();
        $ins->close();

        sendPasswordResetEmail($email, $fullName, $token);

        $_SESSION['forgot_success'] = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

    // Tài khoản còn active nhưng CHƯA xác minh email -> gửi mail kích hoạt + reset
    } elseif ($isActive && !$isVerified) {
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 60 * 60); // 1 giờ

        $ins = $conn->prepare("
            INSERT INTO PasswordResetTokens (UserID, Token, ExpiresAt)
            VALUES (?, ?, ?)
        ");
        $ins->bind_param("iss", $userId, $token, $expiresAt);
        $ins->execute();
        $ins->close();

        sendActivationAndResetEmail($email, $fullName, $token);

        // Thông điệp rõ ràng như bạn yêu cầu
        $_SESSION['forgot_success'] = 'Tài khoản của bạn hiện chưa được kích hoạt. Chúng tôi đã gửi email để bạn kích hoạt tài khoản và đặt lại mật khẩu.';

    // Tài khoản bị khóa / không active
    } else {
        $_SESSION['forgot_error'] = 'Tài khoản của bạn đang tạm khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
    }

} else {
    // Không tiết lộ email có tồn tại hay không
    $_SESSION['forgot_success'] = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';
}

header("Location: ../../../frontend/auth/forgot_password.php");
exit;
