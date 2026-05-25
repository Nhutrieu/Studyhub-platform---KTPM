// =============================================================================
// FILE: /assets/js/customer/feeding.js
// MODULE: Feeding Advisor System (Core Logic)
// VERSION: V6.8 - FIX MULTI-POND LOGIC & REALTIME UPDATE
// AUTHOR: KoiCare System Dev Team
// DESCRIPTION: 
//    - Quản lý tính toán thức ăn cho cá Koi dựa trên AI và công thức ZNA.
//    - Tích hợp dự báo thời tiết thời gian thực (Open-Meteo).
//    - Hệ thống cảnh báo rủi ro môi trường khi sao chép kế hoạch cũ.
//    - Hỗ trợ chế độ Manual Pro cho người dùng chuyên nghiệp.
//    - [FIX] Sửa lỗi check hoàn thành plan theo từng hồ (PondID).
//    - [FIX] Sửa lỗi hiển thị realtime bảng "Kế hoạch đang chạy" (Global list).
// =============================================================================

$(function () {
  
  // ===========================================================================
  // 1. SYSTEM CONFIGURATION & STATE MANAGEMENT (CẤU HÌNH & TRẠNG THÁI)
  // ===========================================================================

  // Đường dẫn API Backend
  const apiBase = "/HeThongChamSocCaKoi/backend/api/customer/feeding/";
  const pondApi = "/HeThongChamSocCaKoi/backend/api/customer/ponds/";

  // Các khóa lưu trữ cục bộ (LocalStorage Keys)
  const SKEY = { 
      autoOpen: "feeding:autoOpen", 
      lastPond: "feeding:lastPondId" 
  };

  // Biến trạng thái toàn cục (Global State Variables)
  let ponds = [];             // Danh sách các hồ cá của user
  let selectedPond = "";      // ID của hồ đang được chọn
  let context = null;         // Ngữ cảnh dữ liệu hồ (số cá, cân nặng, nhiệt độ...)
  let calcResult = null;      // Kết quả tính toán từ AI/Server (chờ lưu)
  let activePlans = [];       // Danh sách các kế hoạch đang ở trạng thái 'active'
  let historyPlans = [];      // Lịch sử các kế hoạch cũ (done/cancelled)
  let viewingPlanId = null;   // ID của kế hoạch đang xem chi tiết (trong modal)
  let rightOpen = true;       // Trạng thái hiển thị của panel bên phải
  
  // Cờ kiểm soát logic gợi ý (để không spam popup liên tục)
  let suggestionShown = false; 

  // Cache dữ liệu thời tiết để tối ưu hiệu năng (tránh gọi API thừa)
  let weatherCache = null;

  // ===========================================================================
  // 2. HELPER FUNCTIONS (CÁC HÀM TIỆN ÍCH BỔ TRỢ)
  // ===========================================================================

  /**
   * Hàm chọn phần tử DOM nhanh (giống jQuery nhưng trả về Native Element)
   */
  function qs(id) { 
      return document.querySelector(id); 
  }

  /**
   * Chuyển đổi định dạng ngày tháng
   * Input: "YYYY-MM-DD" (Ví dụ: 2025-12-01)
   * Output: "dd/mm/yyyy" (Ví dụ: 01/12/2025)
   */
  function formatDateDMY(value) {
    if (!value) return "";
    const s = String(value).trim();
    if (!s) return "";
    // Tách bỏ phần giờ nếu có
    const datePart = s.split(" ")[0]; 
    const parts = datePart.split("-");
    if (parts.length !== 3) return s; 
    const [y, m, d] = parts;
    // Đảm bảo luôn có 2 chữ số
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  /**
   * Chuyển đổi định dạng ngày giờ chi tiết
   * Input: "YYYY-MM-DD HH:MM:SS"
   * Output: "dd/mm/yyyy HH:MM"
   */
  function formatDateTimeDMY(value) {
    if (!value) return "";
    const s = String(value).trim();
    if (!s) return "";
    const [datePart, timePartRaw] = s.split(" ");
    const base = formatDateDMY(datePart);
    if (!timePartRaw) return base;
    // Cắt lấy HH:MM
    const hhmm = timePartRaw.slice(0, 5); 
    return `${base} ${hhmm}`;
  }

  /**
   * Hiển thị thông báo nổi (Toast Notification)
   * Style: Giữ nguyên thiết kế phẳng, hiện đại của hệ thống cũ.
   */
  function pushToast(msg, type = "info", timeout = 3000) {
    let wrap = document.getElementById("feed-toast");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "feed-toast";
      // Thiết lập style cho container chứa toast
      Object.assign(wrap.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 12000,
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      });
      document.body.appendChild(wrap);
    }
    
    const div = document.createElement("div");
    
    // Xác định màu sắc dựa trên loại thông báo
    let borderColor = "#009fe3"; // Mặc định: Info (Xanh dương)
    let iconName = "info";

    if (type === "success") {
        borderColor = "#27ae60"; // Success (Xanh lá)
        iconName = "check_circle";
    } else if (type === "error") {
        borderColor = "#e74c3c"; // Error (Đỏ)
        iconName = "error";
    }

    div.className = "toast"; // Class chung
    if (type === "success") div.classList.add("toast-success");
    if (type === "error") div.classList.add("toast-error");

    // Inline style để đảm bảo hiển thị đúng ngay cả khi CSS chưa load kịp
    Object.assign(div.style, {
      pointerEvents: "auto",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "#fff",
      border: "1px solid #e4e9f3",
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: "12px",
      padding: "10px 12px",
      minWidth: "260px",
      maxWidth: "420px",
      boxShadow: "0 8px 24px rgba(0,0,0,.12)", // Shadow mềm
      transform: "translateY(-10px)",
      opacity: "0",
      transition: "all .28s cubic-bezier(0.34, 1.56, 0.64, 1)" // Hiệu ứng nảy nhẹ
    });

    div.innerHTML = `
      <span class="material-icons" style="color:${borderColor}">${iconName}</span>
      <div class="toast-msg" style="flex:1; font-size:13px; color:#202436; line-height:1.4;">${msg}</div>
      <button class="toast-x" title="Đóng" style="border:0; background:transparent; cursor:pointer; font-size:18px; color:#999;">&times;</button>
    `;
    
    wrap.appendChild(div);
    
    // Kích hoạt animation hiện ra
    requestAnimationFrame(function() {
      div.style.transform = "translateY(0)";
      div.style.opacity = "1";
    });

    // Hàm đóng toast
    const close = function() {
      div.style.opacity = "0";
      div.style.transform = "translateY(-10px)";
      setTimeout(function() { 
          if(div.parentNode) div.remove(); 
      }, 300);
    };

    div.querySelector(".toast-x").onclick = close;
    if (timeout) setTimeout(close, timeout);
  }

  // --- Các hàm xử lý Modal ---

  function openModal(sel) {
    const el = qs(sel);
    if (el) {
      el.classList.add("show");
      el.style.display = "flex"; // Flex để căn giữa
    }
  }

  function closeModal(sel) {
    const el = qs(sel);
    if (el) {
      el.classList.remove("show");
      el.style.display = "none";
    }
  }

  // Sự kiện đóng modal khi click vào backdrop hoặc nút đóng
  document.addEventListener("click", function(e) {
    const t = e.target;
    if (t.matches("[data-close]")) {
      const m = t.closest(".feed-modal");
      if (m) closeModal("#" + m.id);
    }
    if (t.classList.contains("feed-modal__backdrop")) {
      const m = t.closest(".feed-modal");
      if (m) closeModal("#" + m.id);
    }
  });

  /**
   * Hộp thoại xác nhận tùy chỉnh (Custom Confirm Dialog) - REFACTORED FOR GENERIC USE
   * Thay thế cho window.confirm() xấu xí của trình duyệt.
   */
  function showConfirm(title, message, onOk) {
    const area = qs("#notify-actions");
    qs("#notify-title").textContent = title || "Xác nhận hành động";
    // Cho phép HTML trong message để hiển thị cảnh báo đẹp hơn
    qs("#notify-message").innerHTML = message || "-";
    
    area.innerHTML = ""; // Xóa nút cũ
    
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-outline";
    cancelBtn.textContent = "Hủy bỏ";
    cancelBtn.setAttribute("data-close", "1");
    
    const okBtn = document.createElement("button");
    okBtn.className = "btn btn-approve"; // Màu xanh lá hoặc xanh dương tùy theme
    okBtn.textContent = "Đồng ý";
    okBtn.onclick = function() {
      closeModal("#notify-modal");
      if (onOk) onOk();
    };
    
    area.appendChild(cancelBtn);
    area.appendChild(okBtn);
    
    openModal("#notify-modal");
  }

  // Hàm ràng buộc Select box với LocalStorage (để nhớ lựa chọn của user)
  function bindPersistedSelect(id, key, def = "no") {
    const sel = qs(id);
    if (!sel) return;
    
    // Load giá trị cũ
    sel.value = localStorage.getItem(key) || def;
    
    // Lắng nghe sự kiện thay đổi
    sel.addEventListener("change", function() {
        localStorage.setItem(key, sel.value);
    });
  }

  // Helpers riêng cho Pond ID
  function setLastPond(id) { localStorage.setItem(SKEY.lastPond, id || ""); }
  function getLastPond()   { return localStorage.getItem(SKEY.lastPond) || ""; }

  // ===========================================================================
  // 3. WEATHER SERVICE (DỊCH VỤ THỜI TIẾT THÔNG MINH - UPDATED V6.2)
  // ===========================================================================
  // Sử dụng API Open-Meteo để lấy dự báo thời tiết chính xác tại vị trí hồ cá.
  
  async function fetchWeatherData() {
    // 1. Kiểm tra Cache (trong vòng 10 phút)
    // Giúp giảm tải request mạng và tăng tốc độ phản hồi UI
    if (weatherCache && (Date.now() - weatherCache.timestamp < 600000)) {
        return weatherCache.data;
    }

    // 2. Gọi API lấy dữ liệu mới
    return new Promise(function(resolve) {
        if (!navigator.geolocation) {
            console.warn("[Weather] Trình duyệt không hỗ trợ Geolocation.");
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // URL API Open-Meteo
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;

                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data && data.daily) {
                        // Data index: 0 = Hôm nay, 1 = Ngày mai
                        const todayMax = data.daily.temperature_2m_max[0];
                        const todayMin = data.daily.temperature_2m_min[0];
                        
                        const tomorrowMax = data.daily.temperature_2m_max[1];
                        const tomorrowMin = data.daily.temperature_2m_min[1];
                        const weatherCode = data.daily.weathercode[1];

                        // [LOGIC MỚI] Tính nhiệt độ trung bình (Avg) thay vì chỉ Min
                        const todayAvg = (todayMax + todayMin) / 2;
                        const tmAvg    = (tomorrowMax + tomorrowMin) / 2;

                        // [FIX] So sánh Avg ngày mai với Avg hôm nay -> Xu hướng chính xác hơn
                        const diffCheck = tmAvg - todayAvg;

                        const result = {
                            current_avg: todayAvg,
                            tomorrow_min: tomorrowMin, // Vẫn giữ Min để check ngưỡng lạnh tuyệt đối
                            weather_code: weatherCode,
                            diff_check: diffCheck, // Sử dụng chênh lệch trung bình
                            forecast_desc: `TB mai: ${tmAvg.toFixed(1)}°C (Min: ${tomorrowMin}°C)`
                        };
                        
                        // Lưu cache kèm timestamp
                        weatherCache = { data: result, timestamp: Date.now() };
                        console.log("[Weather] Fetched successfully:", result);
                        resolve(result);
                    } else {
                        console.warn("[Weather] No daily data received.");
                        resolve(null);
                    }
                } catch (e) {
                    console.error("[Weather] API Error:", e);
                    resolve(null);
                }
            },
            function(err) {
                console.warn("[Weather] User denied location access:", err);
                resolve(null); 
            }
        );
    });
  }

  // ===========================================================================
  // 4. DATA LOADING (TẢI DỮ LIỆU HỒ & NGỮ CẢNH)
  // ===========================================================================

  function extractPonds(res) {
    if (Array.isArray(res)) return res;
    if (res && res.success && Array.isArray(res.items)) return res.items;
    return null;
  }

  // Tải danh sách hồ cá
  function loadPonds() {
    $.get(pondApi + "list.php")
      .done(function (res) {
        const items = extractPonds(res);
        if (!items) {
          pushToast("Không thể tải danh sách hồ cá. Vui lòng thử lại.", "error");
          return;
        }
        
        ponds = items;
        const sel = qs("#pond-select");
        
        // Render dropdown
        sel.innerHTML = `<option value="">-- Chọn hồ --</option>` +
          ponds.map(p => `<option value="${p.PondID}">${p.PondName}</option>`).join("");
        
        // Khôi phục hồ đã chọn lần trước (User Experience)
        const lp = getLastPond();
        if (lp) {
          sel.value = lp;
          // Nếu hồ đó vẫn còn tồn tại trong danh sách
          if (sel.value) {
            selectedPond = lp;
            afterSelectPond(); // Trigger tải dữ liệu chi tiết
          }
        }
      })
      .fail(function() {
          pushToast("Lỗi kết nối API hồ cá. Kiểm tra mạng!", "error");
      });
  }

  // Xử lý sau khi người dùng chọn một hồ cụ thể
  function afterSelectPond() {
    if (!selectedPond) return;
    
    // Gọi API lấy ngữ cảnh (Context) để điền vào form
    $.get(apiBase + "get_feeding_context.php", { pond_id: selectedPond }, function (res) {
      if (!res.success) {
        pushToast(res.error || "Lỗi khi tải dữ liệu hồ", "error");
        return;
      }
      
      context = res.item || {};

      // Hiển thị Panel thông tin tóm tắt (Brief)
      $("#pond-brief").css("display", "grid"); // Grid layout cho đẹp
      const pond = ponds.find(p => String(p.PondID) === String(selectedPond));
      $("#pond-name").text(pond ? pond.PondName : "Hồ Cá");

      // Format dữ liệu hiển thị
      const fishCount  = (context.fish_count != null) ? context.fish_count : "-";
      const avgWeight  = (context.avg_weight != null && context.avg_weight !== 0)
                           ? context.avg_weight + " kg/cá"
                           : "-";
      const waterTemp  = (context.water_temp != null)
                           ? context.water_temp + "°C"
                           : "-";
      
      $("#pond-info").text(`Số cá: ${fishCount} • TB: ${avgWeight} • Nhiệt độ: ${waterTemp}`);

      // Ảnh hồ (Fallback nếu không có ảnh)
      // [FIX] Sửa đường dẫn từ /assets/img/ thành /assets/images/ để khớp với hệ thống
      const img = (pond && (pond.ImageURL || pond.ImagePath || pond.Image || pond.image_url))
        || "/HeThongChamSocCaKoi/assets/images/no-pond.jpg";
      $("#pond-img").attr("src", img).attr("alt", pond ? pond.PondName : "pond");

      // Auto-fill vào các ô Input (nhưng vẫn cho phép sửa)
      $("#feed-objective").val("growth");
      $("#protein-pct").val(context.protein_pct ?? 35);
      $("#water-temp").val(context.water_temp ?? "");
      $("#avg-weight").val(context.avg_weight ?? "");
      $("#fish-count").val(context.fish_count ?? "");

      // [QUAN TRỌNG] Gọi ngầm API thời tiết ngay lúc này để dữ liệu sẵn sàng khi bấm nút "Tính toán"
      fetchWeatherData();
    });
  }

  // ===========================================================================
  // 5. PLANS MANAGEMENT (QUẢN LÝ KẾ HOẠCH CHO ĂN)
  // ===========================================================================

  // Helper tạo Badge trạng thái
  function statusPill(s) {
    const color =
      s === "active" ? "var(--green)" :
      s === "done"   ? "var(--blue)"  :
                       "var(--red)"; // cancelled
    return `<span class="status" style="background:#eef5ff;border:1px solid var(--line);color:${color};">${s}</span>`;
  }

  // Tải danh sách kế hoạch (Chạy & Lịch sử)
  function loadPlans(renderMini = true) {
    // [FIX BUG REALTIME] Không truyền params pond_id vào request để lấy TOÀN BỘ danh sách (Global).
    // Lý do: Sidebar "Kế hoạch đang chạy" cần hiển thị tất cả các hồ đang hoạt động.
    // Nếu chỉ tải theo selectedPond thì khi chuyển đổi hoặc xóa plan hồ hiện tại, danh sách sẽ bị trống trơn.
    const params = {}; 

    $.get(apiBase + "list_plans.php", params, function (res) {
      if (!res.success) return;
      
      const all = res.items || [];
      
      // Filter Active Plans: Lấy toàn bộ (Global) để hiển thị ở Sidebar
      activePlans  = all.filter(p => p.Status === "active");
      
      // Filter History Plans: Chỉ lấy lịch sử của hồ ĐANG CHỌN (Client-side filter)
      // Điều này sửa lỗi: Sidebar hiển thị đầy đủ, còn Modal Lịch Sử hiển thị chính xác theo hồ.
      historyPlans = all.filter(p => {
          const isNotActive = p.Status !== "active";
          // Nếu chưa chọn hồ thì lấy hết, nếu chọn rồi thì phải trùng ID
          const isCurrentPond = !selectedPond || String(p.PondID) === String(selectedPond); 
          return isNotActive && isCurrentPond;
      });
      
      if (renderMini) renderMiniPlans();

      // === LOGIC GỢI Ý THÔNG MINH (SMART SUGGESTION) ===
      
      if (!selectedPond) return;
      if (suggestionShown) return; // Chỉ hiện 1 lần mỗi phiên
      
      // Check xem HỒ NÀY có plan đang chạy không
      const currentPondActive = activePlans.some(p => String(p.PondID) === String(selectedPond));
      if (currentPondActive) return; // Đang chạy plan cho hồ này thì không gợi ý

      // Kiểm tra xem hôm nay đã hoàn thành plan nào chưa (tránh spam)
      const todayStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
      const doneToday = historyPlans.some(p => {
          if (!p.CreatedAt) return false; 
          // [FIX BUG LOGIC] Đã có filter historyPlans theo pond ở trên, nhưng check lại cho chắc chắn
          const isSamePond = String(p.PondID) === String(selectedPond);
          return isSamePond && p.CreatedAt.split(' ')[0] === todayStr && p.Status === 'done';
      });

      if (doneToday) return; // Hôm nay đã làm rồi, nghỉ ngơi thôi!

      // Nếu chưa có plan hôm nay, kiểm tra lịch sử để gợi ý Clone
      if (historyPlans.length > 0) {
         const lastPlan = historyPlans[0]; // Plan gần nhất của hồ này
         suggestionShown = true;
         
         // [NÂNG CẤP] KIỂM TRA THỜI TIẾT TRƯỚC KHI HIỆN GỢI Ý
         fetchWeatherData().then(weather => {
             let warningHtml = "";
             
             // Logic cảnh báo chuyên nghiệp:
             // Trường hợp 1: Sốc nhiệt LẠNH (Giảm > 3 độ)
             if (weather && weather.diff_check <= -3) {
                 const isColdShock = (weather.tomorrow_min < 22); // Nếu Min < 22 độ là ngưỡng lạnh
                 
                 let title = isColdShock ? "⚠️ NGUY HIỂM: SỐC NHIỆT LẠNH" : "⚠️ LƯU Ý: GIẢM NHIỆT MẠNH";
                 let color = isColdShock ? "#c0392b" : "#f39c12"; 
                 let bg    = isColdShock ? "#fff5f5" : "#fef9e7";
                 let border= isColdShock ? "#ffcdd2" : "#ffe082";
                 let act   = isColdShock ? "Nguy hiểm cao. Vui lòng HỦY và tính lại." : "Vẫn an toàn, nhưng nên cân nhắc giảm lượng ăn.";

                 warningHtml = `
                    <div style="margin-top:12px; padding:12px; background:${bg}; color:${color}; border:1px solid ${border}; border-radius:8px; font-size:13px; text-align:left; line-height:1.5;">
                        <div style="font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                            <span class="material-icons" style="font-size:18px">ac_unit</span>
                            ${title}
                        </div>
                        <div>
                            Dự báo ngày mai giảm trung bình ${Math.abs(weather.diff_check).toFixed(1)}°C.
                            <br/>
                            (Min ngày mai: ${weather.tomorrow_min}°C).
                        </div>
                        <div style="margin-top:6px; font-style:italic; font-weight:600;">
                            ${act}
                        </div>
                    </div>
                 `;
             } 
             // Trường hợp 2: Sốc nhiệt NÓNG (Tăng > 3 độ) - [YÊU CẦU MỚI]
             else if (weather && weather.diff_check >= 3) {
                 // [UPDATE] Ngưỡng nóng nguy hiểm là 30 độ (Thay vì 32)
                 const isHeatShock = (weather.tomorrow_max >= 30); 
                 
                 let title = isHeatShock ? "⚠️ NGUY HIỂM: SỐC NHIỆT NÓNG (>30°C)" : "⚠️ CẢNH BÁO: TĂNG NHIỆT NHANH";
                 let color = isHeatShock ? "#c0392b" : "#e67e22"; // Đỏ đậm nếu > 30 độ
                 let bg    = isHeatShock ? "#fff5f5" : "#fff8e1";
                 let border= isHeatShock ? "#ffcdd2" : "#ffe0b2";
                 let act   = isHeatShock ? "Nhiệt độ > 30°C rất nguy hiểm. Vui lòng NGỪNG CHO ĂN và bật sục khí." : "Cá sẽ ăn mạnh hơn, nhưng cần chú ý Oxy.";
                 
                 warningHtml = `
                    <div style="margin-top:12px; padding:12px; background:${bg}; color:${color}; border:1px solid ${border}; border-radius:8px; font-size:13px; text-align:left; line-height:1.5;">
                        <div style="font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                            <span class="material-icons" style="font-size:18px">whatshot</span>
                            ${title}
                        </div>
                        <div>
                            Dự báo ngày mai tăng trung bình ${weather.diff_check.toFixed(1)}°C.
                            <br/>
                            (Max ngày mai: ${weather.tomorrow_max}°C).
                        </div>
                        <div style="margin-top:6px; font-style:italic; font-weight:600;">
                            ${act}
                        </div>
                    </div>
                 `;
             }
             else {
                 // Cảnh báo tiêu chuẩn
                 warningHtml = `
                    <div style="margin-top:10px; font-size:12px; color:#666; font-style:italic;">
                        Lưu ý: Chức năng này sẽ sao chép <b>nguyên bản</b> kế hoạch cũ.
                    </div>
                 `;
             }

             const msg = `
                <div style="font-size:15px; color:#2c3e50;">Hôm nay hồ này chưa có lịch ăn.</div>
                <div style="margin-top:6px; font-size:14px;">
                    Bạn có muốn áp dụng lại thực đơn gần nhất:<br/>
                    <b>${lastPlan.Objective}</b> • <b>${lastPlan.DailyFeedGrams}g</b> / ngày?
                </div>
                ${warningHtml}
             `;
             
             showConfirm("Gợi ý kế hoạch thông minh 💡", msg, function() {
                cloneLastPlan();
             });
         });
      }
    });
  }

  // Hàm thực hiện Clone (Sao chép)
  function cloneLastPlan() {
    if (!selectedPond) {
      pushToast("Chưa chọn hồ để thao tác!", "error");
      return;
    }
    
    pushToast("Đang khởi tạo bản sao kế hoạch...", "info");

    $.ajax({
      url: apiBase + "clone_plan.php",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ pond_id: selectedPond }), // Clone mới nhất của hồ này
      success: function (res) {
        if (res.success) {
           pushToast(res.message || "Đã áp dụng lại kế hoạch thành công.", "success");
           loadPlans(true);
           // Mở ngay chi tiết plan mới tạo để user check lại
           if (res.plan_id) {
             openPlanDetail(res.plan_id);
           }
        } else {
           pushToast(res.error || "Sao chép thất bại. Vui lòng thử lại.", "error");
        }
      },
      error: function (xhr) {
        let msg = "Lỗi kết nối máy chủ";
        if (xhr.responseJSON && xhr.responseJSON.error) msg = xhr.responseJSON.error;
        pushToast(msg, "error");
      }
    });
  }

  // [YÊU CẦU] Hiển thị danh sách Mini Plan (Thêm ngày tạo)
  function renderMiniPlans() {
    const wrap = qs("#feed-plans-mini");
    
    // Nếu không có plan nào
    if (!activePlans.length) {
      wrap.innerHTML = `<div style="text-align:center; padding:20px; color:#999; font-style:italic;">Chưa có kế hoạch nào đang chạy.</div>`;
      return;
    }

    // Render danh sách (hiển thị tất cả các hồ đang chạy)
    wrap.innerHTML = activePlans.map(p => `
      <div class="plan-mini">
        <div class="plan-mini__head">
          <div style="display:flex; flex-direction:column;">
              <h4 style="margin:0; font-size:15px; color:var(--ink); font-weight:600;">
                  ${p.PondName || "Hồ"} • ${p.Objective}
              </h4>
              <!-- Hiển thị ngày tạo để user biết plan này cũ hay mới -->
              <div style="font-size:11px; color:#95a5a6; margin-top:3px; font-weight:normal;">
                  <span class="material-icons" style="font-size:10px; vertical-align:middle;">calendar_today</span>
                  Ngày tạo: ${formatDateDMY(p.CreatedAt)}
              </div>
          </div>
          ${statusPill(p.Status)}
        </div>
        
        <div class="plan-mini__body" style="margin-top:8px; padding-top:8px; border-top:1px dashed #eee;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:13px; color:#555;">Tổng khẩu phần:</span>
              <span style="font-size:14px; font-weight:700; color:var(--primary);">${p.DailyFeedGrams} g</span>
          </div>
        </div>

        <div class="plan-mini__actions">
          <button class="btn btn-outline-gray btn-xs act-plan-detail" data-id="${p.PlanID}" title="Xem chi tiết">
            <span class="material-icons">visibility</span> Chi tiết
          </button>
          <button class="btn btn-approve btn-xs act-plan-done" data-id="${p.PlanID}" title="Hoàn thành">
            <span class="material-icons">check_circle</span> Xong
          </button>
          <button class="btn btn-danger btn-xs act-plan-cancel" data-id="${p.PlanID}" title="Hủy bỏ">
            <span class="material-icons">cancel</span> Hủy
          </button>
        </div>
      </div>
    `).join("");
  }

  // ===========================================================================
  // 6. PLAN DETAIL MODAL (CHI TIẾT KẾ HOẠCH & THỰC THI)
  // ===========================================================================

  // Hàm mở modal chi tiết (Có thể là Active hoặc History)
  function openPlanDetail(planId, readOnly = false) {
    viewingPlanId = planId;
    
    // Reset UI modal trước khi load
    $("#feed-detail-body").html(`
        <div style="text-align:center; padding:30px;">
            <div class="spinner"></div>
            <div class="hint">Đang tải dữ liệu chi tiết...</div>
        </div>
    `);
    openModal("#feed-detail-modal");

    // Gọi API lấy chi tiết
    $.ajax({
      url: apiBase + "get_plan.php",
      data: { plan_id: planId },
      dataType: 'json',
      success: function (res) {
        try {
            if (!res.success) {
              $("#feed-detail-body").html(`<div class="hint error">❌ Không tìm thấy dữ liệu kế hoạch (ID: ${planId}).</div>`);
              return;
            }

            const plan    = res.plan;
            const events = res.events || [];
            
            // Logic ReadOnly: Nếu plan đã xong/hủy, hoặc tham số truyền vào là true
            const isReadOnly = readOnly || plan.Status !== "active";

            // Ẩn hiện nút "Done All" tùy trạng thái
            if (isReadOnly) {
              $("#btn-done-all").hide();
            } else {
              $("#btn-done-all").show();
            }

            // Phần Header thông tin (Meta)
            const meta = `
              <div class="result-box" style="background:#f8fbff; border-color:#d0e1fd;">
                <div class="result-head" style="color:#0056b3;">
                    Kế hoạch: ${plan.Objective} • ${statusPill(plan.Status)}
                </div>
                <div class="grid-2">
                  <div>🌡️ Nhiệt độ nước: <b>${plan.WaterTemp ?? "-"}</b> °C</div>
                  <div>🍽️ Tổng lượng ăn: <b>${plan.DailyFeedGrams}</b> g</div>
                </div>
                <div class="small-hint" style="margin-top:6px; border-top:1px solid #e1e8f0; padding-top:4px;">
                    <span class="material-icons" style="font-size:12px; vertical-align:text-top;">event</span>
                    Ngày tạo: ${formatDateDMY(plan.CreatedAt)}
                </div>
              </div>`;

            // Phần Bảng chi tiết các cữ ăn (Table Events)
            const now = new Date(); 

            const rows = events.map((e, index) => {
              const obs   = e.Observation || "";
              const leftChecked = e.LeftoverFlag == 1 ? "checked" : "";
              
              // Parse thời gian dự kiến
              const eventDate = new Date(e.ScheduledAt.replace(" ", "T"));
              const timeStr = formatDateTimeDMY(e.ScheduledAt);
              
              // --- LOGIC KIỂM SOÁT THỜI GIAN (Time Lock) ---
              // Cho phép nhập liệu trễ tối đa 180 phút (3 tiếng)
              const gracePeriodMs = 180 * 60000; 
              let isPast = eventDate < (now.getTime() - gracePeriodMs);

              // Ngoại lệ: Cữ cuối cùng trong ngày luôn mở để user "chốt sổ" cuối ngày
              const isLastItem = (index === events.length - 1);
              if (isLastItem) {
                  isPast = false;
              }
              
              // Quyết định disable row
              const disableRow = isReadOnly || (isPast && !e.ExecutedAt); 
              
              // Style UI
              const rowClass = disableRow ? "row-disabled" : "";
              const rowStyle = disableRow ? "opacity: 0.6; background: #f5f5f5;" : "";
              const inputDisabled = isReadOnly ? "disabled" : (disableRow ? "disabled" : "");

              // Render nút bấm hành động
              let btnHtml = '';
              if (e.ExecutedAt) {
                    // Đã xong -> Hiện dấu tích xanh
                    btnHtml = `<button class="btn btn-xs" style="background:transparent; color:var(--green); border:none; cursor:default; font-weight:bold;">
                                    <span class="material-icons" style="font-size:16px;">check</span> Đã xong
                              </button>`;
              } else {
                    // Chưa xong
                    if (!isReadOnly) {
                        btnHtml = `<button class="btn btn-primary btn-xs act-save-event" data-id="${e.EventID}" ${inputDisabled}>
                                            Lưu
                                       </button>`;
                    } else {
                        btnHtml = `<span style="color:#ccc">--</span>`;
                    }
              }

              // Label cảnh báo quá giờ
              const showPastLabel = (disableRow && !e.ExecutedAt && !isReadOnly);

              return `
                <tr class="${rowClass}" style="${rowStyle}">
                  <td style="text-align:center; font-weight:600;">${e.FeedIndex}</td>
                  <td>
                      ${timeStr} 
                      ${showPastLabel ? '<div style="color:red; font-size:10px; font-weight:bold;">(Đã quá giờ)</div>' : ''}
                  </td>
                  <td class="num" style="font-weight:bold; color:var(--primary);">${e.AmountExpected}</td>
                  <td class="actual-cell" style="text-align:center">
                    <input type="number" class="amountGiven" data-id="${e.EventID}"
                           value="${e.AmountGiven ?? ""}" placeholder="g" ${inputDisabled} 
                           style="width:70px; text-align:center; border:1px solid #ddd; border-radius:6px; padding:4px;">
                  </td>
                  <td>
                    <select class="obsSelect" data-id="${e.EventID}" ${inputDisabled} style="width:100%; border-radius:6px;">
                      <option value="">-- Tình trạng --</option>
                      <option value="normal" ${obs === "normal" ? "selected" : ""}>Bình thường</option>
                      <option value="fast"   ${obs === "fast"   ? "selected" : ""}>Ăn rất nhanh</option>
                      <option value="slow"   ${obs === "slow"   ? "selected" : ""}>Ăn chậm</option>
                      <option value="skip"   ${obs === "skip"   ? "selected" : ""}>Bỏ cữ / Ít</option>
                    </select>
                  </td>
                  <td style="text-align:center;">
                    <label class="leftover-flag-label" style="cursor:pointer;">
                      <input type="checkbox" class="leftoverFlag" data-id="${e.EventID}" ${leftChecked} ${inputDisabled}>
                      <span style="font-size:12px; margin-left:4px;">Dư</span>
                    </label>
                  </td>
                  <td style="text-align:center;">
                    ${btnHtml}
                  </td>
                </tr>`;
            }).join("");

            const table = `
              <table class="event-table" style="margin-top:12px; width:100%;">
                <thead>
                    <tr style="background:#f0f2f5; color:#444;">
                      <th style="width:40px;">Cữ</th>
                      <th style="text-align:center">Thời gian</th>
                      <th>Đề xuất (g)</th>
                      <th style="text-align:center">Thực tế (g)</th>
                      <th style="width:130px;">Tình trạng ăn</th>
                      <th style="width:60px;">Dư cám?</th>
                      <th style="width:70px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
              </table>`;

            $("#feed-detail-body").html(meta + table);
        } catch (err) {
            console.error("Render Error:", err);
            $("#feed-detail-body").html(`<div class="hint error">Lỗi hiển thị dữ liệu: ${err.message}</div>`);
        }
      },
      error: function(xhr, status, error) {
          $("#feed-detail-body").html(`<div class="hint error">Lỗi kết nối server: ${status} (Hãy thử tải lại trang)</div>`);
      }
    });
  }

  // ===========================================================================
  // 7. MANUAL PRO HELPERS (HỖ TRỢ CHẾ ĐỘ NHẬP TAY)
  // ===========================================================================

  // Cập nhật nhãn và hướng dẫn khi đổi nguồn nhập (Manual Source)
  function updateManualSourceUI() {
    const source = $("#manual-source").val() || "percent";
    const label  = $("#manual-input-label");
    const hint   = $("#manual-input-hint");

    if (source === "percent") {
      label.text("% tỷ lệ cho ăn (/ngày)");
      hint.text("Ví dụ: Nhập 1.5 - 2.5 cho cá trưởng thành. Hệ thống sẽ giới hạn an toàn 0-3%.");
    } else if (source === "per_fish") {
      label.text("Gram / con / ngày");
      hint.text("Ví dụ: Nhập 2 (nghĩa là 2g cho mỗi con cá/ngày). Hệ thống sẽ tự nhân với số lượng cá.");
    } else {
      label.text("Tổng gram/ngày cho cả hồ");
      hint.text("Ví dụ: Nhập 250 (nghĩa là cả hồ ăn 250g/ngày). Hệ thống sẽ tự tính ngược ra %.");
    }
  }

  // Lấy tỷ lệ chia cữ mặc định (Preset)
  function getManualMealsPreset(count, preset) {
    const even = Array(count).fill(100 / count);
    if (preset === "even") return even;

    if (count === 3) {
      if (preset === "grow")  return [40, 30, 30]; // Tăng trưởng: Ăn nhiều sáng
      if (preset === "color") return [35, 25, 40]; // Lên màu: Ăn nhiều chiều
    }
    return even;
  }

  // Kiểm tra tổng % các cữ có bằng 100% không
  function validateManualMeals() {
    const container = $("#manual-meals-config");
    let sum = 0;
    const ratios = [];
    
    $(".manual-meal-ratio").each(function () {
      const v = parseFloat(this.value || "0");
      const safe = isNaN(v) ? 0 : v;
      ratios.push(safe);
      sum += safe;
    });
    
    container.data("customRatios", ratios);
    const warn = $("#manual-meals-warning");
    
    if (!warn.length) return;
    if (!ratios.length) {
      warn.text("");
      return;
    }
    
    if (Math.abs(sum - 100) > 0.5) {
      warn.text(`⚠️ Tổng hiện tại: ${sum.toFixed(1)}%. Khi tính toán, hệ thống sẽ tự động chuẩn hóa về 100%.`);
      warn.css("color", "#c0392b"); // Đỏ
    } else {
      warn.text(`✅ Tổng ≈ ${sum.toFixed(1)}%.`);
      warn.css("color", "#27ae60"); // Xanh
    }
  }

  // Vẽ giao diện chia cữ thủ công
  function renderManualMeals() {
    const count   = parseInt($("#manual-meals-count").val() || "3", 10);
    const preset  = $("#manual-meals-preset").val() || "grow";
    const container = $("#manual-meals-config");
    const labels  = ["Sáng", "Trưa", "Chiều", "Tối", "Đêm"];
    const defaultTimes = ["08:00", "13:00", "17:00", "21:00", "23:00"];

    let ratios;
    const saved = container.data("customRatios");
    
    // Nếu đang chọn custom và số lượng cữ khớp, giữ nguyên giá trị user đang nhập
    if (preset === "custom" && Array.isArray(saved) && saved.length === count) {
      ratios = saved.slice();
    } else {
      ratios = getManualMealsPreset(count, preset);
    }

    let html = '<div style="font-weight:500; margin-bottom:4px;">Phân chia khẩu phần (Tổng ≈ 100%):</div>';
    html += '<div style="margin-top:4px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">';

    for (let i = 0; i < count; i++) {
      const label = labels[i] || `Cữ ${i + 1}`;
      const time  = defaultTimes[i] || "08:00";
      const ratio = ratios[i] != null ? ratios[i] : (100 / count);
      
      html += `
        <div class="feed-field" style="margin:0; background:#f9f9f9; padding:8px; border-radius:8px; border:1px solid #eee;">
          <label style="font-size:12px; color:#666; margin-bottom:2px;">${label}</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="time" class="manual-meal-time" data-idx="${i}" value="${time}" style="flex:0 0 85px; font-size:13px;">
            <input type="number" class="manual-meal-ratio" data-idx="${i}" value="${ratio.toFixed ? ratio.toFixed(1) : ratio}" step="0.1" style="flex:1; font-weight:bold;">
            <span style="font-size:12px; color:#555;">%</span>
          </div>
        </div>`;
    }
    html += '</div><div id="manual-meals-warning" style="margin-top:6px; font-size:12px; font-weight:600;"></div>';

    container.off("input", ".manual-meal-ratio");
    container.html(html);
    container.on("input", ".manual-meal-ratio", validateManualMeals);
    
    // Validate lần đầu
    validateManualMeals();
  }

  // ===========================================================================
  // 8. CORE CALCULATE FUNCTION (TÍNH TOÁN & HIỂN THỊ KẾT QUẢ)
  // ===========================================================================

  function openPlanner() {
    if (!selectedPond) {
      pushToast("Vui lòng chọn hồ cá trước!", "error");
      return;
    }
    openModal("#feed-planner-modal");
  }

  // Hàm Render kết quả tính toán (GIỮ NGUYÊN UI GỐC + THÊM CẢNH BÁO)
  function renderCalcResult(r) {
    const asNum = (v) => {
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const mode      = r.mode || "ai";
    const cached    = (r.cached === true || r.cached === 1 || r.cached === "1");

    const finalRate     = asNum(r.feed_rate_pct)          ?? 0;
    const finalDaily    = asNum(r.daily_feed_g)           ?? 0;

    const baselineRate  = asNum(r.baseline_rate_pct)      ?? finalRate;
    const baselineDaily = asNum(r.baseline_daily_feed_g)  ?? finalDaily;

    const learningRate  = asNum(r.learning_rate_pct)      ?? baselineRate;
    const learningDaily = asNum(r.learning_daily_feed_g)  ?? baselineDaily;
    const learningDelta = asNum(r.learning_delta_pct)     ?? 0;
    const learningSource= r.learning_source || "none";

    const grams  = finalDaily || 0;

    // ---- Xử lý bảng chia cữ (Split) ----
    let splitArr = Array.isArray(r.split) && r.split.length ? r.split.slice() : [0.4, 0.3, 0.3];
    let parts = [];
    const defaultLabels = ["Sáng","Trưa","Chiều","Tối"];
    const defaultTimes  = ["08:00","13:00","17:00","21:00"];

    if (Array.isArray(r.manual_meals) && r.manual_meals.length && mode === "manual") {
      const meals = r.manual_meals;
      if (!splitArr || splitArr.length !== meals.length) {
        const ratios = meals.map(m => {
          const v = parseFloat(m.ratio);
          return isNaN(v) ? 0 : v;
        });
        let sum = ratios.reduce((a,b) => a + b, 0);
        if (sum <= 0) sum = 1;
        splitArr = ratios.map(v => v / sum);
      }
      parts = meals.map((m, idx) => ({
        label: m.label || defaultLabels[idx] || ("Cữ " + (idx + 1)),
        time:  m.time  || defaultTimes[idx] || "08:00",
        pct:   splitArr[idx] ?? (1 / meals.length)
      }));
    } else {
      parts = splitArr.map((p, idx) => ({
        label: defaultLabels[idx] || ("Cữ " + (idx + 1)),
        time:  defaultTimes[idx]  || "08:00",
        pct:   p
      }));
    }

    const tbl = parts.map((p, i) =>
      `<tr>
        <td style="padding:10px;">${i + 1} (${p.label})</td>
        <td style="text-align:center">${p.time}</td>
        <td style="text-align:center; font-weight:bold; color:var(--primary);">${(grams * p.pct).toFixed(1)}</td>
      </tr>`
    ).join("");

    // ---- Xử lý thông tin Meta (Body State, Water) ----
    const bodyState    = r.body_state || "";
    const waterQuality = r.water_quality || "";
    const waterTemp    = (typeof r.water_temp !== "undefined" && r.water_temp !== null)
                           ? r.water_temp
                           : null;
    const groups       = r.groups || {};
    const thin         = groups.thin   || 0;
    const normal       = groups.normal || 0;
    const fat          = groups.fat    || 0;

    let metaSecondRow = "";
    const hasBodyOrWater = bodyState || waterQuality || waterTemp !== null;
    if (hasBodyOrWater) {
      const tempStr = waterTemp !== null ? (waterTemp + "°C") : "-";
      const bcsStr  = bodyState || "-";
      const wqStr   = waterQuality || "-";
      
      metaSecondRow = `
        <div class="feed-meta" style="margin-top:8px;">
          <div>⚖️ Thể trạng: <b>${bcsStr}</b> (gầy:${thin}, vừa:${normal}, béo:${fat})</div>
          <div>🌊 Nước: <b>${wqStr}</b> • Nhiệt độ: <b>${tempStr}</b></div>
        </div>
      `;
    }

    let modeLabel = "AI (hybrid)";
    if (mode === "manual") modeLabel = "Manual Pro";
    else if (mode === "ai-fallback") modeLabel = "AI Fallback";

    const buildCompareVal = (rate, daily, extraHtml = "") => `
      <span class="feed-compare__val"
            style="display:inline-flex;justify-content:flex-end;align-items:center;gap:6px;min-width:220px;">
        <span>${rate.toFixed(2)}% • ${daily.toFixed(1)} g/ngày</span>
        ${extraHtml}
      </span>
    `;

    // ---- Bảng so sánh (Compare Table) ----
    let compareHtml = "";
    if (baselineRate !== null && baselineDaily !== null) {
      compareHtml += `
        <div class="feed-compare" style="margin-top:15px;">
          <div class="feed-compare__row">
            <span>Tham chiếu (Công thức chuẩn)</span>
            ${buildCompareVal(baselineRate, baselineDaily)}
          </div>
      `;
      const hasLearning = learningSource !== "none" && learningRate !== null && learningDaily !== null && mode === "ai";
      if (hasLearning) {
        const deltaBadge = (!isNaN(learningDelta) && learningDelta !== 0)
          ? `<span class="insight-tag" style="margin-left:4px; font-weight:bold;">
               ${learningDelta > 0 ? "↑ +" : "↓ "}${learningDelta.toFixed(1)}%
             </span>`
          : "";
        compareHtml += `
          <div class="feed-compare__row">
            <span>Điều chỉnh từ lịch sử (AI)</span>
            ${buildCompareVal(learningRate, learningDaily, deltaBadge)}
          </div>
        `;
      }
      compareHtml += `
          <div class="feed-compare__row" style="font-weight:700; color:var(--ink);">
            <span>Kết quả áp dụng cuối cùng</span>
            ${buildCompareVal(finalRate, finalDaily)}
          </div>
        </div>
      `;
    }

    // [MỚI] Block Cảnh báo Thời tiết (Weather Warning)
    let weatherAlert = "";
    if (r.weather_risk && r.weather_risk.level !== 'safe') {
        const isDanger = r.weather_risk.level === 'danger';
        const color = isDanger ? "#d32f2f" : "#f57c00"; 
        const icon  = isDanger ? "thunderstorm" : "thermostat";
        const bg    = isDanger ? "#fdeded" : "#fff3e0";
        
        weatherAlert = `
          <div style="margin-bottom:15px; padding:12px; border-radius:8px; background:${bg}; border:1px solid ${color}; display:flex; gap:10px; align-items:start;">
              <span class="material-icons" style="color:${color}; font-size:24px; margin-top:2px;">${icon}</span>
              <div>
                  <div style="font-weight:bold; color:${color}; font-size:14px; margin-bottom:4px;">CẢNH BÁO RỦI RO THỜI TIẾT</div>
                  <div style="font-size:13px; color:#333; line-height:1.4;">${r.weather_risk.message}</div>
              </div>
          </div>
        `;
    }

    // [MỚI] Block Cảnh báo Dư cám (Leftover Insight)
    let insightAlert = "";
    if (r.insight && r.insight.leftover_analysis && r.insight.leftover_analysis.is_issue) {
        insightAlert = `
          <div style="margin-bottom:15px; padding:10px 12px; border-radius:8px; background:#e8f5e9; border:1px solid #2e7d32; font-size:13px; color:#1b5e20; display:flex; align-items:center; gap:8px;">
              <i class="material-icons" style="font-size:18px;">insights</i>
              <div>
                  <b>AI Insight:</b> Hệ thống phát hiện hồ thường xuyên <b>dư cám</b>. Đã tự động giảm khẩu phần để bảo vệ nước.
              </div>
          </div>
        `;
    }

    // Box AI Learning Detail
    let insightBlock = "";
    if (r.insight && typeof r.insight === "object" && mode === "ai") {
      const ins = r.insight;
      const ratioPct = (ins.AvgRatio != null) ? (Number(ins.AvgRatio) * 100).toFixed(1) : null;
      const growth   = (ins.GrowthPct != null) ? Number(ins.GrowthPct).toFixed(1) : null;
      const deltaRaw = (ins.SuggestedDeltaPct != null) ? Number(ins.SuggestedDeltaPct) : null;

      let inner = "";
      if (ins.FromDate && ins.ToDate) {
        const fromLabel = formatDateDMY(ins.FromDate);
        const toLabel   = formatDateDMY(ins.ToDate);
        inner += `<div>Khoảng thời gian AI học: <b>${fromLabel}</b> → <b>${toLabel}</b> (${ins.Days || "-"} ngày, ${ins.Samples || "-"} cữ ăn)</div>`;
      }
      if (ratioPct) {
        inner += `<div>Tỷ lệ thực tế / đề xuất trung bình ≈ <b>${ratioPct}%</b></div>`;
      }

      if (deltaRaw !== null && !isNaN(deltaRaw) && deltaRaw !== 0) {
        const dir    = deltaRaw > 0 ? "tăng" : "giảm";
        const arrow  = deltaRaw > 0 ? "↑" : "↓";
        const absPct = Math.abs(deltaRaw).toFixed(1);
        inner += `
          <div>=> AI đề xuất ${dir} nhẹ <b>${absPct}%</b> so với công thức chuẩn
            <span class="insight-tag" style="margin-left:4px;">${arrow} ${deltaRaw > 0 ? "+" : "-"}${absPct}%</span>
          </div>`;
      }

      // Chỉ chèn AdviceText khi là cảnh báo quan trọng
      if (ins.WarningCode === "overfeed_no_growth" && ins.AdviceText) {
        inner += `<div style="margin-top:4px; font-weight:600; color:#e67e22;">${ins.AdviceText}</div>`;
      }

      insightBlock = `
        <div class="insight-box" style="margin-top:15px;">
          <div class="insight-box__head">
            <span class="material-icons">analytics</span>
            <span>Chi tiết phân tích AI (Feeding Insight)</span>
          </div>
          <div class="insight-box__body">
            ${inner}
          </div>
        </div>
      `;
    }

    // Cảnh báo Cache
    let warningBlock = "";
    if ((r.ai_warning || cached) && mode === "ai") {
      const raw = r.ai_warning || "";
      const warnSafe = String(raw).replace(/[<>&]/g, s => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[s]));
      const msg = warnSafe || "Kết quả được lấy từ bộ nhớ đệm (Cache) để tối ưu tốc độ.";
      warningBlock = `
        <div class="hint" style="color:#c0392b; margin-top:10px; font-size:12px;">
          ⚠ ${msg}
          ${cached ? ' <span class="insight-tag">Cached</span>' : ''}
        </div>
        <div style="margin-top:10px; text-align:center">
          <button id="btn-recalc-no-cache" class="btn btn-outline-gray btn-xs">
            <span class="material-icons" style="font-size:14px;">refresh</span>
            Tính lại (Bỏ qua Cache)
          </button>
        </div>
      `;
    }

    const recText = r.recommendation || "";

    // HTML Main Render
    const html = `
      ${weatherAlert} <!-- Ưu tiên hiện cảnh báo thời tiết -->
      ${insightAlert} <!-- Tiếp theo là cảnh báo dư cám -->
      
      <div class="result-box">
        <div class="result-head">
          <span>Kết quả tính toán</span>
          <span style="float:right">
            <span class="mode-pill-tag" data-mode="${mode}" style="text-transform:uppercase;">${modeLabel}</span>
            ${cached && mode === "ai" ? '<span class="insight-tag" style="margin-left:6px;">Cache</span>' : ''}
          </span>
        </div>
        
        <div class="feed-meta">
          <div>🔢 Tỷ lệ ăn: <span class="num" style="font-size:16px;">${finalRate.toFixed(2)} % trọng lượng/ngày</span></div>
          <div>🍽️ Tổng/ngày: <span class="num" style="font-size:16px; color:var(--primary);">${finalDaily.toFixed(1)} g</span></div>
        </div>
        
        ${metaSecondRow}
        ${compareHtml}
        
        <table style="margin-top:15px; width:100%; border-collapse:collapse;">
          <tr style="background:#f8f9fa; color:#666; font-size:13px;">
            <th style="padding:8px; border:1px solid #eee;">Cữ</th>
            <th style="padding:8px; border:1px solid #eee; text-align:center;">Khung giờ</th>
            <th style="padding:8px; border:1px solid #eee; text-align:center;">Lượng (g)</th>
          </tr>
          ${tbl}
        </table>
        
        ${recText ? `<div class="hint" style="margin-top:12px; font-style:italic; color:#555;">💡 Lời khuyên: ${recText}</div>` : ""}
      </div>
      
      ${insightBlock}
      ${warningBlock}
    `;

    $("#feed-result-body").html(html);
  }

  // Hàm gọi API tính toán (Core Function)
  async function calculateFeeding(forceRefresh = false) {
    if (!selectedPond) {
      pushToast("Vui lòng chọn hồ cá trước!", "error");
      return;
    }

    // 1. Lấy Input từ Form
    const mode = $('input[name="calc-mode"]:checked').val() || "ai";
    const manualSource = $("#manual-source").val() || "percent";
    const manualValue  = parseFloat($("#manual-value").val() || "0");

    const fishCount = parseInt($("#fish-count").val() || "0", 10);
    const avgWeight = parseFloat($("#avg-weight").val() || "0");
    const inputTemp = parseFloat($("#water-temp").val() || "0");
    // [MỚI V6.2] Lấy Protein để gửi đi check cho Manual Mode
    const proteinPct = parseFloat($("#protein-pct").val() || "35");

    // 2. SANITY CHECK FRONTEND (Kiểm tra dữ liệu đầu vào)
    // Ngăn chặn việc gửi request nếu dữ liệu quá ảo
    if (fishCount <= 0 || avgWeight <= 0) {
      pushToast("Dữ liệu cá không hợp lệ (số lượng hoặc cân nặng phải > 0).", "error");
      // Không set HTML lỗi ở đây để tránh xóa mất form nếu user chỉ nhập thiếu
      return; 
    }
    if (avgWeight > 60) {
      pushToast(`Trọng lượng trung bình ${avgWeight}kg là quá lớn.`, "error");
      return;
    }
    // [MODIFIED] Giảm mức trần nhiệt độ từ 42 xuống 36 theo yêu cầu (Cá koi không chịu nổi trên 35-36)
    if ($("#water-temp").val() !== "") {
       if (inputTemp > 36) { // Đã sửa 42 -> 36
         pushToast("Nhiệt độ quá cao (>36°C), không an toàn cho cá ăn!", "error");
         return; 
       }
       if (inputTemp < -2) {
         pushToast("Nhiệt độ không được âm quá sâu!", "error");
         return; 
       }
    }

    // Manual Check riêng
    if (mode === "manual") {
      if (!manualValue || isNaN(manualValue) || manualValue <= 0) {
        pushToast("Hãy nhập giá trị khẩu phần cho chế độ Manual Pro.", "error");
        return;
      }
    }

    // 3. Nếu qua hết check, mới hiện Loading và Mở Modal
    $("#feed-result-body").html(`
      <div style="text-align:center; padding:30px;">
        <div class="spinner"></div>
        <div class="hint">Đang phân tích dữ liệu môi trường & AI...</div>
      </div>`);
    $("#btn-save-plan").hide();
    openModal("#feed-result-modal");

    // 4. [QUAN TRỌNG] Lấy thời tiết (Async)
    const weatherData = await fetchWeatherData();

    const payload = {
      pond_id: Number(selectedPond),
      objective:  $("#feed-objective").val(),
      protein_pct: proteinPct, // Gửi lên
      water_temp: inputTemp,
      avg_weight: avgWeight,
      fish_count: fishCount,
      note: $("#feed-note").val() || "",
      mode: mode,
      weather_forecast: weatherData // Gửi kèm thời tiết
    };

    if (mode === "manual") {
      payload.manual_source = manualSource;
      payload.manual_value  = manualValue;
      const meals = [];
      $(".manual-meal-time").each(function () {
        const idx = Number($(this).data("idx"));
        const time = this.value || "";
        const ratioInput = $(`.manual-meal-ratio[data-idx='${idx}']`)[0];
        const rVal = ratioInput ? parseFloat(ratioInput.value || "0") : 0;
        const label = $(this).closest(".feed-field").find("label").first().text() || `Cữ ${idx + 1}`;
        meals.push({ index: idx + 1, label: label, time: time, ratio: isNaN(rVal) ? 0 : rVal });
      });
      if (meals.length) payload.manual_meals = meals;
    }

    if (forceRefresh) payload.force_refresh = 1;

    // 5. Gửi Request Ajax
    $.ajax({
      url: apiBase + "feeding_advisor.php",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
      success: function (res) {
        if (!res.success) {
          pushToast(res.error || "Tính toán thất bại", "error");
          $("#feed-result-body").html(`<div class="hint" style="color:var(--red); font-weight:bold; padding:10px;">❌ Lỗi: ${res.error || "Không xác định"}</div>`);
          $("#btn-save-plan").hide();
          return;
        }
        // Lưu kết quả để dùng cho nút Save
        calcResult = Object.assign({}, res, {
          pond_id:    payload.pond_id,
          objective:    payload.objective,
          protein_pct:  payload.protein_pct,
          water_temp:   payload.water_temp,
          avg_weight:   payload.avg_weight,
          fish_count:   payload.fish_count,
          note:         payload.note,
          mode:         payload.mode
        });
        
        renderCalcResult(calcResult);
        $("#btn-save-plan").show();
      },
      error: function (xhr) {
        let msg = "Lỗi kết nối máy chủ";
        if (xhr.responseJSON && xhr.responseJSON.error) msg = xhr.responseJSON.error;
        pushToast(msg, "error");
        $("#feed-result-body").html(`<div class="hint" style="color:var(--red); padding:10px;">❌ ${msg}</div>`);
        $("#btn-save-plan").hide();
      }
    });
  }

  // Hàm xử lý lưu kế hoạch (Tách riêng để tái sử dụng)
  function executeSavePlan(planningDate = null) {
      if (!calcResult) return;
      
      const btn = $("#btn-save-plan");
      const originalText = btn.html();
      btn.prop("disabled", true).html('<div class="spinner-sm"></div> Đang lưu...');
      
      // Nếu có ngày chỉ định (ngày mai), thêm vào payload
      const payload = Object.assign({}, calcResult);
      if (planningDate) {
          payload.planning_date = planningDate;
      }

      $.ajax({
          url: apiBase + "create_plan.php",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(payload),
          success: function (res) {
              btn.prop("disabled", false).html(originalText);
              if (res.success) {
                  closeModal("#feed-result-modal");
                  closeModal("#feed-planner-modal");
                  
                  if (planningDate) {
                      pushToast(`Đã lưu kế hoạch cho ngày mai (${formatDateDMY(planningDate)}).`, "success");
                  } else {
                      pushToast("Đã lưu kế hoạch cho ăn.", "success");
                  }
                  
                  loadPlans(true); // Reload list
                  if (res.plan_id) {
                      openPlanDetail(res.plan_id); // Mở chi tiết plan vừa tạo
                  }
              }
          },
          error: function (xhr, status, error) {
              btn.prop("disabled", false).html(originalText);
              let msg = "Không thể lưu kế hoạch";
              if (xhr.responseJSON && xhr.responseJSON.error) {
                  msg = xhr.responseJSON.error;
              }
              pushToast(msg, "error", 5000);
          }
      });
  }

  // Hàm Wrapper khi bấm nút Save: Thêm Logic kiểm tra lịch sử trong ngày
  function savePlan() {
    if (!calcResult) {
      pushToast("Chưa có dữ liệu kế hoạch để lưu", "error");
      return;
    }

    // [NEW LOGIC - FIX BUG] Kiểm tra xem HỒ NÀY (selectedPond) đã có kế hoạch "Done" hôm nay chưa
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneToday = historyPlans.some(p => {
        // Lấy ngày từ CreatedAt (YYYY-MM-DD HH:MM:SS) -> YYYY-MM-DD
        const pDate = p.CreatedAt ? p.CreatedAt.split(' ')[0] : '';
        // Kiểm tra 3 điều kiện: Cùng ngày, Đã xong, VÀ CÙNG HỒ (Quan trọng)
        return pDate === todayStr && p.Status === 'done' && String(p.PondID) === String(selectedPond);
    });

    if (doneToday) {
        showConfirm(
            "Đã hoàn thành cữ hôm nay", 
            "Hôm nay bạn đã cho ăn hồ này rồi. Bạn có muốn lưu kế hoạch cho <b>hôm sau (Ngày mai)</b> không?",
            function() {
                // Tính toán ngày mai
                const tmr = new Date();
                tmr.setDate(tmr.getDate() + 1);
                // Định dạng YYYY-MM-DD
                const tmrStr = tmr.toISOString().slice(0, 10);
                
                // Gọi lưu với ngày mai
                executeSavePlan(tmrStr);
            }
        );
        // Nếu user hủy confirm, không làm gì cả (tránh double save)
        return; 
    }
    
    // Nếu chưa xong hôm nay, lưu bình thường
    executeSavePlan(null);
  }

  // ===========================================================================
  // 9. HISTORY & ACTIONS (LỊCH SỬ VÀ THAO TÁC KHÁC)
  // ===========================================================================

  function openHistory() {
    openModal("#feed-history-modal");
    
    // Sử dụng historyPlans đã được load từ hàm loadPlans (đã filter theo pond)
    const all       = historyPlans; // Đây là danh sách đã filter theo hồ hiện tại
    const done      = all.filter(p => p.Status === "done");
    const cancelled = all.filter(p => p.Status === "cancelled");
    
    const renderList = (arr, isHistory = true) => arr.map(p => `
      <div class="history-card">
        <div class="history-row" style="display:flex;justify-content:space-between">
          <span class="id" style="font-family:monospace; color:#666;">#${p.PlanID}</span>${statusPill(p.Status)}
        </div>
        <div class="title">${p.PondName || "Hồ"} • ${p.Objective}</div>
        <div class="meta">Tổng/ngày: <b>${p.DailyFeedGrams}</b> g</div>
        <div class="meta" style="font-size:11px; color:#999;">${formatDateDMY(p.CreatedAt)}</div>
        <div class="actions">
          <button class="btn btn-outline-gray btn-xs act-plan-detail" data-id="${p.PlanID}">
            <span class="material-icons">visibility</span> Xem chi tiết
          </button>
          ${isHistory ? `
          <button class="btn btn-danger btn-xs act-delete-plan" data-id="${p.PlanID}" title="Xóa khỏi lịch sử">
              <span class="material-icons">delete</span>
          </button>` : ''}
        </div>
      </div>`).join("") || `<i style="color:#999; font-size:13px;">(Trống)</i>`;
    
    const box = $("#feed-history-list");
    box.html(`
      <div class="history-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><h4 style="font-size:14px; color:var(--ink);">Đã hoàn tất</h4>${renderList(done)}</div>
        <div><h4 style="font-size:14px; color:var(--ink);">Đã hủy</h4>${renderList(cancelled)}</div>
      </div>`);
  }

  function markPlanDone(planId) {
    $.post(apiBase + "mark_done.php", { plan_id: planId }, function (res) {
      if (!res.success) {
        pushToast(res.error || "Không thể đánh dấu hoàn tất", "error");
        return;
      }
      pushToast("Kế hoạch đã hoàn tất.", "success");
      loadPlans(true);
      if ($("#feed-detail-modal").css("display") !== "none") {
        closeModal("#feed-detail-modal");
      }
    });
  }

  function cancelPlan(planId) {
    $.post(apiBase + "cancel_plan.php", { plan_id: planId }, function (res) {
      if (!res.success) {
        pushToast(res.error || "Không thể hủy", "error");
        return;
      }
      pushToast("Đã hủy kế hoạch.", "success");
      loadPlans(true); // Load lại danh sách, sidebar sẽ cập nhật đúng mà không mất các hồ khác
      if ($("#feed-detail-modal").css("display") !== "none") {
        closeModal("#feed-detail-modal");
      }
    });
  }

  // [NEW] Hàm xóa mềm kế hoạch
  function deletePlanHistory(planId) {
      $.post(apiBase + "soft_delete_plan.php", { plan_id: planId }, function (res) {
          if (!res.success) {
              pushToast(res.error || "Xóa thất bại", "error");
              return;
          }
          pushToast("Đã xóa kế hoạch khỏi lịch sử.", "success");
          
          // Refresh lại list và mở lại modal lịch sử
          loadPlans(true);
          // Cần đợi 1 chút để loadPlans chạy xong hoặc gọi thủ công cập nhật UI
          setTimeout(openHistory, 300); 
      });
  }

  function saveEventRow(eventId) {
    const given    = Number($(`.amountGiven[data-id='${eventId}']`).val() || 0);
    const obs      = $(`.obsSelect[data-id='${eventId}']`).val() || "";
    const leftover = $(`.leftoverFlag[data-id='${eventId}']`).is(":checked") ? 1 : 0;

    $.ajax({
      url: apiBase + "update_event.php",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        event_id: eventId,
        amount_given: given,
        observation: obs,
        leftover_flag: leftover
      }),
      success: function (res) {
        if (!res.success) {
          pushToast(res.error || "Cập nhật thất bại", "error");
          return;
        }

        const btn = document.querySelector(`.act-save-event[data-id='${eventId}']`);
        if (btn) {
          btn.outerHTML = `<button class="btn btn-xs" style="background:transparent; color:var(--green); border:none; cursor:default; font-weight:bold;"><span class="material-icons" style="font-size:16px;">check</span> Đã lưu</button>`;
        }

        if (res.all_done) {
          pushToast("Đã lưu toàn bộ cữ ăn. Kế hoạch hoàn tất!", "success");
          loadPlans(true);
          closeModal("#feed-detail-modal");
        } else {
          pushToast("Đã cập nhật cữ ăn.", "success");
        }
      }
    });
  }
  function checkUrlParams() {
      // Parse Query String
      const urlParams = new URLSearchParams(window.location.search);
      const planId = urlParams.get('plan_id');
      
      // Nếu có plan_id trên URL, tự động mở modal chi tiết
      if (planId) {
          // Xóa param khỏi URL để tránh mở lại khi reload (Optional, giữ lại cũng không sao)
          // window.history.replaceState(null, null, window.location.pathname); 
          
          openPlanDetail(planId);
      }
  }
  // ===========================================================================
  // 10. INITIALIZATION & EVENT BINDINGS (KHỞI TẠO)
  // ===========================================================================

  bindPersistedSelect("#auto-open", SKEY.autoOpen, "no");

  $("#pond-select").on("change", function () {
    selectedPond = $(this).val() || "";
    setLastPond(selectedPond);
    suggestionShown = false; 
    if (selectedPond) {
        afterSelectPond();
        loadPlans(true);
    }
  });

  $("#btn-refresh-plans").on("click", function () {
    rightOpen = !rightOpen;
    $("#feed-right-panel").toggle(rightOpen);
    if (rightOpen) loadPlans(true);
  });

  $("#btn-open-planner").on("click", openPlanner);
  $("#btn-open-history").on("click", openHistory);

  $("#btn-calc-feed").on("click", function () {
    calculateFeeding(false);
  });
  $("#btn-save-plan").on("click", savePlan);

  // Toggle Mode AI / Manual
  $(document).on("change", 'input[name="calc-mode"]', function () {
    const mode = $('input[name="calc-mode"]:checked').val() || "ai";
    const showManual = mode === "manual";
    $("#manual-rate-wrap").toggleClass("hidden", !showManual);
    if (showManual) {
      updateManualSourceUI();
      renderManualMeals();
    }
  });

  $(document).on("change", "#manual-source", updateManualSourceUI);
  $(document).on("change", "#manual-meals-count, #manual-meals-preset", renderManualMeals);

  // Nút Done All
  $("#btn-done-all").on("click", function () {
    if (!viewingPlanId) {
      pushToast("Chưa chọn kế hoạch", "error");
      return;
    }
    showConfirm("Xác nhận hoàn thành", "Bạn có chắc chắn muốn đánh dấu toàn bộ kế hoạch này là đã xong?", () => markPlanDone(viewingPlanId));
  });

  // Delegated events cho các nút sinh ra động
  $(document).on("click", ".act-plan-detail", function () {
    const id = $(this).data("id");
    const inHistory = $(this).closest("#feed-history-modal").length > 0;
    if (inHistory) closeModal("#feed-history-modal");
    openPlanDetail(id, inHistory);
  });

  $(document).on("click", ".act-plan-done", function () {
    const id = $(this).data("id");
    showConfirm("Xác nhận", "Đánh dấu hoàn tất kế hoạch này?", () => markPlanDone(id));
  });

  $(document).on("click", ".act-plan-cancel", function () {
    const id = $(this).data("id");
    showConfirm("Hủy kế hoạch", "Bạn có chắc muốn hủy kế hoạch này không?", () => cancelPlan(id));
  });

  // [NEW] Sự kiện xóa plan
  $(document).on("click", ".act-delete-plan", function() {
      const id = $(this).data("id");
      showConfirm("Xóa lịch sử", "Bạn có chắc chắn muốn xóa bản ghi này? (Dữ liệu sẽ không còn được dùng để AI học)", () => deletePlanHistory(id));
  });

  $(document).on("click", ".act-save-event", function () {
    saveEventRow($(this).data("id"));
  });

  $(document).on("click", "#btn-recalc-no-cache", function () {
    $("#feed-result-body").html(`
      <div style="text-align:center; padding:20px;">
        <div class="spinner"></div>
        <div class="hint">Đang tính lại (bỏ qua Cache)...</div>
      </div>
    `);
    calculateFeeding(true);
  });

  // Ẩn bớt 2 ô input không cần thiết nếu đã có auto fill
  const $avgLabel  = $("#avg-weight").closest("label");
  const $countLabel = $("#fish-count").closest("label");
  // $avgLabel.hide(); // Comment lại nếu muốn user tự sửa
  // $countLabel.hide();

  // Thêm dòng chú thích nhỏ
  const autoInfoHtml = `
    <div id="auto-fish-note" style="grid-column:1/-1; margin-top:4px; font-size:12px; color:#777; font-style:italic;">
      <i class="material-icons" style="font-size:12px; vertical-align:middle;">info</i>
      Dữ liệu cá được lấy tự động từ hồ sơ. Bạn có thể sửa thủ công nếu cần.
    </div>`;
  const $formGrid = $(".form-grid").first();
  if ($formGrid.length && !$("#auto-fish-note").length) {
    $formGrid.append(autoInfoHtml);
  }

  // --- STARTUP LOGIC ---

  loadPonds();
  loadPlans(true);

  updateManualSourceUI();
  renderManualMeals();
  // [NEW] Kiểm tra URL xem có yêu cầu mở Plan cụ thể không (Deep Linking)
  checkUrlParams();
  // Logic tự mở nếu user cài đặt
  const shouldAuto = (localStorage.getItem(SKEY.autoOpen) || "no") === "yes";
  if (shouldAuto) {
    const waitPond = setInterval(() => {
      const val = $("#pond-select").val();
      if (val) {
        selectedPond = val;
        clearInterval(waitPond);
        afterSelectPond();
        setTimeout(openPlanner, 300);
      }
    }, 200);
    // Timeout an toàn
    setTimeout(() => {
      if (!$("#pond-select").val()) {
        // pushToast("Hãy chọn hồ để bắt đầu", "info");
      }
    }, 2000);
  }

  // Auto refresh danh sách plan mỗi 60s
  setInterval(() => {
    if (rightOpen) loadPlans(true);
  }, 60000);

});