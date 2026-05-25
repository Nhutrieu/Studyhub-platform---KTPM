<?php
require_once '../../../../includes/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$productID = (int)($_GET['product_id'] ?? 0);
$page      = max(1, (int)($_GET['page'] ?? 1));
$per_page  = min(50, max(5, (int)($_GET['per_page'] ?? 10)));

if ($productID <= 0) {
    fail('Thiếu ID sản phẩm.');
}

// ✅ 1. Lấy tổng số review & trung bình & breakdown
$aggSql = "
    SELECT 
        COUNT(*) AS cnt,
        IFNULL(AVG(Rating), 0) AS avg_rating
    FROM ProductReview
    WHERE ProductID = ? AND Status = 'approved'
";
$agg = $conn->prepare($aggSql);
$agg->bind_param("i", $productID);
$agg->execute();
$aggRow = $agg->get_result()->fetch_assoc();
$agg->close();

$total     = (int)($aggRow['cnt'] ?? 0);
$avgRating = (float)($aggRow['avg_rating'] ?? 0);

// breakdown 1–5 sao
$breakdown = [1=>0,2=>0,3=>0,4=>0,5=>0];
$br = $conn->prepare("
    SELECT Rating, COUNT(*) AS c
    FROM ProductReview
    WHERE ProductID = ? AND Status = 'approved'
    GROUP BY Rating
");
$br->bind_param("i", $productID);
$br->execute();
$brRes = $br->get_result();
while ($row = $brRes->fetch_assoc()) {
    $r = (int)$row['Rating'];
    if ($r >= 1 && $r <= 5) {
        $breakdown[$r] = (int)$row['c'];
    }
}
$br->close();

// ✅ 2. Lấy danh sách review theo trang
$offset = ($page - 1) * $per_page;

$listSql = "
    SELECT r.ReviewID, r.Rating, r.Comment, r.CreatedAt, r.UpdatedAt,
           u.FullName, u.AvatarURL
    FROM ProductReview r
    JOIN Users u ON r.UserID = u.UserID
    WHERE r.ProductID = ? AND r.Status = 'approved'
    ORDER BY r.CreatedAt DESC
    LIMIT ? OFFSET ?
";
$list = $conn->prepare($listSql);
$list->bind_param("iii", $productID, $per_page, $offset);
$list->execute();
$listRes = $list->get_result();

$reviews = [];
while ($row = $listRes->fetch_assoc()) {
    $row['AvatarURL'] = $row['AvatarURL'] ?: '/HeThongChamSocCaKoi/assets/images/default_avatar.png';
    $reviews[] = $row;
}
$list->close();

// ✅ 3. Nếu user đăng nhập, xem họ có review riêng không + họ có quyền review không
$username = $_SESSION['username'] ?? null;
$user_can_review = false;
$user_review = null;

if ($username) {
    // Lấy UserID
    $uSt = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $uSt->bind_param("s", $username);
    $uSt->execute();
    $uRow = $uSt->get_result()->fetch_assoc();
    $uSt->close();

    if ($uRow) {
        $userID = (int)$uRow['UserID'];

        // Đã mua chưa?
        $chkBuy = $conn->prepare("
            SELECT COUNT(*) AS cnt
            FROM Orders o
            JOIN OrderDetail od ON od.OrderID = o.OrderID
            WHERE o.UserID = ?
              AND od.ProductID = ?
              AND (o.PaymentStatus = 'PAID' OR o.Status IN ('Completed', 'Delivered'))
        ");
        $chkBuy->bind_param("ii", $userID, $productID);
        $chkBuy->execute();
        $bRow = $chkBuy->get_result()->fetch_assoc();
        $chkBuy->close();

        $user_can_review = !empty($bRow['cnt']) && (int)$bRow['cnt'] > 0;

        // Review của chính user
        $my = $conn->prepare("
            SELECT ReviewID, Rating, Comment, Status, CreatedAt, UpdatedAt
            FROM ProductReview
            WHERE ProductID = ? AND UserID = ?
            LIMIT 1
        ");
        $my->bind_param("ii", $productID, $userID);
        $my->execute();
        $myRes = $my->get_result()->fetch_assoc();
        $my->close();

        if ($myRes) {
            $user_review = $myRes;
        }
    }
}

echo json_encode([
    'success' => true,
    'summary' => [
        'average'        => round($avgRating, 2),
        'count'          => $total,
        'breakdown'      => $breakdown,
        'user_can_review'=> $user_can_review,
        'user_review'    => $user_review
    ],
    'reviews' => $reviews,
    'page'    => $page,
    'per_page'=> $per_page,
    'total'   => $total
], JSON_UNESCAPED_UNICODE);
