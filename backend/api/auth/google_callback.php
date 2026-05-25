<?php
require __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../includes/db.php';
session_start();

$config = require __DIR__ . '/google_config.php';

$client = new Google_Client();
$client->setClientId($config['client_id']);
$client->setClientSecret($config['client_secret']);
$client->setRedirectUri($config['redirect_uri']);
$client->addScope("email");
$client->addScope("profile");

// Không có code -> lỗi
if (!isset($_GET['code'])) {
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=google');
    exit;
}

// Đổi code lấy access token
$token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
if (isset($token['error'])) {
    // Có lỗi khi lấy token
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=google_token');
    exit;
}

$client->setAccessToken($token);

// Lấy thông tin user từ Google
$oauth2    = new Google_Service_Oauth2($client);
$googleUser = $oauth2->userinfo->get();

$googleId  = $googleUser->id;
$email     = $googleUser->email;
$fullName  = $googleUser->name;
$avatar    = $googleUser->picture ?: '/uploads/avatars/default.png';
$authProvider = 'google';

// ----- 1. Tìm user đã tồn tại (ưu tiên ProviderID, sau đó tới email) -----
$stmt = $conn->prepare("
    SELECT * FROM Users 
    WHERE (AuthProvider = 'google' AND ProviderID = ?) 
       OR Email = ?
    LIMIT 1
");
$stmt->bind_param("ss", $googleId, $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Đã có user -> cập nhật thêm thông tin mới
    $user = $result->fetch_assoc();

    $upd = $conn->prepare("
        UPDATE Users 
        SET FullName = ?, AvatarURL = ?, AuthProvider = 'google', ProviderID = ?
        WHERE UserID = ?
    ");
    $upd->bind_param("sssi", $fullName, $avatar, $googleId, $user['UserID']);
    $upd->execute();
    $upd->close();

} else {
    // ----- 2. Chưa có user -> tạo mới -----

    // Tạo username từ email (trước dấu @), tránh trùng thì gắn số 1,2,3...
    if ($email) {
        $baseUsername = explode('@', $email)[0];
    } else {
        $baseUsername = 'gg_' . substr($googleId, 0, 8);
    }
    $username = $baseUsername;

    $check = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
    $i = 1;
    while (true) {
        $check->bind_param("s", $username);
        $check->execute();
        $rs = $check->get_result();
        if ($rs->num_rows == 0) break; // không trùng -> dùng được
        $username = $baseUsername . $i++;
    }
    $check->close();

    // Tạo password random (chỉ để đủ cột, user login bằng Google, không dùng tới)
    $randomPassword = bin2hex(random_bytes(16));
    $passwordHash   = password_hash($randomPassword, PASSWORD_DEFAULT);

    $role    = 'Customer';
    $phone   = '';
    $address = '';

    $ins = $conn->prepare("
        INSERT INTO Users 
        (FullName, Email, PasswordHash, Username, Phone, Address, Role, AuthProvider, ProviderID, AvatarURL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $ins->bind_param(
        "ssssssssss",
        $fullName,
        $email,
        $passwordHash,
        $username,
        $phone,
        $address,
        $role,
        $authProvider,
        $googleId,
        $avatar
    );
    $ins->execute();

    $userId = $ins->insert_id;
    $ins->close();

    // Tạo mảng user giống như lúc login thường
    $user = [
        'UserID'    => $userId,
        'Username'  => $username,
        'FullName'  => $fullName,
        'Email'     => $email,
        'Role'      => $role,
        'AvatarURL' => $avatar,
    ];
}

// Cập nhật LastSeen
$conn->query("UPDATE Users SET LastSeen = NOW() WHERE UserID = " . (int)$user['UserID']);

// ----- 3. Lưu SESSION giống login.php thường -----
$_SESSION['userid']    = $user['UserID'];
$_SESSION['username']  = $user['Username'];
$_SESSION['fullname']  = $user['FullName'];
$_SESSION['email']     = $user['Email'];
$_SESSION['role']      = $user['Role'];
$_SESSION['avatarurl'] = $user['AvatarURL'];

// ----- 4. Redirect về dashboard -----
header('Location: ../../../frontend/dashboards/dashboard.php');
exit;
