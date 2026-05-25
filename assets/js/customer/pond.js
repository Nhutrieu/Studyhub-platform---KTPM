/* =========================================================
   Pond Management - Realtime Data & Schedule Connected
   - Connected: get_plan.php for Feeding Schedule
   - Connected: get_context.php for Expert Water Analysis
   - UI: Synchronized Cards & Smart Status
========================================================= */

let pondData = [];
let sortOrder = 'desc';

document.addEventListener('DOMContentLoaded', function() {
  loadPondCards();

  // Xử lý xem trước ảnh khi chọn file
  const imgInput = document.querySelector('input[name="ImageFile"]');
  if (imgInput) {
    imgInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const preview = document.getElementById('pond-preview');
      
      if (file) {
        // [CẬP NHẬT] Kiểm tra dung lượng ảnh (Giới hạn 15MB)
        const maxSizeMB = 15; 
        if (file.size > maxSizeMB * 1024 * 1024) {
            pushToast(`Ảnh quá lớn! Vui lòng chọn ảnh dưới ${maxSizeMB}MB.`, "error");
            e.target.value = ''; // Reset input
            preview.style.display = 'none';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(ev) {
          preview.src = ev.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
          preview.style.display = 'none';
      }
    });
  }

  // Xử lý Submit Form
  document.getElementById('pond-form').onsubmit = function(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const btnSubmit = document.getElementById('btn-save-pond');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="material-icons spin" style="font-size:16px">sync</span> Đang lưu...';
    btnSubmit.disabled = true;

    const formData = new FormData(form);
    let url = '/HeThongChamSocCaKoi/backend/api/customer/ponds/add.php';
    if (form.mode === 'edit') url = '/HeThongChamSocCaKoi/backend/api/customer/ponds/edit.php';

    fetch(url, { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeModal('pond-form-modal');
          pushToast("Đã lưu thông tin hồ cá thành công!", "success");
          loadPondCards();
        } else {
          pushToast(data.error || 'Có lỗi xảy ra!', "error");
        }
      })
      .catch(err => pushToast('Lỗi kết nối: ' + err.message, "error"))
      .finally(() => {
          btnSubmit.innerHTML = originalText;
          btnSubmit.disabled = false;
      });
  };
});

// --- CORE FUNCTIONS ---

function loadPondCards() {
  fetch('/HeThongChamSocCaKoi/backend/api/customer/ponds/list.php')
    .then(res => res.json())
    .then(data => {
      pondData = Array.isArray(data) ? data : (data.items || []);
      renderPondCards();
    })
    .catch(err => {
      document.getElementById('ponds-table').innerHTML = 
        `<div style="text-align:center; padding:60px; color:#ef4444;">
            <span class="material-icons" style="font-size:48px; margin-bottom:10px;">wifi_off</span>
            <p style="font-weight:600">Không thể tải dữ liệu: ${err.message}</p>
         </div>`;
    });
}

function renderPondCards() {
    let html = `
    <header class="page-header">
        <div class="header-left">
            <span class="material-icons header-icon">water</span>
            <div>
                <h1><span>Hồ cá của tôi</span></h1>
                <p class="header-desc">Giám sát chất lượng nước, theo dõi sức khỏe và tối ưu hóa lịch cho ăn.</p>
            </div>
        </div>
        
        <div class="toolbar-group">
            <div style="position:relative">
                <button class="btn btn-outline" onclick="toggleSortDropdown()">
                    <span class="material-icons" style="font-size:20px; margin-right:6px;">sort</span> Sắp xếp
                </button>
                <ul id="sort-options" class="sort-dropdown">
                    <li onclick="sortPonds('CreatedAt')">Ngày tạo</li>
                    <li onclick="sortPonds('FishCount')">Số lượng cá</li>
                    <li onclick="sortPonds('Volume')">Thể tích</li>
                </ul>
            </div>
            <button class="btn btn-primary" onclick="openPondForm('add')">
                <span class="material-icons" style="font-size:20px; margin-right:6px;">add_circle</span> Thêm mới
            </button>
        </div>
    </header>

    <div class="pond-grid">`;

  pondData.forEach(pond => {
    // --- Data Cleaning ---
    const fishCount = pond.FishCount || 0;
    const volume = (pond.Volume && parseFloat(pond.Volume) > 0) ? `${parseFloat(pond.Volume)} m³` : '-';
    const depth = (pond.Depth && parseFloat(pond.Depth) > 0) ? `${parseFloat(pond.Depth)} m` : '-';
    const pump = (pond.PumpingCapacity && parseFloat(pond.PumpingCapacity) > 0) ? `${parseFloat(pond.PumpingCapacity)} l/h` : '-';
    const drain = (pond.DrainCount != null && pond.DrainCount > 0) ? pond.DrainCount : '-';
    const skimmer = (pond.SkimmerCount != null && pond.SkimmerCount > 0) ? pond.SkimmerCount : '-';
    
    let createdStr = '-';
    if(pond.CreatedAt) {
        const d = new Date(pond.CreatedAt);
        if(!isNaN(d.getTime())) createdStr = d.toLocaleDateString('vi-VN');
    }

    const imageSrc = pond.ImageURL || '/HeThongChamSocCaKoi/assets/img/no-pond.jpg';
    const fallbackScript = "this.onerror=null; this.src='/HeThongChamSocCaKoi/assets/img/no-pond.jpg'; this.classList.add('error-placeholder');";

    html += `
      <article class="pond-card" id="card-${pond.PondID}">
        <div class="card-image-wrapper">
            <img src="${imageSrc}" onerror="${fallbackScript}" alt="${pond.PondName}" class="card-img">
            
            <div class="glass-panel panel-stats">
                <span class="pond-name">${pond.PondName}</span>
                <div class="pond-temp" id="temp-${pond.PondID}">--°C</div>
                <div class="tag-row">
                    <span class="tag" id="ph-${pond.PondID}">pH --</span>
                    <span class="tag" id="nh3-${pond.PondID}">NH3: --</span>
                </div>
            </div>

            <!-- Panel Lịch Ăn: ID để JS điền dữ liệu vào -->
            <div class="glass-panel panel-schedule" id="schedule-panel-${pond.PondID}">
                <div class="schedule-title">Lịch ăn</div>
                <ul class="schedule-list" id="schedule-list-${pond.PondID}">
                    <li><span class="material-icons spin" style="font-size:10px">sync</span> Đang tải...</li>
                </ul>
            </div>

            <div class="card-actions">
                <button class="btn-icon edit" onclick='openPondForm("edit", ${JSON.stringify(pond)})' title="Sửa">
                    <span class="material-icons" style="font-size:18px">edit</span>
                </button>
                <button class="btn-icon delete" onclick="confirmDeletePond(${pond.PondID})" title="Xóa">
                    <span class="material-icons" style="font-size:18px">delete</span>
                </button>
            </div>
        </div>

        <div class="card-body">
            <div class="info-row">
                <div class="info-item">
                    <span class="info-val">${volume}</span>
                    <span class="info-label">Thể tích</span>
                </div>
                <div class="info-item">
                    <span class="info-val">${fishCount}</span>
                    <span class="info-label">Số cá</span>
                </div>
                <div class="info-item">
                    <span class="info-val" id="status-${pond.PondID}" style="color:var(--muted); font-size:13px">--</span>
                    <span class="info-label">Trạng thái</span>
                </div>
            </div>

            <button class="btn-expand" id="toggle-btn-${pond.PondID}" onclick="toggleDetails(${pond.PondID})">
                Chi tiết <span class="material-icons" style="font-size:16px">expand_more</span>
            </button>

            <div class="pond-details-panel" id="pond-details-${pond.PondID}">
                <div class="details-grid">
                    <div class="detail-item"><label>Độ sâu</label> <span>${depth}</span></div>
                    <div class="detail-item"><label>Bơm</label> <span>${pump}</span></div>
                    <div class="detail-item"><label>Hệ lọc</label> <span>${drain} Drain - ${skimmer} Skimmer</span></div>
                    <div class="detail-item"><label>Ngày tạo</label> <span>${createdStr}</span></div>
                    <div class="detail-item" style="grid-column:1/-1">
                        <label>Ghi chú</label> 
                        <p>${pond.Notes || 'Không có ghi chú'}</p>
                    </div>
                </div>
                <div class="details-footer">
                    <a href="/HeThongChamSocCaKoi/frontend/customer/kois.php?pond_id=${pond.PondID}" class="btn-view-fish">
                        <span class="material-icons">🐟</span> Quản lý cá trong hồ
                    </a>
                </div>
            </div>
        </div>
      </article>
    `;
  });

  html += `
      <div class="pond-card pond-card-add" onclick="openPondForm('add')">
          <div style="margin: auto; display:flex; flex-direction:column; align-items:center;">
              <div class="add-icon-circle">
                  <span class="material-icons" style="font-size:32px; color:var(--primary)">add</span>
              </div>
              <div class="add-text">Thêm hồ mới</div>
          </div>
      </div>
  </div>`;

  document.getElementById('ponds-table').innerHTML = html;

  // Gọi API lấy dữ liệu chi tiết
  pondData.forEach(pond => {
      fetchPondRealtimeData(pond.PondID);
      // GỌI HÀM MỚI: Chỉ cần truyền PondID, hàm sẽ tự tìm PlanID
      fetchFeedingSchedule(pond.PondID);
  });
  
  document.addEventListener('click', (e) => {
      const sortOpts = document.getElementById('sort-options');
      const sortBtn = e.target.closest('.btn-outline');
      if(sortOpts && !sortBtn && sortOpts.classList.contains('active')) {
          sortOpts.classList.remove('active');
      }
  });
}

// --- HÀM ĐÃ SỬA: Logic ưu tiên DONE -> Active cho ngày hôm nay ---
function fetchFeedingSchedule(pondId) {
    const listEl = document.getElementById(`schedule-list-${pondId}`);
    if (!listEl) return;

    // BƯỚC 1: Gọi list_plans.php để tìm Plan
    fetch(`/HeThongChamSocCaKoi/backend/api/customer/feeding/list_plans.php?pond_id=${pondId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.items || data.items.length === 0) {
                listEl.innerHTML = `<li style="color:var(--muted); font-style:italic;">Chưa có lịch ăn</li>`;
                return;
            }

            // --- LOGIC CHỌN PLAN ƯU TIÊN ---
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            let selectedPlan = null;

            // Lọc ra các plan được tạo trong ngày hôm nay (Dựa vào CreatedAt bắt đầu bằng YYYY-MM-DD)
            const todayPlans = data.items.filter(p => p.CreatedAt && p.CreatedAt.startsWith(todayStr));

            if (todayPlans.length > 0) {
                // ƯU TIÊN 1: Tìm plan đã hoàn thành (Done/Completed) trong ngày hôm nay
                const donePlan = todayPlans.find(p => {
                    const s = (p.Status || '').toLowerCase();
                    return s === 'done' || s === 'completed';
                });

                if (donePlan) {
                    selectedPlan = donePlan;
                } else {
                    // ƯU TIÊN 2: Tìm plan đang chạy (InProgress/Active) trong ngày hôm nay
                    const activePlan = todayPlans.find(p => {
                        const s = (p.Status || '').toLowerCase();
                        return s === 'inprogress' || s === 'active';
                    });
                    // Nếu không có Active thì lấy cái mới nhất trong ngày (có thể là Cancelled hoặc Draft)
                    selectedPlan = activePlan || todayPlans[0];
                }
            } else {
                // Nếu không có plan nào tạo hôm nay, lấy plan mới nhất của quá khứ
                // (Hàm get_plan sẽ check ngày PlanningDate và hiển thị "Chưa có lịch ăn" nếu không khớp hôm nay)
                selectedPlan = data.items[0];
            }
            
            const planId = selectedPlan.PlanID;

            // BƯỚC 2: Gọi get_plan.php để lấy chi tiết
            return fetch(`/HeThongChamSocCaKoi/backend/api/customer/feeding/get_plan.php?plan_id=${planId}`);
        })
        .then(response => {
            if(response) return response.json();
        })
        .then(data => {
            if (!data) return;

            // --- KIỂM TRA NGÀY HÔM NAY ---
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            const planDate = data.plan.PlanningDate; 
            const status = (data.plan.Status || '').toLowerCase();

            // 1. Nếu Plan KHÔNG PHẢI ngày hôm nay -> Chưa có lịch ăn
            if (planDate !== todayStr) {
                listEl.innerHTML = `<li style="color:var(--muted); font-style:italic;">Chưa có lịch ăn</li>`;
                return;
            }

            // 2. Nếu trạng thái là Cancelled -> Chưa có lịch ăn (dù là hôm nay)
            if (status === 'cancelled') {
                 listEl.innerHTML = `<li style="color:var(--muted); font-style:italic;">Chưa có lịch ăn</li>`;
                 return;
            }

            // 3. Nếu trạng thái là Done/Completed -> HIỂN THỊ ĐÃ HOÀN THÀNH
            if (status === 'done' || status === 'completed') {
                listEl.innerHTML = `
                    <li style="display:flex; flex-direction:column; align-items:center; color:var(--success); padding: 5px 0;">
                        <span class="material-icons" style="font-size:20px; margin-bottom:2px;">check_circle</span>
                        <span style="font-weight:600; font-size:12px;">Đã hoàn thành</span>
                    </li>`;
                return;
            }

            // 4. Nếu là hôm nay và đang Active -> Hiển thị list
            if (data.success && data.events && data.events.length > 0) {
                let html = '';
                const eventsToShow = data.events.slice(0, 3);
                
                eventsToShow.forEach(evt => {
                    let timeStr = '--:--';
                    const rawTime = evt.ScheduledAt || evt.Time || evt.time || evt.ScheduledTime || '';
                    if (rawTime.includes(' ')) {
                        timeStr = rawTime.split(' ')[1].substring(0, 5);
                    } else if (rawTime.length >= 5) {
                        timeStr = rawTime.substring(0, 5);
                    }

                    let rawAmount = 0;
                    if (evt.AmountExpected !== undefined) rawAmount = parseFloat(evt.AmountExpected);
                    else if (evt.Amount !== undefined) rawAmount = parseFloat(evt.Amount);
                    else if (evt.amount !== undefined) rawAmount = parseFloat(evt.amount);
                    
                    rawAmount = Math.round(rawAmount * 10) / 10;
                    
                    html += `
                    <li style="display: flex; align-items: center; justify-content: space-between; padding: 2px 0;">
                        <div style="display: flex; align-items: center;">
                            <span class="dot"></span> 
                            <span style="font-weight:500; min-width: 45px; display:inline-block; margin-left:6px;">${timeStr}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color:#cbd5e1; font-size:10px; margin-right:6px;">●</span>
                            <span style="font-weight: 600; min-width:40px; text-align:right;">${rawAmount}g</span>
                        </div>
                    </li>`;
                });

                if (data.events.length > 3) {
                    html += `<li style="color:var(--muted); font-size:10px; padding-left:12px; margin-top:4px;">+${data.events.length - 3} lần ăn khác...</li>`;
                }
                listEl.innerHTML = html;
            } else {
                listEl.innerHTML = `<li style="color:var(--muted); font-style:italic;">Lịch trống</li>`;
            }
        })
        .catch(err => {
            console.error('Lỗi tải lịch:', err);
            if(listEl.innerHTML.includes('Đang tải')) {
                 listEl.innerHTML = `<li style="color:var(--muted); font-style:italic;">Chưa thiết lập</li>`;
            }
        });
}

// --- HÀM ĐÃ SỬA: Hiển thị trạng thái chung (Ổn định/Cảnh báo) ---
function fetchPondRealtimeData(pondId) {
    fetch(`/HeThongChamSocCaKoi/backend/api/customer/water_params/get_context.php?pond_id=${pondId}`)
        .then(res => res.json())
        .then(data => {
            if(data.success && data.context) {
                const ctx = data.context;
                
                // 1. Hiển thị Nhiệt độ
                const tempEl = document.getElementById(`temp-${pondId}`);
                if(tempEl) {
                    tempEl.innerText = ctx.Temperature ? `${ctx.Temperature}°C` : '--°C';
                    if(ctx.Temperature > 30 || ctx.Temperature < 15) {
                        tempEl.style.background = 'linear-gradient(45deg, #ef4444, #f97316)';
                        tempEl.style.webkitBackgroundClip = 'text';
                        tempEl.style.webkitTextFillColor = 'transparent';
                    }
                }

                // 2. Hiển thị pH & NH3
                const phEl = document.getElementById(`ph-${pondId}`);
                const nh3El = document.getElementById(`nh3-${pondId}`);
                
                if(phEl) {
                    phEl.innerText = ctx.pH ? `pH ${ctx.pH}` : 'pH --';
                    if(ctx.pH < 6.5 || ctx.pH > 8.5) phEl.classList.add('alert');
                }
                
                if(nh3El) {
                    nh3El.innerText = ctx.Ammonia !== null ? `NH3: ${ctx.Ammonia}` : 'NH3: --';
                    if(ctx.Ammonia > 0.02) nh3El.classList.add('alert');
                }

                // 3. Hiển thị Trạng thái thông minh (TỔNG QUÁT)
                const statusEl = document.getElementById(`status-${pondId}`);
                if(statusEl) {
                    // Mặc định là ổn định
                    let statusText = 'Ổn định';
                    let statusColor = 'var(--success)';

                    // Kiểm tra status từ Server trả về (đã bao gồm NH3, NO2, pH, Oxygen...)
                    if (data.status === 'danger') {
                        statusText = 'Nguy hiểm';
                        statusColor = 'var(--danger)';
                    } else if (data.status === 'warning') {
                        statusText = 'Cảnh báo';
                        statusColor = '#f97316'; // Orange
                    }
                    
                    // Kiểm tra thêm các chỉ số phụ mà server có thể chưa set status 'danger' (VD: Nhiệt độ)
                    // Server check: NH3, NO2, Oxy, pH.
                    // Client check thêm: Temperature (nếu cần thiết)
                    if (ctx.Temperature && (ctx.Temperature > 32 || ctx.Temperature < 10)) {
                         statusText = 'Nguy hiểm';
                         statusColor = 'var(--danger)';
                    }

                    // Render
                    statusEl.innerText = statusText;
                    statusEl.style.color = statusColor;
                    statusEl.style.fontWeight = '700';
                    statusEl.style.fontSize = '13px';
                }
            }
        })
        .catch(console.error);
}

// ... (Giữ nguyên các hàm helper cũ: openPondForm, confirmDeletePond, toggleDetails, etc.) ...
// Phần dưới này giữ nguyên như code cũ của bạn

function openPondForm(mode, pond = {}) {
    openModal('pond-form-modal');
    document.getElementById('pond-form-title').innerText = (mode === 'add') ? 'THÊM HỒ CÁ MỚI' : 'CHỈNH SỬA HỒ CÁ';
    document.getElementById('btn-save-pond').innerHTML = (mode === 'add') ? 'Thêm mới' : 'Cập nhật';
    
    const form = document.getElementById('pond-form');
    form.reset();
    form.mode = mode;
  
    form.elements['PondID'].value = pond.PondID || '';
    form.elements['PondName'].value = pond.PondName || '';
    form.elements['Volume'].value = pond.Volume || '';
    form.elements['Depth'].value = pond.Depth || '';
    form.elements['Type'].value = pond.Type || '';
    form.elements['DrainCount'].value = pond.DrainCount || '';
    form.elements['SkimmerCount'].value = pond.SkimmerCount || '';
    form.elements['PumpingCapacity'].value = pond.PumpingCapacity || '';
    form.elements['Notes'].value = pond.Notes || '';
    form.elements['CurrentImageURL'].value = pond.ImageURL || '';
  
    const preview = document.getElementById('pond-preview');
    preview.style.display = 'none';
    if (pond.ImageURL) {
        preview.src = pond.ImageURL;
        preview.style.display = 'block';
    }
}
  
function confirmDeletePond(id) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').innerHTML = "Bạn có chắc chắn muốn xóa hồ này?<br><span style='font-size:13px; color:#ef4444'>Toàn bộ cá và lịch sử chăm sóc sẽ bị xóa vĩnh viễn!</span>";
    
    const yesBtn = document.getElementById('confirm-btn-yes');
    yesBtn.onclick = function() {
        yesBtn.innerText = "Đang xóa...";
        yesBtn.disabled = true;
        
        fetch(`/HeThongChamSocCaKoi/backend/api/customer/ponds/delete.php?id=${id}`)
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    pushToast("Đã xóa hồ cá thành công", "success");
                    loadPondCards();
                } else {
                    pushToast("Xóa thất bại: " + (data.error || "Lỗi server"), "error");
                }
                closeModal('confirm-modal');
            })
            .catch(err => {
                pushToast("Lỗi kết nối", "error");
                closeModal('confirm-modal');
            })
            .finally(() => {
                yesBtn.innerText = "Đồng ý";
                yesBtn.disabled = false;
            });
    };
    openModal('confirm-modal');
}
  
function toggleDetails(id) {
    const details = document.getElementById('pond-details-' + id);
    const btn = document.getElementById('toggle-btn-' + id);
    
    details.classList.toggle('expanded');
    
    if (details.classList.contains('expanded')) {
        btn.innerHTML = 'Thu gọn <span class="material-icons" style="font-size:16px">expand_less</span>';
        btn.style.color = 'var(--primary)';
    } else {
        btn.innerHTML = 'Chi tiết <span class="material-icons" style="font-size:16px">expand_more</span>';
        btn.style.color = 'var(--muted)';
    }
}
  
function toggleSortDropdown() {
    document.getElementById('sort-options').classList.toggle('active');
}

function sortPonds(field) {
  pondData.sort((a, b) => {
    let valA = parseFloat(a[field]) || 0;
    let valB = parseFloat(b[field]) || 0;
    if (field === 'CreatedAt') {
      valA = new Date(a.CreatedAt || 0);
      valB = new Date(b.CreatedAt || 0);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });
  sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  renderPondCards();
  document.getElementById('sort-options').classList.remove('active');
}

function pushToast(msg, type = 'info') {
    const container = document.getElementById('feed-toast');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
        <span class="material-icons toast-icon" style="color:inherit">${icon}</span>
        <span class="toast-msg">${msg}</span>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openModal(id) {
    const el = document.getElementById(id);
    if(el) el.classList.add('show');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove('show');
}