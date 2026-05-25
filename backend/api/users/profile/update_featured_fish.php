<?php
// backend/api/users/profile/update_featured_fish.php
session_start();
header('Content-Type: application/json');

require_once '../../../../includes/db.php';

// 1. Kiểm tra đăng nhập
$userId = 0;
if (isset($_SESSION['userid'])) {
    $userId = $_SESSION['userid'];
} elseif (isset($_SESSION['UserID'])) {
    $userId = $_SESSION['UserID'];
}

if ($userId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Bạn chưa đăng nhập.']);
    exit;
}

// 2. Xử lý method POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// 3. Lấy dữ liệu cá nổi bật
$featuredFishIds = $_POST['featured_fish'] ?? [];

// 4. Cập nhật Database
try {
    // A. Reset tất cả cá của user về IsFeatured = 0
    // Cần JOIN với bảng Pond để xác định cá thuộc User hiện tại
    $resetSql = "UPDATE KoiFish k JOIN Pond p ON k.PondID = p.PondID SET k.IsFeatured = 0 WHERE p.UserID = ?";
    $resetStmt = $conn->prepare($resetSql);
    $resetStmt->bind_param("i", $userId);
    $resetStmt->execute();
    $resetStmt->close();

    // B. Set IsFeatured = 1 cho các cá được chọn gửi lên từ form
    if (is_array($featuredFishIds) && !empty($featuredFishIds)) {
        // Lọc dữ liệu đầu vào để đảm bảo an toàn (chỉ lấy số nguyên)
        $fishIds = array_map('intval', $featuredFishIds);
        
        // Tạo chuỗi ID cho câu lệnh IN (...)
        $idsStr = implode(',', $fishIds);
        
        // Update: Chỉ update cá thuộc về User này (bảo mật)
        $updateFishSql = "UPDATE KoiFish k 
                          JOIN Pond p ON k.PondID = p.PondID 
                          SET k.IsFeatured = 1 
                          WHERE p.UserID = ? AND k.FishID IN ($idsStr)";
        
        $updateFishStmt = $conn->prepare($updateFishSql);
        $updateFishStmt->bind_param("i", $userId);
        $updateFishStmt->execute();
        $updateFishStmt->close();
    }
    
    echo json_encode([
        'success' => true, 
        'message' => 'Cập nhật danh sách cá nổi bật thành công!'
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi cập nhật cá nổi bật: ' . $e->getMessage()]);
}
?>