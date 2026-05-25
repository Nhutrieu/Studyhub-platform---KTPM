<?php

/**
 * Tạo token remember me (64 bytes)
 */
function generateRememberToken() {
    return bin2hex(random_bytes(64));
}

/**
 * Lưu TokenHash vào DB
 */
function storeRememberToken($conn, $userID, $token) {
    $hash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + (30 * 24 * 60 * 60)); // 30 ngày

    // xóa token cũ của user
    $stmt = $conn->prepare("DELETE FROM RememberTokens WHERE UserID = ?");
    $stmt->bind_param("i", $userID);
    $stmt->execute();

    // insert token mới
    $stmt = $conn->prepare("
        INSERT INTO RememberTokens (UserID, TokenHash, ExpiresAt)
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param("iss", $userID, $hash, $expiresAt);
    $stmt->execute();
}

/**
 * Xác thực remember me từ cookie
 */
function validateRememberMe($conn) {
    if (!isset($_COOKIE['remember_token'])) return false;

    $token = $_COOKIE['remember_token'];
    $hash  = hash('sha256', $token);

    $stmt = $conn->prepare("
        SELECT UserID FROM RememberTokens
        WHERE TokenHash = ? AND ExpiresAt > NOW()
        LIMIT 1
    ");
    $stmt->bind_param("s", $hash);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 1) {
        return $res->fetch_assoc()['UserID'];
    }

    return false;
}

/**
 * Xóa token khi logout
 */
function removeRememberToken($conn, $userID) {
    $stmt = $conn->prepare("DELETE FROM RememberTokens WHERE UserID = ?");
    $stmt->bind_param("i", $userID);
    $stmt->execute();

    setcookie('remember_token', '', time() - 3600, "/", "", false, true);
}

/**
 * Lưu cookie remember token (30 ngày)
 */
function setRememberCookie($token) {
    setcookie(
        'remember_token',
        $token,
        time() + (30 * 24 * 60 * 60),
        "/",
        "",
        false,
        true  // httponly
    );
}
