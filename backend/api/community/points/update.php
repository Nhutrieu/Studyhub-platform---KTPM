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

    $userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
    $actionType = $_POST['action_type'] ?? '';
    $relatedId = isset($_POST['related_id']) ? (int)$_POST['related_id'] : null;
    $description = $_POST['description'] ?? '';

    if ($userId <= 0 || empty($actionType)) {
        fail('Dữ liệu không hợp lệ', 400);
    }

    // Cấu hình điểm cho từng hành động
    $pointsConfig = [
        'POST_CREATED' => 10,          // Đăng bài viết
        'LIKED_OTHERS_POST' => 2,      // Thích bài của người khác
        'USER_FOLLOWED' => 3,          // Theo dõi người khác
        'COMMENTED_ON_POST' => 3,      // Bình luận trên bài viết
        'POST_LIKED' => 2,             // Bài viết được like (cho chủ bài)
        'RECEIVED_COMMENT' => 1,       // Nhận được bình luận (cho chủ bài)
        'POST_SHARED' => 5,            // Chia sẻ bài viết
        'DAILY_LOGIN' => 5,            // Đăng nhập hàng ngày
        'POST_VIEWED' => 1             // Bài viết được xem
    ];

    $pointsEarned = $pointsConfig[$actionType] ?? 1; // Mặc định 1 điểm

    // Bắt đầu transaction
    $conn->begin_transaction();

    // 1. Cập nhật điểm trong UserBadgeSystem
    $updateStmt = $conn->prepare("
        INSERT INTO UserBadgeSystem (UserID, Points, CurrentBadge, NextBadge, PointsToNextBadge, LastUpdated)
        VALUES (?, ?, 'newbie', 'enthusiast', 30, NOW())
        ON DUPLICATE KEY UPDATE 
            Points = Points + VALUES(Points),
            LastUpdated = NOW()
    ");
    $updateStmt->bind_param("ii", $userId, $pointsEarned);
    $updateStmt->execute();
    $updateStmt->close();

    // 2. Thêm vào lịch sử điểm
    $historyStmt = $conn->prepare("
        INSERT INTO PointHistory (UserID, PointsEarned, ActionType, RelatedID, Description)
        VALUES (?, ?, ?, ?, ?)
    ");
    $historyStmt->bind_param("iisis", $userId, $pointsEarned, $actionType, $relatedId, $description);
    $historyStmt->execute();
    $historyStmt->close();

    // 3. Kiểm tra và cập nhật biệt hiệu
    $badgeStmt = $conn->prepare("
        SELECT 
            ub.Points,
            ub.CurrentBadge,
            bc.RequiredPoints as CurrentRequired,
            (SELECT RequiredPoints FROM BadgeConfiguration 
             WHERE RequiredPoints > bc.RequiredPoints 
             ORDER BY RequiredPoints ASC LIMIT 1) as NextRequired
        FROM UserBadgeSystem ub
        LEFT JOIN BadgeConfiguration bc ON ub.CurrentBadge = bc.BadgeName
        WHERE ub.UserID = ?
    ");
    $badgeStmt->bind_param("i", $userId);
    $badgeStmt->execute();
    $badgeResult = $badgeStmt->get_result()->fetch_assoc();
    $badgeStmt->close();

    $currentPoints = $badgeResult['Points'] ?? 0;
    $currentBadge = $badgeResult['CurrentBadge'] ?? 'newbie';
    $currentRequired = $badgeResult['CurrentRequired'] ?? 0;
    $nextRequired = $badgeResult['NextRequired'] ?? 0;

    // Kiểm tra xem có đạt biệt hiệu mới không
    $checkStmt = $conn->prepare("
        SELECT BadgeName, BadgeTitle 
        FROM BadgeConfiguration 
        WHERE RequiredPoints <= ? 
        ORDER BY RequiredPoints DESC 
        LIMIT 1
    ");
    $checkStmt->bind_param("i", $currentPoints);
    $checkStmt->execute();
    $newBadge = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    $badgeUnlocked = null;

    // Nếu có biệt hiệu mới và khác biệt hiệu hiện tại
    if ($newBadge && $newBadge['BadgeName'] !== $currentBadge) {
        // Lấy biệt hiệu tiếp theo
        $nextBadgeStmt = $conn->prepare("
            SELECT BadgeName FROM BadgeConfiguration 
            WHERE RequiredPoints > ? 
            ORDER BY RequiredPoints ASC LIMIT 1
        ");
        $nextBadgeStmt->bind_param("i", $newBadge['RequiredPoints'] ?? 0);
        $nextBadgeStmt->execute();
        $nextBadge = $nextBadgeStmt->get_result()->fetch_assoc();
        $nextBadgeStmt->close();

        $nextBadgeName = $nextBadge['BadgeName'] ?? null;
        $pointsToNext = $nextRequired ? $nextRequired - $currentPoints : 0;

        // Cập nhật biệt hiệu mới
        $updateBadgeStmt = $conn->prepare("
            UPDATE UserBadgeSystem 
            SET CurrentBadge = ?,
                NextBadge = ?,
                PointsToNextBadge = ?
            WHERE UserID = ?
        ");
        $updateBadgeStmt->bind_param("ssii", 
            $newBadge['BadgeName'], 
            $nextBadgeName,
            $pointsToNext,
            $userId
        );
        $updateBadgeStmt->execute();
        $updateBadgeStmt->close();

        $badgeUnlocked = $newBadge['BadgeName'];

        // Tạo thông báo cho người dùng
        $notifStmt = $conn->prepare("
            INSERT INTO CommunityNotification (UserID, Type, Message, CreatedAt)
            VALUES (?, 'badge_unlocked', ?, NOW())
        ");
        $message = "Chúc mừng! Bạn đã đạt biệt hiệu {$newBadge['BadgeTitle']}";
        $notifStmt->bind_param("is", $userId, $message);
        $notifStmt->execute();
        $notifStmt->close();
    }

    // Commit transaction
    $conn->commit();

    // Lấy thông tin badge hiện tại để trả về
    $finalBadgeStmt = $conn->prepare("
        SELECT 
            ub.Points,
            ub.CurrentBadge,
            ub.NextBadge,
            ub.PointsToNextBadge,
            bc.BadgeTitle,
            bc.BadgeColor
        FROM UserBadgeSystem ub
        LEFT JOIN BadgeConfiguration bc ON ub.CurrentBadge = bc.BadgeName
        WHERE ub.UserID = ?
    ");
    $finalBadgeStmt->bind_param("i", $userId);
    $finalBadgeStmt->execute();
    $finalBadge = $finalBadgeStmt->get_result()->fetch_assoc();
    $finalBadgeStmt->close();

    echo json_encode([
        'success' => true,
        'points_earned' => $pointsEarned,
        'total_points' => $finalBadge['Points'],
        'badge_unlocked' => $badgeUnlocked,
        'badge_info' => [
            'points' => (int)$finalBadge['Points'],
            'currentBadge' => $finalBadge['CurrentBadge'],
            'badge_title' => $finalBadge['BadgeTitle'],
            'badge_color' => $finalBadge['BadgeColor'],
            'nextBadge' => $finalBadge['NextBadge'],
            'pointsToNextBadge' => (int)$finalBadge['PointsToNextBadge']
        ],
        'message' => 'Cập nhật điểm thành công'
    ]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("Error updating points: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
?>