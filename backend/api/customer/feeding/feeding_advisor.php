<?php
// =================================================================================================
// FILE: backend/api/customer/feeding/feeding_advisor.php
// MODULE: FEEDING ADVISOR CORE (Bộ não tính toán thức ăn)
// VERSION: V3.8 - UPDATE HEAT SHOCK & MAX TEMP LIMIT
// -------------------------------------------------------------------------------------------------
// MÔ TẢ:
// 1. Tiếp nhận dữ liệu đầu vào: Hồ, Cá, Nước, Mục tiêu, Thời tiết.
// 2. Kiểm tra tính hợp lý (Sanity Check).
// 3. Phân tích rủi ro thời tiết (Weather Risk Analysis).
// 4. Tính toán khẩu phần chuẩn (Baseline - ZNA/Kodama).
// 5. Học từ lịch sử (AI Insight).
// 6. Xử lý chế độ thủ công (Manual Pro) với các cảnh báo thông minh.
// 7. [NEW V3.7] Kiểm tra độ mặn (Salt Safety) và cắt ăn nếu điều trị bệnh.
// 8. [NEW V3.8] Cập nhật logic Sốc nhiệt Nóng (Heat Shock) đồng bộ với Frontend.
// =================================================================================================

// Bật báo lỗi để debug (Tắt khi production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Thiết lập header JSON
header('Content-Type: application/json; charset=utf-8');

// Khởi động session nếu chưa có
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Kết nối Database
require_once '../../../../includes/db.php';

// =================================================================================================
// SECTION 1: HELPER FUNCTIONS (CÁC HÀM HỖ TRỢ)
// =================================================================================================

/**
 * Hàm trả về lỗi JSON và dừng thực thi
 */
function bail($msg, $code = 400, $extra = []) {
    http_response_code($code);
    echo json_encode(array_merge(['success' => false, 'error' => $msg], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Hàm giới hạn giá trị trong khoảng min/max
 */
function clamp($v, $min, $max) {
    return max($min, min($max, $v));
}

/**
 * [SANITY CHECK] Kiểm tra tính hợp lý của dữ liệu đầu vào
 * Mục đích: Chặn các con số ảo, vô lý (VD: Nhiệt độ 100 độ, Cá nặng 1 tấn)
 */
function validate_input_sanity($temp, $fishCount, $avgWeight) {
    $errors = [];
    
    // 1. Kiểm tra nhiệt độ (nếu có input)
    // Chấp nhận 0 độ (nước đóng băng/rất lạnh), nhưng chặn âm quá sâu hoặc quá nóng
    if ($temp !== null) {
        // [UPDATE V3.8] Giảm giới hạn nhiệt độ từ 42 xuống 38 cho an toàn
        if ($temp > 38) {
            $errors[] = "Nhiệt độ nước quá cao ($temp°C). Cảm biến có thể bị lỗi hoặc môi trường nguy hiểm.";
        }
        if ($temp < -2) {
            $errors[] = "Nhiệt độ nước quá thấp ($temp°C). Cảm biến có thể bị lỗi.";
        }
    }

    // 2. Kiểm tra số lượng cá
    if ($fishCount <= 0) {
        $errors[] = "Số lượng cá không hợp lệ ($fishCount con).";
    }

    // 3. Kiểm tra trọng lượng trung bình
    if ($avgWeight <= 0) {
        $errors[] = "Trọng lượng trung bình không hợp lệ ($avgWeight kg).";
    }
    // Chặn cá voi (Koi max tầm 40-50kg là kỷ lục thế giới, 60kg là dư giả để chặn)
    if ($avgWeight > 60) {
        $errors[] = "Trọng lượng cá quá lớn ($avgWeight kg/con). Vui lòng kiểm tra lại đơn vị nhập (kg hay g?).";
    }

    return $errors;
}

/**
 * [WATER SAFETY] Đánh giá an toàn chất lượng nước
 * Trả về hệ số: 1.0 (An toàn), 0.5 (Cảnh báo), 0.0 (Nguy hiểm - Cắt ăn)
 * [V3.7 UPDATE] Đã tích hợp kiểm tra Salt (Độ mặn)
 */
function get_water_safety_factor($w) {
    if (!$w) return 1.0; // Thiếu dữ liệu thì tạm chấp nhận

    $nh3  = floatval($w['Ammonia'] ?? 0);
    $no2  = floatval($w['Nitrite'] ?? 0);
    $ph   = isset($w['pH']) ? floatval($w['pH']) : 7.5;
    // [NEW] Lấy độ mặn từ bản ghi nước
    $salt = isset($w['Salt']) ? floatval($w['Salt']) : 0;

    // 1. MỨC NGUY HIỂM (Danger Zone) -> CẮT ĂN HOÀN TOÀN
    // NH3 >= 0.25mg/l là rất độc, cá stress nặng, không được ăn
    if ($nh3 >= 0.25) return 0.0; 
    // NO2 >= 0.2mg/l gây bệnh máu nâu, ngạt khí
    if ($no2 >= 0.2)  return 0.0; 
    
    // [NEW] Độ mặn cao (> 0.5%) thường là đang điều trị bệnh hoặc sốc -> CẮT ĂN
    if ($salt >= 0.5) return 0.0;

    // 2. MỨC CẢNH BÁO (Warning Zone) -> GIẢM ĂN 50%
    if ($nh3 >= 0.1 || $no2 >= 0.1) return 0.5; 
    
    // pH Shock
    if ($ph < 6.0 || $ph > 9.0) return 0.5;
    
    // [NEW] Độ mặn trung bình (0.3% - 0.5%) -> Giảm ăn để an toàn (thận trọng)
    if ($salt >= 0.3) return 0.5;

    // 3. AN TOÀN
    return 1.0; 
}

/**
 * Helper lấy text hiển thị chất lượng nước cho người dùng dễ hiểu
 */
function get_water_quality_text($factor) {
    if ($factor === 0.0) return "nguy hiểm (cắt ăn)";
    if ($factor < 1.0) return "kém (giảm ăn)";
    return "tốt";
}

/**
 * [V3.4] PHÂN TÍCH RỦI RO THỜI TIẾT (SMART WEATHER LOGIC)
 * Logic thông minh: So sánh nhiệt độ hiện tại và dự báo ngày mai để đưa ra quyết định.
 * [V3.8] Bổ sung logic Sốc Nhiệt Nóng (Heat Shock)
 */
function analyze_weather_risk($currentTemp, $forecast) {
    // Nếu không có dữ liệu dự báo, bỏ qua (coi như an toàn)
    if (!$forecast || !isset($forecast['tomorrow_min'])) {
        return ['level' => 'safe', 'factor' => 1.0, 'message' => '', 'forecast_desc' => 'Không có dự báo'];
    }

    $tomorrowMin = floatval($forecast['tomorrow_min']);
    
    // Ưu tiên dùng diff_check từ JS gửi lên (So sánh Avg vs Avg) để chính xác hơn
    // Nếu không có (API cũ) thì mới dùng tạm Min - Current
    $diff = isset($forecast['diff_check']) ? floatval($forecast['diff_check']) : ($tomorrowMin - $currentTemp);

    // --- RULE 1: SỐC NHIỆT LẠNH (Cold Snap) - Giảm sâu > 3 độ ---
    if ($diff <= -3.0) {
        // A. Nếu nhiệt độ đích vẫn ẤM (> 22°C): Ví dụ 27 -> 24
        // Cá vẫn tiêu hóa tốt, chỉ bị stress nhẹ do thay đổi môi trường -> Giảm ăn nhẹ (20%)
        if ($tomorrowMin >= 22.0) {
            return [
                'level' => 'warning', // Chỉ cảnh báo vàng
                'factor' => 0.8,      // Giảm 20% để an toàn
                'message' => "Dự báo ngày mai nhiệt độ giảm {$diff}°C (còn {$tomorrowMin}°C). Vì nước vẫn ấm, hệ thống chỉ giảm nhẹ khẩu phần để cá thích nghi.",
                'forecast_desc' => "Min ngày mai: {$tomorrowMin}°C (Biến động nhẹ)"
            ];
        }
        
        // B. Nếu nhiệt độ đích LẠNH (< 22°C): Ví dụ 20 -> 17 hoặc 15 -> 12
        // Nguy hiểm thực sự vì hệ tiêu hóa sẽ chậm lại đột ngột -> CẮT ĂN
        return [
            'level' => 'danger', // Cảnh báo ĐỎ
            'factor' => 0.0,     // CẮT ĂN HOÀN TOÀN
            'message' => "Cảnh báo SỐC LẠNH: Nhiệt độ ngày mai giảm sâu xuống {$tomorrowMin}°C. Hệ tiêu hóa của cá sẽ ngừng hoạt động. Vui lòng NGỪNG CHO ĂN.",
            'forecast_desc' => "Min ngày mai: {$tomorrowMin}°C (Nguy hiểm)"
        ];
    }

    // --- RULE 2: TRỜI CHUYỂN LẠNH NHẸ (Cooling) - Giảm 1-3 độ ---
    if ($diff < -1.0 && $tomorrowMin < 15.0) {
         return [
            'level' => 'warning',
            'factor' => 0.7, // Giảm 30%
            'message' => "Thời tiết lạnh sâu thêm. Giảm ăn để đảm bảo an toàn tiêu hóa.",
            'forecast_desc' => "Giảm nhẹ {$diff}°C"
        ];
    }

    // --- RULE 3: SỐC NHIỆT NÓNG (Heat Shock) - Tăng nhanh > 3 độ ---
    // [UPDATE] Ngưỡng nóng nguy hiểm điều chỉnh về 30 độ (User Request)
    if ($diff >= 3.0) {
        // Lấy Max ngày mai (nếu frontend có gửi, nếu không thì ước lượng)
        $tomorrowMax = isset($forecast['tomorrow_max']) ? floatval($forecast['tomorrow_max']) : ($currentTemp + $diff);

        // A. Nếu nhiệt độ đỉnh điểm >= 30°C (Ngưỡng nguy hiểm mới)
        // Oxy hòa tan thấp + Cá ăn nhiều => Dễ bị ngạt
        if ($tomorrowMax >= 30.0) {
            return [
                'level' => 'danger',
                'factor' => 0.0, // [FIX] CẮT ĂN (factor 0.0) vì trên 30 độ rất nguy hiểm
                'message' => "Cảnh báo SỐC NÓNG: Nhiệt độ dự báo lên tới {$tomorrowMax}°C (>30°C). Oxy hòa tan rất thấp. Vui lòng NGỪNG CHO ĂN và bật sục khí tối đa.",
                'forecast_desc' => "Max ngày mai: {$tomorrowMax}°C (QUÁ NÓNG)"
            ];
        }

        // B. Tăng nhiệt nhưng chưa tới ngưỡng chết (Ví dụ 20 -> 24)
        return [
            'level' => 'warning',
            'factor' => 1.0, 
            'message' => "Nhiệt độ ấm lên nhanh ({$diff}°C). Cá sẽ ăn mạnh, nhưng cần chú ý Oxy.",
            'forecast_desc' => "Tăng {$diff}°C (Ấm lên)"
        ];
    }

    // Mặc định: An toàn
    return ['level' => 'safe', 'factor' => 1.0, 'message' => '', 'forecast_desc' => 'Thời tiết ổn định'];
}

// =================================================================================================
// SECTION 2: CALCULATION LOGIC (CÔNG THỨC TÍNH TOÁN)
// =================================================================================================

/**
 * [V13] Công thức tính % thức ăn theo Nhiệt độ (Chuẩn ZNA/Kodama)
 * Sử dụng nội suy tuyến tính giữa các điểm mốc thay vì logic if-else cứng.
 */
function get_rate_by_temp_professional($t) {
    // 1. VÙNG NGỦ ĐÔNG (< 8°C): Enzyme ngừng hoạt động -> KHÔNG ĂN
    if ($t < 8.0) return 0.0; 

    // 2. VÙNG TIÊU HÓA CHẬM (8°C - 14°C): Chỉ duy trì sự sống
    if ($t < 15.0) {
        return 0.1 + ($t - 8) * (0.7 / 6.0); 
    }

    // 3. VÙNG HOẠT ĐỘNG (15°C - 19°C): Bắt đầu lớn
    if ($t < 20.0) {
        return 1.0 + ($t - 15) * (0.5 / 4.0);
    }

    // 4. VÙNG TỐI ƯU (20°C - 27°C): Max Growth
    if ($t <= 27.0) {
        if ($t <= 24) {
            // T=20->2.0%, T=24->3.0% (Tăng mạnh)
            return 2.0 + ($t - 20) * (1.0 / 4.0); 
        } else {
            // T=24->3.0%, T=27->2.5% (Giảm nhẹ khi bắt đầu nóng)
            return 3.0 - ($t - 24) * (0.5 / 3.0); 
        }
    }

    // 5. VÙNG STRESS NHIỆT CAO (27°C - 30°C): Oxy thấp, giảm ăn mạnh
    // [UPDATE] Giới hạn dừng ăn tại 30 độ (User Request)
    if ($t <= 30.0) {
        // T=27 -> 2.5%
        // T=30 -> 0.0% (Dừng hẳn)
        // Công thức nội suy: 2.5 - (deltaT) * (2.5 / 3.0)
        return 2.5 - ($t - 27) * (2.5 / 3.0);
    }

    // 6. VÙNG NGUY HIỂM (> 30°C): Ngừng ăn để bảo toàn Oxy
    return 0.0;
}

/**
 * [V13] Hàm tính toán tổng hợp (Master Logic)
 * Kết hợp Nhiệt độ, Chất lượng nước, Mục tiêu và Thể trạng.
 */
function compute_feed_rate($water_temp, $body_state, $water_item, $objective, $avg_weight) {
    // Bước 1: Lấy tỷ lệ cơ sở từ nhiệt độ (Chuẩn khoa học)
    $rate = get_rate_by_temp_professional($water_temp);

    // Bước 2: Hệ số an toàn nước (Quan trọng nhất)
    // Hàm này đã bao gồm logic check Salt (Muối)
    $water_safety = get_water_safety_factor($water_item);
    $rate *= $water_safety; 

    // Nếu nước độc hoặc quá nóng/lạnh -> Trả về 0 ngay
    if ($rate <= 0.05) return 0.0;

    // Bước 3: Điều chỉnh theo Mục tiêu (Objective)
    // Lưu ý: Mục tiêu chỉ có ý nghĩa khi nhiệt độ nằm trong vùng tiêu hóa tốt (15-30 độ)
    $can_optimize = ($water_temp >= 15 && $water_temp <= 30);
    
    if ($can_optimize) {
        switch ($objective) {
            case 'growth':
                // Tăng trưởng: Chỉ thúc khi nhiệt độ đẹp (20-27)
                if ($water_temp >= 20 && $water_temp <= 27) {
                    $rate *= 1.2; 
                } else {
                    $rate *= 1.0; // Nhiệt độ không đẹp thì growth = normal
                }
                break;
            case 'color':
                $rate *= 1.1; // Thức ăn tăng màu thường giàu đạm
                break;
            case 'maintenance':
                $rate *= 0.8; // Duy trì chỉ cần ăn ít
                break;
            case 'recovery':
                $rate *= 0.6; // Cá ốm dậy cần ăn nhẹ, dễ tiêu
                break;
            default: // custom
                $rate *= 1.0;
                break;
        }
    } else {
        // Nếu nhiệt độ khắc nghiệt (quá lạnh/quá nóng), ép về chế độ Maintenance/Recovery bất kể mục tiêu
        $rate *= 0.8; 
    }

    // Bước 4: Điều chỉnh theo Thể trạng (BCS)
    switch ($body_state) {
        case 'béo': 
            $rate *= 0.8; // Giảm cân
            break;
        case 'gầy': 
            $rate *= 1.1; // Vỗ béo
            break;
        default:    
            $rate *= 1.0; 
            break;
    }

    // Bước 5: Điều chỉnh theo Size cá (Cá nhỏ trao đổi chất nhanh hơn)
    if ($avg_weight < 0.2) $rate *= 1.15; // < 200g
    if ($avg_weight > 2.5) $rate *= 0.85; // > 2.5kg (Cá già ăn ít hơn)

    // Bước 6: Clamp cuối cùng (An toàn tuyệt đối 0% - 3.5%)
    return clamp($rate, 0.0, 3.5); 
}

// Hàm tạo output Fallback (Khi AI/Gemini lỗi)
function build_fallback_output($body_state, $water_quality, $objective, $fish_count, $avg_weight, $groups, $water_temp, $total_weight, $baseline_rate, $baseline_daily_g, $weatherRisk = null) {
    $split = [0.4, 0.3, 0.3];
    // [FIX] Dùng ngoặc nhọn để tách biến $water_temp khỏi ký tự °C
    $rec = "Hệ thống tạm dùng chế độ tính nội bộ (ZNA Standard). Tỷ lệ dựa trên nhiệt độ ({$water_temp}°C) và chất lượng nước ($water_quality).";
    
    // Nếu có weather risk, ghi đè recommendation để cảnh báo user
    if ($weatherRisk && $weatherRisk['level'] !== 'safe') {
        $rec = $weatherRisk['message'];
    }

    return [
        "success" => true,
        "mode" => "ai-fallback",
        "cached" => false,
        "provider" => "local-rule",
        "model" => null,
        "fish_count" => $fish_count,
        "avg_weight" => $avg_weight,
        "groups" => $groups,
        "body_state" => $body_state,
        "water_quality" => $water_quality,
        "feed_rate_pct" => $baseline_rate,
        "daily_feed_g" => $baseline_daily_g,
        "split" => $split,
        "baseline_rate_pct" => $baseline_rate,
        "baseline_daily_feed_g" => $baseline_daily_g,
        "recommendation" => $rec,
        "weather_risk" => $weatherRisk, // Trả về cảnh báo thời tiết
        "ai_warning" => "Gemini không phản hồi, áp dụng quy tắc nội bộ."
    ];
}

// =================================================================================================
// SECTION 3: MAIN PROCESS (XỬ LÝ CHÍNH)
// =================================================================================================

// 1. Nhận và Parse Input JSON
$input = json_decode(file_get_contents("php://input"), true);
if (!$input) bail("Invalid JSON");

$pond_id      = intval($input['pond_id'] ?? 0);
$objective    = $input['objective'] ?? 'growth';
$mode         = $input['mode'] ?? 'ai';       // "ai" hoặc "manual" (Manual Pro)
$forceRefresh = !empty($input['force_refresh']); // true nếu user bấm “Tính lại (bỏ cache)”

// [V3.0] Nhận dữ liệu thời tiết từ Frontend
$weatherData  = $input['weather_forecast'] ?? null;

if ($pond_id <= 0) bail("pond_id invalid");

// 2. Xác thực người dùng (Auth)
if (empty($_SESSION['username'])) bail("Unauthorized", 401);
$u = $_SESSION['username'];

$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$uid = $st->get_result()->fetch_assoc()['UserID'] ?? null;
if (!$uid) bail("Unauthorized", 401);

// Kiểm tra quyền sở hữu hồ
$chk = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
$chk->bind_param("ii", $pond_id, $uid);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) bail("Forbidden", 403);

// 3. Load Dữ liệu Cá (Fish Data)
$sql  = "SELECT Length, Weight FROM KoiFish WHERE PondID=?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $pond_id);
$stmt->execute();
$res = $stmt->get_result();

$kois = [];
while ($r = $res->fetch_assoc()) {
    $kois[] = [
        "Length" => floatval($r["Length"]),  // cm
        "Weight" => floatval($r["Weight"])   // kg
    ];
}
if (count($kois) == 0) bail("Hồ không có cá");

$fish_count   = count($kois);
$total_weight = 0;
$total_length = 0;

foreach ($kois as $k) {
    $total_weight += $k["Weight"];
    $total_length += $k["Length"];
}

$avg_weight = $total_weight / $fish_count;
$avg_length = $total_length / $fish_count;

// 4. Tính toán Thể trạng (BCS - Body Condition Score)
$groups = ["thin" => 0, "normal" => 0, "fat" => 0];

foreach ($kois as $k) {
    $L  = $k["Length"];
    $Wg = $k["Weight"] * 1000; // kg -> gram
    $bcs = ($L > 0) ? $Wg / pow($L, 3) : 0.015; 

    if ($bcs < 0.012)        $groups["thin"]++;
    elseif ($bcs > 0.018)    $groups["fat"]++;
    else                     $groups["normal"]++;
}

$body_state = "hỗn hợp";
if ($groups["fat"]    >= $fish_count * 0.7)      $body_state = "béo";
elseif ($groups["thin"]   >= $fish_count * 0.7)  $body_state = "gầy";
elseif ($groups["normal"] >= $fish_count * 0.7)  $body_state = "bình thường";

// 5. Load Thông số Nước & Xử lý Input (Water Params)
// [NEW V3.7] Bổ sung 'Salt' vào truy vấn để phục vụ logic an toàn
$sql = "
    SELECT Temperature, Ammonia, Nitrite, pH, Salt
    FROM WaterParameter
    WHERE PondID=?
    ORDER BY RecordedAt DESC
    LIMIT 1
";
$stm = $conn->prepare($sql);
$stm->bind_param("i", $pond_id);
$stm->execute();
$water_item = $stm->get_result()->fetch_assoc();

// [FIX QUAN TRỌNG V3.2] Logic ưu tiên input người dùng tuyệt đối (kể cả số 0)
// Kiểm tra xem user có gửi water_temp không
$hasInputTemp = isset($input['water_temp']) && $input['water_temp'] !== "" && $input['water_temp'] !== null;
$input_temp   = $hasInputTemp ? floatval($input['water_temp']) : null;

$db_temp      = isset($water_item['Temperature']) ? floatval($water_item['Temperature']) : 0;
$usingDefaultTemp = false;

if ($input_temp !== null) {
    // Nếu có input (kể cả 0), dùng input đè lên
    $water_temp = $input_temp;
    
    // Cập nhật lại mảng water_item ảo để tính toán safety factor chính xác theo nhiệt độ mới
    if ($water_item) $water_item['Temperature'] = $water_temp;
    else $water_item = ['Temperature' => $water_temp];
} else {
    // Nếu không input, dùng DB
    $water_temp = $db_temp;
    
    // Fallback nếu DB cũng không có hoặc lỗi
    if ($water_temp <= 0) {
        // Lưu ý: Nếu DB trả về 0 thì có thể là chưa đo bao giờ, ta fallback về 25 để tính demo
        // Nhưng nếu input người dùng nhập 0 thì ở trên đã catch rồi.
        $water_temp = 25.0; 
        $usingDefaultTemp = true;
        if ($water_item) $water_item['Temperature'] = 25.0;
    }
}

// 6. Sanity Check (Kiểm tra dữ liệu ảo lần cuối)
$sanityErrors = validate_input_sanity($water_temp, $fish_count, $avg_weight);
if (!empty($sanityErrors)) {
    bail(implode(" ", $sanityErrors)); 
}

// Lấy text chất lượng nước
// [V3.7] Logic này đã bao gồm check Salt từ hàm get_water_safety_factor
$water_safety = get_water_safety_factor($water_item);
$water_quality_text = get_water_quality_text($water_safety);

// [V3.4] PHÂN TÍCH THỜI TIẾT (Check sốc nhiệt THÔNG MINH)
$weatherRisk = analyze_weather_risk($water_temp, $weatherData);

// =================================================================================================
// SECTION 4: CORE CALCULATION (TÍNH TOÁN CƠ SỞ)
// =================================================================================================

// Tính Baseline Rate (Logic nội bộ ZNA)
// Lưu ý: ta truyền $water_item (chứa NH3, NO2, Salt) vào để tính safety factor
$baseline_rate      = compute_feed_rate($water_temp, $body_state, $water_item, $objective, $avg_weight);
$baseline_total_g   = $total_weight * ($baseline_rate / 100.0) * 1000.0;
$baseline_daily_g   = round($baseline_total_g, 2);
$default_split      = [0.4, 0.3, 0.3]; 

// =================================================================================================
// SECTION 5: MANUAL MODE (CHẾ ĐỘ THỦ CÔNG - ĐẦY ĐỦ LOGIC)
// =================================================================================================
if ($mode === "manual") {
    $manual_source = $input['manual_source'] ?? 'percent'; 
    $manual_value  = isset($input['manual_value']) ? floatval($input['manual_value']) : null;
    
    // [UPDATE V6.2] Lấy thêm Protein Pct từ input để cảnh báo Manual
    $protein_pct   = isset($input['protein_pct']) ? floatval($input['protein_pct']) : 35;

    if ($manual_value === null || $manual_value <= 0) {
        bail("Giá trị khẩu phần thủ công không hợp lệ.");
    }

    $manual_rate_pct = null;
    $manual_total_g  = null;

    // Tính toán theo nguồn nhập (Switch Case đầy đủ)
    switch ($manual_source) {
        case 'percent':
        default:
            $manual_source = 'percent';
            // Cho phép max 5% nếu user muốn ép, clamp để tránh số ảo
            $manual_rate_pct = clamp($manual_value, 0.0, 5.0);
            $manual_total_g  = $total_weight * ($manual_rate_pct / 100.0) * 1000.0;
            break;

        case 'per_fish':
            // Ví dụ: 2g / con -> Tổng = 2 * 50 = 100g
            $manual_total_g  = $manual_value * $fish_count;
            // Tính ngược lại %: (100g / Tổng trọng lượng) * 100
            $manual_rate_pct = ($manual_total_g / ($total_weight * 1000.0)) * 100.0;
            break;

        case 'total_grams':
            // Nhập trực tiếp tổng gram
            $manual_total_g  = $manual_value;
            $manual_rate_pct = ($manual_total_g / ($total_weight * 1000.0)) * 100.0;
            break;
    }

    $manual_total_g  = round($manual_total_g, 2);
    $manual_rate_pct = round($manual_rate_pct, 2);

    // Xử lý chia cữ thủ công (Manual Split)
    $manual_split = $default_split;
    $manual_meals_meta = null;

    if (!empty($input['manual_meals']) && is_array($input['manual_meals'])) {
        $meals  = $input['manual_meals'];
        $ratios = [];
        foreach ($meals as $m) {
            $ratios[] = isset($m['ratio']) ? floatval($m['ratio']) : 0.0;
        }
        $sum = array_sum($ratios);
        // Chuẩn hóa về 1 (100%)
        if ($sum > 0) {
            $normalized = [];
            foreach ($ratios as $r) {
                $normalized[] = $r / $sum;
            }
            $manual_split = $normalized;
        }
        $manual_meals_meta = $meals;
    }

    // Xây dựng Recommendation cho Manual Mode (Smart Manual)
    $rec = "Bạn đang sử dụng chế độ Manual Pro.";
    
    // 1. Cảnh báo quá tải
    if ($manual_rate_pct > 3.0) {
        $rec .= " [Lưu ý: Mức cho ăn >3% là rất cao, hãy kiểm tra hệ lọc.]";
    }
    
    // 2. Cảnh báo Protein/Nhiệt độ (Logic mới - Trợ lý ảo)
    // [FIX] Đã thêm dấu {} để sửa lỗi Undefined variable
    if ($water_temp < 18 && $protein_pct > 30) {
        $rec .= " [Cảnh báo: Nước lạnh ({$water_temp}°C), cám {$protein_pct}% đạm là quá cao, dễ gây khó tiêu.]";
    }
    
    // 3. Cảnh báo thời tiết
    if ($weatherRisk['level'] !== 'safe') {
        $rec .= " [Lưu ý thời tiết: " . $weatherRisk['message'] . "]";
    }

    $output = [
        "success"       => true,
        "mode"          => "manual",
        "provider"      => "user-manual",
        "model"         => null,
        "fish_count"    => $fish_count,
        "avg_weight"    => $avg_weight,
        "groups"        => $groups,
        "body_state"    => $body_state,
        "water_quality" => $water_quality_text,
        "water_temp"    => $water_temp, // Trả về nhiệt độ đã chốt (0 độ hay 20 độ)

        "feed_rate_pct" => $manual_rate_pct,
        "daily_feed_g"  => $manual_total_g,
        "split"         => $manual_split,

        "baseline_rate_pct"     => $baseline_rate,
        "baseline_daily_feed_g" => $baseline_daily_g,

        "manual_source" => $manual_source,
        "manual_value"  => $manual_value,
        "manual_meals"  => $manual_meals_meta,

        "weather_risk"  => $weatherRisk, // Trả về để UI hiện đỏ
        "recommendation"=> $rec
    ];

    echo json_encode($output, JSON_UNESCAPED_UNICODE);
    exit;
}

// =================================================================================================
// SECTION 6: AI MODE — HYBRID (BASELINE + INSIGHT + GEMINI + WEATHER)
// =================================================================================================

// 1. Lấy FeedingInsight mới nhất từ Database
$insight             = null;
$learning_delta_pct  = 0.0;
$learning_source     = "none";
$leftoverAnalysis    = ['is_issue' => false, 'missing_data_percent' => 0];

$insStmt = $conn->prepare("
    SELECT InsightID, FromDate, ToDate, Days, Samples,
           AvgExpected, AvgGiven, AvgRatio,
           OverfeedDays, UnderfeedDays, StableDays,
           GrowthPct, SuggestedDeltaPct,
           WarningLevel, WarningCode, AdviceText
    FROM FeedingInsight
    WHERE PondID=?
    ORDER BY ToDate DESC, CreatedAt DESC
    LIMIT 1
");
$insStmt->bind_param("i", $pond_id);
$insStmt->execute();
$insRow = $insStmt->get_result()->fetch_assoc();

if ($insRow) {
    $toDate = DateTime::createFromFormat('Y-m-d', $insRow['ToDate']);
    if ($toDate) {
        $now = new DateTime();
        $diffDays = (int)$now->diff($toDate)->format('%a');
        
        // Chỉ dùng Insight nếu nó còn mới (trong vòng 14 ngày)
        if ($diffDays <= 14) {
            $insight = $insRow;
            if ($insRow['SuggestedDeltaPct'] !== null) {
                $learning_delta_pct = (float)$insRow['SuggestedDeltaPct'];
                $learning_delta_pct = clamp($learning_delta_pct, -20.0, 20.0);
                $learning_source    = "insight";
            }
            
            // [V3.0] Trích xuất logic Leftover từ WarningCode (được tính ở ai_learn.php)
            if ($insRow['WarningCode'] === 'underfeed_leftover') {
                $leftoverAnalysis['is_issue'] = true;
                $leftoverAnalysis['leftover_percent'] = 20; // Dummy visual (hoặc lấy từ AdviceText nếu parse)
            }
            if ($insRow['WarningCode'] === 'missing_data') {
                $leftoverAnalysis['missing_data_percent'] = 30; // Dummy visual
            }
        }
    }
}

// 2. Tính Learning Rate (Điều chỉnh Baseline theo lịch sử)
if ($baseline_rate > 0 && $learning_delta_pct != 0.0) {
    // Công thức: Rate Mới = Rate Chuẩn * (1 + %Delta)
    $learning_rate = $baseline_rate * (1.0 + $learning_delta_pct / 100.0);
} else {
    $learning_rate = $baseline_rate;
}

// 3. [V3.0] ÁP DỤNG WEATHER RISK VÀO FINAL LEARNING RATE
// Nếu trời lạnh (Warning), giảm 30% trên kết quả đã học
// Nếu trời sốc (Danger), giảm về 0
$learning_rate *= $weatherRisk['factor'];

// 4. Giới hạn học: clamp an toàn lần cuối
$learning_rate = clamp($learning_rate, 0.0, 3.5);

$learning_total_g = $total_weight * ($learning_rate / 100.0) * 1000.0;
$learning_daily_g = round($learning_total_g, 2);

// Summary cho Prompt
$insightSummary = "Chưa có dữ liệu FeedingInsight gần đây.\n";
if ($insight) {
    $avgRatio = isset($insight['AvgRatio']) ? (float)$insight['AvgRatio'] : null;
    $ratioPct = $avgRatio !== null ? round($avgRatio * 100.0, 1) : null;
    $insightSummary = "DỮ LIỆU HỌC TRONG 7 NGÀY GẦN NHẤT (FeedingInsight):\n";
    $insightSummary .= "- Khoảng thời gian: {$insight['FromDate']} đến {$insight['ToDate']} ({$insight['Days']} ngày).\n";
    if ($ratioPct !== null) {
        $insightSummary .= "- Trung bình lượng thực tế / đề xuất: {$ratioPct}%.\n";
    }
    $insightSummary .= "- AI learning gợi ý điều chỉnh: {$learning_delta_pct}%.\n";
    if (!empty($insight['WarningCode'])) {
       $insightSummary .= "- Cảnh báo cũ: {$insight['WarningCode']}.\n";
    }
}

$weatherSummary = "THỜI TIẾT: {$weatherRisk['level']} ({$weatherRisk['message']})";

// =================================================================================================
// SECTION 7: CACHE SYSTEM & GEMINI CALL
// =================================================================================================

$cacheDir = __DIR__ . "/../../../../cache/feeding/";
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}

$cacheKeyData = [
    "pond"           => $pond_id,
    "obj"            => $objective,
    "fish_count"     => $fish_count,
    "total_weight"   => $total_weight,
    "avg_weight"     => $avg_weight,
    "groups"         => $groups,
    "water_temp"     => $water_temp,
    "weather_risk"   => $weatherRisk['level'], // Cache phân biệt theo rủi ro thời tiết
    "water_quality"  => $water_quality_text,
    "body_state"     => $body_state,
    "baseline_rate"  => $baseline_rate,
    "learning_delta_pct" => $learning_delta_pct,
    "learning_rate"  => $learning_rate,
    "insight_id"     => $insight['InsightID'] ?? null,
];

$cacheKey  = md5(json_encode($cacheKeyData));
$cacheFile = $cacheDir . $cacheKey . ".json";
$cacheTTL  = 300; // 5 phút

if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTTL)) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if (is_array($cached)) {
        $cached["cached"] = true;
        echo json_encode($cached, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 7.1. Gọi Gemini API
$apiKey = "AIzaSyA3ZyLAlqboXcCGqI7Sliq54VIi2_tqXLA"; 
$model  = "gemini-2.5-flash";

$baseline_rate_rounded  = round($baseline_rate, 2);
$learning_rate_rounded  = round($learning_rate, 2);
$baseline_daily_rounded = round($baseline_daily_g, 2);
$learning_daily_rounded = round($learning_daily_g, 2);

$prompt = "
Bạn là chuyên gia dinh dưỡng cá Koi (ZNA Standard).

{$insightSummary}
{$weatherSummary}

DỮ LIỆU HỒ:
- Số lượng cá: {$fish_count}
- Tổng trọng lượng: {$total_weight} kg
- Trọng lượng trung bình: {$avg_weight} kg/con
- Phân bố BCS: thin = {$groups["thin"]}, normal = {$groups["normal"]}, fat = {$groups["fat"]}
- Thể trạng tổng thể: {$body_state}
- Chất lượng nước: {$water_quality_text}, nhiệt độ: {$water_temp}°C
- Mục tiêu nuôi: {$objective}

HỆ THỐNG TÍNH TOÁN KHOA HỌC (BASELINE & ADJUSTED):
- Baseline Rate (ZNA Standard): {$baseline_rate_rounded}% trọng lượng/ngày.
- Final Adjusted Rate (Sau khi tính Weather & Insight): {$learning_rate_rounded}% trọng lượng/ngày.
- Lượng thức ăn/ngày tương ứng: baseline ≈ {$baseline_daily_rounded} g, final ≈ {$learning_daily_rounded} g.

YÊU CẦU:
1. Xác nhận tỷ lệ Final Adjusted Rate. Nếu Weather Risk là 'danger', bắt buộc rate = 0.
2. Viết recommendation (tiếng Việt, 3-4 câu):
   - Giải thích vì sao mức này phù hợp (nhắc đến thời tiết và lịch sử ăn).
   - Nếu nước 'nguy hiểm' hoặc 'kém', hãy cảnh báo.

KẾT QUẢ TRẢ VỀ PHẢI LÀ JSON ĐÚNG CẤU TRÚC:
{
  \"feed_rate_pct\": number,
  \"recommendation\": \"...\"
}
";

$payload = [
    "contents" => [
        ["role" => "user", "parts" => [["text" => $prompt]]]
    ],
    "generationConfig" => [
        "temperature"        => 0.4,
        "top_p"              => 1,
        "top_k"              => 1,
        "response_mime_type" => "application/json"
    ]
];

$url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ["Content-Type: application/json"],
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false, 
    CURLOPT_SSL_VERIFYHOST => 0
]);

$res  = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 7.2. Xử lý phản hồi từ Gemini
// Nếu lỗi mạng hoặc API -> Dùng Fallback
if ($err || $code >= 400) {
    $fb = build_fallback_output(
        $body_state, $water_quality_text, $objective, $fish_count, $avg_weight, 
        $groups, $water_temp, $total_weight, $baseline_rate, $baseline_daily_g, $weatherRisk
    );
    file_put_contents($cacheFile, json_encode($fb, JSON_UNESCAPED_UNICODE));
    echo json_encode($fb, JSON_UNESCAPED_UNICODE);
    exit;
}

// Parse JSON từ AI
$data = json_decode($res, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? "";
$text = preg_replace('/^```json\s*|\s*```$/', '', $text);
$ai   = json_decode($text, true);

// Nếu JSON AI lỗi -> dùng fallback nội bộ
if (!is_array($ai) || !isset($ai['feed_rate_pct'])) {
    $ai = [
        "feed_rate_pct" => $learning_rate,
        "recommendation" => $weatherRisk['level'] !== 'safe' ? $weatherRisk['message'] : "Đã tối ưu theo ZNA & Insight."
    ];
}

// =================================================================================================
// SECTION 8: FINAL OUTPUT (KẾT QUẢ CUỐI CÙNG)
// =================================================================================================

$ai_rate_raw = floatval($ai['feed_rate_pct']);

// Clamp logic an toàn
// Mở rộng range một chút so với baseline/learning để AI có không gian tùy biến (ví dụ ±10%)
$minFinal = max(0.0, $baseline_rate * 0.8, $learning_rate * 0.9);
$maxFinal = min(3.5, max(0.1, $baseline_rate * 1.2), max(0.1, $learning_rate * 1.1));

$final_rate = clamp($ai_rate_raw, $minFinal, $maxFinal);

// [V3.0] Double check Weather Risk (Không cho phép AI ghi đè logic an toàn khẩn cấp)
if ($weatherRisk['factor'] == 0.0) {
    $final_rate = 0.0;
}

$final_rate = round($final_rate, 2);

$final_total_g = $total_weight * ($final_rate / 100.0) * 1000.0;
$final_daily_g = round($final_total_g, 2);
$recommendation = trim($ai["recommendation"] ?? "");

// Tạo Insight Meta
$insightMeta = null;
if ($insight) {
    $fromDisplay = $insight['FromDate'];
    $toDisplay   = $insight['ToDate'];
    // Format date
    $dt = DateTime::createFromFormat('Y-m-d', $fromDisplay); if($dt) $fromDisplay = $dt->format('d/m/Y');
    $dt = DateTime::createFromFormat('Y-m-d', $toDisplay); if($dt) $toDisplay = $dt->format('d/m/Y');

    $insightMeta = [
        "InsightID"         => (int)$insight['InsightID'],
        "FromDate"          => $fromDisplay,
        "ToDate"            => $toDisplay,
        "Days"              => (int)$insight['Days'],
        "Samples"           => (int)$insight['Samples'],
        "AvgRatio"          => isset($insight['AvgRatio']) ? (float)$insight['AvgRatio'] : null,
        "GrowthPct"         => $insight['GrowthPct'] !== null ? (float)$insight['GrowthPct'] : null,
        "SuggestedDeltaPct" => $learning_delta_pct,
        "WarningLevel"      => $insight['WarningLevel'],
        "WarningCode"       => $insight['WarningCode'],
        "AdviceText"        => $insight['AdviceText'] ?? null,
        // Thêm thông tin leftover analysis cho Frontend vẽ UI
        "leftover_analysis" => $leftoverAnalysis
    ];
}

// Tạo cảnh báo AI Warning
$ai_warning = null;
$learning_note = null;

if ($usingDefaultTemp) {
    $ai_warning = "Hồ chưa có dữ liệu nhiệt độ, hệ thống sử dụng mức chuẩn 25°C. Kết quả có thể chưa tối ưu.";
}
if ($water_safety < 1.0) {
    $msg = "Chất lượng nước KÉM (dựa trên NH3/NO2/Temp/pH/Salt). Hệ thống đã tự động giảm mạnh lượng thức ăn.";
    $ai_warning = $ai_warning ? ($ai_warning . " " . $msg) : $msg;
}
if (abs($final_rate - $ai_rate_raw) >= 0.05) {
    $msg = "Tỷ lệ AI đề xuất đã được điều chỉnh về ngưỡng an toàn khoa học.";
    $ai_warning = $ai_warning ? ($ai_warning . " " . $msg) : $msg;
}
if ($learning_delta_pct != 0.0) {
    $learning_note = "Đã áp dụng điều chỉnh nhẹ theo hành vi ăn 7 ngày gần đây (FeedingInsight: {$learning_delta_pct}%).";
}

// Output
$output = [
    "success"            => true,
    "mode"               => "ai",
    "cached"             => false,
    "provider"           => "gemini",
    "model"              => $model,
    "fish_count"         => $fish_count,
    "avg_weight"         => $avg_weight,
    "groups"             => $groups,
    "body_state"         => $body_state,
    "water_quality"      => $water_quality_text,
    "water_temp"         => $water_temp, // [FIX] Trả về nhiệt độ đã được chốt (0 hoặc giá trị khác)

    "feed_rate_pct"      => $final_rate,
    "daily_feed_g"       => $final_daily_g,
    "split"              => $default_split,

    "baseline_rate_pct"      => $baseline_rate,
    "baseline_daily_feed_g"  => $baseline_daily_g,
    "learning_delta_pct"     => $learning_delta_pct,
    "learning_rate_pct"      => $learning_rate,
    "learning_daily_feed_g"  => $learning_daily_g,
    "learning_source"        => $learning_source,

    "weather_risk"       => $weatherRisk, // Quan trọng để frontend hiện đỏ
    "insight"            => $insightMeta,
    "recommendation"     => $recommendation
];

if ($ai_warning !== null) {
    $output["ai_warning"] = $ai_warning;
}
if ($learning_note !== null) {
    $output["learning_note"] = $learning_note;
}

// Lưu cache cho lần sau
file_put_contents($cacheFile, json_encode($output, JSON_UNESCAPED_UNICODE));

echo json_encode($output, JSON_UNESCAPED_UNICODE);
?>