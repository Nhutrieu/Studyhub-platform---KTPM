<?php
// backend/api/ai/detect.php
header("Content-Type: application/json");

// URL Python Flask
$AI_API_URL = "http://127.0.0.1:5000/detect";

// Kiểm tra ảnh gửi lên
if (!isset($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Vui lòng tải lên một ảnh."]);
    exit;
}

// Đọc ảnh dạng base64
$imageData = file_get_contents($_FILES["image"]["tmp_name"]);
$base64 = base64_encode($imageData);

// Payload JSON gửi sang Python
$payload = json_encode([
    "image" => $base64
]);

// Gửi request sang Python server
$ch = curl_init($AI_API_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Content-Length: " . strlen($payload)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Parse JSON
$data = json_decode($response, true);

// Lỗi kết nối AI
if ($response === false || $httpCode !== 200) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Không kết nối được tới AI Server (HTTP $httpCode).",
        "error"   => $curlError
    ]);
    exit;
}

// Lỗi JSON từ Python
if (!$data || !isset($data["success"]) || $data["success"] === false) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $data["message"] ?? "Phản hồi JSON từ AI không hợp lệ."
    ]);
    exit;
}

/* ----------------------------------------------------
    TÊN TIẾNG VIỆT CHO CÁC BỆNH
----------------------------------------------------- */
$vnNames = [
    "fungus"        => "Nấm",
    "ulcer"         => "Loét da",
    "parasite"      => "Ký sinh trùng",
    "anchor_worm"   => "Sán neo",
    "fin_rot"       => "Thối vây",
    "red_spot"      => "Đốm đỏ / Xuất huyết",
    "popeye"        => "Mắt lồi (Popeye)"
];

/* ----------------------------------------------------
    MÔ TẢ TIẾNG VIỆT CHI TIẾT
----------------------------------------------------- */
$descriptions = [
    "fungus" => [
        "desc" => "Có khả năng cá bị nấm. Thường xuất hiện khi nước bẩn hoặc cá bị trầy xước.",
        "advice" => "Cách ly cá và tăng nồng độ muối nhẹ (0.3-0.5%). Duy trì nhiệt độ nước ổn định."
    ],

    "ulcer" => [
        "desc" => "Có dấu hiệu loét da do vi khuẩn, có thể lây lan nhanh.",
        "advice" => "Kiểm tra chất lượng nước ngay. Cách ly cá và theo dõi 2–3 ngày. Cân nhắc sử dụng thuốc kháng sinh."
    ],

    "parasite" => [
        "desc" => "Có khả năng bị ký sinh trùng ngoài da. Cá có thể cọ mình hoặc bơi bất thường.",
        "advice" => "Kiểm tra chất lượng nước (pH, NH3, NO2). Quan sát hành vi cá. Xem xét dùng thuốc trị ký sinh trùng."
    ],

    "anchor_worm" => [
        "desc" => "Nghi ngờ có sán neo bám trên da. Đây là ký sinh trùng dễ lây lan.",
        "advice" => "Cách ly cá ngay. Kiểm tra bằng mắt thường để xác nhận. Dùng nhíp vô trùng gỡ sán nếu thấy rõ."
    ],

    "fin_rot" => [
        "desc" => "Dấu hiệu thối vây do vi khuẩn hoặc stress từ môi trường nước.",
        "advice" => "Tăng oxy trong hồ. Thay 20-30% nước sạch. Hạn chế stress và kiểm tra chất lượng nước."
    ],

    "red_spot" => [
        "desc" => "Vùng da bị đỏ, viêm hoặc xuất huyết. Thường liên quan đến NH3/NO2 cao hoặc stress.",
        "advice" => "Kiểm tra ngay thông số nước (NH3, NO2, pH). Thay nước từng phần và tăng oxy. Giảm mật độ cá nếu quá đông."
    ],

    "popeye" => [
        "desc" => "Dấu hiệu mắt lồi do nhiễm khuẩn hoặc tích nước sau nhãn cầu.",
        "advice" => "Cách ly cá ngay. Tăng oxy và duy trì nước sạch. Theo dõi sát trong 48h. Cân nhắc dùng kháng sinh nếu không cải thiện."
    ]
];


/* ----------------------------------------------------
    GHÉP TÊN TIẾNG VIỆT + MÔ TẢ VÀO DATA TRẢ VỀ
----------------------------------------------------- */
if (!empty($data["detections"])) {
    foreach ($data["detections"] as &$det) {
        $cls = $det["class_name"];

        // Tên tiếng Việt
        $det["display_name"] = $vnNames[$cls] ?? ucfirst($cls);

        // Mô tả tiếng Việt (trả về object với desc và advice)
        $det["description"] = $descriptions[$cls] ?? [
            "desc" => "Khu vực này có dấu hiệu bất thường.",
            "advice" => "Theo dõi thêm và kiểm tra chất lượng nước."
        ];
    }
}

// Trả kết quả về client
echo json_encode($data);
?>