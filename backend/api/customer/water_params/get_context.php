<?php
// FILE: backend/api/customer/water_params/get_context.php
// VERSION: V2.3 - EXPERT EDITION (Added CO2)
// DESCRIPTION: Triển khai chiến lược "Latest Known Value" để hợp nhất dữ liệu rời rạc cho Cards
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function fail($m) { echo json_encode(['success'=>false, 'error'=>$m]); exit; }

if (empty($_SESSION['username'])) fail('Unauthorized');
$pondId = (int)($_GET['pond_id'] ?? 0);
if ($pondId <= 0) fail('Missing PondID');

// Auth Check
$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;

$chk = $conn->prepare("SELECT 1 FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii", $pondId, $uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) fail('Forbidden');

// === LOGIC CORE: MERGE SPARSE DATA ===
// Lấy 50 bản ghi gần nhất để tìm giá trị hợp lệ cuối cùng của từng chỉ số
$sql = "SELECT * FROM WaterParameter WHERE PondID = ? ORDER BY RecordedAt DESC LIMIT 50";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $pondId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Template kết quả rỗng
$currentContext = [
    'LastUpdate' => null,
    'pH' => null, 'pH_At' => null,
    'Temperature' => null, 'Temperature_At' => null,
    'Ammonia' => null, 'Ammonia_At' => null,
    'Nitrite' => null, 'Nitrite_At' => null,
    'Nitrate' => null, 'Nitrate_At' => null,
    'Oxygen' => null, 'Oxygen_At' => null,
    'Salt' => null, 'Salt_At' => null,
    'KH' => null, 'KH_At' => null, // Mapping từ CH
    'GH' => null, 'GH_At' => null,
    'CO2' => null, 'CO2_At' => null // <--- Đã thêm CO2 vào đây
];

// Thời gian hiện tại
$now = time();
$ttl = 48 * 3600; // 48 giờ - Dữ liệu cũ hơn coi như expired

if (!empty($rows)) {
    // Set thời gian cập nhật của bản ghi mới nhất (để hiển thị Last Seen chung)
    $currentContext['LastUpdate'] = $rows[0]['RecordedAt'];

    // Duyệt qua các cột cần lấy giá trị
    // <--- Đã thêm 'CO2' vào danh sách fields
    $fields = ['pH', 'Temperature', 'Ammonia', 'Nitrite', 'Nitrate', 'Oxygen', 'Salt', 'CH', 'GH', 'CO2'];
    
    foreach ($fields as $field) {
        foreach ($rows as $row) {
            // Nếu bản ghi này có giá trị (không null, không rỗng)
            if (isset($row[$field]) && $row[$field] !== null && $row[$field] !== '') {
                // Kiểm tra TTL (Time To Live)
                $recTime = strtotime($row['RecordedAt']);
                if (($now - $recTime) <= $ttl) {
                    // Mapping CH -> KH cho frontend (Expert Terminology)
                    $key = ($field === 'CH') ? 'KH' : $field;
                    
                    $currentContext[$key] = (float)$row[$field];
                    $currentContext[$key . '_At'] = $row['RecordedAt']; // Lưu thời điểm cụ thể của chỉ số này
                }
                break; // Tìm thấy giá trị mới nhất rồi thì dừng quét ngược, sang field khác
            }
        }
    }
}

// --- INTELLIGENCE MONITORING LOGIC ---
// Đánh giá nhanh tình trạng để frontend highlight
$status = 'good';
$issues = [];

// Ngưỡng Expert (Hardcoded để đảm bảo tính nhất quán với JS)
if (($currentContext['Ammonia'] ?? 0) > 0.02) { $status = 'danger'; $issues[] = 'NH3 Độc tố cao'; }
if (($currentContext['Nitrite'] ?? 0) > 0.05) { $status = 'danger'; $issues[] = 'NO2 Độc tố cao'; }
if (($currentContext['Oxygen'] ?? 10) < 5)    { $status = 'danger'; $issues[] = 'Thiếu Oxy nghiêm trọng'; }

if (($currentContext['pH'] ?? 7) > 8.5 || ($currentContext['pH'] ?? 7) < 6.5) { 
    $status = ($status === 'danger') ? 'danger' : 'warning'; 
    $issues[] = 'pH biến động'; 
}

echo json_encode([
    'success' => true,
    'context' => $currentContext,
    'status' => $status,
    'issues' => $issues
], JSON_UNESCAPED_UNICODE);
?>