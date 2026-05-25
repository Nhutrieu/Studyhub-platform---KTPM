/**************************************
 * GLOBAL VARIABLES
 **************************************/
let confirmCallback = null;
let currentFishId = null;

let chatHistory = [
    {
        role: "ai",
        content: "Chào bạn! Tôi là trợ lý AI. Dựa trên kết quả phân tích, bạn cần hỗ trợ gì thêm không?"
    }
];

/**************************************
 * UI ELEMENT PLACEHOLDERS
 **************************************/
let fileInput, dropZone, previewBox, previewImg, submitBtn, btnText, btnIcon,
    spinner, resultSection, emptyState, skeleton, chatMessages;

/**************************************
 * UTILS
 **************************************/
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

/**************************************
 * CUSTOM MODAL
 **************************************/
function showCustomModal(type, title, message, callback = null) {
    const modal = document.getElementById("custom-modal-overlay");
    if (!modal) return;

    const iconBg = document.getElementById("modal-icon-bg");
    const icon = document.getElementById("modal-icon");
    const titleEl = document.getElementById("modal-title");
    const bodyEl = document.getElementById("modal-message");
    const actionsEl = document.getElementById("modal-actions");

    titleEl.innerText = title;
    bodyEl.innerText = message;

    iconBg.className = "modal-icon-wrapper";
    icon.className = "material-icons-round";
    actionsEl.innerHTML = "";
    confirmCallback = null;

    if (type === "success" || type === "info" || type === "error") {
        iconBg.classList.add(type);
        icon.innerText =
            type === "success" ? "check_circle" : type === "error" ? "error" : "info";

        actionsEl.innerHTML = `
            <button onclick="closeModal('custom-modal-overlay')" class="btn-primary">Đã hiểu</button>
        `;

    } else if (type === "confirm") {
        iconBg.classList.add("confirm");
        icon.innerText = "help_outline";
        confirmCallback = callback;

        actionsEl.innerHTML = `
            <button onclick="closeModal('custom-modal-overlay')" class="btn-secondary">Hủy bỏ</button>
            <button onclick="executeConfirm()" class="btn-primary">Đồng ý</button>
        `;
    }

    modal.style.display = "flex";
}

function executeConfirm() {
    if (confirmCallback) confirmCallback();
    closeModal("custom-modal-overlay");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}

/**************************************
 * FILE INPUT + PREVIEW
 **************************************/
function initFileInput() {
    if (!fileInput) return;

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) {
            submitBtn.disabled = true;
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showCustomModal("error", "Lỗi Ảnh", "Ảnh quá lớn! Vui lòng chọn ảnh dưới 10MB");
            fileInput.value = "";
            submitBtn.disabled = true;
            return;
        }

        if (!file.type.startsWith("image/")) {
            showCustomModal("error", "Lỗi Ảnh", "Vui lòng chọn file ảnh hợp lệ");
            fileInput.value = "";
            submitBtn.disabled = true;
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            if (dropZone) dropZone.style.display = "none";
            if (previewBox) previewBox.style.display = "block";
            submitBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });
}

/**************************************
 * DRAG & DROP
 **************************************/
function initDragDrop() {
    if (!dropZone || !fileInput) return;

    const prevent = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
        dropZone.addEventListener(evt, prevent);
    });

    dropZone.addEventListener("dragenter", () => dropZone.classList.add("dragover"));
    dropZone.addEventListener("dragover", () => dropZone.classList.add("dragover"));
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

    dropZone.addEventListener("drop", (e) => {
        dropZone.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event("change"));
        }
    });
}

/**************************************
 * FORM SUBMISSION (AJAX)
 **************************************/
function initFormSubmit() {
    const form = document.getElementById("scanForm");
    if (!form) return;
    form.addEventListener("submit", handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!fileInput || !fileInput.files[0]) {
        showCustomModal("error", "Thiếu Ảnh", "Vui lòng tải ảnh lên để phân tích.");
        return;
    }

    if (skeleton) skeleton.style.display = "block";
    if (resultSection) resultSection.innerHTML = "";
    if (emptyState) emptyState.style.display = "none";

    // Hide disease widget during analysis
    const diseaseWidget = document.getElementById("disease-widget");
    if (diseaseWidget) diseaseWidget.style.display = "none";
    
    // Hide tips-box after starting analysis
    const tipsBox = document.getElementById("tips-box");
    if (tipsBox) tipsBox.style.display = "none";

    // Start laser scanning effect
    if (previewBox) previewBox.classList.add("scanning");

    submitBtn.disabled = true;
    btnText.textContent = "Đang phân tích...";
    btnIcon.style.display = "none";
    spinner.style.display = "block";

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    try {
        const response = await fetch(
            "/HeThongChamSocCaKoi/backend/api/ai/detect.php",
            { method: "POST", body: formData }
        );

        if (!response.ok) {
            throw new Error("Máy chủ không phản hồi, vui lòng thử lại.");
        }

        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            throw new Error("Dữ liệu trả về không hợp lệ.");
        }

        if (!data.success) throw new Error(data.error || "Phân tích thất bại");

        renderResults(data);

    } catch (err) {
        showCustomModal("error", "Lỗi phân tích", err.message || "Đã xảy ra lỗi không xác định.");
        if (resultSection) {
            resultSection.innerHTML = `
                <div class="alert-box error">
                    <span class="material-icons-round">error</span>
                    ${escapeHTML(err.message || "Đã xảy ra lỗi.")}
                </div>`;
        }

        // Show disease widget again on error
        const diseaseWidget = document.getElementById("disease-widget");
        if (diseaseWidget) diseaseWidget.style.display = "block";
        
        // Show tips-box again on error
        const tipsBox = document.getElementById("tips-box");
        if (tipsBox) tipsBox.style.display = "block";
        
        if (emptyState) emptyState.style.display = "block";

    } finally {
        if (skeleton) skeleton.style.display = "none";
        submitBtn.disabled = false;
        btnText.textContent = "Phân tích ngay";
        btnIcon.innerHTML = "analytics";
        btnIcon.style.display = "block";
        spinner.style.display = "none";

        // Stop laser scanning effect
        if (previewBox) previewBox.classList.remove("scanning");
    }
}

/**************************************
 * RENDER RESULTS
 **************************************/
function renderResults(data) {
    window.analysisResult = data;
    window.detectedDiseases = Array.isArray(data.detections)
        ? data.detections.map((d) => d.display_name)
        : [];

    chatHistory = [
        { role: "ai", content: "Chào bạn! Tôi là trợ lý AI. Tôi có thể hỗ trợ gì thêm?" }
    ];

    let html = "";
    const detections = Array.isArray(data.detections) ? data.detections : [];
    const count = detections.length;

    // Update badge
    const badge = document.getElementById("status-badge");
    if (badge) {
        badge.className = "status-badge";
        if (count > 0) {
            badge.classList.add("status-danger");
            badge.textContent = "Nghi ngờ bệnh";
        } else {
            badge.classList.add("status-safe");
            badge.textContent = "Cá khỏe mạnh";
        }
    }

    // Render detections
    detections.forEach((det, index) => {
        const severity = det.severity || "Rất cao";
        const severityClass = severity.toLowerCase().replace(/\s+/g, "-");
        const confidence = det.confidence ? Math.round(det.confidence * 100) : 0;
        
        // Determine suspicion level based on confidence
        let suspicionLevel = "Không rõ";
        let suspicionClass = "low";
        
        if (confidence >= 85) {
            suspicionLevel = "Rất cao";
            suspicionClass = "very-high";
        } else if (confidence >= 65) {
            suspicionLevel = "Cao";
            suspicionClass = "high";
        } else if (confidence >= 40) {
            suspicionLevel = "Trung bình";
            suspicionClass = "medium";
        } else {
            suspicionLevel = "Thấp";
            suspicionClass = "low";
        }
        
        // Parse description to separate desc and advice
        let desc = "";
        let advice = "";
        
        if (typeof det.description === 'object' && det.description !== null) {
            desc = det.description.desc || "Không có mô tả";
            advice = det.description.advice || "";
        } else if (typeof det.description === 'string') {
            desc = det.description;
        }

        html += `
        <div class="detection-card critical">
            <div class="det-header">
                <div class="det-title-row">
                    <span class="material-icons-round warning-icon">warning</span>
                    <h3 class="det-name">${escapeHTML(det.display_name || "Không rõ")}</h3>
                </div>
                <div class="det-suspicion ${suspicionClass}">
                    <span class="material-icons-round">priority_high</span>
                    Nghi ngờ ${suspicionLevel}
                </div>
            </div>
            
            <!-- Mô tả ngắn ngay dưới tên -->
            <div class="det-short-desc">
                ${escapeHTML(desc)}
            </div>
            
            <button class="accordion-toggle" onclick="toggleAccordion('det-${index}')">
                <span class="material-icons-round accordion-icon">expand_more</span>
                Xem chi tiết & Lưu ý quan trọng
            </button>
            
            <!-- Accordion: Lời khuyên chi tiết ở trong -->
            <div class="accordion-content" id="det-${index}">
                ${advice ? `
                <div class="det-advice-section">
                    <h4 class="advice-title">
                        <span class="material-icons-round">lightbulb</span>
                        Lời khuyên xử lý:
                    </h4>
                    <div class="det-advice-text">${escapeHTML(advice)}</div>
                </div>` : ''}
                
                <div class="disclaimer-box">
                    <span class="material-icons-round">info</span>
                    <div>
                        <strong>LƯU Ý QUAN TRỌNG:</strong>
                        <div style="margin-top:8px;">
                            • Đây chỉ là kết quả phân tích tự động từ AI dựa trên hình ảnh, không có giá trị thay thế chẩn đoán của bác sĩ thú y.
                            <br>
                            • Độ chính xác phụ thuộc vào chất lượng ảnh (ánh sáng, góc chụp, độ nét).
                            <br>
                            • Nếu cá có biểu hiện bơi lệch đổ, bỏ ăn hoặc tình trạng xấu đi nhanh, vui lòng liên hệ chuyên gia ngay lập tức.
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });

    // If no disease detected - show healthy card
    if (count === 0) {
        html += `
        <div class="detection-card healthy">
            <div class="det-header">
                <div class="det-title-row">
                    <span class="material-icons-round success-icon">check_circle</span>
                    <h3 class="det-name healthy">Cá khỏe mạnh</h3>
                </div>
                <span class="det-conf">Tốt</span>
            </div>
            <div class="det-summary-text">
                AI không phát hiện dấu hiệu bệnh tật nào trên cơ thể cá. Cá có vẻ khỏe mạnh và không có vết thương hoặc bất thường nào đáng lo ngại.
            </div>
            <button class="accordion-toggle" onclick="toggleAccordion('det-healthy')">
                <span class="material-icons-round accordion-icon">expand_more</span>
                Xem chi tiết & Lưu ý quan trọng
            </button>
            <div class="accordion-content" id="det-healthy">
                <div class="disclaimer-box">
                    <span class="material-icons-round">info</span>
                    <div>
                        <strong>LƯU Ý QUAN TRỌNG:</strong>
                        <div style="margin-top:8px;">
                            • Kết quả "khỏe mạnh" không đảm bảo 100% cá không có vấn đề. AI chỉ phân tích dựa trên hình ảnh bề ngoài.
                            <br>
                            • Một số bệnh nội tạng, ký sinh trùng bên trong hoặc vấn đề về chất lượng nước có thể không nhìn thấy được qua ảnh.
                            <br>
                            • Vẫn nên theo dõi hành vi cá hàng ngày: ăn uống, bơi lội, và kiểm tra định kỳ chất lượng nước.
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Annotated image
    if (data.annotated_image) {
        html += `
        <div class="result-img-section">
            <p class="img-label">Vùng bệnh được AI đánh dấu:</p>
            <div class="result-img-box">
                <img src="data:image/jpg;base64,${data.annotated_image}">
            </div>
        </div>`;
    }

    // Save button
    html += `
        <button class="save-result-btn" id="save-result-btn"
            onclick="saveResultToProfile()"
            style="display:${currentFishId ? "flex" : "none"};">
            <span class="material-icons-round">save</span>
            Lưu vào hồ sơ cá
        </button>`;

    // Gemini + Chat
    html += `
    <div class="gemini-section">
        ${count > 0 ? `
        <button class="btn-gemini" onclick="getGeminiAdvice()">
            <span class="material-icons-round">auto_awesome</span>
            Lập phác đồ điều trị
        </button>

        <div id="gemini-advice-box" class="gemini-result-box"></div>
        ` : ''}

        <div class="chat-container">
            <div class="chat-header">
                <span class="material-icons-round">smart_toy</span> Trợ lý AI
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-area">
                <input id="chat-input" class="chat-input" placeholder="Hỏi về bệnh...">
                <button class="btn-send" onclick="sendChatMessage()">
                    <span class="material-icons-round">send</span>
                </button>
            </div>
        </div>
    </div>`;

    if (resultSection) {
        resultSection.innerHTML = html;
        resultSection.style.display = "block";
    }

    // Render chat after HTML is inserted
    setTimeout(() => {
        renderChatMessages();
        initChatInput();
    }, 50);
}

/**************************************
 * CHATBOT — appendMessage()
 **************************************/
function appendMessage(text, sender, isHtml = false) {
    const msgContainer = document.getElementById("chat-messages");
    if (!msgContainer) return null;

    const div = document.createElement("div");
    const id = crypto.randomUUID();

    if (sender === "ai") div.className = "msg msg-ai";
    else if (sender === "user") div.className = "msg msg-user";
    else if (sender === "loading") div.className = "msg msg-loading";

    div.id = id;
    div.innerHTML = isHtml ? text : escapeHTML(text);

    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    return id;
}

function renderChatMessages() {
    const box = document.getElementById("chat-messages");
    if (!box) return;

    box.innerHTML = "";
    chatHistory.forEach((m) => {
        const div = document.createElement("div");
        div.className = "msg " + (m.role === "user" ? "msg-user" : "msg-ai");
        if (m.role === "user") {
            div.innerHTML = escapeHTML(m.content);
        } else {
            div.innerHTML = m.content; // AI có thể trả về HTML format
        }
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

/**************************************
 * CHAT INPUT
 **************************************/
function initChatInput() {
    const chatInput = document.getElementById("chat-input");
    if (!chatInput) return;

    chatInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

/**************************************
 * SEND CHAT MESSAGE
 **************************************/
async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    chatHistory.push({ role: "user", content: text });

    input.value = "";
    input.disabled = true;

    const loadingId = appendMessage(
        `<div class="typing-loader"><div></div><div></div><div></div></div>`,
        "loading",
        true
    );

    try {
        const response = await fetch(
            "/HeThongChamSocCaKoi/backend/api/ai/gemini_health.php",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "chat",
                    diseases: window.detectedDiseases || [],
                    message: text
                })
            }
        );

        if (!response.ok) {
            throw new Error("Không thể kết nối đến máy chủ.");
        }

        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            throw new Error("Dữ liệu trả về không hợp lệ.");
        }

        const bubble = loadingId ? document.getElementById(loadingId) : null;
        if (!data.success) throw new Error(data.error || "Lỗi khi xử lý câu hỏi.");

        if (bubble) {
            bubble.className = "msg msg-ai";
            bubble.innerHTML = data.response;
        }
        chatHistory.push({ role: "ai", content: data.response });

    } catch (err) {
        if (loadingId) {
            const bubble = document.getElementById(loadingId);
            if (bubble) bubble.innerHTML = escapeHTML(err.message || "Lỗi kết nối!");
        }
    } finally {
        input.disabled = false;
        input.focus();
    }
}

/**************************************
 * GEMINI – TREATMENT PLAN
 **************************************/
async function getGeminiAdvice() {
    const box = document.getElementById('gemini-advice-box');
    const overlay = document.getElementById('gemini-overlay');
    const btn = event ? event.target.closest('.btn-gemini') : null;

    if (!box || !overlay) return;

    // SHOW OVERLAY LOADING
    overlay.style.display = "flex";

    if (btn) btn.disabled = true;
    
    try {
        const response = await fetch('/HeThongChamSocCaKoi/backend/api/ai/gemini_health.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'treatment',
                diseases: detectedDiseases
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Không thể lấy phác đồ điều trị');
        }

        let clean = data.response
            .replace(/```html/gi, "")
            .replace(/```/g, "")
            .trim();

        // Render with proper wrapper and styling
        box.innerHTML = `
            <div class="gemini-advice-content">
                <h4>
                    <span class="material-icons-round">auto_awesome</span>
                    Phác đồ điều trị:
                </h4>
                <div class="advice-content">${clean}</div>
            </div>`;
        box.style.display = 'block';
        
        // Smooth scroll to result
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Attach event listeners to show/hide details buttons after rendering
        setTimeout(() => {
            const detailButtons = box.querySelectorAll('.btn-show-details');
            detailButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    const summaryDiv = this.parentElement;
                    const detailsDiv = summaryDiv.nextElementSibling;
                    
                    if (detailsDiv && detailsDiv.classList.contains('treatment-details')) {
                        detailsDiv.style.display = 'block';
                        this.style.display = 'none';
                        
                        // Add close button to details
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'btn-hide-details';
                        closeBtn.innerHTML = '<span class="material-icons-round">expand_less</span> Thu gọn';
                        closeBtn.addEventListener('click', function() {
                            detailsDiv.style.display = 'none';
                            btn.style.display = 'flex';
                            this.remove();
                        });
                        
                        detailsDiv.querySelector('.treatment-content').appendChild(closeBtn);
                    }
                });
            });
        }, 100);
        
    } catch (error) {
        box.innerHTML = `
            <p style="color:#dc2626">
                <b>⚠️ Lỗi kết nối Gemini:</b> ${error.message}
            </p>
            <p style="margin-top: 10px;">Vui lòng thử lại sau hoặc kiểm tra kết nối internet.</p>
        `;
        box.style.display = 'block';
    } finally {
        overlay.style.display = "none"; 
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-icons-round">auto_awesome</span> Lập lại phác đồ';
        }
    }
}

/**************************************
 * LIGHTBOX IMAGE
 **************************************/
function initImageLightbox() {
    document.addEventListener("click", (e) => {
        if (!e.target.matches(".result-img-box img")) return;

        const lightbox = document.createElement("div");
        lightbox.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.9);
            display:flex; justify-content:center; align-items:center;
            cursor:zoom-out; z-index:9999;
        `;

        const img = document.createElement("img");
        img.src = e.target.src;
        img.style.cssText = `
            max-width:90vw; max-height:90vh; border-radius:8px;
        `;

        lightbox.appendChild(img);
        document.body.appendChild(lightbox);
        lightbox.addEventListener("click", () => lightbox.remove());
    });
}

/**************************************
 * SAVE RESULT TO FISH PROFILE
 **************************************/
async function saveResultToProfile() {
    if (!currentFishId) {
        showCustomModal("error", "Lỗi", "Bạn chưa chọn cá để lưu hồ sơ.");
        return;
    }

    const btn = document.getElementById("save-result-btn");
    if (!btn) return;
    btn.disabled = true;

    try {
        const response = await fetch(
            "/HeThongChamSocCaKoi/backend/api/ai/save_analysis.php",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fish_id: currentFishId,
                    result: window.analysisResult,
                    diseases: window.detectedDiseases,
                    summary:
                        (window.detectedDiseases && window.detectedDiseases.length > 0)
                            ? window.detectedDiseases.join(", ")
                            : "Cá khỏe mạnh"
                })
            }
        );

        if (!response.ok) throw new Error("Không thể kết nối đến máy chủ.");

        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            throw new Error("Dữ liệu trả về không hợp lệ.");
        }

        if (!data.success) throw new Error(data.error || "Lưu kết quả thất bại.");

        showCustomModal(
            "success",
            "Đã lưu thành công",
            "Kết quả đã được lưu vào hồ sơ bệnh án cá."
        );

        btn.innerHTML = `<span class="material-icons-round">check_circle</span> Đã lưu`;
        btn.disabled = true;

    } catch (err) {
        showCustomModal("error", "Lỗi", err.message || "Không thể lưu kết quả.");
        btn.disabled = false;
    }
}

/**************************************
 * SELECT FISH (LOAD LIST)
 **************************************/
async function loadKoiList() {
    try {
        const res = await fetch(
            "/HeThongChamSocCaKoi/backend/api/customer/kois/list_by_user.php"
        );

        if (!res.ok) throw new Error("Không thể kết nối đến máy chủ.");

        let data;
        try {
            data = await res.json();
        } catch (parseErr) {
            throw new Error("Dữ liệu trả về không hợp lệ.");
        }

        if (!data.success) throw new Error(data.error || "Không thể tải danh sách cá");

        const list = document.getElementById("fish-list-container");
        if (!list) return;

        const kois = Array.isArray(data.kois) ? data.kois : [];

        if (kois.length === 0) {
            list.innerHTML = `
                <div class="alert-box info" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;">
                    <span class="material-icons-round">info</span>
                    Bạn chưa có cá nào trong hệ thống. Hãy thêm cá trước khi lưu hồ sơ khám.
                </div>
            `;
        } else {
            list.innerHTML = kois
                .map(
                    (koi) => `
                <div class="fish-option"
                    onclick="selectFish(${koi.FishID}, '${escapeHTML(koi.Name)}', '${koi.ImageURL || ""}')">

                    <img src="${koi.ImageURL || "https://placehold.co/100"}" class="w-12 h-12 rounded-full">
                    
                    <div>
                        <div class="font-bold">${escapeHTML(koi.Name)}</div>
                        <div class="text-xs text-slate-500">${escapeHTML(koi.PondName || "")}</div>
                    </div>
                </div>`
                )
                .join("");
        }

        const modal = document.getElementById("select-fish-modal");
        if (modal) modal.style.display = "flex";

    } catch (err) {
        showCustomModal("error", "Lỗi", err.message || "Không thể tải danh sách cá.");
    }
}

function selectFish(id, name, img) {
    currentFishId = id;
    closeModal("select-fish-modal");

    // --- Cập nhật thông tin cá trên giao diện ---
    const card = document.getElementById("fish-context-card");
    const nameEl = document.getElementById("fish-name-display");
    const avatar = document.getElementById("fish-avatar");
    const hiddenInput = document.getElementById("current-fish-id");

    if (card) card.style.display = "flex";
    if (nameEl) nameEl.textContent = name;
    if (avatar) avatar.src = img || "https://placehold.co/100";
    if (hiddenInput) hiddenInput.value = id;

    // --- RESET HOÀN TOÀN GIAO DIỆN CŨ ---
    const resultSection = document.getElementById("result-section");
    const emptyState = document.getElementById("empty-state");
    const previewBox = document.getElementById("preview-box");
    const dropZone = document.getElementById("drop-zone");
    const tipsBox = document.getElementById("tips-box");
    const fileInput = document.getElementById("image-input");
    const diseaseWidget = document.getElementById("disease-widget");
    const badge = document.getElementById("status-badge");
    const submitBtn = document.getElementById("submit-btn");

    // Clear old results
    if (resultSection) resultSection.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";

    // Reset upload UI
    if (previewBox) previewBox.style.display = "none";
    if (dropZone) dropZone.style.display = "flex";
    if (tipsBox) tipsBox.style.display = "block";
    if (fileInput) fileInput.value = "";

    // Reset status badge
    if (badge) {
        badge.className = "status-badge status-empty";
        badge.textContent = "Chờ dữ liệu";
    }

    // Show default disease tips
    if (diseaseWidget) diseaseWidget.style.display = "block";

    // Disable analyze button (no image yet)
    if (submitBtn) submitBtn.disabled = true;

    showCustomModal("success", "Đã chọn cá", `Bạn đang khám cho: ${name}`);
}

function clearFishSelection() {
    currentFishId = null;

    const card = document.getElementById("fish-context-card");
    const hiddenInput = document.getElementById("current-fish-id");
    const saveBtn = document.getElementById("save-result-btn");
    const selectBtn = document.getElementById("btn-select-fish");

    if (card) card.style.display = "none";
    if (hiddenInput) hiddenInput.value = "";
    if (saveBtn) saveBtn.style.display = "none";
    if (selectBtn) selectBtn.style.display = "inline-flex";

    // --- RESET UI Y NHƯ CHỌN CÁ MỚI ---
    const resultSection = document.getElementById("result-section");
    const emptyState = document.getElementById("empty-state");
    const previewBox = document.getElementById("preview-box");
    const dropZone = document.getElementById("drop-zone");
    const tipsBox = document.getElementById("tips-box");
    const fileInput = document.getElementById("image-input");
    const diseaseWidget = document.getElementById("disease-widget");
    const badge = document.getElementById("status-badge");
    const submitBtn = document.getElementById("submit-btn");

    // Xóa kết quả cũ
    if (resultSection) resultSection.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";

    // Reset upload
    if (previewBox) previewBox.style.display = "none";
    if (dropZone) dropZone.style.display = "flex";
    if (tipsBox) tipsBox.style.display = "block";
    if (fileInput) fileInput.value = "";

    // Reset badge
    if (badge) {
        badge.className = "status-badge status-empty";
        badge.textContent = "Chờ dữ liệu";
    }

    // Reset widget
    if (diseaseWidget) diseaseWidget.style.display = "block";

    // Disable button
    if (submitBtn) submitBtn.disabled = true;

    showCustomModal("info", "Đã bỏ chọn cá", "Hệ thống đã quay về trạng thái ban đầu.");
}

function initFishSelection() {
    const selectBtn = document.getElementById("btn-select-fish");
    const fishInput = document.getElementById("current-fish-id");

    if (fishInput && fishInput.value) {
        currentFishId = fishInput.value;
    }

    if (!fishInput || fishInput.value === "") {
        if (selectBtn) {
            selectBtn.style.display = "inline-flex";
            selectBtn.addEventListener("click", loadKoiList);
        }
    } else {
        if (selectBtn) selectBtn.style.display = "none";
    }

    const saveBtn = document.getElementById("save-result-btn");
    if (saveBtn) {
        saveBtn.style.display = currentFishId ? "flex" : "none";
    }
}

/**************************************
 * DOM READY
 **************************************/
document.addEventListener("DOMContentLoaded", () => {
    fileInput = document.getElementById("image-input");
    dropZone = document.getElementById("drop-zone");
    previewBox = document.getElementById("preview-box");
    previewImg = document.getElementById("preview-img");
    submitBtn = document.getElementById("submit-btn");
    btnText = document.getElementById("btn-text");
    btnIcon = document.getElementById("btn-icon");
    spinner = document.getElementById("loading-spinner");
    resultSection = document.getElementById("result-section");
    emptyState = document.getElementById("empty-state");
    skeleton = document.getElementById("skeleton-loading");
    chatMessages = document.getElementById("chat-messages");

    initFileInput();
    initDragDrop();
    initFormSubmit();
    initFishSelection();
    initImageLightbox();
});

/**************************************
 * EXPORT GLOBAL FUNCTIONS
 **************************************/
window.getGeminiAdvice = getGeminiAdvice;
window.sendChatMessage = sendChatMessage;
window.saveResultToProfile = saveResultToProfile;
window.closeModal = closeModal;
window.selectFish = selectFish;
window.clearFishSelection = clearFishSelection;
window.executeConfirm = executeConfirm;
window.toggleAccordion = toggleAccordion;

/**************************************
 * ACCORDION TOGGLE
 **************************************/
function toggleAccordion(id) {
    const content = document.getElementById(id);
    if (!content) return;

    const button = content.previousElementSibling;
    if (!button) return;

    const icon = button.querySelector(".accordion-icon");

    const isActive = content.classList.contains("active");
    content.classList.toggle("active", !isActive);

    if (icon) icon.textContent = isActive ? "expand_more" : "expand_less";
}