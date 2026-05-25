<?php
require __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../includes/db.php';
session_start();

$config = require __DIR__ . '/facebook_config.php';

$fb = new \Facebook\Facebook([
    'app_id'                => $config['app_id'],
    'app_secret'            => $config['app_secret'],
    'default_graph_version' => $config['graph_version'],
]);

$helper = $fb->getRedirectLoginHelper();

try {
    // Lấy access token từ callback
    $accessToken = $helper->getAccessToken($config['redirect_uri']);
} catch (\Facebook\Exceptions\FacebookResponseException $e) {
    error_log('Graph error: ' . $e->getMessage());
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=fb_graph');
    exit;
} catch (\Facebook\Exceptions\FacebookSDKException $e) {
    error_log('Facebook SDK error: ' . $e->getMessage());
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=fb_sdk');
    exit;
}

if (!isset($accessToken)) {
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=fb_token');
    exit;
}

// (Optional) đổi sang long-lived token
try {
    $oAuth2Client = $fb->getOAuth2Client();
    $accessToken  = $oAuth2Client->getLongLivedAccessToken($accessToken);
} catch (\Facebook\Exceptions\FacebookSDKException $e) {
    // nếu lỗi thì vẫn dùng short-lived token cũng được
}

$_SESSION['fb_access_token'] = (string)$accessToken;

// Lấy thông tin user
try {
    $response = $fb->get('/me?fields=id,name,email,picture.type(large)', $accessToken);
} catch (\Facebook\Exceptions\FacebookSDKException $e) {
    error_log('Error getting user: ' . $e->getMessage());
    header('Location: /HeThongChamSocCaKoi/frontend/auth/login.php?error=fb_me');
    exit;
}

$fbUser = $response->getGraphUser();

$facebookId = $fbUser->getId();
$fullName   = $fbUser->getName();
$email      = $fbUser->getEmail(); // có thể là null nếu user không cho email

$picture          = $fbUser->getPicture();
$avatarRemoteUrl  = $picture ? $picture->getUrl() : null;

// Đơn giản: lưu URL avatar trực tiếp (sau này nếu muốn copy về server thì ta bổ sung sau)
$avatar = $avatarRemoteUrl ?: '/HeThongChamSocCaKoi/uploads/avatars/default.png';

$authProvider = 'facebook';

// ===== 1. Tìm user đã tồn tại =====
$stmt = $conn->prepare("
    SELECT * FROM Users
    WHERE (AuthProvider = 'facebook' AND ProviderID = ?)
       OR Email = ?
    LIMIT 1
");
$stmt->bind_param("ss", $facebookId, $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Đã có user -> update lại thông tin mới
    $user = $result->fetch_assoc();

    $upd = $conn->prepare("
        UPDATE Users
        SET FullName = ?, AvatarURL = ?, AuthProvider = 'facebook', ProviderID = ?
        WHERE UserID = ?
    ");
    $upd->bind_param("sssi", $fullName, $avatar, $facebookId, $user['UserID']);
    $upd->execute();
    $upd->close();

} else {
    // ===== 2. Chưa có user -> tạo mới =====

    // Username: lấy trước dấu @, nếu không có email thì dùng fb_<id>
    if ($email) {
        $baseUsername = explode('@', $email)[0];
    } else {
        $baseUsername = 'fb_' . substr($facebookId, 0, 8);
    }
    $username = $baseUsername;

    // Tránh trùng username
    $check = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
    $i = 1;
    while (true) {
        $check->bind_param("s", $username);
        $check->execute();
        $rs = $check->get_result();
        if ($rs->num_rows == 0) break;
        $username = $baseUsername . $i++;
    }
    $check->close();

    // Password random (user không dùng, chỉ để đủ cột)
    $randomPassword = bin2hex(random_bytes(16));
    $passwordHash   = password_hash($randomPassword, PASSWORD_DEFAULT);

    $role    = 'Customer';
    $phone   = '';
    $address = '';

    $ins = $conn->prepare("
        INSERT INTO Users
        (FullName, Email, PasswordHash, Username, Phone, Address, Role, AuthProvider, ProviderID, AvatarURL)
        VALUES (?,?,?,?,?,?,?,?,?,?)
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
        $facebookId,
        $avatar
    );
    $ins->execute();
    $userId = $ins->insert_id;
    $ins->close();

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

// ===== 3. Lưu SESSION giống login thường =====
$_SESSION['userid']    = $user['UserID'];
$_SESSION['username']  = $user['Username'];
$_SESSION['fullname']  = $user['FullName'];
$_SESSION['email']     = $user['Email'];
$_SESSION['role']      = $user['Role'];
$_SESSION['avatarurl'] = $user['AvatarURL'];

// ===== 4. Redirect về dashboard =====
header('Location: ../../../frontend/dashboards/dashboard.php');
exit;
