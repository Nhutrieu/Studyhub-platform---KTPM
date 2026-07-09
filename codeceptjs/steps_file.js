const DEFAULT_USER = {
  email: process.env.STUDYHUB_E2E_EMAIL || "user1@example.com",
  password: process.env.STUDYHUB_E2E_PASSWORD || "11111111",
  id:
    process.env.STUDYHUB_E2E_USER_ID ||
    "11111111-2222-4222-8222-111111111112",
};

const ADMIN_USER = {
  email: process.env.STUDYHUB_E2E_ADMIN_EMAIL || "admin@example.com",
  password: process.env.STUDYHUB_E2E_ADMIN_PASSWORD || "11111111",
  id:
    process.env.STUDYHUB_E2E_ADMIN_ID ||
    "11111111-1111-4111-8111-111111111111",
};

module.exports = function () {
  return actor({
    clearSession() {
      this.amOnPage("/");
      this.executeScript(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      this.refreshPage();
    },

    login(credentials) {
      const account = credentials || DEFAULT_USER;

      this.amOnPage("/auth/login");
      this.waitForElement('input[name="identifier"]', 10);
      this.fillField('input[name="identifier"]', account.email);
      this.fillField('input[name="password"]', account.password);
      this.click('button[type="submit"]');
      this.waitForFunction(
        () => Boolean(window.localStorage.getItem("access_token")),
        10
      );
      this.dontSeeInCurrentUrl("/auth/login");
      this.waitForText("StudyHub", 10);
    },

    loginAsSampleUser(user) {
      const credentials = user || DEFAULT_USER;

      this.login(credentials);
    },

    loginAsAdmin(admin) {
      const credentials = admin || ADMIN_USER;

      this.login(credentials);
    },

    openSampleUserProfile(user) {
      const credentials = user || DEFAULT_USER;

      this.amOnPage(`/profile/${credentials.id}`);
      this.waitForText("User One", 15);
    },
  });
};
