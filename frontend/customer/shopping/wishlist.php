<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\shop\wishlist.php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';
require_once '../../../includes/check_login.php';
$username = $_SESSION['username'] ?? null;
if (!$username) {
  header('Location: /HeThongChamSocCaKoi/frontend/account/login.php');
  exit;
}

// Lấy thông tin user để chào + dùng sau nếu muốn
$uStmt = $conn->prepare("SELECT UserID, FullName FROM Users WHERE Username=? LIMIT 1");
$uStmt->bind_param("s", $username);
$uStmt->execute();
$user = $uStmt->get_result()->fetch_assoc();
$uStmt->close();

$fullName   = $user['FullName'] ?? '';
$page_title = "Sản phẩm yêu thích - KoiCare Shop";
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title><?= htmlspecialchars($page_title) ?></title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/wishlist.css">
</head>
<body>

<?php include '../../../includes/header.php'; ?>

<div class="wishlist-page">
  <div class="wishlist-header">
    <h1>Sản phẩm yêu thích</h1>
    <p>
      Xin chào, <?= htmlspecialchars($fullName) ?>.
      Đây là những sản phẩm bạn đã “thả tim” cho hồ Koi của mình.
    </p>
  </div>

  <div class="wishlist-toolbar">
    <span id="wishlist-count" class="wishlist-count">Đang tải danh sách yêu thích...</span>
    <select id="wishlist-sort" class="wishlist-sort">
      <option value="created_desc">Mới thêm gần đây</option>
      <option value="price_asc">Giá tăng dần</option>
      <option value="price_desc">Giá giảm dần</option>
      <option value="sold_desc">Đã bán nhiều</option>
    </select>
  </div>

  <!-- Khi không có sản phẩm, JS sẽ hiển thị block này -->
  <div id="wishlist-empty" class="wishlist-empty" style="display:none; text-align: center;">
    <img src="https://img.icons8.com/clouds/300/hearts.png" alt="Wishlist trống" style="display: block; margin: 0 auto;">
    <h3>Danh sách yêu thích của bạn đang trống</h3>
    <p>Hãy bấm ❤ ở sản phẩm để lưu lại và so sánh sau.</p>
    <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/products.php" class="btn primary">
      Khám phá sản phẩm
    </a>
</div>

  <!-- Grid sản phẩm yêu thích – sẽ được fill bằng JS -->
  <div id="wishlist-grid" class="wishlist-grid" style="display:none;"></div>
</div>


<!-- Toast stack dùng chung -->
<div id="toast-stack" class="toast-stack"></div>

<?php include '../../../includes/footer.php'; ?>

<script>
  // Nếu vì lý do nào đó products.js chưa define toast,
  // tạo fallback đơn giản để wishlist.js không bị lỗi.
  if (typeof toast !== 'function') {
    function toast(message, type = 'success') {
      let stack = document.getElementById('toast-stack');
      if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
      }
      const item = document.createElement('div');
      item.className = 'toast ' + type;
      item.textContent = message;
      stack.appendChild(item);
      setTimeout(() => item.classList.add('hide'), 2600);
      setTimeout(() => item.remove(), 3200);
    }
  }
</script>

<!-- Dùng lại products.js để có addToCart(), escapeHtml(), formatPrice(), toast... -->
<script src="/HeThongChamSocCaKoi/assets/js/shop/products.js"></script>
<!-- Wishlist logic: load list + toggle -->
<script src="/HeThongChamSocCaKoi/assets/js/shop/wishlist.js"></script>

</body>
</html>
