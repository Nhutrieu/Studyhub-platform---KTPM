<?php
require_once '../../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');

// Kiểm tra và xác thực đầu vào
$fish_id = isset($_POST['FishID']) ? filter_var($_POST['FishID'], FILTER_VALIDATE_INT) : 0;
$measured_at = isset($_POST['MeasuredAt']) ? $_POST['MeasuredAt'] : date('Y-m-d');
$length = isset($_POST['Length']) ? filter_var($_POST['Length'], FILTER_VALIDATE_FLOAT) : 0;
$weight = isset($_POST['Weight']) ? filter_var($_POST['Weight'], FILTER_VALIDATE_FLOAT) : 0;
$note = !empty($_POST['Note']) ? trim($_POST['Note']) : 'Cập nhật từ biểu đồ';

// SỬA: Chuyển từ date-only sang datetime (thêm giờ hiện tại)
if (strlen($measured_at) <= 10) { // Nếu chỉ có YYYY-MM-DD
    $measured_at = $measured_at . ' ' . date('H:i:s'); // Thêm giờ phút giây hiện tại
}

if ($fish_id > 0 && $length > 0) {
    // Kiểm tra nếu Weight hoặc Length là 0, thì đặt chúng thành null nếu cần
    if ($length == 0) $length = null;
    if ($weight == 0) $weight = null;

    // SỬA: Dùng MeasuredAt thay vì CURDATE()
    $stmt = $conn->prepare("INSERT INTO KoiGrowthHistory (FishID, MeasuredAt, Length, Weight, Note) VALUES (?, ?, ?, ?, ?)");
    
    if ($stmt === false) {
        echo json_encode(['success' => false, 'error' => 'Không thể chuẩn bị câu lệnh SQL: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("isdds", $fish_id, $measured_at, $length, $weight, $note);

    if ($stmt->execute()) {
        // Trigger SQL sẽ tự động update bảng KoiFish
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Đã xảy ra lỗi khi lưu dữ liệu: ' . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(['success' => false, 'error' => 'Dữ liệu không hợp lệ: FishID hoặc Length <= 0']);
}

$conn->close();
?>