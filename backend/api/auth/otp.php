<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\auth\otp.php
session_start();
header('Content-Type: application/json');

// ==========================================================
// CẤU HÌNH GỬI SMS (Dùng eSMS.vn) - GIỮ LẠI ĐỂ SAU NÀY DÙNG
// ==========================================================
const ESMS_API_KEY    = '03743ECF88C9768780BF4FD154A6C1'; 
const ESMS_SECRET_KEY = '24DEF2F29BAED9ADAC5A57D929FDF4';
const ESMS_BRANDNAME  = 'Baotrixemay'; 

function sendEsmsOTP($phone, $content) {
    $url = "http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get";
    
    $params = [
        'ApiKey'    => ESMS_API_KEY,
        'SecretKey' => ESMS_SECRET_KEY,
        'Phone'     => $phone,
        'Content'   => $content,
        'SmsType'   => 2, 
        'Brandname' => ESMS_BRANDNAME
    ];

    $queryUrl = $url . '?' . http_build_query($params);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $queryUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) return ['status' => 'error', 'message' => "cURL: " . $err];
    
    $result = json_decode($response, true);
    
    if (isset($result['CodeResponse']) && $result['CodeResponse'] == 100) {
        return ['status' => 'success'];
    } else {
        $msg = $result['ErrorMessage'] ?? 'Unknown';
        $code = $result['CodeResponse'] ?? 'N/A';
        return ['status' => 'error', 'message' => "eSMS ($code): $msg"];
    }
}
// ==========================================================

$action = $_POST['action'] ?? '';
$phone  = $_POST['phone'] ?? '';
$otp    = $_POST['otp'] ?? '';

// --- 1. GỬI OTP (CHẾ ĐỘ TEST CỨNG 123456) ---
if ($action === 'send') {
    if (!preg_match('/^0[0-9]{9}$/', $phone)) {
        echo json_encode(['success' => false, 'error' => 'SĐT không hợp lệ']); exit;
    }

    // 🔥 HARDCODE MÃ CỐ ĐỊNH ĐỂ TEST
    $genOtp = 123456; 
    
    $_SESSION['otp_code'] = $genOtp;
    $_SESSION['otp_phone'] = $phone;
    $_SESSION['otp_verified'] = false;
    
    /* --- TẠM THỜI TẮT GỬI THẬT ĐỂ TRÁNH LỖI NHÀ MẠNG ---
       $content = "$genOtp la ma xac thuc cua ban"; 
       $result = sendEsmsOTP($phone, $content);
    */

    // Luôn trả về thành công để frontend chạy tiếp
    echo json_encode([
        'success' => true, 
        'message' => "Đã gửi mã xác thực (Mã test mặc định: $genOtp)"
    ]);
} 

// --- 2. XÁC THỰC OTP ---
elseif ($action === 'verify') {
    if (!isset($_SESSION['otp_code']) || $phone !== $_SESSION['otp_phone']) {
        echo json_encode(['success' => false, 'error' => 'Thông tin không khớp hoặc chưa gửi mã.']); exit;
    }

    if ((int)$otp === (int)$_SESSION['otp_code']) {
        $_SESSION['otp_verified'] = true;
        // Update DB nếu cần...
        if (isset($_SESSION['userid'])) {
            require_once '../../../includes/db.php';
            $uid = $_SESSION['userid'];
            // Cập nhật SĐT và trạng thái đã xác thực
            $stmt = $conn->prepare("UPDATE Users SET Phone = ?, IsPhoneVerified = 1 WHERE UserID = ?");
            $stmt->bind_param("si", $phone, $uid);
            $stmt->execute();
        }
        echo json_encode(['success' => true, 'message' => 'Xác thực thành công!']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Mã OTP sai .']);
    }
}
?>