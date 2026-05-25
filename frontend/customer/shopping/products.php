<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\frontend\customer\shopping\products.php
// require_once '../../../includes/check_login.php';
$page_title = "KoiCare Shop - Sản phẩm cho hồ Koi";
include "../../../includes/header.php";
?>

<!-- 1. Cài đặt Tailwind CSS & Lucide Icons qua CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/shop/products.css">

<!-- Main Container -->
<div class="min-h-screen bg-[#f0f9ff] font-sans text-slate-800 pb-20">
    
    <main class="max-w-7xl mx-auto px-4 py-6">
        
        <!-- BANNER CAROUSEL -->
        <div id="banner-carousel" class="mb-8 rounded-3xl overflow-hidden relative h-56 md:h-72 shadow-xl shadow-sky-900/10 group">
            <!-- Slides sẽ được JS render vào đây -->
            <div id="banner-slides-container" class="w-full h-full relative"></div>

            <!-- Controls -->
            <button id="banner-prev" class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100">
                <i data-lucide="chevron-left" class="w-6 h-6"></i>
            </button>
            <button id="banner-next" class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100">
                <i data-lucide="chevron-right" class="w-6 h-6"></i>
            </button>

            <!-- Indicators -->
            <div id="banner-indicators" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2"></div>
        </div>

        <!-- MAIN LAYOUT (Sidebar + Grid) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <!-- SIDEBAR FILTERS (Ẩn trên mobile, hiện trên lg) -->
            <aside class="lg:col-span-3 space-y-6 hidden lg:block sticky top-24">
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex items-center gap-2 mb-4 text-slate-700">
                        <i data-lucide="filter" class="w-4 h-4"></i>
                        <h3 class="font-bold">Tìm kiếm & Lọc</h3>
                    </div>
                    
                    <div class="space-y-5">
                        <!-- Search -->
                        <div class="relative">
                            <input type="text" id="search-input" placeholder="Tìm tên, mã SP..." 
                                class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all">
                            <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400 w-4 h-4"></i>
                        </div>

                        <!-- Category -->
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block uppercase">Danh mục</label>
                            <select id="category-filter" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-100 transition-colors">
                                <option value="">Tất cả danh mục</option>
                            </select>
                        </div>

                        <!-- Location Filter (MỚI) -->
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block uppercase">Vị trí Shop</label>
                            <select id="location-filter" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-100 transition-colors">
                                <option value="">Tất cả vị trí</option>
                                <option value="Hà Nội">Hà Nội</option>
                                <option value="TP.HCM">TP.HCM</option>
                                <option value="Đà Nẵng">Đà Nẵng</option>
                                <option value="Cần Thơ">Cần Thơ</option>
                                <option value="Hải Phòng">Hải Phòng</option>
                            </select>
                        </div>

                        <!-- Price Range Filter (MỚI) -->
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block uppercase">Khoảng giá (VNĐ)</label>
                            <div class="flex items-center gap-2 mb-3">
                                <input type="number" id="price-min" placeholder="Min" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500">
                                <span class="text-slate-400">-</span>
                                <input type="number" id="price-max" placeholder="Max" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500">
                            </div>
                            <button id="apply-price-btn" class="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-sky-600 transition-colors">
                                Áp dụng giá
                            </button>
                        </div>
                        
                        <!-- Sort -->
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block uppercase">Sắp xếp</label>
                            <select id="sort-select" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 cursor-pointer hover:bg-slate-100 transition-colors">
                                <option value="ProductID|DESC">Mới nhất</option>
                                <option value="Price|ASC">Giá tăng dần</option>
                                <option value="Price|DESC">Giá giảm dần</option>
                                <option value="Name|ASC">Tên A-Z</option>
                            </select>
                        </div>

                        <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-lg shadow-slate-900/10 transition-transform active:scale-95">
                            Lên đầu trang
                        </button>
                    </div>
                </div>
            </aside>

            <!-- PRODUCT GRID AREA -->
            <div class="lg:col-span-9 col-span-12">
                <!-- Toolbar Mobile (Chỉ hiện trên mobile) -->
                <div class="lg:hidden bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-3">
                     <input type="text" id="search-input-mobile" placeholder="Tìm kiếm sản phẩm..." class="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                     <div class="flex gap-2">
                        <select id="category-filter-mobile" class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                            <option value="">Danh mục</option>
                        </select>
                        <select id="sort-select-mobile" class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                            <option value="ProductID|DESC">Mới nhất</option>
                            <option value="Price|ASC">Giá tăng</option>
                        </select>
                     </div>
                     <!-- Mobile filter note -->
                     <div class="text-[10px] text-slate-400 text-center italic">
                        *Sử dụng giao diện Desktop để lọc chi tiết theo vị trí & giá
                     </div>
                </div>

                <!-- Customer Hot Deals Bar -->
                <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center overflow-hidden">
                    <div class="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar py-1 w-full">
                        <div class="flex items-center gap-2 text-slate-700 shrink-0 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                            <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <i data-lucide="flame" class="w-4 h-4"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-bold uppercase text-orange-600">Hot Deals</span>
                                <span class="text-[10px] font-medium text-slate-500">Giảm đến 50%</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-slate-700 shrink-0 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <i data-lucide="truck" class="w-4 h-4"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-bold uppercase text-emerald-700">Vận chuyển</span>
                                <span class="text-[10px] font-medium text-slate-500">An toàn 100%</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-slate-700 shrink-0 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                            <div class="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                                <i data-lucide="headphones" class="w-4 h-4"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-bold uppercase text-sky-700">Hỗ trợ 24/7</span>
                                <span class="text-[10px] font-medium text-slate-500">Chuyên gia Koi</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Toolbar Result Info -->
                <div class="mb-4 flex justify-between items-center px-2">
                    <span id="toolbar-result" class="text-sm font-bold text-slate-500">Đang tải...</span>
                </div>

                <!-- GRID SẢN PHẨM -->
                <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Javascript sẽ render card vào đây -->
                </div>

                <!-- Pagination -->
                <div class="mt-10 flex justify-center items-center gap-4">
                    <button id="prev-page" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </button>
                    <span id="page-info" class="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                        Trang 1 / 1
                    </span>
                    <button id="next-page" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all">
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- Toast Container -->
<div id="toast-stack" class="toast-stack"></div>

<!-- Global Loading Overlay -->
<div id="global-loading" class="fixed inset-0 z-[9999] bg-slate-900/20 backdrop-blur-sm hidden flex items-center justify-center">
    <div class="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
</div>

<script>
  window.role = "Customer";
</script>
<script src="/HeThongChamSocCaKoi/assets/js/shop/products.js"></script>

<?php include "../../../includes/footer.php"; ?>