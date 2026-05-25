<?php
// FILE: backend/api/customer/water_params/list.php
// VERSION: V2.2 - EXPERT EDITION (Virtual Merge Strategy)
// AUTHOR: KoiCare System Dev Team
// LOGIC PRESERVATION: Giữ nguyên logic lấy 50 bản ghi, thêm thuật toán merge ảo.

error_reporting(E_ALL);
ini_set('display_errors', '0');
require_once '../../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function fail($m, $c = 400) {
    http_response_code($c);
    echo json_encode(['error' => $m], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Authentication & Authorization
    if (!isset($_SESSION['username'])) fail('Chưa đăng nhập', 401);

    $u = $_SESSION['username'];
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $st->bind_param("s", $u);
    $st->execute();
    $user = $st->get_result()->fetch_assoc();
    if (!$user) fail('Không tìm thấy tài khoản', 404);
    $uid = (int)$user['UserID'];

    // 2. Filter Parameters
    $pondFilter = isset($_GET['pond_id']) ? (int)$_GET['pond_id'] : (isset($_GET['pond']) ? (int)$_GET['pond'] : 0);
    
    // Query cơ bản lấy lịch sử thô
    $sql = "SELECT WP.*, P.PondName
            FROM WaterParameter WP
            JOIN Pond P ON WP.PondID = P.PondID
            WHERE P.UserID = ?";
    
    $params = [$uid];
    $types = "i";

    if ($pondFilter > 0) {
        $sql .= " AND WP.PondID = ?";
        $params[] = $pondFilter;
        $types .= "i";
    }

    // Lấy 50 bản ghi gần nhất để phân tích xu hướng
    $sql .= " ORDER BY WP.RecordedAt DESC, WP.ParameterID DESC LIMIT 50";

    $st = $conn->prepare($sql);
    $st->bind_param($types, ...$params);
    $st->execute();
    $rs = $st->get_result();
    
    $rawHistory = [];
    while ($r = $rs->fetch_assoc()) {
        $rawHistory[] = $r;
    }

    // --- LOGIC HỢP NHẤT ẢO (VIRTUAL MERGE STRATEGY) ---
    // Mục tiêu: Tạo ra "Latest Context" chứa thông tin mới nhất của từng chỉ số trong 48h.
    
    $mergedContext = []; // Key là PondID
    
    // Danh sách các trường thông số cần hợp nhất
    $paramFields = [
        'pH', 'Temperature', 'Ammonia', 'Nitrite', 'Nitrate', 
        'Phosphate', 'Hardness', 'Salt', 'Oxygen', 'CO2', 'CH', 'GH'
    ];

    // Thời gian hiện tại để tính TTL (Time-To-Live)
    $now = time();
    $ttlSeconds = 48 * 3600; // 48 giờ

    // Duyệt từ bản ghi MỚI NHẤT -> CŨ NHẤT
    foreach ($rawHistory as $row) {
        $pid = $row['PondID'];
        
        if (!isset($mergedContext[$pid])) {
            // Khởi tạo context khung xương bằng bản ghi mới nhất
            $mergedContext[$pid] = $row;
            $mergedContext[$pid]['_is_merged'] = true; 
            $mergedContext[$pid]['_sources'] = []; 
        }
        
        // Tính tuổi bản ghi
        $recTime = strtotime($row['RecordedAt']);
        $ageSeconds = $now - $recTime;

        // Chỉ xét dữ liệu trong vòng 48h (Expert Standard)
        if ($ageSeconds <= $ttlSeconds) {
            foreach ($paramFields as $field) {
                // Logic: Nếu Context hiện tại đang NULL cho trường này
                // VÀ bản ghi lịch sử này có dữ liệu -> Trám vào
                if (
                    (is_null($mergedContext[$pid][$field]) || $mergedContext[$pid][$field] === '') && 
                    (!is_null($row[$field]) && $row[$field] !== '')
                ) {
                    $mergedContext[$pid][$field] = $row[$field];
                    // Ghi lại thời điểm lấy mẫu của chỉ số này (quan trọng cho UI hiển thị "Old Data")
                    $mergedContext[$pid][$field . '_At'] = $row['RecordedAt'];
                    $mergedContext[$pid]['_sources'][$field] = $row['RecordedAt'];
                }
            }
        }
    }

    // --- RESPONSE FORMATTING ---
    // Trả về đúng format mà Frontend Expert Edition yêu cầu
    
    // Case 1: Client lọc theo 1 hồ -> Trả về mảng lịch sử (History List)
    // Lưu ý: Context sẽ được lấy riêng qua API get_context.php hoặc client tự xử lý từ list này
    // Ở đây ta trả về raw history đã được filter để vẽ biểu đồ chính xác
    echo json_encode($rawHistory, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    fail('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
?>