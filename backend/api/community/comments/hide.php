<?php
// backend/api/community/comments/hide.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION['userid'])) fail("Chưa đăng nhập", 401);
    $currentUser = (int)$_SESSION['userid'];

    $commentId = isset($_POST['comment_id']) ? (int)$_POST['comment_id'] : 0;
    if ($commentId <= 0) fail("Thiếu comment_id");

    // Kiểm tra comment có tồn tại không
    $checkSql = "SELECT CommentID FROM CommunityComment WHERE CommentID = ? AND Status = 'active'";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $commentId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        fail("Comment không tồn tại hoặc đã bị xóa", 404);
    }

    // Kiểm tra đã ẩn chưa
    $checkHideSql = "SELECT HiddenID FROM CommunityHiddenComment WHERE UserID = ? AND CommentID = ?";
    $checkHideStmt = $conn->prepare($checkHideSql);
    $checkHideStmt->bind_param("ii", $currentUser, $commentId);
    $checkHideStmt->execute();
    $checkHideResult = $checkHideStmt->get_result();
    
    if ($checkHideResult->num_rows > 0) {
        fail("Comment đã bị ẩn", 400);
    }

    // Thêm vào bảng ẩn comment
    $insertSql = "INSERT INTO CommunityHiddenComment (UserID, CommentID) VALUES (?, ?)";
    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->bind_param("ii", $currentUser, $commentId);
    
    if ($insertStmt->execute()) {
        // Cập nhật số lượng comment của post (tùy chọn)
        $updateCountSql = "
            UPDATE CommunityPost p
            JOIN (
                SELECT PostID, COUNT(*) as comment_count
                FROM CommunityComment c
                WHERE c.PostID = (
                    SELECT PostID FROM CommunityComment WHERE CommentID = ?
                )
                AND c.Status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM CommunityHiddenComment h 
                    WHERE h.CommentID = c.CommentID AND h.UserID = ?
                )
            ) AS counts ON p.PostID = counts.PostID
            SET p.CommentCount = counts.comment_count
            WHERE p.PostID = counts.PostID
        ";
        
        $updateStmt = $conn->prepare($updateCountSql);
        $postId = $commentId; // Cần lấy postId từ comment
        $updateStmt->bind_param("ii", $commentId, $currentUser);
        $updateStmt->execute();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Đã ẩn comment'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        fail("Lỗi khi ẩn comment", 500);
    }

} catch (Throwable $e) {
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>