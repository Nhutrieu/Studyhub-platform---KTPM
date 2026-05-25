    <?php
    // /backend/api/customer/fish/list_by_pond.php
    // Trả về danh sách cá theo từng hồ (FishID, Length, Weight, …)

    error_reporting(E_ALL);
    ini_set('display_errors', '0');

    header('Content-Type: application/json; charset=utf-8');
    if (session_status() === PHP_SESSION_NONE) session_start();
    require_once '../../../../includes/db.php';

    function bail($msg, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {

        /* ===== 1. Kiểm tra đăng nhập ===== */
        if (empty($_SESSION['username'])) bail('Unauthorized', 401);

        $username = $_SESSION['username'];
        $st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
        $st->bind_param("s", $username);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        if (!$row) bail('Không tìm thấy user', 404);
        $user_id = (int)$row['UserID'];

        /* ===== 2. Kiểm tra pond_id ===== */
        if (empty($_GET['pond_id'])) bail('pond_id required', 400);
        $pond_id = (int)$_GET['pond_id'];
        if ($pond_id <= 0) bail('pond_id invalid', 400);

        /* ===== 3. Kiểm tra quyền sở hữu hồ ===== */
        $st = $conn->prepare("SELECT PondID FROM Pond WHERE PondID=? AND UserID=?");
        $st->bind_param("ii", $pond_id, $user_id);
        $st->execute();
        if (!$st->get_result()->fetch_assoc()) bail('Forbidden', 403);

        /* ===== 4. Lấy danh sách cá theo hồ ===== */
        $sql = "
            SELECT 
                KF.FishID,
                KF.PondID,
                KF.Name,
                KF.Age,
                KF.Length,
                KF.Weight,
                KF.Color,
                KF.HealthStatus,
                KF.Sex,
                KF.Variety,
                DATE_FORMAT(KF.PondSince, '%d/%m/%Y') AS PondSince,
                KF.Breeder,
                KF.PurchasePrice,
                KF.Remarks,
                KF.ImageURL
            FROM KoiFish KF
            WHERE KF.PondID = ?
            ORDER BY KF.FishID DESC
        ";

        $st = $conn->prepare($sql);
        $st->bind_param("i", $pond_id);
        $st->execute();
        $res = $st->get_result();

        $list = [];
        while ($r = $res->fetch_assoc()) {
            // Ép kiểu đảm bảo JSON đúng format
            $r['Age']           = isset($r['Age']) ? (int)$r['Age'] : null;
            $r['Length']        = isset($r['Length']) ? (float)$r['Length'] : null;
            $r['Weight']        = isset($r['Weight']) ? (float)$r['Weight'] : null;
            $r['PurchasePrice'] = isset($r['PurchasePrice']) ? (float)$r['PurchasePrice'] : null;
            $list[] = $r;
        }

        echo json_encode([
            'success' => true,
            'pond_id' => $pond_id,
            'count'   => count($list),
            'kois'    => $list
        ], JSON_UNESCAPED_UNICODE);

    } catch (Throwable $e) {
        bail("Lỗi hệ thống: " . $e->getMessage(), 500);
    }
