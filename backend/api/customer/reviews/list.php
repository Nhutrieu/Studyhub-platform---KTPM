<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\customer\reviews\list.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json');

// --- SỬA LỖI TẠI ĐÂY ---
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
// -----------------------

$page      = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit     = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 10;
$offset    = ($page - 1) * $limit;

if ($productId <= 0) {
    echo json_encode(['success' => false, 'reviews' => [], 'summary' => []]);
    exit;
}

// 1. Lấy danh sách review
$sql = "
    SELECT r.*, u.FullName, u.AvatarURL 
    FROM ProductReview r
    JOIN Users u ON r.UserID = u.UserID
    WHERE r.ProductID = ? AND r.Status = 'approved'
    ORDER BY r.CreatedAt DESC
    LIMIT ? OFFSET ?
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iii", $productId, $limit, $offset);
$stmt->execute();
$res = $stmt->get_result();
$reviews = [];
while ($row = $res->fetch_assoc()) {
    $reviews[] = $row;
}

// 2. Lấy thông tin tóm tắt (Summary)
$sqlSummary = "
    SELECT Rating, COUNT(*) as cnt 
    FROM ProductReview 
    WHERE ProductID = ? AND Status = 'approved' 
    GROUP BY Rating
";
$stmtSum = $conn->prepare($sqlSummary);
$stmtSum->bind_param("i", $productId);
$stmtSum->execute();
$resSum = $stmtSum->get_result();

$breakdown = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
$totalCount = 0;
$totalScore = 0;

while ($row = $resSum->fetch_assoc()) {
    $r = (int)$row['Rating'];
    $c = (int)$row['cnt'];
    $breakdown[$r] = $c;
    $totalCount += $c;
    $totalScore += ($r * $c);
}

$average = $totalCount > 0 ? round($totalScore / $totalCount, 1) : 0;

// 3. Kiểm tra quyền của user hiện tại
$userCanReview = false;
$userReview = null;

if (isset($_SESSION['userid'])) {
    $uid = $_SESSION['userid'];
    $checkBuy = $conn->query("
        SELECT 1 FROM Orders o JOIN OrderDetail od ON o.OrderID = od.OrderID 
        WHERE o.UserID = $uid AND od.ProductID = $productId AND o.Status = 'Completed' LIMIT 1
    ");
    if ($checkBuy->num_rows > 0) {
        $userCanReview = true;
        
        // Lấy review của chính user này (nếu có)
        $myRv = $conn->query("SELECT * FROM ProductReview WHERE UserID = $uid AND ProductID = $productId");
        $userReview = $myRv->fetch_assoc();
    }
}

echo json_encode([
    'success' => true,
    'reviews' => $reviews,
    'summary' => [
        'average' => $average,
        'count' => $totalCount,
        'breakdown' => $breakdown,
        'user_can_review' => $userCanReview,
        'user_review' => $userReview
    ]
]);
?>