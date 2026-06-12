import argparse
import os
import json
import shutil
import subprocess
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

load_dotenv()

BASE_DIR = os.path.dirname(__file__)

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
PROJECT_NAME = os.getenv("PROJECT_NAME", "Furnimart")

JIRA_BASE_URL = os.getenv("JIRA_BASE_URL")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "FM")
JIRA_ISSUE_TYPE = os.getenv("JIRA_ISSUE_TYPE", "Bug")

COLLECTION_PATH = os.getenv("POSTMAN_COLLECTION_PATH", "postman/furnimart_collection.json")
if os.path.isabs(COLLECTION_PATH):
    COLLECTION = COLLECTION_PATH
else:
    COLLECTION = os.path.join(BASE_DIR, COLLECTION_PATH)

REPORT_DIR = os.path.join(BASE_DIR, "report")
REPORT_JSON = os.path.join(REPORT_DIR, "report.json")
REPORT_MD = os.path.join(REPORT_DIR, "result.md")
REPORT_XLSX = os.path.join(REPORT_DIR, "report.xlsx")

os.makedirs(REPORT_DIR, exist_ok=True)


def run_newman_for_collections(collections, base_url):
    newman = shutil.which("newman")

    if not newman:
        print("Không tìm thấy Newman. Chạy: npm install -g newman")
        return False

    consolidated_data = {
        "run": {
            "executions": []
        }
    }

    # Temporary folder for individual reports
    temp_dir = os.path.join(REPORT_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    success = False
    for idx, coll in enumerate(collections):
        temp_report_json = os.path.join(temp_dir, f"report_{idx}.json")
        cmd = [
            newman,
            "run",
            coll,
            "--env-var",
            f"baseUrl={base_url}",
            "--reporters",
            "cli,json",
            "--reporter-json-export",
            temp_report_json
        ]
        print(f"Running Newman for: {os.path.basename(coll)} ...")
        result = subprocess.run(cmd)

        if os.path.exists(temp_report_json):
            success = True
            try:
                with open(temp_report_json, "r", encoding="utf-8") as f:
                    rep_data = json.load(f)
                    executions = rep_data.get("run", {}).get("executions", [])
                    consolidated_data["run"]["executions"].extend(executions)
            except Exception as e:
                print(f"Lỗi khi đọc file báo cáo tạm: {e}")

    # Clean up temp directory
    try:
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass

    if success:
        with open(REPORT_JSON, "w", encoding="utf-8") as f:
            json.dump(consolidated_data, f, indent=2, ensure_ascii=False)
        return True

    return False


def parse_report():
    with open(REPORT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = []
    failures = []

    for ex in data.get("run", {}).get("executions", []):
        name = ex.get("item", {}).get("name", "Unknown Test")
        request = ex.get("request", {})
        method = request.get("method", "UNKNOWN")

        url_obj = request.get("url", {})
        if isinstance(url_obj, dict):
            url = url_obj.get("raw", "")
        else:
            url = str(url_obj)

        response = ex.get("response", {})
        status = response.get("code", "NO RESPONSE")

        assertion_errors = []
        for assertion in ex.get("assertions", []):
            error = assertion.get("error")
            if error:
                assertion_errors.append(
                    f"{assertion.get('assertion')}: {error.get('message')}"
                )

        result = "FAIL" if assertion_errors or status not in [200, 201] else "PASS"

        row = {
            "name": name,
            "method": method,
            "url": url,
            "status": status,
            "result": result,
            "message": "; ".join(assertion_errors)
        }

        results.append(row)

        if result == "FAIL":
            failures.append(row)

    return results, failures


def write_markdown(results, failures, created_issues):
    now = datetime.now(timezone.utc).isoformat()

    lines = [
        f"# {PROJECT_NAME} API Testing Report",
        "",
        f"Generated: {now}",
        "",
        "## Test Summary",
        "",
        "| Test Case | Method | URL | Status | Result | Message |",
        "|---|---|---|---|---|---|"
    ]

    for r in results:
        lines.append(
            f"| {r['name']} | {r['method']} | {r['url']} | {r['status']} | {r['result']} | {r['message']} |"
        )

    lines.append("")
    lines.append("## Jira Issues")
    lines.append("")

    if created_issues:
        for issue in created_issues:
            lines.append(f"- {issue}")
    else:
        lines.append("No Jira issues created.")

    lines.append("")
    lines.append("## Conclusion")
    lines.append("")

    if failures:
        lines.append("Some API test cases failed. Jira issues were created for failed APIs.")
    else:
        lines.append("All API test cases passed successfully.")

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

def write_excel(results, failures, created_issues):
    wb = Workbook()

    ws = wb.active
    ws.title = "API Summary"

    # STYLE
    blue_fill = PatternFill("solid", fgColor="00008B")
    white_font = Font(color="FFFFFF", bold=True)
    center = Alignment(horizontal="center", vertical="center")
    border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin")
    )

    # HEADER
    headers = [
        "No",
        "Function Name",
        "Passed",
        "Failed",
        "Untested",
        "N",
        "A",
        "B",
        "Total Test Cases"
    ]

    ws.append(headers)

    for cell in ws[1]:
        cell.fill = blue_fill
        cell.font = white_font
        cell.alignment = center
        cell.border = border

    # DATA
    for index, r in enumerate(results, start=1):

        passed = 1 if r["result"] == "PASS" else 0
        failed = 1 if r["result"] == "FAIL" else 0

        row = [
            index,
            r["name"],
            passed,
            failed,
            0,
            0,
            0,
            0,
            1
        ]

        ws.append(row)

    # STYLE DATA
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.border = border
            cell.alignment = center

    # WIDTH
    widths = {
        "A": 8,
        "B": 35,
        "C": 12,
        "D": 12,
        "E": 12,
        "F": 8,
        "G": 8,
        "H": 8,
        "I": 18
    }

    for col, width in widths.items():
        ws.column_dimensions[col].width = width

    # TOTAL ROW
    total_row = len(results) + 2

    ws[f"A{total_row}"] = "TOTAL"
    ws[f"A{total_row}"].font = Font(bold=True)

    ws[f"C{total_row}"] = f"=SUM(C2:C{len(results)+1})"
    ws[f"D{total_row}"] = f"=SUM(D2:D{len(results)+1})"
    ws[f"E{total_row}"] = f"=SUM(E2:E{len(results)+1})"
    ws[f"I{total_row}"] = f"=SUM(I2:I{len(results)+1})"

    for cell in ws[total_row]:
        cell.border = border
        cell.alignment = center

    wb.save(REPORT_XLSX)


def create_jira_issue(failure):
    if not all([JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY]):
        print("Thiếu thông tin Jira trong .env, bỏ qua tạo Jira issue.")
        return None

    url = f"{JIRA_BASE_URL.rstrip('/')}/rest/api/3/issue"

    if JIRA_ISSUE_TYPE.lower() == "task":
        description_text = (
            f"Mô tả\n"
            f"API test case [{failure['name']}] thất bại khi chạy kiểm thử tự động.\n"
            f"- HTTP Method: {failure['method']}\n"
            f"- Endpoint: {failure['url']}\n\n"
            f"Phạm vi Kiểm thử\n"
            f"- Endpoint: {failure['url']}\n\n"
            f"Kết quả Kỳ vọng\n"
            f"- API hoạt động chính xác và phản hồi mã thành công (200 hoặc 201)."
        )
    else:  # Defaults to Bug format
        description_text = (
            f"Mô tả lỗi\n"
            f"Phát hiện lỗi tự động khi chạy kiểm thử API [{failure['name']}].\n\n"
            f"Các bước tái hiện\n"
            f"1. Thực hiện gọi API {failure['method']} tại URL: {failure['url']}\n"
            f"2. Kiểm tra kết quả phản hồi của API.\n\n"
            f"Kết quả mong đợi\n"
            f"- API thực hiện thành công, trả về dữ liệu hợp lệ và đáp ứng các điều kiện Assertions.\n\n"
            f"Kết quả thực tế\n"
            f"- API trả về mã trạng thái (Status Code): {failure['status']}\n"
            f"- Chi tiết lỗi phản hồi: {failure['message'] if failure['message'] else 'Không có thông điệp lỗi chi tiết.'}"
        )

    payload = {
        "fields": {
            "project": {
                "key": JIRA_PROJECT_KEY
            },
            "summary": f"[{PROJECT_NAME.upper()} API TEST FAILED] {failure['name']}",
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": description_text
                            }
                        ]
                    }
                ]
            },
            "issuetype": {
                "name": JIRA_ISSUE_TYPE
            }
        }
    }

    response = requests.post(
        url,
        json=payload,
        auth=(JIRA_EMAIL, JIRA_API_TOKEN),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    )

    if response.status_code in [200, 201]:
        issue_key = response.json().get("key")
        print(f"Created Jira issue: {issue_key}")
        return issue_key

    print("Jira create failed:", response.status_code, response.text)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", default=os.getenv("POSTMAN_COLLECTION_PATH", "postman/furnimart_collection.json"), help="Path to Postman collection JSON or folder")
    parser.add_argument("--base-url", default=os.getenv("BASE_URL", "http://localhost:3000"), help="Base URL of the API under test")
    args = parser.parse_args()

    # Resolve collection path (relative to BASE_DIR if not absolute)
    if os.path.isabs(args.collection):
        collection_path = args.collection
    else:
        collection_path = os.path.join(BASE_DIR, args.collection)

    collections = []
    if os.path.isdir(collection_path):
        print(f"Đang tìm các file collection trong thư mục: {collection_path}")
        for root, dirs, files in os.walk(collection_path):
            for file in files:
                if file.endswith(".json") and "environment" not in file.lower() and "global" not in file.lower():
                    collections.append(os.path.join(root, file))
    else:
        if os.path.exists(collection_path):
            collections.append(collection_path)

    if not collections:
        print(f"Không tìm thấy file collection nào tại: {collection_path}")
        return

    print(f"Tìm thấy {len(collections)} collections để chạy kiểm thử.")

    if not run_newman_for_collections(collections, args.base_url):
        print("Không tạo được report.json")
        return

    results, failures = parse_report()

    created_issues = []

    if failures:
        print("Có API FAIL, đang tạo Jira issue...")
        for failure in failures:
            issue_key = create_jira_issue(failure)
            if issue_key:
                created_issues.append(issue_key)
    else:
        print("Tất cả API đều PASS.")

    write_markdown(results, failures, created_issues)
    write_excel(results, failures, created_issues)

    print("Done.")
    print(f"Markdown report: {REPORT_MD}")
    print(f"Excel report: {REPORT_XLSX}")
    print(f"JSON report: {REPORT_JSON}")


if __name__ == "__main__":
    main()