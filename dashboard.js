// Check Auth
const currentUserStr = sessionStorage.getItem('fv_current_user');
if (!currentUserStr) {
    window.location.href = 'login.html';
}
const currentUser = JSON.parse(currentUserStr);

// UI Elements
document.getElementById('user-name').textContent = currentUser.name;
document.getElementById('user-email').textContent = currentUser.email || 'لا يوجد بريد الكتروني';
if (currentUser.avatar) {
    const avatarContainer = document.getElementById('user-avatar-container');
    avatarContainer.innerHTML = `<img src="${currentUser.avatar}" alt="User Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
}

document.getElementById('user-deposit').textContent = '0'; // Initial for animation
document.getElementById('user-profit').textContent = '0'; // Initial for animation
document.getElementById('user-duration').textContent = currentUser.duration;
// Populate Profile Section
document.getElementById('user-address').textContent = currentUser.address || 'غير مسجل';
document.getElementById('user-wallet').textContent = currentUser.walletNo || 'غير مسجل';
document.getElementById('profile-name').textContent = currentUser.name;
document.getElementById('profile-username').textContent = '@' + currentUser.username;
document.getElementById('profile-phone').textContent = currentUser.phone || 'غير مسجل';
document.getElementById('profile-national-id').textContent = currentUser.nationalId || 'غير مسجل';
document.getElementById('profile-start-date').textContent = db.formatDate(currentUser.createdAt);

// Verification Status
const verificationStatus = document.getElementById('verification-status');
const verifiedBadge = document.getElementById('verified-badge');
if (currentUser.isVerified) {
    verificationStatus.innerHTML = '<span class="status-badge status-paid">موثق ✅</span>';
    verifiedBadge.style.display = 'block';
} else {
    verificationStatus.innerHTML = '<span class="status-badge status-future">غير موثق ❌</span>';
    verifiedBadge.style.display = 'none';
}

// Handle ID Image View
const viewIdBtn = document.getElementById('view-id-btn');
if (currentUser.nationalIdImage) {
    viewIdBtn.style.display = 'block';
    viewIdBtn.addEventListener('click', () => {
        const win = window.open('', '_blank');
        win.document.write(`<img src="${currentUser.nationalIdImage}" style="width:100%; max-width:800px; margin:2rem auto; display:block;">`);
    });
}

// Group Leader Info
const leaderNameEl = document.getElementById('leader-name');
const leaderBtn = document.getElementById('leader-whatsapp');
const leaderCard = leaderNameEl.closest('.card');

if (currentUser.leaderName) {
    leaderNameEl.textContent = currentUser.leaderName;
    if (currentUser.leaderPhone) {
        leaderBtn.href = `https://wa.me/2${currentUser.leaderPhone}`; // Assuming EG key 2 for simplicity or just plain number
        // Better: just use number as is, assuming user enters key
        leaderBtn.href = `https://wa.me/${currentUser.leaderPhone}`;
    } else {
        leaderBtn.style.display = 'none';
    }
} else {
    // Hide card if no leader assigned
    leaderCard.style.display = 'none';
}

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('fv_current_user');
    window.location.href = 'login.html';
});

// Set Contract Link
const contractLink = document.getElementById('contract-link');
if (contractLink) {
    contractLink.href = `contract.html?uid=${currentUser.id}`;
}

// State for tabs
let currentTab = 'upcoming'; // 'upcoming' or 'history'

// Tab Buttons
const btnUpcoming = document.getElementById('show-upcoming');
const btnHistory = document.getElementById('show-history');

if (btnUpcoming && btnHistory) {
    btnUpcoming.addEventListener('click', () => switchTab('upcoming'));
    btnHistory.addEventListener('click', () => switchTab('history'));
}

function switchTab(tab) {
    currentTab = tab;
    if (tab === 'upcoming') {
        btnUpcoming.classList.add('btn-primary');
        btnUpcoming.classList.remove('btn-outline');
        btnHistory.classList.add('btn-outline');
        btnHistory.classList.remove('btn-primary');
    } else {
        btnHistory.classList.add('btn-primary');
        btnHistory.classList.remove('btn-outline');
        btnUpcoming.classList.add('btn-outline');
        btnUpcoming.classList.remove('btn-primary');
    }
    generateSchedule();
}

// Profit Schedule Logic
function generateSchedule() {
    const scheduleTable = document.querySelector('#schedule-table tbody');
    scheduleTable.innerHTML = '';

    const startDate = new Date(currentUser.createdAt);
    const durationMonths = currentUser.duration || 12; // Default
    const payoutDay = currentUser.payoutDay || startDate.getDate();

    // Generate dates
    let items = [];

    // We assume 1st profit is the 'payoutDay' of the NEXT month after creation.
    // Logic: for month i=1 to duration.

    for (let i = 1; i <= durationMonths; i++) {
        // Calculate target date
        let targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, payoutDay);

        // Status Check
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const d = new Date(targetDate);
        d.setHours(0, 0, 0, 0);

        let status = '';
        let statusClass = '';
        let countdown = '-';
        let type = ''; // 'history' or 'upcoming'

        if (d < now) {
            status = 'تم الاستلام';
            statusClass = 'status-paid';
            type = 'history';
        } else if (d.getTime() === now.getTime()) {
            status = 'مستحق اليوم';
            statusClass = 'status-pending';
            countdown = 'اليوم';
            type = 'upcoming'; // Include today in upcoming/active
        } else {
            status = 'قادم';
            statusClass = 'status-future';
            const diffTime = Math.abs(d - now);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            countdown = `${diffDays} يوم`;
            type = 'upcoming';
        }

        items.push({
            index: i,
            date: targetDate,
            amount: currentUser.profit,
            status,
            statusClass,
            countdown,
            type
        });
    }

    // Filter based on tab
    const displayedItems = items.filter(item => item.type === currentTab);

    if (displayedItems.length === 0) {
        scheduleTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا توجد بيانات للعرض</td></tr>';
        return;
    }

    // Sort: Upcoming -> Closest first (Ascending). History -> Newest first (Descending)
    if (currentTab === 'upcoming') {
        displayedItems.sort((a, b) => a.date - b.date);
    } else {
        displayedItems.sort((a, b) => b.date - a.date);
    }

    displayedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.index}</td>
            <td>${db.formatDate(item.date)}</td>
            <td class="text-primary">${db.formatCurrency(item.amount)}</td>
            <td><span class="status-badge ${item.statusClass}">${item.status}</span></td>
            <td style="font-size: 0.9rem; color: var(--text-muted);">${item.countdown}</td>
        `;
        scheduleTable.appendChild(row);
    });
}

generateSchedule();

// Withdrawal Logic
const withdrawBtn = document.getElementById('withdraw-btn');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const withdrawalsTableBody = document.querySelector('#withdrawals-table tbody');

function renderWithdrawals() {
    const allWithdrawals = db.getWithdrawals();
    const myWithdrawals = allWithdrawals.filter(w => w.userId === currentUser.id);

    withdrawalsTableBody.innerHTML = '';

    if (myWithdrawals.length === 0) {
        withdrawalsTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 1rem;">لا يوجد طلبات سابقة</td></tr>';
        return;
    }

    // Sort newest first
    myWithdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    myWithdrawals.forEach(w => {
        let statusBadge = '';
        if (w.status === 'pending') statusBadge = '<span class="status-badge status-pending">قيد المراجعة</span>';
        else if (w.status === 'approved') statusBadge = '<span class="status-badge status-paid">تم التحويل</span>';
        else {
            statusBadge = '<span class="status-badge" style="background:rgba(231,76,60,0.2); color:#e74c3c;">مرفوض</span>';
            if (w.rejectionReason) {
                statusBadge += `<div style="font-size:0.8rem; color:var(--danger); margin-top:0.2rem;">سبب: ${w.rejectionReason}</div>`;
            }
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${db.formatDate(w.requestDate)}</td>
            <td>${db.formatCurrency(w.amount)}</td>
            <td>${statusBadge}</td>
        `;
        withdrawalsTableBody.appendChild(row);
    });
}

if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
        const amount = Number(withdrawAmountInput.value);
        if (!amount || amount <= 0) {
            alert('الرجاء ادخال مبلغ صحيح');
            return;
        }

        const available = db.getAvailableBalance(currentUser.id);
        if (amount > available) {
            alert(`رصيدك المتاح للسحب هو ${db.formatCurrency(available)} فقط.\n\nيرجى الانتظار حتى موعد الاستحقاق القادم.`);
            return;
        }

        if (confirm(`هل انت متأكد من طلب سحب مبلغ ${db.formatCurrency(amount)} ؟`)) {
            const result = db.requestWithdrawal(currentUser.id, amount);
            if (result) {
                alert('تم ارسال طلب السحب بنجاح وسيتم مراجعته من الادارة');
                withdrawAmountInput.value = '';
                renderWithdrawals();
            } else {
                alert('حدث خطأ حاول مرة أخرى');
            }
        }
    });

    // Initial Render
    renderWithdrawals();
}

// Notifications Logic
function renderNotifications() {
    const container = document.getElementById('dashboard-notifications');
    const notifications = db.getNotifications();

    // Get last 3 notifications only for dashboard header
    const recent = notifications.slice(0, 3);

    container.innerHTML = '';

    if (recent.length === 0) return;

    recent.forEach(n => {
        let bgColor = '#333';
        let borderColor = 'var(--border)';
        let icon = '📢';

        if (n.type === 'alert') {
            bgColor = 'rgba(231,76,60,0.1)';
            borderColor = '#e74c3c';
            icon = '⚠️';
        } else if (n.type === 'success') {
            bgColor = 'rgba(46,204,113,0.1)';
            borderColor = '#2ecc71';
            icon = '✅';
        }

        const div = document.createElement('div');
        div.style.cssText = `
            background: ${bgColor};
            border: 1px solid ${borderColor};
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        `;

        div.innerHTML = `
            <div style="font-size: 1.5rem;">${icon}</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 0.2rem;">${n.message}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${db.formatDate(n.date)}</div>
            </div>
        `;

        container.appendChild(div);
    });
}

renderNotifications();

// Activity Log Logic
function renderActivityLog() {
    const container = document.getElementById('activity-log-container');
    const activities = db.getActivity(currentUser.id);

    container.innerHTML = '';

    if (activities.length === 0) {
        container.innerHTML = '<div class="text-muted text-center">لا يوجد نشاطات مؤخراً</div>';
        return;
    }

    activities.forEach(a => {
        const div = document.createElement('div');
        div.style.cssText = `
            border-bottom: 1px solid var(--border);
            padding: 0.5rem 0;
            font-size: 0.9rem;
        `;
        div.innerHTML = `
            <div style="color: var(--primary); margin-bottom: 0.2rem;">${a.action}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${db.formatDate(a.date)}</div>
        `;
        container.appendChild(div);
    });
}
renderActivityLog();

// Profit Chart Logic
function renderProfitChart() {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;

    // Calculate projected growth
    const months = [];
    const balances = [];
    const profit = currentUser.profit;
    const duration = currentUser.duration;

    for (let i = 0; i <= duration; i++) {
        months.push(`الشهر ${i}`);
        balances.push(i * profit);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'الأرباح المجمعة (ج.م)',
                data: balances,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#bbb', font: { family: 'Cairo' } } }
            },
            scales: {
                y: {
                    grid: { color: '#333' },
                    ticks: { color: '#bbb', font: { family: 'Cairo' } }
                },
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#bbb', font: { family: 'Cairo' } }
                }
            }
        }
    });
}
renderProfitChart();

// Support Ticket Logic
const supportList = document.getElementById('support-list');
const newTicketForm = document.getElementById('new-ticket-form');
const openTicketBtn = document.getElementById('open-ticket-btn');
const cancelTicketBtn = document.getElementById('cancel-ticket-btn');
const submitTicketBtn = document.getElementById('submit-ticket-btn');

function renderSupportTickets() {
    const tickets = db.getTickets().filter(t => t.userId === currentUser.id);
    supportList.innerHTML = '';

    if (tickets.length === 0) {
        supportList.innerHTML = '<div class="text-muted text-center" style="padding:1rem;">لا يوجد تذاكر دعم</div>';
        return;
    }

    tickets.forEach(t => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.cssText = 'padding: 0.8rem; margin-bottom: 0.5rem; background: rgba(255,255,255,0.03); cursor: pointer;';
        div.innerHTML = `
            <div class="d-flex justify-between">
                <span class="text-primary" style="font-weight:bold;">${t.subject}</span>
                <span class="status-badge ${t.status === 'open' ? 'status-pending' : 'status-future'}">${t.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
            </div>
            <div class="text-muted" style="font-size: 0.8rem; margin-top: 0.5rem;">
                ${db.formatDate(t.date)} - ${t.messages.length} ردود
            </div>
            <!-- Messages (Hidden) -->
            <div class="ticket-messages" style="display:none; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                ${t.messages.map(m => `
                    <div style="margin-bottom: 0.5rem; text-align: ${m.sender === 'user' ? 'right' : 'left'};">
                        <div style="display:inline-block; padding:0.5rem; border-radius:8px; background:${m.sender === 'user' ? 'var(--primary-hover)' : '#444'}; color:#fff; font-size:0.9rem;">
                            ${m.text}
                        </div>
                        <div style="font-size:0.7rem; color:#aaa; margin-top:0.2rem;">${db.formatDate(m.date)}</div>
                    </div>
                `).join('')}
                
                ${t.status === 'open' ? `
                    <div class="d-flex gap-1" style="margin-top: 1rem;">
                        <input type="text" placeholder="اكتب رداً..." class="ticket-reply-input" style="flex:1; padding:0.4rem; background:#222; border:1px solid var(--border); color:#fff; border-radius:4px;">
                        <button class="btn btn-primary ticket-reply-btn" data-id="${t.id}" style="padding:0.4rem 1rem;">ارسال</button>
                    </div>
                ` : ''}
            </div>
        `;

        // Toggle view
        div.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            const msgDiv = div.querySelector('.ticket-messages');
            msgDiv.style.display = msgDiv.style.display === 'none' ? 'block' : 'none';
        });

        // Reply handler
        const replyBtn = div.querySelector('.ticket-reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                const input = div.querySelector('.ticket-reply-input');
                if (input.value) {
                    db.replyToTicket(t.id, 'user', input.value);
                    renderSupportTickets();
                }
            });
        }

        supportList.appendChild(div);
    });
}

if (openTicketBtn) {
    openTicketBtn.addEventListener('click', () => {
        newTicketForm.style.display = 'block';
        openTicketBtn.style.display = 'none';
    });

    cancelTicketBtn.addEventListener('click', () => {
        newTicketForm.style.display = 'none';
        openTicketBtn.style.display = 'block';
    });

    submitTicketBtn.addEventListener('click', () => {
        const subject = document.getElementById('ticket-subject').value;
        const msg = document.getElementById('ticket-message').value;

        if (subject && msg) {
            db.createTicket(currentUser.id, subject, msg);
            renderSupportTickets();
            renderActivityLog();
            newTicketForm.style.display = 'none';
            openTicketBtn.style.display = 'block';
            document.getElementById('ticket-subject').value = '';
            document.getElementById('ticket-message').value = '';
        } else {
            alert('الرجاء ملء جميع الحقول');
        }
    });

    renderSupportTickets();
}

// Change Password Logic
const changePassBtn = document.getElementById('change-pass-btn');
if (changePassBtn) {
    changePassBtn.addEventListener('click', () => {
        const newPass = document.getElementById('new-password').value;
        if (!newPass || newPass.length < 3) {
            alert('كلمة المرور قصيرة جداً');
            return;
        }

        if (confirm('هل انت متأكد من تغيير كلمة المرور؟')) {
            currentUser.password = newPass;
            db.updateUser(currentUser.id, currentUser);
            db.logActivity(currentUser.id, 'تم تغيير كلمة المرور');
            alert('تم تغيير كلمة المرور بنجاح');
            document.getElementById('new-password').value = '';
            renderActivityLog();
        }
    });
}

// News Ticker Logic
function updateNewsTicker() {
    const tickerContent = document.getElementById('news-ticker-content');
    if (!tickerContent) return;

    // Get last general notification
    const notifications = db.getNotifications().filter(n => n.type === 'general' || n.type === 'alert');
    if (notifications.length > 0) {
        // Concatenate top 3
        const text = notifications.slice(0, 3).map(n => `📢 ${n.message}`).join('   |   ');
        tickerContent.textContent = text + '   |   أهلاً بك في منصة رؤية المستقبل للاستثمار   |   ';
    } else {
        tickerContent.textContent = 'أهلاً بك في منصة رؤية المستقبل للاستثمار   |   تابعونا لمعرفة أحدث الفرص الاستثمارية   |   ';
    }
}
updateNewsTicker();

// Animated Counter Logic
function animateValue(obj, start, end, duration, isCurrency = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);

        obj.innerHTML = isCurrency ? db.formatCurrency(value) : value;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = isCurrency ? db.formatCurrency(end) : end;
        }
    };
    window.requestAnimationFrame(step);
}

// Trigger Animations
animateValue(document.getElementById('user-deposit'), 0, currentUser.deposit, 1500, true);
animateValue(document.getElementById('user-profit'), 0, currentUser.profit, 1500, true);
// Duration is small, maybe just animate it simply or leave static.
// Let's animate duration just for fun 0 -> N
// Parsing duration which is string sometimes? No, number.
// animateValue(document.getElementById('user-duration'), 0, currentUser.duration, 1000);

// Account Statement Logic
const printStatementBtn = document.getElementById('print-statement-btn');
if (printStatementBtn) {
    printStatementBtn.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        const now = new Date();

        let html = `
            <html dir="rtl">
            <head>
                <title>كشف حساب - ${currentUser.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; padding: 2rem; color: #000; direction: rtl; }
                    .header { text-align: center; margin-bottom: 3rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
                    .label { font-weight: bold; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
                    th, td { border: 1px solid #ddd; padding: 0.8rem; text-align: right; }
                    th { background: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>رؤية المستقبل للاستثمار</h1>
                    <h3>كشف حساب عميل</h3>
                    <p>تاريخ الاصدار: ${now.toLocaleDateString('ar-EG')}</p>
                </div>

                <div class="info-grid">
                    <div><span class="label">اسم العميل:</span> ${currentUser.name}</div>
                    <div><span class="label">رقم الحساب:</span> ${currentUser.username}</div>
                    <div><span class="label">تاريخ التعاقد:</span> ${db.formatDate(currentUser.createdAt)}</div>
                    <div><span class="label">قيمة الايداع:</span> ${db.formatCurrency(currentUser.deposit)}</div>
                    <div><span class="label">مدة العقد:</span> ${currentUser.duration} شهور</div>
                    <div><span class="label">الربح الشهري:</span> ${db.formatCurrency(currentUser.profit)}</div>
                </div>

                <h3>سجل المدفوعات والارباح</h3>
                <table>
                    <thead>
                        <tr>
                            <th>تفاصيل الحركة</th>
                            <th>المبلغ</th>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add Withdrawals
        const withdrawals = db.getWithdrawals().filter(w => w.userId === currentUser.id);
        withdrawals.forEach(w => {
            html += `
                <tr>
                    <td>طلب سحب أرباح</td>
                    <td>${db.formatCurrency(w.amount)}</td>
                    <td>${db.formatDate(w.requestDate)}</td>
                    <td>${w.status === 'approved' ? 'تم التحويل' : (w.status === 'pending' ? 'قيد المراجعة' : 'مرفوض')}</td>
                </tr>
            `;
        });

        // Add Scheduled (History only)
        const startDate = new Date(currentUser.createdAt);
        const payoutDay = currentUser.payoutDay || startDate.getDate();
        for (let i = 1; i <= currentUser.duration; i++) {
            let targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, payoutDay);
            if (targetDate <= now) {
                html += `
                    <tr>
                        <td>استحقاق ربح شهري (شهر ${i})</td>
                        <td>${db.formatCurrency(currentUser.profit)}</td>
                        <td>${db.formatDate(targetDate)}</td>
                        <td>مستحق/تمت الاضافة</td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
                
                <div style="margin-top: 3rem; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="text-align: center;">
                        <p style="margin-bottom: 1rem; font-weight: bold;">الموظف المسئول</p>
                        <div style="font-family: serif; font-size: 1.8rem; color: #000080; transform: rotate(-5deg); margin-bottom: 0.5rem; text-decoration: underline;">
                           أ. أحمد عبد العزيز
                        </div>
                        <p style="font-size: 0.8rem; color: #555;">مدير الحسابات</p>
                    </div>
                    
                    <div style="position: relative; width: 150px; height: 150px; border: 3px double #c0392b; border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); color: #c0392b; font-weight: bold; font-size: 1.2rem; opacity: 0.8;">
                        <div style="text-align: center; line-height: 1.4;">
                            رؤية المستقبل<br>للاستثمار<br>
                            <span style="font-size: 0.8rem;">Future Vision</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #777;">
                    تم اصدار هذا المستند الكترونياً من نظام رؤية المستقبل ويعتمد بختم الشركة
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    });
}
