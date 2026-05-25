<?php
// includes/check_login.php
error_reporting(0);
require_once __DIR__ . '/db.php';
session_start();

/* =========================================================
   1) NẾU CHƯA LOGIN → KIỂM TRA REMEMBER TOKEN
   ========================================================= */
if (empty($_SESSION['userid'])) {

    if (!empty($_COOKIE['remember_token'])) {

        $rawToken    = $_COOKIE['remember_token'];
        $hashedToken = hash('sha256', $rawToken);

        // Tìm token còn hạn trong DB
        $stmt = $conn->prepare("
            SELECT R.UserID, U.Username, U.FullName, U.Email, U.Role, U.AvatarURL, U.IsActive
            FROM RememberTokens R
            JOIN Users U ON U.UserID = R.UserID
            WHERE R.TokenHash = ?
              AND R.ExpiresAt > NOW()
            LIMIT 1
        ");
        $stmt->bind_param("s", $hashedToken);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($user && (int)$user['IsActive'] === 1) {
            // AUTO LOGIN TỪ COOKIE
            $_SESSION['userid']    = $user['UserID'];
            $_SESSION['username']  = $user['Username'];
            $_SESSION['fullname']  = $user['FullName'];
            $_SESSION['email']     = $user['Email'];
            $_SESSION['role']      = $user['Role'];
            $_SESSION['avatarurl'] = $user['AvatarURL'];
        } else {
            // Token sai/hết hạn/user khóa → xóa cookie
            setcookie("remember_token", "", time() - 3600, "/", "", false, true);
        }
    }
}

/* =========================================================
   2) NẾU VẪN CHƯA ĐĂNG NHẬP → ĐẨY VỀ TRANG LOGIN
   ========================================================= */
if (empty($_SESSION['userid'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login_normal.php");
    exit;
}

/* =========================================================
/* 3) LẤY THÔNG TIN USER ĐỂ ĐỒNG BỘ */
$userId = (int)$_SESSION['userid'];

$stmt = $conn->prepare("
    SELECT UserID, FullName, Email, Role, AvatarURL, IsActive
    FROM Users
    WHERE UserID = ?
    LIMIT 1
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();


/* =========================================================
   4) USER KHÔNG TỒN TẠI / BỊ KHÓA → LOGOUT
   ========================================================= */
if (!$user || (int)$user['IsActive'] === 0) {

    // Xóa token trong DB (nếu có)
    if (!empty($_COOKIE['remember_token'])) {
        $hashedToken = hash('sha256', $_COOKIE['remember_token']);
        $del = $conn->prepare("DELETE FROM RememberTokens WHERE TokenHash = ?");
        $del->bind_param("s", $hashedToken);
        $del->execute();
        $del->close();
    }

    // Xóa cookie
    setcookie("remember_token", "", time() - 3600, "/", "", false, true);

    // Hủy session & chuyển về login
    session_destroy();
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login_normal.php?error=disabled");
    exit;
}

/* =========================================================
   5) ĐỒNG BỘ SESSION
   ========================================================= */
$_SESSION['userid']    = $user['UserID'];
$_SESSION['fullname']  = $user['FullName'];
$_SESSION['email']     = $user['Email'];
$_SESSION['role']      = $user['Role'];
$_SESSION['avatarurl'] = $user['AvatarURL'];

?>
