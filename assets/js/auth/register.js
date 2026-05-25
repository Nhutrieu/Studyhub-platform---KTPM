document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const msg = document.getElementById('message');
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

    function showMessage(type, text) {
        msg.className = 'message';
        msg.classList.add(type === 'success' ? 'success' : 'error');
        msg.innerText = text;

        // ✅ Mỗi lần có thông báo (lỗi hoặc thành công) đều cuộn lên đầu
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // =============== LẤY DỮ LIỆU ===============
    const fullName = (formData.get('full_name') || '').trim();
    const username = (formData.get('username') || '').trim();
    const email    = (formData.get('email') || '').trim();
    const phone    = (formData.get('phone') || '').trim();   // tùy chọn
    const password = formData.get('password') || '';
    const confirm  = formData.get('confirm_password') || '';

    // reset lỗi input
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    let hasError = false;

    // =============== VALIDATE CLIENT ===============
    if (!fullName) {
        const input = form.querySelector('[name="full_name"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Vui lòng nhập họ và tên.');
        hasError = true;

    } else if (!username) {
        const input = form.querySelector('[name="username"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Vui lòng nhập tên đăng nhập.');
        hasError = true;

    } else if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        const input = form.querySelector('[name="email"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Vui lòng nhập email hợp lệ.');
        hasError = true;

    // ✅ Số điện thoại: chỉ check khi có nhập, để trống thì thôi
    } else if (phone && !/^[0-9]{9,12}$/.test(phone)) {
        const input = form.querySelector('[name="phone"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Vui lòng nhập số điện thoại hợp lệ (9–12 số) hoặc để trống.');
        hasError = true;

    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        const input = form.querySelector('[name="password"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ thường, chữ hoa và số.');
        hasError = true;

    } else if (password !== confirm) {
        const input = form.querySelector('[name="confirm_password"]');
        if (input) input.classList.add('is-invalid');
        showMessage('error', 'Mật khẩu xác nhận không khớp.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // =============== LOADING STATE ===============
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerText;
        submitBtn.innerText = 'Đang xử lý...';
    }

    try {
        let res = await fetch('/HeThongChamSocCaKoi/backend/api/auth/register.php', {
            method: 'POST',
            body: formData
        });

        let text = await res.text();

        if (res.ok) {
            try {
                let data = JSON.parse(text);
                if (data.success) {
                    showMessage('success', data.message || "Đăng ký thành công!");
                    form.reset();
                    updatePasswordStrength(''); // reset strength UI
                } else {
                    showMessage('error', data.message || "Đăng ký thất bại!");
                }
            } catch (err) {
                // Trường hợp backend trả về plain text
                showMessage('success', text || "Đăng ký thành công!");
                form.reset();
                updatePasswordStrength('');
            }
        } else {
            showMessage('error', text || "Đăng ký thất bại!");
        }
    } catch (err) {
        showMessage('error', "Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = submitBtn.dataset.originalText || 'Đăng ký';
        }
    }
});

// =============== PASSWORD STRENGTH ===============
const pwdInput = document.getElementById('regPassword');
if (pwdInput) {
    pwdInput.addEventListener('input', function () {
        updatePasswordStrength(pwdInput.value);
    });
}

function updatePasswordStrength(pwd) {
    const bar = document.getElementById('passwordStrengthFill');
    const text = document.getElementById('passwordStrengthText');
    if (!bar || !text) return;

    if (!pwd) {
        bar.style.width = '0%';
        bar.style.background = '#ff6b6b';
        text.textContent = 'Mật khẩu chưa nhập';
        return;
    }

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    let width = (score / 5) * 100;
    bar.style.width = width + '%';

    if (score <= 2) {
        bar.style.background = '#ff6b6b';
        text.textContent = 'Mật khẩu yếu';
    } else if (score === 3 || score === 4) {
        bar.style.background = '#f6c453';
        text.textContent = 'Mật khẩu khá';
    } else {
        bar.style.background = '#4cffb3';
        text.textContent = 'Mật khẩu mạnh';
    }
}

// =============== TOGGLE SHOW/HIDE PASSWORD ===============
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = 'Ẩn';
        } else {
            input.type = 'password';
            btn.textContent = 'Hiện';
        }
    });
});
