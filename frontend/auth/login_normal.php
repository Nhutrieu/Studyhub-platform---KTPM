<?php
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$error   = isset($_GET['error']) ? $_GET['error'] : null;
$success = isset($_GET['success']) ? $_GET['success'] : null;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đăng nhập KoiCareS</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: url('/HeThongChamSocCaKoi/assets/images/login-koi.jpg') center center / cover no-repeat fixed;
      position: relative;
      color: #fff;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.7),
        rgba(0, 0, 0, 0.4)
      );
      backdrop-filter: blur(2px);
      z-index: 0;
    }

    .login-wrapper {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .login-card {
      background: rgba(15, 24, 45, 0.9);
      border-radius: 18px;
      padding: 28px 32px 24px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .brand-logo {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.4);
    }

    .brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: #ffffff;
      text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .login-title {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #ffffff;
      text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .login-subtitle {
      font-size: 14px;
      color: #cfd8ff;
      margin-bottom: 22px;
    }

    .form-label {
      font-size: 14px;
      margin-bottom: 6px;
      color: #e5e9ff;
    }

    .form-control {
      background: rgba(7, 14, 30, 0.9);
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 10px 16px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
    }

    .form-control::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    .form-control:focus {
      outline: none;
      box-shadow: 0 0 0 1px #5b8cff;
      border-color: #5b8cff;
      background: rgba(7, 14, 30, 0.95);
      color: #ffffff;
    }

    .btn-submit {
      width: 100%;
      border-radius: 999px;
      border: none;
      padding: 11px 16px;
      margin-top: 4px;
      background: linear-gradient(135deg, #f7d976, #cda034);
      color: #3b2b04;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 12px 25px rgba(0, 0, 0, 0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    }

    .btn-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.55);
      opacity: 0.96;
    }

    .btn-submit:active {
      transform: translateY(1px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
    }

    .form-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      font-size: 13px;
      color: #cfd5ff;
    }

    .form-footer a {
      color: #89a8ff;
      text-decoration: none;
      font-size: 13px;
    }

    .form-footer a:hover {
      text-decoration: underline;
    }

    .back-link {
      margin-top: 14px;
      font-size: 13px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    }

    .back-link a {
      color: #ffd86a;
      text-decoration: none;
      font-weight: 600;
    }

    .back-link a:hover {
      text-decoration: underline;
    }

    .alert-custom {
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 14px;
    }

    .password-field {
      position: relative;
    }

    .password-field .toggle-password {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: #cfd8ff;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }

    .password-field .toggle-password:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .login-card {
        padding: 22px 18px 20px;
      }
      .login-title {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>

<div class="login-wrapper">
  <div class="login-card">

    <div class="brand">
      <div class="brand-logo">
        <img src="/HeThongChamSocCaKoi/assets/images/logo_koi.png" alt="KoiCare">
      </div>
      <div class="brand-name">KoiCare System</div>
    </div>

    <div class="login-title">Đăng nhập KoiCareS</div>
    <div class="login-subtitle">
      Đăng nhập bằng tài khoản hệ thống để quản lý hồ cá, lịch chăm sóc và khách hàng.
    </div>

    <?php if ($error): ?>
      <?php
        $msg = '';
        switch ($error) {
          case '1':
            $msg = 'Sai tên đăng nhập hoặc mật khẩu.';
            break;
          case 'disabled':
            $msg = 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
            break;
          case 'locked':
            // Lấy số phút backend gửi lên (?wait=...)
            $wait = isset($_GET['wait']) ? (int)$_GET['wait'] : 10;
            if ($wait <= 1) {
              $msg = 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng 1 phút.';
            } else {
              $msg = 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng ' . $wait . ' phút.';
            }
            break;
          case 'csrf':
            $msg = 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.';
            break;
          case 'empty':
            $msg = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
            break;
          case 'unverified':
            $msg = 'Tài khoản của bạn chưa được xác minh email. Vui lòng kiểm tra hộp thư hoặc yêu cầu gửi lại email xác minh.';
            break;
          default:
            $msg = 'Đăng nhập thất bại. Vui lòng thử lại.';
        }
      ?>
      <div class="alert alert-danger alert-custom">
        <?php echo htmlspecialchars($msg); ?>
      </div>
    <?php endif; ?>

    <?php if ($success): ?>
      <?php
        $msgSuccess = '';
        switch ($success) {
          case 'verified':
            $msgSuccess = 'Xác minh email thành công. Bạn có thể đăng nhập.';
            break;
          case 'reset':
            $msgSuccess = 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.';
            break;
        }
      ?>
      <?php if ($msgSuccess): ?>
        <div class="alert alert-success alert-custom">
          <?php echo htmlspecialchars($msgSuccess); ?>
        </div>
      <?php endif; ?>
    <?php endif; ?>

    <form method="post" action="../../backend/api/auth/login.php" id="loginForm">
      <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

      <div class="mb-3">
        <label class="form-label">Tên đăng nhập hoặc email</label>
        <input type="text" name="username" class="form-control" required placeholder="Nhập tên đăng nhập hoặc email">
      </div>

      <div class="mb-2">
        <label class="form-label">Mật khẩu</label>
        <div class="password-field">
          <input type="password" name="password" class="form-control" required id="loginPassword" placeholder="Nhập mật khẩu">
          <button type="button" class="toggle-password" data-target="loginPassword">Hiện</button>
        </div>
      </div>

      <div class="form-footer">
        <label>
          <input type="checkbox" name="remember_me">
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <a href="forgot_password.php">Quên mật khẩu?</a>
      </div>

      <button type="submit" class="btn-submit" id="btnLogin">Đăng nhập</button>
    </form>

    <div class="back-link">
      <div>
        <span>Chưa có tài khoản? </span>
        <a href="register_normal.php">Đăng ký ngay</a>
      </div>
      <div style="margin-top:6px;">
        Hoặc <a href="login.php">quay lại chọn phương thức đăng nhập (KoiCareS / Facebook / Google)</a>
      </div>
    </div>

  </div>
</div>

<script>
  const loginForm = document.getElementById('loginForm');
  const btnLogin = document.getElementById('btnLogin');

  if (loginForm && btnLogin) {
    loginForm.addEventListener('submit', function () {
      btnLogin.disabled = true;
      btnLogin.innerText = 'Đang đăng nhập...';
    });
  }

  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Ẩn';
      } else {
        input.type = 'password';
        btn.textContent = 'Hiện';
      }
    });
  });
</script>

</body>
</html>
