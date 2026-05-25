<?php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once '../../../includes/db.php';
require_once '../../../includes/check_login.php';
$username = $_SESSION['username'] ?? null;
if (!$username) {
  header('Location: /HeThongChamSocCaKoi/frontend/account/login.php');
  exit;
}

// ✅ Lấy thông tin người dùng
$user_stmt = $conn->prepare("SELECT UserID, FullName, Phone, Address FROM Users WHERE Username=?");
$user_stmt->bind_param("s", $username);
$user_stmt->execute();
$user = $user_stmt->get_result()->fetch_assoc();
$uid = $user['UserID'];

// ✅ Lấy thông tin giỏ hàng
$stmt = $conn->prepare("
  SELECT c.CartID, c.ProductID, c.Quantity, p.Name, p.Price, p.ImageURL, p.Stock
  FROM Cart c
  JOIN Product p ON c.ProductID = p.ProductID
  WHERE c.UserID = ?
");
$stmt->bind_param("i", $uid);
$stmt->execute();
$result = $stmt->get_result();
$cart_items = $result->fetch_all(MYSQLI_ASSOC);

// [START] FIX: Kiểm tra, điều chỉnh hiển thị VÀ CẬP NHẬT CSDL ngay lập tức
$total_amount = 0;
$adjusted_items = []; // Lưu các sản phẩm bị điều chỉnh số lượng

// Chuẩn bị câu lệnh update một lần bên ngoài vòng lặp để tối ưu hiệu suất
$update_cart_stmt = $conn->prepare("UPDATE Cart SET Quantity = ? WHERE CartID = ?");

foreach ($cart_items as $key => $item) {
  $stock = (int)$item['Stock'];
  $quantity = (int)$item['Quantity'];
  $cart_id = (int)$item['CartID'];
  $name = htmlspecialchars($item['Name']);

  // Nếu số lượng trong giỏ lớn hơn tồn kho
  if ($quantity > $stock) {
    // 1. Cập nhật mảng hiển thị (visual)
    $cart_items[$key]['Quantity'] = $stock; 
    
    // 2. CẬP NHẬT TRỰC TIẾP VÀO CSDL (Database Update)
    $update_cart_stmt->bind_param("ii", $stock, $cart_id);
    $update_cart_stmt->execute();

    // 3. Ghi nhận sản phẩm bị điều chỉnh để báo Toast
    $adjusted_items[] = $name;
  }
  
  // Tính tổng tiền dựa trên số lượng MỚI (đã điều chỉnh)
  $total_amount += $cart_items[$key]['Price'] * $cart_items[$key]['Quantity'];
}
$update_cart_stmt->close(); // Đóng statement sau khi lặp xong
// [END] FIX

// helper ảnh
function normalize_img($url) {
  if (!$url) return '/HeThongChamSocCaKoi/assets/images/default_product.png';
  $url = trim($url);
  if (strpos($url, 'http://') === 0 || strpos(strtoupper($url), 'HTTPS://') === 0) return $url;
  return '/' . ltrim($url, '/');
}

// Biến JSON để truyền thông tin sản phẩm bị điều chỉnh cho JS
$adjusted_items_json = json_encode($adjusted_items);
?>
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Giỏ hàng - KoiLover</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/cart.css">
<!-- Thêm Lucide Icons CDN -->
<script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
<?php include '../../../includes/header.php'; ?>

<div class="cart-page">
  <div class="cart-page-inner">
    <h2 class="cart-title">🛒 Giỏ hàng của bạn</h2>

    <?php if (empty($cart_items)): ?>
      <div class="empty-cart" style="text-align: center;">
        <img src="https://img.icons8.com/clouds/300/shopping-cart.png" alt="Empty cart" style="max-width: 150px; margin: 20px auto;">
        <p>Giỏ hàng của bạn đang trống.</p>
        <a href="/HeThongChamSocCaKoi/frontend/shop/products.php" class="btn primary">Tiếp tục mua sắm</a>
      </div>
    <?php else: ?>

      <div class="cart-main-layout">
        <!-- Bên trái: danh sách sản phẩm -->
        <div class="cart-left">
          <div class="cart-header-row">
            <span class="ch-product">Sản phẩm</span>
            <span class="ch-price">Đơn giá</span>
            <span class="ch-qty">Số lượng</span>
            <span class="ch-subtotal">Thành tiền</span>
            <span class="ch-action">Thao tác</span>
          </div>

          <?php foreach ($cart_items as $item): 
            $quantity_display = (int)$item['Quantity'];
            $stock_display = (int)$item['Stock'];
            $lineTotal = $item['Price'] * $quantity_display;
            $img = normalize_img($item['ImageURL']);
          ?>
          <div class="cart-item-row" data-cartid="<?= $item['CartID'] ?>">
            <div class="ci-product">
              <a href="/HeThongChamSocCaKoi/frontend/shop/product_detail.php?id=<?= $item['ProductID'] ?>" class="ci-thumb">
                <img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($item['Name']) ?>" onerror="this.onerror=null; this.src='/HeThongChamSocCaKoi/assets/images/default_product.png';">
              </a>
              <div class="ci-info">
                <a href="/HeThongChamSocCaKoi/frontend/shop/product_detail.php?id=<?= $item['ProductID'] ?>" class="ci-name">
                  <?= htmlspecialchars($item['Name']) ?>
                </a>
                <div class="ci-meta">
                  Kho: <?= $stock_display ?>
                  <?php if ($stock_display <= 5 && $stock_display > 0): ?>
                    <span class="low-stock">Sắp hết hàng</span>
                  <?php elseif ($stock_display === 0): ?>
                    <span class="out-of-stock">Hết hàng</span>
                  <?php endif; ?>
                </div>
              </div>
            </div>

            <div class="ci-price" data-price="<?= (int)$item['Price'] ?>">
              <?= number_format($item['Price'],0,',','.') ?> đ
            </div>

            <div class="ci-qty">
              <?php if ($stock_display > 0): ?>
              <div class="qty-control" data-cartid="<?= $item['CartID'] ?>" data-stock="<?= $stock_display ?>" data-product-name="<?= htmlspecialchars($item['Name']) ?>">
                <button type="button" class="qty-btn minus" title="Giảm số lượng" <?= $quantity_display <= 1 ? 'disabled' : '' ?>>−</button>
                <input type="number"
                       class="quantity-input"
                       value="<?= $quantity_display ?>"
                       min="1"
                       max="<?= $stock_display ?>"
                       >
                <!-- FIX 1: Loại bỏ 'disabled' khỏi nút Plus để cho phép sự kiện click được gọi và hiển thị Toast -->
                <button type="button" class="qty-btn plus" title="Tăng số lượng">+</button>
              </div>
              <?php else: ?>
                <span class="text-rose-500 font-semibold">Hết hàng</span>
              <?php endif; ?>
            </div>

            <div class="ci-subtotal">
              <?= number_format($lineTotal,0,',','.') ?> đ
            </div>

            <div class="ci-action">
              <button type="button"
                    class="ci-remove-btn"
                    onclick="confirmRemoveItem(event, <?= $item['CartID'] ?>)">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
                Xóa
              </button>
            </div>
          </div>
          <?php endforeach; ?>
        </div>

        <!-- Bên phải: tóm tắt đơn hàng -->
        <div class="cart-right">
          <div class="cart-summary-card">
            <h3>Thông tin đơn hàng</h3>

            <div class="summary-row">
              <span>Tạm tính</span>
              <span id="summary-subtotal"><?= number_format($total_amount,0,',','.') ?> đ</span>
            </div>

            <div class="summary-row">
              <span>Phí vận chuyển</span>
              <span class="summary-note">Sẽ được tư vấn sau</span>
            </div>

            <div class="summary-row total">
              <span>Tổng cộng</span>
              <span id="summary-total"><?= number_format($total_amount,0,',','.') ?> đ</span>
            </div>

            <p class="summary-hint">
              Sau khi đặt hàng, KoiCareS sẽ liên hệ xác nhận đơn và tư vấn phí giao hàng phù hợp hồ cá của bạn.
              Đơn hàng sẽ được tạo và chuyển sang trang **Xác nhận** để bạn chọn phương thức thanh toán.
            </p>

            <button type="button" class="checkout-btn" onclick="startCheckoutProcess()" 
              <?= $total_amount <= 0 ? 'disabled' : '' // Vô hiệu hóa nút nếu tổng tiền = 0 ?>>
              Tiến hành đặt hàng & Xác nhận
            </button>
            <?php if ($total_amount <= 0): ?>
              <p class="text-rose-500 text-sm mt-2 text-center" id="out-of-stock-checkout-msg">Giỏ hàng rỗng hoặc tất cả sản phẩm đã hết hàng, không thể đặt hàng.</p>
            <?php endif; ?>
          </div>
        </div>
      </div>

    <?php endif; ?>
  </div>

  <!-- Toast (đồng bộ với products.php) -->
  <div id="toast-stack" class="toast-stack"></div>
</div>

<!-- ✅ Modal xác nhận xóa sản phẩm -->
<div id="remove-confirm-modal" class="modal-overlay">
    <div class="modal-box max-w-sm">
      <button class="close-btn" onclick="closeRemoveModal()">&times;</button>
      <h3 class="text-rose-500">❌ Xác nhận xóa</h3>
      <p class="text-center text-slate-600 mb-6">
        Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?
      </p>
      <div class="modal-actions justify-center">
        <button class="btn bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors" onclick="closeRemoveModal()">Hủy</button>
        <button class="btn bg-rose-500 text-white hover:bg-rose-600 transition-colors" onclick="performRemoveItem()">Xóa</button>
      </div>
    </div>
</div>


<!-- ✅ Loading overlay -->
<div id="global-loading">
  <div class="spinner-container">
    <div class="spinner"></div>
    <div class="logo-text">Koi<span>Lover</span></div>
  </div>
</div>

<?php include '../../../includes/footer.php'; ?>

<script>
// Biến lưu CartID cần xóa
let cartIdToRemove = null;

// Biến lưu danh sách các sản phẩm bị điều chỉnh số lượng
const adjustedItems = <?php echo $adjusted_items_json; ?>;

// Khởi tạo Lucide Icons khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  
  // ✅ HIỂN THỊ CẢNH BÁO NẾU SỐ LƯỢNG BỊ ĐIỀU CHỈNH (Tối ưu nội dung)
  if (adjustedItems && adjustedItems.length > 0) {
    // Tối ưu thông báo: chỉ cần thông báo đã điều chỉnh, không cần lặp lại "đã được điều chỉnh về mức tồn kho tối đa"
    let message = "⚠️ Lưu ý: Số lượng các sản phẩm sau (" + adjustedItems.join(", ") + ") đã được điều chỉnh về mức tồn kho tối đa.";
    toast(message, "warn");
  }
});

// ===== Toast (Đồng bộ với products.js) =====
function toast(message, type = 'success') {
    let stack = document.getElementById('toast-stack');
    if (!stack) return; 

    const colors = {
      success: 'border-l-emerald-500 text-emerald-800',
      error: 'border-l-rose-500 text-rose-800',
      warn: 'border-l-amber-500 text-amber-800'
    };
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-triangle';
    const colorClass = colors[type] || colors.success;

    const item = document.createElement('div');
    item.className = `toast show ${type}`;
    item.innerHTML = `
      <i data-lucide="${icon}" class="w-5 h-5"></i>
      <span class="toast-message">${message}</span>
      <button onclick="this.closest('.toast').remove()" class="ml-auto text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-3 h-3"></i></button>
    `;

    stack.appendChild(item);
    if(window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      item.classList.remove('show');
    }, 6000); // Tăng thời gian hiển thị cho cảnh báo dài
    setTimeout(() => item.remove(), 6500);
}

// ===== Logic Xóa sản phẩm (Giữ nguyên) =====
function confirmRemoveItem(event, cartId) {
    event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ <a>
    cartIdToRemove = cartId;
    const modal = document.getElementById("remove-confirm-modal");
    if (modal) modal.style.display = "flex";
}

function closeRemoveModal() {
    cartIdToRemove = null;
    const modal = document.getElementById("remove-confirm-modal");
    if (modal) modal.style.display = "none";
}

function performRemoveItem() {
    // FIX 1: Kiểm tra kỹ ID trước khi gọi fetch
    const id = parseInt(cartIdToRemove);
    if (isNaN(id) || id <= 0) {
        toast("❌ Lỗi: Không tìm thấy ID sản phẩm hợp lệ để xóa.", "error");
        return;
    }

    closeRemoveModal(); 

    const loader = document.getElementById("global-loading");
    if (loader) loader.classList.add("show");
    
    // FIX 2: Chuyển sang dùng POST với body JSON để truyền ID (đồng bộ với API cập nhật)
    fetch("/HeThongChamSocCaKoi/backend/api/shop/remove_from_cart.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart_id: id }) 
    })
    .then(r => r.json())
    .then(res => {
      if (loader) loader.classList.remove("show");
      if (res.success) {
        toast("✅ Đã xóa sản phẩm khỏi giỏ hàng", "success");
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast("❌ " + (res.error || "Không thể xóa sản phẩm"), "error");
      }
    })
    .catch(() => {
      if (loader) loader.classList.remove("show");
      toast("❌ Lỗi kết nối máy chủ khi xóa sản phẩm", "error");
    });
}

// ✅ [CẬP NHẬT] Logic TẠO ĐƠN HÀNG VÀ CHUYỂN HƯỚNG SANG CHECKOUT.PHP
async function startCheckoutProcess(){
  // Kiểm tra tổng tiền lần cuối trước khi đặt hàng
  const currentTotal = parseFloat(document.getElementById("summary-total").textContent.replace(/[^0-9]/g, '')) || 0;
  if (currentTotal <= 0) {
    toast("❌ Giỏ hàng rỗng hoặc tất cả sản phẩm đã hết hàng. Không thể đặt đơn.", "error");
    return;
  }

  const loader = document.getElementById("global-loading");
  if (loader) loader.classList.add("show");
  toast("🔁 Đang tạo đơn hàng và chuyển đến trang xác nhận...", "warn");

  try {
    // API tạo đơn hàng từ giỏ hàng (chưa kèm thông tin nhận hàng hay phương thức)
    const res = await fetch("/HeThongChamSocCaKoi/backend/api/shop/create_order_from_cart.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) // Gửi body rỗng, API sẽ tự lấy giỏ hàng
    });
    const data = await res.json();

    if (loader) loader.classList.remove("show");

    if(!data.success){
      toast(data.error || "Không thể tạo đơn hàng. Vui lòng kiểm tra lại giỏ hàng.", "error");
      return;
    }

    const { order_id } = data;
    toast("✅ Đơn hàng tạm thời đã tạo thành công!", "success");
    
    // CHUYỂN HƯỚNG SANG TRANG CHECKOUT ĐỂ XÁC NHẬN VÀ THANH TOÁN
    setTimeout(() => {
      window.location.href =
        `/HeThongChamSocCaKoi/frontend/customer/shopping/checkout.php?order=${order_id}`;
    }, 1000);
    
  } catch(err) {
    if (loader) loader.classList.remove("show");
    console.error(err);
    toast("❌ Lỗi kết nối máy chủ", "error");
  }
}

// ===== Cập nhật số lượng giỏ hàng (AJAX) =====
document.addEventListener("DOMContentLoaded", () => {
  const qtyControls = document.querySelectorAll(".qty-control");
  qtyControls.forEach(ctrl => {
    const input   = ctrl.querySelector(".quantity-input");
    const minus   = ctrl.querySelector(".qty-btn.minus");
    const plus    = ctrl.querySelector(".qty-btn.plus");
    const cartId  = ctrl.dataset.cartid;
    const maxStock = parseInt(ctrl.dataset.stock || "1");
    // Lấy tên sản phẩm để hiển thị trong Toast
    const productName = ctrl.dataset.productName || "Sản phẩm này"; 

    if (!input) return;

    if (minus) {
      minus.addEventListener("click", () => changeQty(input, cartId, -1, maxStock, plus, minus, productName));
    }
    if (plus) {
      // FIX 1: Thêm productName vào hàm changeQty
      plus.addEventListener("click", () => changeQty(input, cartId, 1, maxStock, plus, minus, productName));
      // FIX 1: Cập nhật trạng thái nút Plus ngay khi load trang
      plus.disabled = (parseInt(input.value) >= maxStock);
    }
    input.addEventListener("blur", () => updateQty(input, cartId, maxStock, plus, minus));
    input.addEventListener("change", () => updateQty(input, cartId, maxStock, plus, minus));
  });

  function changeQty(input, cartId, delta, max, plusBtn, minusBtn, productName){
    let val = parseInt(input.value) || 1;
    let newVal = val + delta;
    
    // Nếu cố gắng tăng khi đã đạt tối đa, hiển thị cảnh báo
    if (delta > 0 && val >= max) {
        // Cập nhật thông báo Toast
        toast(`⚠️ ${productName} đã đạt số lượng tối đa mà bạn có thể đặt hàng (${max}).`, "warn");
        // FIX 1: Vô hiệu hóa nút Plus ngay lập tức nếu đã đạt max
        if (plusBtn) plusBtn.disabled = true; 
        return; // Dừng, không thay đổi giá trị và không gọi AJAX
    }

    // Giới hạn giá trị
    newVal = Math.min(Math.max(newVal, 1), max);
    input.value = newVal;
    
    // Cập nhật trạng thái nút
    if (plusBtn) plusBtn.disabled = (newVal >= max);
    if (minusBtn) minusBtn.disabled = (newVal <= 1);
    
    updateQty(input, cartId, max, plusBtn, minusBtn);
  }

  function updateQty(input, cartId, max, plusBtn, minusBtn){
    let qty = parseInt(input.value) || 1;
    
    // Giới hạn giá trị nhập vào
    qty = Math.min(Math.max(qty, 1), max);
    input.value = qty;

    // Cập nhật trạng thái nút sau khi nhập/thay đổi
    if (plusBtn) plusBtn.disabled = (qty >= max);
    if (minusBtn) minusBtn.disabled = (qty <= 1);

    const loading = document.getElementById("global-loading");
    if (loading) loading.classList.add("show");

    if (input.dataset.isUpdating === 'true') {
      if (loading) loading.classList.remove("show");
      return;
    }
    input.dataset.isUpdating = 'true';

    fetch("/HeThongChamSocCaKoi/backend/api/shop/update_cart.php", {
      method:"POST",
      body:new URLSearchParams({[`quantities[${cartId}]`]: qty})
    })
    .then(r=>r.json())
    .then(res=>{
      input.dataset.isUpdating = 'false';
      if (loading) loading.classList.remove("show");
      if(res.success){
        const row = input.closest(".cart-item-row");
        if (row) {
          const priceCell    = row.querySelector(".ci-price");
          const subtotalCell = row.querySelector(".ci-subtotal");
          if (priceCell && subtotalCell) {
            const priceVal = parseInt(priceCell.getAttribute("data-price") || "0");
            const newTotal = priceVal * qty;
            
            subtotalCell.textContent = newTotal.toLocaleString("vi-VN") + " đ";
            subtotalCell.classList.add("updated");
            setTimeout(()=>subtotalCell.classList.remove("updated"), 800);
          }
        }
        updateCartTotal();
        
      } else {
        toast("❌ " + (res.error || "Không thể cập nhật giỏ hàng"), "error");
        // Tải lại trang để đồng bộ lại số lượng chính xác nhất
        setTimeout(() => window.location.reload(), 1000); 
      }
    })
    .catch(()=>{
      input.dataset.isUpdating = 'false';
      if (loading) loading.classList.remove("show");
      toast("❌ Lỗi kết nối máy chủ","error");
      // Tải lại trang để đồng bộ lại số lượng chính xác nhất
      setTimeout(() => window.location.reload(), 1000);
    });
  }

  function updateCartTotal(){
    let total = 0;
    document.querySelectorAll(".cart-item-row").forEach(row => {
      const qtyEl = row.querySelector(".quantity-input");
      const priceEl = row.querySelector(".ci-price");
      if (qtyEl && priceEl) {
        const qty = parseInt(qtyEl.value) || 0;
        const price = parseInt(priceEl.getAttribute("data-price") || "0");
        total += qty * price;
      }
    });
    
    const subEl = document.getElementById("summary-subtotal");
    const totalEl = document.getElementById("summary-total");
    const checkoutBtn = document.querySelector(".checkout-btn");
    const outOfStockMsg = document.getElementById("out-of-stock-checkout-msg");

    if (subEl) subEl.textContent = total.toLocaleString("vi-VN") + " đ";
    if (totalEl) totalEl.textContent = total.toLocaleString("vi-VN") + " đ";
    
    // Cập nhật trạng thái nút Thanh toán
    if (checkoutBtn) {
      if (total <= 0) {
        checkoutBtn.disabled = true;
        if (outOfStockMsg) outOfStockMsg.style.display = 'block';
      } else {
        checkoutBtn.disabled = false;
        if (outOfStockMsg) outOfStockMsg.style.display = 'none';
      }
    }
  }
});
</script>
</body>
</html>