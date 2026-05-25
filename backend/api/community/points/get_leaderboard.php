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
    if (!isset($_SESSION['username'])) {
        fail('Chưa đăng nhập', 401);
    }

    $limit = min(50, max(10, (int)($_GET['limit'] ?? 20)));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $offset = ($page - 1) * $limit;

    // Lấy bảng xếp hạng
    $stmt = $conn->prepare("
        SELECT 
            ub.UserID,
            ub.Points,
            ub.CurrentBadge,
            ub.PointsToNextBadge,
            bc.BadgeTitle,
            bc.BadgeColor,
            u.Username,
            u.FullName,
            u.AvatarURL,
            u.Role,
            ROW_NUMBER() OVER (ORDER BY ub.Points DESC) as Rank
        FROM UserBadgeSystem ub
        LEFT JOIN BadgeConfiguration bc ON ub.CurrentBadge = bc.BadgeName
        LEFT JOIN Users u ON ub.UserID = u.UserID
        WHERE u.IsActive = 1
        ORDER BY ub.Points DESC
        LIMIT ?, ?
    ");
    
    $stmt->bind_param("ii", $offset, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    $leaderboard = [];
    
    while ($row = $result->fetch_assoc()) {
        $leaderboard[] = [
            'rank' => (int)$row['Rank'] + $offset,
            'user_id' => (int)$row['UserID'],
            'username' => $row['Username'],
            'fullname' => $row['FullName'],
            'avatar' => $row['AvatarURL'],
            'role' => $row['Role'],
            'points' => (int)$row['Points'],
            'currentBadge' => $row['CurrentBadge'],
            'badge_title' => $row['BadgeTitle'],
            'badge_color' => $row['BadgeColor'],
            'pointsToNextBadge' => (int)$row['PointsToNextBadge']
        ];
    }
    $stmt->close();
    
    // Lấy vị trí của user hiện tại
    $currentUserStmt = $conn->prepare("
        SELECT COUNT(*) as user_rank
        FROM UserBadgeSystem ub2
        WHERE ub2.Points > (SELECT Points FROM UserBadgeSystem WHERE UserID = ?)
    ");
    $currentUserStmt->bind_param("i", $_SESSION['user_id']);
    $currentUserStmt->execute();
    $userRank = $currentUserStmt->get_result()->fetch_assoc()['user_rank'] + 1;
    $currentUserStmt->close();
    
    echo json_encode([
        'success' => true,
        'leaderboard' => $leaderboard,
        'current_user_rank' => $userRank,
        'page' => $page,
        'limit' => $limit,
        'has_more' => count($leaderboard) === $limit
    ]);
    
} catch (Exception $e) {
    error_log("Error getting leaderboard: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Lỗi hệ thống']);
}
?>