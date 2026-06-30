const fs = require('fs');
const path = require('path');

// Load environment variables from Tool/.env (for local run support)
const dotenvPath = 'C:/Users/ADMIN/Studyhub-platform---KTPM/Tool/.env';
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !key.startsWith('#')) process.env[key] = val;
    }
  });
}

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'SH';

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("LỖI: Chưa có đủ thông tin cấu hình trong file .env!");
  process.exit(1);
}

const authBuffer = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const headers = {
  'Authorization': `Basic ${authBuffer}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

async function createJiraSubtaskBug(parentKey, summary, errorDetails) {
  const bodyData = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Phát hiện lỗi tự động trong kịch bản kiểm thử White Box." }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: `Chi tiết lỗi:\n${errorDetails}` }]
          }
        ]
      },
      issuetype: { name: 'Bug' }, // Create as a Bug
      parent: { key: parentKey } // Link to parent Task
    }
  };

  const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(bodyData)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[!] Lỗi tạo Bug cho ${parentKey}:`);
    console.error(err);
    return null;
  }

  return await response.json();
}

async function run() {
  const reportPath = path.resolve('backend/notification_service/jest-report.json');
  if (!fs.existsSync(reportPath)) {
    console.log("ℹ️ Không tìm thấy file jest-report.json. Bỏ qua phân tích.");
    process.exit(0);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const failedResults = report.testResults.filter(result => result.status === 'failed' || result.numFailingTests > 0);

  if (failedResults.length === 0) {
    console.log("🎉 Không có kịch bản White Box nào bị lỗi!");
    process.exit(0);
  }

  console.log(`⚠️ Phát hiện ${failedResults.length} file test White Box bị lỗi. Tiến hành tạo Jira Bug...`);

  for (let result of failedResults) {
    // Extract Jira key from filename (e.g. SH-151 from test/SH-151.test.js)
    const baseName = path.basename(result.name);
    const match = baseName.match(/SH-\d+/);
    if (!match) {
      console.log(`ℹ️ File ${baseName} không chứa mã Jira Key. Bỏ qua.`);
      continue;
    }

    const jiraKey = match[0];
    const failedAssertions = result.assertionResults.filter(a => a.status === 'failed');
    
    let errorDetails = "";
    failedAssertions.forEach((assertion, idx) => {
      errorDetails += `[Ca lỗi ${idx + 1}] Title: ${assertion.title}\n`;
      errorDetails += `Chi tiết:\n${assertion.failureMessages.join('\n')}\n\n`;
    });

    const summary = `[WHITE BOX TEST FAILED] Lỗi kiểm thử trong ${baseName}`;
    console.log(`👉 Đang tạo Sub-task Bug liên kết với ${jiraKey}...`);
    
    const bugRes = await createJiraSubtaskBug(jiraKey, summary, errorDetails.slice(0, 1000)); // Limit size to avoid API rejects
    if (bugRes) {
      console.log(`  ✅ Xong: ${JIRA_BASE_URL}/browse/${bugRes.key}`);
    } else {
      console.log(`  ❌ Thất bại khi tạo Bug cho ${jiraKey}`);
    }
  }
}

run();
