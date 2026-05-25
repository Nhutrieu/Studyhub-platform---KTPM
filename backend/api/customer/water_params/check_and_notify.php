<?php
// FILE: backend/api/customer/water_params/check_and_notify.php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';

// 1. Authentication and UserID Check
if (empty($_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['success'=>false, 'error'=>'Unauthorized']);
    exit;
}

$u = $_SESSION['username'];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
$st->close();

if (!$uid) {
    http_response_code(404);
    echo json_encode(['success'=>false, 'error'=>'User not found']);
    exit;
}

// 2. Receive and decode JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$pondId = $data['PondID'] ?? null;
$context = $data['Context'] ?? [];

if (!$pondId || !is_numeric($pondId)) {
    http_response_code(400);
    echo json_encode(['success'=>false, 'error'=>'Invalid Pond ID']);
    exit;
}

// 3. Expert Thresholds (Phải khớp với logic ở frontend)
$bands = [
    'pH'          => ['safe' => [6.5, 8.5], 'label' => "pH"],
    'Temperature' => ['safe' => [10, 32],  'label' => "Nhiệt độ"],
    'Ammonia'     => ['safe' => [0, 0.02], 'label' => "NH3"],
    'Nitrite'     => ['safe' => [0, 0.05], 'label' => "NO2"],
    'Nitrate'     => ['safe' => [0, 50],   'label' => "NO3"],
    'Oxygen'      => ['safe' => [5, 20],   'label' => "Oxy"],
    'Salt'        => ['safe' => [0, 0.5],  'label' => "Muối"],
    'KH'          => ['safe' => [4, 15],   'label' => "KH"],
    'GH'          => ['safe' => [4, 20],   'label' => "GH"],
    'CO2'         => ['safe' => [0, 20],   'label' => "CO2"]
];

$dangerousIssues = [];
$pondName = $context['PondName'] ?? 'Hồ của bạn';

// 4. Check for Dangerous Issues
foreach ($bands as $key => $config) {
    $val = $context[$key] ?? $context[strtolower($key)] ?? null;

    // Xử lý trường hợp KH được lưu là CH trong DB
    if ($key === 'KH') {
        $val = $context['CH'] ?? $val;
    } 

    if ($val !== null && $val !== '' && is_numeric($val)) {
        $num = (float)$val;
        
        // Check for DANGER (outside safe range)
        if ($num < $config['safe'][0] || $num > $config['safe'][1]) {
            $dangerousIssues[] = $config['label'] . " (" . $num . ")";
        }
    }
}

// 5. Notification Logic
if (count($dangerousIssues) > 0) {
    $issueList = implode(', ', $dangerousIssues);
    $title = "CẢNH BÁO NGUY HIỂM VỀ NƯỚC!";
    $message = "Hồ {$pondName} (ID {$pondId}) có vấn đề: {$issueList}. Cần kiểm tra ngay!";
    $link = "/HeThongChamSocCaKoi/frontend/customer/water_para.php?pond_id={$pondId}";

    // Kiểm tra xem đã gửi cảnh báo tương tự trong 6 giờ gần nhất chưa
    $checkSql = "SELECT NotiID FROM SystemNotifications 
                 WHERE UserID = ? 
                 AND Type = 'danger' 
                 AND Message = ? 
                 AND CreatedAt >= DATE_SUB(NOW(), INTERVAL 6 HOUR)
                 LIMIT 1";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("is", $uid, $message);
    $checkStmt->execute();
    $existingNoti = $checkStmt->get_result()->num_rows > 0;
    $checkStmt->close();

    if (!$existingNoti) {
        // Chèn thông báo mới
        $insertSql = "INSERT INTO SystemNotifications (UserID, Type, Title, Message, Link, IsRead) 
                      VALUES (?, 'danger', ?, ?, ?, 0)";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param("isss", $uid, $title, $message, $link);
        $inserted = $insertStmt->execute();
        $insertStmt->close();

        if ($inserted) {
            echo json_encode(['success' => true, 'notified' => true, 'issue_count' => count($dangerousIssues)]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save notification to DB']);
            exit;
        }
    }
}

// Thành công nhưng không cần thông báo mới
echo json_encode(['success' => true, 'notified' => false, 'issue_count' => count($dangerousIssues)]);

$conn->close();
?>