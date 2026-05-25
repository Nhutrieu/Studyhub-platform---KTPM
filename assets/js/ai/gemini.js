document.addEventListener("DOMContentLoaded", () => {
  // Tạo chatbot tự động khi DOM load
  const chatbotHTML = `
    <div id="chatbot-container" class="hidden">
      <div class="chat-header">
        Trợ lý KoiCare
        <button id="chatbot-close">×</button>
      </div>

      <div id="chatbot-messages"></div>

      <div class="chat-input">
        <input type="text" id="chatbot-input" placeholder="Nhập câu hỏi của bạn...">
        <button id="chatbot-send" title="Gửi">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>

    <div id="chatbot-toggle">💬</div>
  `;
  document.body.insertAdjacentHTML("beforeend", chatbotHTML);

  const toggleBtn = document.getElementById("chatbot-toggle");
  const container = document.getElementById("chatbot-container");
  const closeBtn = document.getElementById("chatbot-close");
  const msgBox = document.getElementById("chatbot-messages");
  const input = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send");

  // 🟢 Mở chatbot
  toggleBtn.addEventListener("click", () => {
    container.classList.remove("hidden");
    toggleBtn.style.display = "none";

    if (!msgBox.dataset.greeted) {
      const greet = document.createElement("div");
      greet.className = "msg bot";
      greet.textContent = "Chào bạn! Tôi có thể giúp gì cho bạn hôm nay?";
      msgBox.appendChild(greet);
      msgBox.dataset.greeted = "true";
    }
  });

  // 🔴 Đóng chatbot
  closeBtn.addEventListener("click", () => {
    container.classList.add("hidden");
    toggleBtn.style.display = "flex";
  });

  // ✉️ Gửi tin nhắn
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.textContent = text;
    msgBox.appendChild(userMsg);
    input.value = "";
    msgBox.scrollTop = msgBox.scrollHeight;

    fetch("/HeThongChamSocCaKoi/backend/api/ai/gemini.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    })
      .then(res => res.json())
      .then(data => {
        const reply = document.createElement("div");
        reply.className = "msg bot";
        reply.textContent =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Xin lỗi, tôi chưa hiểu câu hỏi này.";
        msgBox.appendChild(reply);
        msgBox.scrollTop = msgBox.scrollHeight;
      })
      .catch(() => {
        const err = document.createElement("div");
        err.className = "msg bot";
        err.textContent = "Lỗi kết nối đến AI.";
        msgBox.appendChild(err);
      });
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });
});
