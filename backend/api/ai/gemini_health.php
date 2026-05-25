<?php
/**
 * Gemini Health API - Xử lý các request tư vấn sức khỏe cá Koi
 * Endpoint: /backend/api/ai/gemini_health.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

/**
 * 👉 ĐÂY LÀ NƠI BRO DÁN API KEY
 * Tuyệt đối không public key — chỉ để local thôi
 */
$geminiApiKey = "AIzaSyBzId8kJnNWz8B2zIRgJbqjhy5F4aYr-3I";

if (empty($geminiApiKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Gemini API key not configured'
    ]);
    exit;
}

// Parse JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON input'
    ]);
    exit;
}

$action = $input['action'] ?? '';
$diseases = $input['diseases'] ?? [];
$userMessage = $input['message'] ?? '';

if (!in_array($action, ['treatment', 'chat'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid action. Use treatment or chat.'
    ]);
    exit;
}

// Build Gemini prompt
$prompt = "";

if ($action === "treatment") {

    if (empty($diseases)) {
        echo json_encode([
            'success' => false,
            'error' => 'No diseases provided'
        ]);
        exit;
    }

    $diseaseList = implode(", ", $diseases);

    $prompt = <<<PROMPT
Cá Koi bị: {$diseaseList}

Hãy đóng vai là 1 chuyên gia về Koi và viết **phác đồ điều trị HTML** cho cá Koi theo **đúng cấu trúc bên dưới**.   
Yêu cầu:
- Chỉ dùng các thẻ: <div>, <h3>, <h4>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <button>, <span>, <br>.
- Chỉ dùng thuộc tính: class, style.
- KHÔNG dùng <script>, <table>, <iframe>, <img>, hoặc thuộc tính sự kiện (onclick,...).
- **QUAN TRỌNG**: Thứ tự h4 phải là: "Chẩn đoán" → "Nguyên nhân" → "Cách điều trị chi tiết" → "Lưu ý quan trọng".
- Giới hạn tổng nội dung ~350 từ, nội dung chuyên môn và cụ thể.
- Giữ đúng format mẫu, điền nội dung thực tế.

Cấu trúc HTML MẪU PHẢI TRẢ VỀ:

<div class="treatment-summary">
  <h4>Tóm tắt điều trị:</h4>
  <ul>
    <li>Bước 1: Cách ly cá...</li>
    <li>Bước 2: Xử lý nước...</li>
    <li>Bước 3: Dùng thuốc...</li>
    <li>Bước 4: Theo dõi...</li>
  </ul>
  <button class="btn-show-details">
    <span class="material-icons-round">expand_more</span>
    Xem chi tiết phác đồ đầy đủ
  </button>
</div>

<div class="treatment-details" style="display:none">
  <div class="treatment-content">
    <h4>Chẩn đoán</h4>
    <p>Mô tả chi tiết tình trạng bệnh hiện tại của cá...</p>

    <h4>Nguyên nhân</h4>
    <p>Phân tích nguyên nhân gây bệnh (môi trường, dinh dưỡng, vi khuẩn...)...</p>

    <h4>Cách điều trị chi tiết</h4>
    <ul>
      <li><strong>Thuốc:</strong> Tên thuốc, liều lượng cụ thể, cách dùng</li>
      <li><strong>Thời gian:</strong> X ngày điều trị, tần suất</li>
      <li><strong>Chăm sóc:</strong> Hướng dẫn cụ thể</li>
    </ul>

    <h4>Lưu ý quan trọng</h4>
    <ul>
      <li>Điều gì cần tránh tuyệt đối</li>
      <li>Dấu hiệu xấu cần liên hệ bác sĩ thú y ngay</li>
      <li>Theo dõi hàng ngày những gì</li>
    </ul>
  </div>
</div>

Chỉ trả về HTML đúng cấu trúc trên, không thêm văn bản bên ngoài.
PROMPT;


}

if ($action === "chat") {

    if (empty($userMessage)) {
        echo json_encode([
            'success' => false,
            'error' => 'No message provided'
        ]);
        exit;
    }

    $context = !empty($diseases)
        ? "Cá của người dùng được phát hiện các vấn đề sau: " . implode(", ", $diseases) . "."
        : "Không phát hiện bệnh rõ ràng.";

    $prompt = <<<PROMPT
Bạn là trợ lý AI chuyên về cá Koi, tên là Koi Doctor AI.

Bối cảnh: {$context}
Người dùng hỏi: "{$userMessage}"

Trả lời ngắn gọn, thân thiện (40–100 từ).
PROMPT;
}

try {
    $result = callGeminiAPI($geminiApiKey, $prompt);

    echo json_encode([
        'success' => true,
        'action' => $action,
        'response' => $result
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/** Call Gemini API */
function callGeminiAPI($apiKey, $promptText)
{
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $promptText]
                ]
            ]
        ],
        "generationConfig" => [
            "temperature" => 0.7,
            "maxOutputTokens" => 1500
        ]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
        CURLOPT_RETURNTRANSFER => true
    ]);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        throw new Exception("cURL Error: " . curl_error($ch));
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $err = json_decode($response, true);
        $message = $err["error"]["message"] ?? "HTTP Error $httpCode";
        throw new Exception("Gemini API Error: $message");
    }

    $data = json_decode($response, true);

    return $data["candidates"][0]["content"]["parts"][0]["text"]
        ?? "AI không trả lời.";
}