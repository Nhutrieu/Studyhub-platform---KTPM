# StudyHub CodeceptJS E2E

Bo test mau gom cac workflow:

- Auth validation: login sai mat khau, register sai du lieu, forgot password sai email
- Protected routes: guest bi day ve login, user thuong bi chan admin route
- User navigation: mo group, follow, message
- Profile: dang nhap va mo ho so user seed
- Admin: mo dashboard va trang quan ly users

Tai khoan mac dinh:

- Email: `user1@example.com`
- Password: `11111111`
- User ID: `11111111-2222-4222-8222-111111111112`
- Admin email: `admin@example.com`
- Admin password: `11111111`

Chay frontend va backend truoc, sau do chay:

```bash
cd codeceptjs
npm test
```

Chay tung nhom:

```bash
npm run test:auth
npm run test:routes
npm run test:user
npm run test:profile
npm run test:admin
```

Neu frontend khong chay o `http://localhost:5173`, truyen URL:

```bash
STUDYHUB_APP_URL=http://localhost:3000 npm test
```

Co the doi tai khoan bang bien moi truong:

```bash
STUDYHUB_E2E_EMAIL=user2@example.com STUDYHUB_E2E_PASSWORD=11111111 npm test
```
