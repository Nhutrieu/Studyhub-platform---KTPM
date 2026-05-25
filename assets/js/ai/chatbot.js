/**
 * Tệp này chứa logic:
 * 1. Khởi tạo HTML cho Chatbot Container (#chatbot-container)
 * 2. Logic Kéo thả và Snap cho Robot Icon (#ai-robot-launcher)
 * 3. Logic ẩn/hiện và Gửi/Nhận tin nhắn AI (Đã thêm quản lý lịch sử)
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // === 1. KHỞI TẠO CHATBOT CONTAINER TRONG DOM ===
    const chatbotHTML = `
        <div id="chatbot-container" class="fixed bottom-20 right-4 md:right-8 w-80 h-[400px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden z-[1001] hidden border-2 border-orange-500">
            <div class="chat-header bg-orange-500 text-white p-3 font-bold flex justify-between items-center select-none">
                Trợ lý KoiCare (AI)
                <div class="flex items-center gap-2">
                    <button id="chatbot-clear-history" title="Xóa lịch sử trò chuyện" class="text-xs font-normal text-white/80 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    <button id="chatbot-close" class="text-xl font-semibold hover:text-red-300 transition leading-none">×</button>
                </div>
            </div>
            <div id="chatbot-messages" class="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                <!-- Nội dung tin nhắn sẽ được chèn vào đây -->
            </div>
            <div class="chat-input p-3 border-t border-slate-200 flex gap-2">
                <input type="text" id="chatbot-input" placeholder="Nhập câu hỏi của bạn..." 
                        class="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition text-sm">
                <button id="chatbot-send" title="Gửi" class="w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center transition shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", chatbotHTML);

    // Thêm style
    const style = document.createElement('style');
    style.textContent = `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        #chatbot-messages .msg { padding: 8px 12px; border-radius: 12px; max-width: 85%; }
        #chatbot-messages .msg.user { background-color: #f97316; color: white; margin-left: auto; border-bottom-right-radius: 2px; }
        #chatbot-messages .msg.bot { background-color: #f1f5f9; color: #1e293b; margin-right: auto; border-bottom-left-radius: 2px; }
        
        /* Style cho icon robot draggable */
        #ai-robot-launcher {
            z-index: 1000; 
            right: unset;
            bottom: unset;
            position: fixed;
            transition: top 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), left 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            will-change: top, left; 
            touch-action: none; 
        }
        #ai-robot-launcher.dragging {
            transition: none !important; 
        }
        #ai-robot-launcher:hover {
            opacity: 1;
        }
        .dot-pulse {
            position: relative;
            left: 5px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background-color: #94a3b8;
            color: #94a3b8;
            box-shadow: 0 0 0 0.5px #94a3b8;
            animation: dot-pulse-anim 1.5s infinite ease-in-out;
        }
        .dot-pulse::before, .dot-pulse::after {
            content: '';
            position: absolute;
            top: 0;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background-color: #94a3b8;
            color: #94a3b8;
            box-shadow: 0 0 0 0.5px #94a3b8;
        }
        .dot-pulse::before {
            left: -10px;
            animation: dot-pulse-anim 1.5s infinite ease-in-out;
        }
        .dot-pulse::after {
            left: 10px;
            animation: dot-pulse-anim 1.5s infinite ease-in-out;
            animation-delay: 0.5s;
        }
        @keyframes dot-pulse-anim {
            0% { opacity: 0.5; }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);


    // === 2. LẤY ELEMENTS & KHAI BÁO BIẾN ===
    const launcher = document.getElementById("ai-robot-launcher"); 
    const container = document.getElementById("chatbot-container"); 
    const closeBtn = document.getElementById("chatbot-close");
    const clearHistoryBtn = document.getElementById("chatbot-clear-history");
    const msgBox = document.getElementById("chatbot-messages");
    const input = document.getElementById("chatbot-input");
    const sendBtn = document.getElementById("chatbot-send");

    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    const launcherSize = 56; // Kích thước icon (56px)
    const SNAP_PADDING = 16; // Khoảng cách từ lề màn hình (px)
    
    let snapTimeout;
    const SNAP_DELAY_MS = 3000;
    const HIDE_OFFSET = 20;

    // *** QUẢN LÝ LỊCH SỬ HỘI THOẠI MỚI ***
    let chatHistory = [];
    const HISTORY_KEY = 'koiChatHistory';

    /**
     * Tải lịch sử từ localStorage và hiển thị lên UI
     */
    function loadHistory() {
        try {
            const savedHistory = localStorage.getItem(HISTORY_KEY);
            chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (e) {
            console.error("Lỗi khi tải lịch sử chat:", e);
            chatHistory = [];
        }
        
        msgBox.innerHTML = '';
        if (chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                const parts = msg.parts[0];
                if (parts && parts.text) {
                    const msgEl = document.createElement("div");
                    msgEl.className = `msg ${msg.role === 'user' ? 'user' : 'bot'}`;
                    msgEl.textContent = parts.text;
                    msgBox.appendChild(msgEl);
                }
            });
        }
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    /**
     * Lưu lịch sử hiện tại vào localStorage
     */
    function saveHistory() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory));
        } catch (e) {
            console.error("Lỗi khi lưu lịch sử chat:", e);
        }
    }
    
    /**
     * Xóa lịch sử (UI và Storage)
     */
    function clearHistory() {
        chatHistory = [];
        saveHistory();
        msgBox.innerHTML = ''; // Xóa tin nhắn trên UI
        // Gửi lại lời chào
        displayBotMessage("Chào bạn! Tôi có thể giúp gì cho bạn hôm nay? (Lịch sử đã được xóa)");
    }
    
    // Gắn sự kiện cho nút xóa lịch sử
    clearHistoryBtn.addEventListener("click", clearHistory);


    /**
     * Hiển thị tin nhắn Bot và cập nhật lịch sử
     */
    function displayBotMessage(text) {
        const reply = document.createElement("div");
        reply.className = "msg bot";
        reply.textContent = text;
        msgBox.appendChild(reply);
        
        // Cập nhật lịch sử CHỈ khi đây là tin nhắn AI thực sự, không phải lỗi
        if (text !== "Lỗi kết nối đến AI. Vui lòng thử lại.") {
            chatHistory.push({ role: 'model', parts: [{ text: text }] });
            saveHistory();
        }
        msgBox.scrollTop = msgBox.scrollHeight;
    }

    // === 3. LOGIC ẨN/HIỆN CHATBOT ===
    function toggleChatbotVisibility() {
        const isHidden = container.classList.contains("hidden");
        if (isHidden) {
            container.classList.remove("hidden");
            launcher.style.display = "none";
            clearTimeout(snapTimeout);
            
            // Tải và hiển thị lịch sử khi mở
            loadHistory(); 

            // Lời chào ban đầu (chỉ nếu lịch sử rỗng)
            if (chatHistory.length === 0) {
                displayBotMessage("Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?");
            }

            msgBox.scrollTop = msgBox.scrollHeight;
            input.focus();
        } else {
            container.classList.add("hidden");
            launcher.style.display = "flex";
            
            snapToNearestEdge(launcher);
            snapTimeout = setTimeout(autoCollapseToEdge, SNAP_DELAY_MS);
        }
    }

    closeBtn.addEventListener("click", toggleChatbotVisibility);

    // === 4. LOGIC GỬI TIN NHẮN ===
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Thêm tin nhắn người dùng vào UI
        const userMsg = document.createElement("div");
        userMsg.className = "msg user";
        userMsg.textContent = text;
        msgBox.appendChild(userMsg);
        input.value = "";
        msgBox.scrollTop = msgBox.scrollHeight;

        // Cập nhật lịch sử chat với tin nhắn người dùng mới
        // (Tin nhắn này CHƯA được lưu vào localStorage, sẽ được lưu sau khi có phản hồi BOT)
        const newUserMessage = { role: 'user', parts: [{ text: text }] };
        chatHistory.push(newUserMessage);


        // Thêm thông báo loading
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "msg bot loading flex items-center gap-1";
        loadingMsg.innerHTML = '<span class="dot-pulse"></span> Đang soạn phản hồi...';
        msgBox.appendChild(loadingMsg);
        msgBox.scrollTop = msgBox.scrollHeight;
        
        // Vô hiệu hóa input/send button khi đang chờ
        input.disabled = true;
        sendBtn.disabled = true;


        // Gửi toàn bộ lịch sử (bao gồm tin nhắn mới nhất) lên API
        const payload = { 
            prompt: text, // Vẫn gửi prompt riêng để PHP dễ lấy
            history: chatHistory.slice(0, -1) // Gửi lịch sử cũ (loại bỏ tin nhắn user mới nhất, vì PHP sẽ tự thêm)
        }; 
        
        // Thêm tin nhắn người dùng mới vào history cho lần gửi tiếp theo nếu API lỗi
        // Hoặc giữ nguyên logic trên: gửi history cũ, prompt mới. PHP tự thêm prompt mới vào.
        // Cần đảm bảo lịch sử được cập nhật chính xác sau khi có phản hồi.
        
        
        // ** Tối ưu lại logic: Giữ nguyên chatHistory chỉ chứa tin nhắn CŨ.
        // Gửi prompt mới và history cũ lên. Sau khi có phản hồi, thêm cả user và bot vào history.
        chatHistory.pop(); // Loại bỏ tin nhắn user vừa thêm

        const historyToSend = chatHistory; // History trước khi người dùng gõ
        const finalPayload = { 
            prompt: text, 
            history: historyToSend 
        };

        // Gọi API
        fetch("/HeThongChamSocCaKoi/backend/api/ai/chatbot.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalPayload),
        })
        .then(res => res.json())
        .then(data => {
            msgBox.removeChild(loadingMsg);
            
            // Tái kích hoạt input/send button
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();

            const responseText =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "Xin lỗi, tôi chưa hiểu câu hỏi này. (Lỗi cấu trúc API)";

            // 1. Thêm tin nhắn user vào lịch sử thật
            chatHistory.push(newUserMessage); 
            // 2. Thêm tin nhắn bot vào lịch sử thật
            displayBotMessage(responseText);

        })
        .catch((error) => {
            console.error("API Fetch Error:", error);
            msgBox.removeChild(loadingMsg);
            
            // Tái kích hoạt input/send button
            input.disabled = false;
            sendBtn.disabled = false;
            
            // Hiển thị lỗi
            displayBotMessage("Lỗi kết nối đến AI. Vui lòng thử lại.");
        });
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

    // === 5. LOGIC KÉO THẢ & SNAP (GIỮ NGUYÊN) ===

    /**
     * Hàm tự động thu gọn "NÉP ÂM" vào cạnh màn hình
     */
    function autoCollapseToEdge() {
        if (isDragging || !launcher || !container.classList.contains('hidden')) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const x = launcher.offsetLeft;
        const y = launcher.offsetTop;

        const distL = x;
        const distR = w - (x + launcherSize);
        const distT = y;
        const distB = h - (y + launcherSize);
        const minDistance = Math.min(distL, distR, distT, distB);

        let newX = x, newY = y;

        if (minDistance === distL || Math.abs(x - SNAP_PADDING) < 5) {
            newX = -HIDE_OFFSET;
        } 
        else if (minDistance === distR || Math.abs(distR - SNAP_PADDING) < 5) {
            newX = w - launcherSize + HIDE_OFFSET;
        }
        else if (minDistance === distT || Math.abs(y - SNAP_PADDING) < 5) {
            newY = -HIDE_OFFSET;
        }
        else if (minDistance === distB || Math.abs(distB - SNAP_PADDING) < 5) {
            newY = h - launcherSize + HIDE_OFFSET;
        }

        launcher.style.left = newX + "px";
        launcher.style.top = newY + "px";
        localStorage.setItem("robotLauncherLeft", newX);
        localStorage.setItem("robotLauncherTop", newY);
    }

    /**
     * Hàm tính toán và đẩy icon về cạnh gần nhất (Trái, Phải, Trên, Dưới)
     */
    function snapToNearestEdge(element) {
        if (!element) return;
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        const x = element.offsetLeft;
        const y = element.offsetTop;

        const distL = x;                         
        const distR = w - (x + launcherSize);    
        const distT = y;                         
        const distB = h - (y + launcherSize);    
        
        const minDistance = Math.min(distL, distR, distT, distB);
        
        let newX = x;
        let newY = y;
        
        if (minDistance === distL) { 
            newX = SNAP_PADDING;
        } else if (minDistance === distR) { 
            newX = w - launcherSize - SNAP_PADDING;
        } else if (minDistance === distT) { 
            newY = SNAP_PADDING;
        } else if (minDistance === distB) { 
            newY = h - launcherSize - SNAP_PADDING;
        }

        newX = Math.max(SNAP_PADDING, Math.min(newX, w - launcherSize - SNAP_PADDING));
        newY = Math.max(SNAP_PADDING, Math.min(newY, h - launcherSize - SNAP_PADDING));
        
        element.style.left = newX + "px";
        element.style.top = newY + "px";

        localStorage.setItem("robotLauncherLeft", newX);
        localStorage.setItem("robotLauncherTop", newY);
    }

    // Bắt đầu Kéo thả
    function startDrag(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;

        isDragging = true;
        clearTimeout(snapTimeout);
        launcher.classList.add("dragging");

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        dragOffset.x = clientX - launcher.getBoundingClientRect().left;
        dragOffset.y = clientY - launcher.getBoundingClientRect().top;
        
        launcher.dataset.isClick = 'true'; 

        document.addEventListener("mousemove", onDrag);
        document.addEventListener("mouseup", endDrag);
        document.addEventListener("touchmove", onDrag, { passive: false });
        document.addEventListener("touchend", endDrag);
    }

    // Di chuyển icon
    function onDrag(e) {
        if (!isDragging) return;

        if (e.preventDefault) e.preventDefault();
        launcher.dataset.isClick = 'false';

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let newX = clientX - dragOffset.x;
        let newY = clientY - dragOffset.y;

        const w = window.innerWidth;
        const h = window.innerHeight;

        newX = Math.max(0, Math.min(newX, w - launcherSize));
        newY = Math.max(0, Math.min(newY, h - launcherSize));

        launcher.style.left = newX + "px";
        launcher.style.top = newY + "px";
    }

    // Kết thúc Kéo thả
    function endDrag() {
        if (!isDragging) return;

        document.removeEventListener("mousemove", onDrag);
        document.removeEventListener("mouseup", endDrag);
        document.removeEventListener("touchmove", onDrag);
        document.removeEventListener("touchend", endDrag);

        launcher.classList.remove("dragging");
        isDragging = false;

        snapToNearestEdge(launcher);

        snapTimeout = setTimeout(autoCollapseToEdge, SNAP_DELAY_MS);
    }

    // Xử lý Click
    function handleClick() {
        setTimeout(() => {
            if (launcher.dataset.isClick === 'true') {
                toggleChatbotVisibility();
            }
            launcher.dataset.isClick = 'true';
        }, 50);
    }

    launcher.removeEventListener("click", handleClick);
    launcher.addEventListener("click", handleClick);
    
    launcher.addEventListener("mouseenter", () => {
        if (!isDragging && container.classList.contains("hidden")) {
            snapToNearestEdge(launcher);
            clearTimeout(snapTimeout);
        }
    });
    launcher.addEventListener("mouseleave", () => {
        if (!isDragging && container.classList.contains("hidden")) {
            snapTimeout = setTimeout(autoCollapseToEdge, SNAP_DELAY_MS);
        }
    });


    // === 6. KHỞI TẠO VỊ TRÍ LÚC DOM LOAD ===
    if (launcher) {
        launcher.addEventListener("mousedown", startDrag);
        launcher.addEventListener("touchstart", startDrag, { passive: false });
        
        const savedTop = localStorage.getItem("robotLauncherTop");
        const savedLeft = localStorage.getItem("robotLauncherLeft");

        if (savedTop !== null && savedLeft !== null) {
            launcher.style.top = savedTop + "px";
            launcher.style.left = savedLeft + "px";
            snapToNearestEdge(launcher); 
        } else {
            launcher.style.left = window.innerWidth - launcherSize - SNAP_PADDING + "px";
            launcher.style.top = window.innerHeight - launcherSize - SNAP_PADDING + "px";
        }
        
        window.addEventListener('resize', () => {
            snapToNearestEdge(launcher);
        });
    }
});