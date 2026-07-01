const fs = require("fs");
const path = require("path");

const status = process.argv[2] || "PASS";
const envFile = process.env.GITHUB_ENV;

function writeToGithubEnv(key, value, multiline = false) {
  if (!envFile) {
    console.log(`[LOCAL] ${key}: ${value}`);
    return;
  }

  if (multiline) {
    fs.appendFileSync(envFile, `${key}<<EOF\n${value}\nEOF\n`, "utf8");
  } else {
    fs.appendFileSync(envFile, `${key}=${value}\n`, "utf8");
  }
}

function cleanFailureMessage(message) {
  return message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
}

function findReportPath() {
  const directPath = path.resolve("jest-report.json");
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const backendDir = path.resolve("backend");
  if (!fs.existsSync(backendDir)) {
    return null;
  }

  for (const serviceName of fs.readdirSync(backendDir)) {
    const candidate = path.join(backendDir, serviceName, "jest-report.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function run() {
  const reportPath = findReportPath();

  if (!reportPath) {
    console.log("No jest-report.json found. Skipping report parsing.");
    return;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

  if (status === "FAIL") {
    const failedResults = (report.testResults || []).filter(
      (result) => result.status === "failed" || result.numFailingTests > 0
    );

    if (failedResults.length === 0) {
      writeToGithubEnv("JIRA_BUG_SUMMARY", "[WHITE BOX TEST FAILED] Test failed");
      writeToGithubEnv(
        "JIRA_BUG_DESCRIPTION",
        "CI detected a white-box failure but the Jest report did not include assertion details.",
        true
      );
      return;
    }

    const firstFail = failedResults[0];
    const baseName = path.basename(firstFail.name);
    const failedAssertions = (firstFail.assertionResults || []).filter(
      (assertion) => assertion.status === "failed"
    );

    let details = "";
    failedAssertions.forEach((assertion, index) => {
      details += `[Case ${index + 1}] ${assertion.title}\n`;
      details += `${cleanFailureMessage((assertion.failureMessages || []).join("\n"))}\n\n`;
    });

    writeToGithubEnv("JIRA_BUG_SUMMARY", `[WHITE BOX TEST FAILED] Failure in ${baseName}`);
    writeToGithubEnv("JIRA_BUG_DESCRIPTION", details.slice(0, 2000), true);
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY || "Nhutrieu/Studyhub-platform---KTPM";
  const runId = process.env.GITHUB_RUN_ID || "0";
  const branch = process.env.GITHUB_REF_NAME || "unknown";
  const actor = process.env.GITHUB_ACTOR || "unknown";
  const totalTests = report.numTotalTests || 0;
  const passedTests = report.numPassedTests || 0;

  let comment = "**WHITE BOX TESTING SUCCESSFUL**\n\n";
  comment += `* Branch: \`${branch}\`\n`;
  comment += `* Actor: \`${actor}\`\n`;
  comment += `* GitHub Run: [#${runId}](https://github.com/${repo}/actions/runs/${runId})\n\n`;
  comment += `* Total test cases: **${totalTests}**\n`;
  comment += `* Passed test cases: **${passedTests}**\n\n`;
  comment += "All white-box tests for this Jira key passed.";

  writeToGithubEnv("JIRA_COMMENT", comment, true);
}

run();
