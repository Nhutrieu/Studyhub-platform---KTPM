<?php
// backend/api/community/comments/replies.php
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
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
    if (!isset($_SESSION['username']) || !isset($_SESSION['userid'])) {
        fail("Chưa đăng nhập", 401);
    }

    $userId = (int)$_SESSION['userid'];
    $commentId = isset($_GET['comment_id']) ? (int)$_GET['comment_id'] : 0;

    if ($commentId <= 0) fail("Thiếu comment_id");

    // =============================================
    // 1. KIỂM TRA CẤU TRÚC BẢNG TRƯỚC
    // =============================================
    
    // Kiểm tra các column có tồn tại không
    $checkTable = $conn->query("SHOW COLUMNS FROM CommunityComment");
    $columns = [];
    while ($col = $checkTable->fetch_assoc()) {
        $columns[] = $col['Field'];
    }
    
    $hasImageURL = in_array('ImageURL', $columns);
    $hasHasImage = in_array('HasImage', $columns);
    $hasImageWidth = in_array('ImageWidth', $columns);
    $hasImageHeight = in_array('ImageHeight', $columns);
    $hasImageFileName = in_array('ImageFileName', $columns);
    
    error_log("🔍 Database columns check: " . json_encode([
        'ImageURL' => $hasImageURL,
        'HasImage' => $hasHasImage,
        'ImageWidth' => $hasImageWidth,
        'ImageHeight' => $hasImageHeight,
        'ImageFileName' => $hasImageFileName
    ]));

    /* ============================
       XÂY DỰNG QUERY LINH HOẠT THEO CẤU TRÚC BẢNG
    ============================ */
    $selectFields = "
        c.CommentID,
        c.PostID,
        c.ParentCommentID,
        c.Content,
        c.CreatedAt,
        u.UserID,
        u.FullName,
        u.Username,
        u.AvatarURL,
        u.Role
    ";
    
    // Thêm các trường ảnh nếu có
    if ($hasImageURL) {
        $selectFields .= ", c.ImageURL";
    }
    if ($hasHasImage) {
        $selectFields .= ", c.HasImage";
    }
    if ($hasImageWidth) {
        $selectFields .= ", c.ImageWidth";
    }
    if ($hasImageHeight) {
        $selectFields .= ", c.ImageHeight";
    }
    if ($hasImageFileName) {
        $selectFields .= ", c.ImageFileName";
    }
    
    $sql = "
        SELECT 
            $selectFields,
            /* 🟢 KIỂM TRA USER CÓ BỊ CẤM BÌNH LUẬN KHÔNG */
            (
                SELECT CASE 
                    WHEN COUNT(*) > 0 THEN 1 
                    ELSE 0 
                END
                FROM UserBan ub
                WHERE ub.UserID = u.UserID 
                AND ub.IsActive = 1
                AND ub.BanType IN ('comment_only', 'full_ban')
                AND (
                    ub.BanDuration = 0 
                    OR ub.ExpiresAt > NOW()
                )
            ) AS IsCommentBanned,

            /* 🟢 THÔNG TIN CẤM (nếu có) */
            (
                SELECT ub.Reason 
                FROM UserBan ub
                WHERE ub.UserID = u.UserID 
                AND ub.IsActive = 1
                AND ub.BanType IN ('comment_only', 'full_ban')
                AND (
                    ub.BanDuration = 0 
                    OR ub.ExpiresAt > NOW()
                )
                ORDER BY ub.BannedAt DESC
                LIMIT 1
            ) AS BanReason,

            (
                SELECT ub.BanDuration 
                FROM UserBan ub
                WHERE ub.UserID = u.UserID 
                AND ub.IsActive = 1
                AND ub.BanType IN ('comment_only', 'full_ban')
                AND (
                    ub.BanDuration = 0 
                    OR ub.ExpiresAt > NOW()
                )
                ORDER BY ub.BannedAt DESC
                LIMIT 1
            ) AS BanDuration,

            (
                SELECT admin.Username 
                FROM UserBan ub
                JOIN Users admin ON ub.BannedBy = admin.UserID
                WHERE ub.UserID = u.UserID 
                AND ub.IsActive = 1
                AND ub.BanType IN ('comment_only', 'full_ban')
                AND (
                    ub.BanDuration = 0 
                    OR ub.ExpiresAt > NOW()
                )
                ORDER BY ub.BannedAt DESC
                LIMIT 1
            ) AS BannedByUsername,

            (
                SELECT ub.BannedAt 
                FROM UserBan ub
                WHERE ub.UserID = u.UserID 
                AND ub.IsActive = 1
                AND ub.BanType IN ('comment_only', 'full_ban')
                AND (
                    ub.BanDuration = 0 
                    OR ub.ExpiresAt > NOW()
                )
                ORDER BY ub.BannedAt DESC
                LIMIT 1
            ) AS BannedAt,

            (
                SELECT COUNT(*) 
                FROM CommunityComment r2 
                WHERE r2.ParentCommentID = c.CommentID AND r2.Status='active'
            ) AS ReplyCount
        FROM CommunityComment c
        JOIN Users u ON c.UserID = u.UserID
        WHERE c.ParentCommentID=? AND c.Status='active'
        ORDER BY c.CreatedAt ASC
    ";

    error_log("🔍 SQL query: $sql");
    
    $st = $conn->prepare($sql);
    if (!$st) {
        error_log("❌ Prepare error: " . $conn->error);
        fail("Lỗi chuẩn bị truy vấn: " . $conn->error, 500);
    }
    
    $st->bind_param("i", $commentId);
    if (!$st->execute()) {
        error_log("❌ Execute error: " . $st->error);
        fail("Lỗi thực thi truy vấn: " . $st->error, 500);
    }
    
    $rs = $st->get_result();
    $list = [];

    while ($row = $rs->fetch_assoc()) {
        $replyId = (int)$row['CommentID'];
        
        // 🟢 KIỂM TRA USER CÓ BỊ CẤM KHÔNG
        $isCommentBanned = ((int)$row['IsCommentBanned'] > 0);

        /* ============================
           LẤY REACTION SUMMARY
        ============================ */
        $sumSql = "
            SELECT Type, COUNT(*) AS cnt
            FROM CommunityCommentReaction
            WHERE CommentID=?
            GROUP BY Type
        ";
        $st2 = $conn->prepare($sumSql);
        if ($st2) {
            $st2->bind_param("i", $replyId);
            if ($st2->execute()) {
                $rs2 = $st2->get_result();
                $summary = [];
                $total = 0;

                while ($r = $rs2->fetch_assoc()) {
                    $type = strtolower($r['Type']);
                    $count = (int)$r['cnt'];
                    $summary[$type] = $count;
                    $total += $count;
                }
            }
        }

        /* ============================
           LẤY REACTION CỦA USER
        ============================ */
        $userReact = null;
        $userReactSql = "
            SELECT Type 
            FROM CommunityCommentReaction
            WHERE CommentID=? AND UserID=?
        ";
        $st3 = $conn->prepare($userReactSql);
        if ($st3) {
            $st3->bind_param("ii", $replyId, $userId);
            if ($st3->execute()) {
                $rs3 = $st3->get_result();
                $userReactData = $rs3->fetch_assoc();
                $userReact = $userReactData['Type'] ?? null;
            }
        }

        /* ============================
           THÊM VÀO DANH SÁCH (VỚI THÔNG TIN ẢNH)
        ============================ */
        $replyData = [
            'CommentID' => $replyId,
            'PostID' => (int)$row['PostID'],
            'ParentCommentID' => (int)$row['ParentCommentID'],
            'Content' => $row['Content'] ?? '',
            'CreatedAt' => $row['CreatedAt'] ?? '',
            'ReplyCount' => (int)($row['ReplyCount'] ?? 0),
            
            // 🟢 THÔNG TIN CẤM
            'is_comment_banned' => $isCommentBanned,
            'ban_reason' => $row['BanReason'] ?? '',
            'BanDuration' => (int)($row['BanDuration'] ?? 0),
            'BannedAt' => $row['BannedAt'] ?? '',
            'banned_by_username' => $row['BannedByUsername'] ?? '',

            'user' => [
                'UserID' => (int)$row['UserID'],
                'FullName' => $row['FullName'] ?? '',
                'Username' => $row['Username'] ?? '',
                'AvatarURL' => $row['AvatarURL'] ?? '',
                'Role' => $row['Role'] ?? ''
            ],

            'reactions' => [
                'summary' => $summary ?? [],
                'total' => $total ?? 0,
                'user' => $userReact
            ]
        ];
        
        // 🟢 THÊM THÔNG TIN ẢNH NẾU CÓ
        if ($hasImageURL) {
            $replyData['ImageURL'] = $row['ImageURL'] ?? '';
        }
        if ($hasHasImage) {
            $replyData['HasImage'] = (int)($row['HasImage'] ?? 0);
        }
        if ($hasImageWidth) {
            $replyData['ImageWidth'] = isset($row['ImageWidth']) ? (int)$row['ImageWidth'] : 0;
        }
        if ($hasImageHeight) {
            $replyData['ImageHeight'] = isset($row['ImageHeight']) ? (int)$row['ImageHeight'] : 0;
        }
        if ($hasImageFileName) {
            $replyData['ImageFileName'] = $row['ImageFileName'] ?? '';
        }
        
        $list[] = $replyData;
    }

    echo json_encode([
        'success' => true,
        'replies' => $list
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log("❌ Fatal error in replies.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>