/* ==========================================================================
   FILE: /HeThongChamSocCaKoi/assets/js/customer/salt.js
   MODULE: Salt Expert System (Hệ thống tính toán muối chuyên sâu)
   
   VERSION: V13.3 - COMPLETE BUG FIXES & UX ENHANCEMENT
   BASE: V13.2 (Previous Fixes)
   
   CHANGELOG V13.3:
   1. ✅ FIX: Event Delegation for Plan Detail (Click icon bug) - Dùng closest('button')
   2. ✅ FIX: Modal Measurement Z-Index/Layout - Thêm CSS overlay chuẩn
   3. ✅ FIX: 'savePlanToServer' ReferenceError (Đã di chuyển lên trên)
   4. ✅ UX: Fixed Weather Warning Position - Cố định vị trí trong template
   5. ✅ UX: Redesigned Contraindication Checklist (Expert Card Style)
   
   AUTHOR: KoiCare System Dev Team
   ========================================================================== */

(function () {
  'use strict';

  // ===========================================================================
  // 1. DOM ELEMENTS & GLOBAL CONFIGURATION
  // ===========================================================================
  
  // Main Controls
  const ddlPond = document.getElementById('pond-select');
  const autoOpen = document.getElementById('auto-open');
  
  // Action Buttons
  const btnOpenPlanner = document.getElementById('btn-open-planner');
  const btnRefreshPlans = document.getElementById('btn-refresh-plans');
  const btnOpenHistory = document.getElementById('btn-open-history');
  
  // Dashboard Panels
  const mini = document.getElementById('salt-plans-mini');
  const brief = document.getElementById('pond-brief');
  const pondImg = document.getElementById('pond-img');
  const pondName = document.getElementById('pond-name');
  const pondInfo = document.getElementById('pond-info');

  // Detail Modal Elements
  const detailModal = document.getElementById('salt-detail-modal');
  const detailBody = document.getElementById('salt-detail-body');
  const btnDoneAll = document.getElementById('btn-done-all');

  // History Modal Elements
  const historyModal = document.getElementById('salt-history-modal');
  const historyList = document.getElementById('salt-history-list');

  // Planner Modal Elements
  const plannerModal = document.getElementById('salt-planner-modal');
  const btnCalc = document.getElementById('btn-calc-salt');
  const resultModal = document.getElementById('salt-result-modal');
  const resultBody = document.getElementById('salt-result-body');
  const btnSavePlan2 = document.getElementById('btn-save-plan-2');

  // Input Fields
  const selMode = document.getElementById('plan-mode');
  const inpTarget = document.getElementById('target-salinity');
  const inpCurrent = document.getElementById('current-salinity');
  const inpVolume = document.getElementById('pond-volume');
  const selFragile = document.getElementById('fragile');
  const txtNote = document.getElementById('plan-note');
  const inpSourceSalinity = document.getElementById('source-salinity');
  const sourceWaterField = document.querySelector('.source-water-field');

  // Dynamic Elements
  let measureModal = null;
  let measureStepId = null;
  
  // Weather & Context Cache
  let weatherCache = null;
  let currentPondTemp = null; 
  
  // State Management
  let ponds = [];
  let selectedPond = null;

  // ===========================================================================
  // 2. SAFETY CONSTANTS & CONFIGURATION (EXPERT STANDARD)
  // ===========================================================================
  const SAFETY_LIMITS = {
    // --- Basic Thresholds ---
    MAX_ABSOLUTE: 0.7,          // 0.7% (7‰)
    WARNING_THRESHOLD: 0.3,     // 0.3% (3‰)
    
    // --- [V12 EXPERT] Emergency Thresholds ---
    HIGH_SALINITY_WARN: 0.6,    // > 0.6% (Cảnh báo cam)
    EMERGENCY_START: 0.9,       // > 0.9% (Cấp cứu mức 1)
    LETHAL_LIMIT: 1.5,          // > 1.5% (Tử vong)
    INPUT_CAP: 5.0,             // > 5.0% (Chặn rác)

    // --- Environment ---
    TEMP_COLD_WARNING: 12.0,    // < 12°C (Bỏng lạnh)

    // --- Limits ---
    MAX_DELTA_PER_STEP: 0.2,
    FRY_SAFE_MAX: 0.15,
    PLANTS_SAFE_MAX: 0.10,
    BOTH_SAFE_MAX: 0.10,
    
    // --- Modes ---
    MAINTENANCE: { min: 0.10, max: 0.20, ideal: 0.15 },
    ANTI_NITRITE: { min: 0.20, max: 0.30, ideal: 0.25 },
    TREATMENT: { min: 0.30, max: 0.50, ideal: 0.40 },
    INTENSIVE: { min: 0.40, max: 0.50, ideal: 0.45 },
    
    // --- Ramp & Change ---
    MAX_RAMP_NORMAL: 1.00,
    MAX_RAMP_FRAGILE: 0.50,
    MAX_RAMP_INTENSIVE: 2.00,
    MAX_WATER_CHANGE_NORMAL: 0.30,
    MAX_WATER_CHANGE_FRAGILE: 0.20,
    MAX_DESALTING_SAFE: 0.15 
  };

  const MODE_ALIASES = {
    main: 'maintenance',
    stabilize: 'maintenance',
    nitrite: 'anti_nitrite',
    hospital: 'intensive',
    treat: 'treatment',
    treatment: 'treatment',
    intensive: 'intensive'
  };

  // ===========================================================================
  // 3. NOTIFICATION SYSTEM
  // ===========================================================================
  class NotificationSystem {
    constructor() {
      this.container = this.initContainer();
      this.activeToasts = new Set();
    }

    initContainer() {
      let container = document.getElementById('salt-toast');
      if (!container) {
        container = document.createElement('div');
        container.id = 'salt-toast';
        document.body.appendChild(container);
      }
      return container;
    }

    show(message, type = 'info', duration = 3000) {
      this.activeToasts.forEach(toast => {
        if (toast.getAttribute('data-type') === type && 
            toast.querySelector('.toast-msg').textContent === message) {
          this.removeToast(toast);
        }
      });

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('data-type', type);
      
      const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        danger: 'error'
      };

      toast.innerHTML = `
        <span class="material-icons">${icons[type]}</span>
        <div class="toast-msg">${message}</div>
        <button class="toast-x">&times;</button>
      `;

      this.container.appendChild(toast);
      this.activeToasts.add(toast);

      toast.querySelector('.toast-x').addEventListener('click', () => {
        this.removeToast(toast);
      });

      if (duration > 0) {
        setTimeout(() => this.removeToast(toast), duration);
      }
      return toast;
    }

    removeToast(toast) {
      if (!toast.parentNode) return;
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode === this.container) {
          this.container.removeChild(toast);
        }
        this.activeToasts.delete(toast);
      }, 300);
    }

    showError(message) { return this.show(message, 'danger', 5000); }
    showSuccess(message) { return this.show(message, 'success', 3000); }
    showWarning(message) { return this.show(message, 'warning', 4000); }
  }

  const notify = new NotificationSystem();

  // ===========================================================================
  // 4. HELPER FUNCTIONS
  // ===========================================================================
  
  function showCustomConfirm(message, title, onConfirm) {
      if (window.showConfirm) {
          window.showConfirm(message, onConfirm, title);
      } else {
          if (confirm(message.replace(/<[^>]*>?/gm, ''))) {
              onConfirm();
          }
      }
  }

  const utils = {
    clamp: (v, min, max) => Math.min(Math.max(v, min), max),
    toNum: (v, def = 0) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : def;
    },
    fmtInt: v => Math.round(+v || 0).toLocaleString('vi-VN'),
    fmtGram: g => `${Math.round(g).toLocaleString('vi-VN')} g`,
    fmtPct: p => `${(+p).toFixed(2)}%`,
    gramsForDeltaPercent: (dPct, volL) => Math.max(0, dPct) * 10 * volL,
    pad: n => n.toString().padStart(2, '0'),
    fmtView: ts => {
      if (!ts) return '-';
      const d = new Date(ts);
      return `${utils.pad(d.getDate())}/${utils.pad(d.getMonth() + 1)}/${d.getFullYear()} ${utils.pad(d.getHours())}:${utils.pad(d.getMinutes())}`;
    },
    fmtSql: ts => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${utils.pad(d.getMonth() + 1)}-${utils.pad(d.getDate())} ${utils.pad(d.getHours())}:${utils.pad(d.getMinutes())}:${utils.pad(d.getSeconds())}`;
    },
    normMode: m => MODE_ALIASES[m] || m || 'maintenance',
    modeMidpoint: m => {
      const modeKey = m.toUpperCase();
      const range = SAFETY_LIMITS[modeKey] || SAFETY_LIMITS.MAINTENANCE;
      return range.ideal || ((range.min + range.max) / 2);
    },
    getFragileCap: f => {
      return f === 'fry' ? SAFETY_LIMITS.FRY_SAFE_MAX
           : f === 'plants' ? SAFETY_LIMITS.PLANTS_SAFE_MAX
           : f === 'fry_plants' ? SAFETY_LIMITS.BOTH_SAFE_MAX
           : null;
    }
  };

  // ===========================================================================
  // 5. SECURE API CLASS
  // ===========================================================================
  class SecureAPI {
    static async request(endpoint, options = {}) {
        try {
            const headers = { ...options.headers };
            if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
                options.body = JSON.stringify(options.body);
                headers['Content-Type'] = 'application/json';
            }
            const response = await fetch(endpoint, { ...options, headers });
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned invalid JSON');
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Request failed');
            }
            return data;
        } catch (error) {
            console.error('API Error at', endpoint, ':', error);
            throw error;
        }
    }

    // Wrappers
    static async markPlanDone(id) { return this.request(`/HeThongChamSocCaKoi/backend/api/customer/salt/mark_done.php`, { method: 'POST', body: { id } }); }
    static async markStepDone(stepId, measured, note) { return this.request('/HeThongChamSocCaKoi/backend/api/customer/salt/mark_step_done.php', { method: 'POST', body: { step: stepId, measured, note } }); }
    static async cancelPlan(id) { return this.request(`/HeThongChamSocCaKoi/backend/api/customer/salt/cancel_plan.php?id=${id}`); }
    static async deletePlan(id) { return this.request(`/HeThongChamSocCaKoi/backend/api/customer/salt/delete_plan.php?id=${id}`); }
    static async getPlan(id) { return (await this.request(`/HeThongChamSocCaKoi/backend/api/customer/salt/get_plan.php?id=${id}`)).data; }
    static async listPlans(status = 'active', limit = 200) { return (await this.request(`/HeThongChamSocCaKoi/backend/api/customer/salt/list_plans.php?status=${status}&limit=${limit}`)).data; }
    static async createPlan(data) { return this.request('/HeThongChamSocCaKoi/backend/api/customer/salt/create_plan.php', { method: 'POST', body: data }); }
    
    // Optimized Fetch
    static async getLatestSalinity(pondId) {
        try {
            const data = await this.request(`/HeThongChamSocCaKoi/backend/api/customer/water_params/lastest.php?pond_id=${pondId}`);
            return data.item;
        } catch (e) {
            try {
                const list = await this.request(`/HeThongChamSocCaKoi/backend/api/customer/water_params/list.php`);
                const arr = Array.isArray(list) ? list : (list.data || []);
                return arr.find(x => String(x.PondID) === String(pondId));
            } catch (inner) {
                return null;
            }
        }
    }
  }

  // ===========================================================================
  // 6. SAVE PLAN TO SERVER FUNCTION (MOVED UP TO FIX REFERENCE ERROR)
  // ===========================================================================
  async function savePlanToServer(planData, pondId, originalText) {
    try {
        console.log("Plan data received:", planData);
        
        // Map data for API payload
        const stepsForPayload = planData.reduce
            ? (planData.steps || []).map(s => ({
                StepIndex: s.StepIndex || s.Index || 1,
                ScheduledAt: s.ScheduledAt || null,
                DeltaPercent: s.DeltaPercent || 0,
                ExpectedSaltGrams: s.ExpectedSaltGrams || 0,
                ExpectedPercentAfter: s.ExpectedPercentAfter || null,
                WaterChangeLiters: s.WaterChangeLiters || 0,
                SourceSalinity: s.SourceSalinity || planData.summary.sourceSalinity || 0
            }))
            : (planData.steps || []).map(s => ({
                StepIndex: s.StepIndex,
                ScheduledAt: s.ScheduledAt,
                DeltaPercent: s.DeltaPercent,
                ExpectedSaltGrams: s.ExpectedSaltGrams,
                ExpectedPercentAfter: s.ExpectedPercentAfter,
                WaterChangeLiters: 0,
                SourceSalinity: 0
            }));
        
        console.log("Steps for payload:", stepsForPayload);
        
        // Payload construction
        const payload = {
            PondID: pondId,
            Mode: (planData.summary.mode === 'maintenance' ? 'main'
                : (planData.summary.mode === 'treatment' || planData.summary.mode === 'intensive' ? 'hospital' : 'main')),
            Purpose: (planData.summary.mode === 'maintenance' ? 'stabilize'
                    : planData.summary.mode === 'anti_nitrite' ? 'nitrite' : 'treat'),
            HasFry: (planData.summary.fragile === 'fry' || planData.summary.fragile === 'fry_plants') ? 1 : 0,
            HasPlants: (planData.summary.fragile === 'plants' || planData.summary.fragile === 'fry_plants') ? 1 : 0,
            VolumeLiters: planData.summary.volume,
            StartPercent: planData.summary.current,
            TargetPercent: planData.summary.target,
            SourceWaterSalinity: planData.summary.sourceSalinity || 0,
            StepPercent: planData.totals?.stepPercent || 0.1,
            IntervalHours: planData.summary.intervalHours || 12,
            Note: planData.summary.note || '',
            ReduceByWaterChange: planData.reduce ? 1 : 0,
            Steps: stepsForPayload
        };
        
        if (btnSavePlan2) btnSavePlan2.innerHTML = '<span class="spinner-sm"></span> Đang lưu kế hoạch...';
        
        const result = await SecureAPI.createPlan(payload);
        
        // Success
        notify.showSuccess('Đã lưu kế hoạch điều trị muối');
        
        resultModal.classList.remove('show');
        plannerModal.classList.remove('show');
        
        // Refresh plans list
        setTimeout(() => {
            refreshAllActivePlans();
        }, 500);
        
    } catch (error) {
        console.error('Error saving plan:', error);
        notify.showError('Không thể lưu kế hoạch: ' + (error.message || 'Unknown error'));
        throw error;
    } finally {
        if (btnSavePlan2) {
            btnSavePlan2.disabled = false;
            btnSavePlan2.innerHTML = originalText;
        }
    }
  }

  // ===========================================================================
  // 7. WEATHER SERVICE (EXPERT LEVEL)
  // ===========================================================================
  async function fetchWeatherData() {
    // 1. Check Cache to avoid API spam (Cache duration: 10 minutes)
    if (weatherCache && (Date.now() - weatherCache.timestamp < 600000)) {
        return weatherCache.data;
    }

    // 2. Fetch Fresh Data from Open-Meteo
    return new Promise(function(resolve) {
        if (!navigator.geolocation) {
            console.warn("[Weather] No Geo access.");
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // API URL for Rain Data
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=rain_sum,showers_sum,precipitation_probability_max&timezone=auto`;

                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data && data.daily) {
                        const rainToday = (data.daily.rain_sum && data.daily.rain_sum[0]) || 0;
                        const showersToday = (data.daily.showers_sum && data.daily.showers_sum[0]) || 0;
                        const totalRain = rainToday + showersToday;

                        const result = {
                            total_rain: totalRain,
                            has_rain_risk: totalRain > 5.0, // > 5mm is significant rain for dilution
                            message: totalRain > 5.0 
                                ? `Dự báo mưa ${totalRain.toFixed(1)}mm. Cẩn thận nước tràn làm loãng muối.` 
                                : `Thời tiết tạnh ráo (${totalRain.toFixed(1)}mm).`
                        };
                        
                        weatherCache = { data: result, timestamp: Date.now() };
                        console.log("[Salt Weather]", result);
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error("Weather Fetch Error:", e);
                    resolve(null);
                }
            },
            function(err) {
                console.warn("Geo Error:", err);
                resolve(null); 
            }
        );
    });
  }

  // ===========================================================================
  // 8. MEASUREMENT MODAL SYSTEM (FIXED UI - Z-INDEX & LAYOUT)
  // ===========================================================================
  function createMeasurementModal() {
    if (measureModal) return measureModal;
    
    // [FIX BUG 2] Enhanced CSS for Z-Index Safety & Overlay
    const modalHTML = `
      <div id="salt-measure-modal" class="salt-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: none; z-index: 10600 !important;">
        <div class="salt-modal__backdrop" data-close="1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10601;"></div>
        <div class="salt-modal__container" style="position: relative; z-index: 10602; background: #fff; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 400px; margin: 50px auto; padding: 20px; transform: translateY(0); transition: transform 0.3s ease-out;">
          <div class="salt-modal__header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <h3 style="margin: 0; font-size: 18px; color: #333;">Cập nhật kết quả đo</h3>
            <button class="salt-modal__close" data-close="1" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
          </div>
          <div class="salt-modal__body" style="margin-bottom: 20px;">
            <div class="form-group" style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #444;">Độ mặn đo được sau khi châm (%)</label>
              <input type="number" id="measure-value" step="0.01" min="0" max="10" placeholder="0.00" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; text-align: center; font-weight: bold; box-sizing: border-box;">
              <div class="hint" style="font-size: 12px; color: #666; margin-top: 5px;">Để trống nếu không đo</div>
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #444;">Ghi chú (tùy chọn)</label>
              <textarea id="measure-note" rows="3" placeholder="Ghi chú về bước này..." style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; resize: vertical; min-height: 80px;"></textarea>
            </div>
          </div>
          <div class="salt-modal__footer" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-outline-gray" data-close="1" style="padding: 8px 16px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 4px; cursor: pointer;">Hủy</button>
            <button class="btn btn-primary" id="measure-confirm-btn" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Xác nhận hoàn thành</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    measureModal = document.getElementById('salt-measure-modal');
    
    // Setup modal close handlers
    measureModal.querySelector('.salt-modal__backdrop').addEventListener('click', (e) => {
      if (e.target === measureModal.querySelector('.salt-modal__backdrop')) {
        closeMeasurementModal();
      }
    });
    
    measureModal.querySelectorAll('[data-close="1"]').forEach(btn => {
      btn.addEventListener('click', closeMeasurementModal);
    });
    
    // Confirm button handler
    document.getElementById('measure-confirm-btn').addEventListener('click', async () => {
      await confirmMeasurement();
    });
    
    return measureModal;
  }
  
  function openMeasurementModal(stepId, expectedPercent) {
    measureStepId = stepId;
    const modal = createMeasurementModal();
    const measureInput = document.getElementById('measure-value');
    if (expectedPercent) {
      measureInput.placeholder = expectedPercent.toFixed(2);
    }
    measureInput.value = '';
    document.getElementById('measure-note').value = '';
    
    modal.style.display = 'block';
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.querySelector('.salt-modal__container').style.transform = 'translateY(0)';
      measureInput.focus();
    }, 10);
  }
  
  function closeMeasurementModal() {
    if (measureModal) {
      measureModal.style.opacity = '0';
      measureModal.querySelector('.salt-modal__container').style.transform = 'translateY(-20px)';
      setTimeout(() => {
        measureModal.style.display = 'none';
        measureStepId = null;
      }, 300);
    }
  }
  
  async function confirmMeasurement() {
    if (!measureStepId) return;
    
    const measureInput = document.getElementById('measure-value');
    const noteInput = document.getElementById('measure-note');
    
    const measured = measureInput.value.trim() ? parseFloat(measureInput.value) : null;
    const note = noteInput.value.trim();
    
    // Validation
    if (measured !== null && (measured < 0 || measured > 10)) {
      notify.showError('Độ mặn phải từ 0% đến 10%');
      measureInput.focus();
      return;
    }
    
    try {
      const confirmBtn = document.getElementById('measure-confirm-btn');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner-sm"></span> Đang xử lý...';
      
      await SecureAPI.markStepDone(measureStepId, measured, note);
      
      notify.showSuccess('Đã cập nhật kết quả đo');
      closeMeasurementModal();
      
      // Refresh plan detail via global ID check
      const planId = detailBody.querySelector('.result-head')?.textContent?.match(/#(\d+)/)?.[1];
      if (planId) {
        await openPlanDetail(planId);
      }
      
    } catch (error) {
      console.error('Error confirming measurement:', error);
      notify.showError('Không thể cập nhật kết quả đo');
    } finally {
      const confirmBtn = document.getElementById('measure-confirm-btn');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Xác nhận hoàn thành';
      }
    }
  }

  // ===========================================================================
  // 9. VALIDATION SYSTEM CLASS
  // ===========================================================================
  class ValidationSystem {
    static validateInputs(inputs) {
      const errors = [];
      const warnings = [];

      // [NEW V12] Expert Sanity Check - Chặn rác (> 5%)
      if (inputs.current > SAFETY_LIMITS.INPUT_CAP) {
          errors.push(`Độ mặn hiện tại ${inputs.current}% là quá cao (Max ${SAFETY_LIMITS.INPUT_CAP}%).`);
      }
      if (inputs.target > SAFETY_LIMITS.INPUT_CAP) {
          errors.push(`Mục tiêu ${inputs.target}% là phi thực tế (Max ${SAFETY_LIMITS.INPUT_CAP}%).`);
      }

      // Target safety limit (Standard)
      if (inputs.target > SAFETY_LIMITS.MAX_ABSOLUTE) {
        errors.push(`Mục tiêu không được vượt quá ${SAFETY_LIMITS.MAX_ABSOLUTE}%`);
      }

      // Fragile objects check
      const cap = utils.getFragileCap(inputs.fragile);
      if (cap !== null && inputs.target > cap) {
        warnings.push(`Đối tượng nhạy cảm: nên giảm mục tiêu xuống ${cap}%`);
      }

      // Source water validation (only for reduction)
      if (inputs.target < inputs.current) {
          if (inputs.sourceSalinity >= inputs.current) {
             errors.push('Độ mặn nước nguồn không thể cao hơn độ mặn hiện tại khi muốn giảm.');
          }
          // [V12] Chặn lỗi chia cho 0
          if (Math.abs(inputs.current - inputs.sourceSalinity) < 0.01) {
             errors.push('Độ mặn nước hồ và nước nguồn quá gần nhau, không thể thay nước hiệu quả.');
          }
      }

      // Volume validation
      if (inputs.volume <= 0) {
        errors.push('Thể tích hồ phải lớn hơn 0');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        riskLevel: errors.length > 0 ? 'danger' : warnings.length > 0 ? 'warning' : 'safe'
      };
    }
  }

  // ===========================================================================
  // 10. DOM EVENT HANDLERS & UTILS
  // ===========================================================================
  
  function setupModalHandlers() {
    document.querySelectorAll('.salt-modal').forEach(mod => {
      const backdrop = mod.querySelector('.salt-modal__backdrop');
      
      // Click outside to close
      backdrop?.addEventListener('click', (e) => {
        if (e.target === backdrop || e.target.dataset.close === '1') {
          mod.classList.remove('show');
        }
      });
      
      // Close button click
      mod.querySelectorAll('[data-close]').forEach(b => {
        b.addEventListener('click', () => mod.classList.remove('show'));
      });
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.salt-modal.show').forEach(modal => {
          modal.classList.remove('show');
        });
      }
    });
  }

  function setupFormValidation() {
    // Mode and target changes
    selMode?.addEventListener('change', updateTargetFromMode);
    selFragile?.addEventListener('change', updateTargetFromMode);
    
    // Target validation
    inpTarget?.addEventListener('blur', validateTarget);
    
    // Source salinity visibility
    inpTarget?.addEventListener('input', toggleSourceWaterField);
    inpCurrent?.addEventListener('input', toggleSourceWaterField);
    
    // Source water validation
    inpSourceSalinity?.addEventListener('blur', validateSourceWater);
  }
  
  // [FIX BUG 5] Redesigned Contraindication Checklist (Expert Card UI)
  function renderContraindicationChecklist() {
      const container = document.querySelector('#salt-planner-modal .salt-modal__body');
      if (!container) return;
      
      // Create Warning Box if not exists
      let warnBox = document.getElementById('contra-box');
      if (!warnBox) {
          warnBox = document.createElement('div');
          warnBox.id = 'contra-box';
          warnBox.className = 'expert-warning-box';
          
          // New "Card Style" CSS với Material Design
          warnBox.style.cssText = `
            margin: 20px 0;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 1px solid #dee2e6;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            position: relative;
            overflow: hidden;
          `;
          
          // Thêm decorative element
          const decor = document.createElement('div');
          decor.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(255,152,0,0.05) 100%);
            border-bottom-left-radius: 100%;
          `;
          
          const html = `
            <div class="expert-warning-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                <div style="background: #ff9800; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span class="material-icons" style="color: white; font-size: 24px;">verified_user</span>
                </div>
                <div>
                    <div style="font-weight: 700; color: #333; font-size: 16px; letter-spacing: 0.5px;">AN TOÀN CHUYÊN SÂU</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">Expert Safety Checklist</div>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div class="check-item" style="display: flex; align-items: flex-start; gap: 14px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s; cursor: pointer;" onclick="document.getElementById('check-no-zeolite').click()">
                    <div style="position: relative;">
                        <input type="checkbox" id="check-no-zeolite" style="width: 20px; height: 20px; margin: 0; accent-color: #ff9800; cursor: pointer;">
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="material-icons" style="color: #ff9800; font-size: 18px;">science</span>
                            <div style="font-weight: 600; color: #333; font-size: 14px;">KHÔNG có đá Zeolite trong hồ</div>
                        </div>
                        <div style="font-size: 12px; color: #666; line-height: 1.5;">
                            Zeolite + muối = giải phóng NH3 gây ngộ độc tức thì. Đây là nguyên nhân gây chết cá hàng đầu.
                        </div>
                    </div>
                </div>
                
                <div class="check-item" style="display: flex; align-items: flex-start; gap: 14px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: all 0.2s; cursor: pointer;" onclick="document.getElementById('check-no-formalin').click()">
                    <div style="position: relative;">
                        <input type="checkbox" id="check-no-formalin" style="width: 20px; height: 20px; margin: 0; accent-color: #ff9800; cursor: pointer;">
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="material-icons" style="color: #ff9800; font-size: 18px;">biotech</span>
                            <div style="font-weight: 600; color: #333; font-size: 14px;">KHÔNG có Formalin/Thuốc tím</div>
                        </div>
                        <div style="font-size: 12px; color: #666; line-height: 1.5;">
                            Muối tương tác với hóa chất tạo kết tủa độc hại, gây mất oxy và stress cá nghiêm trọng.
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 16px; padding: 10px; background: #fff8e1; border-radius: 6px; border-left: 3px solid #ff9800;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="material-icons" style="color: #ff9800; font-size: 16px;">info</span>
                    <div style="font-size: 11px; color: #5d4037; line-height: 1.4;">
                        <strong>Lưu ý:</strong> Chỉ cần kiểm tra khi <strong>tăng muối</strong>. Khi giảm muối, các tương tác này không xảy ra.
                    </div>
                </div>
            </div>
          `;
          
          warnBox.innerHTML = html;
          warnBox.appendChild(decor);
          
          // Add hover effects via JavaScript
          const checkItems = warnBox.querySelectorAll('.check-item');
          checkItems.forEach(item => {
              item.addEventListener('mouseenter', function() {
                  this.style.transform = 'translateY(-2px)';
                  this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              });
              item.addEventListener('mouseleave', function() {
                  this.style.transform = 'translateY(0)';
                  this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
              });
          });
          
          // Insert before the Calculate button
          const btnWrap = container.querySelector('.actions-center');
          if (btnWrap) {
              container.insertBefore(warnBox, btnWrap);
          }
      }
  }

  function updateTargetFromMode() {
    if (!selMode || !inpTarget) return;
    
    const mode = utils.normMode(selMode.value);
    let target = utils.modeMidpoint(mode);
    
    const cap = utils.getFragileCap(selFragile?.value);
    if (cap != null) target = Math.min(target, cap);
    
    target = utils.clamp(target, 0.10, SAFETY_LIMITS.MAX_ABSOLUTE);
    inpTarget.value = target.toFixed(2);
    
    // Update source water field visibility
    toggleSourceWaterField();
  }

  function validateTarget() {
    if (!inpTarget) return;
    
    let value = parseFloat(inpTarget.value);
    if (isNaN(value)) {
      updateTargetFromMode();
      return;
    }
    
    const cap = utils.getFragileCap(selFragile?.value);
    const max = cap != null ? Math.min(SAFETY_LIMITS.MAX_ABSOLUTE, cap) : SAFETY_LIMITS.MAX_ABSOLUTE;
    
    value = utils.clamp(value, 0.10, max);
    inpTarget.value = value.toFixed(2);
    
    // Show warning if close to limit
    if (value >= SAFETY_LIMITS.MAX_ABSOLUTE * 0.9) {
      notify.showWarning(`Mục tiêu gần ngưỡng an toàn tối đa (${SAFETY_LIMITS.MAX_ABSOLUTE}%)`);
    }
  }

  function toggleSourceWaterField() {
    if (!inpTarget || !inpCurrent || !sourceWaterField) return;
    
    const target = parseFloat(inpTarget.value) || 0;
    const current = parseFloat(inpCurrent.value) || 0;
    
    // Only show source water field when reducing salinity (water change needed)
    if (target < current) {
      sourceWaterField.classList.remove('hidden');
    } else {
      sourceWaterField.classList.add('hidden');
      inpSourceSalinity.value = '0';
    }
  }

  function validateSourceWater() {
    if (!inpSourceSalinity || !inpCurrent) return;
    
    const source = parseFloat(inpSourceSalinity.value) || 0;
    const current = parseFloat(inpCurrent.value) || 0;
    
    if (source > current) {
      notify.showError('Nước nguồn không thể mặn hơn nước hiện tại');
      inpSourceSalinity.value = '0';
    }
  }

  // ===========================================================================
  // 11. CORE CALCULATION FUNCTIONS (WITH SAFE DESALTING & EMERGENCY)
  // ===========================================================================
  function calculateWaterChangeSteps(current, target, volume, sourceSalinity, isFragile) {
    // [V12 EXPERT] Safe Desalting (Reduced speed)
    let stepCap = isFragile ? SAFETY_LIMITS.MAX_WATER_CHANGE_FRAGILE : SAFETY_LIMITS.MAX_WATER_CHANGE_NORMAL;
    const isReducing = current > target;
    
    if (isReducing) {
        // Giảm nồng độ phải chậm hơn tăng để tránh sốc thẩm thấu ngược
        stepCap = Math.min(stepCap, SAFETY_LIMITS.MAX_DESALTING_SAFE);
    }

    const steps = [];
    let S = current;
    const start = Date.now();
    let i = 1;
    
    // [V10] Prevent infinite loop
    if (sourceSalinity >= current - 0.001) {
      return [];
    }
    
    while (Math.abs(S - target) > 0.001 && steps.length < 20) {
      const rNeeded = (S - target) / (S - sourceSalinity);
      const r = Math.min(stepCap, rNeeded);
      
      if (r <= 0.001) break;
      
      const liters = Math.round(r * volume);
      const after = +(S - (S - sourceSalinity) * r).toFixed(3);
      
      // [V12 EXPERT] If reducing, force 24h interval
      const interval = isReducing ? 24 : 12;
      
      const dt = new Date(start + (i-1) * interval * 3600 * 1000);
      
      steps.push({
        StepIndex: i,
        ScheduledAt: utils.fmtSql(dt),
        ViewAt: utils.fmtView(dt),
        WaterChangeLiters: liters,
        Fraction: r,
        ExpectedPercentAfter: after,
        SourceSalinity: sourceSalinity
      });
      
      S = after;
      i++;
    }
    
    return steps;
  }

  function buildPlan() {
    if (!selMode || !inpTarget || !inpCurrent || !inpVolume || !selFragile) {
      return { 
        ok: false, 
        html: `<div class="result-box"><div class="result-head">⚠️ Thiếu thông tin</div></div>` 
      };
    }
    
    // Collect inputs
    const mode = utils.normMode(selMode.value);
    let target = utils.toNum(inpTarget.value, NaN);
    let current = utils.toNum(inpCurrent.value, 0);
    const volume = Math.max(0, Math.round(utils.toNum(inpVolume.value, 0)));
    const fragile = selFragile.value;
    const isFragile = fragile !== 'none';
    const sourceSalinity = utils.toNum(inpSourceSalinity.value, 0);
    const note = txtNote?.value?.trim() || '';
    
    // [NEW V12] EXPERT CONTRAINDICATION CHECKS
    const checkZeo = document.getElementById('check-no-zeolite');
    const checkForm = document.getElementById('check-no-formalin');
    
    if (target > current) { // Chỉ check khi TĂNG muối
        if (checkZeo && !checkZeo.checked) {
            return { ok: false, html: `<div class="result-box"><div style="color:red; font-weight:bold">⚠️ NGUY HIỂM: Vui lòng xác nhận hồ KHÔNG có đá Zeolite. Muối + Zeolite sẽ giải phóng NH3 giết chết cá.</div></div>` };
        }
        if (checkForm && !checkForm.checked) {
            // SỬA THÀNH:
            notify.showError('⚠️ NGUY HIỂM: Vui lòng xác nhận hồ KHÔNG có Formalin/Thuốc tím!');
            resultModal.classList.remove('show'); // Đóng modal đang xoay spinner (nếu có)
            return { ok: false, html: '' };
        }
    }
    
    // Expert validation
    const validation = ValidationSystem.validateInputs({
      mode: mode,
      target: target,
      current: current,
      volume: volume,
      fragile: fragile,
      sourceSalinity: sourceSalinity
    });
    
    // [NEW V11.2] DYNAMIC EMERGENCY PRO MAX (PHÂN TẦNG CẤP CỨU)
    
    // Case 1: Dữ liệu rác (> 3.0%) -> Báo lỗi
    if (current > 3.0) {
        return {
            ok: false,
            html: `
                <div class="result-box" style="border-left: 5px solid #333; background: #eee;">
                    <div class="result-head" style="color: #333;">⛔ LỖI DỮ LIỆU ĐẦU VÀO</div>
                    <div style="padding: 15px; color: #333;">
                        Độ mặn ${current}% là mức nước biển hoặc cao hơn. Vui lòng kiểm tra lại thiết bị đo hoặc đơn vị nhập liệu.
                    </div>
                </div>`
        };
    }

    // Case 2: Tử vong (> 1.5%) -> Vớt cá (Evacuate)
    if (current >= SAFETY_LIMITS.LETHAL_LIMIT) {
        return {
            ok: false,
            html: `
                <div class="result-box" style="border-left: 5px solid #d32f2f; background: #ffebee;">
                    <div class="result-head" style="color: #d32f2f; display:flex; align-items:center; gap:10px;">
                        <span class="material-icons" style="font-size:28px">gpp_maybe</span>
                        CẢNH BÁO NGUY CƠ TỬ VONG: Độ mặn ${current}%
                    </div>
                    <div style="padding: 15px; font-size: 15px; color: #b71c1c;">
                        <p><strong>CÁ KHÔNG THỂ SỐNG Ở MỨC NÀY QUÁ 2 GIỜ!</strong> Thay nước từ từ là vô nghĩa.</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #ffcdd2;">
                            <strong>HÀNH ĐỘNG DUY NHẤT:</strong>
                            <ul style="margin-top: 5px; margin-left: 20px;">
                                <li>Vớt cá ra ngay lập tức sang tank nước sạch (hoặc độ mặn < 0.5%).</li>
                                <li>Xử lý lại hồ chính (Thay nước 100%).</li>
                            </ul>
                        </div>
                    </div>
                </div>`
        };
    }

    // Case 3: Cấp cứu (0.9% - 1.5%) -> Thay nước mạnh
    if (current >= SAFETY_LIMITS.EMERGENCY_START) {
        return {
            ok: false,
            html: `
                <div class="result-box" style="border-left: 5px solid #d32f2f; background: #ffebee;">
                    <div class="result-head" style="color: #d32f2f; display:flex; align-items:center; gap:10px;">
                        <span class="material-icons" style="font-size:28px">gpp_maybe</span>
                        CẤP CỨU: ĐỘ MẶN ${current}%
                    </div>
                    <div style="padding: 15px; font-size: 15px; color: #b71c1c;">
                        <p><strong>NGUY HIỂM CAO!</strong> Cá sẽ bị sốc thẩm thấu nặng.</p>
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #ffcdd2;">
                            <strong>KHUYẾN NGHỊ:</strong>
                            <ul style="margin-top: 5px; margin-left: 20px;">
                                <li>Thay nước khẩn cấp <strong>30% - 50%</strong> ngay bây giờ.</li>
                                <li>Không rút cạn hồ hoàn toàn để tránh sốc nhiệt/pH kép.</li>
                                <li>Sục khí tối đa.</li>
                            </ul>
                        </div>
                    </div>
                </div>`
        };
    }

    // If validation errors, stop
    if (!validation.valid) {
      const errorHtml = validation.errors.map(e => 
        `<div class="error-alert" style="background:#f8d7da;color:#721c24;padding:10px;border-radius:6px;margin:5px 0;">
          <strong>❌ ${e}</strong>
        </div>`
      ).join('');
      
      return {
        ok: false,
        html: `<div class="result-box">${errorHtml}</div>`
      };
    }
    
    // Check if already at target
    if (Math.abs(target - current) < 0.001) {
      return {
        ok: false,
        html: `
          <div class="result-box">
            <div class="result-head">🎯 Mục tiêu đã đạt: ${utils.fmtPct(current)}</div>
            <div class="hint">Hồ đã đạt độ mặn mục tiêu. Không cần lập kế hoạch mới.</div>
          </div>
        `
      };
    }

    // [FIX BUG 4] Weather Risk Injection - FIXED POSITION IN TEMPLATE
    // Đảm bảo cảnh báo thời tiết luôn ở vị trí cố định sau header
    let weatherWarningHTML = "";
    if (weatherCache && weatherCache.data && weatherCache.data.has_rain_risk) {
        weatherWarningHTML = `
            <div style="margin-bottom:15px; padding:12px; background:#e3f2fd; border:1px solid #2196f3; color:#0d47a1; border-radius:8px; font-size:13px; display:flex; gap:10px; align-items:flex-start;">
                <span class="material-icons" style="font-size:20px; color:#2196f3;">cloud_off</span>
                <div>
                    <div style="font-weight:700; margin-bottom:4px;">CẢNH BÁO THỜI TIẾT</div>
                    <div>${weatherCache.data.message}</div>
                    <div style="font-size:12px; margin-top:4px; opacity:0.9;">Việc đánh muối có thể bị sai lệch do nước mưa làm loãng hoặc tràn hồ.</div>
                </div>
            </div>
        `;
    }
    
    // [NEW V12] Cold Water Warning
    let coldWarningHTML = "";
    if (currentPondTemp !== null && currentPondTemp < SAFETY_LIMITS.TEMP_COLD_WARNING) {
        coldWarningHTML = `
            <div style="margin-bottom:15px; padding:12px; background:#e0f7fa; border:1px solid #00bcd4; color:#006064; border-radius:8px; font-size:13px; display:flex; gap:10px; align-items:flex-start;">
                <span class="material-icons" style="font-size:20px; color:#00bcd4;">ac_unit</span>
                <div>
                    <div style="font-weight:700; margin-bottom:4px;">CẢNH BÁO NHIỆT ĐỘ THẤP</div>
                    <div>Nhiệt độ hồ hiện tại: <strong>${currentPondTemp}°C</strong></div>
                    <div style="font-size:12px; margin-top:4px; opacity:0.9;">Nước lạnh làm giảm khả năng hòa tan oxy. Hãy đảm bảo sục khí cực mạnh khi đánh muối.</div>
                </div>
            </div>
        `;
    }
    
    // REDUCE scenario (water change)
    if (current > target) {
      try {
        const stepsReduce = calculateWaterChangeSteps(current, target, volume, sourceSalinity, isFragile);
        
        if (stepsReduce.length === 0) {
          return {
            ok: false,
            html: `
              <div class="result-box">
                <div class="result-head">⚠️ Không thể giảm độ mặn</div>
                <div class="hint">Nước nguồn không phù hợp để giảm độ mặn.</div>
              </div>
            `
          };
        }
        
        const totalLiters = stepsReduce.reduce((s, x) => s + (x.WaterChangeLiters || 0), 0);
        const totalPercent = ((current - target) / current * 100).toFixed(1);
        
        const table = stepsReduce.map(s => `
          <tr style="text-align: center;">
            <td>Bước ${s.StepIndex}</td>
            <td>${s.ViewAt}</td>
            <td style="text-align: center;">~${(s.Fraction * 100).toFixed(0)}%</td>
            <td class="num" style="text-align: center;">${utils.fmtInt(s.WaterChangeLiters)} L</td>
            <td>${utils.fmtPct(s.ExpectedPercentAfter)}</td>
          </tr>
        `).join('');
        
        // [FIXED POSITION] Warning blocks placed consistently after header, before grid
        const html = `
          <div class="result-box">
            <div class="result-head">🎯 Mục tiêu: giảm từ ${utils.fmtPct(current)} xuống ${utils.fmtPct(target)}</div>
            
            <!-- Warning Blocks (Fixed Position - Always here) -->
            ${weatherWarningHTML}
            ${coldWarningHTML}
            
            <div class="grid-2" style="margin-top: 15px;">
              <div>Thể tích hồ:</div><div>${volume.toLocaleString('vi-VN')} L</div>
              <div>Nước nguồn:</div><div>${utils.fmtPct(sourceSalinity)}</div>
              <div>Khoảng cách giữa các bước:</div><div>24 giờ</div>
              <div>Tổng nước cần thay:</div><div class="num">${utils.fmtInt(totalLiters)} L</div>
              <div>Tổng giảm:</div><div>${totalPercent}% độ mặn</div>
              <div>Số bước:</div><div>${stepsReduce.length} bước</div>
            </div>
            
            <div style="overflow:auto; margin-top:12px">
              <table class="table">
                <thead>
                  <tr style="text-align: center;">
                    <th>Bước</th><th style="text-align: center;">Lịch</th><th style="text-align: center;">Mức thay</th><th style="text-align: center;">Lượng nước</th><th style="text-align: center;">Ước tính sau</th>
                  </tr>
                </thead>
                <tbody>${table}</tbody>
              </table>
            </div>
          </div>
        `;
        
        return {
          ok: true,
          reduce: true,
          stepsReduce: stepsReduce,
          html: html,
          summary: {
            mode: mode,
            target: +target.toFixed(3),
            current: +current.toFixed(3),
            volume: volume,
            sourceSalinity: sourceSalinity,
            fragile: fragile,
            note: note,
            riskLevel: validation.riskLevel
          }
        };
        
      } catch (error) {
        return {
          ok: false,
          html: `
            <div class="result-box">
              <div class="result-head">❌ Lỗi tính toán</div>
              <div class="hint">${error.message}</div>
            </div>
          `
        };
      }
    }
    
    // INCREASE scenario (adding salt)
    else {
      // Calculate ramp rate
      let rampPermil = isFragile ? 0.4 : 0.8;
      let intervalHours = isFragile ? 24 : 12;
      
      if (mode === 'intensive' && !isFragile) {
        rampPermil = 1.5;
        intervalHours = 8;
      }
      
      const rampCap = (mode === 'intensive' && !isFragile) 
        ? SAFETY_LIMITS.MAX_RAMP_INTENSIVE 
        : (isFragile ? SAFETY_LIMITS.MAX_RAMP_FRAGILE : SAFETY_LIMITS.MAX_RAMP_NORMAL);
      
      rampPermil = Math.min(rampPermil, rampCap);
      
      // Calculate step size
      const stepPercent = rampPermil * 0.1 * (intervalHours / 24);
      const safeStepPercent = Math.min(stepPercent, SAFETY_LIMITS.MAX_DELTA_PER_STEP);
      
      const steps = [];
      let sal = current;
      let remain = Math.max(0, target - current);
      const totalGrams = utils.gramsForDeltaPercent(remain, volume);
      const startTime = Date.now();
      let i = 1;
      
      while (remain > 0.001 && i <= 365) {
        const d = Math.min(safeStepPercent, remain);
        sal = +(sal + d);
        const grams = utils.gramsForDeltaPercent(d, volume);
        
        const dt = new Date(startTime + (i - 1) * intervalHours * 3600 * 1000);
        steps.push({
          StepIndex: i,
          ScheduledAt: utils.fmtSql(dt),
          ViewAt: utils.fmtView(dt),
          DeltaPercent: +(d.toFixed(4)),
          ExpectedSaltGrams: Math.round(grams),
          ExpectedPercentAfter: +(sal.toFixed(3))
        });
        
        remain -= d;
        i++;
      }
      
      const table = steps.map(s => `
        <tr style="text-align: center;">
          <td>Bước ${s.StepIndex}</td>
          <td>${s.ViewAt}</td>
          <td>+${(s.DeltaPercent * 10).toFixed(1)}‰ (${utils.fmtPct(s.DeltaPercent)})</td>
          <td class="num" style="text-align: center;">${utils.fmtGram(s.ExpectedSaltGrams)}</td>
          <td>${utils.fmtPct(s.ExpectedPercentAfter)}</td>
        </tr>
      `).join('');
      
      // [NEW V11] HIGH SALINITY WARNING (0.6 - 0.9)
      let warningBlock = "";
      if (target >= SAFETY_LIMITS.HIGH_SALINITY_WARN) {
           warningBlock = `
             <div style="margin-bottom:15px; padding:12px; background:#fff3e0; border:1px solid #ffb74d; color:#e65100; border-radius:8px; font-size:13px; display:flex; gap:10px; align-items:flex-start;">
               <span class="material-icons" style="font-size:20px; color:#ff9800;">warning</span>
               <div>
                 <div style="font-weight:700; margin-bottom:4px;">CẢNH BÁO MỨC CAO</div>
                 <div>Mục tiêu <strong>${target}%</strong> là mức điều trị bệnh.</div>
                 <div style="font-size:12px; margin-top:4px; opacity:0.9;">Chỉ áp dụng khi có chỉ định. Đảm bảo sục khí mạnh liên tục.</div>
               </div>
             </div>
           `;
      }

      // [FIXED POSITION] Warning blocks placed consistently after header, before grid
      const html = `
        <div class="result-box">
          <div class="result-head">🎯 Mục tiêu: tăng từ ${utils.fmtPct(current)} lên ${utils.fmtPct(target)}</div>
          
          <!-- Warning Blocks (Fixed Position - Always here) -->
          ${weatherWarningHTML}
          ${coldWarningHTML}
          ${warningBlock}
          
          <div class="grid-2" style="margin-top: 15px;">
            <div>Thể tích hồ:</div><div>${volume.toLocaleString('vi-VN')} L</div>
            <div>Tăng mỗi ngày:</div><div>${rampPermil.toFixed(2)}‰/ngày (${utils.fmtPct(rampPermil * 0.1)}/ngày)</div>
            <div>Khoảng cách bước:</div><div>${intervalHours} giờ</div>
            <div>Tăng mỗi bước:</div><div>${utils.fmtPct(safeStepPercent)} (giới hạn: ${utils.fmtPct(SAFETY_LIMITS.MAX_DELTA_PER_STEP)})</div>
            <div>Tổng muối cần:</div><div class="num">${utils.fmtGram(totalGrams)} (~${(totalGrams/1000).toFixed(2)} kg)</div>
            <div>Số bước:</div><div>${steps.length} bước (khoảng ${(steps.length * intervalHours / 24).toFixed(1)} ngày)</div>
          </div>
          
          <div style="overflow:auto; margin-top:12px">
            <table class="table">
              <thead>
                <tr>
                  <th>Bước</th><th style="text-align: center;">Lịch</th><th style="text-align: center;">Mức tăng</th><th style="text-align: center;">Muối cần</th><th style="text-align: center;">Ước tính sau châm</th>
                </tr>
              </thead>
              <tbody>${table}</tbody>
            </table>
          </div>
        </div>
      `;
      
      return {
        ok: true,
        reduce: false,
        html: html,
        steps: steps,
        summary: {
          mode: mode,
          target: +target.toFixed(3),
          current: +current.toFixed(3),
          volume: volume,
          sourceSalinity: sourceSalinity,
          fragile: fragile,
          note: note,
          rampPermil: +rampPermil.toFixed(2),
          intervalHours: intervalHours,
          riskLevel: validation.riskLevel
        },
        totals: {
          totalGrams: Math.round(totalGrams),
          days: Math.ceil(steps.length * intervalHours / 24),
          stepPercent: safeStepPercent
        }
      };
    }
  }

  // ===========================================================================
  // 12. POND MANAGEMENT (LOAD & SELECT)
  // ===========================================================================
  
  /**
   * Load Pond List from API
   * Populates the dropdown and restores selection.
   */
  async function loadPonds() {
    ddlPond.innerHTML = '<option>Đang tải...</option>';
    
    try {
      const res = await fetch('/HeThongChamSocCaKoi/backend/api/customer/ponds/list.php');
      const data = await res.json();
      
      if (!Array.isArray(data) || !data.length) {
        ddlPond.innerHTML = '<option>(Chưa có hồ)</option>';
        return;
      }
      
      ponds = data;

      const saved = localStorage.getItem('selectedPond');
      ddlPond.innerHTML = data.map(p => 
        `<option value="${p.PondID}">${p.PondName}</option>`
      ).join('');
      
      if (saved && data.some(x => String(x.PondID) === String(saved))) {
        ddlPond.value = saved;
      }
      
      onPondChange();
    } catch (error) {
      console.error('Failed to load ponds:', error);
      ddlPond.innerHTML = '<option>(Lỗi tải danh sách hồ)</option>';
      notify.showError('Không thể tải danh sách hồ');
    }
  }

  /**
   * Handle Pond Selection Change
   * Updates UI context, triggers weather fetch and data reload.
   */
  function onPondChange() {
    const id = ddlPond.value;
    if (!id) { 
      brief.style.display = 'none'; 
      mini.innerHTML = ''; 
      return; 
    }
    
    selectedPond = id;
    localStorage.setItem('selectedPond', id);
    
    const p = ponds.find(x => String(x.PondID) === String(id));
    if (p) {
      brief.style.display = 'grid';
      pondImg.src = p.ImageURL || '/HeThongChamSocCaKoi/assets/images/no-pond.jpg';
      pondImg.onerror = () => {
        pondImg.src = '/HeThongChamSocCaKoi/assets/images/no-pond.jpg';
      };
      pondName.textContent = p.PondName;

      const liters = p.VolumeLiters ? +p.VolumeLiters : (+p.Volume || 0);
      const litersDisplay = liters > 0 && liters <= 200 ? (liters * 1000) : liters;
      pondInfo.textContent = `Thể tích: ${(litersDisplay||0).toLocaleString('vi-VN')} L`;
      
      // [NEW V11] Trigger Weather Fetch when Pond Changes
      fetchWeatherData();
      
      // [NEW V11.1] Silent load for temp & latest salinity
      openSaltPlanner(selectedPond, true); 
    }
  }

  // ===========================================================================
  // 13. UI EVENT BINDING
  // ===========================================================================
  function bindPageUI() {
    // Pond Selection
    ddlPond.addEventListener('change', onPondChange);

    // Open Planner Button
    btnOpenPlanner.addEventListener('click', () => {
      if (!selectedPond) {
        notify.showWarning('Vui lòng chọn hồ cá trước khi lập kế hoạch');
        return;
      }
      openSaltPlanner(selectedPond);
    });

    // Refresh Plans Button
    btnRefreshPlans.addEventListener('click', () => {
      // Toggle visibility of plans panel
      document.body.classList.toggle('hide-plans');
      if (!document.body.classList.contains('hide-plans')) {
        refreshAllActivePlans();
      }
    });

    // History Button
    btnOpenHistory.addEventListener('click', openHistory);

    // Done All Button (Detail Modal)
    if (btnDoneAll) {
        btnDoneAll.addEventListener('click', handleCompleteAll);
    }

    // Calculation Button (Planner Modal)
    if(btnCalc) {
        btnCalc.addEventListener('click', async () => {
          // 1. Lấy giá trị để kiểm tra điều kiện
        const target = utils.toNum(inpTarget.value, 0);
        const current = utils.toNum(inpCurrent.value, 0);
        
        // 2. Chỉ kiểm tra an toàn chuyên sâu khi TĂNG muối
        if (target > current) {
            const checkZeo = document.getElementById('check-no-zeolite');
            const checkForm = document.getElementById('check-no-formalin');

            // Check đá Zeolite
            if (checkZeo && !checkZeo.checked) {
                notify.showError('⚠️ NGUY HIỂM: Vui lòng xác nhận hồ KHÔNG có đá Zeolite!');
                return; // <--- DỪNG NGAY, KHÔNG MỞ MODAL
            }
            
            // Check Formalin/Thuốc tím
            if (checkForm && !checkForm.checked) {
                notify.showError('⚠️ NGUY HIỂM: Vui lòng xác nhận hồ KHÔNG có Formalin/Thuốc tím!');
                return; // <--- DỪNG NGAY, KHÔNG MỞ MODAL
            }
        }
          if (!resultModal) return;
          
          resultModal.classList.add('show');
          if(btnSavePlan2) { 
              btnSavePlan2.classList.add('hidden'); 
              btnSavePlan2.setAttribute('disabled', 'disabled'); 
          }
          
          resultBody.innerHTML = `
            <div style="text-align:center; padding:30px;">
              <div class="spinner" style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
              <div class="hint">Đang phân tích an toàn sinh học & tính toán...</div>
            </div>
          `;
          
          setTimeout(() => {
            const plan = buildPlan();
            resultBody.innerHTML = plan.html;
            
            if (plan.ok) {
              if(btnSavePlan2) {
                  btnSavePlan2.classList.remove('hidden');
                  btnSavePlan2.removeAttribute('disabled');
              }
              
              // Store plan data for saving
              resultBody.dataset.planData = JSON.stringify({
                summary: plan.summary,
                steps: plan.reduce ? plan.stepsReduce : plan.steps,
                reduce: plan.reduce,
                totals: plan.totals,
                riskLevel: plan.summary?.riskLevel || 'safe'
              });
            } else {
              if(btnSavePlan2) {
                  btnSavePlan2.classList.add('hidden');
                  btnSavePlan2.setAttribute('disabled', 'disabled');
              }
            }
          }, 1500);
        });
    }

    // Save Plan Button (Result Modal)
    if(btnSavePlan2) {
        btnSavePlan2.addEventListener('click', async () => {
          try {
              const planData = JSON.parse(resultBody.dataset.planData || '{}');
              if (!planData.summary) {
                  notify.showError('Không có dữ liệu kế hoạch');
                  return;
              }
              
              const pondId = (selectedPond || null);
              if (!pondId) {
                  notify.showError('Vui lòng chọn hồ trước khi lưu kế hoạch');
                  return;
              }
              
              // Show loading
              const originalText = btnSavePlan2.innerHTML;
              btnSavePlan2.disabled = true;
              btnSavePlan2.innerHTML = '<span class="spinner-sm"></span> Đang kiểm tra an toàn...';
              
              // Final safety check
              const finalValidation = ValidationSystem.validateInputs({
                  mode: planData.summary.mode,
                  target: planData.summary.target,
                  current: planData.summary.current,
                  volume: planData.summary.volume,
                  fragile: planData.summary.fragile,
                  sourceSalinity: planData.summary.sourceSalinity
              });
              
              if (!finalValidation.valid) {
                  notify.showError('Kế hoạch không đạt yêu cầu an toàn: ' + finalValidation.errors.join(', '));
                  btnSavePlan2.disabled = false;
                  btnSavePlan2.innerHTML = originalText;
                  return;
              }
              
              // Check for active plans
              try {
                  const activeCheck = await SecureAPI.listPlans('active');
                  const activeData = Array.isArray(activeCheck) ? activeCheck : [];
                  
                  if (activeData.length > 0 && activeData[0].PondID == pondId) {
                      const confirmMsg = `Hồ này đang có kế hoạch #${activeData[0].PlanID} chưa hoàn thành.\n\nBạn có muốn hủy kế hoạch cũ và tạo mới không?`;
                      
                      showCustomConfirm(confirmMsg, 'Trùng kế hoạch', async () => {
                          await SecureAPI.cancelPlan(activeData[0].PlanID);
                          await savePlanToServer(planData, pondId, originalText);
                      });
                      return;
                  }
              } catch (error) {
                  console.warn('Error checking active plans:', error);
                  // Continue anyway
              }
              
              await savePlanToServer(planData, pondId, originalText);
              
          } catch (error) {
              console.error('Error in save plan button:', error);
              btnSavePlan2.disabled = false;
              btnSavePlan2.innerHTML = 'Kích hoạt quy trình Expert';
              notify.showError('Không thể lưu kế hoạch: ' + (error.message || 'Unknown error'));
          }
        });
    }
  }

  // ===========================================================================
  // 14. ACTIVE PLANS MANAGEMENT (FIXED EVENT DELEGATION BUG)
  // ===========================================================================
  
  async function refreshAllActivePlans() {
    try {
      const data = await SecureAPI.listPlans('active', 200);
      
      if (!Array.isArray(data) || !data.length) {
        mini.innerHTML = '<div class="hint text-center">Chưa có kế hoạch nào đang chạy</div>';
        return;
      }
      
      // [FIX] Khôi phục nút XONG (btn-success) và định dạng chuẩn
      mini.innerHTML = data.map(p => {
        const steps = (p.Steps || []).slice(0, 2).map(s => 
          `<div class="step"><b>Bước ${s.Index || s.StepIndex}:</b> +${utils.fmtInt(s.AddGrams || s.ExpectedSaltGrams || 0)} g → ${(s.EstSalinity || s.ExpectedPercentAfter || '-')}%</div>`
        ).join('');
        
        const more = (p.Steps || []).length > 2 ? '…' : '';
        
        return `
          <div class="plan-mini">
            <div class="plan-mini__head">
              <h4>Kế hoạch #${p.PlanID}</h4>
              <span class="status ${p.Status}">${p.Status}</span>
            </div>
            <div class="plan-mini__body">
              Hồ: ${p.PondName}<br>
              Mục tiêu: ${p.TargetSalinity}%<br>
              ${steps}${more}
            </div>
            <div class="plan-mini__actions">
              <!-- [FIX BUG 1] Added data-id attribute for consistent ID access -->
              <button class="btn btn-xs" data-id="${p.PlanID}" data-action="open">Chi tiết</button>
              <button class="btn btn-xs btn-success" data-id="${p.PlanID}" data-action="done">Xong</button>
              <button class="btn btn-xs btn-danger" data-id="${p.PlanID}" data-action="cancel">Hủy</button>
            </div>
          </div>`;
      }).join('');

      // [FIX BUG 1] Robust Event Delegation with closest('button')
      // Single event listener for all button clicks
      mini.addEventListener('click', (e) => {
          // Find the closest button to the click target
          const button = e.target.closest('button');
          if (!button) return;
          
          // Get the plan ID from data-id attribute
          const planId = button.getAttribute('data-id');
          const action = button.getAttribute('data-action');
          
          if (!planId || !action) return;
          
          // Prevent event bubbling
          e.stopPropagation();
          
          // Route to appropriate handler
          switch(action) {
              case 'open':
                  openPlanDetail(planId);
                  break;
              case 'done':
                  handleMarkPlanDone(planId);
                  break;
              case 'cancel':
                  handleCancelPlan(planId);
                  break;
          }
      });
      
    } catch (error) {
      console.error('Error loading active plans:', error);
      mini.innerHTML = '<div class="hint text-center text-danger">Không thể tải dữ liệu</div>';
    }
  }

  // ===========================================================================
  // 15. PLAN DETAIL MANAGEMENT
  // ===========================================================================
  
  async function openPlanDetail(id, readOnly = false) {
    // [FIX] Close History Modal first to prevent overlap (Z-Index issue)
    if (historyModal?.classList.contains('show')) {
        historyModal.classList.remove('show');
    }

    detailModal.classList.add('show');
    detailBody.innerHTML = '<div class="hint text-center">Đang tải...</div>';
    
    try {
      const data = await SecureAPI.getPlan(id);
      
      const p = data.plan;
      const steps = data.steps || [];
      
      // Find first incomplete step
      const firstIncompleteIdx = steps.findIndex(s => !s.ExecutedAt);
      
      const rows = steps.map(s => {
        const done = !!s.ExecutedAt;
        const gramsInt = utils.fmtInt(s.ExpectedSaltGrams || 0);
        const actionText = (s.WaterChangeLiters && +s.WaterChangeLiters > 0)
          ? `Thay ${utils.fmtInt(s.WaterChangeLiters)} L nước`
          : `Châm ${gramsInt} g muối`;
        
        const allowAct = (!done && !readOnly && (s.StepIndex === (firstIncompleteIdx + 1)));
        
        return `
          <div class="step-row" data-step="${s.StepID}" data-index="${s.StepIndex}">
            <div>
              <b>Bước ${s.StepIndex}</b>
              <div class="${done ? 'badge-done' : 'status'}">
                ${done ? 'Hoàn thành' : 'Chưa thực hiện'}
              </div>
            </div>
            <div>
              <div>${utils.fmtView(s.ScheduledAt || p.StartAt || Date.now())} • ${actionText} → ${(s.ExpectedPercentAfter ?? '-')}%</div>
              ${s.Note ? `<div class="step-note"><small>${s.Note}</small></div>` : ''}
            </div>
            <div class="actions">
              ${allowAct ? `<button class="btn btn-xs btn-outline-gray act-done" data-step-id="${s.StepID}">Đánh dấu hoàn thành</button>` : ''}
            </div>
          </div>`;
      }).join('');

      btnDoneAll.dataset.planId = p.PlanID;
      btnDoneAll.classList.toggle('hidden', !!readOnly);

      detailBody.innerHTML = `
        <div class="result-box">
          <div class="result-head">📋 Kế hoạch #${p.PlanID} — ${p.PondName}</div>
          <div class="grid-2">
            <div>Bắt đầu:</div><div>${utils.fmtView(p.StartAt || p.StartDate || Date.now())}</div>
            <div>Trạng thái:</div><div>${p.Status}</div>
            <div>Mục tiêu:</div><div>${p.TargetPercent}%</div>
            <div>Nước nguồn:</div><div>${p.SourceWaterSalinity || '0'}%</div>
            <div>Ghi chú:</div><div>${p.Note || '-'}</div>
          </div>
          <hr style="margin:10px 0">
          ${rows || '<div class="hint">Chưa có bước nào.</div>'}
        </div>`;

      // FIXED: Re-bind event listeners for dynamic content
      // Use event delegation with closest('button')
      detailBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button || !button.classList.contains('act-done')) return;
        
        const stepId = button.getAttribute('data-step-id');
        const row = button.closest('.step-row');
        const expectedPercent = parseFloat(row.querySelector('div:nth-child(2) div')?.textContent?.match(/→ ([\d.]+)%/)?.[1]) || null;
        
        // Open measurement modal instead of directly marking done
        openMeasurementModal(stepId, expectedPercent);
      });
      
    } catch (error) {
      console.error('Error loading plan detail:', error);
      detailBody.innerHTML = `<div class='hint text-center text-danger'>Lỗi tải dữ liệu</div>`;
    }
  }

  // ===========================================================================
  // 16. PLANNER HELPERS (MODAL & FORM)
  // ===========================================================================
  
  function openPlannerModal() { 
    if (!plannerModal) return;
    plannerModal.classList.add('show'); 
    
    // Focus first field
    setTimeout(() => {
      const firstInput = plannerModal.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  }
  
  function closePlannerModal() { 
    if (!plannerModal) return;
    plannerModal.classList.remove('show'); 
  }

  async function openSaltPlanner(pondId, silent = false) {
    try {
      let volume = 0, p = null;
      
      if (Array.isArray(ponds) && ponds.length) {
        p = ponds.find(x => String(x.PondID) === String(pondId));
      } else {
        const res = await fetch('/HeThongChamSocCaKoi/backend/api/customer/ponds/list.php');
        const arr = await res.json();
        p = Array.isArray(arr) ? arr.find(x => String(x.PondID) === String(pondId)) : null;
      }
      
      if (p) {
        volume = p.VolumeLiters ? Math.round(+p.VolumeLiters) : 
                ((+p.Volume > 0 && +p.Volume <= 200) ? Math.round(+p.Volume * 1000) : Math.round(+p.Volume || 0));
        if (volume > 0) inpVolume.value = Math.round(volume);
      }
      
      // [OPTIMIZED V11.1] Use optimized fetch
      const latestData = await SecureAPI.getLatestSalinity(pondId);
      const latestSalt = latestData ? parseFloat(latestData.Salt || 0) : 0;
      
      // [NEW] Store temp for expert check
      currentPondTemp = latestData && latestData.Temperature ? parseFloat(latestData.Temperature) : null;

      inpCurrent.value = latestSalt.toFixed(2);
      
      // [NEW] Display timestamp info
      let timeHint = document.getElementById('salt-data-time');
      if (!timeHint) {
          timeHint = document.createElement('div');
          timeHint.id = 'salt-data-time';
          timeHint.className = 'small-hint';
          timeHint.style.marginTop = '4px';
          inpCurrent.parentNode.appendChild(timeHint);
      }
      
      if (latestData && latestData.RecordedAt) {
          const dateObj = new Date(latestData.RecordedAt);
          const now = new Date();
          const diffHours = (now - dateObj) / 36e5;
          const isOld = diffHours > 48;
          
          timeHint.innerHTML = `${isOld ? '⚠️' : 'ℹ️'} Dữ liệu đo lúc: <strong>${utils.fmtView(latestData.RecordedAt)}</strong>` +
                               (isOld ? ' <span style="color:#d32f2f">(Cũ, vui lòng đo lại)</span>' : ' (Mới)');
      } else {
          timeHint.innerHTML = 'ℹ️ Chưa có dữ liệu đo gần đây.';
      }
      
      if (silent) return;

      // Reset form
      if (txtNote) txtNote.value = '';
      if (inpSourceSalinity) inpSourceSalinity.value = '0';
      
      // Check checkboxes
      const checkZeo = document.getElementById('check-no-zeolite');
      const checkForm = document.getElementById('check-no-formalin');
      if (checkZeo) checkZeo.checked = false;
      if (checkForm) checkForm.checked = false;

      // Apply target based on mode
      updateTargetFromMode();
      toggleSourceWaterField();
      
      // Open planner
      openPlannerModal();
      
    } catch(error) {
      console.error('Error opening planner:', error);
      if (!silent) notify.showError('Không thể mở bộ lập kế hoạch');
    }
  }

  // ===========================================================================
  // 17. ACTIONS & EVENTS (CUSTOM CONFIRM)
  // ===========================================================================
  
  async function handleMarkPlanDone(id) {
    showCustomConfirm(
        `<div>Bạn có chắc chắn muốn đánh dấu toàn bộ kế hoạch này là <strong>ĐÃ HOÀN THÀNH</strong>?</div>
         <ul style="text-align:left; margin-top:10px; font-size:13px; color:#666; padding-left:20px;">
            <li>Tất cả các bước chưa thực hiện sẽ được đánh dấu là "Đã xong".</li>
            <li>Độ mặn của hồ sẽ được cập nhật ngay lập tức lên mức mục tiêu trong hồ sơ nước.</li>
         </ul>`,
        "Xác nhận hoàn tất",
        async () => {
            try {
              await SecureAPI.markPlanDone(id);
              notify.showSuccess('Đã hoàn thành kế hoạch và cập nhật độ mặn!');
              refreshAllActivePlans();
            } catch (error) {
              console.error('Error completing plan:', error);
              notify.showError('Không thể hoàn thành kế hoạch');
            }
        }
    );
  }

  async function handleCompleteAll() {
    const id = btnDoneAll.dataset.planId;
    if (!id) return;
    
    // [NEW V10] Use Custom Modal for Done All
    showCustomConfirm(
        `<div>Bạn có chắc chắn muốn đánh dấu toàn bộ kế hoạch này là <strong>ĐÃ HOÀN THÀNH</strong>?</div>
         <ul style="text-align:left; margin-top:10px; font-size:13px; color:#666; padding-left:20px;">
            <li>Tất cả các bước chưa thực hiện sẽ được đánh dấu là "Đã xong".</li>
            <li>Độ mặn của hồ sẽ được cập nhật ngay lập tức lên mức mục tiêu trong hồ sơ nước.</li>
         </ul>`,
        "Xác nhận hoàn tất",
        async () => {
            try {
              btnDoneAll.disabled = true;
              btnDoneAll.innerHTML = '<span class="spinner-sm"></span> Đang xử lý...';
              
              await SecureAPI.markPlanDone(id);
              
              notify.showSuccess('Đã hoàn thành kế hoạch và cập nhật độ mặn!');
              
              // Refresh UI
              refreshAllActivePlans();
              setTimeout(() => {
                detailModal.classList.remove('show');
                if (historyModal?.classList.contains('show')) {
                  openHistory();
                }
              }, 500);
              
            } catch (error) {
              console.error('Error completing plan:', error);
              notify.showError('Không thể hoàn thành kế hoạch');
            } finally {
              btnDoneAll.disabled = false;
              btnDoneAll.textContent = 'Đánh dấu hoàn tất toàn bộ';
            }
        }
    );
  }

  async function handleCancelPlan(id) {
    showCustomConfirm('Bạn có chắc chắn muốn hủy kế hoạch này?', 'Hủy kế hoạch', async () => {
        try {
          await SecureAPI.cancelPlan(id);
          notify.showSuccess('Đã hủy kế hoạch');
          refreshAllActivePlans();
        } catch (error) {
          console.error('Error cancelling plan:', error);
          notify.showError('Không thể hủy kế hoạch');
        }
    });
  }
  
  async function handleDeletePlan(id) {
    showCustomConfirm(`Bạn có chắc chắn muốn xóa vĩnh viễn kế hoạch #${id}?`, "Xóa dữ liệu", async () => {
        try {
          await SecureAPI.deletePlan(id);
          notify.showSuccess('Đã xóa kế hoạch');
          openHistory(); // Reload
        } catch (error) {
          console.error('Error deleting plan:', error);
          notify.showError('Không thể xóa kế hoạch');
        }
    });
  }

  // ===========================================================================
  // 18. HISTORY MANAGEMENT
  // ===========================================================================
  
  async function openHistory() {
    historyModal.classList.add('show');
    
    historyList.innerHTML = `
      <div class="history-head">
        <div class="search-wrap">
          <input id="hist-q" placeholder="Tìm theo hồ / ID / trạng thái...">
          <select id="hist-pond-filter"><option value="">Tất cả hồ</option></select>
        </div>
      </div>
      <div id="hist-grid" class="history-grid"></div>
    `;
    
    try {
      const data = await SecureAPI.listPlans('history', 400);
      
      const q = document.getElementById('hist-q');
      const pondSel = document.getElementById('hist-pond-filter');
      const grid = document.getElementById('hist-grid');
      
      // Populate pond filter
      const pondNames = Array.from(new Set((data || []).map(p => p.PondName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'vi'));
      
      pondSel.innerHTML = `<option value="">Tất cả hồ</option>` + 
        pondNames.map(n => `<option value="${n}">${n}</option>`).join('');
      
      function renderGrid(arr) {
        if (!Array.isArray(arr) || !arr.length) {
          grid.innerHTML = `<div class="hint text-center">Không có kế hoạch phù hợp</div>`;
          return;
        }
        
        grid.innerHTML = arr.map(p => `
          <div class="history-card">
            <div class="history-row">
              <div class="id">#${p.PlanID}</div>
              <div class="status-pill ${p.Status}">${p.Status}</div>
            </div>
            <div class="title">${p.PondName || '-'}</div>
            <div class="meta">Mục tiêu: ${p.TargetSalinity}% • Bắt đầu: ${p.StartDate?.split(' ')[0] || '-'}</div>
            <div class="actions">
              <button class="btn btn-xs" data-view="${p.PlanID}">Xem chi tiết</button>
              <button class="btn btn-xs btn-danger" data-del="${p.PlanID}">Xóa</button>
            </div>
          </div>
        `).join('');
      }
      
      function applyFilters() {
        const t = (q.value || '').toLowerCase();
        const pond = (pondSel.value || '').toLowerCase();
        const filtered = (data || []).filter(p => {
          const matchText = String(p.PlanID).includes(t) ||
            (p.PondName || '').toLowerCase().includes(t) ||
            (p.Status || '').toLowerCase().includes(t);
          const matchPond = pond ? (p.PondName || '').toLowerCase().includes(pond) : true;
          return matchText && matchPond;
        });
        renderGrid(filtered);
      }
      
      renderGrid(data);
      
      q.addEventListener('input', applyFilters);
      pondSel.addEventListener('change', applyFilters);
      
      // [FIX] Use closest for event delegation
      grid.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        if (button.hasAttribute('data-view')) {
          openPlanDetail(button.getAttribute('data-view'), true);
          return;
        }
        
        if (button.hasAttribute('data-del')) {
          handleDeletePlan(button.getAttribute('data-del'));
        }
      });
      
    } catch (error) {
      console.error('Error loading history:', error);
      historyList.innerHTML = `<div class="hint text-center text-danger">Lỗi tải lịch sử</div>`;
    }
  }
  function checkUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const planId = urlParams.get('plan_id');
      const stepId = urlParams.get('step_id');
      
      if (planId) {
          // Mở modal chi tiết kế hoạch
          openPlanDetail(planId).then(() => {
              // Nếu có step_id, highlight dòng step đó
              if (stepId) {
                  setTimeout(() => {
                      // Tìm dòng step dựa trên data attribute
                      // Lưu ý: Trong hàm openPlanDetail, dòng step được render là: <div class="step-row" data-step="${s.StepID}" ...>
                      // Tuy nhiên, logic backend trả về StepID, nhưng attribute HTML có thể là data-step hoặc data-step-id
                      // Check lại render: <div class="step-row" data-step="${s.StepID}" ...> -> OK
                      const stepRow = document.querySelector(`.step-row[data-step="${stepId}"]`);
                      if (stepRow) {
                          stepRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          stepRow.style.backgroundColor = '#fff9c4'; // Highlight vàng nhạt
                          stepRow.style.transition = 'background-color 2s ease';
                          setTimeout(() => stepRow.style.backgroundColor = '', 3000);
                      }
                  }, 600); // Đợi modal render xong
              }
          });
      }
  }
  // ===========================================================================
  // 19. PAGE INITIALIZATION
  // ===========================================================================
  async function initPage() {
    try {
      // Load saved settings
      const savedAuto = localStorage.getItem('autoOpenSalt');
      if (savedAuto && autoOpen) {
          autoOpen.value = savedAuto;
      }
      
      if (autoOpen) {
          autoOpen.addEventListener('change', () => {
            localStorage.setItem('autoOpenSalt', autoOpen.value);
          });
      }

      // Load ponds data
      await loadPonds();
      
      // Bind UI events (Must be called after loading data)
      bindPageUI();

      // Setup modal close handlers
      setupModalHandlers();

      // Setup form validation
      setupFormValidation();

      // Create measurement modal (singleton)
      createMeasurementModal();
      
      // [FIX BUG 5] Create Contraindication Checklist với UI mới
      renderContraindicationChecklist();

      // Auto-open planner if configured
      const auto = localStorage.getItem('autoOpenSalt') || (autoOpen ? autoOpen.value : 'no');
      if (auto === 'yes' && selectedPond) {
        setTimeout(() => openSaltPlanner(selectedPond), 500);
      }

      // Refresh active plans on load
      refreshAllActivePlans();
      // [NEW] Check URL for Deep Linking
      checkUrlParams();
    } catch (e) {
      console.error('Initialization error:', e);
      notify.showError('Không thể khởi tạo trang. Vui lòng tải lại.');
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    initPage();
  });

  // GLOBAL EXPORTS
  window.openSaltPlanner = openSaltPlanner;
  window.refreshAllActivePlans = refreshAllActivePlans;
  window.openPlanDetail = openPlanDetail;

})();