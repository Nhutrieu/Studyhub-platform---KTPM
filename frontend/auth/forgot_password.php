<?php
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$err  = $_SESSION['forgot_error']   ?? null;
$ok   = $_SESSION['forgot_success'] ?? null;
unset($_SESSION['forgot_error'], $_SESSION['forgot_success']);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Quên mật khẩu - KoiCareS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      /* Ảnh nền giống trang đăng nhập */
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

    .auth-wrapper {
      position: relative;
      z-index: 1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .auth-card {
      background: rgba(15, 23, 42, 0.9);
      border-radius: 18px;
      padding: 28px 32px 24px;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e5e7eb;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(248, 250, 252, 0.6);
      background: #020617;
    }

    .brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .brand-name {
      font-size: 18px;
      font-weight: 700;
      color: #f9fafb;
      text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .auth-title {
      font-size: 22px;
      font-weight: 600;
      color: #f9fafb;
      margin-bottom: 4px;
      text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    }

    .auth-subtitle {
      font-size: 13px;
      color: #cbd5f5;
      margin-bottom: 18px;
    }

    .form-label {
      font-size: 13px;
      color: #e5e7eb;
      margin-bottom: 6px;
    }

    .form-control {
      background: rgba(7, 14, 30, 0.9);
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #f9fafb;
      font-size: 14px;
      padding: 9px 14px;
    }

    .form-control::placeholder {
      color: rgba(148, 163, 184, 0.9);
    }

    .form-control:focus {
      box-shadow: 0 0 0 1px #5b8cff;
      border-color: #5b8cff;
      background: rgba(7, 14, 30, 0.98);
      color: #f9fafb;
      outline: none;
    }

    /* ✅ Nút giống nút Đăng nhập: gradient dịu hơn, chữ nâu, bóng đổ giống */
    .btn-primary {
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

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.55);
      opacity: 0.96;
    }

    .btn-primary:active {
      transform: translateY(1px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
    }

    .alert-custom {
      font-size: 13px;
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    .alert-custom.alert-danger {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.35);
      color: #fecaca;
    }

    .alert-custom.alert-success {
      background: rgba(22, 163, 74, 0.1);
      border-color: rgba(22, 163, 74, 0.35);
      color: #bbf7d0;
    }

    .back-link {
      font-size: 13px;
      margin-top: 14px;
      text-align: center;
      color: #e5e7eb;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    }

    .back-link a {
      color: #ffd86a;
      text-decoration: none;
      font-weight: 500;
    }

    .back-link a:hover {
      text-decoration: underline;
    }

    @media (max-width: 576px) {
      .auth-card {
        padding: 22px 18px 20px;
      }
      .auth-title {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>

<div class="auth-wrapper">
  <div class="auth-card">

    <div class="brand">
      <div class="brand-logo">
        <img src="/HeThongChamSocCaKoi/assets/images/logo_koi.png" alt="KoiCareS">
      </div>
      <div class="brand-name">KoiCareS</div>
    </div>

    <h4 class="auth-title">Quên mật khẩu</h4>
    <p class="auth-subtitle">
      Nhập email bạn đã dùng để đăng ký. Nếu email tồn tại trong hệ thống, chúng tôi sẽ gửi
      hướng dẫn đặt lại mật khẩu (hoặc kích hoạt lại tài khoản nếu chưa kích hoạt).
    </p>

    <?php if ($err): ?>
      <div class="alert alert-danger alert-custom">
        <?php echo htmlspecialchars($err); ?>
      </div>
    <?php endif; ?>

    <?php if ($ok): ?>
      <div class="alert alert-success alert-custom">
        <?php echo htmlspecialchars($ok); ?>
      </div>
    <?php endif; ?>

    <form method="post" action="../../backend/api/auth/forgot_password_request.php" novalidate>
      <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

      <div class="mb-3">
        <label class="form-label">Email đăng ký</label>
        <input
          type="email"
          name="email"
          class="form-control"
          required
          placeholder="vd: ban@domain.com"
        >
      </div>

      <button type="submit" class="btn btn-primary">
        Gửi liên kết đặt lại mật khẩu
      </button>
    </form>

    <div class="back-link">
      <a href="login_normal.php">&laquo; Quay lại đăng nhập</a>
    </div>

  </div>
</div>

</body>
</html>
