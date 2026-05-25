<?php
// Buộc máy chủ gửi mã trạng thái HTTP 404 Not Found
header("HTTP/1.0 404 Not Found");
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 | Lãnh Địa Vô Lượng Vô Xứ</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Tải Font Inter và Oswald cho phong cách mạnh mẽ */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Oswald:wght@200..700&display=swap');

        /* --- Định nghĩa biến màu dựa trên chủ đề Infinite Void (Vô Lượng Vô Xứ) --- */
        :root {
            --void-blue: #0A1931; /* Xanh sâu thẳm của Không gian/Lãnh địa */
            --cosmos-white: #ECF0F1; /* Trắng, thông tin/sao */
            --hollow-purple: #8E44AD; /* Tím Gojo/Ánh sáng Lãnh địa */
            --glitch-neon: #3498DB; /* Xanh neon sáng, thông tin quá tải */
        }
        
        body {
            font-family: 'Oswald', 'Inter', sans-serif;
            /* Giữ nguyên nền mặc định của body (màu xanh sâu thẳm) */
            background-color: var(--void-blue); 
            
            color: var(--cosmos-white);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            overflow: hidden;
            position: relative;
        }

        /* Hiệu ứng Static/Information Noise Overlay cho toàn bộ nền */
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            /* Mô phỏng các đường nét và thông tin quá tải */
            background-image: repeating-linear-gradient(
                0deg,
                rgba(255, 255, 255, 0.05) 0px,
                rgba(255, 255, 255, 0.05) 1px,
                transparent 2px,
                transparent 4px
            );
            pointer-events: none;
            z-index: 5;
            opacity: 0.7;
            animation: static-shift 10s linear infinite;
        }
        @keyframes static-shift {
            to { background-position: 100% 100%; }
        }


        /* --- Hiệu ứng JJK: Lõi Lãnh Địa --- */
        .void-core {
            position: relative;
            z-index: 10;
            max-width: 90%;
            
            /* THAY ĐỔI CSS: Thêm background-attachment fixed cho hiệu ứng thị sai */
            background-color: rgba(0, 0, 0, 0.5); /* Giảm độ mờ để ảnh nền xuyên qua */
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed; /* Hiệu ứng thị sai cho nền trong khung */
            transition: background-image 1s ease-in-out; /* Hoạt ảnh chuyển đổi nền */
            
            /* Thay đổi màu border và shadow sang theme Vô Lượng */
            border: 4px solid var(--hollow-purple);
            box-shadow: 0 0 50px rgba(142, 68, 173, 0.9), 0 0 20px var(--glitch-neon) inset;
            animation: pulse-void 4s infinite alternate ease-in-out;
            border-radius: 1.5rem;
            backdrop-filter: blur(8px); /* Blur mạnh hơn để nổi bật */
            padding: 3rem 2rem;
        }

        /* Hoạt ảnh Lãnh Địa (Pulse Void) */
        @keyframes pulse-void {
            0% { border-color: var(--hollow-purple); box-shadow: 0 0 30px rgba(142, 68, 173, 0.7); }
            100% { border-color: var(--glitch-neon); box-shadow: 0 0 60px var(--glitch-neon), 0 0 25px var(--hollow-purple) inset; }
        }

        /* --- Hiệu ứng Glitch cho số 404 --- */
        .glitch-text {
            color: var(--cosmos-white);
            font-size: clamp(4rem, 15vw, 12rem);
            font-weight: 700;
            letter-spacing: 0.5rem;
            position: relative;
            animation: glitch 0.8s infinite alternate-reverse; /* Giảm thời gian để tăng sự điên cuồng */
            text-shadow: 0 0 15px var(--hollow-purple);
        }

        @keyframes glitch {
            0% { text-shadow: 6px 6px 0 var(--hollow-purple), -6px -6px 0 var(--glitch-neon); transform: translate(2px, -2px); }
            50% { text-shadow: -6px 0 0 var(--hollow-purple), 6px 0 0 var(--glitch-neon); transform: translate(-2px, 2px); }
            100% { text-shadow: 0 6px 0 var(--hollow-purple), 0 -6px 0 var(--glitch-neon); transform: translate(0); }
        }

        /* --- Hiệu ứng Sóng (Wave) cho Thông tin (Văn bản Phụ) --- */
        .infinite-info-text {
            color: var(--cosmos-white);
            font-size: clamp(1.25rem, 3vw, 2.25rem);
            font-weight: 500;
            position: relative;
            text-shadow: 0 0 5px var(--glitch-neon);
        }
        /* Sử dụng pseudo-element để tạo hiệu ứng lớp thông tin bị bóp méo */
        .infinite-info-text::before {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            color: var(--hollow-purple);
            overflow: hidden;
            animation: wave-clip 6s infinite ease-in-out;
            z-index: -1;
            transform: skewX(-5deg); /* Thêm hiệu ứng bóp méo */
            opacity: 0.9;
        }

        @keyframes wave-clip {
            0%, 100% { clip-path: inset(0 0 95% 0); }
            33% { clip-path: inset(0 0 60% 0); }
            66% { clip-path: inset(0 0 30% 0); }
        }

        /* --- Nút bấm: Thoát khỏi Lãnh Địa --- */
        .domain-exit-button {
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 0 15px var(--glitch-neon);
            font-weight: 600;
            text-transform: uppercase;
        }
        .domain-exit-button:hover {
            transform: scale(1.05);
            background-color: var(--glitch-neon);
            color: var(--void-blue);
            box-shadow: 0 0 40px var(--glitch-neon), 0 0 15px var(--hollow-purple) inset;
        }
        
        /* Hiệu ứng hạt Vô Lượng (Background Particles - Stars/Information) */
        .particle {
            position: fixed;
            border-radius: 50%;
            z-index: 1;
        }
        /* Keyframes cho hiệu ứng hạt Vô Lượng */
        @keyframes particle-flow {
            0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
            50% { transform: translate(15vw, 8vh) scale(1.2); opacity: 0.4; }
            100% { transform: translate(-15vw, -8vh) scale(1); opacity: 0.7; }
        }

    </style>
</head>
<body>
    <!-- Responsive adjustment: Increased max-width from max-w-3xl to max-w-4xl/5xl -->
    <div class="void-core text-center w-full max-w-4xl lg:max-w-5xl p-8 md:p-16" id="void-core">
        <!-- Tiêu đề Glitch 404 -->
        <h1 class="glitch-text" id="glitch-404">404</h1>

        <!-- Dòng chú thích Vô Lượng Vô Xứ -->
        <p class="infinite-info-text my-8 tracking-wider" data-text="THÔNG TIN QUÁ TẢI. LÃNH ĐỊA VÔ LƯỢNG ĐÃ KHAI TRIỂN.">
            THÔNG TIN QUÁ TẢI. LÃNH ĐỊA VÔ LƯỢNG ĐÃ KHAI TRIỂN.
        </p>
        
        <!-- Mô tả trạng thái lỗi -->
        <p class="mt-4 mb-10 text-lg md:text-xl font-light text-gray-300">
            Bạn đã bước vào **Vô Lượng Vô Xứ**. Hàng tỷ tỷ gigabytes thông tin đã làm tê liệt hệ thống.
            <br/> Mọi kết nối đều là vô nghĩa. Bạn không thể tìm thấy trang này.
        </p>

        <!-- Nút Quay lại: Thoát khỏi Lãnh Địa -->
        <a href="/HeThongChamSocCaKoi/index.php" class="domain-exit-button inline-block px-12 py-5 bg-gradient-to-r from-purple-700 to-blue-600 text-white text-xl rounded-2xl transition duration-500 ease-in-out">
            ĐẢO NGƯỢC KỸ THUẬT: Thoát Khỏi Lãnh Địa
        </a>
        
        <p class="text-sm mt-10 opacity-70">
            Hệ thống Cảnh báo Chú Thuật: Unlimited Void Protocol.
        </p>

        <!-- Phần cài đặt nền cho người dùng -->
        <div class="mt-12 p-4 bg-gray-900 bg-opacity-50 rounded-lg shadow-inner">
            <label for="bg-url" class="block text-sm font-semibold mb-2 text-glitch-neon">
                LỰA CHỌN KẾT GIỚI: URL Hình Ảnh Nền Tùy Chỉnh
            </label>
            <input type="url" id="bg-url" placeholder="Dán URL hình ảnh (ví dụ: vũ trụ, Gojo Satoru)" 
                   class="w-full p-3 border border-hollow-purple rounded-lg bg-gray-800 text-cosmos-white focus:ring-glitch-neon focus:border-glitch-neon"
                   value="/HeThongChamSocCaKoi/assets/images/voluongkhongxu.jpg" 
                   onchange="applyBackground(this.value)" />
            <p class="text-xs text-gray-400 mt-2">
                Mẹo: Dán URL hình ảnh và nhấn Enter (hoặc click ra ngoài) để áp dụng ngay lập tức.
                <span class="text-yellow-400 font-bold block mt-1">Lưu ý quan trọng: Đường dẫn file cục bộ (D:\...) sẽ không hoạt động trên trình duyệt. Vui lòng sử dụng đường dẫn tương đối (như giá trị mặc định đã nhập) hoặc URL công khai (https://...).</span>
            </p>
        </div>
        
    </div>

    <!-- JavaScript cho Hiệu ứng Hạt Vô Lượng (Background Particles) và Logic nền -->
    <script>
        // Hàm áp dụng hình ảnh nền
        const applyBackground = (url) => {
            // Lấy phần tử khung lõi
            const core = document.getElementById('void-core');
            
            // Dùng thuộc tính CSS background-image để áp dụng URL lên khung lõi
            if (core) {
                if (url) {
                    core.style.backgroundImage = `url('${url}')`;
                } else {
                    // Quay về màu nền mặc định nếu URL rỗng
                    core.style.backgroundImage = 'none';
                }
            }
        };

        // Tạo một hạt Vô Lượng (sao/thông tin)
        const createParticle = () => {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 2; // Kích thước 2px đến 6px
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Xen kẽ màu Cosmos White, Neon Glitch và Hollow Purple
            const colors = ['var(--cosmos-white)', 'var(--glitch-neon)', 'var(--hollow-purple)'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.backgroundColor = color;
            
            // Vị trí ngẫu nhiên
            particle.style.top = `${Math.random() * 100}vh`;
            particle.style.left = `${Math.random() * 100}vw`;
            
            // Hoạt ảnh (Sử dụng keyframes đã định nghĩa)
            const duration = Math.random() * 10 + 5; // 5s đến 15s
            particle.style.animation = `particle-flow ${duration}s linear infinite alternate-reverse`;
            
            particle.classList.add('particle');
            document.body.appendChild(particle);
        }

        // Tạo 80 hạt Vô Lượng (tăng số lượng)
        const generateParticles = (count) => {
            for (let i = 0; i < count; i++) {
                createParticle();
            }
        }

        // Khởi động các hiệu ứng khi tải trang
        window.onload = () => {
            // Thêm ID cho khung lõi để dễ dàng truy cập trong JS
            const voidCore = document.getElementById('void-core');
            if (voidCore) {
                // Lấy URL mặc định từ input và áp dụng
                const defaultUrl = document.getElementById('bg-url').value;
                applyBackground(defaultUrl);
            }
            
            generateParticles(80); 
            
            // Hiệu ứng thay đổi màu chữ 404 ngẫu nhiên để tăng tính Glitch
            const glitch404 = document.getElementById('glitch-404');
            let colorIndex = 0;
            const colors = ['var(--cosmos-white)', 'var(--glitch-neon)', 'var(--hollow-purple)'];

            setInterval(() => {
                // Thay đổi màu sắc chính của chữ 404
                glitch404.style.color = colors[colorIndex % colors.length];
                
                // Thay đổi màu text-shadow để hiệu ứng glitch luôn mới
                const newHollow = colors[(colorIndex + 1) % colors.length];
                const newNeon = colors[(colorIndex + 2) % colors.length];
                
                // Cập nhật text-shadow (không thể cập nhật keyframes runtime, nên thay đổi text-shadow tĩnh)
                glitch404.style.textShadow = `0 0 15px ${newHollow}, 0 0 5px ${newNeon}`;
                
                colorIndex++;
            }, 500); // Thay đổi màu rất nhanh (mỗi 0.5 giây) để tăng cảm giác quá tải
        };
    </script>
</body>
</html>