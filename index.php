<?php
session_start();

$page_title = "Koi Care System";
include 'includes/header.php';

// Lấy vai trò người dùng (mặc định là guest nếu chưa đăng nhập)
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'guest';
?>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/dashboards/dashboard.css">

<main class="dashboard-page">

    <!-- HERO ================================================== -->
    <section class="hero-section">
        <div class="hero-inner container">
            <div class="hero-left">
                <p class="hero-label">KOI CARE SYSTEM</p>
                <h1 class="hero-title">
                    Nền tảng <span>quản lý & chăm sóc cá Koi</span> toàn diện
                </h1>
                <p class="hero-desc">
                    Theo dõi sức khỏe cá, kiểm soát chất lượng nước, lịch cho ăn, tính toán lượng muối
                    và kết nối với các cửa hàng Koi – tất cả trên một hệ thống duy nhất.
                </p>

                <div class="hero-cta">
                    <?php if ($role === 'guest'): ?>
                        <a href="/HeThongChamSocCaKoi/frontend/auth/login.php" class="btn btn-primary">Bắt đầu ngay</a>
                        <a href="#features" class="btn btn-ghost">Khám phá tính năng</a>
                    <?php else: ?>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="btn btn-primary">
                            Vào hệ thống của tôi
                        </a>
                        <a href="#features" class="btn btn-ghost">Xem thêm tính năng</a>
                    <?php endif; ?>
                </div>

                <div class="hero-stats">
                    <div class="stat-item">
                        <div class="stat-value">24/7</div>
                        <div class="stat-label">Theo dõi hồ cá</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">+20</div>
                        <div class="stat-label">Thông số & chỉ số sức khỏe</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">AI</div>
                        <div class="stat-label">Phân tích hình ảnh cá Koi</div>
                    </div>
                </div>
            </div>

            <div class="hero-right">
                <div class="hero-image-card">
                    <img src="../HeThongChamSocCaKoi/assets/images/koi_hero.jpg" alt="Koi Care System" class="hero-image">

                    <div class="floating-card floating-card-pond">
                        <div class="floating-title">Hồ Koi nhà bạn</div>
                        <div class="floating-metric">
                            <span>26°C</span>
                            <small>Nhiệt độ</small>
                        </div>
                        <div class="floating-inline">
                            <span>pH 7.4</span>
                            <span>Amoniac: an toàn</span>
                        </div>
                    </div>

                    <div class="floating-card floating-card-schedule">
                        <div class="floating-title">Lịch cho ăn hôm nay</div>
                        <ul class="floating-list">
                            <li>08:00 • Thức ăn tăng màu</li>
                            <li>17:30 • Thức ăn duy trì</li>
                        </ul>
                    </div>

                    <div class="floating-badge">
                        <span>Realtime</span> Monitor
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION: LÝ DO / VALUE PROPOSITION ====================== -->
    <section class="section section-why">
        <div class="container">
            <div class="section-header">
                <h2>Vì sao chọn Koi Care System?</h2>
                <p>
                    Được thiết kế cho người chơi Koi và các cửa hàng chuyên nghiệp, tập trung vào độ chính xác,
                    ổn định và trải nghiệm sử dụng đơn giản.
                </p>
            </div>

            <div class="why-grid">
                <div class="why-card">
                    <div class="why-icon">🎛️</div>
                    <h3>Trung tâm điều khiển cho hồ Koi</h3>
                    <p>
                        Toàn bộ thông tin về hồ, cá, lịch sử thay nước, dùng thuốc, cho ăn… được tập trung
                        trong một dashboard trực quan.
                    </p>
                </div>
                <div class="why-card">
                    <div class="why-icon">📊</div>
                    <h3>Chuẩn hóa & lưu trữ thông số nước</h3>
                    <p>
                        Nhập nhanh các chỉ số pH, nhiệt độ, NH3, NO2… và theo dõi xu hướng qua thời gian để
                        phát hiện sớm vấn đề.
                    </p>
                </div>
                <div class="why-card">
                    <div class="why-icon">🔔</div>
                    <h3>Nhắc nhở & cảnh báo thông minh</h3>
                    <p>
                        Tự động nhắc lịch cho ăn, thay nước, vệ sinh lọc; cảnh báo khi thông số vượt ngưỡng
                        an toàn khuyến nghị.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION: TÍNH NĂNG NỔI BẬT ============================ -->
    <section class="section section-features" id="features">
        <div class="container">
            <div class="section-header">
                <h2>Tính năng cốt lõi</h2>
                <p>
                    Mỗi tính năng được xây dựng để giải quyết trực tiếp các vấn đề thực tế khi vận hành hồ cá Koi.
                </p>
            </div>

            <div class="features-grid">
                <article class="feature-card">
                    <div class="feature-icon">🐟</div>
                    <h3>Hồ & Cá Koi</h3>
                    <p>
                        Quản lý nhiều hồ, từng cá trong hồ với hồ sơ chi tiết: nguồn gốc, kích thước,
                        lịch sử bệnh, hình ảnh trước/sau.
                    </p>
                    <ul class="feature-list">
                        <li>Hồ sơ cho từng cá</li>
                        <li>Gắn tag & phân nhóm</li>
                        <li>Lưu ảnh theo thời gian</li>
                    </ul>
                </article>

                <article class="feature-card">
                    <div class="feature-icon">💧</div>
                    <h3>Thông số nước</h3>
                    <p>
                        Ghi nhận, so sánh và phân tích các chỉ số môi trường nước theo chuẩn khuyến nghị
                        cho cá Koi.
                    </p>
                    <ul class="feature-list">
                        <li>Biểu đồ xu hướng</li>
                        <li>Cảnh báo vượt ngưỡng</li>
                        <li>Gợi ý hành động xử lý</li>
                    </ul>
                </article>

                <article class="feature-card">
                    <div class="feature-icon">🍽️</div>
                    <h3>Lịch cho ăn & thuốc</h3>
                    <p>
                        Thiết lập lịch cho ăn, dùng thuốc & vitamin theo từng nhóm cá, hạn chế quên hoặc cho ăn quá tay.
                    </p>
                    <ul class="feature-list">
                        <li>Lịch lặp linh hoạt</li>
                        <li>Nhắc qua dashboard</li>
                        <li>Lưu lịch sử đã thực hiện</li>
                    </ul>
                </article>

                <article class="feature-card">
                    <div class="feature-icon">🧂</div>
                    <h3>Tính toán & hướng dẫn xử lý</h3>
                    <p>
                        Tự động tính lượng muối, thuốc, thể tích hồ sử dụng… giảm sai số khi xử lý nước và bệnh.
                    </p>
                    <ul class="feature-list">
                        <li>Tính toán theo thể tích hồ</li>
                        <li>Hướng dẫn từng bước</li>
                        <li>Gợi ý ghi chú cho từng lần xử lý</li>
                    </ul>
                </article>

                <article class="feature-card">
                    <div class="feature-icon">📰</div>
                    <h3>Kho kiến thức & bài viết</h3>
                    <p>
                        Tổng hợp bài viết tiêu chuẩn về chăm sóc, xử lý bệnh, thiết kế hồ – cập nhật liên tục.
                    </p>
                    <ul class="feature-list">
                        <li>Bài viết theo chủ đề</li>
                        <li>Checklist thao tác</li>
                        <li>Các case thực tế</li>
                    </ul>
                </article>

                <article class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <h3>AI hỗ trợ phân tích</h3>
                    <p>
                        Nhận diện nhanh tình trạng cá qua ảnh, đánh giá nguy cơ & gợi ý bước xử lý tiếp theo
                        (tính năng nâng cao).
                    </p>
                    <ul class="feature-list">
                        <li>Phát hiện dấu hiệu bất thường</li>
                        <li>Lưu lại kết quả phân tích</li>
                        <li>Đề xuất hành động ban đầu</li>
                    </ul>
                </article>
            </div>
        </div>
    </section>

    <!-- SECTION: WORKFLOW ===================================== -->
    <section class="section section-flow">
        <div class="container">
            <div class="section-header">
                <h2>Thiết lập trong 3 bước</h2>
                <p>Được tối ưu để người mới dùng vẫn có thể khởi tạo hồ trong vài phút.</p>
            </div>

            <div class="flow-grid">
                <div class="flow-step">
                    <div class="flow-number">1</div>
                    <h3>Tạo hồ & nhập thể tích</h3>
                    <p>
                        Khai báo kích thước hồ, hệ lọc và số lượng cá hiện có. Hệ thống sẽ tính thể tích
                        và các ngưỡng khuyến nghị.
                    </p>
                </div>
                <div class="flow-step">
                    <div class="flow-number">2</div>
                    <h3>Thêm cá & lịch trình</h3>
                    <p>
                        Thêm từng cá hoặc theo nhóm, gán lịch cho ăn, kiểm tra nước định kỳ – tất cả đều
                        được nhắc tại một nơi.
                    </p>
                </div>
                <div class="flow-step">
                    <div class="flow-number">3</div>
                    <h3>Theo dõi & tối ưu vận hành</h3>
                    <p>
                        Ghi nhận các thông số, lịch sử thay nước, xử lý bệnh và sử dụng báo cáo để điều chỉnh
                        thói quen chăm sóc.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION: ROLE BASED =================================== -->
    <section class="section section-roles">
        <div class="container">
            <div class="section-header">
                <h2>Phù hợp cho mọi đối tượng trong hệ sinh thái Koi</h2>
                <p>Mỗi vai trò có một không gian làm việc riêng, nhưng vẫn kết nối mượt mà.</p>
            </div>

            <div class="roles-grid">
                <article class="role-card">
                    <h3>Người chơi Koi</h3>
                    <p>
                        Lưu toàn bộ lịch sử hồ, cá và các lần xử lý để bảo vệ đàn Koi theo thời gian dài,
                        không phụ thuộc vào trí nhớ.
                    </p>
                    <ul>
                        <li>Quản lý nhiều hồ tại nhà</li>
                        <li>Lịch nhắc thay nước & bảo trì</li>
                        <li>Nhật ký sức khỏe & hình ảnh</li>
                    </ul>
                </article>

                <article class="role-card">
                    <h3>Cửa hàng & dịch vụ Koi</h3>
                    <p>
                        Theo dõi hồ khách hàng, gợi ý sản phẩm, dịch vụ phù hợp và xây dựng quy trình chăm sóc chuẩn hóa.
                    </p>
                    <ul>
                        <li>Hồ của khách & lịch chăm sóc</li>
                        <li>Lưu template phác đồ xử lý</li>
                        <li>Tạo voucher & ưu đãi riêng</li>
                    </ul>
                </article>

                <article class="role-card">
                    <h3>Quản trị hệ thống</h3>
                    <p>
                        Kiểm soát cấu hình, phân quyền, dữ liệu và các nội dung kiến thức trong hệ thống Koi Care.
                    </p>
                    <ul>
                        <li>Phân quyền Admin / Shop / Customer</li>
                        <li>Quản lý nội dung kiến thức</li>
                        <li>Theo dõi hoạt động toàn hệ thống</li>
                    </ul>
                </article>
            </div>
        </div>
    </section>

    <!-- CTA CUỐI TRANG ======================================== -->
    <section class="section section-final-cta">
        <div class="container final-cta-inner">
            <div class="final-cta-text">
                <h2>Sẵn sàng chuẩn hóa việc chăm sóc hồ cá Koi của bạn?</h2>
                <p>
                    Hãy bắt đầu với một hồ đầu tiên, lưu lại toàn bộ thông tin và để Koi Care System đồng hành
                    cùng bạn trên hành trình chơi Koi lâu dài.
                </p>
            </div>
            <div class="final-cta-actions">
                <?php if ($role === 'guest'): ?>
                    <a href="/HeThongChamSocCaKoi/frontend/auth/login.php" class="btn btn-primary">Đăng nhập / Đăng ký</a>
                <?php else: ?>
                    <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="btn btn-primary">Vào bảng điều khiển</a>
                <?php endif; ?>
                <a href="#top" class="btn btn-ghost">Quay lại đầu trang</a>
            </div>
        </div>
    </section>

</main>

<?php include 'includes/footer.php'; ?>
