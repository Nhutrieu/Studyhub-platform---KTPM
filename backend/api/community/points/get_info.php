<?php
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['username'])) {
        fail('Chưa đăng nhập', 401);
    }

    $targetUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if ($targetUserId <= 0) {
        fail('ID người dùng không hợp lệ', 400);
    }

    // Lấy thông tin điểm và biệt hiệu
    $stmt = $conn->prepare("
        SELECT 
            ub.UserID,
            ub.Points,
            ub.CurrentBadge,
            ub.NextBadge,
            ub.PointsToNextBadge,
            ub.LastUpdated,
            bc.BadgeTitle,
            bc.BadgeColor,
            bc.Description as BadgeDescription,
            bc.RequiredPoints,
            u.Username,
            u.FullName,
            u.AvatarURL,
            u.Role
        FROM UserBadgeSystem ub
        LEFT JOIN BadgeConfiguration bc ON ub.CurrentBadge = bc.BadgeName
        LEFT JOIN Users u ON ub.UserID = u.UserID
        WHERE ub.UserID = ?
    ");
    
    $stmt->bind_param("i", $targetUserId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Nếu chưa có, tạo bản ghi mặc định
        $insertStmt = $conn->prepare("
            INSERT INTO UserBadgeSystem (UserID, Points, CurrentBadge, NextBadge, PointsToNextBadge)
            VALUES (?, 0, 'newbie', 'enthusiast', 30)
            ON DUPLICATE KEY UPDATE 
                Points = VALUES(Points),
                CurrentBadge = VALUES(CurrentBadge),
                NextBadge = VALUES(NextBadge),
                PointsToNextBadge = VALUES(PointsToNextBadge)
        ");
        $insertStmt->bind_param("i", $targetUserId);
        $insertStmt->execute();
        $insertStmt->close();
        
        // Lấy lại thông tin
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
    } else {
        $result = $result->fetch_assoc();
    }
    $stmt->close();
    
    // Lấy thông tin biệt hiệu tiếp theo
    if ($result['NextBadge']) {
        $nextBadgeStmt = $conn->prepare("
            SELECT BadgeTitle, RequiredPoints 
            FROM BadgeConfiguration 
            WHERE BadgeName = ?
        ");
        $nextBadgeStmt->bind_param("s", $result['NextBadge']);
        $nextBadgeStmt->execute();
        $nextBadge = $nextBadgeStmt->get_result()->fetch_assoc();
        $nextBadgeStmt->close();
    }
    
    // Format data
    $badgeInfo = [
        'user_id' => (int)$result['UserID'],
        'points' => (int)$result['Points'],
        'currentBadge' => $result['CurrentBadge'] ?: 'newbie',
        'badge_title' => $result['BadgeTitle'] ?: 'Tập sự Koi',
        'badge_color' => $result['BadgeColor'] ?: '#607D8B',
        'badge_description' => $result['BadgeDescription'] ?: 'Người mới bắt đầu',
        'nextBadge' => $result['NextBadge'] ?? null,
        'next_badge_title' => $nextBadge['BadgeTitle'] ?? null,
        'next_required_points' => (int)($nextBadge['RequiredPoints'] ?? 0),
        'pointsToNextBadge' => (int)$result['PointsToNextBadge'],
        'required_points' => (int)$result['RequiredPoints'],
        'last_updated' => $result['LastUpdated'],
        'total_points' => (int)$result['Points'],
        'user_info' => [
            'username' => $result['Username'],
            'fullname' => $result['FullName'],
            'avatar' => $result['AvatarURL'],
            'role' => $result['Role']
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'badge_info' => $badgeInfo
    ]);
    
} catch (Exception $e) {
    error_log("Error getting badge info: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
?>