Feature("Authenticated user navigation workflows");

Before(({ I }) => {
  I.clearSession();
});

Scenario("User can open group, follow, and message pages", ({ I }) => {
  I.loginAsSampleUser();

  I.amOnPage("/group");
  I.waitForText("Nhóm", 15);
  I.see("Tạo nhóm");
  I.see("Khám phá");

  I.amOnPage("/follow");
  I.waitForText("Theo dõi", 15);
  I.see("Chọn người dùng để xem profile");

  I.amOnPage("/message");
  I.waitForText("Conversations", 15);
  I.see("Select a conversation to begin");
});
