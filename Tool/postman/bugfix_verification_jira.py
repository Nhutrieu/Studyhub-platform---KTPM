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


def inline_nodes(text):
    nodes = []
    pattern = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
    pos = 0
    for match in pattern.finditer(text):
        if match.start() > pos:
            nodes.append({"type": "text", "text": text[pos:match.start()]})
        nodes.append({
            "type": "text",
            "text": match.group(1),
            "marks": [{"type": "link", "attrs": {"href": match.group(2)}}],
        })
        pos = match.end()
    if pos < len(text):
        nodes.append({"type": "text", "text": text[pos:]})
    return nodes or [{"type": "text", "text": ""}]


def paragraph(text=""):
    if text:
        return {"type": "paragraph", "content": inline_nodes(text)}
    return {"type": "paragraph", "content": []}


def adf_doc(text):
    paragraphs = []
    pending_bullets = []

    def flush_bullets():
        nonlocal pending_bullets
        if not pending_bullets:
            return
        paragraphs.append({
            "type": "bulletList",
            "content": [
                {"type": "listItem", "content": [paragraph(item)]}
                for item in pending_bullets
            ],
        })
        pending_bullets = []

    for line in text.strip().splitlines():
        clean = line.rstrip()
        if clean.startswith("* "):
            pending_bullets.append(clean[2:])
        elif clean.strip():
            flush_bullets()
            paragraphs.append(paragraph(clean))
        else:
            flush_bullets()
            paragraphs.append(paragraph())

    flush_bullets()
    return {"type": "doc", "version": 1, "content": paragraphs}


def adf_to_text(node):
    if isinstance(node, dict):
        text = node.get("text", "")
        for child in node.get("content", []):
            text += adf_to_text(child)
        return text
    if isinstance(node, list):
        return "".join(adf_to_text(item) for item in node)
    return ""


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

    def list_comments(self, key):
        data = self.request("GET", f"/rest/api/3/issue/{key}/comment?maxResults=100")
        return data.get("comments", [])

    def delete_comment(self, key, comment_id):
        self.request("DELETE", f"/rest/api/3/issue/{key}/comment/{comment_id}")

    def cleanup_bugfix_comments(self, key):
        deleted = 0
        for comment in self.list_comments(key):
            body_text = adf_to_text(comment.get("body", ""))
            if "Bug Fix Verification" not in body_text:
                continue
            self.delete_comment(key, comment["id"])
            deleted += 1
        return deleted

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

    label = f"{len(results)} collections"
    if len(results) == 1:
        label = results[0]["file"]

    if failed_requests or failed_assertions:
        return (
            f"Newman API: {label}, {total_requests} requests, "
            f"{passed_assertions}/{total_assertions} assertions pass "
            f"({failed_assertions} failed assertions)"
        )

    return (
        f"Newman API: {label}, {total_requests} requests, "
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


def report_key(filename):
    return os.path.splitext(os.path.basename(filename))[0].upper()


def find_parent_reports(newman_results, parent_key):
    if not parent_key:
        return newman_results
    matched = [item for item in newman_results if report_key(item["file"]) == parent_key.upper()]
    return matched or newman_results


def build_pairs(bug_keys, parent_keys):
    pairs = []
    for index, bug_key in enumerate(bug_keys):
        parent_key = parent_keys[index] if index < len(parent_keys) else ""
        pairs.append((bug_key, parent_key))
    return pairs


def build_parent_map(pairs):
    parent_map = {}
    for bug_key, parent_key in pairs:
        if not parent_key:
            continue
        parent_map.setdefault(parent_key, []).append(bug_key)
    return parent_map


def markdown_link(label, url):
    if not url:
        return label
    return f"[{label}]({url})"


def format_link_line(label, text, url):
    return f"* {label}: {markdown_link(text, url)}"


def build_comment(status, issue_key, issue_kind, bug_key, parent_key, action_result=None):
    server_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    repo = os.environ.get("GITHUB_REPOSITORY", "unknown-repo")
    run_id = os.environ.get("GITHUB_RUN_ID", "unknown-run")
    branch = os.environ.get("GITHUB_HEAD_REF") or os.environ.get("GITHUB_REF_NAME", "unknown-branch")
    actor = os.environ.get("GITHUB_ACTOR", "unknown-actor")
    full_sha = os.environ.get("GITHUB_SHA") or "unknown"
    sha = full_sha[:12]
    run_url = os.environ.get("BUGFIX_RUN_URL") or f"{server_url}/{repo}/actions/runs/{run_id}"
    commit_url = os.environ.get("BUGFIX_COMMIT_URL")
    if not commit_url and repo != "unknown-repo" and full_sha != "unknown":
        commit_url = f"{server_url}/{repo}/commit/{full_sha}"
    code_url = os.environ.get("BUGFIX_CODE_URL", "")
    code_label = os.environ.get("BUGFIX_CODE_LABEL") or branch

    newman_results, newman_failures = parse_newman_reports()
    jest_results, jest_failures = parse_jest_reports()
    scoped_newman_results = find_parent_reports(newman_results, parent_key)
    newman_summary = build_newman_summary(scoped_newman_results)
    jest_summary = build_jest_summary(jest_results)

    if status != "PASS":
        jira_summary = "Chưa chuyển Done vì bước xác minh còn lỗi."
    elif action_result and "dry-run" in action_result:
        jira_summary = "Dry-run: chỉ kiểm tra, chưa comment hoặc chuyển trạng thái Jira."
    elif action_result and action_result.startswith("failed:"):
        jira_summary = "Test đã pass, nhưng issue này chưa chuyển Done được. Xem GitHub Run để xử lý."
    elif action_result:
        jira_summary = "Đã chuyển hoặc xác nhận Done cho issue này."
    else:
        jira_summary = "Không yêu cầu chuyển trạng thái Jira."

    if issue_kind == "parent":
        scope_lines = [
            f"Task cha: {issue_key}",
            f"Bug đã xác minh: {bug_key or 'none'}",
        ]
    else:
        scope_lines = [
            f"Bug subtask: {issue_key}",
            f"Task cha: {parent_key or 'none'}",
        ]

    if status == "PASS":
        lines = [
            "[Bug Fix Verification] Xác minh sửa lỗi tự động thành công!",
            "",
            "Issue này đã được chạy lại bằng bộ test tự động và kết quả PASS.",
            "",
            "Thông tin chi tiết:",
            f"* Nhánh chạy: {branch}",
            f"* Người kích hoạt: {actor}",
            f"* GitHub Run: [#{run_id}]({run_url})",
            format_link_line("Commit chạy test", sha, commit_url),
            format_link_line("Thay đổi code", code_label, code_url),
            "",
            "Phạm vi xác minh:",
            *[f"* {line}" for line in scope_lines],
            "",
            "Kết quả kiểm thử:",
        ]
    else:
        lines = [
            "[Bug Fix Verification] Xác minh sửa lỗi tự động thất bại!",
            "",
            "Workflow đã chạy lại test nhưng vẫn còn lỗi, nên Jira không chuyển Done.",
            "",
            "Thông tin chi tiết:",
            f"* Nhánh chạy: {branch}",
            f"* Người kích hoạt: {actor}",
            f"* GitHub Run: [#{run_id}]({run_url})",
            format_link_line("Commit chạy test", sha, commit_url),
            format_link_line("Thay đổi code", code_label, code_url),
            "",
            "Phạm vi xác minh:",
            *[f"* {line}" for line in scope_lines],
            "",
            "Kết quả kiểm thử:",
        ]

    if newman_summary:
        lines.append(f"* {newman_summary}")
    if jest_summary:
        lines.append(f"* {jest_summary}")
    if not newman_summary and not jest_summary:
        lines.append("* Không tìm thấy file báo cáo test trong workflow.")

    failures = newman_failures + jest_failures
    if failures:
        lines.extend(["", "Lỗi chính:"])
        for failure in failures[:5]:
            lines.append(f"* {failure}")
        if len(failures) > 5:
            lines.append(f"* ... còn {len(failures) - 5} lỗi khác, xem chi tiết trong GitHub Run.")

    lines.extend([
        "",
        f"Jira: {jira_summary}",
        "",
        "---",
        "Báo cáo tự động được gửi từ GitHub Actions Bug Fix Verification.",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", choices=["PASS", "FAIL"], required=True)
    parser.add_argument("--bug-keys", required=True)
    parser.add_argument("--parent-keys", default="")
    parser.add_argument("--transition-bugs", choices=["true", "false"], default="true")
    parser.add_argument("--transition-parents", choices=["true", "false"], default="false")
    parser.add_argument("--cleanup-old-comments", choices=["true", "false"], default="true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    bug_keys = split_values(args.bug_keys)
    parent_keys = split_values(args.parent_keys)
    if not bug_keys:
        raise SystemExit("At least one bug key is required.")

    action_results = []
    transition_errors = []
    jira = None if args.dry_run else JiraClient()
    pairs = build_pairs(bug_keys, parent_keys)
    parent_map = build_parent_map(pairs)
    action_result_by_key = {}

    cleanup_targets = sorted(set(bug_keys + parent_keys))
    if args.cleanup_old_comments == "true":
        for key in cleanup_targets:
            if not key:
                continue
            if args.dry_run:
                print(f"dry-run: would delete old Bug Fix Verification comments from {key}")
                continue
            try:
                deleted = jira.cleanup_bugfix_comments(key)
                print(f"cleanup {key}: deleted {deleted} old Bug Fix Verification comment(s)")
            except Exception as exc:
                print(f"cleanup {key}: failed: {exc}", file=sys.stderr)

    if args.status == "PASS" and args.transition_bugs == "true":
        for key in bug_keys:
            try:
                result = "dry-run: would transition to Done" if args.dry_run else jira.transition_to_done(key)
            except Exception as exc:
                result = f"failed: {exc}"
                transition_errors.append((key, exc))
            action_results.append((key, result))
            action_result_by_key[key] = result

    if args.status == "PASS" and args.transition_parents == "true":
        for key in parent_keys:
            try:
                result = "dry-run: would transition to Done" if args.dry_run else jira.transition_to_done(key)
            except Exception as exc:
                result = f"failed: {exc}"
                transition_errors.append((key, exc))
            action_results.append((key, result))
            action_result_by_key[key] = result

    comments = []
    for bug_key, parent_key in pairs:
        comments.append((
            bug_key,
            build_comment(
                args.status,
                issue_key=bug_key,
                issue_kind="bug",
                bug_key=bug_key,
                parent_key=parent_key,
                action_result=action_result_by_key.get(bug_key),
            ),
        ))

    if args.status == "PASS":
        for parent_key, related_bugs in parent_map.items():
            comments.append((
                parent_key,
                build_comment(
                    args.status,
                    issue_key=parent_key,
                    issue_kind="parent",
                    bug_key=join_keys(related_bugs),
                    parent_key=parent_key,
                    action_result=action_result_by_key.get(parent_key),
                ),
            ))

    for key, comment in comments:
        print(f"\n--- Jira comment for {key} ---")
        print(comment)
        if args.dry_run:
            continue
        jira.add_comment(key, comment)

    if transition_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Bug fix verification Jira update failed: {exc}", file=sys.stderr)
        raise
