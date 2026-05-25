<?php
require_once "../../../includes/db.php";
session_start();

$token = $_GET['token'] ?? '';

if ($token === '') {
    echo "Liên kết xác minh không hợp lệ.";
    exit;
}

$stmt = $conn->prepare("
    SELECT evt.TokenID, evt.UserID, evt.ExpiresAt, evt.UsedAt, u.EmailVerified
    FROM EmailVerificationTokens evt
    JOIN Users u ON evt.UserID = u.UserID
    WHERE evt.Token = ?
    LIMIT 1
");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo "Liên kết xác minh không hợp lệ hoặc đã được sử dụng.";
    exit;
}

$row = $result->fetch_assoc();
$stmt->close();

if (!empty($row['UsedAt']) || strtotime($row['ExpiresAt']) < time()) {
    echo "Liên kết xác minh đã hết hạn hoặc đã được sử dụng.";
    exit;
}

$conn->begin_transaction();

try {
    // Cập nhật user
    $updUser = $conn->prepare("UPDATE Users SET EmailVerified = 1, EmailVerifiedAt = NOW() WHERE UserID = ?");
    $updUser->bind_param("i", $row['UserID']);
    $updUser->execute();
    $updUser->close();

    // Đánh dấu token đã dùng
    $updTok = $conn->prepare("UPDATE EmailVerificationTokens SET UsedAt = NOW() WHERE TokenID = ?");
    $updTok->bind_param("i", $row['TokenID']);
    $updTok->execute();
    $updTok->close();

    $conn->commit();

    header("Location: ../../../frontend/auth/login_normal.php?success=verified");
    exit;
} catch (Exception $e) {
    $conn->rollback();
    error_log("verify_email error: " . $e->getMessage());
    echo "Có lỗi xảy ra, vui lòng thử lại sau.";
    exit;
}
