Feature("Luồng mua hàng trọn vẹn (End-to-End) - Khách hàng FurniMart");

const randomNumber = Math.floor(Math.random() * 10000);
const testUser = {
  lastName: "Khách",
  firstName: `Hàng_${randomNumber}`,
  email: `furnimart_${randomNumber}@gmail.com`,
  phone: "0901234567",
  password: "Password123!",
  address: {
    fullName: "Nguyễn Quang Được",
    phone: "0909999888",
    city: "Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    street: "123 Lê Lợi",
  },
};

Scenario(
  "Hành trình khách hàng: Đăng ký -> Đăng xuất -> Đăng nhập -> Thêm địa chỉ -> Mua hàng",
  async ({ I }) => {
    // ==========================================
    // BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN MỚI
    // ==========================================
    I.amOnPage("/auth/register");
    I.waitForVisible('input[placeholder="Nguyễn"]', 10);
    I.wait(1);

    I.fillField('input[placeholder="Nguyễn"]', testUser.lastName);
    I.fillField('input[placeholder="Văn A"]', testUser.firstName);
    I.fillField('input[placeholder="vd: tenban@gmail.com"]', testUser.email);
    I.fillField('input[placeholder="vd: 09xxxxxxxx"]', testUser.phone);
    I.wait(1);

    I.fillField(
      '(//input[@placeholder="Tối thiểu 8 ký tự"])[1]',
      testUser.password,
    );
    I.fillField(
      '(//input[@placeholder="Tối thiểu 8 ký tự"])[2]',
      testUser.password,
    );

    I.click("Tạo tài khoản");
    I.wait(3);

    I.wait(2);
    I.seeInCurrentUrl("/");
    I.wait(4); // Chờ Toast thông báo ẩn đi để tránh che khuất menu

    // ==========================================
    // BƯỚC THÊM MỚI: ĐĂNG XUẤT THEO GIAO DIỆN THỰC TẾ
    // ==========================================
    I.waitForText("Xin chào,", 10);
    I.click("Xin chào,");
    I.wait(2);

    I.waitForText("Đăng xuất", 5);
    I.click("Đăng xuất");
    I.wait(3);

    I.wait(2);
    I.seeInCurrentUrl("/");
    I.waitForText("Đăng nhập", 10);
    I.click("Đăng nhập");
    I.wait(3);
    I.seeInCurrentUrl("/auth/login");

    // ==========================================
    // BƯỚC 2: ĐĂNG NHẬP LẠI & THÊM SỔ ĐỊA CHỈ
    // ==========================================
    I.fillField('input[placeholder="vd: tenban@gmail.com"]', testUser.email);
    I.fillField(
      'input[placeholder="Nhập mật khẩu của bạn"]',
      testUser.password,
    );
    I.click("Đăng nhập");
    I.wait(3);

    I.wait(2);
    I.seeInCurrentUrl("/");
    I.wait(4); // Chờ Toast thông báo ẩn đi lần 2

    I.waitForText("Xin chào,", 10);
    I.click("Xin chào,");
    I.wait(2);

    I.waitForText("Tài khoản", 5);
    I.click("Tài khoản");
    I.wait(3);

    // FIX: Thay thế waitForClickable đã bị DEPRECATED thành waitForText an toàn hơn
    I.waitForText("Quản lý địa chỉ", 10);
    I.click("Quản lý địa chỉ");
    I.wait(3);
    I.waitForVisible("button", 10);
    I.wait(2);

    I.click("//button[contains(., 'Thêm địa chỉ')]");
    I.waitForVisible(".fixed.inset-0", 10);
    I.wait(2);

    const addressFields = [
      { label: "Họ và tên", value: testUser.address.fullName },
      { label: "Số điện thoại", value: testUser.address.phone },
      { label: "Địa chỉ (Số nhà, tên đường)", value: testUser.address.street },
      { label: "Phường/Xã", value: testUser.address.ward },
      { label: "Quận/Huyện", value: testUser.address.district },
      { label: "Thành phố", value: testUser.address.city },
    ];

    for (const field of addressFields) {
      const locator = `//label[contains(text(), "${field.label}")]/following-sibling::input | //label[contains(text(), "${field.label}")]/..//input`;
      I.click(locator);
      I.type(field.value);
      I.wait(3);
    }
    I.click("input[type='checkbox']");
    I.wait(3);

    I.click("//button[text()='Thêm']");
    I.wait(5);

    // ==========================================
    // BƯỚC 3: MUA HÀNG & CHỌN CHI NHÁNH
    // ==========================================
    I.click("Sản phẩm");
    I.wait(3);
    I.waitForText("Bed", 10);

    I.click("Bed");
    I.wait(10);

    I.waitForText("Queen Upholstered Bed", 10);
    I.click("Queen Upholstered Bed");
    I.wait(10);

    I.waitForElement("//select", 10);
    I.selectOption("//select", "Furnimart Central (District 1)");
    I.wait(10);

    I.click("Thêm vào giỏ");
    I.wait(5);

    I.click('button[aria-label="Giỏ hàng"]');
    I.wait(5);

    I.waitForText("Giỏ hàng (", 10);
    I.click("//button[contains(text(),'Giỏ hàng')]");
    I.wait(5);

    I.waitForText("Tiến hành thanh toán", 15);
    I.wait(5);

    // Sau khi nhấn "Tiến hành thanh toán" chuyển hướng vào trang checkout
    I.click("//button[contains(.,'Tiến hành thanh toán')]");
    I.wait(5);

    // ------------------------------------------
    // ĐÃ SỬA 1: ĐỊNH VỊ THEO TÊN NGƯỜI NHẬN ĐỂ HIỆN VIỀN XANH LÁ
    // ------------------------------------------
    I.waitForText("Thông tin giao hàng", 15);
    I.waitForText(testUser.address.fullName, 10);

    // Click thẳng vào text tên người nhận để kích hoạt chọn địa chỉ (an toàn và chuẩn xác nhất)
    I.click(testUser.address.fullName);

    // Hoặc nếu bắt buộc phải click vào khung, hãy dùng XPath thu hẹp này:
    // I.click(`//div[contains(@class, 'border') and .//div[contains(text(), '${testUser.address.fullName}')]]`);

    I.wait(3);

    I.waitForText("Tiếp tục thanh toán", 15);
    I.click("//button[contains(text(), 'Tiếp tục thanh toán')]");
    I.wait(5);

    // ------------------------------------------
    // ĐÃ SỬA 2: CHỌN PHƯƠNG THỨC COD VÀ HOÀN TẤT ĐẶT HÀNG
    // ------------------------------------------
    I.waitForText("Phương thức thanh toán", 15);
    I.waitForText("Thanh toán khi nhận hàng (COD)", 10);
    // Click chọn dòng phương thức COD
    I.click(
      "//span[contains(text(), 'Thanh toán khi nhận hàng (COD)')] | //div[contains(., 'COD')]",
    );
    I.wait(2);

    // Nhấn nút Hoàn tất đặt hàng để hệ thống bắt đầu xử lý ghi nhận đơn hàng
    I.waitForText("Hoàn tất đặt hàng", 10);
    I.click("//button[contains(., 'Hoàn tất đặt hàng')]");
    I.wait(10); // Đợi hệ thống gọi API và điều hướng qua trang thành công
  },
);
