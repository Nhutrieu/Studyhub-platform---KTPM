<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['username'])) {
        fail('Chưa đăng nhập', 401);
    }

    $username = $_SESSION['username'];
    
    // Lấy thông tin user
    try {
        $stmt = $conn->prepare("SELECT UserID, FullName, Username, AvatarURL, Role 
                               FROM Users WHERE Username = ? LIMIT 1");
        if (!$stmt) {
            fail('Lỗi chuẩn bị truy vấn user: ' . $conn->error, 500);
        }
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } catch (Exception $e) {
        fail('Lỗi truy vấn user: ' . $e->getMessage(), 500);
    }
    
    if (!$user) {
        fail('Không tìm thấy tài khoản', 404);
    }

    $currentUserId = (int)$user['UserID'];

    /* ====================== PAGINATION ====================== */
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(5, min(20, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    /* ====================== SCOPE ====================== */
    $scope = $_GET['scope'] ?? 'all';
    if (!in_array($scope, ['all', 'following', 'user'], true)) {
        $scope = 'all';
    }

    /* ====================== QUERY PHẠM VI BÀI VIẾT ====================== */
    
    // Kiểm tra xem cột IsPinned có tồn tại trong bảng không
    $checkColumn = $conn->query("SHOW COLUMNS FROM CommunityPost LIKE 'IsPinned'");
    $hasIsPinned = $checkColumn->num_rows > 0;
    
    $orderByClause = $hasIsPinned ? "ORDER BY p.IsPinned DESC, p.PinnedAt DESC, p.CreatedAt DESC" : "ORDER BY p.CreatedAt DESC";
    
    if ($scope === 'user' && !empty($_GET['username'])) {
        // Trang cá nhân
        $targetUsername = $_GET['username'];
        $sql = "SELECT p.*,
                       u.FullName, u.Username, u.AvatarURL, u.Role,
                       -- 🟢 THÊM CÁC CỘT ORIGINAL_*
                       p.original_content, p.original_created_at,
                       p.original_user_id, p.original_username, 
                       p.original_fullname, p.original_avatar, p.original_role,
                       -- 🟢 SỬA: Sử dụng CASE để trả về 1 hoặc 0 thay vì NULL
                       (SELECT CASE WHEN EXISTS (SELECT 1 FROM CommunityFollow f 
                        WHERE f.FollowerID = ? AND f.FollowingID = u.UserID) THEN 1 ELSE 0 END) AS IsFollowing
                FROM CommunityPost p
                JOIN Users u ON p.UserID = u.UserID
                WHERE u.Username = ?
                  AND (p.Status IS NULL OR p.Status IN ('active', 'public', 'approved'))
                  AND (
                      p.Privacy = 'public'
                      OR p.UserID = ?
                      OR (p.Privacy = 'followers' AND EXISTS (
                          SELECT 1 FROM CommunityFollow f2 
                          WHERE f2.FollowerID = ? AND f2.FollowingID = u.UserID
                      ))
                  )
                $orderByClause
                LIMIT ?, ?";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            fail('Lỗi chuẩn bị truy vấn user scope: ' . $conn->error, 500);
        }
        // 🟢 SỬA: Thêm một tham số ? nữa cho IsFollowing (total 6 params)
        $stmt->bind_param("ssiiii", $currentUserId, $targetUsername, $currentUserId, $currentUserId, $offset, $limit);
    } 
    elseif ($scope === 'following') {
        // Bài từ người đang theo dõi
        $sql = "SELECT p.*,
                       u.FullName, u.Username, u.AvatarURL, u.Role,
                       -- 🟢 THÊM CÁC CỘT ORIGINAL_*
                       p.original_content, p.original_created_at,
                       p.original_user_id, p.original_username, 
                       p.original_fullname, p.original_avatar, p.original_role,
                       -- 🟢 SỬA: Thêm query để kiểm tra follow (không dùng 1 AS IsFollowing)
                       (SELECT CASE WHEN EXISTS (SELECT 1 FROM CommunityFollow f2 
                        WHERE f2.FollowerID = ? AND f2.FollowingID = u.UserID) THEN 1 ELSE 0 END) AS IsFollowing
                FROM CommunityPost p
                JOIN Users u ON p.UserID = u.UserID
                JOIN CommunityFollow f ON f.FollowerID = ? AND f.FollowingID = p.UserID
                WHERE (p.Status IS NULL OR p.Status IN ('active', 'public', 'approved'))
                  AND (p.Privacy = 'public' OR p.Privacy = 'followers')
                $orderByClause
                LIMIT ?, ?";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            fail('Lỗi chuẩn bị truy vấn following scope: ' . $conn->error, 500);
        }
        // 🟢 SỬA: Thêm một tham số ? nữa (total 4 params)
        $stmt->bind_param("iiii", $currentUserId, $currentUserId, $offset, $limit);
    } 
    else {
        // Feed bình thường
        $sql = "SELECT p.*,
                       u.FullName, u.Username, u.AvatarURL, u.Role,
                       -- 🟢 THÊM CÁC CỘT ORIGINAL_*
                       p.original_content, p.original_created_at,
                       p.original_user_id, p.original_username, 
                       p.original_fullname, p.original_avatar, p.original_role,
                       -- 🟢 SỬA: Sử dụng CASE để trả về 1 hoặc 0 thay vì NULL
                       (SELECT CASE WHEN EXISTS (SELECT 1 FROM CommunityFollow f 
                        WHERE f.FollowerID = ? AND f.FollowingID = u.UserID) THEN 1 ELSE 0 END) AS IsFollowing
                FROM CommunityPost p
                JOIN Users u ON p.UserID = u.UserID
                WHERE (p.Status IS NULL OR p.Status IN ('active', 'public', 'approved'))
                  AND (p.Privacy = 'public' OR p.UserID = ?)
                $orderByClause
                LIMIT ?, ?";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            fail('Lỗi chuẩn bị truy vấn all scope: ' . $conn->error, 500);
        }
        // 🟢 SỬA: Số lượng params vẫn là 4
        $stmt->bind_param("iiii", $currentUserId, $currentUserId, $offset, $limit);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $posts = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (empty($posts)) {
        echo json_encode(['posts' => [], 'page' => $page, 'hasMore' => false]);
        exit;
    }

    /* ====================== STATEMENTS PHỤ ====================== */
    $stmtMedia = null;
    $stmtReactSummary = null;
    $stmtReactUser = null;
    $stmtCommentCount = null;
    $stmtOriginal = null;
    $stmtOriginalDeleted = null;

    // Chuẩn bị các statement phụ
    try {
        $stmtMedia = $conn->prepare("
            SELECT MediaID, MediaType, FilePath, ThumbnailPath, SortOrder 
            FROM CommunityPostMedia 
            WHERE PostID = ? 
            ORDER BY SortOrder ASC, MediaID ASC
        ");
        
        $stmtReactSummary = $conn->prepare("
            SELECT Type, COUNT(*) AS Cnt 
            FROM CommunityReaction 
            WHERE PostID = ? 
            GROUP BY Type
        ");
        
        $stmtReactUser = $conn->prepare("
            SELECT Type FROM CommunityReaction 
            WHERE PostID = ? AND UserID = ? LIMIT 1
        ");
        
        $stmtCommentCount = $conn->prepare("
            SELECT COUNT(*) AS Cnt 
            FROM CommunityComment 
            WHERE PostID = ? AND Status = 'active'
        ");
        
        // Query bài gốc
        $stmtOriginal = $conn->prepare("
            SELECT p.PostID, p.Content, p.CreatedAt, p.Status, p.Privacy, p.is_original_deleted,
                   u.FullName, u.Username, u.AvatarURL, u.Role
            FROM CommunityPost p
            JOIN Users u ON p.UserID = u.UserID
            WHERE p.PostID = ?
              AND (p.Status IS NULL OR p.Status IN ('active', 'public', 'approved'))
              AND (p.Privacy IN ('public', 'followers') OR p.UserID = ?)
        ");
        
        // Kiểm tra trạng thái bài gốc
        $stmtOriginalDeleted = $conn->prepare("
            SELECT is_original_deleted 
            FROM CommunityPost 
            WHERE PostID = ?
        ");
        
        if (!$stmtMedia || !$stmtReactSummary || !$stmtReactUser || !$stmtCommentCount || !$stmtOriginal || !$stmtOriginalDeleted) {
            fail('Lỗi chuẩn bị các truy vấn phụ', 500);
        }
    } catch (Exception $e) {
        fail('Lỗi chuẩn bị statement phụ: ' . $e->getMessage(), 500);
    }

    /* ====================== HÀM FIX PATH MEDIA ====================== */
    function fix_path($path) {
        if (!$path) {
            return $path;
        }

        // Nếu đã đúng dạng: /HeThongChamSocCaKoi/uploads/...
        if (strpos($path, "/HeThongChamSocCaKoi/") === 0) {
            return $path;
        }

        // Nếu dạng /uploads/...
        if (strpos($path, "/uploads/") === 0) {
            return "/HeThongChamSocCaKoi" . $path;
        }

        // Nếu chỉ là tên file
        if ($path[0] !== "/") {
            return "/HeThongChamSocCaKoi/uploads/community/" . $path;
        }

        return $path;
    }

    /* ====================== BUILD OUTPUT ====================== */
    $output = [];

    foreach ($posts as $post) {
        try {
            $postId = (int)$post['PostID'];

            /* --- USER INFO --- */
            $userInfo = [
                'UserID'    => (int)$post['UserID'],
                'FullName'  => $post['FullName'],
                'Username'  => $post['Username'],
                'AvatarURL' => $post['AvatarURL'],
                'Role'      => $post['Role'],
                // 🟢 QUAN TRỌNG: Thêm IsFollowing vào user info
                'IsFollowing' => isset($post['IsFollowing']) ? (int)$post['IsFollowing'] : 0
            ];

            /* --- MEDIA LIST --- */
            $media = [];
            $stmtMedia->bind_param("i", $postId);
            $stmtMedia->execute();
            $mediaResult = $stmtMedia->get_result();

            while ($mediaItem = $mediaResult->fetch_assoc()) {
                $mediaItem['FilePath'] = fix_path($mediaItem['FilePath']);
                $media[] = $mediaItem;
            }
            $stmtMedia->reset();

            /* --- REACTIONS (SUMMARY) --- */
            $summary = [];
            $totalReact = 0;

            $stmtReactSummary->bind_param("i", $postId);
            $stmtReactSummary->execute();
            $reactSummaryResult = $stmtReactSummary->get_result();

            while ($react = $reactSummaryResult->fetch_assoc()) {
                $summary[$react['Type']] = (int)$react['Cnt'];
                $totalReact += (int)$react['Cnt'];
            }
            $stmtReactSummary->reset();

            /* --- USER REACTION --- */
            $userReact = null;
            $stmtReactUser->bind_param("ii", $postId, $currentUserId);
            $stmtReactUser->execute();
            $userReactResult = $stmtReactUser->get_result();
            if ($row = $userReactResult->fetch_assoc()) {
                $userReact = $row['Type'];
            }
            $stmtReactUser->reset();

            /* --- COMMENT COUNT --- */
            $totalComment = 0;
            $stmtCommentCount->bind_param("i", $postId);
            $stmtCommentCount->execute();
            $commentCountResult = $stmtCommentCount->get_result();
            if ($row = $commentCountResult->fetch_assoc()) {
                $totalComment = (int)$row['Cnt'];
            }
            $stmtCommentCount->reset();

            /* --- ORIGINAL POST (SHARE) --- */
            $originalPost = null;
            $isOriginalDeleted = $post['is_original_deleted'] == 1;

            if (!empty($post['OriginalPostID'])) {
                $originalPostId = (int)$post['OriginalPostID'];

                // 🟢 NẾU BÀI GỐC ĐÃ BỊ XÓA, SỬ DỤNG THÔNG TIN ĐÃ LƯU
                if ($isOriginalDeleted) {
                    $originalPost = [
                        'PostID' => $originalPostId,
                        'Content' => $post['original_content'] ?? null,
                        'CreatedAt' => $post['original_created_at'] ?? null,
                        'is_original_deleted' => 1,
                        'original_info' => [
                            'user_id' => $post['original_user_id'] ?? null,
                            'username' => $post['original_username'] ?? null,
                            'fullname' => $post['original_fullname'] ?? null,
                            'avatar' => $post['original_avatar'] ?? null,
                            'role' => $post['original_role'] ?? null
                        ]
                    ];
                } else {
                    // 🟢 BÀI GỐC CHƯA BỊ XÓA, LẤY THÔNG TIN TRỰC TIẾP
                    $stmtOriginal->bind_param("ii", $originalPostId, $currentUserId);
                    $stmtOriginal->execute();
                    $originalResult = $stmtOriginal->get_result();

                    if ($original = $originalResult->fetch_assoc()) {
                        /* MEDIA CỦA BÀI GỐC */
                        $originalMedia = [];
                        $stmtMedia->bind_param("i", $originalPostId);
                        $stmtMedia->execute();
                        $originalMediaResult = $stmtMedia->get_result();

                        while ($originalMediaItem = $originalMediaResult->fetch_assoc()) {
                            $originalMediaItem['FilePath'] = fix_path($originalMediaItem['FilePath']);
                            $originalMedia[] = $originalMediaItem;
                        }
                        $stmtMedia->reset();

                        /* REACTIONS BÀI GỐC */
                        $originalSummary = [];
                        $originalTotalReact = 0;

                        $stmtReactSummary->bind_param("i", $originalPostId);
                        $stmtReactSummary->execute();
                        $originalReactResult = $stmtReactSummary->get_result();

                        while ($react = $originalReactResult->fetch_assoc()) {
                            $originalSummary[$react['Type']] = (int)$react['Cnt'];
                            $originalTotalReact += (int)$react['Cnt'];
                        }
                        $stmtReactSummary->reset();

                        $originalUserReact = null;
                        $stmtReactUser->bind_param("ii", $originalPostId, $currentUserId);
                        $stmtReactUser->execute();
                        $originalUserReactResult = $stmtReactUser->get_result();
                        if ($row = $originalUserReactResult->fetch_assoc()) {
                            $originalUserReact = $row['Type'];
                        }
                        $stmtReactUser->reset();

                        $original['media'] = $originalMedia;
                        $original['reactions'] = [
                            'summary' => $originalSummary,
                            'total'   => $originalTotalReact,
                            'user'    => $originalUserReact
                        ];

                        $originalPost = $original;
                    }
                    $stmtOriginal->reset();
                }
            }

            /* BUILD FINAL OBJECT */
            $outputItem = [
                'PostID'           => $postId,
                'UserID'           => (int)$post['UserID'],
                'Content'          => $post['Content'],
                'Privacy'          => $post['Privacy'],
                'Status'           => $post['Status'],
                'OriginalPostID'   => $post['OriginalPostID'] ? (int)$post['OriginalPostID'] : null,
                'OriginalPost'     => $originalPost,
                'CreatedAt'        => $post['CreatedAt'],
                'UpdatedAt'        => $post['UpdatedAt'],
                'IsPinned'         => isset($post['IsPinned']) ? (int)$post['IsPinned'] : 0,
                'isOwner'          => ($currentUserId === (int)$post['UserID']),
                // 🟢 QUAN TRỌNG: Lấy IsFollowing từ database
                'isFollowing'      => isset($post['IsFollowing']) ? ((int)$post['IsFollowing'] === 1) : false,
                // 🟢 THÊM CÁC TRƯỜNG ORIGINAL VÀO OUTPUT
                'is_original_deleted' => $isOriginalDeleted,
                'original_content' => $post['original_content'] ?? null,
                'original_created_at' => $post['original_created_at'] ?? null,
                'original_user_id' => $post['original_user_id'] ?? null,
                'original_username' => $post['original_username'] ?? null,
                'original_fullname' => $post['original_fullname'] ?? null,
                'original_avatar' => $post['original_avatar'] ?? null,
                'original_role' => $post['original_role'] ?? null,
                'user'             => $userInfo,
                'media'            => $media,
                'reactions'        => [
                    'summary' => $summary,
                    'total'   => $totalReact,
                    'user'    => $userReact
                ],
                'comments'         => [
                    'total' => $totalComment,
                    'items' => []
                ]
            ];

            $output[] = $outputItem;
        } catch (Exception $e) {
            // Bỏ qua lỗi của bài viết này và tiếp tục với bài khác
            error_log("Error processing post {$postId}: " . $e->getMessage());
            continue;
        }
    }

    // Đóng các statement phụ
    if ($stmtMedia) $stmtMedia->close();
    if ($stmtReactSummary) $stmtReactSummary->close();
    if ($stmtReactUser) $stmtReactUser->close();
    if ($stmtCommentCount) $stmtCommentCount->close();
    if ($stmtOriginal) $stmtOriginal->close();
    if ($stmtOriginalDeleted) $stmtOriginalDeleted->close();

    echo json_encode([
        'posts'   => $output,
        'page'    => $page,
        'hasMore' => count($output) === $limit
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    // Ghi log lỗi
    error_log("Error in list.php: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    
    // Trả về lỗi chi tiết
    $errorResponse = [
        'error' => 'Lỗi hệ thống',
        'message' => $e->getMessage(),
        'line' => $e->getLine()
    ];
    
    // Chỉ trả về chi tiết lỗi trong môi trường development
    if (ini_get('display_errors')) {
        echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['error' => 'Lỗi hệ thống, vui lòng thử lại sau.'], JSON_UNESCAPED_UNICODE);
    }
    http_response_code(500);
}
?>