// --- GLOBAL VARS ---
// Sử dụng các biến PHP được định nghĩa trong users_management.php
// Đã sửa lỗi: Lấy biến từ window object (được định nghĩa trong PHP) để tránh lỗi redeclaration
// FIX: Đổi 'const' thành 'var' cho các biến toàn cục để tránh lỗi "already been declared" nếu script bị load lại.
var CURRENT_USER_ID = window.CURRENT_USER_ID;
var CURRENT_USER_ROLE = window.CURRENT_USER_ROLE;
var API_BASE = '/HeThongChamSocCaKoi/backend/api/admin/users_management/';

// Helper: timeAgoFromDatetime
function timeAgoFromDatetime(dtString) {
    if (!dtString) return 'Chưa hoạt động';
    let t = new Date(dtString);
    if (isNaN(t.getTime())) t = new Date(dtString.replace(' ', 'T'));
    if (isNaN(t.getTime())) return 'Chưa hoạt động';
    const diff = Math.floor((Date.now() - t.getTime()) / 1000);
    if (diff < 60) return 'Online';
    if (diff < 60*60) return Math.floor(diff/60) + ' phút trước';
    if (diff < 60*60*24) return Math.floor(diff/(60*60)) + ' giờ trước';
    if (diff < 60*60*24*7) return Math.floor(diff/(60*60*24)) + ' ngày trước';
    return 'Lâu rồi';
}
function isOnline(dtString, minutesThreshold = 5) {
    if (!dtString) return false;
    let t = new Date(dtString);
    if (isNaN(t.getTime())) t = new Date(dtString.replace(' ', 'T'));
    if (isNaN(t.getTime())) return false;
    const diffMin = (Date.now() - t.getTime()) / 60000;
    return diffMin <= minutesThreshold;
}
function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
// --- END HELPERS ---

// State
let UM_STATE = {
    page: 1,
    per_page: 20, // Tăng lên 20 để hiển thị nhiều hơn
    q: '',
    role: '',
    provider: '',
    status_filter: 'active', // Trạng thái: 'active', 'disabled', 'deleted', 'all'
    order_by: 'UserID',
    order_dir: 'DESC'
};

// Custom Modal (Alerts/Confirms)
function showModal(title, message, isConfirm, onConfirm = null) {
    // Khai báo và lấy element bên trong function
    const modal = document.getElementById('um-modal');
    const modalTitle = document.getElementById('um-modal-title');
    const modalMessage = document.getElementById('um-modal-message');
    const modalActions = document.getElementById('um-modal-actions');
    
    modalTitle.textContent = title;
    modalMessage.innerHTML = message; // Dùng innerHTML để hỗ trợ hiển thị chi tiết (handleUserDetail)
    modalActions.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'px-5 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition duration-150 shadow-sm';
    closeBtn.textContent = 'Đóng';
    closeBtn.onclick = () => modal.classList.add('hidden');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (isConfirm) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-5 py-2 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition duration-150 shadow-sm';
        cancelBtn.textContent = 'Hủy';
        cancelBtn.onclick = () => modal.classList.add('hidden');

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'px-5 py-2 bg-danger text-white rounded-xl font-semibold hover:bg-red-600 transition duration-150 shadow-lg shadow-red-200';
        confirmBtn.textContent = 'Xác nhận';
        confirmBtn.onclick = () => {
            modal.classList.add('hidden');
            if (onConfirm) onConfirm();
        };

        modalActions.appendChild(cancelBtn);
        modalActions.appendChild(confirmBtn);
    } else {
        modalActions.appendChild(closeBtn);
    }
}

// --- FORM MODAL LOGIC (Create/Edit) ---

function showFormModal(title, userData, onSubmit) {
    // Khai báo và lấy element bên trong function
    const formModal = document.getElementById('form-modal');
    const formModalTitle = document.getElementById('form-modal-title');
    const userForm = document.getElementById('user-form');
    const formCancelBtn = document.getElementById('form-cancel');
    const formSubmitBtn = document.getElementById('form-submit');

    formModalTitle.textContent = title;
    userForm.innerHTML = renderFormFields(userData);
    
    // Clear previous submission listeners from the form itself
    userForm.onsubmit = null; 

    formCancelBtn.onclick = () => formModal.classList.add('hidden');
    
    // Sử dụng sự kiện submit của form để xử lý dữ liệu (chuẩn hơn)
    userForm.onsubmit = (e) => {
        e.preventDefault();
        
        // Browser validation should be sufficient, but we check again for safety
        if (!userForm.checkValidity()) {
            // reportValidity() forces browser to show errors
            userForm.reportValidity();
            return;
        }

        // Collect and process data
        const data = collectFormData(userData.UserID);
        if (data) {
            onSubmit(data);
            formModal.classList.add('hidden');
        } else {
            // Should not happen if checkValidity() passes, but as a safeguard:
            showModal('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc.', false);
        }
    };
    
    formModal.classList.remove('hidden');
    formModal.classList.add('flex');
    lucide.createIcons();
}

function renderFormFields(userData) {
    const isEdit = !!userData.UserID;
    const user = userData || {};
    
    // Nếu đang chỉnh sửa và là Admin, không cho chỉnh Role
    const disableRole = isEdit && user.Role === 'Admin';

    return `
        <div class="space-y-4">
            ${isEdit ? `<div class="text-sm text-gray-500 mb-4">ID Người dùng: #${user.UserID}</div>` : ''}

            <label class="block">
                <span class="text-gray-700 font-medium flex items-center">Họ tên <i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i></span>
                <input type="text" id="form-fullname" name="FullName" value="${escapeHtml(user.FullName || '')}" required
                        class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3">
            </label>

            <label class="block">
                <span class="text-gray-700 font-medium flex items-center">Email <i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i></span>
                <input type="email" id="form-email" name="Email" value="${escapeHtml(user.Email || '')}" required
                        class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3">
            </label>

            <label class="block">
                <span class="text-gray-700 font-medium flex items-center">Username <i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i></span>
                <input type="text" id="form-username" name="Username" value="${escapeHtml(user.Username || '')}" required
                        class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3">
            </label>

            <div class="grid grid-cols-2 gap-4">
                <label class="block">
                    <span class="text-gray-700 font-medium flex items-center">Role <i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i></span>
                    <select id="form-role" name="Role" required class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3" ${disableRole ? 'disabled' : ''}>
                        <option value="Customer" ${user.Role === 'Customer' ? 'selected' : ''}>Customer</option>
                        <option value="Shop" ${user.Role === 'Shop' ? 'selected' : ''}>Shop</option>
                        <option value="Admin" ${user.Role === 'Admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    ${disableRole ? `<input type="hidden" name="Role" value="${user.Role}">` : ''}
                </label>
                
                <label class="block">
                    <span class="text-gray-700 font-medium flex items-center">Provider <i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i></span>
                    <select id="form-provider" name="AuthProvider" required class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3">
                        <option value="local" ${user.AuthProvider === 'local' ? 'selected' : ''}>local</option>
                        <option value="google" ${user.AuthProvider === 'google' ? 'selected' : ''}>google</option>
                        <option value="facebook" ${user.AuthProvider === 'facebook' ? 'selected' : ''}>facebook</option>
                        <option value="github" ${user.AuthProvider === 'github' ? 'selected' : ''}>github</option>
                    </select>
                </label>
            </div>
            
            <label class="block">
                <span class="text-gray-700 font-medium flex items-center">Password ${!isEdit ? `<i data-lucide="asterisk" class="w-3 h-3 text-danger ml-1"></i>` : `(Để trống nếu không đổi)`}</span>
                <input type="password" id="form-password" name="Password" ${!isEdit ? 'required' : ''} minlength="6"
                        class="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/50 p-3">
            </label>
            
        </div>
    `;
}

function collectFormData(userId) {
    // Khai báo và lấy element bên trong function
    const userForm = document.getElementById('user-form');
    
    const data = {};
    const inputs = userForm.querySelectorAll('input, select');
    
    let isValid = true;
    
    inputs.forEach(input => {
        const name = input.name;
        if (name) {
            // Only collect non-disabled inputs, except hidden ones for role
            if (!input.disabled || input.type === 'hidden') {
                data[name] = input.value;
            }
        }
    });

    if (userId) data.UserID = userId;
    
    // Browser validation handles required fields, so manual check is mostly redundant here.
    
    return isValid ? data : null;
}

// --- API FUNCTIONS ---

async function fetchStats() {
    try {
        const res = await fetch(API_BASE + 'stats.php');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        renderStatsCards(data);
    } catch (e) {
        console.error("Lỗi khi tải thống kê:", e);
        // Fallback or display error in stats area
    }
}

/**
 * Tải chi tiết người dùng qua UserID
 * SỬ DỤNG ENDPOINT CHUYÊN DỤNG: get_user_detail.php
 */
async function fetchUserDetail(userId) {
    try {
        const url = API_BASE + `get_user_detail.php?UserID=${userId}`; // <-- Đã thay đổi
        const res = await fetch(url);
        const data = await res.json();

        if (data.error || !data.user) {
            throw new Error(data.error || "Không tìm thấy chi tiết người dùng.");
        }
        return data.user;
    } catch (e) {
        console.error("Lỗi khi tải chi tiết người dùng:", e);
        showModal('Lỗi', `Không thể tải chi tiết người dùng #${userId}: ${e.message}`, false);
        return null;
    }
}

async function loadUsersTable() {
    const params = new URLSearchParams({
        page: UM_STATE.page,
        per_page: UM_STATE.per_page,
        q: UM_STATE.q,
        role: UM_STATE.role,
        provider: UM_STATE.provider,
        status_filter: UM_STATE.status_filter, // NEW: Filter including IsDeleted state
        order_by: UM_STATE.order_by,
        order_dir: UM_STATE.order_dir
    });
    const url = API_BASE + 'list.php?' + params.toString();

    const wrap = document.getElementById('users-table');
    const loading = document.getElementById('loading-spinner');

    if(loading) loading.classList.remove('hidden');
    wrap.querySelector('.table-container')?.classList.add('hidden');

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        wrap.innerHTML = renderFullComponent(data);
        
        if(loading) loading.classList.add('hidden');
        wrap.querySelector('.table-container')?.classList.remove('hidden');
        
        bindTableEvents(data);
        lucide.createIcons();

    } catch (e) {
        wrap.innerHTML = `<p class="p-4 mt-4 text-sm font-medium text-danger bg-red-50 border border-red-200 rounded-lg">Lỗi khi tải dữ liệu: ${e.message}</p>`;
    }
}

async function handleAction(endpoint, payload, successMessage, failureMessage) {
    try {
        const res = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Sử dụng JSON cho payload phức tạp
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            loadUsersTable();
            fetchStats(); // Update stats after action
            showModal('Thành công', successMessage, false);
        } else {
            showModal('Lỗi thao tác', data.error || failureMessage, false);
        }
    } catch (e) {
        showModal('Lỗi kết nối', 'Lỗi kết nối API: ' + e.message, false);
    }
}

// --- CRUD HANDLERS (Global access required for inline onClick) ---

window.handleCreateUser = function() {
    showFormModal('Tạo Người Dùng Mới', {}, async (formData) => {
        const payload = new FormData();
        for (const key in formData) { payload.append(key, formData[key]); }

        try {
            const res = await fetch(API_BASE + 'add.php', { method: 'POST', body: payload });
            const data = await res.json();
            if (data.success) {
                loadUsersTable();
                fetchStats();
                showModal('Thành công', `Người dùng ${formData.FullName} đã được tạo.`, false);
            } else {
                showModal('Lỗi tạo người dùng', data.error || 'Có lỗi xảy ra khi tạo người dùng.', false);
            }
        } catch (e) {
            showModal('Lỗi kết nối', 'Lỗi kết nối API: ' + e.message, false);
        }
    });
}

window.handleUserDetail = async function(userId) {
    const user = await fetchUserDetail(userId);
    if (user) {
        let detailHtml = `<div class="space-y-3 text-left">
            <p class="text-lg font-bold text-primary">Chi tiết người dùng #${user.UserID}</p>
            <p><span class="font-semibold text-gray-700">Họ tên:</span> ${escapeHtml(user.FullName)}</p>
            <p><span class="font-semibold text-gray-700">Username:</span> ${escapeHtml(user.Username)}</p>
            <p><span class="font-semibold text-gray-700">Email:</span> ${escapeHtml(user.Email)}</p>
            <p><span class="font-semibold text-gray-700">Role:</span> ${escapeHtml(user.Role)}</p>
            <p><span class="font-semibold text-gray-700">Provider:</span> ${escapeHtml(user.AuthProvider)}</p>
            <p><span class="font-semibold text-gray-700">Last Seen:</span> ${user.LastSeen ? new Date(user.LastSeen).toLocaleString('vi-VN') : 'N/A'}</p>
            <p><span class="font-semibold text-gray-700">Active:</span> ${user.IsActive == 1 ? 'Có' : 'Không'}</p>
            <p><span class="font-semibold text-gray-700">Deleted:</span> ${user.IsDeleted == 1 ? 'Có (Đã xóa)' : 'Không'}</p>
        </div>`;
        showModal('Chi tiết Người dùng', detailHtml, false);
    }
}

window.handleEditUser = async function(userId) {
    // 1. Tải dữ liệu người dùng qua API
    const user = await fetchUserDetail(userId);
    
    if (!user) return; // Nếu lỗi, fetchUserDetail đã hiển thị modal thông báo lỗi

    // 2. Mở form chỉnh sửa với dữ liệu đã tải
    showFormModal(`Chỉnh Sửa Người Dùng: #${userId}`, user, async (formData) => {
        const payload = new FormData();
        for (const key in formData) { payload.append(key, formData[key]); }
        
        try {
            // Gửi dữ liệu form tới API chỉnh sửa
            const res = await fetch(API_BASE + 'edit.php', { method: 'POST', body: payload });
            const data = await res.json();

            if (data.success) {
                loadUsersTable();
                showModal('Thành công', `Người dùng #${userId} đã được cập nhật.`, false);
            } else {
                showModal('Lỗi cập nhật', data.error || 'Có lỗi xảy ra khi cập nhật.', false);
            }
        } catch (e) {
            showModal('Lỗi kết nối', 'Lỗi kết nối API: ' + e.message, false);
        }
    });
}


window.handleToggleActive = function(userId, action) {
    const verb = action === 'disable' ? 'Vô hiệu hóa' : 'Kích hoạt';
    showModal(
        `${verb} tài khoản`,
        `Bạn có chắc chắn muốn ${verb.toLowerCase()} tài khoản #${userId} này không?`,
        true,
        () => handleAction('toggle_active.php', { UserID: userId, action: action }, `Đã ${verb.toLowerCase()} tài khoản #${userId}.`, `Lỗi khi ${verb.toLowerCase()} tài khoản.`)
    );
}

window.handleSoftDelete = function(userId, name) {
    showModal(
        `Xóa Tài Khoản`,
        `Bạn có chắc chắn muốn **Xóa** tài khoản "${name}" (#${userId})? Tài khoản sẽ bị vô hiệu hóa, chuyển sang trạng thái Deleted và **bị ẩn hoàn toàn** khỏi các bộ lọc mặc định.`,
        true,
        () => handleAction('soft_delete.php', { UserID: userId, action: 'soft_delete' }, `Đã xóa tài khoản #${userId}.`, `Lỗi khi xóa tài khoản.`)
    );
}

window.handleRestore = function(userId) {
    showModal(
        `Khôi phục Tài Khoản`,
        `Bạn có chắc chắn muốn **Khôi phục** tài khoản #${userId} này không? Tài khoản sẽ trở lại trạng thái Active và hiển thị lại trên danh sách mặc định.`,
        true,
        () => handleAction('soft_delete.php', { UserID: userId, action: 'restore' }, `Đã khôi phục tài khoản #${userId}.`, `Lỗi khi khôi phục tài khoản.`)
    );
}


// --- UI RENDERING ---

function renderStatsCards(stats) {
    const cardData = [
        { label: 'Tổng số Người dùng', value: stats.total || 0, icon: 'users', color: 'primary' },
        { label: 'Đang hoạt động', value: stats.active || 0, icon: 'zap', color: 'success' },
        { label: 'Bị Vô hiệu hóa', value: stats.disabled || 0, icon: 'lock', color: 'warning' },
        { label: 'Đã Xóa', value: stats.deleted || 0, icon: 'trash-2', color: 'danger' },
    ];

    const html = cardData.map(s => `
        <div class="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex items-center justify-between transition duration-300 hover:shadow-lg">
            <div>
                <p class="text-sm font-medium text-gray-500">${s.label}</p>
                <p class="text-3xl font-extrabold text-${s.color}-800 mt-1">${s.value}</p>
            </div>
            <div class="p-3 rounded-full bg-${s.color}-100 text-${s.color} opacity-70">
                <i data-lucide="${s.icon}" class="w-6 h-6"></i>
            </div>
        </div>
    `).join('');

    document.getElementById('stats-cards').innerHTML = html;
    lucide.createIcons();
}

function renderFilterToolbar() {
    const statusFilters = [
        { value: 'active', label: 'Hoạt động', icon: 'zap' },
        { value: 'disabled', label: 'Vô hiệu hóa', icon: 'lock' },
        { value: 'deleted', label: 'Đã xóa', icon: 'archive' },
        { value: 'all', label: 'Tất cả', icon: 'users' },
    ];

    return `
        <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <!-- Status Segmented Control -->
            <div class="flex flex-wrap gap-2 p-1 bg-gray-50 rounded-xl shadow-inner text-sm font-medium border border-gray-200">
                ${statusFilters.map(f => `
                    <button 
                        data-status-filter="${f.value}"
                        class="flex items-center px-4 py-2 rounded-xl transition duration-150 
                        ${UM_STATE.status_filter === f.value 
                            ? 'bg-primary text-white shadow-lg shadow-primary-light/30' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }"
                    >
                        <i data-lucide="${f.icon}" class="w-4 h-4 mr-2"></i>
                        ${f.label}
                    </button>
                `).join('')}
            </div>

            <!-- Filters, Search & Create -->
            <div class="flex flex-wrap gap-3 w-full md:w-auto md:justify-end">
                
                <button class="flex items-center px-4 py-2 bg-primary text-white rounded-xl font-semibold transition duration-200 hover:bg-primary-light shadow-md shadow-primary/30" onclick="handleCreateUser()">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Tạo Người Dùng
                </button>
                
                <input id="um-search" 
                    class="px-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary w-full sm:w-48 text-sm transition" 
                    placeholder="Tìm kiếm..." 
                    value="${UM_STATE.q || ''}">
                
                <select id="um-role" class="px-3 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary text-sm bg-white transition">
                    <option value="">-- Role --</option>
                    <option value="Admin" ${UM_STATE.role==='Admin'?'selected':''}>Admin</option>
                    <option value="Shop" ${UM_STATE.role==='Shop'?'selected':''}>Shop</option>
                    <option value="Customer" ${UM_STATE.role==='Customer'?'selected':''}>Customer</option>
                </select>

                <select id="um-provider" class="px-3 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary text-sm bg-white transition">
                    <option value="">-- Provider --</option>
                    <option value="local" ${UM_STATE.provider==='local'?'selected':''}>Local</option>
                    <option value="google" ${UM_STATE.provider==='google'?'selected':''}>Google</option>
                    <option value="facebook" ${UM_STATE.provider==='facebook'?'selected':''}>Facebook</option>
                    <option value="github" ${UM_STATE.provider==='github'?'selected':''}>Github</option>
                </select>
            </div>
        </div>
    `;
}

function renderTable(rows) {
    if (rows.length === 0) {
        return `<div class="p-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-4">
                    <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-3 text-gray-400"></i>
                    <p class="text-xl font-semibold">Không tìm thấy người dùng nào</p>
                    <p class="text-sm">Vui lòng kiểm tra lại bộ lọc và từ khóa tìm kiếm.</p>
                </div>`;
    }

    function thSortable(col, label) {
        const active = UM_STATE.order_by === col;
        const dir = active ? UM_STATE.order_dir : '';
        const icon = active 
            ? (dir === 'ASC' ? `<i data-lucide="chevron-up" class="w-3 h-3 ml-1"></i>` : `<i data-lucide="chevron-down" class="w-3 h-3 ml-1"></i>`) 
            : `<i data-lucide="chevrons-up-down" class="w-3 h-3 ml-1 text-gray-400"></i>`;
        return `
            <th 
                class="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition duration-150" 
                data-col="${col}">
                <span class="flex items-center">${label} ${icon}</span>
            </th>
        `;
    }
    
    let html = `
        <div class="table-wrapper">
            <table class="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr class="bg-gray-50">
                        ${thSortable('UserID','ID')}
                        ${thSortable('Username','Username')} <!-- Đã đổi từ FullName sang Username -->
                        <th>Email</th> <!-- Đã đổi từ Email/Username sang Email -->
                        ${thSortable('Role','Role')}
                        <th>Provider</th>
                        <th class="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                        ${thSortable('LastSeen','Hoạt động')}
                        <th class="p-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-[240px]">Hành động</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
    `;

    for (const u of rows) {
        const online = u.IsDeleted == 0 && isOnline(u.LastSeen);
        const activityStatus = online
            ? `<div class="flex items-center text-success font-semibold text-xs"><span class="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span> Online</div>`
            : `<div class="text-gray-500 text-xs">${timeAgoFromDatetime(u.LastSeen)}</div>`;

        let activePill;
        let actions;
        let rowClass = u.IsDeleted == 1 ? 'bg-red-50/20 hover:bg-red-50' : 'hover:bg-indigo-50/50';

        // Check if the current user can modify this row
        const isSelf = u.UserID == CURRENT_USER_ID;
        const isOtherAdmin = u.Role === 'Admin' && !isSelf;

        if (isSelf) {
            actions = `<span class="text-gray-400 italic text-xs">Tài khoản của bạn</span>`;
            rowClass = 'bg-primary-light/10 hover:bg-primary-light/20';
        } else if (isOtherAdmin) {
            // Admin Protection Logic: Admin cannot modify other Admins
            actions = `<span class="text-gray-400 italic text-xs">Không thể thao tác với Admin</span>`;
            rowClass = 'bg-gray-100/70 hover:bg-gray-200';
        } 
        else if (u.IsDeleted == 1) {
            // Soft Deleted User
            activePill = `<span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-danger/10 text-danger border border-danger/50">
                <i data-lucide="archive" class="w-3 h-3 mr-1.5"></i> Deleted
            </span>`;
            actions = `
                <button class="action-btn-custom restore" onclick="handleRestore(${u.UserID})" title="Khôi phục tài khoản">
                    <i data-lucide="undo" class="w-4 h-4"></i>
                </button>
            `;
        } else if (u.IsActive == 1) {
            // Active User
            activePill = `<span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-success/10 text-success border border-success/50">
                <i data-lucide="check-circle" class="w-3 h-3 mr-1.5"></i> Active
            </span>`;
            actions = `
                <button class="action-btn-custom info" onclick="handleUserDetail(${u.UserID})" title="Xem chi tiết">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom edit" onclick="handleEditUser(${u.UserID})" title="Chỉnh sửa">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom warning" onclick="handleToggleActive(${u.UserID}, 'disable')" title="Vô hiệu hóa">
                    <i data-lucide="power" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom danger" onclick="handleSoftDelete(${u.UserID}, '${escapeHtml(u.FullName)}')" title="Xóa">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;
        } else {
            // Disabled User
            activePill = `<span class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-warning/10 text-warning border border-warning/50">
                <i data-lucide="lock" class="w-3 h-3 mr-1.5"></i> Disabled
            </span>`;
            actions = `
                <button class="action-btn-custom info" onclick="handleUserDetail(${u.UserID})" title="Xem chi tiết">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom edit" onclick="handleEditUser(${u.UserID})" title="Chỉnh sửa">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom restore" onclick="handleToggleActive(${u.UserID}, 'enable')" title="Kích hoạt">
                    <i data-lucide="toggle-right" class="w-4 h-4"></i>
                </button>
                <button class="action-btn-custom danger" onclick="handleSoftDelete(${u.UserID}, '${escapeHtml(u.FullName)}')" title="Xóa">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;
        }
        
        html += `
            <tr class="${rowClass} transition duration-150">
                <td class="p-4 text-sm font-medium text-gray-900">${u.UserID}</td>
                <td class="p-4 text-sm font-medium text-gray-900">
                    ${escapeHtml(u.Username || '')} <!-- Đổi thành hiển thị Username -->
                    <div class="text-xs text-gray-500 font-normal mt-0.5">${escapeHtml(u.FullName || '')}</div> <!-- Hiển thị FullName ở dòng phụ -->
                </td>
                <td class="p-4 text-sm text-gray-700">
                    <div class="font-medium">${escapeHtml(u.Email || '')}</div> <!-- Chỉ hiển thị Email -->
                </td>
                <td class="p-4 text-sm text-gray-700">${escapeHtml(u.Role || '')}</td>
                <td class="p-4 text-sm text-gray-700">
                    <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
                        ${escapeHtml(u.AuthProvider || '')}
                    </span>
                </td>
                <td class="p-4">${activePill || '-'}</td>
                <td class="p-4">${activityStatus}</td>
                <td class="p-4 space-x-1 whitespace-nowrap">
                    ${actions}
                </td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
        <style>
            /* Scoped styles for action buttons - Finalized Look */
            .action-btn-custom {
                /* Base: slightly larger, rounded edges, transition for hover */
                @apply inline-flex items-center justify-center p-2.5 text-sm font-medium rounded-xl transition duration-200 ease-in-out border-2 shadow-sm bg-white;
                /* Hover/Active Effects */
                @apply hover:scale-105 hover:shadow-lg active:scale-95; 
            }
            .action-btn-custom.edit {
                @apply text-info border-info/50; 
                @apply hover:bg-info hover:text-white hover:border-info;
            }
            .action-btn-custom.warning {
                @apply text-warning border-warning/50; 
                @apply hover:bg-warning hover:text-white hover:border-warning;
            }
            .action-btn-custom.danger {
                @apply text-danger border-danger/50; 
                @apply hover:bg-danger hover:text-white hover:border-danger;
            }
            .action-btn-custom.restore {
                /* Used for Restore and Enable */
                @apply text-success border-success/50; 
                @apply hover:bg-success hover:text-white hover:border-success;
            }
            .action-btn-custom.info {
                /* Used for View (Primary Blue color) */
                @apply text-primary border-primary/50; 
                @apply hover:bg-primary hover:text-white hover:border-primary;
            }
        </style>
    `;
    return html;
}

function renderPager(total, page, per) {
    const totalPages = Math.ceil(total / per);
    const from = (total === 0) ? 0 : (per*(page-1)+1);
    const to = Math.min(total, per*page);

    if (total === 0) return '';
    
    return `
        <div class="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
            <div class="text-gray-600 font-medium">
                Hiển thị <span class="font-bold text-gray-900">${from}-${to}</span> / <span class="font-bold text-gray-900">${total}</span> (Trang ${page}/${totalPages})
            </div>
            <div class="flex space-x-2">
                <button id="um-pg-prev" class="flex items-center px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium transition duration-150 shadow-sm ${page<=1?'opacity-50 cursor-not-allowed':'hover:bg-gray-50'}" ${page<=1?'disabled':''}>
                    <i data-lucide="chevron-left" class="w-4 h-4"></i> Trước
                </button>
                <button id="um-pg-next" class="flex items-center px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium transition duration-150 shadow-sm ${(to>=total || totalPages === 0 || page >= totalPages)?'opacity-50 cursor-not-allowed':'hover:bg-gray-50'}" ${(to>=total || totalPages === 0 || page >= totalPages)?'disabled':''}>
                    Sau <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

function renderFullComponent(data) {
    const rows = data.items || [];
    return `
        ${renderFilterToolbar()}
        <div class="table-container bg-white rounded-xl shadow-lg border border-gray-200 mt-4">
            ${renderTable(rows)}
            ${renderPager(data.total, data.page, data.per_page)}
        </div>
    `;
}

function bindTableEvents(data) {
    // Search Input (with Debounce)
    document.getElementById('um-search').addEventListener('keyup', debounce((e) => {
        UM_STATE.q = e.target.value.trim();
        UM_STATE.page = 1;
        loadUsersTable();
    }, 300)); 

    // Dropdowns (Role, Provider)
    ['um-role', 'um-provider'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            UM_STATE[id.replace('um-', '')] = e.target.value;
            UM_STATE.page = 1;
            loadUsersTable();
        });
    });

    // Status Segmented Control
    document.querySelectorAll('[data-status-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newStatus = e.currentTarget.dataset.statusFilter;
            if (UM_STATE.status_filter !== newStatus) {
                UM_STATE.status_filter = newStatus;
                UM_STATE.page = 1;
                loadUsersTable();
            }
        });
    });

    // Sortable Headers
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', (e) => {
            const col = e.currentTarget.dataset.col;
            if (UM_STATE.order_by === col) {
                UM_STATE.order_dir = (UM_STATE.order_dir === 'ASC') ? 'DESC' : 'ASC';
            } else {
                UM_STATE.order_by = col;
                UM_STATE.order_dir = 'ASC';
            }
            loadUsersTable();
        });
    });

    // Pager Buttons
    document.getElementById('um-pg-prev')?.addEventListener('click', () => { 
        if (UM_STATE.page > 1) { UM_STATE.page--; loadUsersTable(); } 
    });
    document.getElementById('um-pg-next')?.addEventListener('click', () => { 
        const totalPages = Math.ceil(data.total / UM_STATE.per_page);
        if (UM_STATE.page < totalPages) { UM_STATE.page++; loadUsersTable(); } 
    });
}


// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    loadUsersTable();
});