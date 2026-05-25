<?php
// backend/api/community/admin/reports/list.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../../../../includes/db.php';
require_once '../../../../../../../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập và quyền admin
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }
    
    $adminId = (int)$_SESSION['userid'];
    $adminRole = $_SESSION['role'] ?? '';
    
    if ($adminRole !== 'Admin') {
        fail("Bạn không có quyền thực hiện hành động này", 403);
    }
    
    // Lấy tham số
    $type = $_GET['type'] ?? 'all'; // 'all', 'pending', 'reviewed', 'dismissed'
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(10, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    // Xây dựng điều kiện WHERE
    $whereConditions = [];
    $params = [];
    $types = "";
    
    if ($type !== 'all') {
        $whereConditions[] = "r.Status = ?";
        $params[] = $type;
        $types .= "s";
    }
    
    $whereClause = $whereConditions ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    // Đếm tổng số báo cáo
    $countSql = "SELECT COUNT(*) as total FROM CommunityPostReport r $whereClause";
    $stmt = $conn->prepare($countSql);
    
    if ($params) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $countResult = $stmt->get_result();
    $total = $countResult->fetch_assoc()['total'] ?? 0;
    
    // Lấy danh sách báo cáo
    $reportsSql = "
        SELECT 
            r.*,
            p.Content as post_content,
            p.UserID as post_user_id,
            post_user.Username as post_username,
            post_user.FullName as post_fullname,
            reporter.Username as reporter_username,
            reviewer.Username as reviewer_username,
            (SELECT COUNT(*) FROM CommunityPostReport r2 WHERE r2.PostID = r.PostID) as total_reports
        FROM CommunityPostReport r
        INNER JOIN CommunityPost p ON r.PostID = p.PostID
        INNER JOIN Users post_user ON p.UserID = post_user.UserID
        INNER JOIN Users reporter ON r.ReporterID = reporter.UserID
        LEFT JOIN Users reviewer ON r.ReviewedBy = reviewer.UserID
        $whereClause
        ORDER BY r.CreatedAt DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($reportsSql);
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $reports = [];
    while ($row = $result->fetch_assoc()) {
        $reports[] = [
            'report_id' => $row['ReportID'],
            'post_id' => $row['PostID'],
            'post_content_preview' => substr($row['post_content'], 0, 200),
            'post_user' => [
                'user_id' => $row['post_user_id'],
                'username' => $row['post_username'],
                'fullname' => $row['post_fullname']
            ],
            'reporter' => [
                'user_id' => $row['ReporterID'],
                'username' => $row['reporter_username']
            ],
            'reason' => $row['Reason'],
            'report_type' => $row['ReportType'],
            'status' => $row['Status'],
            'admin_notes' => $row['AdminNotes'],
            'reviewer' => $row['reviewer_username'],
            'reviewed_at' => $row['ReviewedAt'],
            'created_at' => $row['CreatedAt'],
            'total_reports' => $row['total_reports']
        ];
    }
    
    success([
        'reports' => $reports,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ],
        'stats' => [
            'pending' => getReportCount('pending'),
            'reviewed' => getReportCount('reviewed'),
            'dismissed' => getReportCount('dismissed'),
            'total' => getReportCount('all')
        ]
    ]);
    
} catch (Exception $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}

// Hàm đếm số lượng báo cáo
function getReportCount($status) {
    global $conn;
    
    $sql = "SELECT COUNT(*) as count FROM CommunityPostReport";
    
    if ($status !== 'all') {
        $sql .= " WHERE Status = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $status);
    } else {
        $stmt = $conn->prepare($sql);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    return $row['count'] ?? 0;
}
?>