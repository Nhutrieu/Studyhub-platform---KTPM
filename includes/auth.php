<?php
// includes/auth.php
session_start();

/**
 * Kiểm tra người dùng có đăng nhập không
 */
function isLoggedIn() {
    return isset($_SESSION['username']) || isset($_SESSION['userid']);
}

/**
 * Lấy ID người dùng hiện tại
 */
function getCurrentUserId() {
    global $conn;
    
    // Ưu tiên lấy từ session nếu có
    if (isset($_SESSION['userid'])) {
        return (int)$_SESSION['userid'];
    }
    
    // Nếu chỉ có username, tìm ID từ database
    if (isset($_SESSION['username'])) {
        $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
        $stmt->bind_param("s", $_SESSION['username']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            // Lưu vào session để lần sau dùng nhanh hơn
            $_SESSION['userid'] = (int)$user['UserID'];
            return (int)$user['UserID'];
        }
    }
    
    return 0;
}

/**
 * Kiểm tra người dùng có bị cấm đăng bài không
 * @param int $userId ID người dùng
 * @return array Thông tin cấm hoặc false nếu không bị cấm
 */
function checkUserPostBan($userId) {
    global $conn;
    
    $sql = "SELECT b.*, admin.Username as banned_by_username
            FROM UserBan b
            LEFT JOIN Users admin ON b.BannedBy = admin.UserID
            WHERE b.UserID = ? 
              AND b.IsActive = 1
              AND (b.BanType = 'post_only' OR b.BanType = 'full_ban')
              AND (b.BanDuration = 0 OR b.UnbanAt > NOW())
            LIMIT 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $ban = $result->fetch_assoc();
        
        // Tính ngày còn lại
        $remainingDays = 0;
        if ($ban['BanDuration'] > 0) {
            $unbanTime = strtotime($ban['UnbanAt']);
            $currentTime = time();
            $remainingSeconds = $unbanTime - $currentTime;
            $remainingDays = max(0, ceil($remainingSeconds / (60 * 60 * 24)));
        }
        
        return [
            'is_banned' => true,
            'ban_id' => $ban['BanID'],
            'reason' => $ban['Reason'],
            'ban_type' => $ban['BanType'],
            'duration' => $ban['BanDuration'],
            'banned_at' => $ban['BannedAt'],
            'unban_at' => $ban['UnbanAt'],
            'banned_by' => $ban['banned_by_username'],
            'remaining_days' => $remainingDays
        ];
    }
    
    return ['is_banned' => false];
}

/**
 * Kiểm tra và thông báo nếu người dùng bị cấm
 * @param int $userId ID người dùng
 * @throws Exception Nếu người dùng bị cấm
 */
function requirePostPermission($userId) {
    global $conn;
    
    // Kiểm tra xem user có bị cấm đăng bài không
    $checkStmt = $conn->prepare("
        SELECT * FROM UserBan 
        WHERE UserID = ? 
        AND IsActive = 1 
        AND Scope = 'community'
        AND BanType IN ('post_only', 'full_ban')
        AND (IsTemporary = 0 OR ExpiresAt > NOW())
        LIMIT 1
    ");
    
    $checkStmt->bind_param("i", $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        $ban = $result->fetch_assoc();
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => "Tài khoản của bạn đã bị cấm đăng bài. Lý do: " . $ban['Reason']
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Lấy thông tin người dùng hiện tại
 */
function getCurrentUserInfo() {
    global $conn;
    
    $userId = getCurrentUserId();
    if ($userId == 0) {
        return null;
    }
    
    $stmt = $conn->prepare("
        SELECT UserID, Username, FullName, Email, Role, AvatarURL, IsActive 
        FROM Users 
        WHERE UserID = ? 
        LIMIT 1
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    return null;
}

/**
 * Kiểm tra user có phải admin không
 */
function isAdmin() {
    if (!isset($_SESSION['role'])) {
        // Nếu không có role trong session, kiểm tra từ database
        $userInfo = getCurrentUserInfo();
        if ($userInfo && $userInfo['Role'] === 'Admin') {
            $_SESSION['role'] = 'Admin';
            return true;
        }
        return false;
    }
    
    return $_SESSION['role'] === 'Admin';
}

/**
 * Yêu cầu đăng nhập
 */
function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng đăng nhập để tiếp tục'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Yêu cầu quyền admin
 */
function requireAdmin() {
    requireLogin();
    
    if (!isAdmin()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Bạn không có quyền truy cập tính năng này'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Đăng xuất
 */
function logout() {
    session_destroy();
    session_start();
    session_regenerate_id(true);
}

/**
 * Kiểm tra user có bị cấm không (cho comment)
 */
function checkUserCommentBan($userId) {
    global $conn;
    
    $sql = "SELECT b.*, admin.Username as banned_by_username
            FROM UserBan b
            LEFT JOIN Users admin ON b.BannedBy = admin.UserID
            WHERE b.UserID = ? 
              AND b.IsActive = 1
              AND (b.BanType = 'comment_only' OR b.BanType = 'full_ban')
              AND (b.BanDuration = 0 OR b.UnbanAt > NOW())
            LIMIT 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $ban = $result->fetch_assoc();
        
        // Tính ngày còn lại
        $remainingDays = 0;
        if ($ban['BanDuration'] > 0) {
            $unbanTime = strtotime($ban['UnbanAt']);
            $currentTime = time();
            $remainingSeconds = $unbanTime - $currentTime;
            $remainingDays = max(0, ceil($remainingSeconds / (60 * 60 * 24)));
        }
        
        return [
            'is_banned' => true,
            'ban_id' => $ban['BanID'],
            'reason' => $ban['Reason'],
            'ban_type' => $ban['BanType'],
            'duration' => $ban['BanDuration'],
            'banned_at' => $ban['BannedAt'],
            'unban_at' => $ban['UnbanAt'],
            'banned_by' => $ban['banned_by_username'],
            'remaining_days' => $remainingDays
        ];
    }
    
    return ['is_banned' => false];
}
?>