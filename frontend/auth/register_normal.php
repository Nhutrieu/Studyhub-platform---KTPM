<?php
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đăng ký tài khoản KoiCareS</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }

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
      background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.4));
      backdrop-filter: blur(2px);
      z-index: 0;
    }

    .wrapper {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: rgba(15, 24, 45, 0.9);
      border-radius: 18px;
      padding: 28px 32px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 18px 45px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.08);
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
      border: 2px solid rgba(255,255,255,0.4);
    }

    .brand-logo img { width: 100%; height: 100%; object-fit: cover; }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 0 6px rgba(0,0,0,0.6);
    }

    .title {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #ffffff;
      text-shadow: 0 0 6px rgba(0,0,0,0.6);
    }

    .subtitle {
      font-size: 14px;
      color: #cfd8ff;
      margin-bottom: 20px;
    }

    .form-label {
      font-size: 14px;
      margin-bottom: 6px;
      color: #e5e9ff;
    }

    .form-control {
      background: rgba(7, 14, 30, 0.9);
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.18);
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
      background: rgba(7,14,30,0.95);
      color: #ffffff;
    }

    .is-invalid {
      border-color: #ff6b6b !important;
      box-shadow: 0 0 0 1px #ff6b6b !important;
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
      box-shadow: 0 12px 25px rgba(0,0,0,0.45);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .btn-submit:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 32px rgba(0,0,0,0.55);
    }

    .back-link {
      margin-top: 14px;
      font-size: 13px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 4px rgba(0,0,0,0.5);
    }

    .back-link a {
      color: #ffd86a;
      text-decoration: none;
      font-weight: 600;
    }

    .back-link a:hover { text-decoration: underline; }

    .message {
      margin-bottom: 12px;
      padding: 10px;
      border-radius: 10px;
      text-align: center;
      font-size: 14px;
    }
    .message.success { background: rgba(0,255,150,0.2); color: #4cffb3; }
    .message.error { background: rgba(255,80,80,0.2); color: #ff6b6b; }

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
      .card {
        padding: 22px 18px 20px;
      }
      .title {
        font-size: 22px;
      }
    }
  </style>
</head>
<body>

<div class="wrapper">
  <div class="card">

    <div class="brand">
      <div class="brand-logo">
        <img src="/HeThongChamSocCaKoi/assets/images/logo_koi.png" alt="KoiCare">
      </div>
      <div class="brand-name">KoiCare System</div>
    </div>

    <div class="title">Tạo tài khoản mới</div>
    <div class="subtitle">Đăng ký để quản lý hồ cá, chăm sóc cá và theo dõi hệ thống KoiCareS.</div>

    <div id="message"></div>

    <!-- ✅ THÊM novalidate để tắt validate mặc định -->
    <form id="registerForm" novalidate>
      <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

      <div class="mb-3">
        <label class="form-label">Họ và tên</label>
        <!-- bỏ required, để JS tự check -->
        <input type="text" name="full_name" class="form-control" placeholder="Nhập họ và tên">
      </div>

      <div class="mb-3">
        <label class="form-label">Tên đăng nhập</label>
        <input type="text" name="username" class="form-control" placeholder="Nhập tên đăng nhập">
      </div>

      <div class="mb-3">
        <label class="form-label">Email</label>
        <input type="email" name="email" class="form-control" placeholder="Nhập email">
      </div>

      <div class="mb-3">
        <label class="form-label">Số điện thoại (tuỳ chọn)</label>
        <input type="text" name="phone" class="form-control" placeholder="Nhập số điện thoại (nếu có)">
      </div>

      <div class="mb-3">
        <label class="form-label">Mật khẩu</label>
        <div class="password-field">
          <input type="password" name="password" class="form-control" id="regPassword" placeholder="Nhập mật khẩu">
          <button type="button" class="toggle-password" data-target="regPassword">Hiện</button>
        </div>

        <div id="passwordStrength" style="margin-top:6px; font-size:12px;">
          <div id="passwordStrengthBar" style="height:4px; border-radius:999px; background:rgba(255,255,255,0.15); overflow:hidden;">
            <div id="passwordStrengthFill" style="height:100%; width:0%; background:#ff6b6b; transition:width 0.2s;"></div>
          </div>
          <span id="passwordStrengthText" style="display:inline-block; margin-top:4px; color:#cfd8ff;">Mật khẩu chưa nhập</span>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Nhập lại mật khẩu</label>
        <div class="password-field">
          <input type="password" name="confirm_password" class="form-control" id="regPasswordConfirm" placeholder="Nhập lại mật khẩu">
          <button type="button" class="toggle-password" data-target="regPasswordConfirm">Hiện</button>
        </div>
      </div>

      <button type="submit" class="btn-submit">Đăng ký</button>
    </form>

    <div class="back-link">
      <span>Đã có tài khoản?</span>
      <a href="login_normal.php">Đăng nhập ngay</a>
    </div>

  </div>
</div>

<script src="/HeThongChamSocCaKoi/assets/js/auth/register.js"></script>

</body>
</html>
