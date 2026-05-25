document.addEventListener('DOMContentLoaded', () => {
  const sortSel = document.getElementById('wishlist-sort');
  if (sortSel) {
    sortSel.addEventListener('change', loadWishlist);
  }
  loadWishlist();
});


function loadWishlist() {
  fetch('/HeThongChamSocCaKoi/backend/api/shop/wishlist/list.php')
    .then(r => r.json())
    .then(res => {
      if (!res.success) return toast(res.error || 'Không tải được danh sách yêu thích', 'error');
      let items = res.items || [];

      const grid = document.getElementById('wishlist-grid');
      const empty = document.getElementById('wishlist-empty');
      const countEl = document.getElementById('wishlist-count');
      const sortSel = document.getElementById('wishlist-sort');

      if (!items.length) {
        if (empty) empty.style.display = 'block';
        if (grid) grid.style.display = 'none';
        if (countEl) countEl.textContent = 'Danh sách yêu thích trống';
        return;
      }

      // Sắp xếp client-side
      const sortVal = sortSel ? sortSel.value : 'created_desc';
      items = [...items]; // clone

      if (sortVal === 'price_asc') {
        items.sort((a, b) => Number(a.Price || 0) - Number(b.Price || 0));
      } else if (sortVal === 'price_desc') {
        items.sort((a, b) => Number(b.Price || 0) - Number(a.Price || 0));
      } else if (sortVal === 'sold_desc') {
        items.sort((a, b) => Number(b.SoldCount || 0) - Number(a.SoldCount || 0));
      } else {
        // created_desc: backend đã ORDER BY CreatedAt DESC
      }

      if (empty) empty.style.display = 'none';
      if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = items.map(p => wishlistCardHTML(p)).join('');
      }
      if (countEl) {
        countEl.textContent = `${items.length} sản phẩm yêu thích`;
      }
    })
    .catch(() => toast('Lỗi kết nối máy chủ', 'error'));
}


function wishlistCardHTML(p) {
  const imageUrl = p.ImageURL
    ? (String(p.ImageURL).startsWith('/') ? p.ImageURL : '/' + String(p.ImageURL).replace(/^\/+/, ''))
    : '/HeThongChamSocCaKoi/assets/images/default_product.png';

  const sold = Number(p.SoldCount || 0);
  const stock = Number(p.Stock ?? 0);
  const favCount = Number(p.FavoriteCount || 0);

  return `
    <div class="wishlist-card">
      <a href="/HeThongChamSocCaKoi/frontend/customer/shopping/product_detail.php?id=${p.ProductID}" class="thumb">
        <img src="${imageUrl}" alt="${escapeHtml(p.Name)}">
      </a>
      <div class="body">
        <a class="name" href="/HeThongChamSocCaKoi/frontend/customer/shopping/product_detail.php?id=${p.ProductID}">
          ${escapeHtml(p.Name)}
        </a>
        <div class="price">${formatPrice(p.Price)} đ</div>
        <div class="sub-meta">
          <span class="sold">Đã bán ${sold}</span>
          <span class="stock ${stock <= 0 ? 'out' : ''}">
            ${stock > 0 ? 'Kho: ' + stock : 'Hết hàng'}
          </span>
        </div>
        <div class="favorite-row">
          ❤ ${favCount} người đã yêu thích
        </div>
        <div class="actions">
          <button class="btn primary" onclick="addToCart(${p.ProductID})">Thêm vào giỏ</button>
          <button class="btn" onclick="removeFromWishlist(${p.ProductID}, this)">Bỏ thích</button>
        </div>
      </div>
    </div>
  `;
}


function removeFromWishlist(pid, btn) {
  fetch('/HeThongChamSocCaKoi/backend/api/shop/wishlist/toggle.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ProductID: pid })
  })
    .then(r => r.json())
    .then(res => {
      if (!res.success) return toast(res.error || 'Không thể cập nhật yêu thích', 'error');
      toast('Đã bỏ khỏi danh sách yêu thích');
      // reload list
      loadWishlist();
    })
    .catch(() => toast('Lỗi kết nối máy chủ', 'error'));
}
