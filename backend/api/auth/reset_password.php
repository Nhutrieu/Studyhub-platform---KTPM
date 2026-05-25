<?php
require_once "../../../includes/db.php";
session_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: ../../../frontend/auth/login_normal.php");
    exit;
}

// --- LẤY CỜ KÍCH HOẠT (nếu link là kích hoạt + reset) ---
$activateFlag   = isset($_POST['activate']) && $_POST['activate'] === '1';
$activateSuffix = $activateFlag ? '&activate=1' : '';

// CSRF
if (
    empty($_POST['csrf_token']) ||
    empty($_SESSION['csrf_token']) ||
    !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])
) {
    $_SESSION['reset_error'] = 'Phiên làm việc không hợp lệ. Vui lòng thử lại.';
    $token = urlencode($_POST['token'] ?? '');
    header("Location: ../../../frontend/auth/reset_password.php?token={$token}{$activateSuffix}");
    exit;
}

$token       = $_POST['token'] ?? '';
$rawPassword = $_POST['password'] ?? '';
$confirmPwd  = $_POST['confirm_password'] ?? '';

if ($token === '') {
    $_SESSION['reset_error'] = 'Liên kết đặt lại mật khẩu không hợp lệ.';
    header("Location: ../../../frontend/auth/login_normal.php");
    exit;
}

if ($rawPassword === '' || $confirmPwd === '') {
    $_SESSION['reset_error'] = 'Vui lòng nhập đầy đủ mật khẩu.';
    $t = urlencode($token);
    header("Location: ../../../frontend/auth/reset_password.php?token={$t}{$activateSuffix}");
    exit;
}

if ($rawPassword !== $confirmPwd) {
    $_SESSION['reset_error'] = 'Mật khẩu xác nhận không khớp.';
    $t = urlencode($token);
    header("Location: ../../../frontend/auth/reset_password.php?token={$t}{$activateSuffix}");
    exit;
}

// Rule mật khẩu mạnh giống lúc đăng ký
$pwdPattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/';
if (!preg_match($pwdPattern, $rawPassword)) {
    $_SESSION['reset_error'] = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ thường, chữ hoa và số.';
    $t = urlencode($token);
    header("Location: ../../../frontend/auth/reset_password.php?token={$t}{$activateSuffix}");
    exit;
}

// Kiểm tra token
$stmt = $conn->prepare("
    SELECT prt.TokenID, prt.UserID, prt.ExpiresAt, prt.UsedAt, u.IsActive
    FROM PasswordResetTokens prt
    JOIN Users u ON prt.UserID = u.UserID
    WHERE prt.Token = ?
    LIMIT 1
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    $_SESSION['reset_error'] = 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.';
    header("Location: ../../../frontend/auth/login_normal.php");
    exit;
}

$row = $result->fetch_assoc();
$stmt->close();

if (!empty($row['UsedAt']) || strtotime($row['ExpiresAt']) < time()) {
    $_SESSION['reset_error'] = 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.';
    header("Location: ../../../frontend/auth/login_normal.php");
    exit;
}

$userId = (int)$row['UserID'];

$conn->begin_transaction();

try {
    // Cập nhật mật khẩu
    $hashed = password_hash($rawPassword, PASSWORD_DEFAULT);
    $updUser = $conn->prepare("UPDATE Users SET PasswordHash = ? WHERE UserID = ?");
    $updUser->bind_param("si", $hashed, $userId);
    $updUser->execute();
    $updUser->close();

    // Nếu đây là link kích hoạt + reset -> kích hoạt tài khoản luôn
    if ($activateFlag) {
        $updStatus = $conn->prepare("UPDATE Users SET EmailVerified = 1, IsActive = 1 WHERE UserID = ?");
        $updStatus->bind_param("i", $userId);
        $updStatus->execute();
        $updStatus->close();
    }

    // Đánh dấu token đã dùng
    $updToken = $conn->prepare("UPDATE PasswordResetTokens SET UsedAt = NOW() WHERE TokenID = ?");
    $updToken->bind_param("i", $row['TokenID']);
    $updToken->execute();
    $updToken->close();

    // Xoá các token reset khác (nếu có)
    $delOther = $conn->prepare("DELETE FROM PasswordResetTokens WHERE UserID = ? AND TokenID <> ?");
    $delOther->bind_param("ii", $userId, $row['TokenID']);
    $delOther->execute();
    $delOther->close();

    // Có thể xoá luôn remember_token để bắt buộc đăng nhập lại
    $delRem = $conn->prepare("DELETE FROM RememberTokens WHERE UserID = ?");
    $delRem->bind_param("i", $userId);
    $delRem->execute();
    $delRem->close();

    $conn->commit();

    header("Location: ../../../frontend/auth/login_normal.php?success=reset");
    exit;
} catch (Exception $e) {
    $conn->rollback();
    error_log("reset_password error: " . $e->getMessage());
    $_SESSION['reset_error'] = 'Có lỗi xảy ra, vui lòng thử lại sau.';
    $t = urlencode($token);
    header("Location: ../../../frontend/auth/reset_password.php?token={$t}{$activateSuffix}");
    exit;
}
