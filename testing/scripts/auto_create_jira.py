#!/usr/bin/env python3
"""Auto-create Jira issues from Newman JSON report.

Usage: python scripts/auto_create_jira.py --report report/report.json

This script is intentionally conservative: it deduplicates failures using
`report/error-log.json` and only creates one Jira issue per unique failure
signature.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta

try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv():
        return

import requests


def load_report(path):
    if not os.path.exists(path):
        print(f"Report not found: {path}")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_error_log(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except Exception:
                return []
    return []


def save_error_log(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def create_jira_issue(base_url, auth_tuple, project_key, summary, description, labels=None):
    url = f"{base_url.rstrip('/')}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": description,
            "labels": labels or ["api-test-failure"],
            "issuetype": {"name": "Bug"},
        }
    }
    r = requests.post(url, json=payload, auth=auth_tuple)
    if r.status_code in (200, 201):
        data = r.json()
        print(f"Created issue {data.get('key')}")
        return data.get("key")
    else:
        print(f"Failed to create issue: {r.status_code} {r.text}")
        return None


def attach_file_to_issue(base_url, auth_tuple, issue_key, file_path):
    url = f"{base_url.rstrip('/')}/rest/api/3/issue/{issue_key}/attachments"
    headers = {"X-Atlassian-Token": "no-check"}
    try:
        with open(file_path, 'rb') as fh:
            files = {'file': (os.path.basename(file_path), fh, 'text/html')}
            r = requests.post(url, files=files, headers=headers, auth=auth_tuple)
        if r.status_code in (200, 201):
            print(f"Attached {file_path} to {issue_key}")
            return True
        else:
            print(f"Failed to attach file: {r.status_code} {r.text}")
            return False
    except Exception as e:
        print(f"Attachment error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", default="report/report.json")
    parser.add_argument("--project", default="TJ", help="Jira project key to file issues into")
    parser.add_argument("--dry-run", action="store_true", help="Do not call Jira API; just print issues")
    parser.add_argument("--attach-report", action="store_true", help="Attach report/report.html to created issues")
    parser.add_argument("--ttl-days", type=int, default=7, help="Dedupe time window in days to avoid duplicate issues")
    args = parser.parse_args()

    load_dotenv()

    report = load_report(args.report)
    if not report:
        print("No report to process.")
        return

    error_log_path = "report/error-log.json"
    error_log = load_error_log(error_log_path)

    # normalize error_log entries to dicts: {signature, timestamp}
    normalized = []
    for e in error_log:
        if isinstance(e, dict) and 'signature' in e:
            normalized.append(e)
        else:
            normalized.append({'signature': str(e), 'timestamp': datetime.utcnow().isoformat()})
    error_log = normalized

    jira_base = os.environ.get("JIRA_BASE_URL") or os.environ.get("JIRA_BASE")
    jira_email = os.environ.get("JIRA_EMAIL")
    jira_token = os.environ.get("JIRA_API_TOKEN")

    auth = (jira_email, jira_token) if (jira_email and jira_token) else None

    if not args.dry_run and not (jira_base and jira_email and jira_token):
        print("Jira credentials not provided in environment and not in dry-run; skipping issue creation.")
        return

    failures = []
    # Newman JSON: report['run']['executions'] -> each has 'assertions'
    executions = report.get("run", {}).get("executions", [])
    for ex in executions:
        request_info = ex.get("request", {})
        uri = request_info.get("url") or request_info.get("uri") or ""
        method = request_info.get("method", "")
        assertions = ex.get("assertions", [])
        for a in assertions:
            if a.get("error"):
                failure = {
                    "method": method,
                    "url": uri,
                    "assertion": a.get("assertion"),
                    "message": a.get("error", {}).get("message") if isinstance(a.get("error"), dict) else str(a.get("error")),
                }
                failures.append(failure)

    if not failures:
        print("No failed assertions found.")
        return

    new_signatures = []
    now = datetime.utcnow()
    ttl = timedelta(days=args.ttl_days)
    for f in failures:
        signature = f"{f['method']} {f['url']} | {f['assertion']} | {f.get('message')}"

        # check dedupe within TTL
        duplicate = False
        for e in error_log:
            try:
                ts = datetime.fromisoformat(e.get('timestamp'))
            except Exception:
                ts = now
            if e.get('signature') == signature and (now - ts) < ttl:
                duplicate = True
                break
        if duplicate:
            print(f"Duplicate failure within TTL (skipping): {signature}")
            continue

        summary = f"[API TEST FAILED] {f['method']} {f['url']} - {f['assertion']}"
        description = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": f"Assertion: {f['assertion']}"},
                        {"type": "text", "text": "\n"},
                        {"type": "text", "text": f"Message: {f.get('message')}"},
                    ],
                }
            ],
        }

        if args.dry_run:
            print("DRY-RUN: would create issue with summary:\n", summary)
            if args.attach_report:
                print("DRY-RUN: would attach report/report.html to the issue")
            print("DRY-RUN: payload description:\n", json.dumps(description, ensure_ascii=False, indent=2))
            new_signatures.append({'signature': signature, 'timestamp': now.isoformat()})
        else:
            issue_key = create_jira_issue(jira_base, auth, args.project, summary, description)
            if issue_key:
                if args.attach_report:
                    report_html = 'report/report.html'
                    if os.path.exists(report_html):
                        attached = attach_file_to_issue(jira_base, auth, issue_key, report_html)
                        if not attached:
                            print(f"Warning: attachment failed for {issue_key}")
                    else:
                        print(f"Report file not found to attach: {report_html}")
                new_signatures.append({'signature': signature, 'timestamp': now.isoformat()})

    if new_signatures:
        error_log.extend(new_signatures)
        save_error_log(error_log_path, error_log)
        print(f"Logged {len(new_signatures)} new failure signatures.")


if __name__ == "__main__":
    main()
