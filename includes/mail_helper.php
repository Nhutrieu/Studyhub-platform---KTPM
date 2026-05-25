<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

function app_base_url()
{
    return 'https://koicares.xyz/HeThongChamSocCaKoi';
}

function createMailer(): PHPMailer
{
    $mail = new PHPMailer(true);

    // ============= SMTP BREVO =============
    $mail->isSMTP();
    $mail->Host = 'smtp-relay.brevo.com';
    $mail->SMTPAuth = true;

    // GIỮ NGUYÊN CONFIG CỦA BẠN
    $mail->Username = '9c2a8b001@smtp-brevo.com';
    $mail->Password = 'xsmtpsib-bf272dfd562d7b95ba749f2909c6e736b5ad9f2f3b846d327dd997a6bac60891-zbT0Qfc8Mn35aldn';

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    $mail->setFrom('no-reply@koicares.xyz', 'KoiCareS');

    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';

    return $mail;
}

/**
 * Template HTML dùng chung cho tất cả email KoiCareS
 */
function buildKoiCareEmailTemplate(string $title, string $preheader, string $contentHtml): string
{
    $year = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>{$title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <!-- preheader -->
  <div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    {$preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px;width:100%;background-color:#0f172a;border-radius:16px;overflow:hidden;
                      box-shadow:0 10px 30px rgba(15,23,42,0.45);">
          <!-- Header -->
          <tr>
            <td style="padding:20px 24px 16px;border-bottom:1px solid rgba(148,163,184,0.35);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                             font-size:20px;font-weight:700;color:#f9fafb;">
                    KoiCareS
                  </td>
                  <td align="right" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                                           font-size:12px;color:#9ca3af;">
                    Hệ thống quản lý &amp; chăm sóc hồ cá Koi
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#020617;padding:24px 24px 28px;">
              <h1 style="margin:0 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                         font-size:22px;line-height:1.4;font-weight:600;color:#f9fafb;">
                {$title}
              </h1>
              <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                          font-size:14px;line-height:1.7;color:#e5e7eb;">
                {$contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#020617;padding:12px 24px 18px;border-top:1px solid rgba(148,163,184,0.35);">
              <p style="margin:0 0 4px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                        font-size:12px;color:#9ca3af;">
                Đây là email tự động, vui lòng không trả lời trực tiếp.
              </p>
              <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                        font-size:12px;color:#6b7280;">
                © {$year} KoiCareS. Mọi quyền được bảo lưu.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/**
 * Gửi email xác minh đăng ký tài khoản
 */
function sendVerificationEmail(string $toEmail, string $toName, string $token): bool
{
    $verifyUrl = app_base_url() . '/backend/api/auth/verify_email.php?token=' . urlencode($token);

    $subject = '[KoiCareS] Xác minh email của bạn';

    $content = <<<HTML
<p style="margin:0 0 12px;">Chào {$toName},</p>
<p style="margin:0 0 12px;">Cảm ơn bạn đã đăng ký KoiCareS. Chỉ còn một bước nữa để hoàn tất.</p>
<p style="margin:0 0 18px;">Vui lòng nhấp vào nút bên dưới để xác minh địa chỉ email của bạn và bắt đầu sử dụng hệ thống.</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
  <tr>
    <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#facc15,#eab308);">
      <a href="{$verifyUrl}" target="_blank"
         style="display:inline-block;padding:10px 26px;font-size:14px;font-weight:600;
                color:#27272a;text-decoration:none;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        Xác minh tài khoản
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
  Nếu nút không hoạt động, hãy sao chép đường dẫn sau và dán vào trình duyệt:
</p>
<p style="margin:0 0 16px;font-size:12px;word-break:break-all;">
  <a href="{$verifyUrl}" target="_blank" style="color:#fde68a;text-decoration:none;">{$verifyUrl}</a>
</p>

<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Liên kết có hiệu lực trong 24 giờ.</p>
<p style="margin:0;font-size:12px;color:#9ca3af;">
  Nếu bạn không thực hiện đăng ký, bạn có thể bỏ qua email này một cách an toàn.
</p>
HTML;

    $body = buildKoiCareEmailTemplate(
        'Xác minh email KoiCareS',
        'Xác minh email của bạn để bắt đầu sử dụng KoiCareS.',
        $content
    );

    try {
        $mail = createMailer();
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('sendVerificationEmail error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Gửi email đặt lại mật khẩu (tài khoản đã kích hoạt)
 */
function sendPasswordResetEmail(string $toEmail, string $toName, string $token): bool
{
    $resetUrl = app_base_url() . '/frontend/auth/reset_password.php?token=' . urlencode($token);

    $subject = '[KoiCareS] Đặt lại mật khẩu';

    $content = <<<HTML
<p style="margin:0 0 12px;">Chào {$toName},</p>
<p style="margin:0 0 12px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản KoiCareS của bạn.</p>
<p style="margin:0 0 18px;">Nếu đó là bạn, vui lòng nhấp vào nút bên dưới để tạo mật khẩu mới.</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
  <tr>
    <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#facc15,#eab308);">
      <a href="{$resetUrl}" target="_blank"
         style="display:inline-block;padding:10px 26px;font-size:14px;font-weight:600;
                color:#27272a;text-decoration:none;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        Đặt lại mật khẩu
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
  Liên kết này có hiệu lực trong 1 giờ. Sau thời gian này bạn cần yêu cầu lại.
</p>
<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
  Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
</p>

<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Đường dẫn trực tiếp:</p>
<p style="margin:0;font-size:12px;word-break:break-all;">
  <a href="{$resetUrl}" target="_blank" style="color:#fde68a;text-decoration:none;">{$resetUrl}</a>
</p>
HTML;

    $body = buildKoiCareEmailTemplate(
        'Đặt lại mật khẩu KoiCareS',
        'Hướng dẫn đặt lại mật khẩu tài khoản KoiCareS của bạn.',
        $content
    );

    try {
        $mail = createMailer();
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('sendPasswordResetEmail error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Gửi email cho tài khoản CHƯA KÍCH HOẠT:
 * - Cho phép người dùng đặt lại mật khẩu
 * - Sau khi đặt xong, reset_password.php sẽ kích hoạt tài khoản dựa trên token (activate=1)
 */
function sendActivationAndResetEmail(string $toEmail, string $toName, string $token): bool
{
    $resetUrl = app_base_url() . '/frontend/auth/reset_password.php?token=' . urlencode($token) . '&activate=1';

    $subject = '[KoiCareS] Kích hoạt tài khoản & đặt lại mật khẩu';

    $content = <<<HTML
<p style="margin:0 0 12px;">Chào {$toName},</p>
<p style="margin:0 0 12px;">
  Tài khoản KoiCareS của bạn hiện chưa được kích hoạt. Bạn có thể kích hoạt tài khoản
  đồng thời đặt lại mật khẩu chỉ với một bước.
</p>
<p style="margin:0 0 18px;">
  Nhấp vào nút bên dưới để tạo mật khẩu mới và kích hoạt tài khoản của bạn.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
  <tr>
    <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#facc15,#eab308);">
      <a href="{$resetUrl}" target="_blank"
         style="display:inline-block;padding:10px 26px;font-size:14px;font-weight:600;
                color:#27272a;text-decoration:none;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        Kích hoạt & đặt lại mật khẩu
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
  Liên kết này có hiệu lực trong 1 giờ. Sau thời gian này bạn cần yêu cầu lại.
</p>
<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
  Nếu bạn không yêu cầu, có thể bỏ qua email này. Tài khoản chưa được kích hoạt của bạn sẽ không thể đăng nhập.
</p>

<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">Đường dẫn trực tiếp:</p>
<p style="margin:0;font-size:12px;word-break:break-all;">
  <a href="{$resetUrl}" target="_blank" style="color:#fde68a;text-decoration:none;">{$resetUrl}</a>
</p>
HTML;

    $body = buildKoiCareEmailTemplate(
        'Kích hoạt tài khoản & đặt lại mật khẩu',
        'Kích hoạt tài khoản KoiCareS và đặt lại mật khẩu trong một bước.',
        $content
    );

    try {
        $mail = createMailer();
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('sendActivationAndResetEmail error: ' . $e->getMessage());
        return false;
    }
}
