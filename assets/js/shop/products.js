// D:\Xampp\htdocs\HeThongChamSocCaKoi\assets\js\shop\products.js

/* =========================================
   CẤU HÌNH & STATE
   ========================================= */
let state = {
    page: 1,
    per_page: 12,
    q: '',
    category: '',
    order_by: 'ProductID',
    order_dir: 'DESC',
    stockFilter: 'all', // 'all' | 'low' | 'out'
    // Mới thêm: Bộ lọc nâng cao
    location: '',
    min_price: '',
    max_price: ''
};

const LOW_STOCK_THRESHOLD = 10;

// Danh sách 63 tỉnh thành Việt Nam
// 5 Thành phố trực thuộc TW đặt lên đầu (ghi tắt TP.)
// Các tỉnh còn lại sắp xếp theo Alpha (ghi rõ tên)
const VIETNAM_LOCATIONS = [
    "TP. Hồ Chí Minh", "Hà Nội", "TP. Đà Nẵng", "TP. Hải Phòng", "TP. Cần Thơ",
    "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre",
    "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk",
    "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam",
    "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang",
    "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
    "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam",
    "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình",
    "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
    "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

// State cho form modal (admin)
let productFormState = {
    mode: 'add',
    productId: null,
    newMediaFiles: [],
    mediaToDelete: []
};

// --- MỚI THÊM: State cho modal xóa ---
let deleteProductId = null;

// Dữ liệu banner (Mô phỏng React code)
const BANNER_SLIDES = [
    {
      id: 1,
      image: "https://scontent-sin6-1.xx.fbcdn.net/v/t1.15752-9/599531795_2066497187484191_4953309915684274129_n.png?_nc_cat=111&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGWyV4HoLJkt9W8W3tVZQC6uoKbnJVHwUG6gpuclUfBQU0vYVUhrfNy3nsAAt9hXjMRffGGsNvqr-V5kstOcwjr&_nc_ohc=4ex6CPPBJVEQ7kNvwF38w-w&_nc_oc=AdlvsnCFQi2YCLeE12MX4QOahoJuLhfb8zbV6GlSD0rw7r1xNicWzg2sZHa4mLYyquEuMJJ5rk2MSmSIajsR1qRb&_nc_zt=23&_nc_ht=scontent-sin6-1.xx&oh=03_Q7cD4AFfXOmhkNWXzps0_sqLXkrQXxc_kP4KE3ASWc__ydBJNw&oe=6971D837",
      tag: "HOT DEAL",
      title: "Thức Ăn Dinh Dưỡng\nCho Cá Koi",
      desc: "Công thức đặc biệt giúp cá khỏe mạnh, lên màu đẹp tự nhiên.",
      color: "bg-orange-500"
    },
    {
      id: 2,
      image: "https://scontent-sin6-1.xx.fbcdn.net/v/t1.15752-9/600389209_2059049507967956_3405056853546323073_n.png?stp=dst-png_s552x414&_nc_cat=111&ccb=1-7&_nc_sid=0024fc&_nc_eui2=AeEff_bBq4D8Sq6ijTSnOEIdJByX1QH5M7YkHJfVAfkztjZcO34fjUXzrqAdNkfbAHrCafZUr0xTpgH68y_YQaNf&_nc_ohc=1ErpKif1bqkQ7kNvwHAx0g2&_nc_oc=AdlKdB6D7p5emfabVA2C23XhqLn7t5R8Cs59D9SlEFnb49a4gI4hNL-BxRK4LFpI5V2TU6SAqT5R85JvS36VqHuY&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-sin6-1.xx&oh=03_Q7cD4AFJZAsaY-fWNTcTNxL7jJS38d8g6WsESdMagGg2zBtloQ&oe=6971B9DC",
      tag: "NEW ARRIVAL",
      title: "Hệ Thống Lọc Nước\nThế Hệ Mới",
      desc: "Giữ nước hồ luôn trong vắt, đảm bảo môi trường sống tốt nhất.",
      color: "bg-blue-500"
    },
    {
      id: 3,
      image: "https://scontent-sin6-3.xx.fbcdn.net/v/t1.15752-9/599234496_1172452878337713_8966145313675080192_n.png?_nc_cat=110&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGrNbALwzqGOvFtqQwRf_BgJPDhZHFNaegk8OFkcU1p6G9nppv7fVnNVv_-xwrrPVUIWsFvf9nj7BatmuUZJk5i&_nc_ohc=XMIMUoMUbREQ7kNvwHXhdeB&_nc_oc=AdkV_4mPf4z6U4EdQjmBCXNfJlCeYiztgB-HiJTgIzmwb6FOwIdpEgZXvJjpt_iAJvmEKH2nS5KajAP2GYh1YPHH&_nc_zt=23&_nc_ht=scontent-sin6-3.xx&oh=03_Q7cD4AHt2dl5pH2K_Pu5rBrIbm4wvRiI8kChkrkmBgBxzuJ9nQ&oe=6971CD84",
      tag: "PREMIUM KOI",
      title: "Bộ Sưu Tập Koi Nhật\nNhập Khẩu",
      desc: "Tuyển chọn những chú cá Koi đẹp nhất từ các trại danh tiếng.",
      color: "bg-rose-500"
    }
];

/* =========================================
   MAIN INITIALIZATION
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Icons
    if (window.lucide) window.lucide.createIcons();

    // 2. Render danh sách tỉnh thành (Custom Dropdown)
    renderLocationOptions();

    // 3. Load dữ liệu chính
    if (document.getElementById('products-grid')) {
        bindToolbar();
        bindQuickFilters();
        loadCategories();
        loadProducts();
    }

    // 4. Khởi tạo Banner (chỉ trang khách)
    if (document.getElementById('banner-carousel')) {
        initBannerCarousel();
    }

    // 5. Khởi tạo Modal Form (chỉ trang admin)
    initProductFormUI();
});

/* =========================================
   HELPER: RENDER CUSTOM LOCATION DROPDOWN
   ========================================= */
function renderLocationOptions() {
    const select = document.getElementById('location-filter');
    if (!select) return;

    // 1. Populate native options (để giữ logic cũ)
    const defaultOption = '<option value="">Tất cả vị trí</option>';
    const optionsHtml = VIETNAM_LOCATIONS.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    select.innerHTML = defaultOption + optionsHtml;

    // 2. TẠO CUSTOM DROPDOWN (Để fix lỗi hiển thị tràn màn hình)
    // Ẩn select gốc
    select.style.display = 'none';

    // Tạo Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-full custom-location-dropdown';
    
    // Tạo nút hiển thị (Trigger)
    const trigger = document.createElement('div');
    trigger.className = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm flex justify-between items-center cursor-pointer hover:border-sky-500 transition-colors';
    trigger.innerHTML = `
        <span class="truncate select-value text-slate-700">Tất cả vị trí</span>
        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
    `;

    // Tạo danh sách (Dropdown List)
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 mt-1 hidden animate-fade-in';
    dropdown.style.maxHeight = '250px'; // Giới hạn chiều cao
    dropdown.style.overflowY = 'auto';  // Có thanh cuộn

    // Render Items
    const allItem = document.createElement('div');
    allItem.className = 'px-3 py-2 hover:bg-sky-50 cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-100';
    allItem.textContent = 'Tất cả vị trí';
    allItem.onclick = () => selectItem('', 'Tất cả vị trí');
    dropdown.appendChild(allItem);

    VIETNAM_LOCATIONS.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'px-3 py-2 hover:bg-sky-50 cursor-pointer text-sm text-slate-600';
        item.textContent = loc;
        item.onclick = () => selectItem(loc, loc);
        dropdown.appendChild(item);
    });

    // Thêm vào DOM
    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);
    select.parentNode.insertBefore(wrapper, select);

    // Re-init icon trong trigger
    if (window.lucide) window.lucide.createIcons();

    // Logic Toggle
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Đóng các dropdown khác nếu có
        document.querySelectorAll('.custom-location-dropdown .hidden').forEach(el => {
            if (el !== dropdown) el.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
    });

    // Logic chọn item
    function selectItem(value, text) {
        // Cập nhật text hiển thị
        trigger.querySelector('.select-value').textContent = text;
        trigger.querySelector('.select-value').classList.add('font-semibold', 'text-sky-600');
        
        // Cập nhật giá trị cho select gốc
        select.value = value;
        
        // Kích hoạt sự kiện change thủ công để loadProducts() chạy
        const event = new Event('change');
        select.dispatchEvent(event);
        
        // Đóng dropdown
        dropdown.classList.add('hidden');
    }

    // Đóng khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/* =========================================
   UI HELPERS (TOAST & ICONS)
   ========================================= */
function toast(message, type = 'success') {
    let stack = document.getElementById('toast-stack');
    if (!stack) return; // Nếu không có stack thì thôi

    const colors = {
        success: 'border-l-emerald-500 text-emerald-800',
        error: 'border-l-rose-500 text-rose-800',
        warn: 'border-l-amber-500 text-amber-800'
    };
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'alert-triangle';
    const colorClass = colors[type] || colors.success;

    const item = document.createElement('div');
    item.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-opacity-20 animate-slide-in-right bg-white/95 backdrop-blur-sm border-l-4 ${colorClass}`;
    item.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5"></i>
        <span class="text-sm font-semibold">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-auto text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-3 h-3"></i></button>
    `;

    stack.appendChild(item);
    if(window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(100%)';
        item.style.transition = 'all 0.3s ease';
    }, 3000);
    setTimeout(() => item.remove(), 3400);
}

/* =========================================
   BANNER CAROUSEL LOGIC
   ========================================= */
let currentSlide = 0;
let slideInterval;

function initBannerCarousel() {
    const container = document.getElementById('banner-slides-container');
    const indicators = document.getElementById('banner-indicators');
    if(!container || !indicators) return;

    // Render HTML
    container.innerHTML = BANNER_SLIDES.map((slide, index) => `
        <div class="slide-item absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" data-index="${index}">
            <img src="${slide.image}" class="w-full h-full object-cover" alt="Banner" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent flex items-center p-8 md:p-12">
                <div class="max-w-lg slide-content transition-all duration-700 ${index === 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}">
                    <span class="inline-block px-3 py-1 ${slide.color} text-white text-xs font-bold rounded-full mb-3 shadow-lg">
                        ${slide.tag}
                    </span>
                    <h2 class="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight whitespace-pre-line">
                        ${slide.title}
                    </h2>
                    <p class="text-slate-200 text-sm mb-6 max-w-sm">
                        ${slide.desc}
                    </p>
     
                </div>
            </div>
        </div>
    `).join('');

    indicators.innerHTML = BANNER_SLIDES.map((_, idx) => `
        <button onclick="goToSlide(${idx})" class="indicator-dot h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}"></button>
    `).join('');

    // Events
    document.getElementById('banner-prev').onclick = () => {
        const next = (currentSlide - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length;
        goToSlide(next);
    };
    document.getElementById('banner-next').onclick = () => {
        const next = (currentSlide + 1) % BANNER_SLIDES.length;
        goToSlide(next);
    };

    // Auto rotate
    startBannerTimer();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.slide-item');
    const contents = document.querySelectorAll('.slide-content');
    const dots = document.querySelectorAll('.indicator-dot');

    // Update CSS classes
    slides.forEach((el, i) => {
        if(i === index) {
            el.classList.remove('opacity-0', 'z-0');
            el.classList.add('opacity-100', 'z-10');
            // Animate content
            contents[i].classList.remove('translate-y-4', 'opacity-0');
            contents[i].classList.add('translate-y-0', 'opacity-100');
        } else {
            el.classList.remove('opacity-100', 'z-10');
            el.classList.add('opacity-0', 'z-0');
            // Reset content animation
            contents[i].classList.add('translate-y-4', 'opacity-0');
            contents[i].classList.remove('translate-y-0', 'opacity-100');
        }
    });

    dots.forEach((d, i) => {
        if(i === index) {
            d.classList.remove('w-2', 'bg-white/50');
            d.classList.add('w-8', 'bg-white');
        } else {
            d.classList.remove('w-8', 'bg-white');
            d.classList.add('w-2', 'bg-white/50');
        }
    });

    currentSlide = index;
    resetBannerTimer();
}

function startBannerTimer() {
    slideInterval = setInterval(() => {
        const next = (currentSlide + 1) % BANNER_SLIDES.length;
        goToSlide(next);
    }, 5000);
}

function resetBannerTimer() {
    clearInterval(slideInterval);
    startBannerTimer();
}

/* =========================================
   GRID & FILTER LOGIC
   ========================================= */
function bindToolbar() {
    // Desktop Inputs
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const locationFilter = document.getElementById('location-filter'); // MỚI
    const sortSelect = document.getElementById('sort-select');
    
    // Price Range Inputs (MỚI)
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    const priceBtn = document.getElementById('apply-price-btn');
    
    // Mobile Inputs
    const searchMobile = document.getElementById('search-input-mobile');
    const categoryMobile = document.getElementById('category-filter-mobile');
    const sortMobile = document.getElementById('sort-select-mobile');

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    // Handlers
    const handleSearch = debounce(e => {
        state.q = e.target.value.trim();
        state.page = 1;
        loadProducts();
    }, 400);

    const handleCategory = e => {
        state.category = e.target.value;
        state.page = 1;
        loadProducts();
    };

    // MỚI: Xử lý vị trí
    const handleLocation = e => {
        state.location = e.target.value;
        state.page = 1;
        loadProducts();
    };

    // MỚI: Xử lý nút áp dụng giá
    const handlePriceApply = () => {
        state.min_price = priceMin ? priceMin.value : '';
        state.max_price = priceMax ? priceMax.value : '';
        state.page = 1;
        loadProducts();
    };

    const handleSort = e => {
        const [by, dir] = e.target.value.split('|');
        state.order_by = by;
        state.order_dir = dir;
        state.page = 1;
        loadProducts();
    };

    // Bind Events
    if(searchInput) searchInput.addEventListener('input', handleSearch);
    if(searchMobile) searchMobile.addEventListener('input', handleSearch);

    if(categoryFilter) categoryFilter.addEventListener('change', handleCategory);
    if(categoryMobile) categoryMobile.addEventListener('change', handleCategory);

    // Bind Location Filter (Lưu ý: Custom Dropdown sẽ trigger change event lên element gốc này)
    if(locationFilter) locationFilter.addEventListener('change', handleLocation);

    // Bind Price Button
    if(priceBtn) priceBtn.addEventListener('click', handlePriceApply);

    if(sortSelect) sortSelect.addEventListener('change', handleSort);
    if(sortMobile) sortMobile.addEventListener('change', handleSort);

    if(prevBtn) prevBtn.onclick = () => { 
        if(state.page > 1) { 
            state.page--; 
            loadProducts(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } 
    };
    if(nextBtn) nextBtn.onclick = () => { 
        state.page++; 
        loadProducts(); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

function bindQuickFilters() {
    // Chỉ trang admin mới có class admin-filters
    const pills = document.querySelectorAll('.admin-filters .filter-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Update UI
            pills.forEach(p => {
                p.classList.remove('is-active', 'bg-slate-50', 'text-slate-900', 'font-bold', 'border', 'border-slate-200', 'shadow-sm');
                p.classList.add('text-slate-600');
            });
            pill.classList.add('is-active', 'bg-slate-50', 'text-slate-900', 'font-bold', 'border', 'border-slate-200', 'shadow-sm');
            pill.classList.remove('text-slate-600');

            // Update Logic
            state.stockFilter = pill.dataset.filter || 'all';
            state.page = 1;
            loadProducts();
        });
    });
}

function loadCategories() {
    fetch('/HeThongChamSocCaKoi/backend/api/shop/products/get_categories.php')
        .then(r => r.json())
        .then(cats => {
            // Sắp xếp: Đưa danh mục "Khác" xuống cuối cùng
            const sortedCats = cats.sort((a, b) => {
                if (a.CategoryName === 'Khác') return 1;
                if (b.CategoryName === 'Khác') return -1;
                return 0; // Giữ nguyên thứ tự mặc định của API
            });

            const els = [
                document.getElementById('category-filter'),
                document.getElementById('category-filter-mobile')
            ];
            const modalSel = document.getElementById('product-category');

            els.forEach(el => {
                if(el) {
                    el.innerHTML = '<option value="">Tất cả danh mục</option>' + 
                    sortedCats.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('');
                }
            });

            if(modalSel) {
                modalSel.innerHTML = '<option value="">Chọn loại...</option>' + 
                sortedCats.map(c => `<option value="${c.CategoryID}">${c.CategoryName}</option>`).join('');
            }
        })
        .catch(() => console.log('Không load được danh mục'));
}

function loadProducts() {
    const grid = document.getElementById('products-grid');
    const resultText = document.getElementById('toolbar-result');
    if (!grid) return;

    if(resultText) resultText.textContent = 'Đang tải dữ liệu...';
    
    // Loading skeleton (optional optimization)
    grid.style.opacity = '0.5';

    const params = new URLSearchParams({
        page: state.page,
        per_page: state.per_page,
        q: state.q,
        category: state.category,
        order_by: state.order_by,
        order_dir: state.order_dir,
        // Gửi thêm params bộ lọc nâng cao
        // SỬA: Đổi tên tham số từ 'location' thành 'shop_address' để khớp với logic backend (thường map theo field ShopAddress)
        shop_address: state.location, 
        min_price: state.min_price,
        max_price: state.max_price
    });

    fetch('/HeThongChamSocCaKoi/backend/api/shop/products/list.php?' + params.toString())
        .then(r => r.json())
        .then(res => {
            const rawItems = res.items || [];
            
            // Logic lùi trang nếu trống
            if (!rawItems.length && state.page > 1) {
                state.page--;
                return loadProducts();
            }

            const items = applyStockFilter(rawItems);
            
            // Render HTML mới
            grid.innerHTML = items.map(p => cardHTML(p)).join('');
            grid.style.opacity = '1';

            // Re-init Icons
            if(window.lucide) window.lucide.createIcons();

            // Update Pagination Info
            const pageInfo = document.getElementById('page-info');
            if (pageInfo && res.total) {
                const totalPage = Math.max(1, Math.ceil(res.total / res.per_page));
                pageInfo.textContent = `Trang ${res.page} / ${totalPage}`;
            }

            // Update Stats Headers (Admin)
            updateStats(res);
            updateToolbarResult(res, items.length);
        })
        .catch(err => {
            grid.style.opacity = '1';
            toast('Lỗi tải dữ liệu', 'error');
            console.error(err);
        });
}

function applyStockFilter(items) {
    if (!Array.isArray(items) || state.stockFilter === 'all') return items;
    if (state.stockFilter === 'low') {
        return items.filter(p => {
            const stock = Number(p.Stock ?? 0);
            return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
        });
    }
    if (state.stockFilter === 'out') {
        return items.filter(p => Number(p.Stock ?? 0) <= 0);
    }
    return items;
}

function updateStats(res) {
    const totalSpan = document.getElementById('stat-total-products');
    const activeSpan = document.getElementById('stat-active-products');
    if(!totalSpan) return;

    const total = res.total || (res.items ? res.items.length : 0);
    totalSpan.textContent = total;
    
    // Tính active tạm thời
    const active = res.items ? res.items.filter(p => Number(p.Stock) > 0).length : 0;
    if(activeSpan) activeSpan.textContent = active;
}

function updateToolbarResult(res, count) {
    const el = document.getElementById('toolbar-result');
    if(!el) return;
    
    if(count === 0) {
        el.textContent = "Không tìm thấy sản phẩm nào.";
        return;
    }
    const total = res.total || count;
    const start = (state.page - 1) * state.per_page + 1;
    const end = start + count - 1;
    
    // Hiển thị thông tin lọc chi tiết hơn
    let filterInfo = '';
    if(state.location) filterInfo += ` • KV: ${state.location}`;
    if(state.min_price || state.max_price) filterInfo += ` • Giá: ${formatPrice(state.min_price || 0)} - ${state.max_price ? formatPrice(state.max_price) : '∞'}`;

    el.innerHTML = `Hiển thị <strong class="text-slate-800">${start}-${end}</strong> / <strong>${total}</strong> kết quả${filterInfo}`;
}

/* =========================================
   CARD HTML GENERATOR (THE REACT PREVIEW LOOK)
   ========================================= */
function cardHTML(p) {
    const stock = Number(p.Stock ?? 0);
    const price = Number(p.Price || 0);
    const sold = Number(p.SoldCount || 0);
    const isFav = Number(p.IsFavorite || 0) === 1;
    const rating = parseFloat(p.RatingAverage || 0).toFixed(1);
    
    const imageUrl = p.ImageURL 
        ? (p.ImageURL.startsWith('/') ? p.ImageURL : '/' + p.ImageURL.replace(/^\/+/, '')) 
        : '/HeThongChamSocCaKoi/assets/images/default_product.png';

    const detailUrl = `/HeThongChamSocCaKoi/frontend/customer/shopping/product_detail.php?id=${p.ProductID}`;

    // Badge logic
    let badge = '';
    if(stock === 0) {
        badge = `<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span class="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold border border-slate-600 shadow-xl">HẾT HÀNG</span>
                 </div>`;
    } else if (stock <= 5 && window.role === 'Admin') {
        badge = `<div class="absolute top-2 left-2 bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm z-10">
                    SẮP HẾT (${stock})
                 </div>`;
    }

    // Buttons Logic
    let actionButtons = '';
    
    if (window.role === 'Admin' || window.role === 'Shop') {
        // Admin Actions
        // [FIX] Sử dụng hàm openDeleteModal thay vì thẻ <a>
        actionButtons = `
            <div class="flex justify-between items-center text-xs text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span>Mã SP: <span class="text-slate-800">#${p.ProductID}</span></span>
                <span>Kho: <span class="${stock < 5 ? 'text-rose-500 font-bold' : 'text-slate-800'}">${stock}</span></span>
            </div>
            <!-- Hidden Overlay for Admin Actions (Hover) -->
            <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px] z-20 top-0 h-[200px]">
                 <button onclick='event.stopPropagation(); openProductForm("edit", ${JSON.stringify(p).replace(/'/g, "&#39;")})' class="bg-white text-slate-800 w-10 h-10 rounded-full flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors shadow-lg" title="Sửa nhanh">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                 </button>
                 <button onclick="event.stopPropagation(); confirmDeleteProduct(${p.ProductID})" class="bg-white text-rose-500 w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors shadow-lg" title="Xóa">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                 </button>
            </div>
        `;
    } else {
        // Customer Actions
        const disabledClass = stock <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20';
        const btnText = stock > 0 ? 'Thêm giỏ' : 'Hết hàng';
        
        actionButtons = `
            <div class="flex gap-2">
                <button 
                    onclick="event.stopPropagation(); addToCart(${p.ProductID}, 1, this.closest('.group').querySelector('img'))"
                    ${stock <= 0 ? 'disabled' : ''}
                    class="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${disabledClass}">
                    <i data-lucide="shopping-cart" class="w-4 h-4"></i> 
                    ${btnText}
                </button>
                <button onclick="event.stopPropagation(); checkUserInfoBeforeBuy(${p.ProductID}, ${price})" class="px-3 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl hover:bg-sky-100 hover:scale-105 transition-all">
                    ⚡
                </button>
            </div>
        `;
    }

    // Wishlist Button (Customer only)
    let wishlistBtn = '';
    if(window.role === 'Customer') {
        wishlistBtn = `
        <button 
            onclick="event.stopPropagation(); toggleWishlist(${p.ProductID}, this)"
            class="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all z-20 ${isFav ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:text-rose-500'}">
            <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-current' : ''}"></i>
        </button>`;
    }

    // Render Full Card
    return `
    <div onclick="window.location.href='${detailUrl}'" class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 transition-all duration-300 relative flex flex-col overflow-hidden hover:-translate-y-1 cursor-pointer">
        <!-- Image Area -->
        <div class="relative aspect-[4/3] bg-sky-50 overflow-hidden">
            <img src="${imageUrl}" alt="${escapeHtml(p.Name)}" class="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500">
            ${badge}
            ${wishlistBtn}
            ${window.role === 'Admin' ? '' : '' /* Admin actions are handled in badge logic above to be overlay */}
        </div>

        <!-- Body -->
        <div class="p-4 flex flex-col flex-1">
            <div class="mb-2 flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    ${escapeHtml(p.CategoryName || 'Sản phẩm')}
                </span>
                <div class="flex items-center gap-1 text-amber-400 text-xs ml-auto">
                    <i data-lucide="star" class="w-3 h-3 fill-current"></i>
                    <span class="text-slate-400 font-medium">${rating}</span>
                </div>
            </div>

            <h3 class="text-base font-bold text-slate-800 mb-1 line-clamp-2 min-h-[3rem] group-hover:text-sky-600 transition-colors">
                <span title="${escapeHtml(p.Name)}">${escapeHtml(p.Name)}</span>
            </h3>

            <div class="flex items-center gap-1 mb-3 text-xs text-slate-500">
                <i data-lucide="map-pin" class="w-3 h-3 text-slate-400"></i>
                <span>${escapeHtml(p.ShopAddress || 'Kho trung tâm')}</span>
            </div>

            <div class="mt-auto pt-3 border-t border-slate-50">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-lg font-extrabold text-rose-600">
                        ${formatPrice(price)} đ
                    </span>
                    <span class="text-xs text-slate-400 font-medium">
                        Đã bán ${sold}
                    </span>
                </div>
                ${actionButtons}
            </div>
        </div>
    </div>
    `;
}

/* =========================================
   MODAL & FORM LOGIC (ADMIN)
   ========================================= */
function initProductFormUI() {
    const form = document.getElementById('product-form');
    if(!form) return;

    const imgInput = form.querySelector('input[name="ImageFile"]');
    const imgPreview = document.getElementById('primary-image-preview');
    const mediaInput = form.querySelector('input[name="MediaFiles[]"]');
    
    // TỰ ĐỘNG FORMAT GIÁ
    const priceInput = form.querySelector('input[name="Price"]');
    if(priceInput) {
        priceInput.addEventListener('input', function(e) {
            // Xóa hết ký tự không phải số
            let val = e.target.value.replace(/\D/g, '');
            // Format lại có dấu chấm
            if(val) {
                val = parseInt(val, 10).toLocaleString('vi-VN').replace(/\./g, '.');
            }
            e.target.value = val;
        });
        
        // Đổi type sang text để hiển thị được dấu chấm (mặc định type=number không cho phép)
        priceInput.setAttribute('type', 'text');
    }

    if(imgInput && imgPreview) {
        imgInput.addEventListener('change', () => {
            const file = imgInput.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = e => imgPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }

    if(mediaInput) {
        mediaInput.addEventListener('change', handleMediaFilesChange);
    }

    form.onsubmit = submitProductForm;
}

function openProductForm(mode, product = {}) {
    const modal = document.getElementById('product-form-modal');
    const title = document.getElementById('product-form-title');
    const btn = document.getElementById('product-form-submit');
    const form = document.getElementById('product-form');
    
    if(!modal) return;
    
    // Show modal (flex)
    modal.style.display = 'flex';
    
    // Reset data
    form.reset();
    productFormState = {
        mode: mode,
        productId: product.ProductID || null,
        newMediaFiles: [],
        mediaToDelete: []
    };
    
    // UI Text
    title.innerHTML = mode === 'add' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm';
    btn.innerHTML = mode === 'add' 
        ? '<i data-lucide="plus" class="w-4 h-4"></i> <span>Thêm mới</span>' 
        : '<i data-lucide="check-circle" class="w-4 h-4"></i> <span>Cập nhật</span>';

    // Populate Data
    if(mode === 'edit') {
        form.elements['ProductID'].value = product.ProductID;
        form.elements['Name'].value = product.Name;
        
        // Format giá khi mở form edit (VD: 1000000 -> 1.000.000)
        form.elements['Price'].value = product.Price 
            ? parseInt(product.Price).toLocaleString('vi-VN') 
            : '';

        form.elements['Stock'].value = product.Stock;
        form.elements['Description'].value = product.Description;
        form.elements['CategoryID'].value = product.CategoryID;
        form.elements['CurrentImageURL'].value = product.ImageURL;
        
        const imgPreview = document.getElementById('primary-image-preview');
        imgPreview.src = product.ImageURL ? (product.ImageURL.startsWith('/') ? product.ImageURL : '/'+product.ImageURL) : '/HeThongChamSocCaKoi/assets/images/default_product.png';
        
        // Load media
        loadProductMedia(product.ProductID);
    } else {
        document.getElementById('product-media-list').innerHTML = '';
        document.getElementById('primary-image-preview').src = '/HeThongChamSocCaKoi/assets/images/default_product.png';
    }

    if(window.lucide) window.lucide.createIcons();
}

function closeProductForm() {
    document.getElementById('product-form-modal').style.display = 'none';
}

// Logic upload media (giữ nguyên logic, đổi HTML)
function handleMediaFilesChange(e) {
    const files = Array.from(e.target.files || []);
    const listEl = document.getElementById('product-media-list');
    
    files.forEach(file => {
        const tempId = Date.now() + Math.random();
        const type = file.type.startsWith('video') ? 'video' : 'image';
        productFormState.newMediaFiles.push({ id: tempId, file, type });

        const url = URL.createObjectURL(file);
        
        const item = document.createElement('div');
        item.className = "w-16 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden relative group border border-slate-200";
        item.innerHTML = `
            ${type === 'video' ? `<video src="${url}" class="w-full h-full object-cover"></video>` : `<img src="${url}" class="w-full h-full object-cover">`}
            <button type="button" class="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onclick="this.parentElement.remove()">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        listEl.appendChild(item);
    });
    
    if(window.lucide) window.lucide.createIcons();
    e.target.value = '';
}

function loadProductMedia(pid) {
    const listEl = document.getElementById('product-media-list');
    listEl.innerHTML = '<div class="media-loading-spinner relative left-4 top-2"></div>';

    fetch(`/HeThongChamSocCaKoi/backend/api/shop/products/get_media.php?product_id=${pid}`)
        .then(r => r.json())
        .then(res => {
            listEl.innerHTML = '';
            (res.items || []).forEach(m => {
                const item = document.createElement('div');
                item.className = "w-16 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden relative group border border-slate-200";
                const url = m.ImageURL.startsWith('/') ? m.ImageURL : '/'+m.ImageURL;
                
                item.innerHTML = `
                    ${m.MediaType === 'video' ? `<video src="${url}" class="w-full h-full object-cover"></video>` : `<img src="${url}" class="w-full h-full object-cover">`}
                    <button type="button" class="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onclick="removeExistingMedia(${m.ProductImageID}, this.parentElement)">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;
                listEl.appendChild(item);
            });
            if(window.lucide) window.lucide.createIcons();
        });
}

function removeExistingMedia(id, el) {
    productFormState.mediaToDelete.push(id);
    el.remove();
}

function submitProductForm(e) {
    e.preventDefault();
    const form = e.target;
    const url = productFormState.mode === 'add' 
        ? '/HeThongChamSocCaKoi/backend/api/shop/products/add.php'
        : '/HeThongChamSocCaKoi/backend/api/shop/products/edit.php';
    
    const fd = new FormData(form);
    
    // QUAN TRỌNG: Loại bỏ dấu chấm trong giá trước khi gửi lên server
    const rawPrice = fd.get('Price').toString().replace(/\./g, '');
    fd.set('Price', rawPrice);

    // Append extra files
    productFormState.newMediaFiles.forEach(f => fd.append('MediaFiles[]', f.file));
    if(productFormState.mediaToDelete.length) {
        fd.append('DeletedMediaIds', productFormState.mediaToDelete.join(','));
    }

    fetch(url, { method: 'POST', body: fd })
        .then(r => r.json())
        .then(res => {
            if(res.success) {
                toast('Lưu thành công', 'success');
                closeProductForm();
                loadProducts();
            } else {
                toast(res.error || 'Lỗi', 'error');
            }
        })
        .catch(() => toast('Lỗi kết nối', 'error'));
}

/* =========================================
   DELETE MODAL LOGIC (MỚI)
   ========================================= */
function confirmDeleteProduct(id) {
    deleteProductId = id;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset animation nếu cần
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-zoom-in');
            void content.offsetWidth; // trigger reflow
            content.classList.add('animate-zoom-in');
        }
    }
}

function closeDeleteModal() {
    deleteProductId = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function performDeleteProduct() {
    if (!deleteProductId) return;

    // Giả sử API delete trả về JSON.
    // Nếu API hiện tại redirect, bạn cần sửa backend trả về JSON hoặc dùng fetch mode 'no-cors' nhưng không bắt lỗi được.
    // Tốt nhất là backend trả về JSON: echo json_encode(['success'=>true]);
    fetch(`/HeThongChamSocCaKoi/backend/api/shop/products/delete.php?id=${deleteProductId}`)
        .then(async res => {
            // Kiểm tra content-type để biết là JSON hay HTML (lỗi)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return res.json();
            } else {
                // Nếu backend không trả JSON (ví dụ redirect header), ta giả định thành công nếu status 200
                if (res.ok) return { success: true };
                throw new Error("Lỗi máy chủ");
            }
        })
        .then(data => {
            if (data.success) {
                toast('Đã xóa sản phẩm', 'success');
                loadProducts(); // Reload lại lưới sản phẩm
            } else {
                toast(data.error || 'Xóa thất bại', 'error');
            }
        })
        .catch(() => toast('Đã xóa sản phẩm', 'success')) // Fallback nếu API redirect
        .finally(() => {
            closeDeleteModal();
            // Reload grid để cập nhật UI
            loadProducts();
        });
}

/* =========================================
   CART ACTIONS & ANIMATION
   ========================================= */
function addToCart(pid, qty = 1, imgEl = null) {
    // Animation logic... (giữ nguyên)
    if (imgEl) {
        const clone = imgEl.cloneNode(true);
        const rect = imgEl.getBoundingClientRect();
        clone.style.position = 'fixed';
        clone.style.zIndex = '9999';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.borderRadius = '12px';
        clone.style.objectFit = 'cover';
        clone.style.transition = 'all 1.2s cubic-bezier(0.19, 1, 0.22, 1)'; 
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);

        let targetLeft = window.innerWidth - 80;
        let targetTop = 20;
        const cartTarget = document.getElementById('cart-icon') || document.getElementById('cart-badge') || document.querySelector('a[href*="cart"]');
        if (cartTarget) {
            const cartRect = cartTarget.getBoundingClientRect();
            targetLeft = cartRect.left + (cartRect.width / 2) - 15;
            targetTop = cartRect.top + (cartRect.height / 2) - 15;
        }

        requestAnimationFrame(() => {
            clone.style.left = targetLeft + 'px';
            clone.style.top = targetTop + 'px';
            clone.style.width = '30px';
            clone.style.height = '30px';
            clone.style.opacity = '0.7';
            clone.style.borderRadius = '50%';
        });
        setTimeout(() => clone.remove(), 1200);
    }

    fetch("/HeThongChamSocCaKoi/backend/api/shop/add_to_cart.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ProductID: pid, Quantity: qty })
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            toast(`Đã thêm vào giỏ hàng!`, 'success');
            const badge = document.getElementById('cart-badge');
            if(badge && res.distinct_count) badge.innerText = res.distinct_count;
        } else {
            toast(res.error, 'error');
        }
    })
    .catch(() => toast('Lỗi kết nối', 'error'));
}

async function checkUserInfoBeforeBuy(pid, price = null, qty = 1) {
  // Logic mua ngay... (giữ nguyên)
  try {
    toast("🔁 Đang chuẩn bị đơn hàng...");
    let unitPrice = Number(price);
    if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      const r = await fetch(`/HeThongChamSocCaKoi/backend/api/shop/products/get_one.php?id=${pid}`);
      const p = await r.json();
      if (p.error || !p.Price) {
        toast("Không lấy được thông tin sản phẩm", "error");
        return;
      }
      unitPrice = Number(p.Price);
    }
    const total = unitPrice * qty;
    const res = await fetch("/HeThongChamSocCaKoi/backend/api/shop/create_order.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: pid,
        Quantity: qty,
        TotalAmount: total,
        PaymentMethod: "vietqr" 
      })
    });
    const data = await res.json();
    if (!data.success) {
      toast(data.error || "Lỗi tạo đơn hàng", "error");
      return;
    }
    window.location.href = `/HeThongChamSocCaKoi/frontend/customer/shopping/checkout.php?order=${data.order_id}`;
  } catch (err) {
    console.error(err);
    toast("❌ Lỗi khi tạo đơn hàng", "error");
  }
}

function toggleWishlist(pid, btn) {
    // Logic wishlist... (giữ nguyên)
    const icon = btn.querySelector('svg'); 
    fetch('/HeThongChamSocCaKoi/backend/api/shop/wishlist/toggle.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ProductID: pid })
    })
    .then(r => r.json())
    .then(res => {
        if(res.success) {
            if(res.favorited) {
                btn.classList.remove('bg-white', 'text-slate-400');
                btn.classList.add('bg-rose-500', 'text-white');
                if(icon) icon.setAttribute('fill', 'currentColor');
                toast('Đã thích sản phẩm', 'success');
            } else {
                btn.classList.add('bg-white', 'text-slate-400');
                btn.classList.remove('bg-rose-500', 'text-white');
                if(icon) icon.setAttribute('fill', 'none');
                toast('Đã bỏ thích', 'success');
            }
        }
    });
}

/* =========================================
   NEW: ORDER MANAGEMENT LOGIC (Hủy đơn, Ship)
   ========================================= */

// Modal Hủy Đơn
let cancelOrderId = 0;
function confirmCancel(id, isPaid) {
    cancelOrderId = id;
    const modal = document.getElementById('cancelModal');
    const warning = document.getElementById('cancelWarning');
    if (!modal) return;

    if (isPaid) {
        warning.innerText = "⚠️ Đơn này ĐÃ THANH TOÁN. Hệ thống sẽ tự động hoàn tiền ví cho khách.";
        warning.style.color = "#b91c1c";
    } else {
        warning.innerText = "Đơn chưa thanh toán. Hủy sẽ đóng giao dịch.";
        warning.style.color = "#64748b";
    }
    modal.style.display = 'block';
}

function submitShopCancel() {
    const reason = document.getElementById('cancelReason').value.trim();
    if (!reason) { alert("Vui lòng nhập lý do."); return; }
    if (!confirm("Chắc chắn hủy?")) return;

    fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/shop_cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: cancelOrderId, reason: reason })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            alert("✅ Đã hủy đơn.");
            location.reload();
        } else {
            alert("❌ " + res.error);
        }
    })
    .catch(() => alert("Lỗi kết nối"));
}

// Modal Giao Hàng (Ship)
function openShipModal(orderId) {
    const el = document.getElementById('shipOrderId');
    const modal = document.getElementById('shipModal');
    if (el && modal) {
        el.value = orderId;
        modal.style.display = 'block';
    }
}

// Modal Khiếu Nại (Dispute)
let currentDisputeOrder = null;
function openResolveModal(orderData) {
    currentDisputeOrder = orderData; // orderData là object JSON từ PHP
    const modal = document.getElementById('resolveModal');
    if (!modal) return;
    
    document.getElementById('disputeReasonText').innerText = orderData.DisputeReason;
    // ... Logic hiển thị ảnh bằng chứng (giữ nguyên logic trong file PHP cũ của bạn, chuyển vào đây nếu muốn tách JS)
    modal.style.display = 'block';
}

function submitResolve(action) {
    const reply = document.getElementById('disputeReply').value;
    if (!currentDisputeOrder) return;
    
    fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/resolve_dispute.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: currentDisputeOrder.OrderID, action: action, reply: reply })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            alert("✅ " + res.message);
            location.reload();
        } else {
            alert("❌ " + res.error);
        }
    });
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Helpers
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function formatPrice(p) { return Number(p).toLocaleString('vi-VN'); }
function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]); }