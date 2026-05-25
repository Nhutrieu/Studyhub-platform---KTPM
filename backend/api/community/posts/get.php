<?php
error_reporting(E_ALL);
ini_set('display_errors', 1); // Bật lỗi để debug
ini_set('display_startup_errors', 1);
header("Content-Type: application/json; charset=utf-8");

session_start();
require_once "../../../../includes/db.php";

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(["success" => false, "error" => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_GET['id'])) fail("Thiếu ID bài viết", 400);

    $postId = intval($_GET["id"]);
    if ($postId <= 0) fail("ID không hợp lệ", 400);

    // Lấy bài viết với TẤT CẢ các cột mới
    $st = $conn->prepare("
        SELECT 
            cp.*,
            u.UserID,
            u.Username,
            u.FullName,
            u.AvatarURL,
            u.Role,
            -- 🟢 THÊM CÁC CỘT ORIGINAL_* MỚI
            cp.original_content,
            cp.original_created_at,
            cp.original_user_id,
            cp.original_username, 
            cp.original_fullname,
            cp.original_avatar,
            cp.original_role
        FROM CommunityPost cp
        LEFT JOIN Users u ON cp.UserID = u.UserID
        WHERE cp.PostID = ? 
        AND (cp.Status IS NULL OR cp.Status IN ('active', 'public', 'approved'))
        LIMIT 1
    ");
    
    if (!$st) {
        fail("Lỗi chuẩn bị truy vấn: " . $conn->error, 500);
    }
    
    $st->bind_param("i", $postId);
    $st->execute();
    $result = $st->get_result();
    $post = $result->fetch_assoc();

    if (!$post) {
        fail("Không tìm thấy bài viết", 404);
    }

    // 🟢 XÁC ĐỊNH XEM BÀI GỐC ĐÃ BỊ XÓA CHƯA
    $isOriginalDeleted = $post["is_original_deleted"] == 1 || $post["is_original_deleted"] == true;
    $isSharedPost = !empty($post["OriginalPostID"]);
    $originalPostInfo = null;
    
    if ($isSharedPost) {
        $originalPostId = (int)$post["OriginalPostID"];
        
        if ($isOriginalDeleted) {
            // 🟢 BÀI GỐC ĐÃ BỊ XÓA - SỬ DỤNG THÔNG TIN ĐÃ LƯU
            $originalPostInfo = [
                "exists" => false,
                "deleted" => true,
                "post_id" => $originalPostId,
                "is_original_deleted" => 1,
                "content" => $post["original_content"] ?? "Bài viết gốc đã bị xóa",
                "created_at" => $post["original_created_at"] ?? null,
                "original_info" => [
                    "user_id" => $post["original_user_id"] ?? null,
                    "username" => $post["original_username"] ?? "Người dùng",
                    "fullname" => $post["original_fullname"] ?? "Người dùng",
                    "avatar" => $post["original_avatar"] ?? null,
                    "role" => $post["original_role"] ?? null
                ],
                "warning" => "Bài viết gốc đã bị xóa"
            ];
        } else {
            // 🟢 BÀI GỐC CHƯA BỊ XÓA - LẤY THÔNG TIN TRỰC TIẾP
            $checkStmt = $conn->prepare("
                SELECT 
                    cp.PostID, 
                    cp.Content, 
                    cp.UserID,
                    cp.CreatedAt,
                    u.Username,
                    u.FullName,
                    u.AvatarURL,
                    u.Role
                FROM CommunityPost cp
                LEFT JOIN Users u ON cp.UserID = u.UserID
                WHERE cp.PostID = ? 
                AND (cp.Status IS NULL OR cp.Status IN ('active', 'public', 'approved'))
            ");
            
            if (!$checkStmt) {
                fail("Lỗi chuẩn bị truy vấn bài gốc: " . $conn->error, 500);
            }
            
            $checkStmt->bind_param("i", $originalPostId);
            $checkStmt->execute();
            $originalResult = $checkStmt->get_result();
            
            if ($originalRow = $originalResult->fetch_assoc()) {
                // Bài gốc còn tồn tại
                $originalPostInfo = [
                    "exists" => true,
                    "deleted" => false,
                    "post_id" => $originalRow["PostID"],
                    "content" => $originalRow["Content"],
                    "created_at" => $originalRow["CreatedAt"],
                    "user_id" => $originalRow["UserID"],
                    "username" => $originalRow["Username"],
                    "fullname" => $originalRow["FullName"],
                    "avatar" => $originalRow["AvatarURL"],
                    "role" => $originalRow["Role"]
                ];
                
                // Lấy media của bài gốc nếu có
                $mediaStmt = $conn->prepare("
                    SELECT MediaID, MediaType, FilePath, ThumbnailPath, SortOrder 
                    FROM CommunityPostMedia 
                    WHERE PostID = ? 
                    ORDER BY SortOrder ASC, MediaID ASC
                ");
                
                if ($mediaStmt) {
                    $mediaStmt->bind_param("i", $originalPostId);
                    $mediaStmt->execute();
                    $mediaResult = $mediaStmt->get_result();
                    $originalMedia = [];
                    
                    while ($mediaRow = $mediaResult->fetch_assoc()) {
                        $originalMedia[] = $mediaRow;
                    }
                    $originalPostInfo["media"] = $originalMedia;
                    $mediaStmt->close();
                }
            } else {
                // Bài gốc không tồn tại (trường hợp lỗi)
                $originalPostInfo = [
                    "exists" => false,
                    "deleted" => true,
                    "post_id" => $originalPostId,
                    "content" => "⚠️ Bài viết gốc không còn khả dụng",
                    "warning" => "Bài viết gốc đã bị xóa"
                ];
            }
            $checkStmt->close();
        }
    }

    // Lấy media của bài hiện tại
    $media = [];
    $st2 = $conn->prepare("
        SELECT MediaID, MediaType, FilePath, ThumbnailPath, SortOrder 
        FROM CommunityPostMedia 
        WHERE PostID = ? 
        ORDER BY SortOrder ASC, MediaID ASC
    ");
    
    if ($st2) {
        $st2->bind_param("i", $postId);
        $st2->execute();
        $mediaResult = $st2->get_result();
        while ($row = $mediaResult->fetch_assoc()) {
            $media[] = $row;
        }
        $st2->close();
    }

    // 🟢 HÀM FIX ĐƯỜNG DẪN MEDIA
    function fix_media_path($path) {
        if (!$path) return $path;
        
        // Nếu đã là URL đầy đủ
        if (strpos($path, "http://") === 0 || strpos($path, "https://") === 0) {
            return $path;
        }
        
        // Nếu đã có /HeThongChamSocCaKoi/
        if (strpos($path, "/HeThongChamSocCaKoi/") === 0) {
            return $path;
        }
        
        // Nếu bắt đầu bằng /
        if (strpos($path, "/") === 0) {
            return "/HeThongChamSocCaKoi" . $path;
        }
        
        // Mặc định: thêm /HeThongChamSocCaKoi/uploads/community/
        return "/HeThongChamSocCaKoi/uploads/community/" . $path;
    }
    
    // Fix đường dẫn media
    foreach ($media as &$mediaItem) {
        $mediaItem['FilePath'] = fix_media_path($mediaItem['FilePath']);
        if ($mediaItem['ThumbnailPath']) {
            $mediaItem['ThumbnailPath'] = fix_media_path($mediaItem['ThumbnailPath']);
        }
    }
    
    // Fix đường dẫn media cho bài gốc nếu có
    if ($originalPostInfo && isset($originalPostInfo['media'])) {
        foreach ($originalPostInfo['media'] as &$originalMedia) {
            $originalMedia['FilePath'] = fix_media_path($originalMedia['FilePath']);
            if ($originalMedia['ThumbnailPath']) {
                $originalMedia['ThumbnailPath'] = fix_media_path($originalMedia['ThumbnailPath']);
            }
        }
    }

    // 🟢 TRẢ VỀ ĐẦY ĐỦ THÔNG TIN
    echo json_encode([
        "success" => true,
        "post" => [
            "PostID" => $post["PostID"],
            "Content" => $post["Content"],
            "Privacy" => $post["Privacy"],
            "CreatedAt" => $post["CreatedAt"],
            "UpdatedAt" => $post["UpdatedAt"],
            "UserID" => $post["UserID"],
            "OriginalPostID" => $post["OriginalPostID"] ?? 0,
            "IsSharedPost" => $isSharedPost,
            "is_original_deleted" => $isOriginalDeleted ? 1 : 0,
            // 🟢 THÊM CÁC TRƯỜNG ORIGINAL_* VÀO POST
            "original_content" => $post["original_content"] ?? null,
            "original_created_at" => $post["original_created_at"] ?? null,
            "original_user_id" => $post["original_user_id"] ?? null,
            "original_username" => $post["original_username"] ?? null,
            "original_fullname" => $post["original_fullname"] ?? null,
            "original_avatar" => $post["original_avatar"] ?? null,
            "original_role" => $post["original_role"] ?? null
        ],
        "user" => [
            "user_id" => $post["UserID"],
            "username" => $post["Username"],
            "fullname" => $post["FullName"],
            "avatar" => $post["AvatarURL"],
            "role" => $post["Role"] ?? null
        ],
        "media" => $media,
        "original_post" => $originalPostInfo
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log("Get Post Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Lỗi hệ thống: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>