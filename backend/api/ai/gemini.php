<?php
header('Content-Type: application/json; charset=utf-8');
// API Key từ user cung cấp
$api_key = 'AIzaSyA3ZyLAlqboXcCGqI7Sliq54VIi2_tqXLA';

$input = json_decode(file_get_contents('php://input'), true);
$prompt = trim($input['prompt'] ?? '');

if (!$prompt) {
    echo json_encode(['error' => 'Prompt trống.']);
    exit;
}

// Context Injection: Định hình vai trò AI Expert
$systemInstruction = "Bạn là AI Expert của hệ thống KoiCare. 
Nhiệm vụ: Phân tích thông số nước và đưa ra giải pháp khẩn cấp.
Quy tắc:
1. Trả lời NGẮN GỌN (Dưới 100 từ).
2. Tập trung vào hành động (Ví dụ: Thay nước 30%, Ngừng cho ăn).
3. Giọng văn: Chuyên nghiệp, cảnh báo rõ ràng.
4. Định dạng: Sử dụng HTML (<b>, <ul>, <li>) để làm nổi bật ý chính.";

$data = [
  "contents" => [
    [
      "role" => "user",
      "parts" => [[ "text" => $systemInstruction . "\n\nCâu hỏi: " . $prompt ]]
    ]
  ]
];

$url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$api_key";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 30 // Timeout để tránh treo backend quá lâu
]);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo json_encode(["error" => "Lỗi kết nối AI: " . curl_error($ch)]);
    exit;
}
curl_close($ch);

echo $response;
?>