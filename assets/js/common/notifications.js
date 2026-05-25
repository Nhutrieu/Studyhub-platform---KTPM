// FILE: assets/js/common/notifications.js
// Xử lý chuông thông báo & Giao diện Facebook (Inject CSS + Logic)
// [UPDATED] Tích hợp tự động kiểm tra nhắc nhở cho ăn (Feeding Reminder)

(function() {
    const notiBtn = document.getElementById('noti-btn');
    const notiBadge = document.getElementById('noti-badge');
    const apiBase = '/HeThongChamSocCaKoi/backend/api/notifications/';
    let notiDropdown = null;
    let isChecking = false; // Flag tránh gọi chồng chéo
    let previousUnreadCount = null; // Biến mới: Theo dõi số lượng thông báo chưa đọc lần trước
    let allNotifications = []; // Biến lưu trữ tất cả thông báo
    let activeFilter = 'all'; // Biến mới: 'all' hoặc 'unread'

    // Hàm phát âm thanh thông báo (sử dụng Web Audio API để tạo tiếng beep đơn giản)
    function playNotificationSound() {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.type = 'sine'; // Sóng sin
            oscillator.frequency.setValueAtTime(440, context.currentTime); // Tần số 440 Hz (A4)

            // Âm lượng
            gainNode.gain.setValueAtTime(0, context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);

            // Bắt đầu và dừng
            oscillator.start();
            oscillator.stop(context.currentTime + 0.3); // Kéo dài 300ms
        } catch (e) {
            console.warn("Web Audio API not supported or failed to play sound:", e);
        }
    }

    // 0. Inject CSS (Facebook Style) vào trang
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* CSS Đã có */
            .fb-noti-dropdown {
                position: absolute; top: 80px; right: 10px;
                width: 360px; max-height: 85vh;
                background: #fff; border-radius: 8px;
                box-shadow: 0 12px 28px 0 rgba(0,0,0,0.2), 0 2px 4px 0 rgba(0,0,0,0.1);
                display: none; z-index: 9999;
                flex-direction: column;
                font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
                overflow: hidden; animation: fbFadeIn 0.2s ease-out;
            }
            @keyframes fbFadeIn { from {opacity: 0; transform: translateY(5px);} to {opacity: 1; transform: translateY(0);} }

            .fb-noti-header { padding: 16px 16px 8px 16px; flex-shrink: 0; background:white; }
            .fb-noti-title { font-size: 24px; font-weight: 700; color: #050505; margin-bottom: 12px; }
            .fb-noti-filters { display: flex; gap: 8px; }
            .fb-pill {
                border-radius: 18px; padding: 0 12px; height: 36px;
                display: flex; align-items: center; justify-content: center;
                font-size: 15px; font-weight: 600; cursor: pointer;
                transition: 0.2s; border: none; outline: none;
            }
            .fb-pill.active { background-color: #e7f3ff; color: #1877f2; }
            .fb-pill.inactive { background-color: #e4e6eb; color: #050505; }
            .fb-pill:hover { background-color: #d8dadf; }

            .fb-noti-list { flex: 1; overflow-y: auto; padding: 8px; }
            .fb-noti-list::-webkit-scrollbar { width: 8px; }
            .fb-noti-list::-webkit-scrollbar-thumb { background: #bcc0c4; border-radius: 4px; }

            .fb-noti-item {
                display: flex; align-items: flex-start; gap: 12px;
                padding: 8px; border-radius: 8px; cursor: pointer; position: relative;
                transition: background-color 0.2s; text-decoration: none !important;
            }
            .fb-noti-item:hover { background-color: #f0f2f5; }
            .fb-noti-item:hover .noti-options-btn { opacity: 1; } /* Hiện nút 3 chấm khi hover item */
            
            .fb-avatar-container { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
            .fb-avatar-circle {
                width: 56px; height: 56px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 24px;
            }
            .fb-badge-icon {
                position: absolute; bottom: -2px; right: -2px;
                width: 28px; height: 28px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 14px; border: 2px solid #fff;
            }

            .fb-content { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-top: 2px; }
            .fb-text { font-size: 15px; line-height: 1.3333; color: #050505; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
            .fb-text strong { font-weight: 600; }
            .fb-time { font-size: 13px; color: #65676b; font-weight: 500; }
            
            .fb-dot {
                width: 12px; height: 12px; border-radius: 50%;
                background-color: #1877f2; flex-shrink: 0; margin-top: 22px;
            }
            .fb-noti-item.read .fb-dot { display: none; }
            .fb-noti-item.read .fb-text { color: #65676b; }
            
            /* CSS Badge */
            #noti-badge { 
                position: absolute;
                top: -4px; 
                right: -4px; 
                background-color: #fa383e; 
                color: white;
                font-size: 10px; 
                font-weight: 700;
                border-radius: 8px; 
                padding: 1px 4px; 
                min-width: 16px; 
                height: 16px; 
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                border: 2px solid white; 
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                transition: transform 0.2s ease-out; 
            }

            /* CSS cho nút 3 chấm (Menu Options) */
            .noti-options-container {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 10;
            }

            .noti-options-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background-color: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
                border: none;
                opacity: 0; /* Mặc định ẩn, chỉ hiện khi hover item */
            }
            .noti-options-btn:hover {
                background-color: #e4e6eb;
            }
            .noti-options-btn i {
                color: #65676b;
                font-size: 16px;
            }

            .noti-options-menu {
                position: absolute;
                top: 40px; 
                right: 0;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                width: 200px;
                display: none;
                padding: 4px 0;
                z-index: 10001;
            }
            .noti-options-menu.show {
                display: block;
            }

            .noti-options-menu button {
                width: 100%;
                padding: 8px 12px;
                text-align: left;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 15px;
                color: #050505;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background-color 0.2s;
            }
            .noti-options-menu button:hover {
                background-color: #f0f2f5;
            }
        `;
        document.head.appendChild(style);
    }

    // 1. Tạo Dropdown Menu chuẩn FB Style
    function createDropdown() {
        const div = document.createElement('div');
        div.className = 'fb-noti-dropdown';
        div.innerHTML = `
            <div class="fb-noti-header">
                <div class="fb-noti-title">Thông báo</div>
                <div class="fb-noti-filters">
                    <button id="filter-all" class="fb-pill active">Tất cả</button>
                    <button id="filter-unread" class="fb-pill inactive">Chưa đọc</button>
                </div>
            </div>
            <div id="noti-list" class="fb-noti-list"></div>
        `;
        document.body.appendChild(div);

        // [LOGIC MỚI] Gán sự kiện cho các nút lọc
        const filterAllBtn = div.querySelector('#filter-all');
        const filterUnreadBtn = div.querySelector('#filter-unread');

        filterAllBtn.addEventListener('click', () => {
            activeFilter = 'all';
            filterAllBtn.className = 'fb-pill active';
            filterUnreadBtn.className = 'fb-pill inactive';
            renderList(allNotifications);
        });

        filterUnreadBtn.addEventListener('click', () => {
            activeFilter = 'unread';
            filterAllBtn.className = 'fb-pill inactive';
            filterUnreadBtn.className = 'fb-pill active';
            renderList(allNotifications);
        });
        
        div.addEventListener('click', (e) => e.stopPropagation());
        return div;
    }

    // 2. Fetch Notifications (Updated Logic: Real-time update & Sound)
    async function fetchNoti() {
        if (isChecking) return;
        isChecking = true;

        try {
            // Bước 1: Gọi Trigger kiểm tra (Chạy song song Feeding và Salt)
            await Promise.allSettled([
                fetch(apiBase + 'check_feeding.php'),
                fetch(apiBase + 'check_salt.php')
            ]);

            // Bước 2: Lấy danh sách thông báo về
            const res = await fetch(apiBase + 'list.php');
            const data = await res.json();
            
            if (data.success) {
                const currentUnreadCount = data.unread_count;

                // [LOGIC MỚI] Kiểm tra và Phát âm thanh nếu có thông báo mới
                if (previousUnreadCount !== null && currentUnreadCount > previousUnreadCount) {
                    playNotificationSound();
                }

                renderBadge(currentUnreadCount);
                allNotifications = data.items; // Lưu trữ tất cả thông báo
                renderList(allNotifications);
                
                // Cập nhật số lượng chưa đọc cũ
                previousUnreadCount = currentUnreadCount;
            }
        } catch (e) {
            console.error("Noti fetch error", e);
        } finally {
            isChecking = false;
        }
    }

    // 3. Render Badge (Đã chỉnh sửa để áp dụng style mới và hiệu ứng)
    function renderBadge(count) {
        if (notiBadge) {
            if (count > 0) {
                notiBadge.style.display = 'flex'; // Dùng flex để căn giữa số
                notiBadge.innerText = count > 99 ? '99+' : count;
                
                // Hiệu ứng "nhảy" nhẹ khi có thông báo mới (tạo sự sống động)
                if (previousUnreadCount !== null && count > previousUnreadCount) {
                    notiBadge.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        notiBadge.style.transform = 'scale(1)';
                    }, 200);
                }

            } else {
                notiBadge.style.display = 'none';
            }
        }
    }

    // 4. Render List (FB Style)
    function renderList(items) {
        if (!notiDropdown) return; 
        const list = notiDropdown.querySelector('#noti-list');
        
        // [LOGIC MỚI] Lọc theo activeFilter
        let filteredItems = items;
        if (activeFilter === 'unread') {
            filteredItems = items.filter(n => n.IsRead == 0);
        }

        if (!filteredItems || filteredItems.length === 0) {
            list.innerHTML = '<div style="padding:40px; text-align:center; color:#65676b;">Không có thông báo nào</div>';
            return;
        }

        list.innerHTML = filteredItems.map(n => {
            const isUnread = n.IsRead == 0;
            const timeAgoStr = timeAgo(n.CreatedAt);
            
            // Config Icon & Color based on Type
            let iconClass = 'fas fa-info';
            let iconBg = '#2d88ff'; // Blue default
            let subIcon = 'fas fa-comment-alt';
            let subIconBg = '#22c55e'; // Green default

            if(n.Type === 'danger') {
                iconClass = 'fas fa-exclamation-triangle';
                iconBg = '#f02849'; // Red
                subIcon = 'fas fa-shield-alt';
                subIconBg = '#f02849';
            } else if (n.Type === 'warning') {
                iconClass = 'fas fa-bell';
                iconBg = '#f7b928'; // Yellow
                subIcon = 'fas fa-exclamation'; 
                subIconBg = '#f7b928';

                // [Custom Icon Logic] Phân biệt icon dựa vào Link
                if (n.Link && n.Link.includes('feeding.php')) {
                    subIcon = 'fas fa-utensils'; // Icon thìa dĩa cho Feeding
                } else if (n.Link && n.Link.includes('salt.php')) {
                    subIcon = 'fas fa-cubes'; // Icon hình khối cho Muối
                }
            } else if (n.Type === 'success') {
                iconClass = 'fas fa-check';
                iconBg = '#45bd62'; // Green
                subIcon = 'fas fa-check-circle';
                subIconBg = '#45bd62';
            }
            
            // Thêm nút 3 chấm vào cuối mỗi item
            return `
            <div class="fb-noti-item ${isUnread ? 'unread' : 'read'}" data-noti-id="${n.NotiID}">
                <div onclick="window.openNotiLink('${n.Link}', ${n.NotiID})" style="display:contents;">
                    <div class="fb-avatar-container">
                        <div class="fb-avatar-circle" style="background: ${iconBg}">
                            <i class="${iconClass}"></i>
                        </div>
                        <div class="fb-badge-icon" style="background: ${subIconBg}">
                            <i class="${subIcon}"></i>
                        </div>
                    </div>
                    <div class="fb-content">
                        <div class="fb-text">
                            <strong>Hệ thống</strong> ${n.Message}
                        </div>
                        <div class="fb-time" style="${isUnread ? 'color:#2d88ff; font-weight:600' : ''}">${timeAgoStr}</div>
                    </div>
                    ${isUnread ? '<div class="fb-dot"></div>' : ''}
                </div>
                
                <div class="noti-options-container" onclick="event.stopPropagation(); window.toggleOptionsMenu(event, ${n.NotiID}, ${isUnread ? 1 : 0})">
                    <button class="noti-options-btn" type="button" aria-label="Tùy chọn">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div id="menu-${n.NotiID}" class="noti-options-menu">
                        <!-- Menu items will be injected by window.toggleOptionsMenu -->
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // Helper: Time Ago (Không thay đổi)
    function timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return "Vừa xong";
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vừa xong";
    }

    // 5. Mark Read Logic
    async function _markRead(id) { // Đổi tên thành private function
        await fetch(apiBase + 'mark_read.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'id=' + id
        });
        fetchNoti();
    }

    // [HÀM MỚI] Mark Unread Logic
    async function _markUnread(id) { // Đổi tên thành private function
        await fetch(apiBase + 'mark_unread.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'id=' + id
        });
        fetchNoti();
    }

    // Gán các hàm xử lý API vào window để HTML có thể gọi
    window.markRead = _markRead;
    window.markUnread = _markUnread;


    // [HÀM MỚI] Toggle Options Menu - ĐÃ ĐẢO NGƯỢC LOGIC HIỂN THỊ NÚT
    window.toggleOptionsMenu = function(event, id, isUnreadFlag) {
        event.stopPropagation();
        const menu = document.getElementById(`menu-${id}`);
        const allMenus = document.querySelectorAll('.noti-options-menu.show');

        // Đóng tất cả menu khác
        allMenus.forEach(m => {
            if (m.id !== `menu-${id}`) {
                m.classList.remove('show');
            }
        });

        // Toggle menu hiện tại
        const isShown = menu.classList.contains('show');
        if (isShown) {
            menu.classList.remove('show');
        } else {
            // isUnreadFlag = 1 (chưa đọc) hoặc 0 (đã đọc)
            let menuContent = '';

            if (isUnreadFlag === 1) { // Nếu CHƯA ĐỌC, hiện nút ĐÁNH DẤU LÀ ĐÃ ĐỌC
                 menuContent = `
                    <button onclick="window.markRead(${id}); window.closeOptionsMenu();">
                        <i class="fas fa-check"></i> Đánh dấu là đã đọc
                    </button>
                `;
            } else { // Nếu ĐÃ ĐỌC, hiện nút ĐÁNH DẤU LÀ CHƯA ĐỌC
                menuContent = `
                    <button onclick="window.markUnread(${id}); window.closeOptionsMenu();">
                        <i class="fas fa-undo"></i> Đánh dấu là chưa đọc
                    </button>
                `;
            }
            menu.innerHTML = menuContent;
            menu.classList.add('show');
        }
    };
    
    // [HÀM MỚI] Đóng tất cả menu tùy chọn
    window.closeOptionsMenu = function() {
        document.querySelectorAll('.noti-options-menu').forEach(m => m.classList.remove('show'));
    };

    // Global helper
    window.openNotiLink = function(link, id) {
        _markRead(id); // Sử dụng hàm private _markRead
        // Kiểm tra link valid (không null, không undefined)
        if (link && link !== 'null' && link !== 'undefined') {
            window.location.href = link;
        }
    };

    // Init
    injectStyles(); // Chạy ngay khi file load

    if (notiBtn) {
        notiDropdown = createDropdown();
        
        notiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Đóng các dropdown khác (user menu, tools)
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
            window.closeOptionsMenu(); // Đảm bảo đóng menu 3 chấm

            // Toggle FB Dropdown
            const isShown = notiDropdown.style.display === 'flex';
            notiDropdown.style.display = isShown ? 'none' : 'flex';
            
            // Khi mở/đóng dropdown, gọi lại fetchNoti để đảm bảo hiển thị trạng thái mới nhất
            fetchNoti(); 
        });

        // Close when click outside
        document.addEventListener('click', (e) => {
            if (notiDropdown && notiDropdown.style.display === 'flex') {
                if (!notiDropdown.contains(e.target) && !notiBtn.contains(e.target)) {
                    notiDropdown.style.display = 'none';
                }
            }
            window.closeOptionsMenu(); // Đóng menu 3 chấm khi click ra ngoài
        });

        // Polling (vẫn duy trì để cập nhật "realtime" - 30s check 1 lần)
        fetchNoti();
        setInterval(fetchNoti, 30000); // 30s check 1 lần
    }
})();