<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\customer\reviews\check_can_review.php
require_once '../../../../includes/db.php'; // Điều chỉnh lại độ sâu thư mục nếu cần
session_start();
header('Content-Type: application/json');

$userId    = isset($_SESSION['userid']) ? $_SESSION['userid'] : 0;
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;

$response = [
    'can_review' => false,
    'has_reviewed' => false,
    'review_data' => null
];

if ($userId > 0 && $productId > 0) {
    // 1. Kiểm tra đã mua và đơn thành công chưa
    $sql = "
        SELECT o.OrderID 
        FROM Orders o
        JOIN OrderDetail od ON o.OrderID = od.OrderID
        WHERE o.UserID = ? 
          AND od.ProductID = ? 
          AND o.Status = 'Completed'
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $userId, $productId);
    $stmt->execute();
    $bought = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($bought) {
        $response['can_review'] = true;

        // 2. Kiểm tra đã đánh giá chưa
        $stmtRw = $conn->prepare("SELECT * FROM ProductReview WHERE UserID = ? AND ProductID = ?");
        $stmtRw->bind_param("ii", $userId, $productId);
        $stmtRw->execute();
        $review = $stmtRw->get_result()->fetch_assoc();
        
        if ($review) {
            $response['has_reviewed'] = true;
            $response['review_data'] = $review;
        }
    }
}

echo json_encode($response);
?>