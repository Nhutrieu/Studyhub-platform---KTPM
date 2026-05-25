// D:\Xampp\htdocs\HeThongChamSocCaKoi\assets\js\shop\vouchers.js
// Quản lý mã giảm giá cho Admin + Shop (Giao diện Grid Card)

const VOUCHER_API_BASE = "/HeThongChamSocCaKoi/backend/api/shop/vouchers";

const voucherState = {
    page: 1,
    perPage: 9, // Đặt lại 9 để vừa với grid
    status: "", // "" | active | inactive
    scope: "", // "" | system | shop
    search: "",
    sort: "CreatedAt|DESC"
};

let voucherCache = {};
let currentMode = "create"; // create | edit

const currentRole = window.currentRole || "Customer";
const currentUserId = Number(window.currentUserId || 0);

/* =============== Toast fallback (nếu chưa có) =============== */
function voucherToast(msg, type = "success") {
    let stack = document.getElementById("toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.id = "toast-stack";
        stack.className = "toast-stack";
        document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : type === "warn" ? "⚠️" : "ℹ️";
    item.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    stack.appendChild(item);
    setTimeout(() => item.classList.add("hide"), 2600);
    setTimeout(() => item.remove(), 3200);
}

/* =================== Helpers chung =================== */
function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));
}

function formatCurrency(v) {
    // Chuyển về số và làm tròn 2 chữ số thập phân nếu cần
    const num = parseFloat(v);
    if (isNaN(num)) return "0";
    
    // Nếu là số nguyên thì không hiện .00
    if (num % 1 === 0) {
        return num.toLocaleString("vi-VN");
    }
    
    // Hiện 2 số thập phân
    return num.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}


function extractUserNote(noteStr) {
    if (!noteStr) return "";
    const lines = String(noteStr)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const cleaned = lines
        .filter(
            (line) =>
                !line.startsWith("[Tên hiển thị]") &&
                !line.startsWith("[Mô tả]")
        )
        .filter((line, idx, arr) => arr.indexOf(line) === idx);

    return cleaned.join("\n");
}

function toInputDateTime(v) {
    if (!v) return "";
    if (v instanceof Date) {
        const pad = (n) => (n < 10 ? "0" + n : "" + n);
        return (
            v.getFullYear() + "-" +
            pad(v.getMonth() + 1) + "-" +
            pad(v.getDate()) + "T" +
            pad(v.getHours()) + ":" +
            pad(v.getMinutes())
        );
    }
    const s = String(v).replace(" ", "T");
    const [d, t = "00:00"] = s.split("T");
    const hhmm = t.slice(0, 5);
    return `${d}T${hhmm}`;
}

// datetime-local -> "YYYY-MM-DD HH:MM:SS"
function normalizeDateTimeInput(v) {
    if (!v) return "";
    const s = String(v);
    if (s.includes("T")) {
        let [d, t] = s.split("T");
        if (!t) t = "00:00";
        if (t.length === 5) t += ":00";
        return `${d} ${t}`;
    }
    return s;
}

// Hiển thị dd/mm/yyyy HH:MM
function formatDateTimeDisplay(str) {
    if (!str) return "—";
    const s = String(str).replace(" ", "T");
    const d = new Date(s);
    if (isNaN(d.getTime())) return str;

    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());

    return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Kiểm tra xem voucher đã hết hạn chưa dựa trên EndDate
 * @param {string} endDateStr Chuỗi ngày kết thúc YYYY-MM-DD HH:MM:SS
 * @returns {boolean} True nếu đã hết hạn
 */
function isExpired(endDateStr) {
    if (!endDateStr) return true;
    const endDate = new Date(String(endDateStr).replace(' ', 'T'));
    const now = new Date();
    // Thêm 1 phút vào ngày kết thúc để đảm bảo không bị hết hạn sớm do lệch giây
    endDate.setMinutes(endDate.getMinutes() + 1); 
    return endDate < now;
}


/* =================== Khởi tạo =================== */
document.addEventListener("DOMContentLoaded", () => {
    bindToolbar();
    bindFormModal();
    autoInitFormDefaults();
    bindCardActions();

    // Load lần đầu
    loadVouchers();
});

/* =================== Toolbar + Pagination =================== */
function bindToolbar() {
    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const scopeFilter = document.getElementById("scope-filter");
    const sortSelect = document.getElementById("sort-select");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    // Load giá trị ban đầu vào select
    statusFilter.value = voucherState.status;
    scopeFilter.value = voucherState.scope;
    sortSelect.value = voucherState.sort;


    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounce((e) => {
                voucherState.search = e.target.value.trim();
                voucherState.page = 1;
                loadVouchers();
            }, 400)
        );
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", (e) => {
            voucherState.status = e.target.value;
            voucherState.page = 1;
            loadVouchers();
        });
    }

    if (scopeFilter) {
        scopeFilter.addEventListener("change", (e) => {
            voucherState.scope = e.target.value;
            voucherState.page = 1;
            loadVouchers();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            voucherState.sort = sortSelect.value;
            voucherState.page = 1;
            loadVouchers();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (voucherState.page > 1) {
                voucherState.page--;
                loadVouchers();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            voucherState.page++;
            loadVouchers();
        });
    }
}


/* =================== Load danh sách voucher =================== */
async function loadVouchers() {
    const grid = document.getElementById("voucher-rows");
    const emptyState = document.getElementById("voucher-empty");
    const toolbarResult = document.getElementById("toolbar-result");

    if (grid) {
        grid.innerHTML =
            '<div style="grid-column: 1 / -1; text-align:center; padding: 20px 0; color:var(--text-muted);">Đang tải dữ liệu...</div>';
    }
    if (emptyState) emptyState.style.display = "none";
    if (toolbarResult) toolbarResult.textContent = "Đang tải dữ liệu...";

    const params = new URLSearchParams();
    params.set("page", voucherState.page);
    params.set("per_page", voucherState.perPage);
    
    // FIX: Chỉ gửi status và scope nếu chúng không phải là chuỗi rỗng
    if (voucherState.status) {
         params.set("status", voucherState.status);
    }
    if (voucherState.scope) {
         params.set("scope", voucherState.scope);
    }
    
    if (voucherState.search) params.set("search", voucherState.search);
    if (voucherState.sort) params.set("sort", voucherState.sort);

    try {
        const res = await fetch(`${VOUCHER_API_BASE}/list.php?${params.toString()}`, {
            credentials: "include"
        });
        const data = await res.json();

        if (!data.success) {
            voucherToast(data.error || "Không tải được danh sách voucher", "error");
            if (grid) grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 20px 0; color:var(--danger);">Lỗi tải dữ liệu.</div>';
            if (toolbarResult) toolbarResult.textContent = "Lỗi tải dữ liệu.";
            return;
        }

        const items = data.items || [];
        voucherCache = {};
        items.forEach((v) => {
            if (v.VoucherID != null) {
                voucherCache[v.VoucherID] = v;
            }
        });

        renderVoucherGrid(items, data);
        updateStats(data);
        updateToolbarResult(data, items.length);
        updatePagination(data);
    } catch (err) {
        console.error(err);
        voucherToast("Lỗi kết nối máy chủ.", "error");
        if (grid) grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 20px 0; color:var(--danger);">Không thể kết nối máy chủ.</div>';
        if (toolbarResult) toolbarResult.textContent = "Không thể kết nối máy chủ.";
    }
}

/* =================== Render Grid Card =================== */
function renderVoucherGrid(items, meta) {
    const grid = document.getElementById("voucher-rows");
    const emptyState = document.getElementById("voucher-empty");

    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    grid.innerHTML = items
        .map(buildVoucherCardHtml)
        .join("");
}

function buildVoucherCardHtml(v) {
    const id = v.VoucherID;
    const code = escapeHtml(v.Code);
    const rawUserNote = extractUserNote(v.Note);
    const noteEscaped = rawUserNote ? escapeHtml(rawUserNote) : "";
    const noteInline = noteEscaped ? noteEscaped.replace(/\n/g, " · ") : "";
    
    const scope = v.Scope || "shop";
    const shopName = v.ShopName ? escapeHtml(v.ShopName) : "System";
    const discountType = (v.DiscountType || "").toLowerCase();
    const isFixed = discountType === "fixed";
    
    // Logic mới:
    const isExpiredFlag = isExpired(v.EndDate);
    const isPaused = v.Status === "inactive"; // Bị tắt thủ công
    
    // Chỉ active nếu status là active VÀ chưa hết hạn
    const isActive = v.Status === "active" && !isExpiredFlag; 

    const canEdit = v.CanEdit === 1 || v.CanEdit === "1" || v.CanEdit === true;

    // --- Header Visuals ---
    const headerClass = isExpiredFlag ? "expired-scope" : scope === "system" ? "system-scope" : "shop-scope";
    const typeBadge = scope === "system" ? "System Voucher" : "Shop Voucher";
    const typeBadgeClass = scope === "system" ? "bg-tag-sys" : "bg-tag-shop";
    const unitBadgeText = isFixed ? "VNĐ" : "%";
    
    // --- Value Display ---
    const value = parseFloat(v.DiscountValue || 0);
    let vcValueText;
    let vcSubValueText;

    if (isFixed) {
        vcValueText = `Giảm ${formatCurrency(value)}đ`;
    } else {
        vcValueText = `Giảm ${formatCurrency(value)}%`;
        const maxDisc = v.MaxDiscountAmount != null && v.MaxDiscountAmount > 0 ? parseFloat(v.MaxDiscountAmount) : null;
        if (maxDisc) {
            vcValueText += ` (Max ${formatCurrency(maxDisc)}đ)`;
        }
    }

    const minOrder = parseFloat(v.MinOrderAmount || 0);
    vcSubValueText = minOrder > 0 ? `Đơn từ ${formatCurrency(minOrder)}đ` : "Không giới hạn đơn tối thiểu";
    
    // --- Status and Time (Footer Text) ---
    let statusText;
    let statusDotClass;
    let timeText = `${formatDateTimeDisplay(v.StartDate)} - ${formatDateTimeDisplay(v.EndDate)}`;
    
    if (isExpiredFlag) {
        statusText = "ĐÃ HẾT HẠN";
        statusDotClass = "status-inactive";
        timeText = `<span style="color: var(--danger); font-weight: 700;">Đã hết hạn</span>`;
    } else if (isPaused) {
        statusText = "TẠM DỪNG";
        statusDotClass = "status-inactive";
    } else {
        statusText = "ĐANG HOẠT ĐỘNG";
        statusDotClass = "status-active";
    }

    // --- Usage Progress ---
    const usedCount = parseInt(v.UsedCount || 0, 10);
    const limitTotal = parseInt(v.UsageLimitTotal || 0, 10);
    const limitPerUser = parseInt(v.UsageLimitPerUser || 0, 0);

    let progressTextUsed = `Đã dùng: ${usedCount}`;
    let progressTextLimit = `Giới hạn: ${limitTotal > 0 ? limitTotal : 'Không giới hạn'}`;
    let progressWidth = limitTotal > 0 ? Math.min(100, (usedCount / limitTotal) * 100) : (usedCount > 0 ? 100 : 0);
    
    let progressClass = "";
    if (isActive) {
        if (limitTotal > 0) {
            if (progressWidth >= 90) {
                progressClass = "danger"; // Dùng gần hết
            } else if (progressWidth >= 50) {
                progressClass = "warning"; // Dùng khá nhiều
            } else {
                progressClass = ""; // Mặc định là success
            }
        } else {
            progressClass = ""; // Không giới hạn, vẫn xanh
        }
    } else {
        progressClass = "inactive"; // Tạm dừng hoặc hết hạn
    }

    // --- Actions ---
    let actionsHtml;
    // Nếu hết hạn hoặc không chỉnh sửa được, chỉ hiển thị thông báo
    if (isExpiredFlag || !canEdit) {
        if (!canEdit) {
             actionsHtml = `<div class="small text-muted" style="font-size: 11px; white-space: nowrap;"><i class="ph ph-lock-key-open" style="font-size: 12px;"></i> Mã hệ thống (chỉ xem)</div>`;
        } else if (isExpiredFlag) {
             actionsHtml = `<div class="small text-muted" style="font-size: 11px; white-space: nowrap;"><i class="ph ph-warning-circle" style="font-size: 12px;"></i> Đã hết hạn (Chỉ xoá)</div>
             <button class="btn-icon btn-del" title="Xoá mã" data-action="delete" data-id="${id}"><i class="ph ph-trash"></i></button>`;
        }
    } else {
        // Có thể chỉnh sửa
        const toggleIcon = isActive ? '<i class="ph ph-pause-circle"></i>' : '<i class="ph ph-play-circle"></i>';
        const toggleText = isActive ? 'Tạm dừng' : 'Kích hoạt';
        const toggleClass = isActive ? '' : 'inactive';
        
        actionsHtml = `
            <button class="btn-icon btn-edit" title="Sửa mã" data-action="edit" data-id="${id}"><i class="ph ph-pencil-simple"></i></button>
            <button class="btn-icon btn-toggle ${toggleClass}" title="${toggleText}" data-action="toggle" data-id="${id}">${toggleIcon}</button>
            <button class="btn-icon btn-del" title="Xoá mã" data-action="delete" data-id="${id}"><i class="ph ph-trash"></i></button>
        `;
    }


    return `
        <div class="voucher-card" data-id="${id}" style="${!isActive ? 'opacity: 0.7;' : ''}">
            <div class="vc-header ${headerClass}">
                <div class="vc-top-row">
                    <span class="vc-type-badge ${typeBadgeClass}">${typeBadge}</span>
                    <span class="vc-type-badge bg-tag-amount">${unitBadgeText}</span>
                </div>
                <div class="vc-value" style="${!isActive ? 'color: var(--inactive);' : ''}">${vcValueText}</div>
                <div class="vc-sub-value">${vcSubValueText}</div>
            </div>
            <div class="vc-body">
                <div class="vc-code-row">
                    <span class="vc-code" title="${code}">${code}</span>
                    <button class="btn-copy" title="Copy mã" onclick="copyVoucherCode('${code}')"><i class="ph ph-copy"></i></button>
                </div>
                <div class="vc-info-line">
                    <i class="ph ph-calendar-blank"></i>
                    <span>${timeText}</span>
                </div>
                ${noteInline ? `
                <div class="vc-info-line">
                    <i class="ph ph-note-pencil"></i>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${noteEscaped}">
                        ${noteInline}
                    </span>
                </div>` : ''}
                
                <div class="vc-progress">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${progressClass}" style="width: ${progressWidth}%;"></div>
                    </div>
                    <div class="progress-text">
                        <span>${progressTextUsed}</span>
                        <span>${progressTextLimit}</span>
                    </div>
                    <div class="progress-text" style="margin-top: 2px;">
                        <span>Giới hạn / người: ${limitPerUser > 0 ? limitPerUser : 'Không giới hạn'}</span>
                        ${scope === 'shop' ? `<span style="color: var(--secondary);">Shop: ${shopName}</span>` : `<span style="color: var(--primary);">Toàn sàn</span>`}
                    </div>
                </div>
            </div>
            <div class="vc-footer">
                <div class="status-group">
                    <span class="status-dot ${statusDotClass}"></span>
                    <span class="status-text" style="color: ${isActive ? 'var(--success)' : (isExpiredFlag ? 'var(--danger)' : 'var(--inactive)')};">${statusText}</span>
                </div>
                <div class="vc-actions">
                    ${actionsHtml}
                </div>
            </div>
        </div>
    `;
}

// Copy Code function
window.copyVoucherCode = function(code) {
    try {
        const tempInput = document.createElement('input');
        tempInput.value = code;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        voucherToast(`Đã sao chép mã: ${code}`, 'success');
    } catch (err) {
        voucherToast(`Không thể sao chép mã. Vui lòng copy thủ công: ${code}`, 'warn');
    }
};

/* =================== Stats + toolbar text =================== */
function updateStats(meta) {
    const totalEl = document.getElementById("stat-total-vouchers");
    const activeEl = document.getElementById("stat-active-vouchers");
    const inactiveEl = document.getElementById("stat-inactive-vouchers");
    if (!meta) return;

    // FIX: Sử dụng các giá trị từ meta data (backend) thay vì tính toán lại,
    // đảm bảo API list.php trả về các trường này chính xác.
    const total = meta.total || 0;
    const active = meta.total_active || 0;
    const inactive = meta.total_inactive || 0; // Bao gồm cả expired

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (inactiveEl) inactiveEl.textContent = inactive; 
}

function updateToolbarResult(meta, renderedCount) {
    const el = document.getElementById("toolbar-result");
    if (!el || !meta) return;

    const total = meta.total || 0;
    const page = meta.page || voucherState.page;
    const perPage = meta.per_page || voucherState.perPage;

    if (total === 0) {
        el.textContent = "Không tìm thấy mã giảm giá phù hợp với bộ lọc hiện tại.";
        return;
    }

    const startIndex = (page - 1) * perPage + 1;
    const endIndex = startIndex + renderedCount - 1;

    let text = `Hiển thị ${startIndex}-${endIndex} / tổng ${total} mã`;
    el.textContent = text;
}

function updatePagination(meta) {
    const pageInfo = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (!pageInfo || !prevBtn || !nextBtn || !meta) return;

    const total = meta.total || 0;
    let page = meta.page || voucherState.page;
    const perPage = meta.per_page || voucherState.perPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    if (page > totalPages) page = totalPages;
    voucherState.page = page;

    pageInfo.textContent = `Trang ${page} / ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
}


/* =================== Hành động trên Card (Edit, Toggle, Delete) =================== */
function bindCardActions() {
    const grid = document.getElementById("voucher-rows");
    if (!grid) return;

    grid.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        // Nếu là nút khóa (chỉ xem) thì bỏ qua
        if (btn.style.cursor === 'not-allowed') return;

        const id = parseInt(btn.dataset.id, 10);
        const action = btn.dataset.action;

        if (!id || !action) return;
        
        // Ngăn sự kiện click lan truyền lên card
        e.stopPropagation();

        if (action === "edit") {
            const v = voucherCache[id];
            openVoucherForm("edit", v);
        } else if (action === "toggle") {
            toggleVoucherStatus(id);
        } else if (action === "delete") {
            deleteVoucher(id);
        }
    });
}

async function toggleVoucherStatus(id) {
    const currentVoucher = voucherCache[id];
    if (!currentVoucher) return;
    
    const newStatus = currentVoucher.Status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'kích hoạt' : 'tạm dừng';

    // Cần phải có xác nhận
    if (!confirm(`Bạn chắc chắn muốn ${actionText} mã giảm giá ${currentVoucher.Code} này?`)) {
        return;
    }
    
    const payload = { 
        VoucherID: id, 
        Status: newStatus // Gửi status rõ ràng
    };

    try {
        const res = await fetch(`${VOUCHER_API_BASE}/toggle_status.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
            voucherToast(data.error || "Không cập nhật được trạng thái.", "error");
            return;
        }
        voucherToast(`Đã ${actionText} mã giảm giá ${currentVoucher.Code}.`, "success");
        loadVouchers();
    } catch (err) {
        console.error(err);
        voucherToast("Lỗi kết nối máy chủ.", "error");
    }
}

async function deleteVoucher(id) {
    const currentVoucher = voucherCache[id];
    if (!currentVoucher) return;

    if (!confirm(`Bạn chắc chắn muốn XOÁ mã giảm giá ${currentVoucher.Code} này? Hành động này không thể hoàn tác.`)) return;

    try {
        const res = await fetch(`${VOUCHER_API_BASE}/delete.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ VoucherID: id })
        });
        const data = await res.json();
        if (!data.success) {
            voucherToast(data.error || "Không xoá được voucher.", "error");
            return;
        }
        voucherToast(`Đã xoá mã giảm giá ${currentVoucher.Code}.`, "success");
        // Xoá khỏi cache và reload
        delete voucherCache[id];
        loadVouchers();
    } catch (err) {
        console.error(err);
        voucherToast("Lỗi kết nối máy chủ.", "error");
    }
}


/* =================== Modal + form =================== */

function bindFormModal() {
    const modal = document.getElementById("voucher-form-modal");
    const form = document.getElementById("voucher-form");
    const typeSelect = document.getElementById("voucher-discount-type");

    if (!modal || !form || !typeSelect) return;

    form.addEventListener("submit", onVoucherFormSubmit);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeVoucherForm();
        }
    });

    typeSelect.addEventListener("change", () => {
        const unit = document.getElementById("suffix-unit");
        const groupMax = document.getElementById("group-max-discount");
        if (typeSelect.value === "percent") {
            if (unit) unit.textContent = "%";
            if (groupMax) groupMax.style.display = "block";
        } else {
            if (unit) unit.textContent = "đ";
            if (groupMax) groupMax.style.display = "none";
        }
    });
}

// dùng trong onload để set mặc định thời gian form tạo
function autoInitFormDefaults() {
    const startInput = document.getElementById("voucher-start");
    const endInput = document.getElementById("voucher-end");
    
    // Set mặc định ngày giờ hiện tại
    const now = new Date();
    // Bắt đầu từ 5 phút sau
    const startDefault = new Date(now.getTime() + 5 * 60000); 
    // Kết thúc sau 7 ngày
    const endDefault = new Date(now.getTime() + 7 * 86400000); 

    if (startInput) {
        startInput.value = toInputDateTime(startDefault);
    }
    if (endInput) {
        endInput.value = toInputDateTime(endDefault);
    }
}

/* ====== Các hàm global để HTML gọi ====== */
window.openVoucherForm = function (mode, voucherObj) {
    const modal = document.getElementById("voucher-form-modal");
    const titleEl = document.getElementById("voucher-form-title");
    const form = document.getElementById("voucher-form");
    const typeSelect = document.getElementById("voucher-discount-type");

    if (!modal || !form || !titleEl || !typeSelect) return;

    form.reset();
    currentMode = mode === "edit" ? "edit" : "create";

    const idInput = document.getElementById("voucher-id");
    if (idInput) idInput.value = "";
    
    form.dataset.originalStatus = "active";
    document.getElementById("voucher-code").disabled = false; // Luôn bật cho tạo/sửa

    if (currentMode === "create") {
        titleEl.textContent = "Tạo mã giảm giá mới";
        autoInitFormDefaults();
        document.getElementById("voucher-status").value = "active";
        typeSelect.value = "percent";
        document.getElementById("suffix-unit").textContent = "%";
        document.getElementById("group-max-discount").style.display = "block";
        document.getElementById("voucher-min-order").value = "0";

    } else if (voucherObj && typeof voucherObj === "object") {
        titleEl.textContent = "Sửa mã giảm giá";
        fillFormWithVoucher(voucherObj);
        // Không cho phép sửa Code khi sửa (thường là logic chuẩn)
        document.getElementById("voucher-code").disabled = true;
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
};

window.closeVoucherForm = function () {
    const modal = document.getElementById("voucher-form-modal");
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
};

function fillFormWithVoucher(v) {
    const form = document.getElementById("voucher-form");
    if (!form) return;

    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value != null ? String(value) : "";
    };

    setVal("voucher-id", v.VoucherID);
    setVal("voucher-code", v.Code || "");
    setVal("voucher-discount-type", v.DiscountType || "percent");
    setVal("voucher-discount-value", v.DiscountValue || "");
    setVal(
        "voucher-max-discount",
        v.MaxDiscountAmount != null ? v.MaxDiscountAmount : ""
    );
    setVal(
        "voucher-min-order",
        v.MinOrderAmount != null ? v.MinOrderAmount : "0"
    );
    setVal("voucher-start", toInputDateTime(v.StartDate));
    setVal("voucher-end", toInputDateTime(v.EndDate));
    setVal(
        "voucher-usage-total",
        v.UsageLimitTotal != null ? v.UsageLimitTotal : ""
    );
    setVal(
        "voucher-usage-user",
        v.UsageLimitPerUser != null ? v.UsageLimitPerUser : ""
    );

    setVal("voucher-note", extractUserNote(v.Note) || "");

    const statusSelect = document.getElementById("voucher-status");
    if (statusSelect) {
        statusSelect.value = v.Status || "active";
    }

    form.dataset.originalStatus = v.Status || "active";

    const typeSelect = document.getElementById("voucher-discount-type");
    const unit = document.getElementById("suffix-unit");
    const groupMax = document.getElementById("group-max-discount");
    if (typeSelect && unit && groupMax) {
        if ((v.DiscountType || "").toLowerCase() === "fixed") {
            typeSelect.value = "fixed";
            unit.textContent = "đ";
            groupMax.style.display = "none";
        } else {
            typeSelect.value = "percent";
            unit.textContent = "%";
            groupMax.style.display = "block";
        }
    }

    const scopeEl = document.getElementById("voucher-scope");
    if (scopeEl && currentRole === "Admin") {
        scopeEl.value = v.Scope || "system";
    }
    // Nếu là shop, input hidden đã tự set là "shop"
}

/* =================== Submit form create / edit =================== */
async function onVoucherFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById("voucher-form-submit");

    const payload = buildPayloadFromForm(form);
    if (!payload) return;

    const isEdit = currentMode === "edit" && payload.VoucherID > 0;
    const url = isEdit
        ? `${VOUCHER_API_BASE}/update.php`
        : `${VOUCHER_API_BASE}/create.php`;

    const newStatusEl = document.getElementById("voucher-status");
    const newStatus = newStatusEl ? newStatusEl.value : "active";
    const originalStatus = form.dataset.originalStatus || "active";
    
    // Tách Status ra khỏi payload gửi lên
    const finalPayload = { ...payload };
    delete finalPayload.Status;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.querySelector('span').textContent = isEdit ? "Đang cập nhật..." : "Đang tạo...";
        }

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(finalPayload)
        });
        const data = await res.json();

        if (!data.success) {
            voucherToast(data.error || "Lưu voucher thất bại.", "error");
            return;
        }

        const voucherId = payload.VoucherID || data.voucher_id;
        
        // Logic cập nhật Status sau khi tạo/sửa thành công
        if (voucherId) {
             // Chỉ gọi toggle status nếu trạng thái CŨ khác trạng thái MỚI
            const statusChanged = isEdit && newStatus !== originalStatus;
            
            // Nếu là tạo mới và cần inactive (trạng thái mặc định là active trong DB sau khi tạo)
            const createdAndInactive = !isEdit && newStatus === 'inactive';

            if (statusChanged || createdAndInactive) {
                await toggleVoucherStatusAPI(voucherId, newStatus);
            }
        }
        
        voucherToast(
            data.message ||
            (isEdit ? "Cập nhật voucher thành công." : "Tạo voucher thành công."),
            "success"
        );
        closeVoucherForm();
        loadVouchers();
    } catch (err) {
        console.error(err);
        voucherToast("Lỗi kết nối máy chủ.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtn.dataset.originalText) {
                submitBtn.querySelector('span').textContent = submitBtn.dataset.originalText;
                delete submitBtn.dataset.originalText;
            }
        }
    }
}

/**
 * Hàm hỗ trợ gọi API toggle_status không cần xác nhận
 */
async function toggleVoucherStatusAPI(id, desiredStatus) {
    const payload = { VoucherID: id, Status: desiredStatus };
    try {
        const res = await fetch(`${VOUCHER_API_BASE}/toggle_status.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
            console.error("API Toggle Status Failed:", data.error);
        }
    } catch (err) {
        console.error("Lỗi kết nối API Toggle Status:", err);
    }
}


function buildPayloadFromForm(form) {
    const get = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    const voucherId = parseInt(get("voucher-id"), 10) || 0;
    const code = get("voucher-code").trim().toUpperCase();
    const discType = get("voucher-discount-type") || "percent";
    const discValueStr = get("voucher-discount-value").trim();
    const maxDiscStr = get("voucher-max-discount").trim();
    const minOrderStr = get("voucher-min-order").trim();
    const start = normalizeDateTimeInput(get("voucher-start"));
    const end = normalizeDateTimeInput(get("voucher-end"));
    const limitTotalStr = get("voucher-usage-total").trim();
    const limitUserStr = get("voucher-usage-user").trim();
    const note = get("voucher-note").trim();
    const status = get("voucher-status") || "active"; // Giữ lại để xử lý logic sau

    let scope = "shop";
    const scopeEl = document.getElementById("voucher-scope");
    if (scopeEl) {
        scope = scopeEl.value || "shop";
    }

    if (!code) {
        voucherToast("Mã voucher không được để trống.", "error");
        return null;
    }

    const discValue = parseFloat(discValueStr);
    if (!discValueStr || isNaN(discValue) || discValue <= 0) {
        voucherToast("Giá trị giảm phải lớn hơn 0.", "error");
        return null;
    }

    if (discType === "percent" && discValue > 100) {
        voucherToast("Giảm theo % không được lớn hơn 100%.", "error");
        return null;
    }
    
    if (discType === "percent" && discValueStr.includes(".")) {
        // Chỉ chấp nhận số nguyên cho % để tránh lỗi làm tròn nếu backend không xử lý float tốt
        if (Math.floor(discValue) !== discValue) {
             voucherToast("Giảm theo % chỉ nên nhập số nguyên.", "error");
             // Có thể bỏ qua check này nếu backend chấp nhận float
             // return null; 
        }
    }


    if (!start || !end) {
        voucherToast("Vui lòng chọn thời gian hiệu lực.", "error");
        return null;
    }

    const startDateObj = new Date(start.replace(" ", "T"));
    const endDateObj = new Date(end.replace(" ", "T"));
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        voucherToast("Thời gian hiệu lực không hợp lệ.", "error");
        return null;
    }
    if (startDateObj >= endDateObj) {
        voucherToast("Thời gian kết thúc phải sau thời gian bắt đầu.", "error");
        return null;
    }

    const payload = {
        Code: code,
        Name: code, // Dùng code làm Name mặc định
        Description: note, // Dùng note làm Description
        DiscountType: discType,
        DiscountValue: discValue,
        MaxDiscountAmount: maxDiscStr === "" ? null : parseFloat(maxDiscStr) || 0,
        MinOrderAmount: minOrderStr === "" ? 0 : parseFloat(minOrderStr) || 0,
        StartDate: start,
        EndDate: end,
        UsageLimitTotal: limitTotalStr === "" ? null : parseInt(limitTotalStr, 10) || null,
        UsageLimitPerUser: limitUserStr === "" ? 1 : parseInt(limitUserStr, 10) || 1, // Mặc định 1 nếu không nhập
        Note: note,
        Status: status // Tạm thời để ở đây để logic submit sử dụng
    };

    if (currentRole === "Shop") {
        payload.Scope = "shop";
        // ShopID được truyền ẩn hoặc backend tự lấy từ session
    } else {
        payload.Scope = scope || "system";
        // Nếu Admin chọn Shop, vẫn là shopID của Admin (ShopID thực tế lấy từ session của Admin nếu là shop đó)
    }

    if (voucherId > 0) {
        payload.VoucherID = voucherId;
    }
    
    return payload;
}