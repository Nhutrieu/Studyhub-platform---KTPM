<?php
// toggle.php - API để thêm hoặc bỏ theo dõi
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Define DEBUG_MODE constant
define('DEBUG_MODE', true); // Set to false in production

require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false, 
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = []) {
    echo json_encode(array_merge([
        'success' => true
    ], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 🟢 KIỂM TRA ĐĂNG NHẬP
    if (empty($_SESSION['username'])) {
        fail('Chưa đăng nhập. Vui lòng đăng nhập để theo dõi người dùng.', 401);
    }

    $currentUsername = $_SESSION['username'];
    
    // 🟢 KIỂM TRA PHƯƠNG THỨC HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('Phương thức không hợp lệ. Vui lòng sử dụng POST.', 405);
    }
    
    // 🟢 KIỂM TRA DỮ LIỆU ĐẦU VÀO
    if (!isset($_POST['target_id']) || empty($_POST['target_id'])) {
        fail('Thiếu thông tin người dùng cần theo dõi (target_id).', 400);
    }

    // 🟢 LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
    if (!$stmt) {
        fail('Lỗi hệ thống khi truy vấn thông tin người dùng: ' . $conn->error, 500);
    }
    
    $stmt->bind_param("s", $currentUsername);
    $stmt->execute();
    $userResult = $stmt->get_result();
    
    if ($userResult->num_rows === 0) {
        $stmt->close();
        fail('Không tìm thấy tài khoản của bạn trong hệ thống.', 404);
    }
    
    $user = $userResult->fetch_assoc();
    $stmt->close();
    
    $currentUserId = (int)$user['UserID'];
    $targetUserId = (int)$_POST['target_id'];

    // 🟢 KIỂM TRA TÍNH HỢP LỆ CỦA target_id
    if ($targetUserId <= 0) {
        fail('ID người dùng không hợp lệ.', 400);
    }
    
    // 🟢 KHÔNG CHO PHÉP THEO DÕI CHÍNH MÌNH
    if ($targetUserId === $currentUserId) {
        fail('Bạn không thể theo dõi chính mình.', 400);
    }

    // 🟢 KIỂM TRA NGƯỜI DÙNG MỤC TIÊU CÓ TỒN TẠI KHÔNG
    $stmt = $conn->prepare("SELECT UserID, Username, FullName FROM Users WHERE UserID = ? LIMIT 1");
    if (!$stmt) {
        fail('Lỗi hệ thống khi kiểm tra người dùng mục tiêu: ' . $conn->error, 500);
    }
    
    $stmt->bind_param("i", $targetUserId);
    $stmt->execute();
    $targetResult = $stmt->get_result();
    
    if ($targetResult->num_rows === 0) {
        $stmt->close();
        fail('Người dùng không tồn tại hoặc đã bị xóa.', 404);
    }
    
    $targetUser = $targetResult->fetch_assoc();
    $stmt->close();

    // 🟢 BẮT ĐẦU TRANSACTION
    $conn->begin_transaction();
    
    try {
        // 🟢 KIỂM TRA TRẠNG THÁI THEO DÕI HIỆN TẠI
        $checkStmt = $conn->prepare("SELECT 1 FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ? LIMIT 1");
        if (!$checkStmt) {
            throw new Exception('Lỗi hệ thống khi kiểm tra trạng thái theo dõi: ' . $conn->error);
        }
        
        $checkStmt->bind_param("ii", $currentUserId, $targetUserId);
        $checkStmt->execute();
        $exists = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();

        $isFollowingNow = false;
        $action = '';
        $followId = null;

        if ($exists) {
            // 🟢 ĐANG FOLLOW -> BỎ FOLLOW
            $action = 'unfollow';
            
            $deleteStmt = $conn->prepare("DELETE FROM CommunityFollow WHERE FollowerID = ? AND FollowingID = ?");
            if (!$deleteStmt) {
                throw new Exception('Lỗi hệ thống khi chuẩn bị xóa theo dõi: ' . $conn->error);
            }
            
            $deleteStmt->bind_param("ii", $currentUserId, $targetUserId);
            if (!$deleteStmt->execute()) {
                throw new Exception('Không thể xóa theo dõi: ' . $deleteStmt->error);
            }
            
            $deleteStmt->close();
            $isFollowingNow = false;
            
            if (DEBUG_MODE) {
                error_log("[FOLLOW DEBUG] User {$currentUserId} unfollowed user {$targetUserId}");
            }
            
        } else {
            // 🟢 CHƯA FOLLOW -> THÊM FOLLOW MỚI
            $action = 'follow';
            
            // 🟢 KIỂM TRA CẤU TRÚC BẢNG ĐỂ XÁC ĐỊNH CÂU LỆNH INSERT PHÙ HỢP
            $tableCheck = $conn->query("SHOW COLUMNS FROM CommunityFollow LIKE 'CreatedAt'");
            $hasCreatedAt = ($tableCheck && $tableCheck->num_rows > 0);
            
            if ($hasCreatedAt) {
                $insertStmt = $conn->prepare("INSERT INTO CommunityFollow (FollowerID, FollowingID, CreatedAt) VALUES (?, ?, NOW())");
            } else {
                $insertStmt = $conn->prepare("INSERT INTO CommunityFollow (FollowerID, FollowingID) VALUES (?, ?)");
            }
            
            if (!$insertStmt) {
                throw new Exception('Lỗi hệ thống khi chuẩn bị thêm theo dõi: ' . $conn->error);
            }
            
            $insertStmt->bind_param("ii", $currentUserId, $targetUserId);
            if (!$insertStmt->execute()) {
                throw new Exception('Không thể thêm theo dõi: ' . $insertStmt->error);
            }
            
            $followId = $conn->insert_id;
            $insertStmt->close();
            $isFollowingNow = true;
            
            if (DEBUG_MODE) {
                error_log("[FOLLOW DEBUG] User {$currentUserId} followed user {$targetUserId}, FollowID: {$followId}");
            }
            
            // 🟢 TẠO THÔNG BÁO CHO NGƯỜI ĐƯỢC THEO DÕI
            if ($followId > 0) {
                // Lấy thông tin người theo dõi (current user)
                $followerStmt = $conn->prepare("SELECT Username, FullName FROM Users WHERE UserID = ?");
                $followerStmt->bind_param("i", $currentUserId);
                $followerStmt->execute();
                $followerResult = $followerStmt->get_result();
                $follower = $followerResult->fetch_assoc();
                $followerStmt->close();
                
                // Tạo message thông báo
                if ($follower) {
                    $displayName = !empty($follower['FullName']) ? $follower['FullName'] : $follower['Username'];
                    $message = $displayName . " đã theo dõi bạn";
                } else {
                    $message = "Một người dùng đã theo dõi bạn";
                }
                
                // Kiểm tra bảng Notifications có tồn tại không
                $checkNotificationsTable = $conn->query("SHOW TABLES LIKE 'Notifications'");
                if ($checkNotificationsTable !== false && $checkNotificationsTable->num_rows > 0) {
                    // Kiểm tra cấu trúc bảng Notifications
                    $checkNotifColumns = $conn->query("SHOW COLUMNS FROM Notifications");
                    $hasMessageColumn = false;
                    while ($col = $checkNotifColumns->fetch_assoc()) {
                        if ($col['Field'] === 'Message') {
                            $hasMessageColumn = true;
                            break;
                        }
                    }
                    
                    if ($hasMessageColumn) {
                        // Bảng có cột Message
                        $notifStmt = $conn->prepare("
                            INSERT INTO Notifications (UserID, Type, RelatedID, Message, IsRead, CreatedAt) 
                            VALUES (?, 'follow', ?, ?, 0, NOW())
                        ");
                        
                        if ($notifStmt) {
                            $notifStmt->bind_param("iis", $targetUserId, $followId, $message);
                            $notifStmt->execute();
                            $notifStmt->close();
                            
                            if (DEBUG_MODE) {
                                error_log("[FOLLOW DEBUG] Created notification for user {$targetUserId}");
                            }
                        }
                    } else {
                        // Bảng không có cột Message
                        $notifStmt = $conn->prepare("
                            INSERT INTO Notifications (UserID, Type, RelatedID, IsRead, CreatedAt) 
                            VALUES (?, 'follow', ?, 0, NOW())
                        ");
                        
                        if ($notifStmt) {
                            $notifStmt->bind_param("ii", $targetUserId, $followId);
                            $notifStmt->execute();
                            $notifStmt->close();
                            
                            if (DEBUG_MODE) {
                                error_log("[FOLLOW DEBUG] Created notification without message for user {$targetUserId}");
                            }
                        }
                    }
                }
            }
        }

        // 🟢 COMMIT TRANSACTION
        $conn->commit();
        
        // 🟢 TRẢ VỀ KẾT QUẢ THÀNH CÔNG
        success([
            'isFollowing' => $isFollowingNow,
            'targetId' => $targetUserId,
            'targetUsername' => $targetUser['Username'],
            'action' => $action,
            'message' => $isFollowingNow ? 
                'Đã theo dõi ' . (!empty($targetUser['FullName']) ? $targetUser['FullName'] : $targetUser['Username']) . ' thành công' : 
                'Đã bỏ theo dõi ' . (!empty($targetUser['FullName']) ? $targetUser['FullName'] : $targetUser['Username']),
            'debug' => DEBUG_MODE ? [
                'currentUserId' => $currentUserId,
                'targetUserId' => $targetUserId,
                'targetUsername' => $targetUser['Username'],
                'followId' => $followId,
                'timestamp' => date('Y-m-d H:i:s')
            ] : null
        ]);

    } catch (Exception $e) {
        // 🟢 ROLLBACK TRANSACTION NẾU CÓ LỖI
        $conn->rollback();
        throw $e;
    }

} catch (Throwable $e) {
    // 🟢 XỬ LÝ LỖI TỔNG QUÁT
    if (DEBUG_MODE) {
        error_log("[FOLLOW ERROR] " . date('Y-m-d H:i:s') . " - " . $e->getMessage());
        error_log("[FOLLOW ERROR] File: " . $e->getFile() . " Line: " . $e->getLine());
        error_log("[FOLLOW ERROR] Trace: " . $e->getTraceAsString());
    }
    
    // 🟢 TRẢ VỀ LỖI
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => DEBUG_MODE ? 
            'Lỗi hệ thống: ' . $e->getMessage() : 
            'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
        'code' => 'INTERNAL_SERVER_ERROR',
        'debug' => DEBUG_MODE ? [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'timestamp' => date('Y-m-d H:i:s')
        ] : null
    ], JSON_UNESCAPED_UNICODE);
}

// 🟢 ĐÓNG KẾT NỐI DATABASE
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
?>