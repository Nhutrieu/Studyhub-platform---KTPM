# Jira API Testing Pipeline

## 1. Project Structure

```txt
Test/
│
├── report/
│   ├── screenshots/
│   └── result.md
│
├── .env
├── plan.md
├── jira-api-test.http
└── README.md
```

---

## 2. Pipeline Overview

```txt
Create Jira Project
        ↓
Create API Token
        ↓
Setup Environment Variables
        ↓
Connect Jira API with Postman / VS Code
        ↓
Send API Request
        ↓
Validate Response
        ↓
Handle Error
        ↓
Write Testing Report
```

---

## 3. Environment Setup

File `.env`:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@gmail.com
JIRA_API_TOKEN=your-api-token
```

---

## 4. Authentication

Method: Basic Auth

```txt
Username: JIRA_EMAIL
Password: JIRA_API_TOKEN
```

---

## 5. API Testing Pipeline

| Step | Action | Tool | Expected Output |
|---|---|---|---|
| 1 | Create Jira API Token | Jira | API token generated |
| 2 | Configure environment | `.env` / Postman | Variables created |
| 3 | Test authentication | Postman / VS Code | Status 200 |
| 4 | Get project list | Jira REST API | Project data returned |
| 5 | Create issue | Jira REST API | Issue created |
| 6 | Validate response | Postman Test Script | PASS / FAIL |
| 7 | Save result | Markdown report | Testing report generated |

---

## 6. Test Case 01: Authentication

### Endpoint

```http
GET /rest/api/3/myself
```

### Expected Result

```txt
Status Code: 200 OK
Response contains accountId, displayName, emailAddress
```

### Failed Result

| Status Code | Meaning | Solution |
|---|---|---|
| 401 | Unauthorized | Check email or API token |
| 403 | Forbidden | Check Jira permission |
| 404 | Not Found | Check base URL |

---

## 7. Test Case 02: Get Projects

### Endpoint

```http
GET /rest/api/3/project
```

### Expected Result

```txt
Status Code: 200 OK
Response returns project list
```

### Validation

```txt
Project key exists
Project name exists
Project id exists
```

---

## 8. Test Case 03: Create Issue

### Endpoint

```http
POST /rest/api/3/issue
```

### Request Body

```json
{
  "fields": {
    "project": {
      "key": "KAN"
    },
    "summary": "Create issue from API testing pipeline",
    "issuetype": {
      "name": "Task"
    }
  }
}
```

### Expected Result

```txt
Status Code: 201 Created
Response contains issue id, key, self
```

---

## 9. Error Handling Pipeline

```txt
API Request Failed
        ↓
Check Status Code
        ↓
Identify Error Type
        ↓
Fix Configuration / Request Body
        ↓
Retest API
        ↓
Update Report
```

---

## 10. Common Error Report

| Error Code | Error Name | Cause | Solution |
|---|---|---|---|
| 400 | Bad Request | Invalid JSON body | Check request body format |
| 401 | Unauthorized | Wrong email or token | Recheck API token |
| 403 | Forbidden | No permission | Check Jira project permission |
| 404 | Not Found | Wrong endpoint/baseUrl | Check Jira URL |
| 500 | Server Error | Jira server issue | Retry later |

---

## 11. Report Format

File: `report/result.md`

```md
# Jira API Testing Report

## Test Summary

| Test Case | Endpoint | Status | Result |
|---|---|---|---|
| TC01 | GET /myself | 200 | PASS |
| TC02 | GET /project | 200 | PASS |
| TC03 | POST /issue | 201 | PASS |

## Screenshots

- Authentication result
- Get project result
- Create issue result

## Conclusion

The Jira REST API was successfully connected and tested using Postman and VS Code.
The testing process includes authentication, project retrieval, issue creation, response validation, and error handling.
```

---

## 12. Final Workflow

```txt
Jira API Token
    ↓
Postman / VS Code REST Client
    ↓
API Request
    ↓
Response Validation
    ↓
PASS / FAIL
    ↓
Testing Report
```

---

## 13. Conclusion

This pipeline helps testers verify Jira REST API integration.
It supports API authentication, request testing, error handling, and report documentation.

##  14
Developer Push Code
        ↓
GitHub Repository
        ↓
GitHub Actions Trigger
        ↓
Run API Testing Pipeline
        ↓
Generate Test Result
        ↓
Update Report
Purpose

This workflow connects the source code repository with the API testing process.
Whenever developers push code to GitHub, the testing pipeline can be triggered automatically.

## 15

File: .github/workflows/jira-api-test.yml

name: Jira API Testing Pipeline

on:
  push:
    branches:
      - main

jobs:
  jira-api-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Run Jira API Testing Pipeline
        run: |
          echo "Running Jira API testing..."
          echo "Testing authentication API..."
          echo "Testing project API..."
          echo "Testing issue creation API..."
          echo "Generating testing report..."
## 16. Auto Bug Creation Flow
API Test Failed
        ↓
Detect Error Response
        ↓
Collect Error Information
        ↓
Call Jira REST API
        ↓
Create Bug Issue Automatically
        ↓
Assign Bug to Developer
Purpose

This flow helps testers automatically create Jira bug issues when an API test fails.

## 17. Postman Test Script
Status Code Validation
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
Response Body Validation
pm.test("Response contains required data", function () {
    let jsonData = pm.response.json();
    pm.expect(jsonData).to.not.be.empty;
});
Project Validation
pm.test("Project key exists", function () {
    let jsonData = pm.response.json();
    pm.expect(jsonData[0]).to.have.property("key");
});
## 18. Auto Create Jira Bug Request
Endpoint
POST /rest/api/3/issue
Request Body
{
  "fields": {
    "project": {
      "key": "KAN"
    },
    "summary": "API Test Failed - Auto Created Bug",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "This bug was automatically created when the API testing pipeline detected a failed test case."
            }
          ]
        }
      ]
    },
    "issuetype": {
      "name": "Bug"
    }
  }
}
## 19. Extended Project Structure
Test/
│
├── .github/
│   └── workflows/
│       └── jira-api-test.yml
│
├── postman/
│   ├── jira-api-collection.json
│   └── jira-environment.json
│
├── report/
│   ├── screenshots/
│   ├── result.md
│   ├── error-log.md
│   └── summary.md
│
├── .env
├── plan.md
├── jira-api-test.http
└── README.md
## 20. Extended Final Workflow
Developer
    ↓
GitHub Repository
    ↓
GitHub Actions
    ↓
Postman / VS Code REST Client
    ↓
Jira REST API Testing
    ↓
Response Validation
    ↓
PASS / FAIL
    ↓
Auto Create Jira Bug
    ↓
Generate Testing Report
## 21. Extended Conclusion

This extended pipeline improves the Jira REST API testing process by integrating GitHub, GitHub Actions, Postman, VS Code REST Client, and Jira Open API.

The pipeline supports:

Source code management
Automated API testing
Response validation
Error handling
Automatic bug creation
Testing report generation

This helps the development team track bugs, manage tasks, and improve software quality during the development lifecycle.
thêm all chức năng này vào đi
---

## KOI Care System — Additional Features (Thêm chức năng)

Below are added features and automation examples for the KOI Care API testing workflow. These aim to automate test runs, generate richer reports, and create Jira bugs automatically when failures occur.

- Feature: Automated Newman execution with HTML/JSON/Markdown reports.
- Feature: GitHub Actions workflow to run Newman on push and schedule (cron).
- Feature: Auto-Jira bug creation script that parses Newman JSON and posts failures to Jira with attached request/response.
- Feature: Slack/Email notifications on FAIL with report links.
- Feature: Retry logic and failure grouping to avoid duplicate Jira issues.
- Feature: Environment management via `.env` and secure secrets in GitHub Actions.

### Example Newman command

```bash
newman run postman/jira-api-collection.json \
        -e postman/jira-environment.json \
        -r cli,html,json --reporter-html-export report/report.html \
        --reporter-json-export report/report.json
```

Place generated markdown summary into `report/result.md` (already supported).

### Auto-Jira bug creation (concept)

- Run Newman with `--reporter-json-export report/report.json`.
- Use a small Python script `scripts/auto_create_jira.py` to:
        - Parse `report/report.json`.
        - For each failed test, collect request/response and stack trace.
        - Post to Jira REST API `/rest/api/3/issue` with a descriptive summary and attach the failing request/response as an attachment.
        - Optionally add labels like `api-test-failure` and assign to a team.

Example (pseudo):

```python
# scripts/auto_create_jira.py
import json, os
from jira import JIRA

# load report/report.json and create issues for failures
```

### GitHub Actions example (snippet)

Add `.github/workflows/api-tests.yml` to run tests on push and schedule:

```yaml
name: KOI API Tests
on:
        push:
                branches: [ main ]
        schedule:
                - cron: '0 2 * * *'

jobs:
        newman:
                runs-on: ubuntu-latest
                steps:
                        - uses: actions/checkout@v4
                        - name: Install Node
                                uses: actions/setup-node@v4
                                with:
                                        node-version: '16'
                        - name: Install newman
                                run: npm install -g newman newman-reporter-html
                        - name: Run Newman
                                run: |
                                        newman run postman/jira-api-collection.json -e postman/jira-environment.json \
                                                -r cli,html,json --reporter-html-export report/report.html \
                                                --reporter-json-export report/report.json
                        - name: Upload report
                                uses: actions/upload-artifact@v4
                                with:
                                        name: api-test-report
                                        path: report/
```

### Failure handling & deduplication

- Keep a simple local cache (e.g., `report/error-log.json`) of recent failure signatures (endpoint + status + error message).
- Before creating a Jira bug, check cache to avoid duplicates. If duplicate, add a comment instead of creating a new issue.

### Notifications

- On failure, send a Slack message or email with summary and link to `report/report.html` (artifact). Use GitHub Actions secrets for webhook tokens.

### Environment & Secrets

- Keep local `.env` with `BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and use GitHub Secrets to populate workflow environment variables for CI.

### Where to add these files

- Reports: `report/report.html`, `report/report.json`, `report/result.md`
- Scripts: `scripts/auto_create_jira.py` (and `requirements.txt` entry like `jira`)
- CI workflow: `.github/workflows/api-tests.yml`

---

If you want, I can implement the following next: generate the GitHub Actions workflow file, add the `scripts/auto_create_jira.py` skeleton, and add a small README with run instructions. Tell me which to do first.