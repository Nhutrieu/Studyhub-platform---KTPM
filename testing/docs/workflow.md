# KOI CARE SYSTEM — COMPLETE TESTING PIPELINE WORKFLOW

---

# 1. OVERVIEW

Hệ thống kiểm thử của dự án Koi Care System At Home được xây dựng theo mô hình:

* GitHub quản lý source code
* Jira quản lý task/bug
* Postman kiểm thử API
* Newman chạy automation test
* Python tự động phân tích report
* Jira Open API tự động tạo bug
* Git workflow quản lý branch/team

Pipeline này mô phỏng quy trình kiểm thử phần mềm thực tế trong doanh nghiệp.

---

# 2. PROJECT WORKFLOW STRUCTURE

```text
Jira Task
↓
Pull latest develop
↓
Create feature branch
↓
Write / Update API Tests
↓
Run Newman Automation
↓
Generate report.json
↓
Python Parse Report (run_tests.py)
│
├── PASS ✅
│     ├── Generate report.md
│     ├── Generate report.xlsx
│     ├── Git Commit
│     ├── Push GitHub
│     ├── Create Pull Request
│     └── Merge into develop
│
└── FAIL ❌
      ├── Auto Create Jira Bug
      ├── Attach Testing Report
      ├── Generate failure logs
      ├── Push bug reports
      └── Developer fixes bug
```

---

# 3. GIT WORKFLOW

## Main Branches

| Branch    | Purpose                  |
| --------- | ------------------------ |
| main      | Stable production source |
| develop   | Main development branch  |
| feature/* | New feature/testing      |
| bugfix/*  | Bug fixing branch        |

---

# 4. TEAM WORKFLOW

## Each member workflow

```text
Receive Jira Task
↓
Pull latest develop
↓
Create personal branch
↓
Implement testing
↓
Run automation
↓
Commit code
↓
Push GitHub
↓
Create Pull Request
↓
Code Review
↓
Merge develop
```

---

# 5. JIRA WORKFLOW

## Jira Structure

```text
Epic
 ├── Task
 ├── Task
 ├── Bug
 └── Bug
```

---

## Example

### Epic

Koi Management Testing

### Tasks

* Functional Testing for Add Koi API
* Validation Testing for Edit Koi API
* Security Testing for Delete Koi API
* Postman Collection for Koi Module

### Bugs

* Add Koi API allows negative age
* SQL Injection vulnerability in Koi Name
* Unauthorized access bypass

---

# 6. POSTMAN TESTING WORKFLOW

## Collection Structure

```text
KoiCare API Testing
│
├── Authentication
├── Koi Management
├── Pond Management
├── Water Parameters
├── Feeding Management
├── Shop System
└── Admin System
```

---

# 7. API TESTING TYPES

## Functional Testing

* Add Koi
* Edit Koi
* Delete Koi
* List Koi
* Koi Detail

---

## Validation Testing

* Empty input
* Invalid number
* Invalid image
* Oversized file

---

## Security Testing

* SQL Injection
* Unauthorized access
* Session validation
* File upload attack

---

# 8. NEWMAN AUTOMATION

## Run Collection

```bash
newman run testing/postman/koi_collection.json \
-e testing/postman/<environment>.json \
-r cli,json \
--reporter-json-export testing/report/report.json
```

---

# 9. PYTHON AUTOMATION PIPELINE

## Python Scripts Responsibilities

### testing/run_tests.py

Responsible for:

* Running Newman
* Reading report.json
* Parsing failures
* Generating markdown reports
* Generating Excel reports
* Calling Jira API

---

### testing/scripts/auto_create_jira.py

Responsible for:

* Auto create Jira bug
* Deduplicate duplicate bugs
* Attach testing report
* Log bug history

---

# 10. AUTO BUG CREATION FLOW

```text
Newman FAIL
↓
Generate report.json
↓
Python Parse Failure
↓
Detect Failed Assertions
↓
Call Jira REST API
↓
Create Bug Automatically
↓
Attach HTML/JSON Report
↓
Save failure signature
```

---

# 11. REPORT SYSTEM

## Generated Reports

| File        | Purpose                  |
| ----------- | ------------------------ |
| report.json | Newman raw report        |
| report.html | HTML testing report      |
| result.md   | Markdown testing summary |

---

# 12. GITHUB WORKFLOW

## Commit Format

```bash
git commit -m "KOI-12 add add-koi api testing"
```

or

```bash
git commit -m "KOI-25 fix add-koi validation bug"
```

---

## Branch Naming

### Feature

```bash
feature/koi-add-api-testing
```

### Bugfix

```bash
bugfix/fix-negative-age-validation
```

---

# 13. COMPLETE TESTING FLOW EXAMPLE

## Example: Add Koi API Testing

### Step 1 — Jira

Create Task:

```text
Functional Testing for Add Koi API
```

Move status:

```text
TO DO → IN PROGRESS
```

---

### Step 2 — GitHub

```bash
git checkout develop
git pull origin develop
git checkout -b feature/koi-add-api-testing
```

---

### Step 3 — Postman

Create requests:

* Happy Case
* Empty Name
* Negative Age
* SQL Injection
* Unauthorized Access

---

### Step 4 — Run Automation

```bash
python testing/run_tests.py
```

---

### Step 5 — Result

## PASS

```text
Generate reports
Commit
Push GitHub
Create PR
Done Jira Task
```

---

## FAIL

```text
Auto create Jira Bug
Attach report
Developer fix bug
Retest
```

---

# 14. PROJECT DIRECTORY STRUCTURE

```text
testing/
│
├── .env
├── Dockerfile
├── README.md
├── requirements.txt
├── run_tests.py
│
├── .github/
│   └── workflows/
│       ├── api-tests.yml
│       └── jira-api-test.yml
│
├── postman/
│   ├── jira-api-collection.json
│   ├── KOI Care API Testing.postman_collection.json
│   └── koi_collection.json
│
├── scripts/
│   └── auto_create_jira.py
│
├── report/
│   ├── report.json
│   ├── report.html
│   └── result.md
│
├── docs/
│   ├── TEST_PLAN.md
│   ├── TEST_CASES.md
│   ├── BUG_REPORT.md
│   └── SRS.md
│
└── bug-reports/
```

---

# 15. FUTURE IMPROVEMENT

## GitHub Actions CI/CD

Future pipeline:

```text
Push GitHub
↓
GitHub Actions
↓
Auto Run Newman
↓
Auto Generate Reports
↓
Auto Create Jira Bugs
↓
Send Notification
```

This becomes a mini CI/CD testing pipeline.

---

# 16. EXPECTED OUTCOME

After completing this workflow, the project will have:

* Standardized testing workflow
* Automated API testing
* Automated bug tracking
* Team collaboration workflow
* Git version control
* Jira task management
* Testing documentation
* CI/CD mindset
* Semi-professional software testing pipeline

---

# 17. CONCLUSION

The Koi Care System testing pipeline provides a complete workflow for:

* API Testing
* Automation Testing
* Bug Tracking
* Team Collaboration
* Continuous Testing

This workflow follows software testing concepts used in real-world software development environments.
