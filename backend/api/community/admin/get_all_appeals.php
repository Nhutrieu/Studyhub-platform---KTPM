<?php
// BACKEND/API/COMMUNITY/ADMIN/GET_ALL_APPEALS.PHP
error_reporting(E_ALL);
ini_set('display_errors', 1); // Bật hiển thị lỗi

// Bắt đầu output buffering để capture lỗi
ob_start();

// Đặt header JSON
header('Content-Type: application/json; charset=utf-8');

// Khởi động session
session_start();

// Log file được gọi
error_log("=== GET_ALL_APPEALS API CALLED ===");
error_log("Request URI: " . $_SERVER['REQUEST_URI']);
error_log("Session ID: " . session_id());

// Hàm trả về JSON
function jsonResponse($success, $data = [], $error = '') {
    // Clear any previous output
    if (ob_get_length()) {
        ob_clean();
    }
    
    $response = [
        'success' => $success,
        'data' => $data,
        'error' => $error
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // ================ 1. CHECK SESSION & AUTH ================
    if (!isset($_SESSION['user_id'])) {
        error_log("No user_id in session");
        jsonResponse(false, [], 'Chưa đăng nhập');
    }
    
    $userId = $_SESSION['user_id'];
    error_log("User ID from session: " . $userId);
    
    // ================ 2. INCLUDE DATABASE ================
    // Cố gắng tìm đúng đường dẫn
    $possible_paths = [
        __DIR__ . '/../../../../../includes/db.php',          // Từ backend/api/community/admin
        __DIR__ . '/../../../../includes/db.php',             // Từ backend/api/community
        dirname(__DIR__, 4) . '/includes/db.php',             // 4 levels up
        $_SERVER['DOCUMENT_ROOT'] . '/HeThongChamSocCaKoi/includes/db.php',
        'C:/xampp/htdocs/HeThongChamSocCaKoi/includes/db.php'
    ];
    
    $db_loaded = false;
    foreach ($possible_paths as $path) {
        error_log("Trying to include: $path");
        if (file_exists($path)) {
            require_once $path;
            $db_loaded = true;
            error_log("✓ Successfully included db.php from: " . $path);
            break;
        }
    }
    
    if (!$db_loaded) {
        throw new Exception("Không thể tìm thấy file db.php");
    }
    
    // Kiểm tra kết nối database
    if (!$conn) {
        throw new Exception("Không thể kết nối database");
    }
    
    error_log("✓ Database connected successfully");
    
    // ================ 3. CHECK ADMIN PERMISSION ================
    // Kiểm tra role từ session trước
    $isAdmin = false;
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'Admin') {
        $isAdmin = true;
        error_log("✓ Admin role from session");
    } else {
        // Kiểm tra từ database
        $stmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            if ($user['Role'] === 'Admin') {
                $isAdmin = true;
                $_SESSION['role'] = 'Admin'; // Cập nhật session
                error_log("✓ Admin role from database");
            }
        }
    }
    
    if (!$isAdmin) {
        jsonResponse(false, [], 'Chỉ quản trị viên mới được xem khiếu nại');
    }
    
    // ================ 4. GET FILTER PARAMETER ================
    $filter = $_GET['filter'] ?? 'all';
    error_log("Filter parameter: " . $filter);
    
    // ================ 5. BUILD QUERY ================
    $base_query = "
        SELECT 
            ub.BanID,
            ub.UserID,
            ub.Reason,
            ub.BanType,
            ub.BanDuration,
            ub.AppealReason,
            ub.AppealStatus,
            ub.AppealSubmittedAt,
            ub.CreatedAt,
            ub.BannedAt,
            ub.ExpiresAt,
            ub.IsActive,
            u.Username as UserUsername,
            u.FullName as UserFullName,
            u.Email as UserEmail,
            u.AvatarURL as UserAvatar,
            a.Username as AdminUsername,
            a.FullName as AdminFullName
        FROM UserBan ub
        LEFT JOIN Users u ON ub.UserID = u.UserID
        LEFT JOIN Users a ON ub.BannedBy = a.UserID
        WHERE ub.HasAppeal = 1 
          AND ub.AppealReason IS NOT NULL 
          AND ub.AppealReason != ''
    ";
    
    // Thêm điều kiện filter
    $where_conditions = [];
    $params = [];
    $types = "";
    
    switch ($filter) {
        case 'pending':
            $where_conditions[] = "ub.AppealStatus = 'pending'";
            break;
        case 'approved':
            $where_conditions[] = "ub.AppealStatus = 'approved'";
            break;
        case 'rejected':
            $where_conditions[] = "ub.AppealStatus = 'rejected'";
            break;
        case 'active':
            $where_conditions[] = "ub.IsActive = 1";
            break;
        // 'all' không thêm điều kiện
    }
    
    // Kết hợp điều kiện
    if (!empty($where_conditions)) {
        $base_query .= " AND " . implode(" AND ", $where_conditions);
    }
    
    $base_query .= " ORDER BY ub.AppealSubmittedAt DESC, ub.CreatedAt DESC";
    
    error_log("Final SQL Query: " . $base_query);
    
    // ================ 6. EXECUTE QUERY ================
    $stmt = $conn->prepare($base_query);
    if (!$stmt) {
        throw new Exception("Lỗi chuẩn bị truy vấn: " . $conn->error);
    }
    
    // Bind parameters nếu có
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Lỗi thực thi truy vấn: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $appeals = [];
    
    error_log("Query executed, found " . $result->num_rows . " rows");
    
    // ================ 7. PROCESS RESULTS ================
    while ($row = $result->fetch_assoc()) {
        // Tính thời gian còn lại
        $remainingTime = '';
        $remainingDays = 0;
        
        if ($row['ExpiresAt'] && $row['IsActive'] == 1) {
            try {
                $now = new DateTime();
                $expireDate = new DateTime($row['ExpiresAt']);
                $interval = $now->diff($expireDate);
                
                if ($interval->invert == 0) { // Chưa hết hạn
                    $remainingDays = $interval->days;
                    $remainingHours = $interval->h;
                    $remainingTime = "Còn {$remainingDays} ngày {$remainingHours} giờ";
                } else {
                    $remainingTime = "Đã hết hạn";
                }
            } catch (Exception $e) {
                $remainingTime = "Lỗi tính thời gian";
            }
        }
        
        // Xác định loại cấm
        $banTypeText = 'Không xác định';
        if ($row['BanType'] === 'comment_only') {
            $banTypeText = 'Chỉ bình luận';
        } elseif ($row['BanType'] === 'post_only') {
            $banTypeText = 'Chỉ đăng bài';
        } elseif ($row['BanType'] === 'full_ban') {
            $banTypeText = 'Toàn bộ cộng đồng';
        }
        
        $appeals[] = [
            'BanID' => (int)$row['BanID'],
            'UserID' => (int)$row['UserID'],
            'UserFullName' => $displayName, 
            'UserUsername' => $row['UserUsername'] ?? 'N/A',
            'UserEmail' => $row['UserEmail'] ?? '',
            'UserAvatar' => $row['UserAvatar'] ?: 'default-avatar.png',
            'Reason' => $row['Reason'] ?? 'Không có lý do',
            'BanType' => $row['BanType'] ?? 'comment_only',
            'BanTypeText' => $banTypeText,
            'BanDuration' => (int)$row['BanDuration'],
            'AppealReason' => $row['AppealReason'] ?? 'Không có',
            'AppealStatus' => $row['AppealStatus'] ?? 'pending',
            'AppealSubmittedAt' => $row['AppealSubmittedAt'],
            'BannedAt' => $row['BannedAt'],
            'ExpiresAt' => $row['ExpiresAt'],
            'RemainingTime' => $remainingTime,
            'RemainingDays' => $remainingDays,
            'IsActive' => (int)$row['IsActive'],
            'AdminName' => $row['AdminFullName'] ?? $row['AdminUsername'] ?? 'Quản trị viên'
        ];
    }
    
    error_log("Processed " . count($appeals) . " appeals");
    
    // ================ 8. RETURN RESPONSE ================
    jsonResponse(true, $appeals);
    
} catch (Exception $e) {
    // Log lỗi chi tiết
    error_log("=== EXCEPTION ===");
    error_log("Message: " . $e->getMessage());
    error_log("File: " . $e->getFile());    
    error_log("Line: " . $e->getLine());
    error_log("Trace: " . $e->getTraceAsString());
    
    // Clear output buffer
    if (ob_get_length()) {
        ob_clean();
    }
    
    // Trả về lỗi dạng JSON
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'success' => false,
        'error' => 'Lỗi hệ thống: ' . $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Clean output buffer
if (ob_get_length()) {
    ob_end_clean();
}
?>