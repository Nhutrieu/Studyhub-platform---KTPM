<?php
// =============================================================================
// FILE: backend/api/customer/feeding/ai_learn.php
// MODULE: AI Learning Core (Feeding Insight Generator)
// VERSION: V3.5 - ROBUST EDITION (Full Comments & Explicit Logic)
// AUTHOR: KoiCare System Dev Team
// 
// DESCRIPTION: 
//    1. Chạy định kỳ (Cron) hoặc Trigger từ Web để phân tích dữ liệu 7 ngày qua.
//    2. Tính toán các chỉ số hành vi: Tỷ lệ tuân thủ, Tỷ lệ dư cám, Tỷ lệ quên nhập.
//    3. Tính toán tăng trưởng thực tế (Có bộ lọc nhiễu thông minh).
//    4. Ra quyết định điều chỉnh (Delta) cho chu kỳ tiếp theo.
// =============================================================================

header('Content-Type: application/json; charset=utf-8');

// Load DB connection
require_once '../../../../includes/db.php';

// =============================================================================
// 1. HELPER FUNCTIONS (CÁC HÀM HỖ TRỢ)
// =============================================================================

/**
 * Trả về lỗi JSON và dừng chương trình
 */
function bail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false, 
        'error' => $msg
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Giới hạn giá trị trong khoảng min/max
 */
function clamp($v, $min, $max) {
    return max($min, min($max, $v));
}

// =============================================================================
// 2. CONFIGURATION & AUTHENTICATION (CẤU HÌNH & XÁC THỰC)
// =============================================================================

// Kiểm tra xem đang chạy CLI hay Web
$isCli   = (php_sapi_name() === 'cli');
$cronKey = isset($_GET['cron_key']) ? $_GET['cron_key'] : null;

// Key bảo mật cho Cron Job (Để gọi tự động mà không cần login)
$EXPECTED_CRON_KEY = '@Learn01060501'; 

// Xác định chế độ chạy: Cron All (Admin/System) hay User Trigger
$isCronAll = $isCli || ($cronKey && $cronKey === $EXPECTED_CRON_KEY);
$uid = null;

// Nếu KHÔNG PHẢI Cron Job (tức là gọi từ Web UI bởi User) -> Bắt buộc kiểm tra Login
if (!$isCronAll) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (empty($_SESSION['username'])) {
        bail('Unauthorized: Please login first.', 401);
    }

    // Lấy UserID từ Database
    $st = $conn->prepare("SELECT UserID FROM Users WHERE Username = ?");
    $st->bind_param("s", $_SESSION['username']);
    $st->execute();
    $result = $st->get_result();
    $userRow = $result->fetch_assoc();
    
    $uid = $userRow['UserID'] ?? null;
    
    if (!$uid) {
        bail('Unauthorized: User not found.', 401);
    }
}

// Cho phép lọc theo từng hồ cụ thể (Optional param)
$pond_id_filter = isset($_GET['pond_id']) ? intval($_GET['pond_id']) : 0;

// =============================================================================
// 3. DATA PREPARATION (CHUẨN BỊ DỮ LIỆU THỜI GIAN)
// =============================================================================

// Khung thời gian phân tích: 7 ngày gần nhất (Không tính hôm nay vì chưa hết ngày)
$to   = new DateTime();               
$from = (clone $to)->modify("-7 days"); 
$fromStr = $from->format("Y-m-d") . " 00:00:00";

// =============================================================================
// 4. MAIN QUERY: AGGREGATE FEEDING DATA (TỔNG HỢP DỮ LIỆU CHO ĂN)
// =============================================================================
// Query này thực hiện các nhiệm vụ:
// - Gom nhóm theo Hồ (PondID) và Ngày (d).
// - Tính tổng lượng đề xuất (exp_sum).
// - Tính tổng lượng thực tế (given_sum).
// - Đếm số cữ đã thực hiện (executed_count).
// - Đếm số cữ bị bỏ quên (missing_events).
// - Đếm số cữ có báo Dư cám (leftover_count).

$sql = "
    SELECT
      fp.PondID,
      DATE(fe.ScheduledAt) AS d,
      SUM(fe.AmountExpected) AS exp_sum,
      SUM(COALESCE(fe.AmountGiven, 0)) AS given_sum,
      COUNT(*) AS events_count,
      
      -- Đếm số cữ đã nhập liệu (AmountGiven khác NULL)
      SUM(CASE 
            WHEN fe.AmountGiven IS NOT NULL THEN 1 
            ELSE 0 
          END) AS executed_count,
      
      -- Đếm số cữ quên nhập (AmountGiven là NULL)
      SUM(CASE 
            WHEN fe.AmountGiven IS NULL THEN 1 
            ELSE 0 
          END) AS missing_events,
      
      -- Đếm số cữ có đánh dấu Dư Cám (LeftoverFlag = 1)
      SUM(CASE 
            WHEN fe.LeftoverFlag = 1 THEN 1 
            ELSE 0 
          END) AS leftover_count

    FROM FeedingEvent fe
    JOIN FeedingPlan fp ON fe.PlanID = fp.PlanID
    JOIN Pond p ON fp.PondID = p.PondID
    WHERE 
    (
        fp.Status != 'cancelled'
        OR
        -- Với plan hủy, chỉ lấy những cữ đã nhập để ghi nhận công sức
        (fp.Status = 'cancelled' AND fe.AmountGiven IS NOT NULL)
    )
";

$types  = "";
$params = [];

// Nếu chạy theo User (Web Mode), thêm điều kiện UserID
if (!$isCronAll) {
    $sql    .= " AND p.UserID = ? ";
    $types  .= "i";
    $params[] = $uid;
}

// Điều kiện thời gian
$sql    .= " AND fe.ScheduledAt >= ? ";
$types  .= "s";
$params[] = $fromStr;

// Điều kiện lọc hồ cụ thể (nếu có)
if ($pond_id_filter > 0) {
    $sql    .= " AND fp.PondID = ? ";
    $types  .= "i";
    $params[] = $pond_id_filter;
}

$sql .= " GROUP BY fp.PondID, DATE(fe.ScheduledAt) ORDER BY fp.PondID, d ";

// Thực thi Query
$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$res = $stmt->get_result();

// Gom nhóm kết quả vào mảng PHP
$byPond = [];
while ($r = $res->fetch_assoc()) {
    $pid = intval($r['PondID']);
    if (!isset($byPond[$pid])) {
        $byPond[$pid] = [];
    }
    $byPond[$pid][] = $r;
}

// Nếu không có dữ liệu -> Kết thúc sớm
if (empty($byPond)) {
    echo json_encode([
        'success' => true,
        'mode'    => $isCronAll ? 'cron' : 'user',
        'message' => 'No feeding data found in the last 7 days.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// =============================================================================
// 5. FUNCTION: GROWTH CALCULATION (TÍNH TĂNG TRƯỞNG & LỌC NHIỄU)
// =============================================================================

function calc_growth_pct(mysqli $conn, int $pondId): ?float {
    // Logic: Lấy cân nặng mới nhất (Latest) và cân nặng cũ (Previous - cách ~15 ngày)
    // Để tính % thay đổi.
    
    $sql = "
    SELECT 
      k.FishID,
      gh_latest.Weight AS w_latest,
      gh_prev.Weight   AS w_prev
    FROM KoiFish k
    
    -- Join lấy bản ghi cân nặng mới nhất
    LEFT JOIN KoiGrowthHistory gh_latest
      ON gh_latest.FishID = k.FishID
     AND gh_latest.MeasuredAt = (
          SELECT MAX(x.MeasuredAt) 
          FROM KoiGrowthHistory x 
          WHERE x.FishID = k.FishID
     )
     
    -- Join lấy bản ghi cân nặng cũ (cách ít nhất 15 ngày)
    LEFT JOIN KoiGrowthHistory gh_prev
      ON gh_prev.FishID = k.FishID
     AND gh_prev.MeasuredAt = (
          SELECT MAX(y.MeasuredAt)
          FROM KoiGrowthHistory y
          WHERE y.FishID = k.FishID
            AND y.MeasuredAt < DATE_SUB(gh_latest.MeasuredAt, INTERVAL 15 DAY)
     )
    WHERE k.PondID = ?
    ";

    $st = $conn->prepare($sql);
    $st->bind_param("i", $pondId);
    $st->execute();
    $rs = $st->get_result();

    $sumPct = 0;
    $count  = 0;

    while ($r = $rs->fetch_assoc()) {
        if ($r['w_latest'] && $r['w_prev'] && $r['w_prev'] > 0) {
            
            // Công thức: ((Mới - Cũ) / Cũ) * 100
            $pct = (($r['w_latest'] - $r['w_prev']) / $r['w_prev']) * 100;
            $prevWeight = floatval($r['w_prev']); // kg

            // -----------------------------------------------------------
            // [DYNAMIC THRESHOLD V3.4 - BỘ LỌC NHIỄU THÔNG MINH]
            // -----------------------------------------------------------
            
            // 1. NGƯỠNG TĂNG (Upper Bound):
            // - Cá bột/Tosai (< 0.15kg tức 150g): Có thể lớn rất nhanh -> Cho phép +300%
            // - Cá lớn (>= 0.15kg): Không thể lớn đột biến -> Giới hạn +50%
            $maxGrowth = ($prevWeight < 0.15) ? 300.0 : 50.0;
            
            // 2. NGƯỠNG GIẢM (Lower Bound):
            // - Chấp nhận giảm tới -30% để bao quát trường hợp:
            //   + Cá đẻ trứng (xả trứng giảm ~20%)
            //   + Phẫu thuật / Nhịn ăn chữa bệnh
            // - Nếu giảm sâu hơn -30% (ví dụ nhập sai 5kg thành 0.5kg) -> Coi là lỗi nhập liệu.
            $minGrowth = -30.0; 

            // Kiểm tra: Nếu nằm ngoài khoảng cho phép -> Bỏ qua (Skip)
            if ($pct > $maxGrowth || $pct < $minGrowth) {
                continue; 
            }

            $sumPct += $pct;
            $count++;
        }
    }

    if ($count > 0) {
        return $sumPct / $count; // Trả về % tăng trưởng trung bình
    }
    
    return null; // Không đủ dữ liệu
}

// =============================================================================
// 6. MAIN ANALYSIS LOOP (VÒNG LẶP PHÂN TÍCH CHÍNH)
// =============================================================================

$results = [];

foreach ($byPond as $pondId => $rows) {
    $days = count($rows);

    // Khởi tạo các biến tổng hợp
    $t_exp      = 0; // Tổng lượng dự kiến
    $t_given    = 0; // Tổng lượng thực tế
    $t_executed = 0; // Tổng số lần thực hiện
    $t_total_ev = 0; // Tổng số event
    $t_leftover = 0; // Tổng số lần dư cám

    $over   = 0; // Số ngày cho ăn quá nhiều (>110%)
    $under  = 0; // Số ngày cho ăn quá ít (<90%)
    $stable = 0; // Số ngày ổn định

    // Duyệt qua từng ngày dữ liệu
    foreach ($rows as $r) {
        $exp = floatval($r['exp_sum']);
        $giv = floatval($r['given_sum']);
        
        // Phân loại trạng thái ngày
        if ($exp > 0) {
            $ratio = $giv / $exp;
            if ($ratio >= 1.10) {
                $over++;
            } elseif ($ratio <= 0.90) {
                $under++;
            } else {
                $stable++;
            }
        }

        // Cộng dồn
        $t_exp      += $exp;
        $t_given    += $giv;
        $t_executed += intval($r['executed_count']);
        $t_total_ev += intval($r['events_count']);
        $t_leftover += intval($r['leftover_count']);
    }

    // Nếu không có dữ liệu expected nào, bỏ qua hồ này
    if ($t_exp <= 0) continue;

    // Tính toán các chỉ số trung bình
    $avgExp   = $t_exp / $days;
    $avgGiven = $t_given / $days;
    $avgRatio = $t_given / $t_exp;  // Tỷ lệ thực hiện chung

    // [METRICS V3.0]
    // 1. Tỷ lệ thiếu dữ liệu (Missing Data %)
    $missingDataPct = ($t_total_ev > 0) ? (1.0 - ($t_executed / $t_total_ev)) * 100 : 0;
    
    // 2. Tỷ lệ dư cám (Leftover %)
    $leftoverPct    = ($t_executed > 0) ? ($t_leftover / $t_executed) * 100 : 0;

    // Lấy dữ liệu tăng trưởng (Đã qua bộ lọc nhiễu)
    $growth = calc_growth_pct($conn, $pondId);

    // -------------------------------------------------------------------------
    // [AI DECISION CORE] - LOGIC RA QUYẾT ĐỊNH
    // -------------------------------------------------------------------------
    
    // Delta cơ bản: Dựa trên thói quen cho ăn
    $delta = ($avgRatio - 1.0) * 100;
    
    // Giới hạn Delta cơ bản trong khoảng [-15%, +15%]
    $delta = clamp($delta, -15, 15);

    $warningLevel = "ok";
    $warningCode  = "stable";
    $advice       = "";

    // --- KỊCH BẢN A: ĂN ÍT DO DƯ CÁM (LEFTOVER ISSUE) ---
    // User cho ăn ít (<90%) VÀ Báo dư thường xuyên (>20%)
    // -> Kết luận: Cá yếu hoặc nước bẩn, không ăn hết.
    // -> Hành động: Giảm mạnh khẩu phần.
    if ($avgRatio < 0.90 && $leftoverPct >= 20) {
        $delta = -15.0; // Ép giảm 15%
        $warningLevel = "warning";
        $warningCode  = "underfeed_leftover";
        $advice = "Phát hiện dư cám thường xuyên ({$leftoverPct}%). Hệ thống tự động giảm khẩu phần để bảo vệ chất lượng nước.";
    }
    
    // --- KỊCH BẢN B: ĂN ÍT DO QUÊN NHẬP (MISSING DATA) ---
    // User cho ăn ít (<90%) NHƯNG Thiếu dữ liệu (>30%) và Ít báo dư
    // -> Kết luận: User bận, quên nhập liệu. Cá vẫn khỏe.
    // -> Hành động: Giữ nguyên mức tham chiếu (Reset Delta về 0).
    elseif ($avgRatio < 0.90 && $missingDataPct >= 30) {
        $delta = 0.0; 
        $warningLevel = "info";
        $warningCode  = "missing_data";
        $advice = "Phát hiện thiếu dữ liệu nhập liệu ({$missingDataPct}%). Hệ thống giữ nguyên mức tham chiếu để đảm bảo cá đủ chất.";
    }
    
    // --- KỊCH BẢN C: ĂN NHIỀU (OVERFEED) ---
    elseif ($avgRatio > 1.10) {
        // Nếu ăn nhiều mà KHÔNG lớn (Growth < 1%) -> Lãng phí
        if ($growth !== null && $growth < 1.0) {
             $delta = -5.0; // Cắt giảm nhẹ
             $warningLevel = "warning";
             $warningCode  = "overfeed_no_growth";
             $advice = "Cá được cho ăn nhiều nhưng tăng trưởng thấp. Vui lòng kiểm tra lại chất lượng nước.";
        } else {
             // Ăn nhiều, tăng trưởng tốt -> Hỗ trợ thúc size
             $warningLevel = "info";
             $warningCode  = "overfeed_trend";
             $delta = 5.0; // Tăng nhẹ 5%
        }
    }
    
    // --- KỊCH BẢN D: ỔN ĐỊNH HOẶC KHÁC ---
    else {
        if ($avgRatio < 0.90) {
             $warningCode = "underfeed_trend";
             $warningLevel = "info";
        }
    }

    // Clamp lần cuối: Không bao giờ điều chỉnh quá ±20% để tránh sốc
    $delta = clamp($delta, -20, 20);

    // -------------------------------------------------------------------------
    // 7. SAVE INSIGHT TO DATABASE
    // -------------------------------------------------------------------------
    $ins = $conn->prepare("
        INSERT INTO FeedingInsight
        (PondID, FromDate, ToDate, Days, Samples,
         AvgExpected, AvgGiven, AvgRatio,
         OverfeedDays, UnderfeedDays, StableDays,
         GrowthPct, SuggestedDeltaPct,
         WarningLevel, WarningCode, AdviceText)
        VALUES (?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?)
    ");

    $samples = $t_total_ev; 
    $fd = $from->format("Y-m-d");
    $td = $to->format("Y-m-d");

    // Bind 16 tham số
    $ins->bind_param(
        "issiidddiiiddsss",
        $pondId, $fd, $td, $days, $samples,
        $avgExp, $avgGiven, $avgRatio,
        $over, $under, $stable,
        $growth, $delta,
        $warningLevel, $warningCode, $advice
    );
    
    if ($ins->execute()) {
        $results[] = [
            'pond_id'          => $pondId,
            'suggested_delta'  => $delta,
            'warning_code'     => $warningCode,
            'growth_sanitized' => $growth,
            'missing_data_pct' => $missingDataPct,
            'leftover_pct'     => $leftoverPct
        ];
    }
}

// =============================================================================
// 8. FINAL OUTPUT RESPONSE
// =============================================================================

echo json_encode([
    'success' => true,
    'mode'    => $isCronAll ? 'cron' : 'user',
    'message' => 'AI learning completed successfully (V3.5 Robust).',
    'items'   => $results
], JSON_UNESCAPED_UNICODE);

?>