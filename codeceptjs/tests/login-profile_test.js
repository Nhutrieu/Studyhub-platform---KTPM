Feature("Sample user login and profile workflow");

Before(({ I }) => {
  I.clearSession();
});

Scenario("Login with sample user and view own profile", ({ I }) => {
  I.loginAsSampleUser();
  I.openSampleUserProfile();

  I.see("user1");
  I.see("User One");
  I.see("Hello, I am user1");
});
