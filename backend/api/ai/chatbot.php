<?php
header('Content-Type: application/json; charset=utf-8');

// 🔑 API key của bạn (Nên được lưu trữ an toàn hơn trong môi trường Production)
$api_key = 'AIzaSyA3ZyLAlqboXcCGqI7Sliq54VIi2_tqXLA';

// 📥 Lấy nội dung người dùng nhập
$input = json_decode(file_get_contents('php://input'), true);
$prompt = trim($input['prompt'] ?? '');
// Nhận toàn bộ lịch sử trò chuyện (dưới dạng mảng)
$history = $input['history'] ?? []; 

if (!$prompt) {
    echo json_encode(['error' => 'Prompt không hợp lệ.']);
    exit;
}

// 1. Thêm tin nhắn mới nhất của người dùng vào cuối lịch sử
$history[] = [
    "role" => "user",
    "parts" => [[ "text" => $prompt ]]
];

// 2. Định nghĩa lời nhắc hệ thống (Persona)
$system_instruction = "Bạn là trợ lý KoiCare chuyên nghiệp. Bạn luôn tư vấn ngắn gọn nhưng chuẩn xác (tối đa 3 câu) và luôn trả lời bằng tiếng Việt.";

// 3. Xây dựng payload với System Instruction và toàn bộ History trong Contents
$data = [
    "contents" => $history,
    "systemInstruction" => [
        "parts" => [[ "text" => $system_instruction ]]
    ]
];

// 🧠 Model mới nhất, ổn định (2025)
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$api_key";

// 🚀 Cấu hình cURL
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    // Đảm bảo JSON được mã hóa mà không thoát Unicode
    CURLOPT_POSTFIELDS => json_encode($data, JSON_UNESCAPED_UNICODE), 
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    // Tùy chọn nếu cần
    // CURLOPT_SSL_VERIFYPEER => false,
    // CURLOPT_SSL_VERIFYHOST => false,
]);

$response = curl_exec($ch);

// ⚠️ Kiểm tra lỗi kết nối
if (curl_errno($ch)) {
    echo json_encode(["error" => "CURL error: " . curl_error($ch)]);
    curl_close($ch);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ⚠️ Xử lý lỗi từ API
if ($httpCode !== 200) {
    echo json_encode([
        "error" => "Gemini API returned HTTP $httpCode",
        "response" => $response
    ]);
    exit;
}

// ✅ Trả dữ liệu JSON về cho frontend
echo $response;
?>