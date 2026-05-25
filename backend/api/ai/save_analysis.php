<?php
// backend/api/ai/save_analysis.php
require_once '../../../includes/db.php';
header('Content-Type: application/json; charset=utf-8');
session_start();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid Method', 405);
    }

    if (!isset($_SESSION['username'])) {
        throw new Exception('Unauthorized', 401);
    }

    // Lấy UserID
    $username = $_SESSION['username'];
    $stmt = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $userId = $user['UserID'];

    // Nhận dữ liệu JSON
    $input = json_decode(file_get_contents('php://input'), true);

    $fishId = isset($input['fish_id']) ? intval($input['fish_id']) : null;
    $diagnosisSummary = isset($input['summary']) ? trim($input['summary']) : 'Kiểm tra sức khỏe định kỳ';
    
    // Validate
    if (!$fishId || $fishId <= 0) {
        throw new Exception('Cần thông tin cá (FishID) để lưu hồ sơ.');
    }

    // XỬ LÝ RESULT JSON (QUAN TRỌNG: LOẠI BỎ ẢNH BASE64 ĐỂ TRÁNH TRUNCATE DB)
    $resultToSave = [];
    if (isset($input['result']) && is_array($input['result'])) {
        $resultToSave = $input['result'];
        // Xóa trường ảnh base64 nặng nề, chỉ giữ lại thông tin text/tọa độ
        if (isset($resultToSave['annotated_image'])) {
            unset($resultToSave['annotated_image']);
        }
        // Nếu API trả về ảnh gốc dạng base64 (nếu có), cũng xóa luôn
        if (isset($resultToSave['image'])) {
            unset($resultToSave['image']);
        }
    }

    // Mã hóa lại mảng đã làm sạch thành JSON
    // JSON_UNESCAPED_UNICODE để giữ tiếng Việt không bị lỗi font
    $resultJson = json_encode($resultToSave, JSON_UNESCAPED_UNICODE);

    // Kiểm tra JSON có hợp lệ không
    if ($resultJson === false) {
        $resultJson = '{}'; // Fallback nếu lỗi
    }
    
    // 1. Lưu vào bảng AI_Analysis
    $sqlAI = "INSERT INTO AI_Analysis (UserID, FishID, AnalysisType, Result, CreatedAt) VALUES (?, ?, 'disease_detection', ?, NOW())";
    $stmtAI = $conn->prepare($sqlAI);
    $stmtAI->bind_param("iis", $userId, $fishId, $resultJson);
    
    if (!$stmtAI->execute()) {
        throw new Exception("Lỗi Database: " . $stmtAI->error);
    }
    
    // 2. Cập nhật trạng thái sức khỏe vào bảng KoiFish (Sync data)
    $healthStatus = 'Healthy';
    if (!empty($input['diseases']) && is_array($input['diseases']) && count($input['diseases']) > 0) {
        // Chuyển array of diseases thành string: "Nấm, Xuất huyết"
        $healthStatus = implode(", ", $input['diseases']); 
    }
    
    $sqlUpdateKoi = "UPDATE KoiFish SET HealthStatus = ?, Remarks = CONCAT(IFNULL(Remarks, ''), ' | AI Check: ', ?) WHERE FishID = ? AND PondID IN (SELECT PondID FROM Pond WHERE UserID = ?)";
    $stmtUpdate = $conn->prepare($sqlUpdateKoi);
    $stmtUpdate->bind_param("ssii", $healthStatus, $diagnosisSummary, $fishId, $userId);
    $stmtUpdate->execute();

    echo json_encode(['success' => true, 'message' => 'Đã lưu kết quả vào hồ sơ cá.']);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>