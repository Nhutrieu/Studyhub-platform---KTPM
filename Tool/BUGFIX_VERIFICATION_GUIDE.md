# Huong Dan Su Dung Bug Fix Verification Automation

Tai lieu nay huong dan thanh vien trong nhom dung workflow `Bug Fix Verification + Jira`
de xac minh bug da duoc sua, tu dong comment bang chung len Jira va chuyen cac bug/task
sang Done khi bo test da PASS.

Lam dung cac buoc ben duoi thi ket qua tren Jira se giong luong da chay cho Notification
Service: moi bug co comment rieng, link GitHub Run/Commit/PR bam duoc, va khong can sua
comment Jira bang tay.

## 1. Khi nao dung workflow nay

Dung workflow nay sau khi co bug subtask tren Jira va dev da fix bug xong tren mot nhanh Git.

Khong dung workflow nay de tim bug moi. Cac workflow Newman/Jest hien co van la luong phat
hien loi. Workflow nay chi dung cho buoc xac minh lai bug fix truoc khi dong Jira.

Luong chuan:

```text
Bug Jira da duoc tao
-> Dev fix code tren nhanh rieng
-> Push code va tao PR vao main
-> Chay Bug Fix Verification + Jira
-> PASS: Jira tu comment bang chung va chuyen Done
-> FAIL: Jira comment that bai, workflow do, khong chuyen Done
```

## 2. Dieu kien truoc khi chay

Truoc khi bam Run workflow, can dam bao:

1. Nhanh bug fix da push len GitHub.
2. Nen tao PR tu nhanh bug fix vao `main` truoc khi chay workflow.
   Khi co PR, comment Jira se co dong `Thay doi code: PR #...` de thay/co giao vien bam vao
   xem code da sua.
   Muon xem code backend da fix o dau thi bam link `Thay doi code`, sau do mo tab
   `Files changed` trong PR.
3. Bug subtask Jira da co san, vi du `SH-102`.
4. Task cha cua bug da co san, vi du `SH-37`.
5. File test dung de verify da co san:
   - Newman/Postman: file `.json` trong `Tool/postman/collections/...`
   - White-box/Jest: file `.test.js` trong `backend/<service>/test/`
6. GitHub repo da co cac secrets Jira:
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
   - `JIRA_PROJECT_KEY` neu cac workflow khac can tao bug

Khong paste Jira API token vao input workflow.

> Luu y: Workflow phai chay tren nhanh/PR dang chua code fix bug that su. Neu chay tren
> nhanh tool hoac mot nhanh khong co code backend fix bug, link `Thay doi code` se chi hien
> thay doi cua nhanh do, khong phai code backend cua bug.

## 3. Mo workflow tren GitHub

1. Vao repo GitHub.
2. Mo tab `Actions`.
3. Chon workflow `Bug Fix Verification + Jira`.
4. Bam `Run workflow`.
5. O muc branch, chon nhanh dang chua code fix bug.
6. Dien input theo cac muc ben duoi.
7. Bam nut chay workflow.

## 4. Cach dien input

### `bug_keys`

Danh sach bug subtask can xac minh, ngan cach bang dau phay hoac xuong dong.
Nen nhap bang dau phay de ten run tren GitHub Actions hien gon, vi du
`Verify bug fix: SH-102,SH-103,SH-146`.

Vi du:

```text
SH-102,SH-103,SH-146
```

### `parent_keys`

Danh sach task cha tuong ung voi `bug_keys`, theo dung thu tu.

Vi du:

```text
SH-37,SH-39,SH-140
```

Mapping se la:

```text
SH-102 -> SH-37
SH-103 -> SH-39
SH-146 -> SH-140
```

Neu dien sai thu tu, comment Jira se gan bug voi sai task cha.

### `postman_collections`

Danh sach collection Postman can chay bang Newman. Moi dong la mot path file `.json`.

Vi du:

```text
Tool/postman/collections/Notification Service/SH-37.json
Tool/postman/collections/Notification Service/SH-39.json
Tool/postman/collections/Notification Service/BVA/SH-140.json
```

Co the bo trong neu bug chi can verify bang Jest.

### `jest_service_dir`

Thu muc service can chay Jest.

Vi du:

```text
backend/notification_service
```

Co the bo trong neu bug chi can verify bang Newman/Postman.

### `jest_test_files`

Thuong de trong de chay toan bo test cua service.

Chi dien khi muon chay mot hoac nhieu file test cu the.

Vi du:

```text
test/SH-152.test.js
test/SH-154.test.js
```

### `start_docker`

Chon `true` neu co chay Newman/Postman vi API can backend dang chay.

Chon `false` neu chi chay Jest va khong can backend Docker.

### `docker_profile`

Chon theo service can verify:

- `notification`: dung cho Notification Service, nhanh hon vi chi start cac service can thiet.
- `full`: dung cho cac service khac hoac khi khong chac service nao can phu thuoc nao.

### `api_base_url`

Thuong de trong.

Neu `start_docker=true`, workflow se tu dung:

```text
http://localhost:8000
```

Chi dien khi muon verify tren mot moi truong API khac.

### `transition_bugs`

Chon `true` de workflow chuyen bug subtask sang Done khi test PASS.

Nen de `true` trong luong verify bug fix chinh thuc.

### `transition_parents`

Chon `true` neu muon chuyen ca task cha sang Done khi test PASS.

Chi chon `true` khi task cha thuc su da hoan tat va khong con viec nao khac.

### `dry_run`

Chon:

- `true`: chay thu, khong comment Jira, khong chuyen trang thai Jira.
- `false`: chay that, co comment Jira va co chuyen Done neu PASS.

Nen chay `dry_run=true` neu day la lan dau dung input moi. Khi da on thi chay lai voi
`dry_run=false`.

## 5. Vi du chuan cho Notification Service

Day la bo input da duoc dung de verify cac bug Notification Service.

`bug_keys`

```text
SH-102,SH-103,SH-146,SH-147,SH-148,SH-149,SH-156
```

`parent_keys`

```text
SH-37,SH-39,SH-140,SH-141,SH-142,SH-143,SH-144
```

`postman_collections`

```text
Tool/postman/collections/Notification Service/SH-37.json
Tool/postman/collections/Notification Service/SH-39.json
Tool/postman/collections/Notification Service/BVA/SH-140.json
Tool/postman/collections/Notification Service/BVA/SH-141.json
Tool/postman/collections/Notification Service/BVA/SH-142.json
Tool/postman/collections/Notification Service/BVA/SH-143.json
Tool/postman/collections/Notification Service/BVA/SH-144.json
```

`jest_service_dir`

```text
backend/notification_service
```

`jest_test_files`

```text

```

`start_docker`

```text
true
```

`docker_profile`

```text
notification
```

`transition_bugs`

```text
true
```

`transition_parents`

```text
true
```

`dry_run`

```text
false
```

Ket qua mong doi:

- GitHub Actions PASS.
- Newman PASS cho cac collection da nhap.
- Jest PASS cho service da nhap.
- Moi bug subtask co mot comment rieng.
- Moi task cha co mot comment rieng.
- Comment Jira co link:
  - `GitHub Run`
  - `Commit chay test`
  - `Thay doi code`
- Bug/task duoc chuyen hoac xac nhan Done.

## 6. Comment Jira se trong nhu the nao

Khi PASS, workflow tu dong comment len tung issue theo dang:

```text
[Bug Fix Verification] Xac minh sua loi tu dong thanh cong!

Issue nay da duoc chay lai bang bo test tu dong va ket qua PASS.

Thong tin chi tiet:
- Nhanh chay: feature/...
- Nguoi kich hoat: ...
- GitHub Run: #...
- Commit chay test: ...
- Thay doi code: PR #...

Pham vi xac minh:
- Bug subtask: SH-...
- Task cha: SH-...

Ket qua kiem thu:
- Newman API: ...
- Jest White-box: ...

Jira: Da chuyen hoac xac nhan Done cho issue nay.
```

Voi task cha, phan `Pham vi xac minh` se la:

```text
- Task cha: SH-...
- Bug da xac minh: SH-...
```

Workflow se tu xoa cac comment cu co nhan `Bug Fix Verification` tren cung issue truoc khi
post comment moi. No khong xoa comment cua cac workflow cu nhu `[API Automation]`.

## 7. Cach kiem tra sau khi chay

Sau khi workflow chay xong:

1. Mo GitHub Actions run.
   Ten run manual se co dang `Verify bug fix: SH-102,SH-103,...` de de truy vet
   tren danh sach Actions.
2. Kiem tra cac step sau phai xanh:
   - `Run Newman Verification` neu co Postman input
   - `Run Jest Verification` neu co Jest input
   - `Resolve Code Evidence Links`
   - `Update Jira With Verification Result`
3. Mo Jira bug subtask.
4. Kiem tra comment moi chi noi ve dung bug do.
5. Bam thu cac link trong comment:
   - `GitHub Run` de xem bo test da PASS.
   - `Commit chay test` de xem commit ma workflow verify.
   - `Thay doi code` de mo PR/diff code da sua. Day la link nen bam khi can xem
     backend da sua file nao; sau khi mo PR, vao tab `Files changed`.
6. Kiem tra trang thai Jira da sang Done neu da chon transition.

## 8. Cac loi thuong gap

### Workflow PASS test nhung Jira khong chuyen Done

Nguyen nhan thuong gap:

- Jira workflow khong co transition ten `Done`.
- Issue da o trang thai Done san.
- Account Jira trong secret khong co quyen transition.

Kiem tra log step `Update Jira With Verification Result`.

### Comment Jira thieu link PR

Nguyen nhan:

- Chua tao PR cho nhanh bug fix.
- PR khong merge vao `main`.
- Workflow chay tren branch khong dung.

Cach sua:

1. Tao PR tu nhanh bug fix vao `main`.
2. Chay lai workflow.

Neu khong co PR, workflow se fallback sang link compare/branch neu co the.

### Newman fail nhung Jest pass

Day van la FAIL chung.

Khong chuyen Jira sang Done. Can mo log Newman de xem request nao fail, sua code hoac sua
test neu test sai, roi chay workflow lai.

### Jest fail nhung Newman pass

Day van la FAIL chung.

Khong chuyen Jira sang Done. Can sua code/test white-box roi chay workflow lai.

### Mapping bug/task bi sai

Kiem tra lai thu tu `bug_keys` va `parent_keys`.

Hai danh sach nay map theo index, khong map theo ten file.

Vi du sai:

```text
bug_keys:    SH-102,SH-103
parent_keys: SH-39,SH-37
```

Ket qua se thanh:

```text
SH-102 -> SH-39
SH-103 -> SH-37
```

## 9. Quy tac cho nhom

1. Khong sua tay comment Jira ma workflow da tao, tru khi bat buoc phai dinh chinh.
2. Neu chay sai input, chay lai workflow dung input. Workflow se tu don comment
   `Bug Fix Verification` cu tren cac issue duoc nhap.
3. Moi lan verify bug fix nen co PR de nguoi cham co the xem code da sua.
4. Khong dong bug Jira neu workflow verify con FAIL.
5. Khong dua API token/Jira token vao commit, comment, input workflow hoac anh chup man hinh.
6. Neu chi muon thu tool, bat `dry_run=true`.
7. Khi chay that de dong bug/task, bat `dry_run=false`.

## 10. File lien quan

- Workflow: `.github/workflows/bugfix-verification.yml`
- Script Jira: `Tool/postman/bugfix_verification_jira.py`
- Postman collections: `Tool/postman/collections/`
- Jest tests: `backend/<service>/test/`
