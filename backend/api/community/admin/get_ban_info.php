<?php
// backend/api/community/admin/get_ban_info.php
error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(['success' => false, 'error' => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

// Hàm kiểm tra loại cấm
function shouldBlockAction($banType, $actionType) {
    $banMap = [
        'post_only' => ['post_only', 'full_ban'],
        'comment_only' => ['comment_only', 'full_ban'],
        'full_ban' => ['post_only', 'comment_only', 'full_ban']
    ];
    
    return isset($banMap[$banType]) && in_array($actionType, $banMap[$banType]);
}

// Hàm xác định tên hiển thị cho admin
function getAdminDisplayName($fullName, $username) {
    // Nếu fullname không có hoặc là tên mặc định, dùng username
    $defaultNames = ['Người dùng mới', 'New User', 'User', 'User New', ''];
    
    if (empty($fullName) || in_array($fullName, $defaultNames)) {
        return $username ?: 'Quản trị viên';
    }
    
    return $fullName;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => true,
            'has_ban' => false,
            'is_logged_in' => false
        ]);
        exit;
    }
    
    $userId = (int)$_SESSION['user_id'];
    $checkType = $_GET['check_type'] ?? 'post_only';
    
    // Kiểm tra user có đang bị cấm không
    $sql = "
        SELECT 
            ub.*,
            u1.Username as UserUsername,
            u1.FullName as UserFullName,
            u2.Username as AdminUsername,
            u2.FullName as AdminFullName
        FROM UserBan ub
        LEFT JOIN Users u1 ON ub.UserID = u1.UserID
        LEFT JOIN Users u2 ON ub.BannedBy = u2.UserID
        WHERE ub.UserID = ? 
        AND ub.IsActive = 1 
        AND ub.Scope = 'community'
        AND (ub.IsTemporary = 0 OR ub.ExpiresAt IS NULL OR ub.ExpiresAt > NOW())
        ORDER BY ub.CreatedAt DESC 
        LIMIT 1
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $ban = $result->fetch_assoc()) {
        // Xác định tên hiển thị cho admin
        $adminDisplayName = getAdminDisplayName(
            $ban['AdminFullName'] ?? null,
            $ban['AdminUsername'] ?? null
        );
        
        // Parse Message JSON
        $messageData = [];
        if (!empty($ban['Message'])) {
            try {
                $messageData = json_decode($ban['Message'], true);
            } catch (Exception $e) {
                $messageData = ['raw_message' => $ban['Message']];
            }
        }
        
        // Tính thời gian còn lại
        $expiresAt = $ban['ExpiresAt'] ?? date('Y-m-d H:i:s', strtotime($ban['CreatedAt'] . " + {$ban['BanDuration']} days"));
        $now = new DateTime();
        $expireDate = new DateTime($expiresAt);
        $interval = $now->diff($expireDate);
        $remainingDays = $interval->days;
        $remainingHours = $interval->h;
        
        // Map ban type
        $banTypes = [
            'post_only' => 'Đăng bài viết',
            'comment_only' => 'Bình luận',
            'full_ban' => 'Đăng bài và bình luận'
        ];
        
        // Tạo mô tả loại hạn chế
        $restrictionDescriptions = [
            'post_only' => 'đăng bài mới',
            'comment_only' => 'bình luận',
            'full_ban' => 'đăng bài và bình luận'
        ];
        
        // Tạo thông báo warning theo loại cấm
        $warningMessages = [
            'post_only' => 'Tài khoản của bạn đã bị hạn chế quyền đăng bài trong cộng đồng.',
            'comment_only' => 'Tài khoản của bạn đã bị hạn chế quyền bình luận trong cộng đồng.',
            'full_ban' => 'Tài khoản của bạn đã bị hạn chế quyền đăng bài và bình luận trong cộng đồng.'
        ];
        
        // Kiểm tra xem loại cấm có ảnh hưởng đến hành động không
        $shouldBlock = shouldBlockAction($ban['BanType'], $checkType);
        
        // Tạo response data
        $response = [
            'success' => true,
            'has_ban' => true,
            'should_block' => $shouldBlock,
            'ban_info' => [
                'ban_id' => $ban['BanID'],
                'reason' => $ban['Reason'],
                'ban_type' => $ban['BanType'],
                'ban_type_text' => $banTypes[$ban['BanType']] ?? $ban['BanType'],
                'restriction_text' => $restrictionDescriptions[$ban['BanType']] ?? 'đăng bài/bình luận',
                'warning_message' => $warningMessages[$ban['BanType']] ?? 'Tài khoản của bạn đã bị hạn chế quyền đăng bài/bình luận trong cộng đồng.',
                'duration' => $ban['BanDuration'],
                'created_at' => $ban['CreatedAt'],
                'expires_at' => $expiresAt,
                'remaining_days' => $remainingDays,
                'remaining_hours' => $remainingHours,
                'is_temporary' => (bool)$ban['IsTemporary'],
                'admin_id' => $ban['BannedBy'],
                'admin_name' => $adminDisplayName, // Đã sửa ở đây
                'admin_username' => $ban['AdminUsername'] ?? null,
                'user_name' => $ban['UserFullName'] ?? $ban['UserUsername'] ?? 'Người dùng',
                'message_data' => $messageData
            ],
            'display_info' => [
                'title' => '⛔ TÀI KHOẢN BỊ CẤM',
                'main_message' => "Bạn đã bị cấm " . ($banTypes[$ban['BanType']] ?? $ban['BanType']) . " trong {$ban['BanDuration']} ngày",
                'reason' => "Lý do: " . $ban['Reason'],
                'remaining_time' => "Thời hạn còn lại: {$remainingDays} ngày {$remainingHours} giờ",
                'admin_info' => "Người thực hiện: " . $adminDisplayName, // Đã sửa ở đây
                'ban_code' => "Mã cấm: #BAN-" . str_pad($ban['BanID'], 6, '0', STR_PAD_LEFT)
            ]
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => true,
            'has_ban' => false,
            'should_block' => false,
            'is_logged_in' => true
        ]);
    }
} catch (Exception $e) {
    error_log("Get ban info error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Lỗi hệ thống: ' . $e->getMessage(),
        'has_ban' => false,
        'should_block' => false
    ]);
}
?>