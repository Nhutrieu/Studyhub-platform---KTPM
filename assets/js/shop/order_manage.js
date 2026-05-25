// D:\Xampp\htdocs\HeThongChamSocCaKoi\assets\js\shop\order_manage.js

/* =========================================
   CẤU HÌNH & STATE
   ========================================= */

const TABS = {
    'Pending': 'Chờ xác nhận',
    'Processing': 'Chuẩn bị hàng',
    'Shipped': 'Đang vận chuyển',
    'Completed': 'Hoàn thành',
    'Dispute': 'Đang khiếu nại',
    'AdminReview': 'Chờ Admin xử lý',
    'Refunded': 'Đã hoàn tiền',
    'Cancelled': 'Đã hủy'
};

let currentTab = 'Pending';
let currentDisputeOrder = null;
let cancelOrderId = 0;
let ordersData = []; // Lưu trữ dữ liệu đơn hàng đã tải cho tab hiện tại
let globalStats = {}; // Lưu trữ các chỉ số tổng quan hệ thống (Pending, Shipped, Revenue)

/* =========================================
   HELPER FUNCTIONS (TOAST & FORMAT)
   ========================================= */

function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Kiểm tra an toàn

    const colors = {
        success: 'border-l-4 border-emerald-500 text-emerald-800',
        error: 'border-l-4 border-rose-500 text-rose-800',
        info: 'border-l-4 border-sky-500 text-sky-800'
    };
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        info: 'info'
    };

    const item = document.createElement('div');
    item.className = `toast-item flex items-center gap-3 ${colors[type]}`;
    item.innerHTML = `
        <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
        <span class="text-sm font-semibold">${message}</span>
    `;
    container.appendChild(item);
    if(window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        item.remove();
    }, 3000);
}

function findOrderById(id) {
    // Tìm trong dữ liệu đang hiển thị (ordersData)
    return ordersData.find(o => o.OrderID === id);
}

function getOrderElement(id) {
    return document.getElementById(`order-card-${id}`);
}

function formatPrice(p) {
    const numP = Number(p);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numP).replace('₫', '');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
    if (id === 'resolveModal') currentDisputeOrder = null;
}


/* =========================================
   API INTERACTION (LẤY DỮ LIỆU THỰC TẾ)
   ========================================= */

async function loadOrders(status) {
    currentTab = status;
    const listContainer = document.getElementById('order-list');
    
    if (listContainer) {
        listContainer.innerHTML = `
            <div class="text-center p-12 text-sky-600 font-semibold text-lg">
                <i data-lucide="loader-circle" class="w-8 h-8 animate-spin mx-auto mb-3"></i> Đang tải đơn hàng...
            </div>
        `;
        if(window.lucide) window.lucide.createIcons();
    }
    
    // 1. Tải dữ liệu từ API
    try {
        const params = new URLSearchParams({ tab: status });
        const response = await fetch(`/HeThongChamSocCaKoi/backend/api/shop/orders/get_orders_by_status.php?${params.toString()}`);
        
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error || `Lỗi HTTP: ${response.status} khi tải đơn hàng.`);
        }
        
        const data = await response.json();
        ordersData = data.orders || []; 
        
    } catch (error) {
        console.error("Lỗi tải đơn hàng thực tế:", error);
        ordersData = []; 
        toast(`❌ Lỗi tải dữ liệu: ${error.message}`, 'error');
    }
    
    // 2. Cập nhật UI
    // Cập nhật Stats ngay sau khi tải order để đảm bảo chỉ số đúng (real-time)
    await updateStats();
    renderOrderList(status);
}


/* =========================================
   UI RENDER FUNCTIONS
   ========================================= */

// Hàm tải và cập nhật các chỉ số tổng quan
window.updateStats = async function() {
    try {
        const response = await fetch(`/HeThongChamSocCaKoi/backend/api/shop/orders/get_shop_stats.php`);
        
        if (!response.ok) {
            // Trường hợp lỗi server/JSON không hợp lệ
            const text = await response.text();
            throw new Error(`Phản hồi không hợp lệ từ server: ${text.substring(0, 50)}...`);
        }
        
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Lỗi tải stats');

        globalStats = data.stats;

        const pendingEl = document.getElementById('stat-pending');
        const shippedEl = document.getElementById('stat-shipped');
        const disputeEl = document.getElementById('stat-dispute');
        const revenueEl = document.getElementById('stat-monthly-revenue');
        const growthEl = document.getElementById('stat-monthly-growth');
        
        // Cập nhật Chỉ số Đơn hàng
        if (pendingEl) pendingEl.textContent = globalStats.pending_count;
        if (shippedEl) shippedEl.textContent = globalStats.shipped_count;
        if (disputeEl) disputeEl.textContent = globalStats.dispute_count;
        
        // Cập nhật Doanh thu
        const revenueAmount = globalStats.monthly_revenue;
        const growthRate = globalStats.growth_rate_pct;
        const revenueDisplay = revenueAmount > 0 ? formatPrice(revenueAmount) + ' đ' : '0 đ';

        if (revenueEl) revenueEl.textContent = revenueDisplay;
        
        // Cập nhật Tăng trưởng (%)
        if (growthEl) {
            growthEl.textContent = growthRate + ' so với tháng trước';
            // Cập nhật màu sắc dựa trên tỷ lệ tăng trưởng
            const rateValue = parseFloat(growthRate.replace('+', '').replace('%', '').replace(',', '.'));
            growthEl.classList.remove('text-emerald-500', 'text-rose-500', 'text-slate-400');

            if (rateValue > 0) {
                growthEl.classList.add('text-emerald-500');
            } else if (rateValue < 0) {
                growthEl.classList.add('text-rose-500');
            } else {
                growthEl.classList.add('text-slate-400');
            }
        }
        
    } catch (error) {
        console.error("Lỗi cập nhật Stats:", error);
        toast(`❌ Lỗi Stats: ${error.message}`, 'error');
        
        // Đặt lại text nếu lỗi
        const revenueEl = document.getElementById('stat-monthly-revenue');
        if (revenueEl) revenueEl.textContent = 'Lỗi tải...';
        const growthEl = document.getElementById('stat-monthly-growth');
        if (growthEl) growthEl.textContent = 'Không xác định';
    }
}


// Hàm khởi tạo chính
window.initApp = function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentTab = urlParams.get('tab') || 'Pending';

    // Khởi tạo stats ngay lập tức
    updateStats(); 

    renderTabs();
    loadOrders(currentTab); 
    if(window.lucide) window.lucide.createIcons(); 
    
    // Global listener để đóng modal
    window.onclick = function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.style.display = 'none';
        }
    }
}

// Cải tiến: Sử dụng onclick và history.pushState
function renderTabs() {
    const tabsContainer = document.getElementById('status-tabs');
    if (!tabsContainer) return;

    let html = '';
    for (const key in TABS) {
        const isActive = key === currentTab;
        // Sử dụng onclick để gọi handleTabClick
        html += `
            <button data-status="${key}"
               onclick="handleTabClick('${key}')"
               class="status-tab px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap 
               ${isActive ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30' : 'text-slate-600 hover:bg-slate-100'}">
                ${TABS[key]}
            </button>
        `;
    }
    tabsContainer.innerHTML = html;
}

// HÀM MỚI: Xử lý click tab không tải lại trang
window.handleTabClick = function(newStatus) {
    if (newStatus === currentTab) return;

    // Cập nhật URL trong thanh địa chỉ mà không tải lại trang
    const newUrl = window.location.pathname + `?tab=${newStatus}`;
    history.pushState({ tab: newStatus }, '', newUrl);

    // Cập nhật trạng thái active của tab
    currentTab = newStatus;
    renderTabs(); // Re-render tabs để cập nhật active class

    // Tải dữ liệu mới
    loadOrders(newStatus); 
}

function renderOrderList(status) {
    const listContainer = document.getElementById('order-list');
    const noOrdersEl = document.getElementById('no-orders');
    const currentTabNameEl = document.getElementById('current-tab-name');

    if (!listContainer || !noOrdersEl || !currentTabNameEl) return;

    currentTabNameEl.textContent = TABS[status];

    const filteredOrders = ordersData; // ordersData đã được tải sẵn cho tab này
    
    if (filteredOrders.length === 0) {
        listContainer.innerHTML = '';
        noOrdersEl.classList.remove('hidden');
        return;
    } else {
        noOrdersEl.classList.add('hidden');
    }

    listContainer.innerHTML = filteredOrders.map(order => orderCardHTML(order)).join('');
    if(window.lucide) window.lucide.createIcons();
}

function orderCardHTML(order) {
    const dateStr = new Date(order.OrderDate).toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    const totalAmountStr = new Intl.NumberFormat('vi-VN').format(order.TotalAmount) + ' đ';

    // Helper functions (getStatusBadge, getPaymentBadge) vẫn được giữ nguyên trong JS

    return `
        <div class="order-card bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-200 p-5 lg:p-6 grid grid-cols-12 gap-y-4 gap-x-4" id="order-card-${order.OrderID}">
            
            <!-- COLUMN 1: Order Info (col-span-12 md:col-span-3) -->
            <div class="col-span-12 md:col-span-3 lg:col-span-3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                <div>
                    <span class="text-sm text-slate-500">Mã đơn:</span>
                    <span class="text-xl font-extrabold text-slate-900 block mt-0.5">#${order.OrderID}</span>
                    <span class="text-xs text-slate-400 mt-1">${dateStr}</span>
                </div>
                <div class="mt-3">
                     ${getStatusBadge(order)}
                </div>
            </div>

            <!-- COLUMN 2: Customer & Address (col-span-12 md:col-span-4) -->
            <div class="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                <div>
                    <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Khách hàng</label>
                    <div class="font-bold text-slate-800 text-lg flex items-center gap-2">
                        ${order.ReceiverName}
                        <!-- FIX: Gọi đúng hàm window.openGlobalChatWith -->
                        <button class="text-xs bg-sky-50 text-sky-600 font-medium px-2.5 py-1 rounded-full hover:bg-sky-100 transition-colors"
                            onclick="event.stopPropagation(); window.openGlobalChatWith(${order.UserID}, '${order.ReceiverName}')">
                            <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i> Chat</span>
                        </button>
                    </div>
                    <div class="text-sm text-slate-500 mt-1">${order.ReceiverPhone}</div>
                </div>
                <div class="mt-3">
                    <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Địa chỉ</label>
                    <div class="text-sm text-slate-700 line-clamp-2">${order.ReceiverAddress}</div>
                </div>
            </div>

            <!-- COLUMN 3: Financial & Shipping (col-span-12 md:col-span-5 lg:col-span-4) -->
            <div class="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col justify-between border-b md:border-b-0 lg:border-r border-slate-100 pb-4 md:pb-0 lg:pr-4">
                <div class="mb-3">
                    <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Tổng tiền</label>
                    <div class="text-2xl font-extrabold text-rose-600">${totalAmountStr}</div>
                    <div class="mt-2 flex items-center gap-2">
                        ${getPaymentBadge(order)}
                        <span class="text-xs text-slate-500">| ${order.PaymentMethod}</span>
                    </div>
                </div>
                ${order.ShippingCarrier ? `
                <div class="mt-auto pt-2 border-t border-slate-100">
                    <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Vận chuyển</label>
                    <div class="text-sm text-slate-700 font-medium">${order.ShippingCarrier}</div>
                    <div class="text-xs text-slate-500">Mã: ${order.ShippingCode}</div>
                </div>
                ` : '<div class="text-sm text-slate-400 mt-auto">Chưa có thông tin vận chuyển.</div>'}
            </div>
            
            <!-- COLUMN 4: Actions (col-span-12 lg:col-span-2) -->
            <div class="col-span-12 lg:col-span-2 flex flex-col justify-center gap-3 pt-4 lg:pt-0">
                <!-- Admin Verdict -->
                ${order.AdminVerdict ? `
                    <div class="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                        <i data-lucide="clipboard-check" class="w-3 h-3 inline mr-1"></i> Đã xử lý
                    </div>
                ` : ''}
                
                <a href="/HeThongChamSocCaKoi/frontend/shop/order_detail.php?id=${order.OrderID}" class="btn-action bg-slate-800 text-white hover:bg-slate-700 w-full" target="_blank">
                    <i data-lucide="eye" class="w-4 h-4"></i> Chi tiết
                </a>

                ${order.Status === 'Pending' ? `
                    <button class="btn-action bg-rose-500 text-white hover:bg-rose-600 w-full" onclick="event.stopPropagation(); confirmCancel(${order.OrderID})">
                        <i data-lucide="x" class="w-4 h-4"></i> Từ chối (Hoàn tiền)
                    </button>
                    <button class="btn-action bg-sky-600 text-white hover:bg-sky-700 w-full" data-order-id="${order.OrderID}" onclick="event.stopPropagation(); changeStatus(this, 'Processing', 'Đã xác nhận đơn hàng')">
                        <i data-lucide="check" class="w-4 h-4"></i> Xác nhận
                    </button>
                ` : ''}

                ${order.Status === 'Processing' ? `
                    <button class="btn-action bg-slate-500 text-white hover:bg-slate-600 w-full" onclick="event.stopPropagation(); confirmCancel(${order.OrderID})">
                        <i data-lucide="ban" class="w-4 h-4"></i> Hủy & Hoàn
                    </button>
                    <button class="btn-action bg-sky-600 text-white hover:bg-sky-700 w-full" onclick="event.stopPropagation(); openShipModal(${order.OrderID})">
                        <i data-lucide="send" class="w-4 h-4"></i> Giao hàng
                    </button>
                ` : ''}
                
                ${order.Status === 'Dispute' ? `
                    <button class="btn-action bg-red-600 text-white hover:bg-red-700 w-full" onclick="event.stopPropagation(); openResolveModal(findOrderById(${order.OrderID}))">
                        <i data-lucide="shield-alert" class="w-4 h-4"></i> Xử lý KN
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function getStatusBadge(order) {
    let colorClass, label, icon;
    let status = order.Status;

    const baseStyle = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ring-1 ring-opacity-50 ";

    if (status === 'Pending') {
        colorClass = "bg-blue-50 text-blue-700 ring-blue-500";
        icon = 'clock';
        label = TABS[status];
    } else if (status === 'Processing') {
        colorClass = "bg-indigo-50 text-indigo-700 ring-indigo-500";
        icon = 'loader';
        label = TABS[status];
    } else if (status === 'Shipped') {
        colorClass = "bg-green-50 text-green-700 ring-green-500";
        icon = 'package';
        label = TABS[status];
    } else if (status === 'Completed') {
        colorClass = "bg-emerald-50 text-emerald-700 ring-emerald-500";
        icon = 'check-circle';
        label = TABS[status];
    } else if (status === 'Dispute') {
        colorClass = "bg-red-50 text-red-700 ring-red-500";
        icon = 'shield-alert';
        label = TABS[status];
    } else if (status === 'AdminReview') {
        colorClass = "bg-orange-50 text-orange-700 ring-orange-500";
        icon = 'gavel';
        label = TABS[status];
    } else if (status === 'Refunded') {
        colorClass = "bg-slate-200 text-slate-600 ring-slate-400";
        icon = 'wallet';
        label = TABS[status];
    } else if (status === 'Cancelled') {
         colorClass = "bg-slate-200 text-slate-600 ring-slate-400";
        icon = 'x-circle';
        label = TABS[status];
    } else {
         colorClass = "bg-slate-100 text-slate-600 ring-slate-300";
        icon = 'help-circle';
        label = 'Unknown';
    }

    return `<span class="${baseStyle} ${colorClass}">
                <i data-lucide="${icon}" class="w-3 h-3"></i> ${label}
            </span>`;
}

function getPaymentBadge(order) {
    let colorClass, label;

    if (order.PaymentStatus === 'PAID') {
        colorClass = "text-emerald-700 bg-emerald-100";
        label = 'ĐÃ THANH TOÁN';
    } else {
        colorClass = "text-amber-700 bg-amber-100";
        label = 'CHƯA TT';
    }

    return `<span class="px-2 py-0.5 rounded text-xs font-semibold ${colorClass}">${label}</span>`;
}


// Cải tiến: Chỉ cập nhật UI sau hành động, sau đó load lại danh sách orders cho tab hiện tại
async function changeStatus(btnEl, newStatus, reason) {
    const orderId = parseInt(btnEl.dataset.orderId);
    
    btnEl.disabled = true;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Đang xử lý...`;
    if(window.lucide) window.lucide.createIcons();

    try {
        // Thay thế mockApiCall bằng fetch API thực tế
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/change_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: newStatus, reason: reason })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error || 'Lỗi API');
        

        // Tải lại dữ liệu cho tab hiện tại
        await loadOrders(currentTab); 

        // FIX: Cập nhật chỉ số Stats sau khi hành động thành công
        await updateStats(); 

        toast(`✅ Đã cập nhận trạng thái đơn hàng #${orderId} sang ${TABS[newStatus]}.`, 'success');
        

    } catch (error) {
        toast(`❌ Lỗi: Không thể cập nhật đơn hàng #${orderId}. ${error.message}`, 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
    }
}


// Modal Hủy Đơn
window.confirmCancel = function(id) {
    cancelOrderId = id;
    document.getElementById('cancelModal').style.display = 'flex';
    if(window.lucide) window.lucide.createIcons();
}

window.submitShopCancel = async function() {
    const reasonEl = document.getElementById('cancelReason');
    const btnEl = document.getElementById('cancelSubmitBtn');
    const reason = reasonEl.value.trim();

    if (!reason) { toast("Vui lòng nhập lý do hủy.", 'error'); return; }
    
    btnEl.disabled = true;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="flex items-center justify-center gap-2"><i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Đang hủy & hoàn tiền...</span>`;
    if(window.lucide) window.lucide.createIcons();
    closeModal('cancelModal');

    try {
        // Thay thế mockApiCall bằng fetch API thực tế
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/shop_cancel.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: cancelOrderId, reason: reason })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error || 'Lỗi API');

        await loadOrders(currentTab); 
        
        // FIX: Cập nhật chỉ số Stats sau khi hành động thành công
        await updateStats(); 

        toast(`✅ Đã hủy đơn hàng #${cancelOrderId} và kích hoạt hoàn tiền tự động.`, 'success');
        
    } catch (error) {
        toast(`❌ Lỗi: Không thể hủy đơn hàng #${cancelOrderId}. ${error.message}`, 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
        reasonEl.value = ''; // Clear reason
    }
}

// Modal Giao Hàng (Ship)
window.openShipModal = function(orderId) {
    document.getElementById('shipOrderId').value = orderId;
    document.getElementById('shipModal').style.display = 'flex';
    if(window.lucide) window.lucide.createIcons();
}

window.submitShipping = async function(e) {
    e.preventDefault();
    const formEl = e.target;
    const orderId = document.getElementById('shipOrderId').value;
    const btnEl = document.getElementById('shipSubmitBtn');

    btnEl.disabled = true;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="flex items-center justify-center gap-2"><i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Đang cập nhật...</span>`;
    if(window.lucide) window.lucide.createIcons();
    closeModal('shipModal');
    
    try {
        const formData = new FormData(formEl);
        // Thay thế mockApiCall bằng fetch API thực tế
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/shop/order_process/update_shipping.php', {
            method: 'POST', body: formData
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error || 'Lỗi API');


        await loadOrders(currentTab); 
        
        // FIX: Cập nhật chỉ số Stats sau khi hành động thành công
        await updateStats(); 

        toast(`✅ Đã cập nhật vận chuyển cho đơn hàng #${orderId}. Chuyển sang trạng thái "Đang vận chuyển".`, 'success');
        
    } catch (error) {
        toast(`❌ Lỗi: Không thể cập nhật vận chuyển đơn hàng #${orderId}. ${error.message}`, 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
        formEl.reset();
    }
}


// Modal Khiếu Nại (Dispute)
window.openResolveModal = function(orderData) {
    currentDisputeOrder = orderData;
    document.getElementById('resolveModal').style.display = 'flex';
    
    const disputeReasonTextEl = document.getElementById('disputeReasonText');
    if (disputeReasonTextEl) disputeReasonTextEl.innerText = orderData.DisputeReason || 'Không có lý do chi tiết.';
    
    const evidenceLink = document.getElementById('disputeEvidenceLink');
    if (evidenceLink) {
        evidenceLink.classList.toggle('hidden', !orderData.DisputeEvidence);
        if(orderData.DisputeEvidence) evidenceLink.href = orderData.DisputeEvidence;
    }
    if(window.lucide) window.lucide.createIcons();
}

window.submitResolve = async function(action) {
    const replyEl = document.getElementById('disputeReply');
    const reply = replyEl.value.trim();
    if (!currentDisputeOrder) return;
    
    const btnEl = action === 'refund' ? document.getElementById('resolveRefundBtn') : document.getElementById('resolveRejectBtn');
    
    btnEl.disabled = true;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="flex items-center justify-center gap-2"><i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Đang gửi...</span>`;
    if(window.lucide) window.lucide.createIcons();
    closeModal('resolveModal');
    
    const message = action === 'refund' ? 'Chấp nhận hoàn tiền' : 'Từ chối, chuyển Admin';

    try {
        // Thay thế mockApiCall bằng fetch API thực tế
        const response = await fetch(`/HeThongChamSocCaKoi/backend/api/shop/order_process/resolve_dispute.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: currentDisputeOrder.OrderID, action: action, reply: reply })
        });
        const res = await response.json();
        if (!res.success) throw new Error(res.error || 'Lỗi API');


        await loadOrders(currentTab); 

        // FIX: Cập nhật chỉ số Stats sau khi hành động thành công
        await updateStats(); 

        toast(`✅ Đã xử lý khiếu nại đơn #${currentDisputeOrder.OrderID}: ${message}.`, 'success');
        
    } catch (error) {
        toast(`❌ Lỗi: Xử lý khiếu nại thất bại cho đơn #${currentDisputeOrder.OrderID}. ${error.message}`, 'error');
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
        replyEl.value = ''; // Clear reply
    }
}