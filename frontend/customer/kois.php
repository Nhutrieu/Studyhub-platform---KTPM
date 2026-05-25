<?php
require_once '../../includes/check_login.php';
session_start();

if (!isset($_SESSION['username']))
{
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}
$page_title = "Quản Lý Cá Koi";
include '../../includes/header.php';
?>

<!-- LIBRARY -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    brand: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 900: '#0c4a6e' }
                },
                fontFamily: {
                    sans: ['Inter', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
                },
                zIndex: {
                    '100': '100', // Ensure modals/overlays are above everything
                    '500': '500',
                    '999': '999',
                    '1000': '1000',
                }
            }
        }
    }
</script>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/customer/koi.css">
<style>
    /* Custom Scrollbar and Modal Animation are already defined in koi.css */
    body { overflow-x: hidden; font-family: 'Inter', sans-serif; background-color: #f8fafc;}
    /* Ensure sticky toolbar looks sharp */
    .sticky-toolbar {
        transition: all 0.3s ease;
        transform: translateZ(0); /* Hardware acceleration */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
</style>

<div class="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">

    <!-- HEADER SECTION -->
    <div class="max-w-7xl mx-auto p-4 sm:p-6 pt-8">
        <div class="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
            <div>
                <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <span class="material-icons text-brand-600 text-4xl">water</span> 
                    Hồ sơ cá Koi
                </h1>
                <p class="text-slate-500 text-sm mt-1 ml-1">Quản lý định danh và theo dõi sức khỏe đàn cá</p>
            </div>
            
            <button onclick="openModal('add')" class="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-brand-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 font-bold text-sm">
                <span class="material-icons">add_circle</span> Thêm cá mới
            </button>
        </div>

        <!-- DASHBOARD STATS -->
        <div id="stats-container" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <!-- JS will render this -->
        </div>

        <!-- TOOLBAR -->
        <div class="bg-white p-2 rounded-2xl shadow-md border border-slate-200 mb-6 flex flex-wrap gap-3 items-center justify-between sticky top-4 z-30 sticky-toolbar">
            <div class="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
                <span class="material-icons text-slate-400">search</span>
                <input type="text" id="search-input" placeholder="Tìm kiếm cá..." class="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-700 placeholder-slate-400 font-medium">
            </div>
            
            <div class="flex items-center gap-2">
                <select id="filter-pond" class="bg-slate-50 border border-slate-100 text-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                    <option value="all">Tất cả hồ</option>
                </select>
                <select id="sort-select" class="bg-slate-50 border border-slate-100 text-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                    <option value="newest">Mới nhất</option>
                    <option value="size_desc">Size lớn nhất</option>
                    <option value="price_desc">Giá trị cao</option>
                </select>
                <button onclick="refreshData()" class="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-transparent hover:border-brand-100" title="Làm mới dữ liệu">
                    <span class="material-icons">refresh</span>
                </button>
            </div>
        </div>

        <!-- MAIN GRID -->
        <div id="koi-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            <!-- Content here -->
        </div>

        <!-- EMPTY STATE -->
        <div id="empty-state" class="hidden flex-col items-center justify-center py-20 text-slate-400" style="min-height: 400px;">
            <img src="https://placehold.co/100x100/e2e8f0/94a3b8?text=🐟" class="w-24 h-24 opacity-80 mb-4 grayscale">
            <h3 class="text-xl font-bold text-slate-600">Không tìm thấy hồ sơ cá</h3>
            <p class="text-sm">Hãy thử điều chỉnh bộ lọc hoặc thêm chú cá đầu tiên.</p>
        </div>
    </div>
</div>

<!--
=====================================================================================
-->
<!-- MODALS SECTION (Z-INDEX 1000+) -->
<!--
=====================================================================================
-->

<!-- 1. ADD/EDIT MODAL (Z-INDEX: 1000) -->
<div id="koi-modal" class="fixed inset-0 z-[1000] hidden overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onclick="closeModal('koi-modal')"></div>

    <!-- Modal Panel -->
    <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl modal-enter">
            
            <!-- Header -->
            <div class="bg-white px-6 py-4 border-b border-slate-100 flex flex-col">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800" id="modal-title">Thông tin cá Koi</h3>
                        <p class="text-xs text-slate-500 mt-0.5">Quản lý các thông số định danh và vật lý.</p>
                    </div>
                    <button onclick="closeModal('koi-modal')" class="text-slate-400 hover:text-red-500 transition-colors rounded-full p-1 hover:bg-red-50">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <!-- Tabs will be inserted here by JS -->
                <div id="tabs-insertion-point"></div>
            </div>

            <!-- Body -->
            <div class="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scroll bg-slate-50/50">
                <form id="koi-form" onsubmit="handleFormSubmit(event)" class="space-y-5">
                    <input type="hidden" name="FishID" id="input-fish-id">
                    <input type="hidden" name="CurrentImageURL" id="input-current-image">
                    
                    <!-- Content will be moved here by setupModalTabs() -->
                    <div id="form-content-wrapper" class="space-y-5">
                            <!-- Photo & Basic Info -->
                        <div class="flex flex-col sm:flex-row gap-5">
                            <div class="sm:w-1/3">
                                <div class="aspect-square bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden group cursor-pointer hover:border-brand-400 transition-colors shadow-inner">
                                    <img id="preview-image" src="" class="absolute inset-0 w-full h-full object-cover hidden z-10">
                                    <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                                        <span class="material-icons text-3xl mb-2">add_a_photo</span>
                                        <span class="text-xs font-semibold">Tải ảnh lên (Tùy chọn)</span>
                                    </div>
                                    <input type="file" name="ImageFile" accept="image/*" onchange="previewFile(this)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                                </div>
                            </div>
                            <div class="sm:w-2/3 space-y-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tên gọi <span class="text-red-500">*</span></label>
                                    <input type="text" name="Name" id="input-name" required class="w-full rounded-xl border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder:font-normal" placeholder="VD: Kohaku 01">
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Giống</label>
                                        <input type="text" name="Variety" id="input-variety" list="variety-list" class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 outline-none">
                                        <datalist id="variety-list">
                                            <option value="Kohaku"><option value="Showa"><option value="Sanke"><option value="Tancho"><option value="Chagoi">
                                        </datalist>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Giới tính</label>
                                        <select name="Sex" id="input-sex" class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 outline-none">
                                            <option value="Unknown">Chưa rõ</option>
                                            <option value="Male">♂ Đực</option>
                                            <option value="Female">♀ Cái</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Thuộc hồ <span class="text-red-500">*</span></label>
                                    <select name="PondID" id="input-pond" required class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:border-brand-500 outline-none shadow-sm">
                                        <!-- Populated by JS -->
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Stats Block -->
                        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <h4 class="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                <span class="material-icons text-sm">analytics</span> Thông số vật lý
                            </h4>
                            <div class="grid grid-cols-3 gap-4">
                                <div class="text-center">
                                    <label class="block text-xs text-slate-500 mb-1">Tuổi</label>
                                    <input type="number" name="Age" id="input-age" step="0.5" class="w-full text-center font-bold text-slate-800 border-b border-slate-200 focus:border-brand-500 outline-none py-1 bg-transparent" placeholder="0">
                                </div>
                                <div class="text-center">
                                    <label class="block text-xs text-slate-500 mb-1">Dài (cm)</label>
                                    <input type="number" name="Length" id="input-length" step="0.1" class="w-full text-center font-bold text-brand-600 border-b border-slate-200 focus:border-brand-500 outline-none py-1 bg-transparent" placeholder="0">
                                </div>
                                <div class="text-center">
                                    <label class="block text-xs text-slate-500 mb-1">Nặng (kg)</label>
                                    <input type="number" name="Weight" id="input-weight" step="0.01" class="w-full text-center font-bold text-orange-600 border-b border-slate-200 focus:border-brand-500 outline-none py-1 bg-transparent" placeholder="0">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Extra Info -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nguồn gốc</label>
                                <input type="text" name="Breeder" id="input-breeder" class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Giá trị (VNĐ)</label>
                                <input type="text" name="PurchasePrice" id="input-price" class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm text-right focus:border-brand-500 outline-none" placeholder="0">
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Ghi chú</label>
                                <textarea name="Remarks" id="input-remarks" rows="2" class="w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 outline-none resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div class="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onclick="closeModal('koi-modal')" class="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm">Hủy bỏ</button>
                <button type="button" onclick="document.getElementById('koi-form').requestSubmit()" id="btn-save" class="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/30 transition-all text-sm flex items-center justify-center gap-2">
                    <span class="material-icons text-sm">save</span> Lưu hồ sơ
                </button>
            </div>
        </div>
    </div>
</div>

<!-- 2. GROWTH CHART MODAL (Z-INDEX: 1000) -->
<div id="growth-modal" class="fixed inset-0 z-[1000] hidden overflow-y-auto">
    <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onclick="closeModal('growth-modal')"></div>
    <div class="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div class="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden modal-enter flex flex-col max-h-[90vh]">
            
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
                        <span class="material-icons">show_chart</span>
                    </div>
                    <div>
                        <h3 id="growth-title" class="font-bold text-lg text-slate-800">Biểu đồ phát triển</h3>
                        <p id="growth-subtitle" class="text-xs text-slate-500">Đang đồng bộ...</p>
                    </div>
                </div>
                <button onclick="closeModal('growth-modal')" class="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <!-- Content Layout -->
            <div class="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50">
                
                <!-- Left: Chart & Input -->
                <div class="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto custom-scroll gap-4">
                    
                    <!-- BMI Card (Modernized) -->
                    <div class="p-4 rounded-2xl shadow-md border border-slate-200 bg-white">
                        <h4 class="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                            <span class="material-icons text-base">balance</span> Chỉ số thể hình (Condition Factor - CF)
                        </h4>
                        <div class="flex items-baseline gap-2 mb-2">
                            <span id="bmi-value" class="text-4xl font-extrabold text-slate-800 tracking-tight">--</span>
                            <span class="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">CF Score</span>
                        </div>
                        <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2 border border-slate-200 relative">
                            <div id="bmi-bar-fill" class="h-full bg-slate-300 w-0 transition-all duration-1000 ease-out rounded-full"></div>
                            <!-- Target Line (CF=1.75 trung bình của 1.5-2.0) -->
                            <div class="absolute inset-y-0 w-0.5 bg-brand-600" style="left: calc((1.75 - 1.0) / (2.5 - 1.0) * 100%);"></div>
                            <div class="absolute inset-y-0 w-0.5 bg-yellow-400" style="left: calc((1.2 - 1.0) / (2.5 - 1.0) * 100%);"></div>
                            <div class="absolute inset-y-0 w-0.5 bg-red-400" style="left: calc((2.2 - 1.0) / (2.5 - 1.0) * 100%);"></div>

                        </div>
                        <p id="bmi-advice" class="text-xs font-semibold text-slate-500">Chưa đủ dữ liệu để phân tích.</p>
                    </div>

                    <!-- Chart Box -->
                    <div class="bg-white p-4 rounded-2xl shadow-md border border-slate-200 flex-1 relative min-h-[300px]">
                        <canvas id="growthChart"></canvas>
                    </div>
                    
                    <!-- Quick Input Bar -->
                    <div class="bg-white p-3 sm:p-4 rounded-2xl shadow-md border border-slate-200">
                        <p class="text-sm font-bold text-brand-600 mb-3">Thêm số liệu đo mới</p>
                        <form id="growth-add-form" onsubmit="addGrowthRecord(event)" class="flex flex-wrap sm:flex-nowrap gap-3 items-end">
                            <input type="hidden" name="FishID" id="growth-fish-id">
                            <div class="flex-1 min-w-[120px]">
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Ngày đo</label>
                                <input type="date" name="MeasuredAt" id="growth-date" class="w-full text-sm border-slate-200 rounded-lg py-2 focus:border-brand-500 font-medium" required>
                            </div>
                            <div class="w-24">
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Dài (cm)</label>
                                <input type="number" step="0.1" name="Length" class="w-full text-sm border-slate-200 rounded-lg py-2 font-bold text-brand-600 focus:border-brand-500" required placeholder="0.0">
                            </div>
                            <div class="w-24">
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Nặng (kg)</label>
                                <input type="number" step="0.01" name="Weight" class="w-full text-sm border-slate-200 rounded-lg py-2 font-bold text-orange-600 focus:border-brand-500" required placeholder="0.00">
                            </div>
                            <div class="flex-1 min-w-[150px]">
                                <label class="text-[10px] font-bold text-slate-400 uppercase">Ghi chú</label>
                                <input type="text" name="Note" class="w-full text-sm border-slate-200 rounded-lg py-2 focus:border-brand-500" placeholder="VD: Tăng trọng tốt">
                            </div>
                            <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20 transition-all flex-shrink-0">
                                <span class="material-icons">add</span>
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Right: History Table -->
                <!-- Right: History Table -->
                <div class="lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full z-10">
                    
                    <!-- Clean Table -->
                    <div class="flex-1 flex flex-col overflow-hidden">
                        <div class="px-6 py-3 bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider sticky top-0 z-20">Lịch sử chi tiết</div>
                        <div class="flex-1 overflow-hidden flex flex-col">
                            <!-- Table Header (Cố định) -->
                            <div class="bg-white sticky top-0 z-10 shadow-sm">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th class="py-2 px-4 text-[10px] text-slate-400 uppercase font-bold bg-white">Thời gian</th>
                                            <th class="py-2 px-2 text-[10px] text-slate-400 uppercase font-bold text-center bg-white">Dài (cm)</th>
                                            <th class="py-2 px-2 text-[10px] text-slate-400 uppercase font-bold text-center bg-white">Nặng (kg)</th>
                                            <th class="py-2 px-2 text-[10px] text-slate-400 uppercase font-bold text-center bg-white">Ghi chú</th>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                            
                            <!-- Table Body (Có thể cuộn) -->
                            <div class="flex-1 overflow-y-auto custom-scroll p-0" style="max-height: 400px;">
                                <table class="w-full text-left border-collapse">
                                    <tbody id="growth-table-body" class="divide-y divide-slate-50">
                                        <!-- JS Render -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- 3. CUSTOM MESSAGE/CONFIRMATION MODAL (Z-INDEX: 1100) -->
<div id="message-modal" class="fixed inset-0 z-[1100] hidden overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity" onclick="closeModal('message-modal')"></div>
    <div class="flex min-h-full items-center justify-center p-4 text-center">
        <div class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-sm modal-enter p-6">
            
            <div class="flex flex-col items-center text-center">
                <div id="msg-icon-bg" class="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4">
                    <span id="msg-icon" class="material-icons text-3xl text-green-600">check</span>
                </div>
                
                <h3 class="text-xl font-bold leading-6 text-slate-900" id="msg-title">Thành công</h3>
                
                <div class="mt-2 w-full">
                    <p class="text-sm text-slate-500" id="msg-body">Thao tác đã được thực hiện.</p>
                </div>
                
            </div>
            
            <div class="mt-6 flex gap-3 justify-center" id="msg-actions">
                <!-- Actions rendered by JS -->
            </div>
            
        </div>
    </div>
</div>

<script>
    // Global function to manually refresh
    function refreshData() {
        // Simple spinner on refresh button
        const btn = document.querySelector('.sticky-toolbar button[title="Làm mới dữ liệu"]');
        if (btn) {
            btn.innerHTML = '<span class="material-icons animate-spin">sync</span>';
            btn.disabled = true;
            setTimeout(() => { // Remove spinner after fetch completes (or in fetchKois() finally block)
                btn.innerHTML = '<span class="material-icons">refresh</span>';
                btn.disabled = false;
            }, 1000); 
        }
        fetchKois();
    }
</script>
<script src="/HeThongChamSocCaKoi/assets/js/customer/koi.js?v=<?php echo time(); ?>"></script>
<?php include '../../includes/footer.php'; ?>