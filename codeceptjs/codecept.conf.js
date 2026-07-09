const appUrl = process.env.STUDYHUB_APP_URL || "http://localhost:5173";

exports.config = {
  tests: "./tests/*_test.js",
  output: "./output",
  helpers: {
    Playwright: {
      url: appUrl,
      browser: "chromium",
      show: process.env.HEADLESS === "false",
      waitForNavigation: "networkidle",
      waitForTimeout: 10000,
      windowSize: "1280x900",
    },
  },
  include: {
    I: "./steps_file.js",
  },
  name: "studyhub-codeceptjs-e2e",
  bootstrap: null,
  mocha: {},
  plugins: {
    retryFailedStep: {
      enabled: true,
      retries: 1,
    },
    screenshotOnFail: {
      enabled: true,
    },
  },
};
