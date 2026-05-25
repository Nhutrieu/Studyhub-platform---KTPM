<?php
// Các hàm hỗ trợ chống brute-force: khóa theo IP + thiết bị (User-Agent)

/**
 * Lấy IP client
 */
function getClientIP() {
    if (!empty($_SERVER['REMOTE_ADDR'])) {
        return $_SERVER['REMOTE_ADDR'];
    }
    return '0.0.0.0';
}

/**
 * Lấy User-Agent (thiết bị / trình duyệt)
 */
function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
}

/**
 * Lấy bản ghi LoginAttempts cho IP + Agent hiện tại
 */
function getLoginAttempt($conn, $ip, $agent) {
    $stmt = $conn->prepare("
        SELECT * FROM LoginAttempts
        WHERE IPAddress = ? AND UserAgent = ?
        LIMIT 1
    ");
    $stmt->bind_param("ss", $ip, $agent);
    $stmt->execute();
    $res = $stmt->get_result();
    return $res->fetch_assoc();
}

/**
 * Lưu / cập nhật số lần đăng nhập sai và thời gian khóa
 */
function saveLoginAttempt($conn, $ip, $agent, $attempts, $lockedUntil) {
    // Thử update trước
    $stmt = $conn->prepare("
        UPDATE LoginAttempts
        SET Attempts = ?, LockedUntil = ?, LastAttempt = NOW()
        WHERE IPAddress = ? AND UserAgent = ?
    ");
    $stmt->bind_param("isss", $attempts, $lockedUntil, $ip, $agent);
    $stmt->execute();

    // Nếu chưa có bản ghi nào bị ảnh hưởng -> insert mới
    if ($stmt->affected_rows === 0) {
        $stmt = $conn->prepare("
            INSERT INTO LoginAttempts (IPAddress, UserAgent, Attempts, LockedUntil)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("ssis", $ip, $agent, $attempts, $lockedUntil);
        $stmt->execute();
    }
}

/**
 * Xóa record khi đăng nhập thành công
 */
function clearLoginAttempts($conn, $ip, $agent) {
    $stmt = $conn->prepare("
        DELETE FROM LoginAttempts
        WHERE IPAddress = ? AND UserAgent = ?
    ");
    $stmt->bind_param("ss", $ip, $agent);
    $stmt->execute();
}

/**
 * Tính thời gian khóa (giây) dựa trên số lần sai
 *  - 5 lần sai  -> 1 phút
 *  - 10 lần sai -> 5 phút
 *  - 15 lần sai -> 15 phút
 *  - Từ 15p trở đi: mỗi level tiếp theo x2 thời gian khóa
 */
function calculateLockTime($attempts) {
    if ($attempts < 5) return 0;

    // 5,10,15,20,25,... -> stage 1,2,3,4,5,...
    $stage = floor($attempts / 5);

    if ($stage === 1) {
        $minutes = 1;   // 5 lần sai
    } elseif ($stage === 2) {
        $minutes = 5;   // 10 lần sai
    } else {
        // Stage 3 trở lên: bắt đầu từ 15p và x2 dần
        $baseMinutes = 15;                    // stage 3
        $multiplier  = pow(2, $stage - 3);    // 3->1, 4->2, 5->4, 6->8,...

        $minutes = $baseMinutes * $multiplier;

        // (optional) Giới hạn tối đa 24h cho đỡ overkill
        $maxMinutes = 24 * 60;
        if ($minutes > $maxMinutes) {
            $minutes = $maxMinutes;
        }
    }

    return $minutes * 60; // đổi sang giây
}


/**
 * Dọn các record cũ hơn 24h (nên gọi mỗi lần login)
 */
function cleanupOldAttempts($conn) {
    $conn->query("
        DELETE FROM LoginAttempts
        WHERE LastAttempt < (NOW() - INTERVAL 1 DAY)
    ");
}
