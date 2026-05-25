<?php
session_start();

$page_title = "Về chúng tôi - Koi Care System";
include '../includes/header.php';

// Lấy vai trò người dùng (mặc định là guest nếu chưa đăng nhập)
$role = isset($_SESSION['role']) ? $_SESSION['role'] : 'guest';
?>
<link rel="stylesheet" href="/HeThongChamSocCaKoi/assets/css/dashboards/dashboard.css">

<main class="dashboard-page">

    <!-- HERO VỀ CHÚNG TÔI ==================================== -->
    <section class="hero-section">
        <div class="hero-inner container hero-about">
            <div class="hero-left">
                <p class="hero-label">TỪ ĐAM MÊ ĐẾN CÔNG NGHỆ</p>
                <h1 class="hero-title">
                    Sứ mệnh của chúng tôi là <span>chuẩn hóa việc chăm sóc cá Koi</span>
                </h1>
                <p class="hero-desc" style="max-width: 720px; margin-left: auto; margin-right: auto;">
                    Koi Care System ra đời từ nỗi trăn trở của những người yêu Koi: làm thế nào để việc chăm sóc trở nên chính xác, dễ dàng và không bị phụ thuộc vào kinh nghiệm cá nhân. Chúng tôi kết hợp công nghệ AI, dữ liệu chuẩn hóa và giao diện thân thiện để bảo vệ đàn Koi của bạn tốt nhất.
                </p>

                <div class="hero-cta">
                    <?php if ($role === 'guest'): ?>
                        <a href="/HeThongChamSocCaKoi/frontend/auth/login.php" class="btn btn-primary">Bắt đầu ngay</a>
                        <a href="#team" class="btn btn-ghost">Gặp gỡ đội ngũ</a>
                    <?php else: ?>
                        <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="btn btn-primary">Vào bảng điều khiển</a>
                        <a href="#team" class="btn btn-ghost">Gặp gỡ đội ngũ</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION: TẦM NHÌN & GIÁ TRỊ CỐT LÕI (Sử dụng lại kiểu dáng WHY) -->
    <section class="section section-why">
        <div class="container">
            <div class="section-header">
                <h2>Giá trị cốt lõi của Koi Care System</h2>
                <p>
                    Ba nguyên tắc định hướng mọi tính năng và quyết định phát triển của chúng tôi.
                </p>
            </div>

            <div class="why-grid">
                <div class="why-card" tabindex="0">
                    <div class="why-icon">🔬</div>
                    <h3>Chính xác tuyệt đối</h3>
                    <p>
                        Dựa trên các nghiên cứu khoa học và chuẩn mực quốc tế về chất lượng nước, liều lượng thuốc, giúp người dùng loại bỏ mọi phỏng đoán và sai số.
                    </p>
                </div>
                <div class="why-card" tabindex="0">
                    <div class="why-icon">🤝</div>
                    <h3>Minh bạch & Cộng đồng</h3>
                    <p>
                        Chúng tôi tin vào việc chia sẻ kiến thức. Nền tảng không chỉ là nhật ký cá nhân mà còn là cầu nối giữa người chơi, chuyên gia và cửa hàng.
                    </p>
                </div>
                <div class="why-card" tabindex="0">
                    <div class="why-icon">🌱</div>
                    <h3>Phát triển bền vững</h3>
                    <p>
                        Tập trung vào giải pháp phòng ngừa, giúp người chơi duy trì môi trường sống ổn định cho cá, thay vì chỉ tập trung chữa trị khi vấn đề phát sinh.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION: CÂU CHUYỆN CỦA CHÚNG TÔI (Sử dụng lại kiểu dáng FEATURES) -->
    <section class="section section-features" style="padding-bottom: 0;">
        <div class="container">
            <div class="section-header">
                <h2>Hành trình từ ý tưởng đến thực tế</h2>
                <p>
                    Mọi chuyện bắt đầu từ một ao Koi bị bệnh do ghi chép sai lệch và quên lịch thay nước.
                </p>
            </div>

            <div class="features-grid">
                <article class="feature-card" style="min-height: auto;" tabindex="0">
                    <div class="feature-icon">💡</div>
                    <h3>Giai đoạn 1: Nỗi đau đầu tiên</h3>
                    <p>
                        Năm 2021, nhóm sáng lập (gồm các kỹ sư phần mềm và một nghệ nhân Koi) nhận ra sự thiếu sót của các phương pháp ghi chép truyền thống (sổ sách, Excel). Cần một công cụ chuyên biệt, trực quan.
                    </p>
                </article>

                <article class="feature-card" style="min-height: auto;" tabindex="0">
                    <div class="feature-icon">💻</div>
                    <h3>Giai đoạn 2: Phát triển nền tảng</h3>
                    <p>
                        Năm 2022, Koi Care System được xây dựng, tích hợp các công thức tính toán liều lượng muối/thuốc chuẩn hóa. Giao diện dashboard trực quan được ưu tiên hàng đầu.
                    </p>
                </article>

                <article class="feature-card" style="min-height: auto;" tabindex="0">
                    <div class="feature-icon">🚀</div>
                    <h3>Giai đoạn 3: Tích hợp AI & Mở rộng</h3>
                    <p>
                        Hiện tại, chúng tôi tiếp tục phát triển AI để phân tích hình ảnh cá, dự đoán nguy cơ bệnh và mở rộng hệ thống kết nối với các cửa hàng Koi lớn trên toàn quốc.
                    </p>
                </article>
            </div>
        </div>
    </section>

    <!-- SECTION: ĐỘI NGŨ (Sử dụng lại kiểu dáng ROLES) -->
    <section class="section section-roles" id="team">
        <div class="container">
            <div class="section-header">
                <h2>Đội ngũ sáng lập</h2>
                <p>
                    Kết hợp giữa chuyên môn kỹ thuật sâu rộng và kinh nghiệm nuôi Koi thực tế.
                </p>
            </div>

            <div class="roles-grid">
                <article class="role-card" tabindex="0">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <img src="https://placehold.co/100x100/0ea5e9/ffffff?text=Founder" alt="Chân dung nhà sáng lập Nguyễn Văn A" onerror="this.onerror=null;this.src='https://placehold.co/100x100/0ea5e9/ffffff?text=Founder';" style="border-radius: 50%; border: 4px solid var(--color-primary-soft);">
                    </div>
                    <h3>Nguyễn Văn A</h3>
                    <p>
                        **Vị trí:** Giám đốc Sản phẩm & Công nghệ<br>
                        **Chuyên môn:** Kỹ sư phần mềm 10 năm kinh nghiệm, chịu trách nhiệm kiến trúc hệ thống và tích hợp AI.
                    </p>
                    <ul>
                        <li>Kỹ thuật Back-end & DevOps</li>
                        <li>Phân tích Dữ liệu Nước</li>
                        <li>Tầm nhìn sản phẩm</li>
                    </ul>
                </article>

                <article class="role-card" tabindex="0">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <img src="https://placehold.co/100x100/f97316/ffffff?text=Expert" alt="Chân dung chuyên gia Lê Thị B" onerror="this.onerror=null;this.src='https://placehold.co/100x100/f97316/ffffff?text=Expert';" style="border-radius: 50%; border: 4px solid var(--color-secondary-soft);">
                    </div>
                    <h3>Lê Thị B</h3>
                    <p>
                        **Vị trí:** Chuyên gia Chăm sóc Koi & Nội dung<br>
                        **Chuyên môn:** Nghệ nhân nuôi Koi hơn 15 năm, cố vấn về các chỉ số sức khỏe, liều lượng xử lý và kiến thức chuyên sâu.
                    </p>
                    <ul>
                        <li>Quy trình xử lý bệnh</li>
                        <li>Tiêu chuẩn chất lượng nước</li>
                        <li>Xây dựng kho kiến thức</li>
                    </ul>
                </article>

                <article class="role-card" tabindex="0">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <img src="https://placehold.co/100x100/10b981/ffffff?text=Design" alt="Chân dung Giám đốc UX/UI Trần Văn C" onerror="this.onerror=null;this.src='https://placehold.co/100x100/10b981/ffffff?text=Design';" style="border-radius: 50%; border: 4px solid var(--color-accent-emerald);">
                    </div>
                    <h3>Trần Văn C</h3>
                    <p>
                        **Vị trí:** Giám đốc Trải nghiệm người dùng (UX/UI)<br>
                        **Chuyên môn:** Thiết kế giao diện cao cấp, đảm bảo hệ thống dễ dùng, trực quan và đạt chuẩn thẩm mỹ quốc tế.
                    </p>
                    <ul>
                        <li>Tối ưu hóa Mobile/Desktop</li>
                        <li>Thiết kế luồng người dùng</li>
                        <li>Đảm bảo tính thẩm mỹ</li>
                    </ul>
                </article>

                <article class="role-card" tabindex="0">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <img src="https://placehold.co/100x100/10b981/ffffff?text=Design" alt="Chân dung Giám đốc UX/UI Trần Văn C" onerror="this.onerror=null;this.src='https://placehold.co/100x100/10b981/ffffff?text=Design';" style="border-radius: 50%; border: 4px solid var(--color-accent-emerald);">
                    </div>
                    <h3>Trần Văn C</h3>
                    <p>
                        **Vị trí:** Giám đốc Trải nghiệm người dùng (UX/UI)<br>
                        **Chuyên môn:** Thiết kế giao diện cao cấp, đảm bảo hệ thống dễ dùng, trực quan và đạt chuẩn thẩm mỹ quốc tế.
                    </p>
                    <ul>
                        <li>Tối ưu hóa Mobile/Desktop</li>
                        <li>Thiết kế luồng người dùng</li>
                        <li>Đảm bảo tính thẩm mỹ</li>
                    </ul>
                </article>
            </div>
        </div>
    </section>


    <!-- CTA CUỐI TRANG (Tái sử dụng) ======================== -->
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
                    <a href="/HeThongChamSocCaKoi/frontend/auth/login.php" class="btn btn-primary">Đăng ký ngay</a>
                <?php else: ?>
                    <a href="/HeThongChamSocCaKoi/frontend/customer/ponds.php" class="btn btn-primary">Vào bảng điều khiển</a>
                <?php endif; ?>
                <a href="/HeThongChamSocCaKoi/index.php" class="btn btn-ghost">Về Trang chủ</a>
            </div>
        </div>
    </section>

</main>

<?php include '../includes/footer.php'; ?>