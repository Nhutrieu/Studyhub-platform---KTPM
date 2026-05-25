/**
 * KOI MANAGER PROFESSIONAL LOGIC - ENHANCED
 * Features: Custom Notification/Confirm Modals, Tabbed Modals, Enhanced Grid Cards, Growth Chart, New K-Factor Logic, Validation.
 * V10: FINAL UI/LOGIC FIX. Addressed: 1. Strict sorting (Newest -> Oldest) for Growth History. 2. Applied scrolling directly to Growth History Table body. 3. Ensured correct data index (data[0]) is used for CF calculation.
 * V11: FIX ISSUE 7 (HEALTH STATUS SYNC) & CUSTOM MODAL INTEGRATION.
 * V12: FIX BUG: Load fish by pond_id from URL if present.
 * V13: FIX BUG: Double Submission (Prevent creating 2 items at once).
 */

let koiData = [];
let pondData = [];
let growthChart = null;
let searchTimeout = null;
let confirmCallback = null;
// [FIX DOUBLE SUBMISSION] Biến cờ để kiểm soát trạng thái submit
let isSubmitting = false; 

// ================= UTILS =================
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatPriceInput = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
    if (value) {
        // Convert to Number and format as Vietnamese currency (without currency symbol)
        // This makes it easier for PHP to parse as a float later
        e.target.value = new Intl.NumberFormat('vi-VN').format(parseInt(value, 10));
    }
};

const formatDateVN = (dateStr) =>
{
    if(!dateStr) return '--';
    const d = new Date(dateStr);
    // If only date is provided (YYYY-MM-DD), time part might be 00:00, so we skip time display
    const options = dateStr.length === 10 
        ? { day: '2-digit', month: '2-digit', year: 'numeric' }
        : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN', options);
};

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    // Inject tab UI elements dynamically on load if it hasn't been done (for hot reload)
    setupModalTabs();
    
    renderSkeleton();
    // Chạy fetchPonds trước để có danh sách hồ trước khi fetchKois
    fetchPonds().then(() => {
        // Sau khi có pondData, mới fetchKois
        fetchKois();
    }).catch(err => {
        console.error("Init Error:", err);
        showMessageModal('error', 'Khởi tạo lỗi', 'Không thể tải dữ liệu ban đầu. Vui lòng kiểm tra kết nối.');
    });

    document.getElementById('search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderGrid, 300);
    });
    
    document.getElementById('filter-pond')?.addEventListener('change', renderGrid);
    document.getElementById('sort-select')?.addEventListener('change', renderGrid);

    const dateInput = document.getElementById('growth-date');
    if(dateInput) dateInput.valueAsDate = new Date();

    // Attach form submit handler
    // [FIX] Sử dụng sự kiện submit thay vì onclick để tránh xung đột
    const koiForm = document.getElementById('koi-form');
    if (koiForm) {
        // Xóa listener cũ nếu có (để tránh gán nhiều lần nếu file js load lại)
        koiForm.removeEventListener('submit', handleFormSubmit);
        koiForm.addEventListener('submit', handleFormSubmit);
    }

    // Attach input formatting for price (Vietnamese currency format)
    document.getElementById('input-price')?.addEventListener('input', formatPriceInput);
});

// ================= CUSTOM MODAL LOGIC (Replaces alert/confirm) =================
function showMessageModal(type, title, message, callback = null) {
    const modal = document.getElementById('message-modal');
    if (!modal) {
        console.error("Message modal DOM not found. Falling back to native alert/confirm.");
        if (type === 'confirm') {
            if (confirm(message)) {
                if (callback) callback();
            }
        } else {
            alert(`${title}: ${message}`);
        }
        return;
    }
    
    const iconBg = document.getElementById('msg-icon-bg');
    const icon = document.getElementById('msg-icon');
    const titleEl = document.getElementById('msg-title');
    const bodyEl = document.getElementById('msg-body');
    const actionsEl = document.getElementById('msg-actions');

    titleEl.innerText = title;
    bodyEl.innerText = message;
    
    // Reset classes
    iconBg.className = 'mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4';
    icon.className = 'material-icons text-3xl';
    
    // Style based on type
    if (type === 'success') {
        iconBg.classList.add('bg-green-100');
        icon.classList.add('text-green-600');
        icon.innerText = 'check_circle';
        actionsEl.innerHTML = `<button onclick="closeModal('message-modal')" class="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-700 transition-colors">Tuyệt vời</button>`;
    } else if (type === 'error') {
        iconBg.classList.add('bg-red-100');
        icon.classList.add('text-red-600');
        icon.innerText = 'error';
        actionsEl.innerHTML = `<button onclick="closeModal('message-modal')" class="flex-1 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-300 transition-colors">Đóng</button>`;
    } else if (type === 'confirm') {
        iconBg.classList.add('bg-orange-100');
        icon.classList.add('text-orange-600');
        icon.innerText = 'help';
        confirmCallback = callback;
        actionsEl.innerHTML = `
            <button onclick="closeModal('message-modal')" class="flex-1 rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">Hủy</button>
            <button onclick="executeConfirm()" class="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-red-700 transition-colors">Đồng ý</button>
        `;
    } else if (type === 'info') {
        iconBg.classList.add('bg-blue-100');
        icon.classList.add('text-blue-600');
        icon.innerText = 'info';
        actionsEl.innerHTML = `<button onclick="closeModal('message-modal')" class="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-brand-700 transition-colors">Đã hiểu</button>`;
    }

    modal.classList.remove('hidden');
}

function executeConfirm() {
    if (confirmCallback) confirmCallback();
    closeModal('message-modal');
}

// ================= DATA FETCHING =================
async function fetchPonds() {
    try {
        const res = await fetch('/HeThongChamSocCaKoi/backend/api/customer/ponds/list.php');
        const data = await res.json();
        pondData = data;
        
        const filterSel = document.getElementById('filter-pond');
        const modalSel = document.getElementById('input-pond');
        
        let html = '<option value="all">Tất cả hồ</option>';
        let modalHtml = '<option value="">-- Chọn hồ nuôi --</option>';
        
        data.forEach(p => {
            html += `<option value="${p.PondID}">${p.PondName}</option>`;
            modalHtml += `<option value="${p.PondID}">${p.PondName}</option>`;
        });
        
        if(filterSel) filterSel.innerHTML = html;
        if(modalSel) modalSel.innerHTML = modalHtml;
        
        // CẬP NHẬT: Set giá trị mặc định nếu có pond_id trong URL (Fix bug)
        const pondIdFromUrl = getUrlParameter('pond_id');
        if (pondIdFromUrl && filterSel) {
            filterSel.value = pondIdFromUrl;
        }

    } catch (err) { console.error("Error fetching ponds:", err); }
}

async function fetchKois() {
    const pondIdFromUrl = getUrlParameter('pond_id');
    const refreshBtn = document.querySelector('.sticky-toolbar button[title="Làm mới dữ liệu"]');
    
    if (refreshBtn) {
        refreshBtn.innerHTML = '<span class="material-icons animate-spin">sync</span>';
        refreshBtn.disabled = true;
    }
    
    try {
        let url = '/HeThongChamSocCaKoi/backend/api/customer/kois/list.php';
        
        if (pondIdFromUrl) {
            url = `/HeThongChamSocCaKoi/backend/api/customer/kois/list_by_pond.php?pond_id=${pondIdFromUrl}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        
        if(data.success) {
            koiData = data.kois || [];
            updateStats();
            renderGrid();
        } else {
            showMessageModal('error', 'Lỗi tải hồ sơ cá', data.error || 'Không tải được danh sách cá Koi.');
        }
    } catch (err) { 
        console.error("Error fetching kois:", err);
        showMessageModal('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ API để tải dữ liệu cá.');
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<span class="material-icons">refresh</span>';
            refreshBtn.disabled = false;
        }
    }
}

// ================= RENDERING =================
function renderSkeleton() {
    const grid = document.getElementById('koi-grid');
    if(!grid) return;
    grid.innerHTML = Array(4).fill(0).map(() => 
        `<div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 animate-pulse h-80">
            <div class="h-40 bg-slate-200 rounded-xl mb-4"></div>
            <div class="h-4 bg-slate-200 w-3/4 mb-2 rounded"></div>
            <div class="h-4 bg-slate-100 w-1/2 rounded"></div>
        </div>`
    ).join('');
}

function updateStats() {
    const total = koiData.length;
    const healthy = koiData.filter(k => 
        !k.HealthStatus || 
        k.HealthStatus.toLowerCase() === 'healthy' || 
        k.HealthStatus.toLowerCase() === 'tốt' || 
        k.HealthStatus.toLowerCase() === 'khỏe'
    ).length;
    const sick = total - healthy;
    const totalLen = koiData.reduce((acc, k) => acc + (parseFloat(k.Length) || 0), 0);
    const avgLen = total > 0 ? (totalLen / total).toFixed(1) : 0;
    const totalVal = koiData.reduce((acc, k) => acc + (parseFloat(k.PurchasePrice) || 0), 0);

    const statsEl = document.getElementById('stats-container');
    if(statsEl) {
        statsEl.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div class="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm border border-brand-100"><span class="material-icons text-2xl">🐟</span></div>
                <div><p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Tổng đàn</p><p class="text-2xl font-extrabold text-slate-800">${total} <span class="text-sm font-medium text-slate-400">con</span></p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div class="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-600 shadow-sm border border-green-100"><span class="material-icons text-2xl">verified_user</span></div>
                <div><p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Sức khỏe tốt</p><p class="text-2xl font-extrabold text-slate-800">${healthy} <span class="text-sm font-medium text-slate-400">con</span></p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div class="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100"><span class="material-icons text-2xl">warning</span></div>
                <div><p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Cần theo dõi</p><p class="text-2xl font-extrabold text-slate-800">${sick} <span class="text-sm font-medium text-slate-400">con</span></p></div>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div class="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100"><span class="material-icons text-2xl">payments</span></div>
                <div><p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Tổng giá trị</p><p class="text-2xl font-extrabold text-slate-800">${new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(totalVal)} <span class="text-sm font-medium text-slate-400">VNĐ</span></p></div>
            </div>
        `;
    }
}

function renderGrid() {
    const search = document.getElementById('search-input')?.value.toLowerCase() || '';
    const pondFilter = document.getElementById('filter-pond')?.value || 'all';
    const sortMode = document.getElementById('sort-select')?.value || 'newest';
    
    let filtered = koiData.filter(k => {
        const matchName = (k.Name || '').toLowerCase().includes(search) || (k.Variety || '').toLowerCase().includes(search);
        const matchPond = pondFilter === 'all' || k.PondID == pondFilter;
        return matchName && matchPond;
    });
    
    filtered.sort((a, b) => {
        if (sortMode === 'newest') return new Date(b.PondSince) - new Date(a.PondSince);
        if (sortMode === 'size_desc') return (parseFloat(b.Length) || 0) - (parseFloat(a.Length) || 0);
        if (sortMode === 'price_desc') return (parseFloat(b.PurchasePrice) || 0) - (parseFloat(a.PurchasePrice) || 0);
        return 0;
    });

    const grid = document.getElementById('koi-grid');
    const empty = document.getElementById('empty-state');
    
    if (!grid) return;

    if (filtered.length === 0) {
        const isFiltered = search !== '' || pondFilter !== 'all' || sortMode !== 'newest';
        
        if (isFiltered) {
            grid.innerHTML = '';
            if(empty) { empty.classList.remove('hidden'); empty.classList.add('flex'); }
        } else {
            grid.innerHTML = getAddKoiCardHtml();
            if(empty) { empty.classList.add('hidden'); empty.classList.remove('flex'); }
        }
        return;
    }
    if(empty) { empty.classList.add('hidden'); empty.classList.remove('flex'); }

    let cardsHtml = filtered.map(k => {
        const safeFishID = k.FishID; 
        const imgUrl = k.ImageURL && k.ImageURL.length > 5 ? k.ImageURL : 'https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';
        
        let sexIcon = '<span class="material-icons text-slate-400 text-sm">question_mark</span>';
        if(k.Sex === 'Male') sexIcon = '<span class="material-icons text-blue-500 text-sm">male</span>';
        else if(k.Sex === 'Female') sexIcon = '<span class="material-icons text-pink-500 text-sm">female</span>';

        let healthBadge = '';
        const isSick = k.HealthStatus && !['healthy', 'tốt', 'khỏe'].includes(k.HealthStatus.toLowerCase());
        
        if (isSick) {
            const statusText = k.HealthStatus.toUpperCase().substring(0, 15) + (k.HealthStatus.length > 15 ? '...' : '');
            healthBadge = `<span class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse z-10">⚠️ ${statusText}</span>`;
        } else {
            healthBadge = `<span class="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10">✅ KHỎE MẠNH</span>`;
        }

        return `
            <div class="koi-card bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full hover:scale-[1.02] transform">
                
                <div class="h-48 overflow-hidden relative cursor-pointer bg-slate-50" onclick='openModal("edit", ${safeFishID})'>
                    
                    <img src="${imgUrl}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image';" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-100"></div>
                    
                    ${healthBadge}
                    
                    <div class="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-1 shadow-md flex items-center gap-1 text-xs font-bold z-10">
                        ${sexIcon}
                        <span class="text-slate-700">${k.Variety || 'Koi'}</span>
                    </div>
                    
                    <div class="absolute bottom-3 left-4 text-white z-10">
                        <h3 class="font-bold text-xl leading-tight drop-shadow-lg">${k.Name}</h3>
                        <p class="text-xs text-white/80 font-medium flex items-center gap-1 mt-0.5">
                            <span class="material-icons text-[12px]">water</span> ${k.PondName || 'Chưa gán'}
                        </p>
                    </div>
                </div>
                
                
                <div class="p-4 flex-1 flex flex-col gap-3">
                    
                    <!-- Stats Bar -->
                    <div class="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div class="hover:text-brand-600 transition-colors">
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">DÀI</p>
                            <p class="font-bold text-brand-600 text-sm">${k.Length || '--'} <span class="text-xs font-normal text-slate-400">cm</span></p>
                        </div>
                        <div class="border-l border-slate-200 hover:text-orange-600 transition-colors">
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">NẶNG</p>
                            <p class="font-bold text-orange-600 text-sm">${k.Weight || '--'} <span class="text-xs font-normal text-slate-400">kg</span></p>
                        </div>
                        <div class="border-l border-slate-200 hover:text-purple-600 transition-colors">
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">GIÁ TRỊ</p>
                            <p class="font-bold text-slate-700 text-sm">${new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(k.PurchasePrice || 0)} <span class="text-xs font-normal text-slate-400">VNĐ</span></p>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="px-0 pt-0 grid grid-cols-4 gap-2">
                        
                        <!-- Button Chart -->
                        <button onclick="openGrowthModal(${k.FishID}, '${k.Name}')" class="col-span-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl py-2 flex items-center justify-center transition-colors shadow-sm hover:shadow-md" title="Biểu đồ tăng trưởng">
                            <span class="material-icons text-[18px]">auto_graph</span>
                        </button>
                        
                        <!-- NEW: Button AI Diagnosis -->
                        <a href="/HeThongChamSocCaKoi/frontend/ai-detect/health-check.php?fish_id=${k.FishID}&fish_name=${encodeURIComponent(k.Name)}&img=${encodeURIComponent(imgUrl)}"
                            class="col-span-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl py-2 flex items-center justify-center transition-colors shadow-sm hover:shadow-md" title="Chẩn đoán bệnh AI">
                            <span class="material-icons text-[18px]">local_hospital</span>
                        </a>

                        <!-- Button Edit -->
                        <button onclick='openModal("edit", ${safeFishID})' class="col-span-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl py-2 flex items-center justify-center transition-colors shadow-sm hover:shadow-md" title="Chỉnh sửa">
                            <span class="material-icons text-[18px]">edit</span>
                        </button>
                        
                        <!-- Button Delete -->
                        <button onclick="deleteKoi(${k.FishID})" class="col-span-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-2 flex items-center justify-center transition-colors shadow-sm hover:shadow-md" title="Xóa">
                            <span class="material-icons text-[18px]">delete</span>
                        </button>
                        
                    </div>
                    
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = cardsHtml + getAddKoiCardHtml();
}

function getAddKoiCardHtml() {
    return `
        <div onclick="openModal('add')" class="bg-white rounded-2xl shadow-inner border-2 border-dashed border-brand-300 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full justify-center items-center cursor-pointer min-h-[320px] hover:bg-brand-50">
            <span class="material-icons text-7xl text-brand-400 group-hover:text-brand-600 transition-colors">add_circle_outline</span>
            <h3 class="font-bold text-lg mt-3 text-brand-600">Thêm Cá Koi Mới</h3>
            <p class="text-sm text-slate-500">Bắt đầu hành trình chăm sóc của bạn.</p>
        </div>
    `;
}

// ================= MODAL & FORM LOGIC =================
function setupModalTabs() {
    const insertionPoint = document.getElementById('tabs-insertion-point');
    const formWrapper = document.getElementById('form-content-wrapper');
    const koiForm = document.getElementById('koi-form');

    if (!insertionPoint || !koiForm) return;

    if(document.getElementById('modal-tabs-container')) {
        const infoTabContainer = document.getElementById('tab-content-info');
        if (infoTabContainer && formWrapper.children.length > 2) { 
            const childrenToMove = Array.from(formWrapper.children).filter(el => el.id !== 'tab-content-info' && el.id !== 'tab-content-history');
            childrenToMove.forEach(child => infoTabContainer.appendChild(child));
        }
        return;
    }
    
    const infoTabContainer = document.createElement('div');
    infoTabContainer.id = 'tab-content-info';
    infoTabContainer.className = 'tab-content active space-y-5';
    
    const historyTabContainer = document.createElement('div');
    historyTabContainer.id = 'tab-content-history';
    historyTabContainer.className = 'tab-content hidden max-h-[60vh] overflow-y-auto custom-scroll'; 
    historyTabContainer.innerHTML = `
        <div id="medical-history-list" class="history-timeline space-y-4">
            <p class="text-center text-slate-400 py-4 text-sm">Đang tải lịch sử...</p>
        </div>
    `;

    const originalContent = Array.from(formWrapper.children);
    originalContent.forEach(child => infoTabContainer.appendChild(child));

    formWrapper.appendChild(infoTabContainer);
    formWrapper.appendChild(historyTabContainer);
    
    const tabHTML = `
        <div id="modal-tabs-container" class="modal-tabs flex border-b border-slate-200 mt-4 overflow-x-auto">
            <button type="button" class="tab-btn active text-sm font-semibold text-slate-600 hover:text-brand-600 py-3 px-4 border-b-2 border-brand-600 transition-all" onclick="switchTab('info')" id="tab-btn-info">Thông tin chung</button>
            <button type="button" class="tab-btn text-sm font-semibold text-slate-600 hover:text-brand-600 py-3 px-4 border-b-2 border-transparent transition-all" onclick="switchTab('history')" id="tab-btn-history" style="display: none;">Lịch sử bệnh án</button>
        </div>
    `;
    
    insertionPoint.innerHTML = tabHTML;
}

function switchTab(tabName) {
    document.querySelectorAll('#modal-tabs-container .tab-btn').forEach(b => {
        b.classList.remove('active', 'border-brand-600');
        b.classList.add('border-transparent');
    });
    
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-brand-600');
        activeBtn.classList.remove('border-transparent');
    }
    
    document.querySelectorAll('#koi-form .tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-content-${tabName}`)?.classList.remove('hidden');
}

function openModal(mode, fishId = null)
{
    const modal = document.getElementById('koi-modal');
    const form = document.getElementById('koi-form');
    const title = document.getElementById('modal-title');
    const preview = document.getElementById('preview-image');
    const tabHistoryBtn = document.getElementById('tab-btn-history');
    
    form.reset();
    preview.src = '';
    preview.classList.add('hidden');
    
    setupModalTabs();
    switchTab('info');
    if (tabHistoryBtn) tabHistoryBtn.style.display = 'none';
    
    let data = null;

    if (mode === 'edit' && fishId !== null) {
        data = koiData.find(k => k.FishID == fishId);
        
        if (!data) {
            showMessageModal('error', 'Lỗi', 'Không tìm thấy hồ sơ cá để chỉnh sửa.');
            return;
        }

        title.innerText = `Hồ sơ cá: ${data.Name}`;
        
        document.getElementById('input-fish-id').value = data.FishID;
        document.getElementById('input-current-image').value = data.ImageURL || '';
        document.getElementById('input-name').value = data.Name;
        document.getElementById('input-pond').value = data.PondID;
        document.getElementById('input-variety').value = data.Variety || '';
        document.getElementById('input-sex').value = data.Sex;
        document.getElementById('input-age').value = data.Age || '';
        document.getElementById('input-length').value = data.Length || '';
        document.getElementById('input-weight').value = data.Weight || '';
        document.getElementById('input-breeder').value = data.Breeder || '';
        document.getElementById('input-price').value = data.PurchasePrice ? new Intl.NumberFormat('vi-VN').format(data.PurchasePrice) : '';
        document.getElementById('input-remarks').value = data.Remarks || '';

        if (data.ImageURL) {
            preview.src = data.ImageURL;
            preview.classList.remove('hidden');
        }
        form.dataset.mode = 'edit';
        
        if (tabHistoryBtn) tabHistoryBtn.style.display = 'block';
        loadMedicalHistory(data.FishID);

    } else {
        title.innerText = 'Thêm cá Koi mới';
        document.getElementById('input-fish-id').value = '';
        document.getElementById('input-current-image').value = '';
        form.dataset.mode = 'add';
        document.getElementById('input-price').value = ''; 
    }
    
    modal.classList.remove('hidden');
}

async function loadMedicalHistory(fishId)
{
    const container = document.getElementById('medical-history-list');
    container.className = 'history-timeline space-y-4';
    container.style = '';

    container.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>';
    
    try {
        const res = await fetch(`/HeThongChamSocCaKoi/backend/api/customer/kois/history.php?id=${fishId}`);
        const result = await res.json();
        
        if(result.success && result.data.length > 0) {
            const sortedHistory = result.data.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
            
            const html = sortedHistory.map(item => {
                const resultObj = typeof item.Result === 'object' && item.Result !== null ? item.Result : {};
                const detections = Array.isArray(resultObj.detections) ? resultObj.detections : [];
                const isSick = detections.length > 0;
                
                const statusText = isSick 
                    ? `⚠️ Phát hiện: ${detections.map(d => d.class_name).join(', ')}` 
                    : '✅ Khỏe mạnh (Không phát hiện bệnh)';
                
                const detailContent = isSick 
                    ? `<div class="p-3 bg-red-50 text-red-800 rounded-lg text-xs mt-2 border border-red-100">
                        AI phát hiện dấu hiệu bất thường. Cần theo dõi sát sao hoặc lập phác đồ điều trị.
                       </div>` 
                    : `<div class="p-3 bg-green-50 text-green-800 rounded-lg text-xs mt-2 border border-green-100">
                        Kiểm tra định kỳ cho thấy cá khỏe.
                       </div>`;

                return `
                    <div class="relative pl-6">
                        <div class="absolute left-0 top-0 w-3 h-3 rounded-full ${isSick ? 'bg-red-500 border-4 border-red-200' : 'bg-green-500 border-4 border-green-200'}"></div>
                        <p class="text-[11px] text-slate-400 mb-1">${formatDateVN(item.CreatedAt)}</p>
                        <p class="font-bold text-sm ${isSick ? 'text-red-600' : 'text-green-600'}">${statusText}</p>
                        ${detailContent}
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div class="relative pl-3 border-l-2 border-slate-200 space-y-6 
                    overflow-y-auto custom-scroll border border-slate-200 rounded-xl p-4 bg-white/70">
                    ${html}
                </div>
            `;
            
        } else {
            container.innerHTML = '<p class="text-center text-slate-400 py-4 text-sm">Chưa có lịch sử khám bệnh nào từ AI.</p>';
        }
    } catch(err) {
        console.error("Error loading medical history:", err);
        container.innerHTML = '<p class="text-center text-red-400 py-4 text-sm">Lỗi tải dữ liệu lịch sử.</p>';
    }
}

function previewFile(input) {
    const file = input.files[0];
    const img = document.getElementById('preview-image');
    if (file) {
        if (!file.type.startsWith('image/')) {
            showMessageModal('error', 'Lỗi Định Dạng', 'Vui lòng chỉ tải lên file ảnh (JPG, PNG...).');
            input.value = '';
            img.classList.add('hidden');
            img.src = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            img.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    } else {
        img.classList.add('hidden');
        img.src = '';
    }
}

// ================= FORM SUBMISSION (FIX DOUBLE SUBMIT) =================
async function handleFormSubmit(e)
{
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling

    // [FIX DOUBLE SUBMISSION] Kiểm tra nếu đang submit thì dừng lại
    if (isSubmitting) return;

    const form = e.target;
    const mode = form.dataset.mode;
    const formData = new FormData(form);
    
    // Xóa định dạng tiền tệ trước khi gửi
    const priceInput = document.getElementById('input-price');
    const priceValue = priceInput ? priceInput.value.replace(/\D/g, '') : '';
    formData.set('PurchasePrice', priceValue); 

    // Simple validation (1)
    if (!formData.get('Name') || !formData.get('PondID')) {
        showMessageModal('error', 'Lỗi Dữ Liệu', 'Vui lòng nhập Tên và chọn Hồ nuôi.');
        return; // Chưa set isSubmitting = true nên người dùng có thể thử lại
    }
    
    // Validation (2)
    const length = parseFloat(formData.get('Length'));
    const weight = parseFloat(formData.get('Weight'));
    const age = parseFloat(formData.get('Age'));
    const price = parseFloat(formData.get('PurchasePrice'));
    
    if ((length < 0) || (weight < 0) || (age < 0) || (price < 0)) {
        showMessageModal('error', 'Lỗi Dữ Liệu', 'Các giá trị số (Dài, Nặng, Tuổi, Giá trị) không được là số âm.');
        return;
    }
    
    const MAX_LENGTH_CM = 200; 
    const MAX_WEIGHT_KG = 200; 

    if (length > MAX_LENGTH_CM) {
        showMessageModal('error', 'Lỗi Dữ Liệu', `Chiều dài (${length} cm) không được vượt quá ${MAX_LENGTH_CM} cm.`);
        return;
    }

    if (weight > MAX_WEIGHT_KG) {
        showMessageModal('error', 'Lỗi Dữ Liệu', `Cân nặng (${weight} kg) không được vượt quá ${MAX_WEIGHT_KG} kg.`);
        return;
    }
    
    if (length > 0 && weight > 0) {
        const CF = 100000 * (weight / Math.pow(length, 3));
        const MAX_CF_ACCEPTABLE = 5.0; 
        
        if (CF > MAX_CF_ACCEPTABLE) {
            showMessageModal('error', 'Lỗi Dữ Liệu', 
                `Dữ liệu Chiều dài (${length} cm) và Cân nặng (${weight} kg) không hợp lý. Chỉ số CF tính được là ${CF.toFixed(2)}, vượt quá mức tối đa ${MAX_CF_ACCEPTABLE}. Vui lòng kiểm tra lại đơn vị hoặc giá trị đã nhập.`
            );
            return;
        }
    }

    const url = mode === 'edit' 
        ? '/HeThongChamSocCaKoi/backend/api/customer/kois/edit.php'
        : '/HeThongChamSocCaKoi/backend/api/customer/kois/add.php'; 

    const btn = document.getElementById('btn-save');
    const oldHtml = btn.innerHTML;
    
    // [FIX DOUBLE SUBMISSION] Khóa form trước khi gọi API
    isSubmitting = true;
    btn.innerHTML = '<span class="material-icons animate-spin text-sm">sync</span> Đang lưu...';
    btn.disabled = true;

    try {
        const res = await fetch(url, { method: 'POST', body: formData });
        const result = await res.json();
        
        if(result.success) {
            closeModal('koi-modal');
            await fetchKois(); 
            showMessageModal('success', 'Thành công', mode === 'edit' ? 'Đã cập nhật hồ sơ cá.' : 'Đã thêm cá mới vào hồ.');
        } else {
            showMessageModal('error', 'Lỗi', result.error || 'Có lỗi xảy ra');
        }
    } catch (err) {
        showMessageModal('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ API.');
    } finally {
        // [FIX DOUBLE SUBMISSION] Mở khóa form sau khi xử lý xong (dù lỗi hay không)
        isSubmitting = false;
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
}

function deleteKoi(id) {
    showMessageModal('confirm', 'Xác nhận xóa', 'Bạn có chắc chắn muốn xóa hồ sơ cá này? Dữ liệu tăng trưởng và lịch sử bệnh án cũng sẽ bị xóa vĩnh viễn.', async () => {
        try {
            const res = await fetch(`/HeThongChamSocCaKoi/backend/api/customer/kois/delete.php?id=${id}`);
            const result = await res.json();
            
            if (result.success) {
                await fetchKois();
                showMessageModal('success', 'Đã xóa', 'Hồ sơ cá đã được xóa khỏi hệ thống.');
            } else {
                throw new Error(result.error);
            }

        } catch(err) {
            console.error("Delete Error:", err);
            showMessageModal('error', 'Lỗi', 'Không thể xóa hồ sơ. Lỗi: ' + (err.message || 'Lỗi không xác định'));
        }
    });
}

// ================= GROWTH CHART & BMI =================
async function openGrowthModal(id, name) {
    const modal = document.getElementById('growth-modal');
    modal.classList.remove('hidden');
    document.getElementById('growth-title').innerText = name;
    document.getElementById('growth-fish-id').value = id;
    document.getElementById('growth-subtitle').innerText = 'Đang tải dữ liệu...';
    
    if(growthChart) {
        growthChart.destroy();
        growthChart = null;
    }
    document.getElementById('growthChart').style.opacity = 0.5; 
    
    const tableBodyContainer = document.querySelector('#growth-modal .flex-1.overflow-y-auto.custom-scroll');
    if (tableBodyContainer) {
        tableBodyContainer.style.maxHeight = 'calc(100vh - 200px)';
    }
    
    document.getElementById('growth-table-body').innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400 text-sm">Đang tải dữ liệu...</td></tr>';
    
    try {
        const res = await fetch(`/HeThongChamSocCaKoi/backend/api/customer/kois/growth/list.php?id=${id}`);
        const result = await res.json();
        
        if(result.success) {
            let history = result.data;
            
            const uniqueDays = {};
            history.forEach(h => {
                const fullTimestamp = h.MeasuredAt; 
                uniqueDays[fullTimestamp] = h;
            });
            const chartData = Object.values(uniqueDays);
            
            const sortedChartData = chartData.sort((a, b) => new Date(a.MeasuredAt) - new Date(b.MeasuredAt));

            const lastUpdate = history.length > 0 ? formatDateVN(history[history.length-1].MeasuredAt) : 'Chưa có dữ liệu';
            document.getElementById('growth-subtitle').innerText = `Cập nhật gần nhất: ${lastUpdate}`;
            
            if (sortedChartData.length >= 2) {
                document.getElementById('growthChart').style.opacity = 1;
                renderGrowthChart(sortedChartData);
            } else {
                document.getElementById('growthChart').style.opacity = 0.5;
                const ctx = document.getElementById('growthChart').getContext('2d');
                if (ctx) ctx.clearRect(0, 0, document.getElementById('growthChart').width, document.getElementById('growthChart').height);
            }
            
            renderGrowthTable(result.data);
            calculateBMI(sortedChartData);
        } else {
            throw new Error(result.error);
        }
    } catch(err) {
        console.error("Error loading growth history:", err);
        document.getElementById('growthChart').style.opacity = 0.5;
        document.getElementById('growth-table-body').innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-400 text-sm">Lỗi tải dữ liệu.</td></tr>';
        showMessageModal('error', 'Lỗi', 'Không tải được lịch sử phát triển.');
    }
}

function renderGrowthChart(data)
{
    const ctx = document.getElementById('growthChart').getContext('2d');
    const labels = data.map(d => d.MeasuredAt);
    const lengths = data.map(d => parseFloat(d.Length));
    const weights = data.map(d => parseFloat(d.Weight));

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.05)');

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Chiều dài (cm)',
                    data: lengths,
                    borderColor: '#0ea5e9',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0ea5e9',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Cân nặng (kg)',
                    data: weights,
                    borderColor: '#f97316',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [6, 4],
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f97316',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    callbacks: {
                        title: (items) => formatDateVN(items[0].label),
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('vi-VN').format(context.parsed.y);
                                label += context.dataset.label.includes('(cm)') ? ' cm' : ' kg';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy HH:mm', displayFormats: { day: 'dd/MM', month: 'MMM yyyy' } },
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45 }
                },
                y: {
                    type: 'linear', display: true, position: 'left', 
                    title: { display: true, text: 'Chiều dài (cm)', color: '#0ea5e9', font: { size: 12 } },
                    grid: { color: '#f1f5f9' },
                    beginAtZero: true
                },
                y1: { 
                    type: 'linear', display: true, position: 'right', 
                    title: { display: true, text: 'Cân nặng (kg)', color: '#f97316', font: { size: 12 } },
                    grid: { display: false },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderGrowthTable(data)
{
    const sorted = [...data].sort((a, b) => new Date(b.MeasuredAt) - new Date(a.MeasuredAt)); 
    
    const html = sorted.map(row => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
            <td class="py-3 px-4 text-slate-600 font-medium text-xs whitespace-nowrap w-1/4">
                ${formatDateVN(row.MeasuredAt)}
            </td>
            <td class="py-3 px-2 text-brand-600 font-bold text-xs text-center w-20"> 
                ${row.Length}
            </td>
            <td class="py-3 px-2 text-orange-600 font-bold text-xs text-center w-20"> 
                ${row.Weight}
            </td>
            <td class="py-3 px-2 text-slate-500 font-medium text-xs">
                ${row.Note || '---'}
            </td>
        </tr>
    `).join('');
    
    document.getElementById('growth-table-body').innerHTML = html || '<tr><td colspan="4" class="text-center py-8 text-slate-400 text-sm">Chưa có dữ liệu đo</td></tr>';
}

function calculateBMI(data) {
    const box = document.getElementById('bmi-value');
    const advice = document.getElementById('bmi-advice');
    const bar = document.getElementById('bmi-bar-fill');
    
    if(!data || data.length === 0) {
        box.innerText = '--';
        advice.innerText = 'Chưa đủ dữ liệu để phân tích.';
        if(bar) bar.style.width = '0%';
        if(bar) bar.className = 'h-full bg-slate-300 w-0 transition-all rounded-full';
        return;
    }
    
    const last = data[data.length - 1];
    const L = parseFloat(last.Length);
    const W = parseFloat(last.Weight);
    
    if(L > 0 && W > 0) {
        const CF = 100000 * (W / Math.pow(L, 3));
        box.innerText = CF.toFixed(2);
        
        let widthPct = 0;
        let colorClass = 'bg-green-500';
        let text = '';
        let textColor = 'text-green-600';

        const minCF = 1.0; 
        const maxCF = 2.5; 
        const idealMin = 1.5;
        const idealMax = 2.0;

        const normalizedCF = Math.min(Math.max(CF, minCF), maxCF);
        widthPct = ((normalizedCF - minCF) / (maxCF - minCF)) * 100;
        
        if(CF < 1.2) {
            text = `Cá gầy (Thin). CF dưới 1.2. Cần tăng khẩu phần ăn hoặc xem xét vấn đề sức khỏe.`;
            textColor = "text-yellow-600";
            colorClass = "bg-yellow-500";
        } else if (CF > 2.2) {
            text = `Cá quá béo (Bulky). CF trên 2.2. Cần điều chỉnh giảm khẩu phần hoặc tăng cường vận động.`;
            textColor = "text-red-600";
            colorClass = "bg-red-500";
        } else if (CF >= idealMin && CF <= idealMax) {
            text = `Body cân đối (Ideal). CF trong khoảng 1.5 - 2.0. Rất tốt, tiếp tục duy trì chế độ hiện tại.`;
            textColor = "text-green-600";
            colorClass = "bg-green-500";
        } else {
            text = `Cá hơi mất cân đối. CF nằm ngoài khoảng 1.5 - 2.0 nhưng vẫn an toàn.`;
            textColor = "text-orange-600";
            colorClass = "bg-orange-500";
        }

        advice.innerText = text;
        advice.className = `text-xs font-bold mt-2 ${textColor} transition-colors`;
        if(bar) {
            bar.className = `h-full transition-all duration-1000 ease-out rounded-full ${colorClass}`;
            bar.style.width = `${widthPct}%`;
        }
    } else {
        box.innerText = '--';
        advice.innerText = 'Cần đủ Dài (cm) và Nặng (kg) để tính Condition Factor (CF).';
        if(bar) bar.style.width = '0%';
        if(bar) bar.className = 'h-full bg-slate-300 w-0 transition-all rounded-full';
    }
}

async function addGrowthRecord(e)
{
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    
    // Validation (1)
    const length = parseFloat(fd.get('Length'));
    const weight = parseFloat(fd.get('Weight'));

    if (!fd.get('MeasuredAt') || length <= 0 || weight <= 0) {
        showMessageModal('error', 'Thiếu Dữ Liệu', 'Vui lòng nhập đầy đủ Ngày, Chiều dài (>0) và Cân nặng (>0).');
        return;
    }

    // Validation (2)
    const MAX_LENGTH_CM = 200; 
    const MAX_WEIGHT_KG = 200; 

    if (length > MAX_LENGTH_CM) {
        showMessageModal('error', 'Lỗi Dữ Liệu', `Chiều dài (${length} cm) không được vượt quá ${MAX_LENGTH_CM} cm.`);
        return;
    }

    if (weight > MAX_WEIGHT_KG) {
        showMessageModal('error', 'Lỗi Dữ Liệu', `Cân nặng (${weight} kg) không được vượt quá ${MAX_WEIGHT_KG} kg.`);
        return;
    }
    
    if (length > 0 && weight > 0) {
        const CF = 100000 * (weight / Math.pow(length, 3));
        const MAX_CF_ACCEPTABLE = 5.0; 
        
        if (CF > MAX_CF_ACCEPTABLE) {
            showMessageModal('error', 'Lỗi Dữ Liệu', 
                `Dữ liệu Chiều dài (${length} cm) và Cân nặng (${weight} kg) không hợp lý. Chỉ số CF tính được là ${CF.toFixed(2)}, vượt quá mức tối đa ${MAX_CF_ACCEPTABLE}. Vui lòng kiểm tra lại đơn vị hoặc giá trị đã nhập.`
            );
            return;
        }
    }
    
    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="material-icons animate-spin text-sm">sync</span>';
    btn.disabled = true;

    try {
        const res = await fetch('/HeThongChamSocCaKoi/backend/api/customer/kois/growth/add.php', { method: 'POST', body: fd });
        const result = await res.json();
        if(result.success) {
            const id = document.getElementById('growth-fish-id').value;
            const name = document.getElementById('growth-title').innerText;
            openGrowthModal(id, name);
            form.reset();
            document.getElementById('growth-date').valueAsDate = new Date();
            fetchKois();
            showMessageModal('success', 'Thành công', 'Đã thêm bản ghi tăng trưởng mới.');
        } else {
            showMessageModal('error', 'Lỗi', result.error || 'Lỗi khi thêm bản ghi.');
        }
    } catch(err) {
        console.error("Growth add error:", err);
        showMessageModal('error', 'Lỗi', 'Lỗi kết nối API.');
    } finally {
        btn.innerHTML = '<span class="material-icons">add</span>';
        btn.disabled = false;
    }
}