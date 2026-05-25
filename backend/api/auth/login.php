<?php
require_once "../../../includes/db.php";
require_once "../../../includes/security/lock_helper.php";
session_start();

// Trang login UI
$loginPage = "/HeThongChamSocCaKoi/frontend/auth/login_normal.php";

// Dọn record cũ > 24h (chống phình bảng LoginAttempts)
cleanupOldAttempts($conn);

// Nếu POST -> xử lý đăng nhập
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // =========================
    // 1. KIỂM TRA CSRF
    // =========================
    if (
        empty($_POST['csrf_token']) ||
        empty($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])
    ) {
        header("Location: {$loginPage}?error=csrf");
        exit;
    }

    $username       = trim($_POST['username'] ?? '');
    $inputPassword  = $_POST['password'] ?? '';
    $rememberMe     = isset($_POST['remember_me']);

    if ($username === "" || $inputPassword === "") {
        header("Location: {$loginPage}?error=empty");
        exit;
    }

    // =========================
    // 2. ANTI BRUTE-FORCE (IP + DEVICE)
    // =========================
    $ip     = getClientIP();
    $agent  = getUserAgent();

    $attempt = getLoginAttempt($conn, $ip, $agent);

    if ($attempt && $attempt['LockedUntil'] !== null) {
        $lockedUntil = strtotime($attempt['LockedUntil']);
        $now = time();

        if ($lockedUntil > $now) {
            $minutes = ceil(($lockedUntil - $now) / 60);
            header("Location: {$loginPage}?error=locked&wait={$minutes}");
            exit;
        }
    }

    // =========================
    // 3. KIỂM TRA TÀI KHOẢN + MẬT KHẨU
    // =========================
    $stmt = $conn->prepare("SELECT * FROM Users WHERE Username = ? OR Email = ? LIMIT 1");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    $loginOK    = false;
    $errorCode = '1'; // mặc định: sai tài khoản / mật khẩu

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // Chưa xác minh email
        if (isset($user['EmailVerified']) && (int)$user['EmailVerified'] === 0) {
            $errorCode = 'unverified';
        }
        // Tài khoản bị vô hiệu hóa
        elseif (isset($user['IsActive']) && (int)$user['IsActive'] === 0) {
            $errorCode = 'disabled';
        } else {
            // Kiểm tra mật khẩu
            if (password_verify($inputPassword, $user['PasswordHash'])) {
                $loginOK = true;
            }
        }
    }
    $stmt->close();

    // =========================
    // 4. ĐĂNG NHẬP THÀNH CÔNG
    // =========================
    if ($loginOK) {
        // Xóa log sai login của IP+device hiện tại
        clearLoginAttempts($conn, $ip, $agent);

        // Reset CSRF token
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        // Set session user
        $_SESSION['userid']     = $user['UserID'];
        $_SESSION['username']   = $user['Username'];
        $_SESSION['fullname']   = $user['FullName'];
        $_SESSION['email']      = $user['Email'];
        $_SESSION['role']       = $user['Role'];
        $_SESSION['avatarurl']  = $user['AvatarURL'];

        // Cập nhật LastSeen
        $upd = $conn->prepare("UPDATE Users SET LastSeen = NOW() WHERE UserID = ?");
        $upd->bind_param("i", $user['UserID']);
        $upd->execute();
        $upd->close();

        // =========================
        // 5. REMEMBER ME (Token lưu DB: RememberTokens)
        // =========================
        if ($rememberMe) {
            // Xóa token cũ của user (nếu có)
            $del = $conn->prepare("DELETE FROM RememberTokens WHERE UserID = ?");
            $del->bind_param("i", $user['UserID']);
            $del->execute();
            $del->close();

            // Tạo token mới (gửi cookie) + hash (lưu DB)
            $rawToken   = bin2hex(random_bytes(32)); // gửi cookie
            $tokenHash  = hash('sha256', $rawToken); // lưu DB
            $expiresAt  = date('Y-m-d H:i:s', time() + 30 * 24 * 60 * 60); // 30 ngày

            // Lưu DB
            $ins = $conn->prepare("
                INSERT INTO RememberTokens (UserID, TokenHash, ExpiresAt)
                VALUES (?, ?, ?)
            ");
            $ins->bind_param("iss", $user['UserID'], $tokenHash, $expiresAt);
            $ins->execute();
            $ins->close();

            // Lưu cookie 30 ngày, HttpOnly
            setcookie(
                "remember_token",
                $rawToken,
                time() + (30 * 24 * 60 * 60),
                "/",
                "",
                false,
                true // HttpOnly
            );

        } else {
            // Nếu bỏ tick Remember Me → xóa token & cookie
            if (!empty($_COOKIE['remember_token'])) {
                $hash = hash('sha256', $_COOKIE['remember_token']);
                $del = $conn->prepare("DELETE FROM RememberTokens WHERE TokenHash = ?");
                $del->bind_param("s", $hash);
                $del->execute();
                $del->close();
            }

            setcookie("remember_token", "", time() - 3600, "/", "", false, true);
        }

        // =========================
        // 6. CHUYỂN ĐẾN DASHBOARD THEO VAI TRÒ
        // =========================
        $role = $_SESSION['role'];
        $redirectUrl = '';

        // Định nghĩa đường dẫn tương ứng với vai trò (sử dụng đường dẫn tuyệt đối bắt đầu từ root dự án)
        switch ($role) {
            case 'admin':
                // Yêu cầu: D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\admin\dashboard.php
                $redirectUrl = '/HeThongChamSocCaKoi/frontend/admin/dashboard.php';
                break;
            case 'shop':
                // Yêu cầu: D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\dashboard.php
                $redirectUrl = '/HeThongChamSocCaKoi/frontend/shop/dashboard.php';
                break;
            case 'customer':
                // Yêu cầu: D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\customer\ponds.php
                $redirectUrl = '/HeThongChamSocCaKoi/frontend/customer/ponds.php';
                break;
            default:
                // Nếu vai trò không xác định, chuyển hướng về trang chủ hoặc dashboard mặc định
                $redirectUrl = '/HeThongChamSocCaKoi/index.php';
                break;
        }

        header("Location: {$redirectUrl}");
        exit;
    }

    // =========================
    // 7. ĐĂNG NHẬP THẤT BẠI -> GHI LOG & KHÓA
    // =========================
    $currentAttempts = $attempt ? (int)$attempt['Attempts'] : 0;
    $newAttempts     = $currentAttempts + 1;

    $lockSeconds = calculateLockTime($newAttempts); // dùng hàm ở lock_helper
    $lockedUntil = null;

    if ($lockSeconds > 0) {
        $lockedUntil = date('Y-m-d H:i:s', time() + $lockSeconds);
    }

    saveLoginAttempt($conn, $ip, $agent, $newAttempts, $lockedUntil);

    if ($lockSeconds > 0) {
        $minutes = ceil($lockSeconds / 60);
        header("Location: {$loginPage}?error=locked&wait={$minutes}");
    } else {
        header("Location: {$loginPage}?error={$errorCode}");
    }
    exit;
}

// =========================
// 8. NẾU LÀ GET -> TẠO CSRF TOKEN & ĐẨY VỀ TRANG LOGIN UI
// =========================
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

header("Location: {$loginPage}");
exit;