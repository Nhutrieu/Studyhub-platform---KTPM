<?php
require_once '../../../../includes/db.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// ✅ 1. Kiểm tra đăng nhập
if (empty($_SESSION['username'])) {
    fail('Bạn cần đăng nhập để đánh giá sản phẩm.', 401);
}

$username = $_SESSION['username'];

// ✅ 2. Lấy UserID
$stmt = $conn->prepare("SELECT UserID, FullName FROM Users WHERE Username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    fail('Không tìm thấy tài khoản người dùng.', 404);
}

$userID = (int)$user['UserID'];

// ✅ 3. Đọc dữ liệu JSON gửi lên
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$productID = (int)($data['ProductID'] ?? 0);
$rating    = (int)($data['Rating'] ?? 0);
$comment   = trim($data['Comment'] ?? '');

if ($productID <= 0) {
    fail('Thiếu ID sản phẩm.');
}
if ($rating < 1 || $rating > 5) {
    fail('Điểm đánh giá không hợp lệ (1–5 sao).');
}

// ✅ 4. Kiểm tra sản phẩm có tồn tại
$chkP = $conn->prepare("SELECT ProductID FROM Product WHERE ProductID = ?");
$chkP->bind_param("i", $productID);
$chkP->execute();
$existsP = $chkP->get_result()->num_rows > 0;
$chkP->close();

if (!$existsP) {
    fail('Sản phẩm không tồn tại.', 404);
}

// ✅ 5. Kiểm tra user đã mua sản phẩm này chưa (chỉ người mua mới được đánh giá)
//    Có thể chỉnh điều kiện tuỳ theo luồng xử lý đơn + thanh toán của anh
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
$buyRow = $chkBuy->get_result()->fetch_assoc();
$chkBuy->close();

if (empty($buyRow['cnt']) || (int)$buyRow['cnt'] === 0) {
    fail('Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua sản phẩm này.');
}

$conn->begin_transaction();

try {
    // ✅ 6. Kiểm tra đã có review trước đó chưa
    $chkRev = $conn->prepare("
        SELECT ReviewID
        FROM ProductReview
        WHERE ProductID = ? AND UserID = ?
        LIMIT 1
    ");
    $chkRev->bind_param("ii", $productID, $userID);
    $chkRev->execute();
    $revRes = $chkRev->get_result();
    $oldReview = $revRes->fetch_assoc();
    $chkRev->close();

    if ($oldReview) {
        // 🔁 Cập nhật review cũ
        $upd = $conn->prepare("
            UPDATE ProductReview
            SET Rating = ?, Comment = ?, Status = 'approved', UpdatedAt = NOW()
            WHERE ReviewID = ?
        ");
        $upd->bind_param("isi", $rating, $comment, $oldReview['ReviewID']);
        $upd->execute();
        $upd->close();
    } else {
        // ➕ Thêm review mới
        $ins = $conn->prepare("
            INSERT INTO ProductReview (ProductID, UserID, Rating, Comment, Status)
            VALUES (?, ?, ?, ?, 'approved')
        ");
        $ins->bind_param("iiis", $productID, $userID, $rating, $comment);
        $ins->execute();
        $ins->close();
    }

    // ✅ 7. Tính lại RatingAverage + RatingCount cho bảng Product
    $agg = $conn->prepare("
        SELECT 
            COUNT(*) AS cnt,
            IFNULL(AVG(Rating), 0) AS avg_rating
        FROM ProductReview
        WHERE ProductID = ? AND Status = 'approved'
    ");
    $agg->bind_param("i", $productID);
    $agg->execute();
    $aggRow = $agg->get_result()->fetch_assoc();
    $agg->close();

    $newCount  = (int)($aggRow['cnt'] ?? 0);
    $newAvg    = (float)($aggRow['avg_rating'] ?? 0);

    $updP = $conn->prepare("
        UPDATE Product
        SET RatingAverage = ?, RatingCount = ?
        WHERE ProductID = ?
    ");
    $updP->bind_param("dii", $newAvg, $newCount, $productID);
    $updP->execute();
    $updP->close();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Đã ghi nhận đánh giá của bạn.',
        'rating_average' => round($newAvg, 2),
        'rating_count'   => $newCount
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $conn->rollback();
    error_log('add_or_update_review error: '.$e->getMessage());
    fail('Có lỗi xảy ra khi lưu đánh giá. Vui lòng thử lại sau.', 500);
}