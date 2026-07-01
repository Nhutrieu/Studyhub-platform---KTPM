const fs = require('fs');
const path = require('path');

const status = process.argv[2] || 'PASS'; // 'PASS' or 'FAIL'
const envFile = process.env.GITHUB_ENV;

function writeToGithubEnv(key, value, isMultiline = false) {
  if (!envFile) {
    console.log(`[LOCAL] ${key}: ${value}`);
    return;
  }
  if (isMultiline) {
    fs.appendFileSync(envFile, `${key}<<EOF\n${value}\nEOF\n`, 'utf8');
  } else {
    fs.appendFileSync(envFile, `${key}=${value}\n`, 'utf8');
  }
}

async function run() {
  const reportPath = path.resolve('jest-report.json');
  if (!fs.existsSync(reportPath)) {
    console.log("ℹ️ Không tìm thấy file jest-report.json. Bỏ qua phân tích.");
    process.exit(0);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  if (status === 'FAIL') {
    const failedResults = report.testResults.filter(result => result.status === 'failed' || result.numFailingTests > 0);
    if (failedResults.length === 0) {
      writeToGithubEnv("JIRA_BUG_SUMMARY", "Lỗi kiểm thử hộp trắng White Box");
      writeToGithubEnv("JIRA_BUG_DESCRIPTION", "Hệ thống CI/CD phát hiện lỗi nhưng không tìm thấy chi tiết thất bại trong report.", true);
      process.exit(0);
    }

    const firstFail = failedResults[0];
    const baseName = path.basename(firstFail.name);
    const failedAssertions = firstFail.assertionResults.filter(a => a.status === 'failed');

    let errorDetails = "";
    failedAssertions.forEach((assertion, idx) => {
      errorDetails += `[Ca lỗi ${idx + 1}] Title: ${assertion.title}\n`;
      // Clean ANSI colors from Jest output
      const cleanMessage = assertion.failureMessages.join('\n').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      errorDetails += `Chi tiết:\n${cleanMessage}\n\n`;
    });

    const summary = `[WHITE BOX TEST FAILED] Lỗi kiểm thử trong ${baseName}`;
    writeToGithubEnv("JIRA_BUG_SUMMARY", summary);
    writeToGithubEnv("JIRA_BUG_DESCRIPTION", errorDetails.slice(0, 2000), true); // Limit size
    console.log("Successfully wrote FAIL vars to GITHUB_ENV.");
  } else {
    const repo = process.env.GITHUB_REPOSITORY || "Nhutrieu/Studyhub-platform---KTPM";
    const runId = process.env.GITHUB_RUN_ID || "0";
    const branch = process.env.GITHUB_REF_NAME || "unknown";
    const actor = process.env.GITHUB_ACTOR || "unknown";

    let comment = `🎉 **WHITE BOX TESTING SUCCESSFUL** 🎉\n\n`;
    comment += `* 💻 **Nhánh chạy:** \`${branch}\`\n`;
    comment += `* 👤 **Người kích hoạt:** \`${actor}\`\n`;
    comment += `* 🚀 **GitHub Run:** [#${runId}](https://github.com/${repo}/actions/runs/${runId})\n\n`;
    comment += `**📋 Chi tiết kết quả kiểm thử:**\n`;
    
    const totalTests = report.numTotalTests || 0;
    const passedTests = report.numPassedTests || 0;
    
    comment += `* ✅ Tổng số kịch bản kiểm thử: **${totalTests}**\n`;
    comment += `* 🟢 Số kịch bản vượt qua: **${passedTests}** (100%)\n\n`;
    comment += `👉 **Kết luận:** Toàn bộ các kiểm thử hộp trắng đã được thực thi thành công tốt đẹp.\n`;
    comment += `\n---\n*Báo cáo tự động được gửi từ hệ thống GitHub Actions CI/CD.*`;

    writeToGithubEnv("JIRA_COMMENT", comment, true);
    console.log("Successfully wrote PASS vars to GITHUB_ENV.");
  }
}

run();
