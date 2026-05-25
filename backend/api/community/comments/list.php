<?php
// backend/api/community/comments/list.php
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

    $postId = isset($_GET['post_id']) ? (int)$_GET['post_id'] : 0;
    if ($postId <= 0) fail("Thiếu post_id");

    // ==============================
    // LẤY COMMENT + KIỂM TRA CẤM USER
    // ==============================
    $sql = "
        SELECT 
            c.CommentID,
            c.PostID,
            c.ParentCommentID,
            c.Content,
            c.CreatedAt,
            c.ImageURL,               -- 🟢 THÊM: Đường dẫn ảnh
            c.HasImage,              -- 🟢 THÊM: Cờ có ảnh
            
            u.UserID,
            u.FullName,
            u.Username,
            u.AvatarURL,
            u.Role,

            /* KIỂM TRA USER CÓ BỊ CẤM BÌNH LUẬN KHÔNG - QUAN TRỌNG */
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

            /* THÔNG TIN CẤM (nếu có) */
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

            /* Reply count */
            ( SELECT COUNT(*) 
              FROM CommunityComment cc 
              WHERE cc.ParentCommentID = c.CommentID 
                AND cc.Status='active'
            ) AS ReplyCount,

            /* Người đăng có được currentUser theo dõi không */
            ( SELECT COUNT(*) 
              FROM CommunityFollow f 
              WHERE f.FollowerID = ? AND f.FollowingID = u.UserID
            ) AS IsFollowed,

            /* Kiểm tra comment có bị user hiện tại ẩn không */
            ( SELECT COUNT(*) 
              FROM CommunityHiddenComment h 
              WHERE h.CommentID = c.CommentID AND h.UserID = ?
            ) AS IsHidden

        FROM CommunityComment c
        JOIN Users u ON c.UserID = u.UserID
        WHERE c.PostID = ? 
          AND c.Status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM CommunityHiddenComment h 
            WHERE h.CommentID = c.CommentID AND h.UserID = ?
          )
        ORDER BY c.CreatedAt ASC
    ";

    $st = $conn->prepare($sql);
    $st->bind_param("iiii", $currentUser, $currentUser, $postId, $currentUser);
    $st->execute();
    $rs = $st->get_result();

    $flat = [];

    while ($row = $rs->fetch_assoc()) {
        $cid = (int)$row['CommentID'];
        $isHidden = ((int)$row['IsHidden'] > 0);
        
        // KIỂM TRA USER CÓ BỊ CẤM KHÔNG
        $isCommentBanned = ((int)$row['IsCommentBanned'] > 0);

        // Bỏ qua comment đã bị ẩn
        if ($isHidden) {
            continue;
        }

        // ==============================
        // LẤY TỔNG REACTION
        // ==============================
        $sumSql = "
            SELECT Type, COUNT(*) AS cnt
            FROM CommunityCommentReaction
            WHERE CommentID = ?
            GROUP BY Type
        ";
        $st2 = $conn->prepare($sumSql);
        $st2->bind_param("i", $cid);
        $st2->execute();
        $rs2 = $st2->get_result();

        $summary = [];
        $total = 0;
        while ($r = $rs2->fetch_assoc()) {
            $type = strtolower($r['Type']);
            $summary[$type] = (int)$r['cnt'];
            $total += (int)$r['cnt'];
        }

        // ==============================
        // REACTION của currentUser
        // ==============================
        $mySql = "
            SELECT Type FROM CommunityCommentReaction
            WHERE CommentID = ? AND UserID = ?
        ";
        $st3 = $conn->prepare($mySql);
        $st3->bind_param("ii", $cid, $currentUser);
        $st3->execute();
        $rs3 = $st3->get_result();
        $myReact = $rs3->fetch_assoc()['Type'] ?? null;

        // ==============================
        // PUSH COMMENT
        // ==============================
        $flat[$cid] = [
            "CommentID" => $cid,
            "PostID" => (int)$row["PostID"],
            "ParentCommentID" => $row["ParentCommentID"] ? (int)$row["ParentCommentID"] : null,
            "Content" => $row["Content"],
            "CreatedAt" => $row["CreatedAt"],
            "ReplyCount" => (int)$row["ReplyCount"],
            
            // 🟢 THÊM THÔNG TIN ẢNH
            "ImageURL" => $row["ImageURL"] ?? "",
            "HasImage" => (int)$row["HasImage"],
            
            // 🟢 THÔNG TIN CẤM - QUAN TRỌNG
            "is_comment_banned" => $isCommentBanned,
            "ban_reason" => $row["BanReason"] ?? "",
            "BanDuration" => (int)$row["BanDuration"] ?? 0,
            "BannedAt" => $row["BannedAt"] ?? "",
            "banned_by_username" => $row["BannedByUsername"] ?? "",

            "user" => [
                "UserID" => (int)$row["UserID"],
                "FullName" => $row["FullName"] ?? "",
                "Username" => $row["Username"] ?? "",
                "AvatarURL" => $row["AvatarURL"] ?? "",
                "Role" => $row["Role"] ?? "",
                "IsFollowed" => ((int)$row["IsFollowed"] > 0),
                "IsHidden" => $isHidden
            ],

            "reactions" => [
                "summary" => $summary,
                "total" => $total,
                "user" => $myReact
            ],

            "children" => []
        ];
    }

    // ==============================
    // BUILD TREE (chỉ với comment không bị ẩn)
    // ==============================
    $tree = [];
    foreach ($flat as $id => &$node) {
        $pid = $node["ParentCommentID"];
        if ($pid === null) {
            $tree[] = &$node;
        } else if (isset($flat[$pid])) {
            $flat[$pid]["children"][] = &$node;
        }
    }
    unset($node);

    // Lọc bỏ children rỗng nếu cần
    foreach ($tree as &$node) {
        if (empty($node["children"])) {
            unset($node["children"]);
        }
    }

    echo json_encode([
        "success" => true,
        "comments" => $tree,
        "count" => count($tree)
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log("[ERROR] list.php: " . $e->getMessage());
    error_log("[ERROR] Stack trace: " . $e->getTraceAsString());
    fail("Lỗi hệ thống: " . $e->getMessage(), 500);
}
?>