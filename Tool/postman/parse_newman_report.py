import os
import json
import re
import glob
import argparse
from urllib.parse import urlparse

def clean_request_name(name):
    # Remove leading emojis and non-word characters, then strip whitespace
    name = re.sub(r'^[^\w\s\(\)\[\]]+', '', name)
    return name.strip()

def get_relative_path(url_str):
    try:
        parsed = urlparse(url_str)
        path = parsed.path
        if parsed.query:
            path += "?" + parsed.query
        return path if path else "/"
    except Exception:
        return url_str

def format_body(body_obj):
    if not body_obj:
        return "No body"
    mode = body_obj.get('mode')
    if mode == 'raw':
        raw_data = body_obj.get('raw', '')
        try:
            # Format JSON body nicely
            parsed = json.loads(raw_data)
            return json.dumps(parsed, indent=2, ensure_ascii=False)
        except Exception:
            return raw_data
    elif mode == 'formdata':
        params = []
        for param in body_obj.get('formdata', []):
            params.append(f"{param.get('key')}: {param.get('value')}")
        return "\n".join(params)
    elif mode == 'urlencoded':
        params = []
        for param in body_obj.get('urlencoded', []):
            params.append(f"{param.get('key')}: {param.get('value')}")
        return "\n".join(params)
    return "N/A"

def extract_expected_status(assertion_msg, test_name):
    match = re.search(r'status code (\d+)', assertion_msg)
    if match:
        return match.group(1)
    match = re.search(r'status (\d+)', assertion_msg)
    if match:
        return match.group(1)
    
    if test_name:
        match = re.search(r'\b(2\d{2}|4\d{2}|5\d{2})\b', test_name)
        if match:
            return match.group(1)
    return "200"

def parse_reports(reports_dir):
    report_files = glob.glob(os.path.join(reports_dir, "*.json"))
    all_failures = []
    all_runs = []
    
    for report_file in report_files:
        try:
            with open(report_file, 'r', encoding='utf-8') as f:
                report = json.load(f)
            
            failures = report.get('run', {}).get('failures', [])
            executions = report.get('run', {}).get('executions', [])
            
            all_runs.append({
                "file": os.path.basename(report_file),
                "report": report
            })
            
            for fail in failures:
                source_id = fail.get('source', {}).get('id')
                source_name = fail.get('source', {}).get('name', '')
                
                execution = None
                for exec_item in executions:
                    if exec_item.get('id') == source_id or exec_item.get('item', {}).get('name') == source_name:
                        execution = exec_item
                        break
                
                all_failures.append({
                    "failure": fail,
                    "execution": execution
                })
        except Exception as e:
            print(f"Error reading report {report_file}: {e}")
            
    return all_failures, all_runs

def handle_fail(failures):
    primary = failures[0]
    fail_obj = primary["failure"]
    exec_obj = primary["execution"]
    
    raw_req_name = fail_obj.get('source', {}).get('name', 'Unknown API')
    clean_name = clean_request_name(raw_req_name)
    summary = f"Bug API {clean_name} thất bại"
    
    method = "UNKNOWN"
    url_path = "UNKNOWN"
    req_body = "N/A"
    
    if exec_obj:
        req = exec_obj.get('request', {})
        method = req.get('method', 'UNKNOWN')
        url_obj = req.get('url', {})
        if isinstance(url_obj, dict):
            url_raw = url_obj.get('raw', '')
            url_path = get_relative_path(url_raw)
        else:
            url_path = get_relative_path(str(url_obj))
            
        body_obj = req.get('body', {})
        if body_obj:
            req_body = format_body(body_obj)
    else:
        src = fail_obj.get('source', {})
        req = src.get('request', {})
        method = req.get('method', 'UNKNOWN')
        url_obj = req.get('url', {})
        if isinstance(url_obj, dict):
            path_list = url_obj.get('path', [])
            url_path = "/" + "/".join(path_list)
        else:
            url_path = get_relative_path(str(url_obj))
        body_obj = req.get('body', {})
        if body_obj:
            req_body = format_body(body_obj)
            
    assertion_test = fail_obj.get('error', {}).get('test', '')
    assertion_msg = fail_obj.get('error', {}).get('message', '')
    
    expected_code = extract_expected_status(assertion_msg, assertion_test)
    expected_str = f"HTTP {expected_code}"
    
    actual_code = "500"
    actual_status = "Internal Server Error"
    if exec_obj and exec_obj.get('response'):
        resp = exec_obj.get('response', {})
        actual_code = str(resp.get('code', '500'))
        actual_status = resp.get('status', 'Internal Server Error')
    
    actual_str = f"HTTP {actual_code} {actual_status}"
    
    description = f"""Mô tả lỗi
API trả về sai dữ liệu.

Các bước tái hiện
1. {method} {url_path}
2. body:
{req_body}

Kết quả mong đợi
{expected_str}

Kết quả thực tế
{actual_str}

Assertion
{assertion_msg}"""

    if len(failures) > 1:
        description += "\n\n---\n### Danh sách các lỗi khác phát hiện trong đợt test này:\n"
        for i, item in enumerate(failures[1:], start=2):
            f_obj = item["failure"]
            f_name = clean_request_name(f_obj.get('source', {}).get('name', 'Unknown API'))
            f_msg = f_obj.get('error', {}).get('message', '')
            description += f"{i}. **{f_name}**: {f_msg}\n"

    print("=== GENERATED JIRA BUG ===")
    print("SUMMARY:", summary)
    print("DESCRIPTION:\n", description)
    
    env_file = os.getenv('GITHUB_ENV')
    if env_file:
        with open(env_file, 'a', encoding='utf-8') as f:
            f.write(f"JIRA_BUG_SUMMARY={summary}\n")
            f.write("JIRA_BUG_DESCRIPTION<<EOF\n")
            f.write(description + "\n")
            f.write("EOF\n")
        print("Successfully wrote variables to GITHUB_ENV.")

def handle_pass(all_runs):
    branch = os.getenv('GITHUB_REF_NAME', 'unknown-branch')
    actor = os.getenv('GITHUB_ACTOR', 'unknown-actor')
    run_id = os.getenv('GITHUB_RUN_ID', 'unknown-run')
    repo = os.getenv('GITHUB_REPOSITORY', 'unknown-repo')
    
    comment = f"✅ *[API Automation]* **Kiểm thử tích hợp tự động thành công!**\n\n"
    comment += f"Tất cả các ca kiểm thử liên quan đã vượt qua thành công.\n\n"
    comment += f"**📊 Thông tin chi tiết:**\n"
    comment += f"* 💻 **Nhánh chạy:** `{branch}`\n"
    comment += f"* 👤 **Người kích hoạt:** `{actor}`\n"
    comment += f"* 🚀 **GitHub Run:** [#{run_id}](https://github.com/{repo}/actions/runs/{run_id})\n\n"
    
    comment += "**📋 Chi tiết kết quả kiểm thử:**\n"
    
    total_all_reqs = 0
    total_all_assertions = 0
    
    for run in all_runs:
        filename = run["file"]
        report = run["report"]
        stats = report.get('run', {}).get('stats', {})
        
        reqs = stats.get('requests', {}).get('total', 0)
        assertions = stats.get('assertions', {}).get('total', 0)
        
        total_all_reqs += reqs
        total_all_assertions += assertions
        
        comment += f"* 📂 `{filename}`: **{reqs}** requests, **{assertions}** assertions đã đạt (100%)\n"
        
    comment += f"\n👉 **Tổng cộng:** Thực thi **{total_all_reqs}** requests với **{total_all_assertions}** assertions thành công.\n"
    comment += "\n---\n*Báo cáo tự động được gửi từ hệ thống GitHub Actions CI/CD.*"
    
    print("=== GENERATED JIRA COMMENT ===")
    print(comment)
    
    env_file = os.getenv('GITHUB_ENV')
    if env_file:
        with open(env_file, 'a', encoding='utf-8') as f:
            f.write("JIRA_COMMENT<<EOF\n")
            f.write(comment + "\n")
            f.write("EOF\n")
        print("Successfully wrote JIRA_COMMENT to GITHUB_ENV.")

def main():
    parser = argparse.ArgumentParser(description="Parse Newman report and output to Github Env.")
    parser.add_argument('--status', choices=['PASS', 'FAIL'], required=True, help="Newman status")
    args = parser.parse_args()
    
    reports_dir = "newman-reports"
    if not os.path.exists(reports_dir):
        print(f"Reports directory {reports_dir} does not exist.")
        return
        
    failures, all_runs = parse_reports(reports_dir)
    
    if args.status == 'FAIL':
        if not failures:
            print("Status is FAIL but no failures found in reports. Generating fallback.")
            # Fallback bug summary
            summary = "Bug API Automation kiểm thử thất bại"
            description = "Hệ thống CI/CD phát hiện lỗi nhưng không tìm thấy thông tin chi tiết trong các file báo cáo."
            env_file = os.getenv('GITHUB_ENV')
            if env_file:
                with open(env_file, 'a', encoding='utf-8') as f:
                    f.write(f"JIRA_BUG_SUMMARY={summary}\n")
                    f.write("JIRA_BUG_DESCRIPTION<<EOF\n")
                    f.write(description + "\n")
                    f.write("EOF\n")
        else:
            handle_fail(failures)
    else:
        # Status PASS
        handle_pass(all_runs)

if __name__ == "__main__":
    main()
