<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\customer\reviews\add_or_update.php
require_once '../../../../includes/db.php';
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['userid'])) {
    echo json_encode(['success' => false, 'error' => 'Chưa đăng nhập.']);
    exit;
}

$userId = $_SESSION['userid'];
$data   = json_decode(file_get_contents('php://input'), true);

// === SỬA LỖI TẠI ĐÂY (Hứng biến chữ thường từ JS) ===
$productId = isset($data['product_id']) ? (int)$data['product_id'] : 0;
$rating    = isset($data['rating']) ? (int)$data['rating'] : 5;
$comment   = isset($data['comment']) ? trim($data['comment']) : '';
// ====================================================

if ($productId <= 0 || $rating < 1 || $rating > 5) {
    echo json_encode(['success' => false, 'error' => 'Dữ liệu không hợp lệ (product_id hoặc rating sai).']);
    exit;
}

try {
    // 1. Check quyền lại lần nữa
    $sqlCheck = "
        SELECT o.OrderID 
        FROM Orders o
        JOIN OrderDetail od ON o.OrderID = od.OrderID
        WHERE o.UserID = ? AND od.ProductID = ? AND o.Status = 'Completed'
        LIMIT 1
    ";
    $stmt = $conn->prepare($sqlCheck);
    $stmt->bind_param("ii", $userId, $productId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        throw new Exception("Bạn chưa mua sản phẩm này hoặc đơn chưa hoàn thành.");
    }

    // 2. Insert hoặc Update
    $sqlUpsert = "
        INSERT INTO ProductReview (ProductID, UserID, Rating, Comment, Status, CreatedAt)
        VALUES (?, ?, ?, ?, 'approved', NOW())
        ON DUPLICATE KEY UPDATE 
            Rating = VALUES(Rating), 
            Comment = VALUES(Comment),
            UpdatedAt = NOW()
    ";
    $stmtUp = $conn->prepare($sqlUpsert);
    $stmtUp->bind_param("iiis", $productId, $userId, $rating, $comment);
    $stmtUp->execute();

    // 3. Tính lại Rating trung bình cho Product
    $sqlCalc = "
        SELECT COUNT(*) as cnt, AVG(Rating) as avg_score 
        FROM ProductReview 
        WHERE ProductID = ? AND Status = 'approved'
    ";
    $stmtCalc = $conn->prepare($sqlCalc);
    $stmtCalc->bind_param("i", $productId);
    $stmtCalc->execute();
    $stats = $stmtCalc->get_result()->fetch_assoc();
    
    $newCount = $stats['cnt'] ?? 0;
    $newAvg   = $stats['avg_score'] ?? 0;

    $prodUp = $conn->prepare("UPDATE Product SET RatingAverage = ?, RatingCount = ? WHERE ProductID = ?");
    $prodUp->bind_param("dii", $newAvg, $newCount, $productId);
    $prodUp->execute();

    echo json_encode(['success' => true, 'message' => 'Đánh giá thành công!']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>