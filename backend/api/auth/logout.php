<?php
require_once "../../../includes/db.php";
session_start();

if (!empty($_SESSION['userid'])) {
    $uid = (int)$_SESSION['userid'];

    // Xóa token trong DB
    $stmt = $conn->prepare("DELETE FROM RememberTokens WHERE UserID = ?");
    $stmt->bind_param("i", $uid);
    $stmt->execute();
    $stmt->close();
}

// Xóa cookie
setcookie("remember_token", "", time() - 3600, "/", "", false, true);

// Xóa session
session_unset();
session_destroy();

header("Location: ../../../frontend/auth/login.php");
exit;
