<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\customer\shopping\product_detail.php

if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';
require_once '../../../includes/check_login.php';
$productID = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($productID <= 0) {
    echo "Liên kết sản phẩm không hợp lệ.";
    exit;
}

$stmt = $conn->prepare("
    SELECT 
      p.*, 
      c.CategoryName,
      (SELECT COUNT(*) FROM Wishlist w WHERE w.ProductID = p.ProductID) AS FavoriteCount
    FROM Product p
    LEFT JOIN Category c ON p.CategoryID = c.CategoryID
    WHERE p.ProductID = ?
    LIMIT 1
");
$stmt->bind_param("i", $productID);
$stmt->execute();
$product = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$product) {
    echo "Không tìm thấy sản phẩm.";
    exit;
}
$favoriteCount = (int)($product['FavoriteCount'] ?? 0);

function normalize_media_url($url) {
    if (!$url) return '/HeThongChamSocCaKoi/assets/images/default_product.png';
    $url = trim($url);
    if (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0) return $url;
    return '/' . ltrim($url, '/');
}

/* ===== GHÉP MEDIA: ẢNH ĐẠI DIỆN + GALLERY (ảnh/video) ===== */

// Mảng media hiển thị trên trang detail (thứ tự: avatar trước, rồi đến gallery)
$mediaItems = [];

// 1. Ảnh đại diện từ bảng Product
$mainImageUrl = normalize_media_url($product['ImageURL'] ?? '');
if (!empty($product['ImageURL'])) {
    $mediaItems[] = [
        'ProductImageID' => null,
        'ImageURL'       => $mainImageUrl,
        'MediaType'      => 'image',
        'IsPrimary'      => 1,
        'SortOrder'      => 0,
        'Source'         => 'main'
    ];
}

// 2. Các media trong bảng ProductImage
$imgStmt = $conn->prepare("
    SELECT 
      ProductImageID,
      ImageURL,
      MediaType,
      IsPrimary,
      SortOrder
    FROM ProductImage
    WHERE ProductID = ?
    ORDER BY SortOrder ASC, ProductImageID ASC
");
$imgStmt->bind_param("i", $productID);
$imgStmt->execute();
$imgRes = $imgStmt->get_result();

while ($row = $imgRes->fetch_assoc()) {
    $row['ImageURL'] = normalize_media_url($row['ImageURL'] ?? '');

    if (empty($row['MediaType'])) {
        $ext = strtolower(pathinfo($row['ImageURL'], PATHINFO_EXTENSION));
        $videoExt = ['mp4','mov','avi','mkv','webm','flv','wmv','m4v','3gp'];
        $row['MediaType'] = in_array($ext, $videoExt, true) ? 'video' : 'image';
    }

    $row['Source'] = 'gallery';
    $mediaItems[] = $row;
}
$imgStmt->close();

// Nếu không có avatar & không có media → dùng default
if (empty($mediaItems)) {
    $mediaItems[] = [
        'ProductImageID' => null,
        'ImageURL'       => normalize_media_url(''),
        'MediaType'      => 'image',
        'IsPrimary'      => 1,
        'SortOrder'      => 0,
        'Source'         => 'fallback'
    ];
}

// Media chính là phần tử đầu tiên (ưu tiên ảnh đại diện)
$primaryMedia = $mediaItems[0];

// ===== Wishlist =====
$isFavorite = false;
if (!empty($_SESSION['username'])) {
    $stmtUser = $conn->prepare("SELECT UserID FROM Users WHERE Username = ? LIMIT 1");
    $stmtUser->bind_param("s", $_SESSION['username']);
    $stmtUser->execute();
    $u = $stmtUser->get_result()->fetch_assoc();
    $stmtUser->close();

    if ($u) {
        $uid = (int)$u['UserID'];
        $wStmt = $conn->prepare("SELECT 1 FROM Wishlist WHERE UserID = ? AND ProductID = ? LIMIT 1");
        $wStmt->bind_param("ii", $uid, $productID);
        $wStmt->execute();
        $isFavorite = $wStmt->get_result()->num_rows > 0;
        $wStmt->close();
    }
}

$page_title     = ($product['Name'] ?? 'Sản phẩm') . ' - KoiCare Shop';
$priceFormatted = number_format($product['Price'], 0, ',', '.');
$soldCount      = (int)($product['SoldCount'] ?? 0);
$ratingAvg      = (float)($product['RatingAverage'] ?? 0);
$ratingCount    = (int)($product['RatingCount'] ?? 0);
$stock          = (int)($product['Stock'] ?? 0);
$outOfStock     = $stock <= 0;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title><?= htmlspecialchars($page_title) ?></title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/product_detail.css">
  <style>
    .main-image-box video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 16px;
      display: block;
    }
    .thumb-list .pd-thumb {
      position: relative;
    }
    .thumb-list .pd-thumb img,
    .thumb-list .pd-thumb video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
      display: block;
    }
    .pd-thumb-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%); /* center vòng tròn */

      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);

      display: flex;
      align-items: center;
      justify-content: center;

      pointer-events: none;
    }

    /* Icon tam giác */
    .pd-thumb-play::before {
      content: "\25B6";      /* ký tự ▶ */
      font-size: 18px;
      color: #fff;

      /* nắn lại cho “giữa” hơn về mặt thị giác */
      transform: translateX(1px); /* nếu còn thấy lệch, thử 0.5px hoặc 1.5px */
    }



  </style>
</head>
<body>

<?php include '../../../includes/header.php'; ?>

<div class="product-detail-page">
  <div class="product-detail-main">
    <!-- Cột gallery -->
    <div class="gallery-column">
      <!-- Media chính: ảnh đại diện hoặc video -->
      <div class="main-image-box" id="pd-main-box">
        <?php if (($primaryMedia['MediaType'] ?? 'image') === 'video'): ?>
          <video
            id="pd-main-media"
            src="<?= htmlspecialchars($primaryMedia['ImageURL']) ?>"
            controls
            playsinline
          ></video>
        <?php else: ?>
          <img
            id="pd-main-media"
            src="<?= htmlspecialchars($primaryMedia['ImageURL']) ?>"
            alt="<?= htmlspecialchars($product['Name']) ?>"
          >
        <?php endif; ?>
      </div>

      <?php if (!empty($mediaItems)): ?>
        <div class="thumb-list">
          <?php foreach ($mediaItems as $index => $img): ?>
            <?php
              $src  = $img['ImageURL'];
              $type = $img['MediaType'] ?? 'image';
            ?>
            <div class="pd-thumb <?= $index === 0 ? 'active' : '' ?>"
                 data-src="<?= htmlspecialchars($src) ?>"
                 data-type="<?= htmlspecialchars($type) ?>">
              <?php if ($type === 'video'): ?>
                <video src="<?= htmlspecialchars($src) ?>" muted></video>
                <span class="pd-thumb-play"></span>
              <?php else: ?>
                <img src="<?= htmlspecialchars($src) ?>" alt="thumb">
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

    <!-- Cột thông tin -->
    <div class="info-column">
      <div class="pd-title-row">
        <h1 class="pd-name"><?= htmlspecialchars($product['Name']) ?></h1>
        <button
          type="button"
          class="pd-wishlist-btn<?= $isFavorite ? ' active' : '' ?>"
          onclick="toggleWishlist(<?= $productID ?>, this)"
          aria-label="<?= $isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích' ?>"
        >
          ❤
        </button>
      </div>

      <div class="pd-meta-top">
        <div class="pd-rating-block">
          <?php if ($ratingCount > 0 && $ratingAvg > 0): ?>
            <span class="pd-rating-score"><?= number_format($ratingAvg, 1) ?></span>
            <span class="pd-stars">
              <?php
              $fullStars = (int)round($ratingAvg);
              for ($i = 1; $i <= 5; $i++) {
                  echo $i <= $fullStars ? '★' : '☆';
              }
              ?>
            </span>
            <span class="pd-rating-count">(<?= $ratingCount ?> đánh giá)</span>
          <?php else: ?>
            <span class="pd-rating-empty">Chưa có đánh giá</span>
          <?php endif; ?>
        </div>

        <div class="pd-sold-block">
          Đã bán <strong><?= $soldCount ?></strong>
        </div>

        <div class="pd-fav-block">
          ❤ Được thêm vào yêu thích bởi
          <strong><?= $favoriteCount ?></strong> người
        </div>
      </div>

      <div class="pd-price-block">
        <span class="pd-price"><?= $priceFormatted ?> đ</span>
      </div>

      <div class="pd-extra-info">
        <div class="pd-row">
          <span class="label">Danh mục:</span>
          <span class="value"><?= htmlspecialchars($product['CategoryName'] ?? 'Khác') ?></span>
        </div>
        <div class="pd-row">
          <span class="label">Mã sản phẩm:</span>
          <span class="value">#<?= $productID ?></span>
        </div>
        <div class="pd-row">
          <span class="label">Tình trạng:</span>
          <span class="value">
            <?php if ($stock > 0): ?>
              Còn hàng (Kho: <?= $stock ?>)
            <?php else: ?>
              <span class="pd-out-stock">Hết hàng</span>
            <?php endif; ?>
          </span>
        </div>
      </div>

      <div class="pd-buy-row">
        <div class="pd-qty-group">
          <span class="label">Số lượng</span>
          <div class="pd-qty-control">
            <button type="button" id="pd-qty-minus" <?= $outOfStock ? 'disabled' : '' ?>>−</button>
            <input
              type="number"
              id="pd-qty"
              min="1"
              max="<?= $stock > 0 ? $stock : 1 ?>"
              value="1"
              <?= $outOfStock ? 'disabled' : '' ?>
            >
            <button type="button" id="pd-qty-plus" <?= $outOfStock ? 'disabled' : '' ?>>+</button>
          </div>
        </div>

        <div class="pd-cta-group">
          <button
            type="button"
            class="btn pd-btn-add"
            id="btn-add-cart"
            <?= $outOfStock ? 'disabled' : '' ?>
          >
            <?= $outOfStock ? 'Hết hàng' : '🛒 Thêm vào giỏ' ?>
          </button>
          <button
            type="button"
            class="btn pd-btn-buy"
            id="btn-buy-now"
            <?= $outOfStock ? 'disabled' : '' ?>
          >
            ⚡ Mua ngay
          </button>
        </div>
      </div>

      <div class="pd-trust-row">
        <div>✔ Thanh toán an toàn qua VietQR / VNPay</div>
        <div>✔ Tư vấn thiết bị & thức ăn theo hồ Koi thực tế</div>
        <div>✔ Sản phẩm tối ưu cho hệ sinh thái KoiCareS</div>
      </div>
    </div>
  </div>

  <!-- Tabs mô tả / đánh giá -->
  <div class="product-detail-extra">
    <div class="pd-tabs">
      <button class="pd-tab-btn active" data-tab="description">Mô tả</button>
      <button class="pd-tab-btn" data-tab="reviews">Đánh giá</button>
    </div>

    <!-- Tab Mô tả -->
    <div class="pd-tab-panel active" id="tab-description">
      <div class="pd-description-card">
        <h2>Mô tả sản phẩm</h2>
        <div class="pd-description">
          <?= nl2br(htmlspecialchars($product['Description'] ?: 'Chưa có mô tả chi tiết.')) ?>
        </div>
      </div>
    </div>

    <!-- Tab Đánh giá -->
    <div class="pd-tab-panel" id="tab-reviews">
      <div class="reviews-wrap" data-product-id="<?= $productID ?>">
        <div class="reviews-header">
          <div class="reviews-summary-box">
            <div>
              <div class="rv-score" id="rv-avg">–</div>
              <div class="rv-stars" id="rv-stars">☆☆☆☆☆</div>
            </div>
            <div>
              <div class="rv-count-text" id="rv-count-text">Chưa có đánh giá</div>
            </div>
          </div>
          <div class="reviews-breakdown" id="rv-breakdown">
            <!-- render bằng JS -->
          </div>
        </div>

        <div class="review-form-card" id="rv-form-block">
          <div class="rv-form-header">
            <div><strong>Đánh giá của bạn</strong></div>
            <div class="rv-stars-input" id="rv-stars-input">
              <span data-v="1">★</span>
              <span data-v="2">★</span>
              <span data-v="3">★</span>
              <span data-v="4">★</span>
              <span data-v="5">★</span>
            </div>
          </div>
          <textarea id="rv-comment" placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm cho hồ Koi của bạn..."></textarea>
          <div class="rv-form-actions">
            <button class="btn pd-btn-add" id="rv-submit-btn">Gửi đánh giá</button>
          </div>
          <div class="rv-notice" id="rv-notice">
            Chỉ khách đã mua sản phẩm mới có thể đánh giá. Hệ thống sẽ tự kiểm tra đơn hàng của bạn.
          </div>
        </div>

        <div class="reviews-list" id="reviews-list">
          <!-- danh sách review -->
        </div>
      </div>
    </div>
  </div>

  <div id="toast-stack" class="toast-stack"></div>
</div>

<!-- Modal xác nhận thông tin giao hàng -->
<div id="confirm-info-modal" class="pd-modal" style="display:none;">
  <div class="pd-modal-content">
    <button class="pd-close-btn" onclick="closeConfirmModal()">&times;</button>
    <h3>📦 Xác nhận thông tin giao hàng</h3>

    <label>Họ tên</label>
    <input type="text" id="userFullName" readonly>

    <label>Số điện thoại</label>
    <input type="text" id="userPhone" placeholder="Nhập SĐT...">

    <label>Địa chỉ nhận hàng</label>
    <input type="text" id="userAddress" placeholder="Nhập địa chỉ...">

    <div class="pd-modal-actions">
      <button class="btn pd-btn-buy" onclick="saveUserInfo()">Xác nhận</button>
    </div>
  </div>
</div>

<!-- Modal Mua Ngay -->
<div id="buy-modal" class="buy-modal" style="display:none;">
  <div class="modal-content">
    <button class="close-btn" onclick="closeBuyModal()">&times;</button>
    <h3>Xác nhận mua hàng</h3>
    <div class="buy-body">
      <img id="buy-img" src="/HeThongChamSocCaKoi/assets/images/default_product.png" alt="Sản phẩm">
      <div class="buy-info">
        <div id="buy-name" class="buy-name"></div>
        <div id="buy-price" class="buy-price"></div>
        <label for="buy-quantity">Số lượng:</label>
        <input type="number" id="buy-quantity" min="1" value="1">
        <div id="buy-total" class="buy-total"></div>

        <div class="buy-method" style="margin-top:10px;">
          <label for="pay-method"><b>Chọn cổng thanh toán:</b></label><br>
          <select id="pay-method" style="padding:5px;width:100%;max-width:260px;">
            <option value="vietqr">💰 VietQR (Chuyển khoản thật qua PayOS)</option>
            <option value="vnpay">💳 VNPay (Môi trường test)</option>
          </select>
        </div>

        <div style="margin-top:20px;">
          <button class="btn pd-btn-buy" onclick="confirmBuyNow()">Thanh toán</button>
          <button class="btn pd-btn-add" onclick="closeBuyModal()">Hủy</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Loading overlay -->
<div id="global-loading">
  <div class="spinner-container">
    <div class="spinner"></div>
    <div class="logo-text">Koi<span>CareS</span></div>
  </div>
</div>

<?php include '../../../includes/footer.php'; ?>

<script>
  window.role = "<?= $_SESSION['role'] ?? 'Customer' ?>";
  window.PD_STOCK = <?= $stock ?>;
  window.PD_PRODUCT_ID = <?= $productID ?>;
</script>
<script src="/HeThongChamSocCaKoi/assets/js/shop/products.js"></script>

<script>
// Thay đổi media chính khi click thumbnail + xử lý số lượng, mua ngay
document.addEventListener('DOMContentLoaded', function () {
  const thumbs    = document.querySelectorAll('.pd-thumb');
  const mainBox   = document.getElementById('pd-main-box');
  let   mainMedia = document.getElementById('pd-main-media');
  const qtyInput  = document.getElementById('pd-qty');
  const minusBtn  = document.getElementById('pd-qty-minus');
  const plusBtn   = document.getElementById('pd-qty-plus');
  const addBtn    = document.getElementById('btn-add-cart');
  const buyBtn    = document.getElementById('btn-buy-now');
  const maxStock  = typeof window.PD_STOCK === 'number' ? window.PD_STOCK : <?= $stock ?>;
  const outOfStock = maxStock <= 0;

  // đổi media chính theo thumbnail
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      const src  = t.getAttribute('data-src');
      const type = t.getAttribute('data-type') || 'image';
      if (src && mainBox) {
        if (type === 'video') {
          mainBox.innerHTML =
            '<video id="pd-main-media" src="' + src + '" controls playsinline autoplay></video>';
        } else {
          mainBox.innerHTML =
            '<img id="pd-main-media" src="' + src + '" alt="">';
        }
        mainMedia = document.getElementById('pd-main-media');
      }
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    });
  });

  if (!outOfStock && qtyInput) {
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        let v = parseInt(qtyInput.value) || 1;
        v = Math.max(1, v - 1);
        qtyInput.value = v;
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        let v = parseInt(qtyInput.value) || 1;
        const limit = maxStock || 9999;
        v = Math.min(limit, v + 1);
        qtyInput.value = v;
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        let v = parseInt(qtyInput.value) || 1;
        const limit = maxStock || 9999;
        v = Math.min(Math.max(v, 1), limit);
        qtyInput.value = v;
        addToCart(window.PD_PRODUCT_ID, v, mainMedia);
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        let v = 1;
        if (qtyInput) {
          v = parseInt(qtyInput.value) || 1;
          const limit = maxStock || 9999;
          v = Math.min(Math.max(v, 1), limit);
          qtyInput.value = v;
        }
        checkUserInfoBeforeBuy(window.PD_PRODUCT_ID, <?= (float)$product['Price'] ?>, v);
      });
    }
  } else {
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        toast('Sản phẩm đã hết hàng.', 'warn');
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        toast('Sản phẩm đã hết hàng.', 'warn');
      });
    }
  }

  initTabs();
  loadReviews();
});

// Tabs mô tả / đánh giá
function initTabs() {
  const buttons = document.querySelectorAll('.pd-tab-btn');
  const panels  = document.querySelectorAll('.pd-tab-panel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      buttons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  });
}

// ------- Phần review giữ nguyên như trước -------

let rvCurrentRating  = 0;
let rvUserCanReview  = false;
let rvUserHasReview  = false;

function renderStarText(score) {
  let full = Math.round(score);
  let s = '';
  for (let i = 1; i <= 5; i++) {
    s += i <= full ? '★' : '☆';
  }
  return s;
}

async function loadReviews() {
  const wrap = document.querySelector('.reviews-wrap');
  if (!wrap) return;
  const pid = wrap.dataset.productId;

  try {
    const res = await fetch(`/HeThongChamSocCaKoi/backend/api/customer/reviews/list.php?product_id=${pid}&per_page=10&page=1`);
    const data = await res.json();
    if (!data.success) return;

    const summary   = data.summary || {};
    const avg       = summary.average || 0;
    const count     = summary.count || 0;
    const breakdown = summary.breakdown || {};
    rvUserCanReview = !!summary.user_can_review;
    rvUserHasReview = !!summary.user_review;

    const avgEl   = document.getElementById('rv-avg');
    const starsEl = document.getElementById('rv-stars');
    const countEl = document.getElementById('rv-count-text');
    if (avgEl)   avgEl.textContent   = count > 0 ? avg.toFixed(1) : '–';
    if (starsEl) starsEl.textContent = count > 0 ? renderStarText(avg) : '☆☆☆☆☆';
    if (countEl) {
      countEl.textContent = count > 0
        ? `Dựa trên ${count} đánh giá từ người mua`
        : 'Chưa có đánh giá nào cho sản phẩm này.';
    }

    const brEl = document.getElementById('rv-breakdown');
    if (brEl) {
      const total = count || 1;
      let html = '';
      for (let s = 5; s >= 1; s--) {
        const c       = breakdown[s] || 0;
        const percent = Math.round((c / total) * 100);
        html += `
          <div class="rv-bar-row">
            <span class="rv-bar-label">${s}★</span>
            <div class="rv-bar">
              <div class="rv-bar-inner" style="width:${percent}%;"></div>
            </div>
            <span>${c}</span>
          </div>
        `;
      }
      brEl.innerHTML = html;
    }

    const formBlock = document.getElementById('rv-form-block');
    const noticeEl  = document.getElementById('rv-notice');
    if (!rvUserCanReview) {
      if (formBlock) formBlock.style.opacity = 0.6;
      if (noticeEl)  noticeEl.textContent = 'Bạn chỉ có thể đánh giá sau khi đã mua sản phẩm này trên hệ thống.';
    } else {
      if (noticeEl) {
        noticeEl.textContent = rvUserHasReview
          ? 'Bạn có thể cập nhật lại đánh giá nếu muốn.'
          : 'Cảm ơn bạn đã mua hàng, hãy chia sẻ trải nghiệm sản phẩm cho cộng đồng KoiCareS.';
      }
      if (summary.user_review) {
        rvCurrentRating = summary.user_review.Rating || 0;
        const cmtEl = document.getElementById('rv-comment');
        if (cmtEl) cmtEl.value = summary.user_review.Comment || '';
        updateStarInputView();
      }
    }

    const listEl = document.getElementById('reviews-list');
    if (listEl) {
      const reviews = data.reviews || [];
      if (!reviews.length) {
        listEl.innerHTML = `<p style="font-size:14px;color:#64748b;margin:6px 0;">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.</p>`;
      } else {
        listEl.innerHTML = reviews.map(r => {
          const dateStr  = r.UpdatedAt || r.CreatedAt || '';
          const d        = dateStr ? new Date(dateStr) : null;
          const dateView = d ? d.toLocaleString('vi-VN') : '';
          const stars    = renderStarText(r.Rating || 0);
          const avatar   = r.AvatarURL || '/HeThongChamSocCaKoi/assets/images/default_avatar.png';

          return `
            <div class="review-item">
              <div class="review-avatar">
                <img src="${avatar}" alt="avatar">
              </div>
              <div class="review-body">
                <div class="review-name">${r.FullName || 'Người dùng'}</div>
                <div class="review-stars">${stars}</div>
                <div class="review-date">${dateView}</div>
                <div class="review-comment">${(r.Comment || '').replace(/\n/g,'<br>')}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    initReviewForm(pid);
  } catch (e) {}
}

function updateStarInputView() {
  const stars = document.querySelectorAll('#rv-stars-input span');
  stars.forEach(el => {
    const v = parseInt(el.dataset.v || '0');
    if (v <= rvCurrentRating) el.classList.add('active');
    else el.classList.remove('active');
  });
}

function initReviewForm(productId) {
  const starEls = document.querySelectorAll('#rv-stars-input span');
  starEls.forEach(el => {
    el.addEventListener('click', () => {
      rvCurrentRating = parseInt(el.dataset.v || '0');
      updateStarInputView();
    });
  });

  const btn = document.getElementById('rv-submit-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (!rvUserCanReview) {
        toast('Bạn cần mua sản phẩm trước khi đánh giá.', 'warn');
        return;
      }
      if (rvCurrentRating < 1 || rvCurrentRating > 5) {
        toast('Vui lòng chọn số sao (1–5).', 'warn');
        return;
      }
      const cmtEl  = document.getElementById('rv-comment');
      const comment = (cmtEl?.value || '').trim();
      try {
        const res = await fetch('/HeThongChamSocCaKoi/backend/api/customer/reviews/add_or_update.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            rating: rvCurrentRating,
            comment: comment
          })
        });
        const data = await res.json();
        if (!data.success) {
          toast(data.error || 'Không thể lưu đánh giá', 'error');
          return;
        }
        toast('Đã ghi nhận đánh giá của bạn. Cảm ơn!', 'success');
        loadReviews();
      } catch {
        toast('Lỗi kết nối máy chủ khi gửi đánh giá.', 'error');
      }
    });
  }
}

// Flow xác nhận thông tin giao hàng
function closeConfirmModal() {
  const modal = document.getElementById('confirm-info-modal');
  if (modal) modal.style.display = 'none';
}

function saveUserInfo() {
  const phone   = (document.getElementById('userPhone')?.value || '').trim();
  const address = (document.getElementById('userAddress')?.value || '').trim();

  if (!phone || !address) {
    toast('⚠️ Vui lòng nhập đầy đủ SĐT và địa chỉ!', 'warn');
    return;
  }

  const loader = document.getElementById("global-loading");
  if (loader) loader.classList.add("show");

  fetch('/HeThongChamSocCaKoi/backend/api/users/profile/update_info.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Phone: phone, Address: address })
  })
    .then(r => r.json())
    .then(res => {
      if (loader) loader.classList.remove("show");
      if (res.success) {
        closeConfirmModal();
        toast("✅ Thông tin đã cập nhật, đang chuẩn bị đơn hàng...", "success");
      } else {
        toast('❌ ' + (res.error || 'Lỗi cập nhật thông tin.'), 'error');
      }
    })
    .catch(() => {
      if (loader) loader.classList.remove("show");
      toast('❌ Lỗi kết nối máy chủ.', 'error');
    });
}
</script>
<script src="/HeThongChamSocCaKoi/assets/js/shop/order_manage.js"></script>
</body>
</html>
