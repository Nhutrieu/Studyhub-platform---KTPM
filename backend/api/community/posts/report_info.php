<?php
/**
 * backend/api/community/posts/report_info.php
 * Lấy thông tin báo cáo bài viết (Admin only)
 */

// ========== STEP 1: BASIC SETUP ==========
// Tắt tất cả output error trên web
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Đặt header JSON ngay đầu tiên - KHÔNG CÓ OUTPUT NÀO TRƯỚC ĐÓ
header('Content-Type: application/json; charset=utf-8');
ob_start(); // Bắt đầu output buffering

session_start();

// ========== STEP 2: RESPONSE FUNCTION ==========
function jsonResponse($success, $message, $data = null) {
    // Xóa tất cả output buffer trước khi gửi JSON
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    
    $response = [
        'success' => (bool)$success,
        'message' => (string)$message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if (!$success) {
        $response['error'] = (string)$message;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// ========== STEP 3: CHECK SESSION ==========
if (!isset($_SESSION['user_id'])) {
    jsonResponse(false, 'Chưa đăng nhập');
}

// ========== STEP 4: CHECK ADMIN PERMISSION ==========
$user_id = (int)$_SESSION['user_id'];

// Kiểm tra POST_ID
if (!isset($_GET['post_id']) || empty($_GET['post_id'])) {
    jsonResponse(false, 'Thiếu post_id');
}

$post_id = (int)$_GET['post_id'];

if ($post_id <= 0) {
    jsonResponse(false, 'ID bài viết không hợp lệ');
}

// ========== STEP 5: DATABASE CONNECTION ==========
try {
    // Sửa đường dẫn require_once cho đúng
    require_once __DIR__ . '/../../../../includes/db.php';
    
    // Kiểm tra kết nối database
    if (!isset($conn) || !$conn) {
        throw new Exception('Không thể kết nối database');
    }
    
    // ========== STEP 6: CHECK USER ROLE ==========
    $stmt = $conn->prepare("SELECT Role FROM Users WHERE UserID = ?");
    if (!$stmt) {
        throw new Exception('Lỗi prepare user query: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $user_id);
    if (!$stmt->execute()) {
        throw new Exception('Lỗi execute user query: ' . $stmt->error);
    }
    
    $userResult = $stmt->get_result();
    if ($userResult->num_rows === 0) {
        jsonResponse(false, 'Người dùng không tồn tại');
    }
    
    $user = $userResult->fetch_assoc();
    $stmt->close();
    
    // Chỉ admin mới được xem
    if ($user['Role'] !== 'Admin') {
        jsonResponse(false, 'Không có quyền admin');
    }
    
    // ========== STEP 7: GET REPORT COUNT ==========
    $stmt = $conn->prepare("
        SELECT COUNT(*) as report_count 
        FROM CommunityPostReport 
        WHERE PostID = ? AND Status = 'pending'
    ");
    
    if (!$stmt) {
        throw new Exception('Lỗi prepare count query: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $post_id);
    if (!$stmt->execute()) {
        throw new Exception('Lỗi execute count query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    $report_count = (int)($result['report_count'] ?? 0);
    
    // ========== STEP 8: GET DETAILED REPORTS (OPTIONAL) ==========
    $reports = [];
    $details = isset($_GET['details']) && $_GET['details'] == '1';
    
    if ($report_count > 0 && $details) {
        $stmt = $conn->prepare("
            SELECT 
                cpr.*,
                u.Username as reporter_username,
                u.FullName as reporter_fullname,
                u.Email as reporter_email
            FROM CommunityPostReport cpr
            LEFT JOIN Users u ON cpr.ReporterID = u.UserID
            WHERE cpr.PostID = ? AND cpr.Status = 'pending'
            ORDER BY cpr.CreatedAt DESC
            LIMIT 10
        ");
        
        if ($stmt) {
            $stmt->bind_param("i", $post_id);
            $stmt->execute();
            $reports_result = $stmt->get_result();
            
            while ($row = $reports_result->fetch_assoc()) {
                $reports[] = [
                    'report_id' => (int)$row['ReportID'],
                    'reason' => $row['Reason'],
                    'report_type' => $row['ReportType'],
                    'created_at' => $row['CreatedAt'],
                    'reporter' => [
                        'user_id' => (int)$row['ReporterID'],
                        'username' => $row['reporter_username'],
                        'fullname' => $row['reporter_fullname'],
                        'email' => $row['reporter_email']
                    ]
                ];
            }
            $stmt->close();
        }
    }
    
    // ========== STEP 9: GET POST REPORT COUNT ==========
    $post_report_count = 0;
    $stmt = $conn->prepare("
        SELECT ReportCount 
        FROM CommunityPost 
        WHERE PostID = ?
    ");
    
    if ($stmt) {
        $stmt->bind_param("i", $post_id);
        $stmt->execute();
        $post_result = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        $post_report_count = (int)($post_result['ReportCount'] ?? 0);
    }
    
    // ========== STEP 10: RESPONSE ==========
    $responseData = [
        'post_id' => $post_id,
        'report_count' => $report_count,
        'post_report_count' => $post_report_count,
        'reports' => $reports,
        'details_requested' => $details
    ];
    
    jsonResponse(true, 'Lấy thông tin báo cáo thành công', $responseData);
    
} catch (Exception $e) {
    // Ghi log lỗi
    error_log("REPORT_INFO API ERROR: " . $e->getMessage());
    
    // Trả về lỗi user-friendly
    $errorMessage = 'Lỗi hệ thống. Vui lòng thử lại sau.';
    if (strpos($e->getMessage(), 'database') !== false) {
        $errorMessage = 'Lỗi kết nối database';
    }
    
    jsonResponse(false, $errorMessage);
}
?>