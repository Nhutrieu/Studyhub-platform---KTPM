Feature("Authentication validation workflows");

Before(({ I }) => {
  I.clearSession();
});

Scenario("Login shows an error for an incorrect password", ({ I }) => {
  I.amOnPage("/auth/login");
  I.waitForElement('input[name="identifier"]', 10);
  I.fillField('input[name="identifier"]', "user1@example.com");
  I.fillField('input[name="password"]', "00000000");
  I.click('button[type="submit"]');

  I.waitForText("Mật khẩu không đúng", 10);
});

Scenario("Register validates invalid form data", ({ I }) => {
  I.amOnPage("/auth/register");
  I.waitForText("Tạo tài khoản", 10);
  I.fillField('input[name="email"]', "not-an-email");
  I.fillField('input[name="user_name"]', "ab");
  I.fillField('input[name="display_name"]', "Codecept Test");
  I.fillField('input[name="password"]', "123");
  I.fillField('input[name="confirm_password"]', "456");
  I.click('button[type="submit"]');

  I.waitForText("Email không hợp lệ", 10);
  I.see("Tên đăng nhập 3-20 ký tự");
  I.see("Mật khẩu tối thiểu 6 ký tự");
  I.see("Mật khẩu xác nhận không khớp");
});

Scenario("Forgot password validates email format", ({ I }) => {
  I.amOnPage("/auth/forgot-password");
  I.waitForText("Quên mật khẩu", 10);
  I.fillField('input[type="email"]', "missing@example");
  I.click('button[type="submit"]');

  I.waitForText("Email không hợp lệ", 10);
});
