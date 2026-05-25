<?php
// /HeThongChamSocCaKoi/backend/api/community/admin/get_appeal.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

error_log("=== GET APPEAL DETAIL WITH CONTENT ===");

function jsonResponse($success, $data = [], $error = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Kiểm tra session và quyền
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(false, [], 'Chưa đăng nhập');
    }
    
    $adminId = $_SESSION['user_id'];
    
    // Kiểm tra quyền admin
    $checkStmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
    $checkStmt->bind_param("i", $adminId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        jsonResponse(false, [], 'Người dùng không tồn tại');
    }
    
    $userData = $checkResult->fetch_assoc();
    if ($userData['Role'] !== 'Admin') {
        jsonResponse(false, [], 'Chỉ quản trị viên mới được xem');
    }
    
    // 2. Kiểm tra input
    if (!isset($_GET['ban_id']) || empty($_GET['ban_id'])) {
        jsonResponse(false, [], 'Thiếu ID lệnh cấm');
    }
    
    $banId = (int)$_GET['ban_id'];
    error_log("Getting appeal with content for ban ID: $banId");
    
    // 3. Lấy thông tin khiếu nại VÀ nội dung vi phạm - SỬA KHÔNG DÙNG u.CreatedAt
    $stmt = $conn->prepare("
        SELECT 
            ub.*,
            u.UserID,
            u.FullName as UserFullName,
            u.Username as UserUsername,
            u.Email as UserEmail,
            u.Role as UserRole,
            u.AvatarURL as UserAvatar,
            u.Phone as UserPhone,
            u.Address as UserAddress,
            a.FullName as AdminFullName,
            a.Username as AdminUsername,
            -- Thông tin bài viết (nếu có)
            p.PostID as ViolationPostID,
            p.Content as PostContent,
            p.CreatedAt as PostCreatedAt,
            p.Status as PostStatus,
            -- Thông tin comment (nếu có)
            c.CommentID as ViolationCommentID,
            c.Content as CommentContent,
            c.CreatedAt as CommentCreatedAt,
            c.Status as CommentStatus,
            cp.PostID as CommentPostID -- Để lấy link đến bài viết chứa comment
        FROM UserBan ub
        LEFT JOIN Users u ON ub.UserID = u.UserID
        LEFT JOIN Users a ON ub.BannedBy = a.UserID
        LEFT JOIN CommunityPost p ON ub.PostID = p.PostID
        LEFT JOIN CommunityComment c ON ub.CommentID = c.CommentID
        LEFT JOIN CommunityComment cp ON ub.CommentID = c.CommentID
        WHERE ub.BanID = ?
    ");
    
    if (!$stmt) {
        throw new Exception('Lỗi truy vấn: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $banId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        jsonResponse(false, [], 'Không tìm thấy khiếu nại');
    }
    
    $data = $result->fetch_assoc();
    
    // 4. Xử lý nội dung vi phạm
    $violationContent = '';
    $violationType = '';
    $violationLink = '';
    
    if (!empty($data['PostID'])) {
        // Vi phạm từ bài viết
        $violationType = 'Bài viết';
        $violationContent = $data['PostContent'] ?? 'Nội dung đã bị xóa';
        $violationLink = "/HeThongChamSocCaKoi/frontend/community/post.php?id=" . $data['PostID'];
        
    } elseif (!empty($data['CommentID'])) {
        // Vi phạm từ comment
        $violationType = 'Bình luận';
        $violationContent = $data['CommentContent'] ?? 'Nội dung đã bị xóa';
        
        // Tạo link đến bài viết chứa comment
        if (!empty($data['CommentPostID'])) {
            $violationLink = "/HeThongChamSocCaKoi/frontend/community/post.php?id=" . $data['CommentPostID'] . "#comment-" . $data['CommentID'];
        }
    } else {
        // Không có PostID hay CommentID - có thể cấm trực tiếp
        $violationType = 'Không xác định';
        $violationContent = 'Người dùng bị cấm trực tiếp (không qua bài viết/bình luận)';
    }
    
    // 5. Format dữ liệu trả về - SỬA: KHÔNG dùng UserCreatedAt
    $responseData = [
        'appeal' => [
            'BanID' => (int)$data['BanID'],
            'UserID' => (int)$data['UserID'],
            'Reason' => $data['Reason'] ?? 'Không có lý do',
            'BanType' => $data['BanType'] ?? 'comment_only',
            'BanDuration' => (int)($data['BanDuration'] ?? 0),
            'AppealReason' => $data['AppealReason'] ?? 'Không có',
            'AppealStatus' => $data['AppealStatus'] ?? 'pending',
            'AppealResponse' => $data['AppealResponse'] ?? '',
            'AppealSubmittedAt' => $data['AppealSubmittedAt'] ?? $data['CreatedAt'],
            'BannedAt' => $data['BannedAt'] ?? $data['CreatedAt'],
            'ExpiresAt' => $data['ExpiresAt'] ?? null,
            'IsActive' => (int)($data['IsActive'] ?? 0),
            'Scope' => $data['Scope'] ?? 'community',
            
            // Thông tin vi phạm
            'ViolationPostID' => $data['PostID'] ?? null,
            'ViolationCommentID' => $data['CommentID'] ?? null,
            'ViolationType' => $violationType,
            'ViolationContent' => $violationContent,
            'ViolationLink' => $violationLink,
            'PostStatus' => $data['PostStatus'] ?? null,
            'CommentStatus' => $data['CommentStatus'] ?? null,
            'PostCreatedAt' => $data['PostCreatedAt'] ?? null,
            'CommentCreatedAt' => $data['CommentCreatedAt'] ?? null
        ],
        'user' => [
            'UserID' => (int)$data['UserID'],
            'FullName' => $data['UserFullName'] ?? $data['UserUsername'] ?? 'Người dùng',
            'Username' => $data['UserUsername'] ?? 'user_' . $data['UserID'],
            'Email' => $data['UserEmail'] ?? '',
            'Phone' => $data['UserPhone'] ?? '',
            'Address' => $data['UserAddress'] ?? '',
            'Role' => $data['UserRole'] ?? 'User',
            // KHÔNG có CreatedAt trong bảng Users, dùng thời gian từ UserBan
            'CreatedAt' => $data['CreatedAt'] ?? null, // Dùng từ UserBan
            'AvatarURL' => !empty($data['UserAvatar']) ? 
                '/HeThongChamSocCaKoi/uploads/avatars/' . $data['UserAvatar'] : 
                'https://ui-avatars.com/api/?name=' . urlencode(substr($data['UserUsername'] ?? 'U', 0, 1)) . '&background=667eea&color=fff&size=100'
        ],
        'admin' => !empty($data['AdminFullName']) ? [
            'UserID' => (int)$data['BannedBy'],
            'FullName' => $data['AdminFullName'],
            'Username' => $data['AdminUsername']
        ] : null
    ];
    
    // 6. Thêm thông tin reviewer nếu có
    if (!empty($data['AppealReviewedBy'])) {
        $reviewerStmt = $conn->prepare("
            SELECT UserID, FullName, Username 
            FROM Users 
            WHERE UserID = ?
        ");
        $reviewerStmt->bind_param("i", $data['AppealReviewedBy']);
        $reviewerStmt->execute();
        $reviewerResult = $reviewerStmt->get_result();
        
        if ($reviewerResult->num_rows > 0) {
            $reviewer = $reviewerResult->fetch_assoc();
            $responseData['reviewer'] = [
                'UserID' => (int)$reviewer['UserID'],
                'FullName' => $reviewer['FullName'],
                'Username' => $reviewer['Username']
            ];
        }
    }
    
    jsonResponse(true, $responseData);
    
} catch (Exception $e) {
    error_log("Get appeal error: " . $e->getMessage());
    jsonResponse(false, [], 'Lỗi hệ thống: ' . $e->getMessage());
}