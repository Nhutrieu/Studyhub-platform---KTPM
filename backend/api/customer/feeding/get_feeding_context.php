<?php
header('Content-Type: application/json; charset=utf-8');
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../../includes/db.php';

function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_GET['pond_id'])) bail('pond_id required');
$pond_id = intval($_GET['pond_id']);
if ($pond_id <= 0) bail('pond_id invalid');

if (empty($_SESSION['username'])) bail('Unauthorized', 401);
$u = $_SESSION['username'];

$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail('Unauthorized', 401);

// kiểm tra quyền hồ
$chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii", $pond_id, $uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) bail('Forbidden', 403);

/* ===============================================================
   CACHE SYSTEM - auto detect change + invalidate
=============================================================== */
$cacheDir = __DIR__ . "/../../../cache/pond_context/";
if (!is_dir($cacheDir)) mkdir($cacheDir, 0777, true);

$cacheFile = $cacheDir . "pond_{$pond_id}.json";

/* Nếu có cache → load trước để kiểm tra */
$oldCache = null;
if (file_exists($cacheFile)) {
    $oldCache = json_decode(file_get_contents($cacheFile), true);
}

/* ===============================================================
   1. Lấy danh sách cá
=============================================================== */
$sqlFish = "SELECT Length, Weight FROM KoiFish WHERE PondID=?";
$stmt = $conn->prepare($sqlFish);
$stmt->bind_param("i", $pond_id);
$stmt->execute();
$res = $stmt->get_result();

$fish = [];
while ($r = $res->fetch_assoc()) {
    $fish[] = [
        "Length" => floatval($r["Length"]),
        "Weight" => floatval($r["Weight"])
    ];
}

$fishCount = count($fish);
if ($fishCount == 0) {
    echo json_encode([
        'success'=>true,
        'item'=>[
            'fish_count'=>0,
            'avg_weight'=>0,
            'water_temp'=>null,
            'protein_pct'=>35,
            'body_state'=>"unknown",
            'groups'=>["thin"=>0,"normal"=>0,"fat"=>0],
            'warning'=>"Hồ chưa có cá – không đủ dữ liệu để tính toán."
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ===============================================================
   2. Tính trung bình
=============================================================== */
$total_weight = 0;
$total_length = 0;

foreach ($fish as $f) {
    $total_weight += $f["Weight"];
    $total_length += $f["Length"];
}

$avgWeight = $total_weight / $fishCount;   // kg
$avgLength = $total_length / $fishCount;   // cm

/* ===============================================================
   3. Tính BCS chuẩn (gram/cm³)
=============================================================== */
$groups = ["thin"=>0, "normal"=>0, "fat"=>0];

foreach ($fish as $f) {
    $L = $f["Length"];
    $Wg = $f["Weight"] * 1000;

    $bcs = ($L > 0) ? $Wg / pow($L, 3) : 0.015;

    if ($bcs < 0.012)           $groups["thin"]++;
    else if ($bcs > 0.018)     $groups["fat"]++;
    else                        $groups["normal"]++;
}

// Xác định thể trạng hồ
$body_state = "hỗn hợp";
if ($groups["fat"] >= $fishCount * 0.7)       $body_state = "béo";
else if ($groups["thin"] >= $fishCount * 0.7) $body_state = "gầy";
else if ($groups["normal"] >= $fishCount * 0.7) $body_state = "bình thường";

/* ===============================================================
   4. Lấy thông số nước
=============================================================== */
// [MODIFIED] Thêm điều kiện AND RecordedAt >= (NOW() - INTERVAL 48 HOUR)
$sqlTemp = "
    SELECT Temperature, Ammonia, Nitrite
    FROM WaterParameter
    WHERE PondID=?
    AND RecordedAt >= (NOW() - INTERVAL 48 HOUR)
    ORDER BY RecordedAt DESC
    LIMIT 1
";
$stmt2 = $conn->prepare($sqlTemp);
$stmt2->bind_param("i", $pond_id);
$stmt2->execute();
$water = $stmt2->get_result()->fetch_assoc();

// Nếu không có dữ liệu trong 48h, $water sẽ là null, $water_temp sẽ là null
$water_temp = $water['Temperature'] ?? null;

$water_quality = "tốt";
if ($water) {
    if ($water['Ammonia'] > 0.1 || $water['Nitrite'] > 0.05) {
        $water_quality = "kém";
    } elseif ($water['Ammonia'] > 0.02 || $water['Nitrite'] > 0.02) {
        $water_quality = "trung bình";
    }
}


/* ===============================================================
   5. Tạo fingerprint để kiểm tra thay đổi
=============================================================== */
$fingerprint = md5(json_encode([
    'fish' => $fish,
    'water_temp' => $water_temp,
    'groups' => $groups
]));

/* Nếu cache tồn tại và fingerprint KHÔNG đổi → dùng cache */
if ($oldCache && ($oldCache['fingerprint'] ?? '') === $fingerprint) {
    echo json_encode([
        'success' => true,
        'item' => $oldCache['item']
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ===============================================================
   6. Chuẩn bị dữ liệu mới
=============================================================== */
$item = [
    'fish_count'=>$fishCount,
    'avg_weight'=>round($avgWeight, 3),
    'water_temp'=>$water_temp,
    'protein_pct'=>35,
    'body_state'=>$body_state,
    'groups'=>$groups,
    'water_quality'=>$water_quality
];

/* ===============================================================
   7. Lưu cache mới
=============================================================== */
file_put_contents($cacheFile, json_encode([
    'fingerprint' => $fingerprint,
    'item' => $item
], JSON_UNESCAPED_UNICODE));

/* ===============================================================
   8. Xuất dữ liệu
=============================================================== */
echo json_encode([
    'success'=>true,
    'item'=>$item
], JSON_UNESCAPED_UNICODE);

?>
