<?php
/**
 * backend/api/community/posts/report.php
 * FIXED VERSION - HANDLES DUPLICATE REPORTS
 */

// ========== STEP 1: BASIC SETUP ==========
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
session_start();

// Log để debug
error_log("=== REPORT API STARTED ===");
error_log("POST data: " . json_encode($_POST));
error_log("Session user: " . ($_SESSION['username'] ?? 'none'));

// ========== STEP 2: SIMPLE RESPONSE FUNCTION ==========
function jsonResponse($success, $message, $data = null, $code = null) {
    http_response_code($code ?: ($success ? 200 : 400));
    $response = ['success' => $success, 'message' => $message];
    if ($data) $response['data'] = $data;
    if (!$success) $response['error'] = $message;
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// ========== STEP 3: CHECK LOGIN ==========
if (!isset($_SESSION['username'])) {
    jsonResponse(false, 'Vui lòng đăng nhập', null, 401);
}

// ========== STEP 4: VALIDATE INPUT ==========
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method không hợp lệ', null, 405);
}

$postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
$reason = isset($_POST['reason']) ? trim($_POST['reason']) : '';
$reportType = isset($_POST['report_type']) ? trim($_POST['report_type']) : 'other';

if ($postId <= 0) {
    jsonResponse(false, 'ID bài viết không hợp lệ', null, 400);
}

if (empty($reason)) {
    jsonResponse(false, 'Vui lòng nhập lý do', null, 400);
}

// ========== STEP 5: DIRECT DATABASE CONNECTION ==========
try {
    // Thử kết nối trực tiếp
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "koi_care_system";
    
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        jsonResponse(false, 'Lỗi kết nối database: ' . $conn->connect_error, null, 500);
    }
    
    $conn->set_charset("utf8mb4");
    
    error_log("Database connected successfully");
    
    // ========== STEP 6: GET USER INFO ==========
    $currentUser = $_SESSION['username'];
    $userQuery = "SELECT UserID, Username, FullName, Role FROM Users WHERE Username = ? LIMIT 1";
    $stmt = $conn->prepare($userQuery);
    
    if (!$stmt) {
        jsonResponse(false, 'Lỗi prepare user query: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("s", $currentUser);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows === 0) {
        jsonResponse(false, 'User không tồn tại', null, 404);
    }
    
    $user = $userResult->fetch_assoc();
    $currentUserId = (int)$user['UserID'];
    $currentUsername = $user['Username'];
    
    // ========== STEP 7: CHECK POST EXISTS ==========
    $postQuery = "SELECT 
                    p.PostID, 
                    p.UserID as post_user_id,
                    u.Username as post_username,
                    u.FullName as post_fullname
                 FROM CommunityPost p
                 JOIN Users u ON p.UserID = u.UserID
                 WHERE p.PostID = ? 
                 AND (p.Status IS NULL OR p.Status IN ('active','public','approved'))";
    
    $stmt = $conn->prepare($postQuery);
    if (!$stmt) {
        jsonResponse(false, 'Lỗi prepare post query: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $postResult = $stmt->get_result();
    
    if ($postResult->num_rows === 0) {
        jsonResponse(false, 'Bài viết không tồn tại', null, 404);
    }
    
    $postData = $postResult->fetch_assoc();
    $postUserId = (int)$postData['post_user_id'];
    $postUsername = $postData['post_username'];
    $postFullname = $postData['post_fullname'];
    
    // Không cho report chính mình
    if ($postUserId === $currentUserId) {
        jsonResponse(false, 'Không thể báo cáo bài viết của chính mình', null, 400);
    }
    
    // ========== STEP 8: CHECK ALREADY REPORTED (WITH ALL STATUSES) ==========
    // Kiểm tra tất cả các báo cáo, không chỉ 'pending'
    $checkReportQuery = "SELECT ReportID, Status FROM CommunityPostReport 
                        WHERE PostID = ? AND ReporterID = ? 
                        LIMIT 1";
    
    $stmt = $conn->prepare($checkReportQuery);
    if (!$stmt) {
        jsonResponse(false, 'Lỗi prepare check report query: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("ii", $postId, $currentUserId);
    $stmt->execute();
    $checkResult = $stmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        $existingReport = $checkResult->fetch_assoc();
        $status = $existingReport['Status'] ?? 'unknown';
        
        // Trả về thông báo khác nhau tùy trạng thái
        switch ($status) {
            case 'pending':
                jsonResponse(false, 'Bạn đã báo cáo bài viết này. Vui lòng chờ quản trị viên xử lý.', [
                    'already_reported' => true,
                    'status' => 'pending'
                ], 409); // 409 Conflict
                break;
                
            case 'resolved':
            case 'dismissed':
                // Cho phép báo cáo lại nếu đã xử lý trước đó
                // Chúng ta sẽ tiếp tục chèn báo cáo mới
                error_log("User re-reporting post after $status status");
                break;
                
            default:
                jsonResponse(false, "Bạn đã báo cáo bài viết này (trạng thái: $status)", [
                    'already_reported' => true,
                    'status' => $status
                ], 409);
        }
    }
    
    // ========== STEP 9: INSERT REPORT (WITH DUPLICATE HANDLING) ==========
    // Sử dụng INSERT IGNORE để tránh lỗi duplicate
    $insertQuery = "INSERT IGNORE INTO CommunityPostReport 
                   (PostID, ReporterID, Reason, ReportType, Status, CreatedAt) 
                   VALUES (?, ?, ?, ?, 'pending', NOW())";
    
    error_log("Insert query: $insertQuery");
    error_log("Params: postId=$postId, userId=$currentUserId, reason=$reason, type=$reportType");
    
    $stmt = $conn->prepare($insertQuery);
    if (!$stmt) {
        jsonResponse(false, 'Lỗi prepare insert query: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("iiss", $postId, $currentUserId, $reason, $reportType);
    
    if (!$stmt->execute()) {
        // Kiểm tra nếu là lỗi duplicate
        if ($conn->errno == 1062) { // MySQL duplicate entry error code
            jsonResponse(false, 'Bạn đã báo cáo bài viết này rồi. Vui lòng chờ xử lý.', [
                'already_reported' => true,
                'error_code' => 1062
            ], 409);
        }
        jsonResponse(false, 'Lỗi execute insert: ' . $stmt->error, null, 500);
    }
    
    // Kiểm tra nếu có bản ghi được chèn
    if ($stmt->affected_rows === 0) {
        // Không có hàng nào được chèn (có thể do duplicate nhưng IGNORE đã bỏ qua)
        jsonResponse(false, 'Bạn đã báo cáo bài viết này rồi', [
            'already_reported' => true,
            'affected_rows' => 0
        ], 409);
    }
    
    $reportId = $conn->insert_id;
    error_log("Report inserted successfully, ID: $reportId");
    
    // Trong file report.php, sửa phần STEP 10 (SEND NOTIFICATION TO ADMIN):

// ========== STEP 10: SEND NOTIFICATION TO ADMIN ==========
    $adminQuery = "SELECT UserID, Username FROM Users WHERE Role = 'Admin' AND IsActive = 1";
    $adminResult = $conn->query($adminQuery);

    if ($adminResult && $adminResult->num_rows > 0) {
        $displayName = $postFullname ?: $postUsername;
        $reporterName = $user['FullName'] ?: $currentUsername;
        
        // Message cho thông báo
        $message = json_encode([
            'post_id' => $postId,
            'reporter_id' => $currentUserId,
            'reporter_name' => $reporterName,
            'post_owner_id' => $postUserId,
            'post_owner_name' => $displayName,
            'reason' => $reason,
            'report_type' => $reportType,
            'display_message' => "$reporterName đã báo cáo bài viết #$postId của $displayName"
        ], JSON_UNESCAPED_UNICODE);
        
        $notifQuery = "INSERT INTO CommunityNotification 
                    (UserID, ActorID, Type, PostID, Message, CreatedAt) 
                    VALUES (?, ?, 'post_reported', ?, ?, NOW())";
        
        $notifStmt = $conn->prepare($notifQuery);
        
        while ($admin = $adminResult->fetch_assoc()) {
            $adminId = (int)$admin['UserID'];
            $notifStmt->bind_param("iisi", $adminId, $currentUserId, $postId, $message);
            $notifStmt->execute();
            
            error_log("Notification sent to admin: " . $admin['Username']);
        }
        
        error_log("Total notifications sent: " . $adminResult->num_rows);
    }
    // ========== STEP 11: SEND NOTIFICATION TO ADMIN ==========
    $adminQuery = "SELECT UserID FROM Users WHERE Role = 'Admin' AND IsActive = 1";
    $adminResult = $conn->query($adminQuery);
    
    if ($adminResult && $adminResult->num_rows > 0) {
        $message = "Bài viết #$postId của $postFullname đã bị báo cáo bởi $currentUsername";
        $message .= "\nLý do: $reason";
        
        $notifQuery = "INSERT INTO CommunityNotification 
                      (UserID, ActorID, Type, PostID, Message, CreatedAt) 
                      VALUES (?, ?, 'post_reported', ?, ?, NOW())";
        
        $notifStmt = $conn->prepare($notifQuery);
        
        while ($admin = $adminResult->fetch_assoc()) {
            $adminId = (int)$admin['UserID'];
            $notifStmt->bind_param("iisi", $adminId, $currentUserId, $postId, $message);
            $notifStmt->execute();
        }
        
        error_log("Notifications sent to admins");
    }
    
    // ========== STEP 12: RESPONSE SUCCESS ==========
    $responseData = [
        'report_id' => $reportId,
        'post_id' => $postId,
        'status' => 'pending',
        'reported_at' => date('Y-m-d H:i:s'),
        'message' => 'Báo cáo đã được gửi thành công! Quản trị viên sẽ xem xét.'
    ];
    
    jsonResponse(true, '✅ Báo cáo đã được gửi thành công!', $responseData, 201);
    
} catch (Exception $e) {
    error_log("EXCEPTION: " . $e->getMessage());
    error_log("TRACE: " . $e->getTraceAsString());
    jsonResponse(false, 'Lỗi hệ thống: ' . $e->getMessage(), null, 500);
}