import { setHeadlessWhen, setCommonPlugins } from "@codeceptjs/configure";
// turn on headless mode when running with HEADLESS=true environment variable
// export HEADLESS=true && npx codeceptjs run
setHeadlessWhen(process.env.HEADLESS);

// enable all common plugins https://github.com/codeceptjs/configure#setcommonplugins
setCommonPlugins();

export const config: CodeceptJS.MainConfig = {
  tests: "./tests/*_test.ts",
  output: "./output",
  helpers: {
    Playwright: {
      browser: "chromium",
      url: "http://localhost:3000",
      show: true,

      // ====================================================================
      // 🛠️ CẤU HÌNH FIX LỖI MỞ NHIỀU TAB & CHẠY QUÁ NHANH GÂY LAG
      // ====================================================================

      // 1. Ép CodeceptJS giữ nguyên 1 cửa sổ trình duyệt duy nhất giữa các Scenario, không tắt đi bật lại
      restart: false,
      keepCookies: true, // Giữ lại cookie đăng nhập của các bước trước
      keepBrowserState: true, // Giữ nguyên trạng thái tab hiện tại

      // 2. Tự động nghỉ 1000ms (1 giây) sau mỗi hành động (Click, điền form,...) để giao diện mượt mà, bớt lag
      waitForAction: 1000,

      // 3. Tăng giới hạn thời gian chờ đợi tải phần tử lên tối đa 10 giây trước khi báo lỗi hụt
      waitForTimeout: 10000,

      // ====================================================================
    },
  },
  include: {
    I: "./steps_file.ts",
  },
  noGlobals: true,
  plugins: {},
  name: "Furnimart---KTPM",
  require: ["tsx/cjs"],
};
