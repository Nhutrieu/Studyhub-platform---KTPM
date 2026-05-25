<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($msg, $code = 400){
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // =============================================
    // 1. KIỂM TRA ĐĂNG NHẬP VÀ DỮ LIỆU ĐẦU VÀO
    // =============================================
    if (!isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }

    $uid = (int)$_SESSION['userid'];
    $postId = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
    $parentId = isset($_POST['parent_id']) ? (int)$_POST['parent_id'] : 0;
    $content = trim($_POST['content'] ?? "");
    $mentioned_user_id = isset($_POST['mentioned_user_id']) ? (int)$_POST['mentioned_user_id'] : 0;
    $mentioned_username = trim($_POST['mentioned_username'] ?? "");

    // Kiểm tra dữ liệu bắt buộc
    if ($postId <= 0) {
        fail("Thiếu hoặc sai post_id");
    }
    
    if ($parentId <= 0) {
        fail("Thiếu hoặc sai parent_id");
    }
    
    // Kiểm tra có nội dung HOẶC ảnh không
    $hasContent = $content !== "";
    $hasImage = isset($_FILES['image']) && $_FILES['image']['error'] === 0;
    
    if (!$hasContent && !$hasImage) {
        fail("Vui lòng nhập nội dung hoặc chọn ảnh");
    }

    // =============================================
    // 2. XỬ LÝ UPLOAD ẢNH NẾU CÓ
    // =============================================
    $imageURL = '';
    $hasImageDB = 0;
    $imageWidth = 0;
    $imageHeight = 0;
    $originalName = '';
    
    if ($hasImage) {
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $fileType = $_FILES['image']['type'];
        
        if (!in_array($fileType, $allowedTypes)) {
            fail("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)");
        }
        
        // Kiểm tra kích thước file (tối đa 5MB)
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($_FILES['image']['size'] > $maxSize) {
            fail("Kích thước ảnh tối đa 5MB");
        }
        
        // Tạo tên file an toàn
        $originalName = $_FILES['image']['name'];
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $safeFileName = 'comment_' . $postId . '_' . time() . '_' . uniqid() . '.' . $extension;
        
        // Đường dẫn upload
        $uploadDir = '../../../../uploads/comments/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                fail("Không thể tạo thư mục upload");
            }
        }
        
        $uploadPath = $uploadDir . $safeFileName;
        
        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            $imageURL = '/uploads/comments/' . $safeFileName;
            $hasImageDB = 1;
            
            // Lấy kích thước ảnh
            $imageInfo = @getimagesize($uploadPath);
            if ($imageInfo) {
                $imageWidth = $imageInfo[0];
                $imageHeight = $imageInfo[1];
            }
        } else {
            fail("Không thể upload ảnh. Lỗi: " . $_FILES['image']['error']);
        }
    }

    // =============================================
    // 3. KIỂM TRA COMMENT CHA CÓ TỒN TẠI KHÔNG
    // =============================================
    $sql = "SELECT c.CommentID, c.UserID, u.Username, u.FullName 
            FROM CommunityComment c 
            JOIN Users u ON c.UserID = u.UserID 
            WHERE c.CommentID = ? AND c.Status = 'active'";
    $st = $conn->prepare($sql);
    if (!$st) {
        fail("Lỗi chuẩn bị truy vấn: " . $conn->error);
    }
    
    $st->bind_param("i", $parentId);
    if (!$st->execute()) {
        fail("Lỗi thực thi truy vấn: " . $st->error);
    }
    
    $parentResult = $st->get_result();
    
    if (!$parentResult || $parentResult->num_rows === 0) {
        fail("Comment cha không tồn tại hoặc đã bị xóa", 404);
    }
    
    $parent = $parentResult->fetch_assoc();
    $parentUserId = $parent['UserID'];
    $parentUsername = $parent['Username'];
    $parentFullName = $parent['FullName'];

    // =============================================
    // 4. XỬ LÝ NỘI DUNG VÀ MENTION - PHIÊN BẢN MỚI
    // =============================================
    $processedContent = $content;
    $taggedUsers = [];
    
    // Nếu có mentioned user, xử lý mention
    if ($mentioned_user_id > 0 && $mentioned_user_id != $uid) {
        // Lấy thông tin user được mention từ database
        $mentionUserSql = $conn->prepare("
            SELECT UserID, FullName, Username 
            FROM Users 
            WHERE UserID = ?
        ");
        
        if (!$mentionUserSql) {
            fail("Lỗi chuẩn bị truy vấn mention: " . $conn->error);
        }
        
        $mentionUserSql->bind_param("i", $mentioned_user_id);
        if (!$mentionUserSql->execute()) {
            fail("Lỗi thực thi truy vấn mention: " . $mentionUserSql->error);
        }
        
        $mentionResult = $mentionUserSql->get_result();
        
        if ($mentionResult && $mentionResult->num_rows > 0) {
            $mentionUser = $mentionResult->fetch_assoc();
            $mentionFullName = $mentionUser['FullName'] ?: $mentionUser['Username'];
            $mentionUsername = $mentionUser['Username'];
            
            // 🟢 THAY ĐỔI: Tạo HTML tag mention mới - chỉ có tên in đậm và có thể click
            $mentionHtml = '<span class="user-mention clickable-mention" 
                              data-user-id="' . $mentioned_user_id . '" 
                              data-username="' . $mentionUsername . '" 
                              onclick="if(window.openUserProfile)window.openUserProfile(\'' . $mentionUsername . '\')"
                              style="color: #1877f2; font-weight: 600; cursor: pointer; text-decoration: none;">
                            ' . htmlspecialchars($mentionFullName, ENT_QUOTES, 'UTF-8') . '
                          </span>';
            
            // 🟢 THAY ĐỔI: Kiểm tra xem content đã có mention tên này chưa
            $mentionNameRegex = '/' . preg_quote($mentionFullName, '/') . '/iu';
            
            if (!preg_match($mentionNameRegex, $processedContent)) {
                // Nếu có nội dung khác, thêm khoảng trắng sau mention
                $remainingContent = $processedContent;
                // Thêm mention vào đầu nội dung (không có @)
                if ($remainingContent) {
                    $processedContent = $mentionHtml . ' ' . $remainingContent;
                } else {
                    $processedContent = $mentionHtml;
                }
            }
            
            $taggedUsers[] = [
                'user_id' => $mentioned_user_id,
                'username' => $mentionUsername,
                'full_name' => $mentionFullName
            ];
        }
    }

    // =============================================
    // 5. KIỂM TRA CẤU TRÚC BẢNG TRƯỚC KHI INSERT
    // =============================================
    // Kiểm tra xem bảng có các cột ImageFileName, ImageWidth, ImageHeight không
    $checkColumns = $conn->query("SHOW COLUMNS FROM CommunityComment LIKE 'ImageFileName'");
    $hasImageFileName = $checkColumns && $checkColumns->num_rows > 0;
    
    $checkColumns = $conn->query("SHOW COLUMNS FROM CommunityComment LIKE 'ImageWidth'");
    $hasImageWidth = $checkColumns && $checkColumns->num_rows > 0;
    
    $checkColumns = $conn->query("SHOW COLUMNS FROM CommunityComment LIKE 'ImageHeight'");
    $hasImageHeight = $checkColumns && $checkColumns->num_rows > 0;
    
    // =============================================
    // 6. THÊM REPLY VÀO DATABASE (phiên bản linh hoạt)
    // =============================================
    if ($hasImageFileName && $hasImageWidth && $hasImageHeight) {
        // Nếu bảng có đầy đủ các cột
        $ins = $conn->prepare("
            INSERT INTO CommunityComment 
            (PostID, UserID, ParentCommentID, Content, ImageURL, HasImage, ImageFileName, ImageWidth, ImageHeight, Status, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        ");
        
        if (!$ins) {
            fail("Lỗi chuẩn bị câu lệnh INSERT: " . $conn->error);
        }
        
        $ins->bind_param("iiissisii", 
            $postId, 
            $uid, 
            $parentId, 
            $processedContent, 
            $imageURL, 
            $hasImageDB, 
            $originalName,
            $imageWidth,
            $imageHeight
        );
    } else if ($hasImageFileName) {
        // Nếu chỉ có ImageFileName
        $ins = $conn->prepare("
            INSERT INTO CommunityComment 
            (PostID, UserID, ParentCommentID, Content, ImageURL, HasImage, ImageFileName, Status, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        ");
        
        if (!$ins) {
            fail("Lỗi chuẩn bị câu lệnh INSERT: " . $conn->error);
        }
        
        $ins->bind_param("iiissis", 
            $postId, 
            $uid, 
            $parentId, 
            $processedContent, 
            $imageURL, 
            $hasImageDB, 
            $originalName
        );
    } else {
        // Phiên bản đơn giản nhất (chỉ có ImageURL và HasImage)
        $ins = $conn->prepare("
            INSERT INTO CommunityComment 
            (PostID, UserID, ParentCommentID, Content, ImageURL, HasImage, Status, CreatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
        ");
        
        if (!$ins) {
            fail("Lỗi chuẩn bị câu lệnh INSERT: " . $conn->error);
        }
        
        $ins->bind_param("iiissi", 
            $postId, 
            $uid, 
            $parentId, 
            $processedContent, 
            $imageURL, 
            $hasImageDB
        );
    }
    
    if (!$ins->execute()) {
        fail("Không thể thêm comment: " . $ins->error);
    }
    
    $newId = $ins->insert_id;

    // =============================================
    // 7. CẬP NHẬT SỐ LƯỢNG COMMENT TRONG POST
    // =============================================
    $updatePost = $conn->query("UPDATE CommunityPost SET CommentCount = CommentCount + 1 WHERE PostID = $postId");
    if (!$updatePost) {
        // Chỉ ghi log, không fail vì comment đã được thêm
        error_log("⚠️ Failed to update post comment count: " . $conn->error);
    }

    // =============================================
    // 8. GỬI THÔNG BÁO FACEBOOK STYLE
    // =============================================
    // 8.1. Thông báo cho người được tag/mention
    foreach ($taggedUsers as $tagged) {
        if ($tagged['user_id'] !== $uid) {
            // Kiểm tra xem đã có thông báo mention chưa
            $checkNotif = $conn->prepare("
                SELECT NotificationID FROM CommunityNotification 
                WHERE UserID = ? AND ActorID = ? AND PostID = ? AND CommentID = ? AND Type = 'comment_mention'
                LIMIT 1
            ");
            
            if ($checkNotif) {
                $checkNotif->bind_param("iiii", $tagged['user_id'], $uid, $postId, $newId);
                if ($checkNotif->execute()) {
                    $checkResult = $checkNotif->get_result();
                    if ($checkResult->num_rows === 0) {
                        // Thêm thông báo mention
                        $notifSql = $conn->prepare("
                            INSERT INTO CommunityNotification 
                            (UserID, ActorID, Type, PostID, CommentID, IsRead, CreatedAt) 
                            VALUES (?, ?, 'comment_mention', ?, ?, 0, NOW())
                        ");
                        
                        if ($notifSql) {
                            $notifSql->bind_param("iiii", $tagged['user_id'], $uid, $postId, $newId);
                            $notifSql->execute();
                        }
                    }
                }
            }
        }
    }
    
    // 8.2. Thông báo cho tác giả comment cha (reply)
    if ($parentUserId !== $uid) {
        $alreadyMentioned = false;
        foreach ($taggedUsers as $tagged) {
            if ($tagged['user_id'] == $parentUserId) {
                $alreadyMentioned = true;
                break;
            }
        }
        
        if (!$alreadyMentioned) {
            // Kiểm tra xem đã có thông báo reply chưa
            $checkReplyNotif = $conn->prepare("
                SELECT NotificationID FROM CommunityNotification 
                WHERE UserID = ? AND ActorID = ? AND PostID = ? AND CommentID = ? AND Type = 'comment_reply'
                LIMIT 1
            ");
            
            if ($checkReplyNotif) {
                $checkReplyNotif->bind_param("iiii", $parentUserId, $uid, $postId, $newId);
                if ($checkReplyNotif->execute()) {
                    $checkResult = $checkReplyNotif->get_result();
                    if ($checkResult->num_rows === 0) {
                        // Thêm thông báo reply
                        $replyNotif = $conn->prepare("
                            INSERT INTO CommunityNotification 
                            (UserID, ActorID, Type, PostID, CommentID, IsRead, CreatedAt) 
                            VALUES (?, ?, 'comment_reply', ?, ?, 0, NOW())
                        ");
                        
                        if ($replyNotif) {
                            $replyNotif->bind_param("iiii", $parentUserId, $uid, $postId, $newId);
                            $replyNotif->execute();
                        }
                    }
                }
            }
        }
    }

    // =============================================
    // 9. LẤY THÔNG TIN USER HIỆN TẠI
    // =============================================
    $usr = $conn->prepare("
        SELECT UserID, FullName, Username, AvatarURL, Role 
        FROM Users WHERE UserID = ?
    ");
    
    if (!$usr) {
        fail("Lỗi chuẩn bị truy vấn user: " . $conn->error);
    }
    
    $usr->bind_param("i", $uid);
    if (!$usr->execute()) {
        fail("Lỗi thực thi truy vấn user: " . $usr->error);
    }
    
    $userResult = $usr->get_result();
    
    if (!$userResult || $userResult->num_rows === 0) {
        fail("Không tìm thấy thông tin người dùng", 404);
    }
    
    $u = $userResult->fetch_assoc();

    // =============================================
    // 10. LẤY THÔNG TIN ĐẦY ĐỦ CỦA COMMENT MỚI
    // =============================================
    // Lấy thông tin comment mới tạo (phiên bản linh hoạt)
    $columnsToSelect = "CreatedAt, ImageURL, HasImage";
    
    if ($hasImageFileName) {
        $columnsToSelect .= ", ImageFileName";
    }
    
    if ($hasImageWidth) {
        $columnsToSelect .= ", ImageWidth";
    }
    
    if ($hasImageHeight) {
        $columnsToSelect .= ", ImageHeight";
    }
    
    $commentSql = $conn->prepare("
        SELECT $columnsToSelect
        FROM CommunityComment 
        WHERE CommentID = ?
    ");
    
    if (!$commentSql) {
        fail("Lỗi chuẩn bị truy vấn comment: " . $conn->error);
    }
    
    $commentSql->bind_param("i", $newId);
    if (!$commentSql->execute()) {
        fail("Lỗi thực thi truy vấn comment: " . $commentSql->error);
    }
    
    $commentResult = $commentSql->get_result();
    
    if (!$commentResult || $commentResult->num_rows === 0) {
        fail("Không tìm thấy comment vừa tạo", 500);
    }
    
    $commentRow = $commentResult->fetch_assoc();
    $createdAt = $commentRow['CreatedAt'] ?? date("Y-m-d H:i:s");

    // =============================================
    // 11. TRẢ KẾT QUẢ VỚI THÔNG TIN ĐẦY ĐỦ
    // =============================================
    $response = [
        "success" => true,
        "message" => "Đã gửi phản hồi thành công",
        "reply" => [  // 🟢 QUAN TRỌNG: SỬA TỪ "comment" THÀNH "reply" Ở ĐÂY
            "CommentID" => $newId,
            "PostID" => $postId,
            "ParentCommentID" => $parentId,
            "Content" => $processedContent,
            "CreatedAt" => $createdAt,
            "ImageURL" => $commentRow['ImageURL'] ?? '',
            "HasImage" => (int)($commentRow['HasImage'] ?? 0),
            "user" => [
                "UserID" => (int)$u['UserID'],
                "FullName" => $u['FullName'],
                "Username" => $u['Username'],
                "AvatarURL" => $u['AvatarURL'],
                "Role" => $u['Role']
            ],
            "reactions" => [
                "summary" => [],
                "total" => 0,
                "user" => null
            ],
            "ReplyCount" => 0,
            "mentioned_user" => !empty($taggedUsers) ? $taggedUsers[0] : null
        ]
    ];
    
    // Thêm các trường hình ảnh nếu có
    if ($hasImageFileName) {
        $response['reply']['ImageFileName'] = $commentRow['ImageFileName'] ?? '';  // 🟢 SỬA Ở ĐÂY
    }
    
    if ($hasImageWidth) {
        $response['reply']['ImageWidth'] = (int)($commentRow['ImageWidth'] ?? 0);  // 🟢 SỬA Ở ĐÂY
    }
    
    if ($hasImageHeight) {
        $response['reply']['ImageHeight'] = (int)($commentRow['ImageHeight'] ?? 0);  // 🟢 SỬA Ở ĐÂY
    }
    
    success($response);
    
} catch (Throwable $e) {
    // Ghi log lỗi
    error_log("❌ Reply error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    // Trả lỗi chi tiết hơn
    $errorMessage = "Lỗi hệ thống: " . $e->getMessage();
    
    // Trong môi trường production, chỉ trả lỗi chung
    if (strpos($_SERVER['HTTP_HOST'], 'localhost') === false) {
        $errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau.";
    }
    
    fail($errorMessage, 500);
}
?>