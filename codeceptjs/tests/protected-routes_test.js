Feature("Protected route workflows");

Before(({ I }) => {
  I.clearSession();
});

Scenario("Guest is redirected to login when opening a private profile", ({ I }) => {
  I.amOnPage("/profile/11111111-2222-4222-8222-111111111112");

  I.waitInUrl("/auth/login", 10);
  I.see("Đăng nhập");
});

Scenario("Regular user sees forbidden page for admin dashboard", ({ I }) => {
  I.loginAsSampleUser();
  I.amOnPage("/admin/dashboard");

  I.waitForText("403", 10);
  I.see("Truy cập bị từ chối");
});
