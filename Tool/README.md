# Jira API Testing Pipeline

This repo contains a simple Jira REST API testing pipeline with automatic bug creation and CI integration.

Usage (local):

1. Create a `.env` file with the following variables (or copy `.env.example`):

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token_here
JIRA_PROJECT_KEY=KAN
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run tests:

```bash
python run_tests.py
```

CI:

The GitHub Actions workflow `.github/workflows/jira-api-test.yml` runs the tests on pushes to `main`. Set repository Secrets: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.

Additional options:

- Screenshots: The test runner creates simple evidence files in `report/screenshots/` for each test (PNG when Pillow is installed, otherwise `.txt`). These are included in the report.
- Slack notifications: set `SLACK_WEBHOOK_URL` in your `.env` or GitHub Secrets to receive a message when failures and issues are created.
- Auto-assign issues: set `JIRA_ASSIGNEE_ACCOUNT_ID` to the Jira accountId to assign created bug issues automatically.
- Newman support: if you maintain a Postman collection in `postman/jira-api-collection.json`, the CI will attempt to run it with Newman (optional). Install Newman via Node in the workflow.
- Docker: build and run the provided `Dockerfile` to run the tests in a container:

```bash
docker build -t jira-api-tests .
docker run --env-file .env jira-api-tests
```

Future improvements:

- Run Newman natively in CI and fail the workflow on collection failures when desired.
- Add retry/backoff for flaky network calls.
- Add Slack/Email templates and richer reporting (HTML).
- Use Newman + Jenkins or a dedicated test runner for larger suites.
