# Hướng dẫn Cộng tác Team & Quy trình Git Flow (Newman + Postman)

Tài liệu này hướng dẫn cách phân chia công việc, quy trình làm việc trên Git và các quy tắc để tránh xung đột (Merge Conflict) khi làm việc nhóm 5 người với các file Postman Collection của dự án StudyHub.

---

## 1. Phân chia kịch bản kiểm thử theo Service (5 Người - 6 JSON Files)

Để mỗi thành viên quản lý trọn vẹn và độc lập các file kịch bản test tương ứng với service được giao mà không bao giờ bị đè code lên nhau trên Git, các file JSON lẻ đã được tách biệt theo mô-đun dịch vụ (Service) và phân chia nhiệm vụ chi tiết như sau:

*   **Thành viên 1: Auth & User Profile Service (25 requests)**
    *   *Tệp tin JSON lẻ phụ trách:* 
        1. `StudyHub Auth Service.postman_collection.json` (Thư mục `01-Auth Service` & `03-Self Profile` & `04-Admin Auth`)
        2. `StudyHub Profile & Follow Service.postman_collection.json` (Thư mục `02-Profile & Follow Service`)
    *   *Nội dung chi tiết:*
        *   **Authentication & Admin Auth (15 API):** Đăng ký, Xác minh email, Đăng nhập thường/admin, Refresh token, Lấy thông tin user hiện tại, Đổi/quên/reset mật khẩu, Lấy profile/Cập nhật profile, Danh sách email, Admin đếm tài khoản, Admin danh sách user, Admin cập nhật role.
        *   **Profile & Follow (10 API):** Tìm kiếm user, Lấy thông tin công khai/chi tiết, Cập nhật hồ sơ, Cập nhật quyền riêng tư, Thêm social link/sở thích, Follow người dùng, Kiểm tra follow, Đếm follower/following.
*   **Thành viên 2: Group Service (10 requests)**
    *   *Tệp tin JSON lẻ phụ trách:* `StudyHub Group Service.postman_collection.json` (Thư mục `03-Group Service` & `08-Members`)
    *   *Nội dung chi tiết:*
        *   **Group & Members:** Tạo nhóm học tập, Tìm kiếm nhóm, Chi tiết nhóm, Danh sách nhóm sở hữu, Tham gia nhóm, Kiểm tra request tham gia, Mời thành viên, Danh sách thành viên nhóm, Đổi role thành viên, Admin đếm nhóm.
*   **Thành viên 3: Document Service (13 requests)**
    *   *Tệp tin JSON lẻ phụ trách:* `StudyHub Document Service.postman_collection.json` (Thư mục `04-Document Service` & `10-Document Interactions`)
    *   *Nội dung chi tiết:*
        *   **Document & Interactions:** Public feed, Danh sách tags, Tìm kiếm tài liệu, Tạo tài liệu, Home feed, Tài liệu của tôi, Chi tiết tài liệu, Preview URL tài liệu, Cập nhật tài liệu, Kiểm tra bookmark, Toggle bookmark, Thêm bình luận, Download tài liệu.
*   **Thành viên 4: Chat Service (4 requests)**
    *   *Tệp tin JSON lẻ phụ trách:* `StudyHub Chat Service.postman_collection.json` (Thư mục `05-Chat Service`)
    *   *Nội dung chi tiết:*
        *   **Conversation & Message:** Danh sách cuộc trò chuyện, Tạo direct conversation, Gửi tin nhắn trực tiếp, Lấy messages trong conversation.
*   **Thành viên 5: Notification Service & Tích hợp CI/CD (4 requests)**
    *   *Tệp tin JSON lẻ phụ trách:* `StudyHub Notification Service.postman_collection.json` (Thư mục `06-Notification Service`)
    *   *Nội dung chi tiết:*
        *   **Notification:** Danh sách thông báo, Đếm thông báo chưa đọc, Gửi thông báo, Đánh dấu tất cả đã đọc.
        *   *Nhiệm vụ đặc biệt:* Bảo trì tệp script chạy local `run_tests.py` và GitHub Actions; chịu trách nhiệm merge code từ các file lẻ của các thành viên khác vào file Consolidated tổng hợp `StudyHub Platform Automation Test.postman_collection.json`.

---

## 2. Quy tắc tránh Xung đột (Merge Conflict) File Postman JSON

> [!CAUTION]
> File JSON của Postman cực kỳ dễ bị xung đột khi gộp nhánh Git do cấu trúc tự động sinh ID của Postman. Hãy tuân thủ nghiêm ngặt quy tắc sau:

1.  **Không tự ý sửa file tổng hợp (`StudyHub Platform Automation Test.postman_collection.json`) trên nhánh tính năng cá nhân.**
2.  Mỗi thành viên chỉ chỉnh sửa kịch bản test trên **file dịch vụ lẻ** mà mình phụ trách.
3.  **Quy trình đồng bộ file tổng hợp (Thực hiện bởi Thành viên 5):**
    *   Các thành viên hoàn thiện kịch bản ở file lẻ -> Commit và PR gộp vào nhánh `dev`.
    *   Thành viên 5 thực hiện kéo (Pull) nhánh `dev` chứa các file lẻ mới nhất về máy local.
    *   Thành viên 5 import các file lẻ này vào Postman để đồng bộ các request mới vào thư mục tương ứng trong file Consolidated tổng hợp.
    *   Thành viên 5 export lại file Consolidated tổng hợp và commit lên Git.

---

## 3. Quy trình Git Flow làm việc hàng ngày

Luồng kiểm thử tự động tích hợp với Git và Jira theo mô hình sau:

```text
  [Nhánh dev] ──> [Nhánh feature/SH-xxx] ──(Code & Chạy Test Local)──> [Tạo PR về dev] ──(GitHub Actions Auto Test)──> [Gộp vào dev] ──> [Merge main]
```

### Bước 1: Tạo nhánh tính năng từ Jira Ticket
Mỗi khi nhận một Task/Bug từ Jira (Ví dụ: Mã Ticket là `SH-123`), hãy tạo nhánh từ `dev`:
```bash
git checkout dev
git pull origin dev
git checkout -b feature/SH-123-group-approvals
```

### Bước 2: Chạy kiểm thử ở local trước khi commit
Trước khi commit, hãy đảm bảo kịch bản test của bạn không bị lỗi bằng cách chạy script Python tại thư mục `Tool/`:
```bash
python run_tests.py
```
*(Nếu phát hiện lỗi, hãy sửa trực tiếp trong Postman rồi export đè lên file collection lẻ tương ứng trước khi commit).*

### Bước 3: Commit và đặt tên theo chuẩn Jira Key
Commit tệp tin Postman lẻ của bạn, đặt tên commit bắt đầu bằng mã Jira Ticket:
```bash
git add Tool/postman/collections/StudyHub Group Service.postman_collection.json
git commit -m "SH-123: Add automated testcases for group document approvals"
git push origin feature/SH-123-group-approvals
```

### Bước 4: Tạo Pull Request (PR) & Tự động hóa CI/CD
*   Tạo PR từ nhánh feature của bạn vào nhánh `dev` trên GitHub.
*   Hệ thống CI/CD (GitHub Actions) sẽ tự động trigger Newman chạy kịch bản kiểm thử API.
*   **Nếu CI báo FAIL:** PR sẽ bị khóa (không cho gộp) và một **Sub-task Bug** sẽ tự động được tạo và gán cho bạn trên Jira để bạn sửa.
*   **Nếu CI báo PASS:** Sau khi được ít nhất 1 thành viên khác trong team Review và Approve, code sẽ được gộp vào nhánh `dev`.

### Bước 5: Release lên nhánh `main`
Nhánh `dev` sau khi tích hợp đầy đủ tính năng và hoạt động ổn định sẽ được Merge vào nhánh `main` để triển khai chính thức lên môi trường Production.
