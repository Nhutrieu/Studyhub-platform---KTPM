Feature("Admin workflows");

Before(({ I }) => {
  I.clearSession();
});

Scenario("Admin can open dashboard", ({ I }) => {
  I.loginAsAdmin();
  I.amOnPage("/admin/dashboard");

  I.waitForText("Admin Dashboard", 15);
  I.see("Documents");
  I.see("Comments");
  I.see("Groups");
  I.see("Users");
});

Scenario("Admin can open users management", ({ I }) => {
  I.loginAsAdmin();
  I.amOnPage("/admin/users");

  I.waitForText("User Name", 15);
  I.see("EMAIL");
  I.see("user1@example.com");
});
