// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('admin-login-form');
const logoutBtn = document.getElementById('logout-btn');
const addUserForm = document.getElementById('add-user-form');
const usersTableBody = document.querySelector('#users-table tbody');
const submitBtn = addUserForm.querySelector('button[type="submit"]');

// State
let isAdminLoggedIn = false; // In a real app, check session/token
let editingUserId = null; // Track which user is being edited

// Check if already logged in (simple session check via sessionStorage for this demo, or just re-login)
// For this demo, let's require login every refresh to be safe/simple, 
// or check a flag. Let's start with requiring login.

// Event Listeners
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    if (db.adminLogin(username, password)) {
        isAdminLoggedIn = true;
        showDashboard();
    } else {
        alert('بيانات الدخول غير صحيحة');
    }
});

logoutBtn.addEventListener('click', () => {
    isAdminLoggedIn = false;
    loginForm.reset();
    showLogin();
});

addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Gather data
    const formData = new FormData(addUserForm);
    const avatarInput = document.getElementById('user-avatar-input');
    const idInput = document.getElementById('user-id-input');

    let avatarBase64 = null;
    let idImageBase64 = null;

    if (avatarInput.files && avatarInput.files[0]) {
        if (avatarInput.files[0].size > 500000) { // 500KB limit
            alert('صورة الملف الشخصي كبيرة جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.');
            return;
        }
        try {
            avatarBase64 = await readFileAsBase64(avatarInput.files[0]);
        } catch (err) {
            console.error('Error reading avatar', err);
        }
    }

    if (idInput.files && idInput.files[0]) {
        if (idInput.files[0].size > 500000) { // 500KB limit
            alert('صورة البطاقة كبيرة جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.');
            return;
        }
        try {
            idImageBase64 = await readFileAsBase64(idInput.files[0]);
        } catch (err) {
            console.error('Error reading ID image', err);
        }
    }

    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        deposit: Number(formData.get('deposit')),
        profit: Number(formData.get('profit')),
        payoutDay: Number(formData.get('payoutDay')),
        duration: Number(formData.get('duration')),
        address: formData.get('address'),
        walletNo: formData.get('walletNo'),
        leaderName: formData.get('leaderName'),
        leaderPhone: formData.get('leaderPhone'),
        phone: formData.get('phone'),
        nationalId: formData.get('nationalId'),
        isVerified: formData.get('isVerified') === 'on'
    };

    if (avatarBase64) {
        data.avatar = avatarBase64;
    }
    if (idImageBase64) {
        data.nationalIdImage = idImageBase64;
    }

    if (editingUserId) {
        // UPDATE MODE
        db.updateUser(editingUserId, data);
        alert('تم تعديل بيانات العميل بنجاح');
        resetFormState();
    } else {
        // CREATE MODE
        if (avatarBase64) data.avatar = avatarBase64; // Add only if exists
        const newUser = db.addUser(data);

        if (newUser) {
            alert(`تم اضافة العميل بنجاح!\n\nبيانات الدخول للعميل:\nاسم المستخدم: ${newUser.username}\nكلمة المرور: ${newUser.password}`);
            addUserForm.reset();
        } else {
            // Error handled in db.addUser
        }
    }

    renderUsers();
});

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Functions
function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutBtn.style.display = 'inline-flex';
    renderUsers();
    renderUsers();
    renderWithdrawalsAdmin();
    renderSupportTicketsAdmin();
    renderAdminStats();
}

function renderAdminStats() {
    const users = db.getUsers();
    const withdrawals = db.getWithdrawals();

    // 1. Total Deposits
    const totalDeposits = users.reduce((sum, user) => sum + (user.deposit || 0), 0);

    // 2. Total Payouts (Approved Withdrawals)
    const totalPayouts = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + (w.amount || 0), 0);

    // 3. Active Users (Not frozen)
    const activeUsers = users.filter(u => !u.isFrozen).length;
    const totalUsers = users.length;

    // Update UI
    document.getElementById('admin-total-deposits').textContent = db.formatCurrency(totalDeposits);
    document.getElementById('admin-total-payouts').textContent = db.formatCurrency(totalPayouts);
    document.getElementById('admin-active-users').textContent = `${activeUsers} / ${totalUsers}`;
}

// ... (Existing functions) ...

// Support Tickets Admin Logic
const adminSupportList = document.getElementById('admin-support-list');

function renderSupportTicketsAdmin() {
    if (!adminSupportList) return;
    const tickets = db.getTickets();
    adminSupportList.innerHTML = '';

    if (tickets.length === 0) {
        adminSupportList.innerHTML = '<div class="text-muted text-center">لا يوجد تذاكر دعم</div>';
        return;
    }

    // Sort: Open first, then by date
    tickets.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    tickets.forEach(t => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 1rem; margin-bottom: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; cursor: pointer;';

        let statusBadge = t.status === 'open' ? '<span style="color:#f39c12">مفتوحة</span>' : '<span style="color:#aaa">مغلقة</span>';

        div.innerHTML = `
            <div class="d-flex justify-between">
                <div>
                    <span class="text-primary" style="font-weight:bold;">${t.userName}</span>
                    <span class="text-muted" style="font-size:0.8rem;"> - ${t.subject}</span>
                </div>
                <div>${statusBadge}</div>
            </div>
            <div class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">
                ${db.formatDate(t.date)} - ${t.messages.length} ردود
            </div>
            
            <div class="ticket-messages" style="display:none; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                ${t.messages.map(m => `
                    <div style="margin-bottom: 0.5rem; text-align: ${m.sender === 'user' ? 'right' : 'left'};">
                        <div style="display:inline-block; padding:0.5rem; border-radius:8px; background:${m.sender === 'admin' ? 'var(--primary-hover)' : '#444'}; color:#fff; font-size:0.9rem;">
                            ${m.text}
                        </div>
                        <div style="font-size:0.7rem; color:#aaa; margin-top:0.2rem;">${m.sender === 'admin' ? 'الادارة' : t.userName}</div>
                    </div>
                `).join('')}
                
                ${t.status === 'open' ? `
                    <div class="d-flex gap-1" style="margin-top: 1rem; flex-wrap: wrap;">
                        <input type="text" placeholder="اكتب رداً..." class="ticket-reply-input" style="flex:3; padding:0.4rem; background:#222; border:1px solid var(--border); color:#fff; border-radius:4px;">
                        <button class="btn btn-primary ticket-reply-btn" data-id="${t.id}" style="flex:1;">رد</button>
                        <button class="btn btn-outline ticket-close-btn" data-id="${t.id}" style="flex:1; border-color:var(--danger); color:var(--danger);">اغلاق</button>
                    </div>
                ` : ''}
            </div>
        `;

        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            const msgDiv = div.querySelector('.ticket-messages');
            msgDiv.style.display = msgDiv.style.display === 'none' ? 'block' : 'none';
        });

        const replyBtn = div.querySelector('.ticket-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                const input = div.querySelector('.ticket-reply-input');
                if (input.value) {
                    db.replyToTicket(t.id, 'admin', input.value);
                    renderSupportTicketsAdmin();
                }
            });
        }

        const closeBtn = div.querySelector('.ticket-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (confirm('هل انت متأكد من اغلاق هذه التذكرة؟')) {
                    db.closeTicket(t.id);
                    renderSupportTicketsAdmin();
                }
            });
        }

        adminSupportList.appendChild(div);
    });
}

function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    logoutBtn.style.display = 'none';
}

function renderUsers() {
    const users = db.getUsers();
    usersTableBody.innerHTML = '';

    if (users.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">لا يوجد عملاء حاليا</td></tr>';
        return;
    }

    // Sort by newest
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td style="font-family: monospace; color: var(--primary);">
                ${user.username} / ${user.password}
            </td>
            <td>${db.formatCurrency(user.deposit)}</td>
            <td class="text-primary">${db.formatCurrency(user.profit)}</td>
            <td>${user.duration} شهور</td>
            <td>${user.leaderName || '-'}</td>
            <td>${db.formatDate(user.createdAt)}</td>
            <td>
                <div class="d-flex gap-1" style="flex-wrap: wrap;">
                    <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="startEdit('${user.id}')">تعديل</button>
                    <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color:${user.isFrozen ? 'var(--success)' : '#e74c3c'}; border-color:${user.isFrozen ? 'var(--success)' : '#e74c3c'};" onclick="toggleFreezeHandler('${user.id}')">
                        ${user.isFrozen ? 'تنشيط' : 'تجميد'}
                    </button>
                    <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: var(--danger); border-color: var(--danger);" onclick="deleteUserHandler('${user.id}')">حذف</button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
}

function toggleFreezeHandler(id) {
    if (confirm('هل انت متأكد من تغيير حالة تجميد هذا الحساب؟')) {
        db.toggleFreezeUser(id);
        renderUsers();
    }
}

function deleteUserHandler(id) {
    if (confirm('هل انت متأكد من حذف هذا العميل؟')) {
        db.deleteUser(id);
        renderUsers();
    }
}

function startEdit(id) {
    const user = db.getUserById(id);
    if (!user) return;

    editingUserId = id;
    submitBtn.textContent = 'حفظ التعديلات';
    submitBtn.classList.remove('btn-primary');
    submitBtn.style.backgroundColor = 'var(--success)';

    // Fill form
    const f = addUserForm;
    f.name.value = user.name;
    f.email.value = user.email || '';
    f.deposit.value = user.deposit;
    f.profit.value = user.profit;
    f.payoutDay.value = user.payoutDay || '';
    f.duration.value = user.duration;
    f.address.value = user.address || '';
    f.walletNo.value = user.walletNo || '';
    f.leaderName.value = user.leaderName || '';
    f.leaderPhone.value = user.leaderPhone || '';
    f.phone.value = user.phone || '';
    f.nationalId.value = user.nationalId || '';
    f.isVerified.checked = user.isVerified || false;

    // Scroll to form
    addUserForm.scrollIntoView({ behavior: 'smooth' });
}

function resetFormState() {
    editingUserId = null;
    addUserForm.reset();
    submitBtn.textContent = 'انشاء حساب';
    submitBtn.classList.add('btn-primary');
    submitBtn.style.backgroundColor = '';
}
// Withdrawal Management
const withdrawalsTableBodyAdmin = document.querySelector('#withdrawals-table tbody');

function renderWithdrawalsAdmin() {
    const withdrawals = db.getWithdrawals();
    withdrawalsTableBodyAdmin.innerHTML = '';

    if (withdrawals.length === 0) {
        withdrawalsTableBodyAdmin.innerHTML = '<tr><td colspan="7" class="text-center text-muted">لا يوجد طلبات سحب</td></tr>';
        return;
    }

    // Sort: Pending first, then by date
    withdrawals.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.requestDate) - new Date(a.requestDate);
    });

    withdrawals.forEach(w => {
        let statusBadge = '';
        let actions = '';

        if (w.status === 'pending') {
            statusBadge = '<span style="background:rgba(241,196,15,0.2); color:#f39c12; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem;">قيد الانتظار</span>';
            actions = `
                <button class="btn btn-primary" style="padding:0.2rem 0.5rem; font-size:0.8rem; background:var(--success); border-color:var(--success);" onclick="approveWithdrawalAdmin('${w.id}')">موافقة</button>
                <button class="btn btn-outline" style="padding:0.2rem 0.5rem; font-size:0.8rem; color:var(--danger); border-color:var(--danger);" onclick="rejectWithdrawalAdmin('${w.id}')">رفض</button>
            `;
        } else if (w.status === 'approved') {
            statusBadge = '<span style="background:rgba(46,204,113,0.2); color:#27ae60; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem;">تمت الموافقة</span>';
            actions = '-';
        } else {
            statusBadge = '<span style="background:rgba(231,76,60,0.2); color:#c0392b; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem;">مرفوض</span>';
            actions = '-';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${w.userName}</td>
            <td style="font-weight:bold;">${db.formatCurrency(w.amount)}</td>
            <td>${db.formatDate(w.requestDate)}</td>
            <td style="font-family:monospace;">${w.bankAccount}</td>
            <td>${w.leaderName}</td>
            <td>${statusBadge}</td>
            <td><div class="d-flex gap-1">${actions}</div></td>
        `;
        withdrawalsTableBodyAdmin.appendChild(row);
    });
}

function approveWithdrawalAdmin(id) {
    if (confirm('هل انت متأكد من الموافقة على هذا الطلب؟')) {
        db.updateWithdrawalStatus(id, 'approved');
        renderWithdrawalsAdmin();
    }
}

function rejectWithdrawalAdmin(id) {
    const reason = prompt('سبب الرفض (اختياري):');
    if (reason !== null) { // If not cancelled
        if (confirm('هل انت متأكد من رفض هذا الطلب؟')) {
            db.updateWithdrawalStatus(id, 'rejected', reason);
            renderWithdrawalsAdmin();
        }
    }
}

// Notification Logic
const sendNotifBtn = document.getElementById('send-notif-btn');
if (sendNotifBtn) {
    sendNotifBtn.addEventListener('click', () => {
        const msgInput = document.getElementById('notif-message');
        const typeInput = document.getElementById('notif-type');
        const msg = msgInput.value;
        const type = typeInput.value;

        if (!msg) return;

        if (confirm('هل انت متأكد من ارسال هذا التنبيه لجميع العملاء؟')) {
            db.sendNotification(msg, type);
            alert('تم ارسال التنبيه بنجاح');
            msgInput.value = '';
            renderAdminNotifications(); // Refresh list
        }
    });

    // Initial Render
    renderAdminNotifications();
}

function renderAdminNotifications() {
    const container = document.getElementById('admin-notifications-list');
    if (!container) return;

    const notifications = db.getNotifications();
    container.innerHTML = '';

    if (notifications.length === 0) {
        container.innerHTML = '<div class="text-muted text-center" style="font-size:0.8rem;">لا يوجد اعلانات نشطة</div>';
        return;
    }

    notifications.forEach(n => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;';

        div.innerHTML = `
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-left: 0.5rem;">
                <span class="text-muted" style="font-size: 0.7rem;">${db.formatDate(n.date)}</span>
                <span style="font-size: 0.9rem;">${n.message}</span>
            </div>
            <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; color: var(--danger); border-color: var(--danger);" onclick="deleteNotificationHandler('${n.id}')">حذف</button>
        `;
        container.appendChild(div);
    });
}

function deleteNotificationHandler(id) {
    if (confirm('هل انت متأكد من حذف هذا الاعلان؟')) {
        db.deleteNotification(id);
        renderAdminNotifications();
    }
}

// Export to CSV Logic
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const users = db.getUsers();
        if (users.length === 0) {
            alert('لا يوجد بيانات للتصدير');
            return;
        }

        // Define CSV Headers
        const headers = ['Name', 'Username', 'Password', 'Email', 'Deposit', 'Profit', 'Duration', 'Start Date', 'Group Leader', 'Leader Phone', 'Wallet/Bank', 'Address'];

        // Map data to CSV format
        const csvContent = [
            headers.join(','), // Header Row
            ...users.map(u => [
                `"${u.name}"`,
                u.username,
                u.password,
                u.email || '',
                u.deposit,
                u.profit,
                u.duration,
                u.createdAt,
                `"${u.leaderName || ''}"`,
                `"${u.leaderPhone || ''}"`,
                `"${u.walletNo || ''}"`,
                `"${u.address || ''}"`
            ].join(',')) // Data Rows
        ].join('\n');

        // Create Blob and Download
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel support
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `fv_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
