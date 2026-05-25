/* ══════════════════════════════════════════════════════════════════════════════
   PROJECT: KOI CARE SYSTEM - INTELLIGENCE HUB
   MODULE: WATER PARAMETERS (EXPERT EDITION)
   VERSION: 6.7 (UI FIX: ALIGN CHART TITLE WITH HISTORY TITLE)
   ══════════════════════════════════════════════════════════════════════════════ */

// --- GLOBAL VARIABLES ---
let selectedPond = localStorage.getItem("selectedPond") || null;
let waterChartInstance = null;
let currentChartParam = 'pH';
let currentContextData = null;

// EXPERT THRESHOLDS FOR KOI PONDS
// Updated based on Kodama Koi Farm & IFAS standards
const bands = {
    pH:          { ideal:[7.0, 8.0],  safe:[6.5, 8.5],  label: "pH",       unit:"",     color: "#0ea5e9", icon: "science",      min: 0, max: 14 },
    Temperature: { ideal:[20, 28],    safe:[10, 32],    label: "Nhiệt độ", unit:"°C",   color: "#f97316", icon: "thermostat",   min: 0, max: 45 },
    Ammonia:     { ideal:[0, 0],      safe:[0, 0.02],   label: "NH3",      unit:"mg/L", color: "#ef4444", icon: "warning",      min: 0, max: 5  },
    Nitrite:     { ideal:[0, 0],      safe:[0, 0.05],   label: "NO2",      unit:"mg/L", color: "#d946ef", icon: "coronavirus",  min: 0, max: 5  },
    Nitrate:     { ideal:[0, 20],     safe:[0, 50],     label: "NO3",      unit:"mg/L", color: "#8b5cf6", icon: "grain",        min: 0, max: 200 },
    Oxygen:      { ideal:[7, 10],     safe:[5, 20],     label: "Oxy",      unit:"mg/L", color: "#06b6d4", icon: "air",          min: 0, max: 20 },
    Salt:        { ideal:[0, 0.1],    safe:[0, 0.5],    label: "Muối",     unit:"%",    color: "#64748b", icon: "layers",       min: 0, max: 1  },
    KH:          { ideal:[5, 10],     safe:[4, 15],     label: "KH",       unit:"dKH",  color: "#10b981", icon: "water_drop",   min: 0, max: 50 },
    GH:          { ideal:[8, 12],     safe:[4, 20],     label: "GH",       unit:"dGH",  color: "#14b8a6", icon: "opacity",      min: 0, max: 50 },
    CO2:         { ideal:[0, 10],     safe:[0, 20],     label: "CO2",      unit:"mg/L", color: "#6366f1", icon: "bubble_chart", min: 0, max: 50 }
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    injectAIAssets(); 
    injectToastAssets(); // Inject Toast CSS
    setupModals();

    const storedName = localStorage.getItem("selectedPondName");
    if(storedName) {
        const el = document.getElementById("current-pond-name");
        if(el) el.innerText = storedName;
    }

    if (selectedPond) {
        loadDashboard();
    } else {
        openPondSelectModal();
    }

    const form = document.getElementById("water-form");
    if (form) form.onsubmit = submitWaterForm;
});

// --- CORE: LOAD DATA ---
async function loadDashboard() {
    if (!selectedPond) return;
    const root = document.getElementById("water-dashboard-root");
    if (!root) return;

    root.innerHTML = `<div class="hero-panel" style="height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8;">
                        <div class="spinner"></div>
                        <p style="margin-top:15px; font-weight:500;">Đang đồng bộ dữ liệu...</p>
                      </div>`;

    try {
        const [ctxRes, histRes] = await Promise.all([
            fetch(`/HeThongChamSocCaKoi/backend/api/customer/water_params/get_context.php?pond_id=${selectedPond}`),
            fetch(`/HeThongChamSocCaKoi/backend/api/customer/water_params/list.php?pond_id=${selectedPond}`)
        ]);

        const ctxData = await ctxRes.json();
        const histData = await histRes.json();
        currentContextData = ctxData.context;

        renderDashboardV5(ctxData, histData, root);

        if (histData.length > 0) {
            setTimeout(() => {
                window.cachedHistory = [...histData].reverse();
                initExpertChart(window.cachedHistory);
            }, 100);
        }
    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="glass-panel" style="padding:40px; text-align:center; color:#ef4444;">
                            <span class="material-icons-round" style="font-size:48px;">wifi_off</span>
                            <p>Lỗi kết nối: ${e.message}</p>
                            <button class="btn btn-outline" onclick="location.reload()">Thử lại</button>
                          </div>`;
    }
}

// --- RENDER LAYOUT ---
function renderDashboardV5(ctxData, history, container) {
    const context = ctxData.context || {};
    const { score, statusText, advice, statusColor } = calculateScore(context);

    if(ctxData.pondName) {
        const el = document.getElementById("current-pond-name");
        if(el) el.innerText = ctxData.pondName;
    }

    container.innerHTML = `
    <div class="hero-panel animate-enter">
        <div class="score-section">
            <div class="score-col-ring">
                <div class="score-ring" id="score-ring-graphic" style="background: conic-gradient(#e2e8f0 0%, #e2e8f0 0);">
                    <div class="score-inner">
                        <span class="score-num" id="animated-score" style="color:${statusColor}">0</span>
                        <span class="score-text">Điểm</span>
                    </div>
                </div>
                <button class="btn-ai-glow" onclick="askAI('general')">
                    <span class="material-icons-round" style="font-size:16px">smart_toy</span> Hỏi AI
                </button>
            </div>

            <div class="score-col-center">
                <div class="score-status-badge" style="background:${hexToRgba(statusColor,0.1)}; color:${statusColor}">
                    <span class="material-icons-round" style="font-size:16px">verified</span> ${statusText}
                </div>
                <div class="score-advice">${advice}</div>
            </div>

            <div class="score-col-table">
                <div class="std-title"><span class="material-icons-round" style="color:#f59e0b">lightbulb</span> Chuẩn Thông Số</div>
                <table class="std-table">
                    ${renderStandardsTable()}
                </table>
            </div>
        </div>

        <div class="params-section">
            <div class="params-header">
                <span class="params-title">Thông số hiện tại</span>
                <span class="last-update-tag">Cập nhật: ${formatTimeShort(context.LastUpdate)}</span>
            </div>
            <div class="mini-grid">
                ${renderMiniCards(context)}
            </div>
        </div>
    </div>

    <div class="bottom-layout animate-enter" style="animation-delay:0.1s">
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><span class="material-icons-round" style="color:#64748b">history</span> Nhật ký</div>
            </div>
            <div class="history-container">
                ${history.length ? history.map(r => renderHistoryRow(r)).join('') : '<div style="padding:30px; text-align:center; color:#94a3b8">Chưa có dữ liệu</div>'}
            </div>
        </div>

        <!-- Chart Panel: Updated Structure for Header Alignment -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><span class="material-icons-round" style="color:#64748b">show_chart</span> Xu hướng</div>
            </div>
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; min-height: 450px;">
                 <div class="chart-controls" style="margin-bottom: 10px;">
                    ${Object.keys(bands).map(k => `<button class="chart-tab ${k===currentChartParam?'active':''}" onclick="switchChartParam('${k}')">${bands[k].label}</button>`).join('')}
                </div>
                <div style="flex:1; position:relative; min-height:0;">
                    <canvas id="waterTrendChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    `;

    animateScore(0, score, 1500, statusColor);
}

// --- ANIMATION ---
function animateScore(start, end, duration, color) {
    const numObj = document.getElementById("animated-score");
    const ringObj = document.getElementById("score-ring-graphic");
    if (!numObj || !ringObj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOutQuad = (t) => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        const currentVal = Math.floor(easedProgress * (end - start) + start);
        
        numObj.innerHTML = currentVal;
        ringObj.style.background = `conic-gradient(${color} ${currentVal}%, #e2e8f0 0)`;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            numObj.innerHTML = end;
            ringObj.style.background = `conic-gradient(${color} ${end}%, #e2e8f0 0)`;
        }
    };
    window.requestAnimationFrame(step);
}

// --- RENDER MINI CARDS ---
function renderMiniCards(ctx) {
    return Object.keys(bands).map(key => {
        const b = bands[key];
        let val = ctx[key];
        if (val === undefined) val = ctx[key.toLowerCase()]; 
        
        let statusClass = ''; 
        let displayVal = val !== null && val !== undefined ? val : '--';
        let aiBtn = '';
        
        // Màu vàng cho icon bóng đèn
        const bulbColor = "#f59e0b"; 

        if (val !== null && val !== undefined && val !== '') {
            const num = parseFloat(val);
            displayVal = num;
            if (num < b.safe[0] || num > b.safe[1]) {
                statusClass = 'danger';
                aiBtn = `<button class="ai-card-btn" onclick="askAI('${key}', ${num}); event.stopPropagation();" title="Hỏi AI">
                            <span class="material-icons-round" style="font-size:16px; color:${bulbColor};">lightbulb</span>
                         </button>`;
            } else if (num < b.ideal[0] || num > b.ideal[1]) {
                statusClass = 'warning';
                aiBtn = `<button class="ai-card-btn" onclick="askAI('${key}', ${num}); event.stopPropagation();" title="Hỏi AI">
                            <span class="material-icons-round" style="font-size:16px; color:${bulbColor};">lightbulb</span>
                         </button>`;
            }
        }

        return `
        <div class="mini-card ${statusClass}">
            <div class="mini-head">
                ${b.label} 
                ${statusClass === 'danger' ? '<span class="material-icons-round" style="font-size:14px; color:#ef4444">warning</span>' : ''}
            </div>
            <div class="mini-val">${displayVal}</div>
            <div class="mini-unit">${b.unit}</div>
            ${aiBtn}
        </div>`;
    }).join('');
}

// --- HELPERS: SCORE & STANDARDS ---
function renderStandardsTable() {
    return Object.values(bands).map(b => `
        <tr class="${b.label.includes('NH3') || b.label.includes('NO2') ? 'std-row-danger' : ''}">
            <td>${b.label}</td>
            <td>${b.ideal[0]} - ${b.ideal[1]}</td>
        </tr>
    `).join('');
}

function renderHistoryRow(r) {
    // Xử lý thời gian
    const d = new Date(r.RecordedAt);
    
    // Cấu hình định dạng ngày và giờ
    // Bỏ tham số timeZone để trình duyệt tự động lấy theo giờ máy người dùng
    const vnTime = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false
    }).format(d);

    const vnDate = new Intl.DateTimeFormat('vi-VN', {
        day: 'numeric', 
        month: 'numeric'
    }).format(d);

    // Gán vào biến hiển thị
    const dateStr = vnDate; // Kết quả ví dụ: 6/12
    const timeStr = vnTime; // Kết quả ví dụ: 14:30
    
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    const isLocked = diffHours > 48;

    let tags = [];
    Object.keys(bands).forEach(k => {
        let val = r[k] !== undefined ? r[k] : r[k.toLowerCase()];
        if(val != null && val !== '') {
            if (val < bands[k].safe[0] || val > bands[k].safe[1]) {
                tags.push(`<span class="tag danger">${k}: ${val}</span>`);
            }
        }
    });
    if(tags.length === 0) tags.push(`<span class="tag">Ổn định</span>`);

    let actionBtn = '';
    if (isLocked) {
        actionBtn = `<span class="material-icons-round" style="color:#cbd5e1; font-size:18px; cursor:not-allowed;" title="Đã khóa (Quá 48h)">lock</span>`;
    } else {
        actionBtn = `<button onclick='openWaterForm("edit", ${JSON.stringify(r)})' style="border:none; background:none; color:#cbd5e1; cursor:pointer;" title="Sửa">
                        <span class="material-icons-round">edit</span>
                     </button>`;
    }

    return `
    <div class="history-item">
        <div class="h-time-box">
            <div class="h-date">${dateStr}</div>
            <div class="h-time">${timeStr}</div>
        </div>
        <div class="h-content">
            <div class="h-tags">${tags.join('')}</div>
            ${r.Note ? `<div style="font-size:11px; color:#94a3b8; font-style:italic;">${escapeHtml(r.Note)}</div>` : ''}
        </div>
        ${actionBtn}
    </div>`;
}

function calculateScore(ctx) {
    let score = 100;
    let issues = [];
    
    Object.keys(bands).forEach(k => {
        let val = ctx[k];
        if (val === undefined) val = ctx[k.toLowerCase()];

        if (val !== null && val !== undefined) {
            if (val < bands[k].safe[0] || val > bands[k].safe[1]) {
                score -= 15;
                issues.push(bands[k].label);
            } else if (val < bands[k].ideal[0] || val > bands[k].ideal[1]) {
                score -= 5;
            }
        }
    });

    score = Math.max(0, score);
    
    let statusText = "Môi trường Tốt";
    let statusColor = "#10b981";
    let advice = "Chất lượng nước ổn định. Tiếp tục duy trì.";

    if (score < 60) {
        statusText = "Nguy Hiểm";
        statusColor = "#ef4444";
        advice = `Cảnh báo: ${issues.join(', ')} đang ở mức nguy hiểm. Cần xử lý ngay!`;
    } else if (score < 85) {
        statusText = "Cần Chú Ý";
        statusColor = "#f59e0b";
        advice = `Một số chỉ số chưa tối ưu (${issues.join(', ')}). Cần theo dõi thêm.`;
    }

    return { score, statusText, advice, statusColor };
}

// --- CHARTING ---
function initExpertChart(data) {
    const ctx = document.getElementById('waterTrendChart');
    if (!ctx) return;
    if (waterChartInstance) waterChartInstance.destroy();

    const param = currentChartParam;
    const config = bands[param];
    const validData = data.filter(d => {
        let v = d[param] !== undefined ? d[param] : d[param.toLowerCase()];
        return v !== null && v !== undefined && v !== '';
    });
    
    const chartCtx = ctx.getContext('2d');
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, hexToRgba(config.color, 0.4));
    gradient.addColorStop(1, hexToRgba(config.color, 0.0));

    waterChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: validData.map(d => formatTimeShort(d.RecordedAt)),
            datasets: [{
                label: config.label,
                data: validData.map(d => parseFloat(d[param] !== undefined ? d[param] : d[param.toLowerCase()])),
                borderColor: config.color,
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: 'white',
                pointBorderColor: config.color,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, grid: { display: false }, ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 8, color: '#64748b', font: { size: 11 } } },
                y: { grid: { borderDash: [5,5] } }
            }
        }
    });
}

function switchChartParam(key) {
    currentChartParam = key;
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.chart-tab')).find(b => b.innerText.includes(bands[key].label));
    if(btn) btn.classList.add('active');
    if (window.cachedHistory) initExpertChart(window.cachedHistory);
}

// --- TOAST NOTIFICATION SYSTEM ---
function injectToastAssets() {
    if (document.getElementById('toast-style')) return;
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.innerHTML = `
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
        .toast { pointer-events: auto; min-width: 300px; max-width: 400px; padding: 16px; border-radius: 12px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; align-items: flex-start; gap: 12px; animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); transition: all 0.3s ease; border-left: 4px solid; opacity: 0; transform: translateX(100%); }
        .toast.show { opacity: 1; transform: translateX(0); }
        .toast.success { border-color: #10b981; }
        .toast.error { border-color: #ef4444; }
        .toast.warning { border-color: #f59e0b; }
        .toast-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
        .toast.success .toast-icon { color: #10b981; }
        .toast.error .toast-icon { color: #ef4444; }
        .toast.warning .toast-icon { color: #f59e0b; }
        .toast-content { flex: 1; }
        .toast-title { font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #0f172a; }
        .toast-msg { font-size: 13px; color: #64748b; line-height: 1.4; }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
    
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.className = 'toast-container';
    document.body.appendChild(div);
}

function showToast(type, title, msg) {
    const container = document.getElementById('toast-container');
    if(!container) { injectToastAssets(); return; }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check_circle';
    if(type === 'error') icon = 'error';
    if(type === 'warning') icon = 'warning_amber';
    
    toast.innerHTML = `
        <span class="material-icons-round toast-icon">${icon}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Trigger animate in
    requestAnimationFrame(() => { toast.classList.add('show'); });

    // Auto dismiss
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- FORM HANDLING (WITH VALIDATION) ---
function openWaterForm(mode, rec = {}) {
    const m = document.getElementById("water-form-modal");
    m.style.display = "flex";
    const f = document.getElementById("water-form");
    f.reset(); 
    f.dataset.mode = mode;
    document.getElementById("water-form-title").innerText = mode === 'add' ? "Ghi Nhật Ký Mới" : "Sửa Dữ Liệu";

    if (mode === 'add') {
        // AUTO-FILL Logic
        if (currentContextData) {
            Object.keys(bands).forEach(k => {
                let formKey = k === 'KH' ? 'CH' : k;
                let val = currentContextData[k] !== undefined ? currentContextData[k] : currentContextData[k.toLowerCase()];
                if (val !== null && val !== undefined) {
                    if(f.elements[formKey]) f.elements[formKey].value = val;
                }
            });
        }
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        f.elements['RecordedAt'].value = now.toISOString().slice(0,16);
    } else {
        // Edit
        Object.keys(rec).forEach(k => { if(f.elements[k]) f.elements[k].value = rec[k]; });
        if(rec.KH && f.elements['CH']) f.elements['CH'].value = rec.KH;
        if(rec.RecordedAt) f.elements['RecordedAt'].value = rec.RecordedAt.replace(" ", "T");
        f.elements['ParameterID'].value = rec.ParameterID;
    }
}

function closeWaterForm() { document.getElementById("water-form-modal").style.display = "none"; }

async function submitWaterForm(e) {
    e.preventDefault();
    if (!selectedPond) { showToast('error', 'Lỗi', 'Vui lòng chọn hồ trước!'); return; }

    const form = e.target;
    const mode = form.dataset.mode;
    const fd = new FormData(form);
    
    // INPUT VALIDATION & GARBAGE DATA CHECK
    let hasError = false;
    for(let [key, config] of Object.entries(bands)) {
        let formKey = key === 'KH' ? 'CH' : key; 
        let val = fd.get(formKey);
        if(val !== '' && val !== null) {
            let num = parseFloat(val);
            
            // Check Valid Number
            if(isNaN(num)) {
                showToast('error', 'Dữ liệu sai', `${config.label} không phải là số hợp lệ.`);
                hasError = true;
                break; // Stop at first error to avoid spamming toasts
            }
            
            // Check Range (Garbage Data)
            if(num < config.min || num > config.max) {
                showToast('error', 'Dữ liệu bất thường', `${config.label} (${num}) nằm ngoài khoảng cho phép (${config.min}-${config.max}).`);
                hasError = true;
                break;
            }
        }
    }
    if(hasError) return; // Stop submission

    const btn = form.querySelector('button[type="submit"]');
    const oldText = btn.innerText;
    btn.innerText = "Đang lưu..."; btn.disabled = true;

    fd.append("PondID", selectedPond);
    const url = mode === 'edit' 
        ? "/HeThongChamSocCaKoi/backend/api/customer/water_params/edit.php" 
        : "/HeThongChamSocCaKoi/backend/api/customer/water_params/add.php";

    try {
        const res = await fetch(url, { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Thành công', 'Dữ liệu đã được lưu.');
            closeWaterForm();
            loadDashboard();
        } else {
            showToast('error', 'Thất bại', data.error || "Có lỗi xảy ra");
        }
    } catch(err) {
        showToast('error', 'Lỗi mạng', err.message);
    } finally {
        btn.innerText = oldText; btn.disabled = false;
    }
}

// --- MODAL UTILS ---
function openPondSelectModal() {
    const modal = document.getElementById("pond-select-modal");
    const list = document.getElementById("pond-card-list");
    if (!modal || !list) return;
    
    modal.style.display = "flex";
    list.innerHTML = "<div class='spinner'></div>";

    fetch("/HeThongChamSocCaKoi/backend/api/customer/ponds/list.php")
        .then(res => res.json())
        .then(ponds => {
            let html = "";
            if (ponds.length > 0) {
                html += ponds.map(p => {
                    const isSelected = (p.PondID == selectedPond) ? 'selected' : '';
                    const img = p.ImageURL || '/HeThongChamSocCaKoi/assets/img/no-pond.jpg';
                    return `
                    <div class="pond-selection-card ${isSelected}" onclick="selectPond(${p.PondID}, '${escapeHtml(p.PondName)}')">
                        <div class="pond-img-wrapper">
                            <img src="${img}" class="pond-img" onerror="this.src='https://placehold.co/400x250?text=No+Image'">
                        </div>
                        <div class="pond-info">
                            <h4 class="pond-name">${escapeHtml(p.PondName)}</h4>
                            <div class="pond-vol">Thể tích: ${p.Volume || 0} m³</div>
                        </div>
                    </div>`;
                }).join("");
            } else { html += "<p style='grid-column:1/-1; text-align:center'>Chưa có hồ nào.</p>"; }
            
            html += `
            <div class="pond-add-card" onclick="window.location.href='/HeThongChamSocCaKoi/frontend/customer/ponds.php'">
                <span class="material-icons-round pond-add-icon">add_circle_outline</span>
                <span class="pond-add-text">Thêm Hồ Mới</span>
            </div>`;
            list.innerHTML = html;
        })
        .catch(e => list.innerHTML = `<p style='color:red'>Lỗi: ${e.message}</p>`);
}

function selectPond(id, name) {
    selectedPond = id;
    localStorage.setItem("selectedPond", id);
    if(name) {
        localStorage.setItem("selectedPondName", name);
        const el = document.getElementById("current-pond-name");
        if(el) el.innerText = name;
    }
    document.getElementById("pond-select-modal").style.display = "none";
    loadDashboard();
}

function setupModals() { document.getElementById("pond-modal-close").onclick = () => document.getElementById("pond-select-modal").style.display = "none"; }

// --- AI LOGIC ---
function injectAIAssets() {
    if(document.getElementById('ai-overlay-style')) return;
    const style = document.createElement('style');
    style.id = 'ai-overlay-style';
    style.innerHTML = `.ai-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.7);backdrop-filter:blur(5px);z-index:9999;display:none;align-items:center;justify-content:center;animation:fadeIn 0.3s}.ai-card{background:white;width:90%;max-width:600px;border-radius:20px;overflow:hidden;animation:slideUp 0.3s;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}.ai-header{background:linear-gradient(135deg,#0f172a,#334155);color:white;padding:20px;display:flex;justify-content:space-between;align-items:center}.ai-body{padding:25px;line-height:1.6;color:#334155;max-height:60vh;overflow-y:auto;font-size:15px}.typing span{display:inline-block;width:6px;height:6px;background:#3b82f6;border-radius:50%;margin:0 2px;animation:bounce 1.4s infinite}.typing span:nth-child(2){animation-delay:0.2s}.typing span:nth-child(3){animation-delay:0.4s}@keyframes bounce{0%,100%{transform:scale(0)}50%{transform:scale(1)}}`;
    document.head.appendChild(style);
    const div = document.createElement('div');
    div.id = 'ai-response-modal';
    div.className = 'ai-backdrop';
    div.innerHTML = `<div class="ai-card"><div class="ai-header"><div style="display:flex;align-items:center;gap:12px"><div style="background:#3b82f6;padding:8px;border-radius:8px"><span class="material-icons-round" style="color:white;font-size:24px">smart_toy</span></div><div><strong>AI Expert</strong><br><small style="opacity:0.8">KoiCare Assistant</small></div></div><button onclick="closeAIModal()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer">&times;</button></div><div id="ai-response-content" class="ai-body"></div></div>`;
    document.body.appendChild(div);
}
function closeAIModal() { document.getElementById('ai-response-modal').style.display = 'none'; }
window.askAI = async function(k,v) { 
    injectAIAssets(); document.getElementById('ai-response-modal').style.display = 'flex';
    document.getElementById('ai-response-content').innerHTML = `<div style="text-align:center;padding:30px"><div class="typing"><span></span><span></span><span></span></div><p>Đang phân tích...</p></div>`;
    let p = k==='general' ? `Tổng quan hồ: ${JSON.stringify(currentContextData)}` : `Chỉ số ${k} = ${v}`;
    try {
        const r = await fetch('/HeThongChamSocCaKoi/backend/api/ai/gemini.php',{method:'POST',body:JSON.stringify({prompt:p}),headers:{'Content-Type':'application/json'}});
        const d = await r.json();
        document.getElementById('ai-response-content').innerHTML = d.candidates?.[0]?.content?.parts?.[0]?.text.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\* /g,'<br>• ') || "Lỗi AI";
    } catch(e) { document.getElementById('ai-response-content').innerHTML = "Lỗi kết nối"; }
};

// Helpers
function formatTimeShort(s) { if(!s) return ""; const d=new Date(s); return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; }
function hexToRgba(hex, a) { const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; }
function escapeHtml(t) { if(!t)return""; return t.replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
function renderEmptyState() { document.getElementById("water-dashboard-root").innerHTML = `<div style="text-align:center; padding:60px; color:#94a3b8"><span class="material-icons-round" style="font-size:48px">water_drop</span><p>Chọn hồ để xem</p></div>`; }

// Export
window.selectPond = selectPond;
window.openWaterForm = openWaterForm;
window.closeWaterForm = closeWaterForm;
window.submitWaterForm = submitWaterForm;
window.closeAIModal = closeAIModal;
window.switchChartParam = switchChartParam;
window.openPondSelectModal = openPondSelectModal;
window.askAI = window.askAI;