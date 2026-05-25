<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đăng nhập KoiCare System</title>
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

    /* Lớp phủ tối để chữ/nút nổi hơn */
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
      max-width: 780px;
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
    }

    .login-title {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .login-subtitle {
      font-size: 14px;
      color: #cfd8ff;
      margin-bottom: 22px;
    }

    /* Hàng nút đăng nhập nằm ngang */
    .login-row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      justify-content: center;
      margin-bottom: 14px;
    }

    .login-btn {
      flex: 1 1 0;
      min-width: 210px;
      max-width: 250px;
      height: 52px;
      border-radius: 999px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
      position: relative;
      overflow: hidden;
    }

    .login-btn span {
      position: relative;
      z-index: 1;
    }

    .login-btn::after {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0;
      background: radial-gradient(circle at top left,
        rgba(255, 255, 255, 0.35), transparent 55%);
      transition: opacity 0.2s ease;
    }

    .login-btn:hover::after {
      opacity: 1;
    }

    .login-btn img {
      width: 22px;
      height: 22px;
    }

    .btn-koi {
      background: linear-gradient(135deg, #f7d976, #cda034);
      color: #3b2b04;
    }

    .btn-facebook {
      background: #1877f2;
    }

    .btn-google {
      background: #db4437;
    }

    .footer-text {
      font-size: 13px;
      color: #e0e5ff;
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      margin-top: 6px;
    }

    .footer-text input {
      cursor: pointer;
    }

    /* Style link điều khoản sử dụng */
    .footer-text a {
      color: #ffd86a;
      text-decoration: underline;
      font-weight: 500;
    }

    .footer-text a:hover {
      color: #ffffff;
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .login-card {
        padding: 22px 18px 20px;
      }
      .login-title {
        font-size: 22px;
      }
      .login-row {
        gap: 10px;
      }
      .login-btn {
        min-width: 100%;
      }
    }
  </style>
</head>
<body>

<div class="login-wrapper">
  <div class="login-card">

    <div class="brand">
      <div class="brand-logo">
        <!-- Nếu có logo riêng thì đổi src dưới đây -->
        <img src="/HeThongChamSocCaKoi/assets/images/logo_koi.png" alt="KoiCare">
      </div>
      <div class="brand-name">KoiCare System</div>
    </div>

    <div class="login-title">Đăng nhập tài khoản</div>
    <div class="login-subtitle">
      Quản lý hồ cá Koi, lịch cho ăn và sức khỏe cá ngay trong một hệ thống.
    </div>

    <div class="login-row">
      <!-- KOI ACCOUNT -->
      <button class="login-btn btn-koi" onclick="location.href='login_normal.php'">
        <img src="https://cdn-icons-png.flaticon.com/512/7130/7130386.png" alt="">
        <span>KoiCareS</span>
      </button>

      <!-- FACEBOOK -->
      <button class="login-btn btn-facebook" onclick="location.href='../../backend/api/auth/facebook_login.php'">
        <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="">
        <span>Facebook</span>
      </button>

      <!-- GOOGLE -->
      <button class="login-btn btn-google"
              onclick="location.href='../../backend/api/auth/google_login.php'">
        <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="">
        <span>Google</span>
      </button>
    </div>

    <label class="footer-text">
      <input type="checkbox" checked>
      Tôi đã đọc kỹ và đồng ý
      <a href="/HeThongChamSocCaKoi/privacy.html"
         target="_blank"
         rel="noopener noreferrer">
        điều khoản sử dụng
      </a>.
    </label>

  </div>
</div>

</body>
</html>
