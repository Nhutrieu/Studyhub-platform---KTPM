# StudyHub – Auth Service: Tổng hợp Kế hoạch Kiểm thử

> **Tài liệu này ghi lại toàn bộ quá trình phân tích, lập kế hoạch và tổ chức file kiểm thử**
> dựa trên Postman Collection `StudyHub_Auth_Service_postman_collection.json`
> Ngày thực hiện: 01/07/2026

---

## MỤC LỤC

1. [Nguồn đầu vào](#1-nguồn-đầu-vào)
2. [Phân tích Postman Collection](#2-phân-tích-postman-collection)
3. [Epic & Task Breakdown (Jira)](#3-epic--task-breakdown-jira)
4. [Tách file JSON theo từng Task](#4-tách-file-json-theo-từng-task)
5. [Bảng tổng hợp mapping](#5-bảng-tổng-hợp-mapping)

---

## 1. Nguồn đầu vào

| Mục | Thông tin |
|---|---|
| File gốc | `StudyHub_Auth_Service_postman_collection.json` |
| Tổng số request | 69 |
| Số folder gốc | 4 |
| Schema | Postman Collection v2.1.0 |

### Cấu trúc folder trong collection gốc

| Folder | Số request |
|---|---|
| 🔐 Auth (public + self) | 30 |
| 🔑 OAuth | 5 |
| 📧 Self Profile & Emails | 10 |
| 👑 Admin (role=admin required) | 24 |

---

## 2. Phân tích Postman Collection

### 🔐 Folder: Auth (public + self) — 30 request

| # | Request | Loại |
|---|---|---|
| 1 | ✅ Đăng ký tài khoản mới | Positive |
| 2 | ❌ Đăng ký - email đã tồn tại | Negative |
| 3 | ❌ Đăng ký - user_name đã tồn tại | Negative |
| 4 | ❌ Đăng ký - thiếu password | Negative |
| 5 | ❌ Đăng ký - email sai format | Negative |
| 6 | ✅ Xác minh email bằng token | Positive |
| 7 | ❌ Xác minh email - token sai/không tồn tại | Negative |
| 8 | ❌ Xác minh email - token đã dùng rồi | Negative |
| 9 | ❌ Xác minh email - thiếu token | Negative |
| 10 | ✅ Đăng nhập bằng email | Positive |
| 11 | ✅ Đăng nhập bằng user_name | Positive |
| 12 | ❌ Đăng nhập - sai mật khẩu | Negative |
| 13 | ❌ Đăng nhập - email không tồn tại | Negative |
| 14 | ❌ Đăng nhập - chưa verify email | Negative |
| 15 | ❌ Đăng nhập - tài khoản đã bị khóa/block | Negative |
| 16 | ✅ Refresh access token | Positive |
| 17 | ❌ Refresh - token không hợp lệ | Negative |
| 18 | ❌ Refresh - token đã bị revoke (sau logout) | Negative |
| 19 | ✅ Quên mật khẩu | Positive |
| 20 | ❌ Quên mật khẩu - email không tồn tại | Negative |
| 21 | ✅ Đặt lại mật khẩu bằng token | Positive |
| 22 | ❌ Đặt lại mật khẩu - token sai/hết hạn | Negative |
| 23 | ❌ Đặt lại mật khẩu - token đã dùng rồi | Negative |
| 24 | ✅ Đổi mật khẩu khi đã đăng nhập | Positive |
| 25 | ❌ Đổi mật khẩu - sai mật khẩu cũ | Negative |
| 26 | ❌ Đổi mật khẩu - không có token | Negative |
| 27 | ✅ Lấy thông tin user đang đăng nhập (me) | Positive |
| 28 | ❌ Lấy thông tin user - không có token | Negative |
| 29 | ✅ Đăng xuất (revoke refresh token) | Positive |
| 30 | ❌ Đăng xuất - không có access token | Negative |

### 🔑 Folder: OAuth — 5 request

| # | Request | Loại |
|---|---|---|
| 1 | ✅ Đăng nhập/đăng ký qua OAuth (Google) | Positive |
| 2 | ✅ OAuth login lại với cùng provider_user (không tạo user mới) | Positive |
| 3 | ❌ OAuth login - thiếu provider_name | Negative |
| 4 | ❌ OAuth login - thiếu provider_user | Negative |
| 5 | ❌ OAuth login - email OAuth trùng với tài khoản thường | Negative |

### 📧 Folder: Self Profile & Emails — 10 request

| # | Request | Loại |
|---|---|---|
| 1 | ✅ Lấy profile cơ bản của tôi (auth-service) | Positive |
| 2 | ❌ Lấy profile - không có token | Negative |
| 3 | ✅ Cập nhật profile cơ bản (display_name...) | Positive |
| 4 | ❌ Cập nhật profile - không có token | Negative |
| 5 | ✅ Lấy danh sách email của tôi | Positive |
| 6 | ✅ Thêm email phụ | Positive |
| 7 | ❌ Thêm email phụ - email đã tồn tại | Negative |
| 8 | ❌ Thêm email phụ - sai format | Negative |
| 9 | ✅ Đặt email phụ làm email chính | Positive |
| 10 | ❌ Đặt email chính - emailId không tồn tại | Negative |

### 👑 Folder: Admin — 24 request

| # | Request | Loại |
|---|---|---|
| 1 | ✅ Admin xem danh sách tất cả user | Positive |
| 2 | ❌ User thường xem danh sách user - Bị từ chối | Negative |
| 3 | ❌ Không token - Bị từ chối | Negative |
| 4 | ✅ Admin xem thống kê tài khoản | Positive |
| 5 | ✅ Admin khóa tài khoản user (lock) | Positive |
| 6 | ❌ Admin khóa - user_id không tồn tại | Negative |
| 7 | ❌ User thường tự khóa tài khoản khác - Bị từ chối | Negative |
| 8 | ✅ Admin mở khóa tài khoản (unlock) | Positive |
| 9 | ✅ Admin kiểm tra user có bị block (is_blocked) | Positive |
| 10 | ⚠️ BUG: POST /users/:id/block định nghĩa 2 lần (permanent đè temporary) | Bug |
| 11 | ⚠️ BUG: gửi blocked_until không có tác dụng do bug route trùng path | Bug |
| 12 | ❌ Admin block user - thiếu reason | Negative |
| 13 | ✅ Admin mở block user (unblock) | Positive |
| 14 | ✅ Admin xóa mềm user | Positive |
| 15 | ❌ Admin xóa mềm user - user_id không tồn tại | Negative |
| 16 | ✅ Admin khôi phục user đã xóa (restore) | Positive |
| 17 | ❌ Admin khôi phục user chưa từng bị xóa | Negative |
| 18 | ✅ Admin đổi role user | Positive |
| 19 | ❌ Admin đổi role - role_name không hợp lệ | Negative |
| 20 | ❌ User thường tự đổi role thành admin - Bị từ chối | Negative |
| 21 | ✅ Admin xem toàn bộ audit logs | Positive |
| 22 | ✅ Admin xem audit logs theo actor | Positive |
| 23 | ✅ Admin xem audit logs theo target | Positive |
| 24 | ❌ User thường xem audit logs - Bị từ chối | Negative |

> ⚠️ **Bug đã phát hiện trong collection:** Route `POST /admin/users/:id/block` bị định nghĩa 2 lần trên cùng path trong Express router (một controller cho block vĩnh viễn, một cho block tạm thời). Express chỉ thực thi route đầu tiên được khai báo, do đó `blocked_until` bị bỏ qua hoàn toàn dù request vẫn trả về 200 OK. Cần tách thành 2 endpoint riêng, ví dụ: `/block` và `/block/temporary`.

---

## 3. Epic & Task Breakdown (Jira)

### EPIC

**Epic name:** Kiểm thử Auth Service – StudyHub

**Mô tả Epic:**
Thực hiện kiểm thử toàn diện (functional testing) cho Auth Service của hệ thống StudyHub, bao gồm: đăng ký & xác minh email, đăng nhập/đăng xuất, quản lý token (refresh/revoke), quên/đặt lại/đổi mật khẩu, đăng nhập qua OAuth (Google), quản lý hồ sơ & email cá nhân, và các chức năng quản trị (Admin) gồm quản lý người dùng, khóa/block tài khoản, xóa mềm/khôi phục, phân quyền (role) và audit log. Mục tiêu là đảm bảo các luồng nghiệp vụ hoạt động đúng, dữ liệu được lưu/kiểm tra chính xác, và các cơ chế phân quyền (401/403) hoạt động đúng theo thiết kế.

---

### Task SH-78 — Functional Testing for User Registration

**Mô tả:**
Thực hiện kiểm thử chức năng đăng ký tài khoản người dùng.

**Phạm vi Kiểm thử:**
- Đăng ký hợp lệ
- Email đã tồn tại
- user_name đã tồn tại
- Thiếu dữ liệu bắt buộc (thiếu password)
- Sai định dạng email
- Mật khẩu không hợp lệ
- Vai trò người dùng mặc định
- Kiểm tra dữ liệu được lưu vào hệ thống (user, verificationToken trả về sau khi đăng ký)

**Kết quả Kỳ vọng:**
Người dùng có thể đăng ký thành công với dữ liệu hợp lệ và hệ thống từ chối dữ liệu không hợp lệ (email/user_name trùng, thiếu trường, sai định dạng).

**File Postman:** `SH-78.json` (5 request)

---

### Task SH-79 — Functional Testing for Email Verification

**Mô tả:**
Thực hiện kiểm thử chức năng xác minh email sau khi đăng ký tài khoản.

**Phạm vi Kiểm thử:**
- Xác minh email thành công với token hợp lệ
- Xác minh email với token sai/không tồn tại
- Xác minh email với token đã được sử dụng (dùng lại)
- Xác minh email thiếu token

**Kết quả Kỳ vọng:**
Email được xác minh thành công khi token hợp lệ và chưa sử dụng; hệ thống từ chối (400) với token không hợp lệ, đã dùng hoặc thiếu token.

**File Postman:** `SH-79.json` (4 request)

---

### Task SH-80 — Functional Testing for Login

**Mô tả:**
Thực hiện kiểm thử chức năng đăng nhập bằng email hoặc user_name.

**Phạm vi Kiểm thử:**
- Đăng nhập thành công bằng email
- Đăng nhập thành công bằng user_name
- Đăng nhập sai mật khẩu
- Đăng nhập với email không tồn tại
- Đăng nhập khi tài khoản chưa verify email
- Đăng nhập khi tài khoản đã bị khóa/block
- Kiểm tra access_token & refresh_token trả về đúng cấu trúc

**Kết quả Kỳ vọng:**
Đăng nhập thành công trả về access_token & refresh_token hợp lệ; các trường hợp sai bị từ chối với mã lỗi 401.

**File Postman:** `SH-80.json` (6 request)

---

### Task SH-81 — Functional Testing for Refresh Token

**Mô tả:**
Thực hiện kiểm thử chức năng làm mới access token bằng refresh token.

**Phạm vi Kiểm thử:**
- Refresh token hợp lệ trả về access token mới
- Refresh token không hợp lệ (sai định dạng/không tồn tại)
- Refresh token đã bị revoke (sau khi logout)

**Kết quả Kỳ vọng:**
Refresh token hợp lệ cấp access token mới thành công; token không hợp lệ hoặc đã bị revoke bị từ chối (401).

**File Postman:** `SH-81.json` (3 request)

---

### Task SH-82 — Functional Testing for Logout

**Mô tả:**
Thực hiện kiểm thử chức năng đăng xuất, đảm bảo refresh token bị thu hồi (revoke) đúng cách.

**Phạm vi Kiểm thử:**
- Đăng xuất thành công khi có access token hợp lệ
- Đăng xuất khi không có access token
- Kiểm tra refresh token sau khi revoke không thể dùng lại để refresh (liên kết với SH-81)

**Kết quả Kỳ vọng:**
Đăng xuất thành công thu hồi refresh token; request không có access token bị từ chối (401); refresh token đã revoke không còn sử dụng được.

**File Postman:** `SH-82.json` (2 request)

---

### Task SH-83 — Functional Testing for Forgot Password

**Mô tả:**
Thực hiện kiểm thử chức năng yêu cầu đặt lại mật khẩu (quên mật khẩu).

**Phạm vi Kiểm thử:**
- Gửi yêu cầu quên mật khẩu với email hợp lệ, tồn tại trong hệ thống
- Gửi yêu cầu quên mật khẩu với email không tồn tại
- Kiểm tra token reset được sinh ra đúng (dùng cho SH-84)

**Kết quả Kỳ vọng:**
Hệ thống sinh token reset khi email tồn tại; trả về lỗi 400 khi email không tồn tại.

**File Postman:** `SH-83.json` (2 request)

---

### Task SH-84 — Functional Testing for Reset Password

**Mô tả:**
Thực hiện kiểm thử chức năng đặt lại mật khẩu bằng token nhận được từ chức năng quên mật khẩu.

**Phạm vi Kiểm thử:**
- Đặt lại mật khẩu thành công với token hợp lệ
- Đặt lại mật khẩu với token sai/hết hạn
- Đặt lại mật khẩu với token đã được sử dụng trước đó
- Đăng nhập lại bằng mật khẩu mới sau khi reset thành công (kiểm tra dữ liệu được lưu đúng)

**Kết quả Kỳ vọng:**
Mật khẩu được đặt lại thành công với token hợp lệ và chưa sử dụng; các trường hợp token sai/hết hạn/đã dùng bị từ chối (400).

**File Postman:** `SH-84.json` (3 request)

---

### Task SH-85 — Functional Testing for Change Password

**Mô tả:**
Thực hiện kiểm thử chức năng đổi mật khẩu khi người dùng đã đăng nhập.

**Phạm vi Kiểm thử:**
- Đổi mật khẩu thành công với mật khẩu cũ đúng
- Đổi mật khẩu với mật khẩu cũ sai
- Đổi mật khẩu khi không có access token
- Đăng nhập lại bằng mật khẩu mới sau khi đổi thành công

**Kết quả Kỳ vọng:**
Đổi mật khẩu thành công khi mật khẩu cũ đúng; từ chối khi mật khẩu cũ sai (400) hoặc thiếu token (401).

**File Postman:** `SH-85.json` (3 request)

---

### Task SH-86 — Functional Testing for Get Current User Info (Me)

**Mô tả:**
Thực hiện kiểm thử API lấy thông tin của người dùng đang đăng nhập.

**Phạm vi Kiểm thử:**
- Lấy thông tin user thành công khi có access token hợp lệ
- Kiểm tra response trả về có field `user`
- Lấy thông tin user khi không có access token

**Kết quả Kỳ vọng:**
Trả về đúng thông tin người dùng khi có token hợp lệ; từ chối (401) khi không có token.

**File Postman:** `SH-86.json` (2 request)

---

### Task SH-87 — Functional Testing for OAuth Login (Google)

**Mô tả:**
Thực hiện kiểm thử chức năng đăng nhập/đăng ký qua OAuth (Google).

**Phạm vi Kiểm thử:**
- Đăng nhập/đăng ký lần đầu qua OAuth Google thành công, trả về accessToken & refreshToken
- Đăng nhập lại với cùng provider_user → không tạo user mới
- OAuth login thiếu `provider_name`
- OAuth login thiếu `provider_user`
- OAuth login với email trùng với tài khoản đăng ký thường (email đã tồn tại)

**Kết quả Kỳ vọng:**
OAuth login thành công trả về token hợp lệ; không tạo user trùng khi login lại với cùng provider_user; các trường hợp thiếu dữ liệu hoặc trùng email với tài khoản thường bị từ chối (400).

**File Postman:** `SH-87.json` (5 request)

---

### Task SH-88 — Functional Testing for User Profile Management (Self)

**Mô tả:**
Thực hiện kiểm thử chức năng xem và cập nhật hồ sơ cá nhân cơ bản (auth-service, khác user-service).

**Phạm vi Kiểm thử:**
- Lấy profile cơ bản của bản thân khi có access token
- Lấy profile khi không có access token
- Cập nhật profile (display_name...) thành công
- Cập nhật profile khi không có access token

**Kết quả Kỳ vọng:**
Người dùng xem/cập nhật được hồ sơ của chính mình khi đã đăng nhập; bị từ chối (401) khi không có token.

**File Postman:** `SH-88.json` (4 request)

---

### Task SH-89 — Functional Testing for Email Management (Secondary & Primary Email)

**Mô tả:**
Thực hiện kiểm thử chức năng quản lý email cá nhân: xem danh sách, thêm email phụ, đặt email chính.

**Phạm vi Kiểm thử:**
- Lấy danh sách email của bản thân
- Thêm email phụ thành công
- Thêm email phụ với email đã tồn tại
- Thêm email phụ với email sai định dạng
- Đặt email phụ làm email chính thành công
- Đặt email chính với `emailId` không tồn tại

**Kết quả Kỳ vọng:**
Quản lý danh sách email hoạt động đúng; thêm/đặt email chính thành công với dữ liệu hợp lệ; từ chối (400) với dữ liệu trùng/sai định dạng/không tồn tại.

**File Postman:** `SH-89.json` (6 request)

---

### Task SH-90 — Functional Testing for Admin: User List & Account Statistics

**Mô tả:**
Thực hiện kiểm thử chức năng admin xem danh sách toàn bộ người dùng và thống kê số lượng tài khoản.

**Phạm vi Kiểm thử:**
- Admin xem danh sách tất cả user thành công
- User thường xem danh sách user → bị từ chối (403)
- Không có token → bị từ chối (401)
- Admin xem thống kê số lượng tài khoản (`/admin/count/accounts`)

**Kết quả Kỳ vọng:**
Chỉ admin truy cập được danh sách user & thống kê tài khoản; user thường/không có token bị từ chối với mã lỗi tương ứng (403/401).

**File Postman:** `SH-90.json` (4 request)

---

### Task SH-91 — Functional Testing for Admin: Lock / Unlock User Account

**Mô tả:**
Thực hiện kiểm thử chức năng admin khóa và mở khóa tài khoản người dùng.

**Phạm vi Kiểm thử:**
- Admin khóa tài khoản user thành công (`/lock`)
- Khóa với `user_id` không tồn tại
- User thường tự khóa tài khoản khác → bị từ chối (403)
- Admin mở khóa tài khoản thành công (`/unlock`)
- Admin kiểm tra trạng thái block của user (`/is_blocked`)

**Kết quả Kỳ vọng:**
Chỉ admin thực hiện được lock/unlock; `user_id` không hợp lệ bị từ chối (400); user thường không có quyền thực hiện (403).

**File Postman:** `SH-91.json` (5 request)

---

### Task SH-92 — Functional Testing for Admin: Block / Unblock User Account _(kèm xác minh bug route trùng)_

**Mô tả:**
Thực hiện kiểm thử chức năng admin block tài khoản và unblock tài khoản người dùng. Collection ghi nhận một **bug thật** liên quan đến route `POST /admin/users/:id/block` bị định nghĩa 2 lần (controller block vĩnh viễn và block tạm thời dùng cùng path), cần test xác nhận lại.

**Phạm vi Kiểm thử:**
- Admin block tài khoản user (gửi `reason`) → kỳ vọng 200
- Admin gửi kèm `blocked_until` (mong muốn block tạm thời) → **XÁC MINH BUG**: do route bị định nghĩa 2 lần trên cùng path, Express chỉ chạy route đầu tiên (block vĩnh viễn), `blocked_until` bị bỏ qua hoàn toàn dù request trả về 200
- Admin block thiếu `reason` → kỳ vọng 400
- Admin unblock tài khoản thành công

**Kết quả Kỳ vọng:**
Block/unblock vĩnh viễn hoạt động đúng; **ghi nhận bug**: block tạm thời (`blocked_until`) không có hiệu lực thực tế do trùng route — cần báo cáo team Dev để tách thành 2 endpoint riêng (ví dụ `/block` và `/block/temporary`); thiếu `reason` bị từ chối (400).

**File Postman:** `SH-92.json` (4 request)

---

### Task SH-93 — Functional Testing for Admin: Soft Delete & Restore User

**Mô tả:**
Thực hiện kiểm thử chức năng admin xóa mềm và khôi phục tài khoản người dùng.

**Phạm vi Kiểm thử:**
- Admin xóa mềm user thành công
- Xóa mềm với `user_id` không tồn tại
- Admin khôi phục user đã xóa thành công (`/restore`)
- Khôi phục user chưa từng bị xóa

**Kết quả Kỳ vọng:**
Xóa mềm & khôi phục hoạt động đúng với user hợp lệ; các trường hợp `user_id` không tồn tại hoặc chưa từng bị xóa bị từ chối (400).

**File Postman:** `SH-93.json` (4 request)

---

### Task SH-94 — Functional Testing for Admin: Role Management

**Mô tả:**
Thực hiện kiểm thử chức năng admin thay đổi vai trò (role) của người dùng.

**Phạm vi Kiểm thử:**
- Admin đổi role user thành công (ví dụ: `moderator`)
- Đổi role với `role_name` không hợp lệ
- User thường tự đổi role thành `admin` → bị từ chối (403)

**Kết quả Kỳ vọng:**
Chỉ admin đổi được role hợp lệ cho user khác; role không hợp lệ hoặc user thường tự nâng quyền đều bị từ chối (400/403).

**File Postman:** `SH-94.json` (3 request)

---

### Task SH-95 — Functional Testing for Admin: Audit Logs

**Mô tả:**
Thực hiện kiểm thử chức năng admin xem nhật ký audit log của hệ thống.

**Phạm vi Kiểm thử:**
- Admin xem toàn bộ audit logs
- Admin xem audit logs theo actor (người thực hiện hành động)
- Admin xem audit logs theo target (đối tượng bị tác động)
- User thường xem audit logs → bị từ chối (403)

**Kết quả Kỳ vọng:**
Chỉ admin truy cập được audit logs (toàn bộ/theo actor/theo target); user thường bị từ chối truy cập (403).

**File Postman:** `SH-95.json` (4 request)

---

## 4. Tách file JSON theo từng Task

Từ collection gốc (69 request), đã tách thành **18 file Postman collection độc lập**, mỗi file:
- Có đầy đủ `info`, `item`, `variable` → import trực tiếp vào Postman được ngay
- Được đặt tên theo mã Jira tương ứng

---

## 5. Bảng tổng hợp mapping

| Jira Task | Tên Task | File JSON | Số request | Folder gốc |
|---|---|---|---|---|
| SH-78 | User Registration | `SH-78.json` | 5 | Auth |
| SH-79 | Email Verification | `SH-79.json` | 4 | Auth |
| SH-80 | Login | `SH-80.json` | 6 | Auth |
| SH-81 | Refresh Token | `SH-81.json` | 3 | Auth |
| SH-82 | Logout | `SH-82.json` | 2 | Auth |
| SH-83 | Forgot Password | `SH-83.json` | 2 | Auth |
| SH-84 | Reset Password | `SH-84.json` | 3 | Auth |
| SH-85 | Change Password | `SH-85.json` | 3 | Auth |
| SH-86 | Get Current User Info (Me) | `SH-86.json` | 2 | Auth |
| SH-87 | OAuth Login (Google) | `SH-87.json` | 5 | OAuth |
| SH-88 | User Profile Management (Self) | `SH-88.json` | 4 | Self Profile & Emails |
| SH-89 | Email Management | `SH-89.json` | 6 | Self Profile & Emails |
| SH-90 | Admin – User List & Statistics | `SH-90.json` | 4 | Admin |
| SH-91 | Admin – Lock / Unlock | `SH-91.json` | 5 | Admin |
| SH-92 | Admin – Block / Unblock _(+ bug)_ | `SH-92.json` | 4 | Admin |
| SH-93 | Admin – Soft Delete & Restore | `SH-93.json` | 4 | Admin |
| SH-94 | Admin – Role Management | `SH-94.json` | 3 | Admin |
| SH-95 | Admin – Audit Logs | `SH-95.json` | 4 | Admin |
| **Tổng** | | **18 file** | **69 request** | |

---

## Lưu ý khi triển khai

- Import từng file `.json` vào Postman bằng **File → Import → chọn file**, mỗi file là 1 collection riêng tương ứng 1 Jira Task.
- Task SH-92 nên gắn thêm label `bug` trong Jira, hoặc tạo thêm 1 Bug ticket riêng cho Dev theo dõi và fix route trùng `POST /admin/users/:id/block`.
- Các task có chuỗi phụ thuộc cần chú ý thứ tự chạy: SH-78 → SH-79 → SH-80 → SH-81 → SH-82; SH-83 → SH-84.
- Biến môi trường (variables) đã được giữ nguyên trong mỗi file tách, nhưng nên tạo 1 Postman Environment riêng để quản lý `baseUrl`, `accessToken`, `refreshToken` dùng chung giữa các collection.
