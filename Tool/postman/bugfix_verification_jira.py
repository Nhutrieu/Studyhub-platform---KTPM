import argparse
import base64
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request


def split_values(raw):
    return [item.strip() for item in re.split(r"[\s,;]+", raw or "") if item.strip()]


def adf_doc(text):
    paragraphs = []
    for line in text.strip().splitlines():
        if line.strip():
            paragraphs.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": line.rstrip()}],
            })
        else:
            paragraphs.append({"type": "paragraph", "content": []})
    return {"type": "doc", "version": 1, "content": paragraphs}


class JiraClient:
    def __init__(self):
        self.base_url = (os.environ.get("JIRA_BASE_URL") or "").rstrip("/")
        self.email = os.environ.get("JIRA_EMAIL") or ""
        self.token = os.environ.get("JIRA_API_TOKEN") or ""
        if not self.base_url or not self.email or not self.token:
            raise RuntimeError("Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN")

        raw_auth = f"{self.email}:{self.token}".encode("ascii")
        self.auth_header = "Basic " + base64.b64encode(raw_auth).decode("ascii")

    def request(self, method, path, payload=None):
        data = None
        headers = {
            "Authorization": self.auth_header,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        }
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

        req = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers=headers,
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Jira HTTP {exc.code} for {method} {path}: {body}") from exc

    def get_issue_status(self, key):
        data = self.request("GET", f"/rest/api/3/issue/{key}?fields=status")
        return data["fields"]["status"]["name"]

    def add_comment(self, key, text):
        self.request("POST", f"/rest/api/3/issue/{key}/comment", {"body": adf_doc(text)})

    def transition_to_done(self, key):
        status = self.get_issue_status(key)
        if status.lower() == "done":
            return "already Done"

        data = self.request("GET", f"/rest/api/3/issue/{key}/transitions")
        transitions = data.get("transitions", [])
        transition = None
        for item in transitions:
            if item.get("name", "").strip().lower() == "done":
                transition = item
                break

        if not transition:
            names = ", ".join(item.get("name", "") for item in transitions) or "none"
            return f"skipped: no Done transition available ({names})"

        self.request(
            "POST",
            f"/rest/api/3/issue/{key}/transitions",
            {"transition": {"id": transition["id"]}},
        )
        return "transitioned to Done"


def parse_newman_reports():
    results = []
    failures = []
    for path in sorted(glob.glob("newman-reports/*.json")):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                report = json.load(fh)
        except Exception as exc:
            failures.append(f"{path}: cannot read report ({exc})")
            continue

        stats = report.get("run", {}).get("stats", {})
        requests = stats.get("requests", {})
        assertions = stats.get("assertions", {})
        results.append({
            "file": os.path.basename(path),
            "requests_total": requests.get("total", 0),
            "requests_failed": requests.get("failed", 0),
            "assertions_total": assertions.get("total", 0),
            "assertions_failed": assertions.get("failed", 0),
        })

        for failure in report.get("run", {}).get("failures", []):
            source = failure.get("source", {}).get("name", "Unknown request")
            message = failure.get("error", {}).get("message", "Unknown assertion failure")
            failures.append(f"{os.path.basename(path)} - {source}: {message}")

    return results, failures


def parse_jest_reports():
    patterns = [
        "bugfix-jest-report.json",
        "backend/*_service/bugfix-jest-report.json",
    ]
    paths = []
    for pattern in patterns:
        paths.extend(glob.glob(pattern))

    results = []
    failures = []
    for path in sorted(set(paths)):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                report = json.load(fh)
        except Exception as exc:
            failures.append(f"{path}: cannot read report ({exc})")
            continue

        results.append({
            "file": path.replace("\\", "/"),
            "tests_total": report.get("numTotalTests", 0),
            "tests_passed": report.get("numPassedTests", 0),
            "tests_failed": report.get("numFailedTests", 0),
        })

        for test_result in report.get("testResults", []):
            if test_result.get("status") != "failed" and not test_result.get("numFailingTests"):
                continue
            suite_name = os.path.basename(test_result.get("name", "unknown test file"))
            for assertion in test_result.get("assertionResults", []):
                if assertion.get("status") == "failed":
                    failures.append(f"{suite_name} - {assertion.get('title', 'failed assertion')}")

    return results, failures


def join_keys(keys):
    return ", ".join(keys) if keys else "none"


def build_newman_summary(results):
    if not results:
        return None

    total_requests = sum(item["requests_total"] for item in results)
    failed_requests = sum(item["requests_failed"] for item in results)
    total_assertions = sum(item["assertions_total"] for item in results)
    failed_assertions = sum(item["assertions_failed"] for item in results)
    passed_assertions = max(total_assertions - failed_assertions, 0)

    if failed_requests or failed_assertions:
        return (
            f"Newman API: {len(results)} collections, {total_requests} requests, "
            f"{passed_assertions}/{total_assertions} assertions pass "
            f"({failed_assertions} failed assertions)"
        )

    return (
        f"Newman API: {len(results)} collections, {total_requests} requests, "
        f"{total_assertions} assertions pass"
    )


def build_jest_summary(results):
    if not results:
        return None

    total_tests = sum(item["tests_total"] for item in results)
    passed_tests = sum(item["tests_passed"] for item in results)
    failed_tests = sum(item["tests_failed"] for item in results)

    if failed_tests:
        return f"Jest White-box: {passed_tests}/{total_tests} tests pass ({failed_tests} failed)"

    return f"Jest White-box: {passed_tests}/{total_tests} tests pass"


def build_jira_summary(status, action_results):
    if status != "PASS":
        return "Chưa chuyển Done vì bước xác minh còn lỗi."
    if not action_results:
        return "Không yêu cầu chuyển trạng thái Jira."

    failed = [item for item in action_results if str(item[1]).startswith("failed:")]
    dry_run = [item for item in action_results if "dry-run" in str(item[1])]
    if failed:
        return f"Test đã pass, nhưng {len(failed)} issue chưa chuyển Done được. Xem GitHub Run để xử lý."
    if dry_run:
        return "Dry-run: chỉ kiểm tra, chưa comment hoặc chuyển trạng thái Jira."
    return f"Đã chuyển hoặc xác nhận Done cho {len(action_results)} issue liên quan."


def build_comment(status, bug_keys, parent_keys, action_results):
    repo = os.environ.get("GITHUB_REPOSITORY", "unknown-repo")
    run_id = os.environ.get("GITHUB_RUN_ID", "unknown-run")
    branch = os.environ.get("GITHUB_REF_NAME", "unknown-branch")
    actor = os.environ.get("GITHUB_ACTOR", "unknown-actor")
    sha = (os.environ.get("GITHUB_SHA") or "unknown")[:12]
    run_url = f"https://github.com/{repo}/actions/runs/{run_id}"

    newman_results, newman_failures = parse_newman_reports()
    jest_results, jest_failures = parse_jest_reports()
    newman_summary = build_newman_summary(newman_results)
    jest_summary = build_jest_summary(jest_results)
    jira_summary = build_jira_summary(status, action_results)

    if status == "PASS":
        lines = [
            "✅ *[Bug Fix Verification]* **Xác minh sửa lỗi tự động thành công!**",
            "",
            "Các bug trong phạm vi đã được chạy lại bằng bộ test tự động và kết quả đều PASS.",
            "",
            "**📊 Thông tin chi tiết:**",
            f"* 💻 **Nhánh chạy:** `{branch}`",
            f"* 👤 **Người kích hoạt:** `{actor}`",
            f"* 🔗 **GitHub Run:** [#{run_id}]({run_url})",
            f"* 🧾 **Commit:** `{sha}`",
            "",
            "**📌 Phạm vi xác minh:**",
            f"* Bug subtask: `{join_keys(bug_keys)}`",
            f"* Task cha: `{join_keys(parent_keys)}`",
            "",
            "**📋 Kết quả kiểm thử:**",
        ]
    else:
        lines = [
            "❌ *[Bug Fix Verification]* **Xác minh sửa lỗi tự động thất bại!**",
            "",
            "Workflow đã chạy lại test nhưng vẫn còn lỗi, nên Jira không chuyển Done.",
            "",
            "**📊 Thông tin chi tiết:**",
            f"* 💻 **Nhánh chạy:** `{branch}`",
            f"* 👤 **Người kích hoạt:** `{actor}`",
            f"* 🔗 **GitHub Run:** [#{run_id}]({run_url})",
            f"* 🧾 **Commit:** `{sha}`",
            "",
            "**📌 Phạm vi xác minh:**",
            f"* Bug subtask: `{join_keys(bug_keys)}`",
            f"* Task cha: `{join_keys(parent_keys)}`",
            "",
            "**📋 Kết quả kiểm thử:**",
        ]

    if newman_summary:
        lines.append(f"* {newman_summary}")
    if jest_summary:
        lines.append(f"* {jest_summary}")
    if not newman_summary and not jest_summary:
        lines.append("* Không tìm thấy file báo cáo test trong workflow.")

    failures = newman_failures + jest_failures
    if failures:
        lines.extend(["", "**❗ Lỗi chính:**"])
        for failure in failures[:5]:
            lines.append(f"* {failure}")
        if len(failures) > 5:
            lines.append(f"* ... còn {len(failures) - 5} lỗi khác, xem chi tiết trong GitHub Run.")

    lines.extend([
        "",
        f"**🔁 Jira:** {jira_summary}",
        "",
        "---",
        "*Báo cáo tự động được gửi từ GitHub Actions Bug Fix Verification.*",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", choices=["PASS", "FAIL"], required=True)
    parser.add_argument("--bug-keys", required=True)
    parser.add_argument("--parent-keys", default="")
    parser.add_argument("--transition-bugs", choices=["true", "false"], default="true")
    parser.add_argument("--transition-parents", choices=["true", "false"], default="false")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    bug_keys = split_values(args.bug_keys)
    parent_keys = split_values(args.parent_keys)
    if not bug_keys:
        raise SystemExit("At least one bug key is required.")

    action_results = []
    transition_errors = []
    jira = None if args.dry_run else JiraClient()

    if args.status == "PASS" and args.transition_bugs == "true":
        for key in bug_keys:
            try:
                result = "dry-run: would transition to Done" if args.dry_run else jira.transition_to_done(key)
            except Exception as exc:
                result = f"failed: {exc}"
                transition_errors.append((key, exc))
            action_results.append((key, result))

    if args.status == "PASS" and args.transition_parents == "true":
        for key in parent_keys:
            try:
                result = "dry-run: would transition to Done" if args.dry_run else jira.transition_to_done(key)
            except Exception as exc:
                result = f"failed: {exc}"
                transition_errors.append((key, exc))
            action_results.append((key, result))

    comment = build_comment(args.status, bug_keys, parent_keys, action_results)

    if args.dry_run:
        print(comment)
        return

    for key in bug_keys:
        jira.add_comment(key, comment)
    if args.status == "PASS":
        for key in parent_keys:
            jira.add_comment(key, comment)

    print(comment)
    if transition_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Bug fix verification Jira update failed: {exc}", file=sys.stderr)
        raise
