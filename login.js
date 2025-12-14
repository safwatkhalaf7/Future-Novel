const loginForm = document.getElementById('user-login-form');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.toLowerCase().trim();
    const password = document.getElementById('password').value;

    const user = db.userLogin(username, password);

    if (user) {
        // Save session
        sessionStorage.setItem('fv_current_user', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    } else {
        alert('بيانات الدخول غير صحيحة');
    }
});
