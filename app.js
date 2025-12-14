/**
 * Future Vision Investment Platform - Core Logic
 * Handles data persistence using localStorage
 */

class DataManager {
    constructor() {
        this.STORAGE_KEY_USERS = 'fv_users';
        this.STORAGE_KEY_ADMIN = 'fv_admin';
        this.STORAGE_KEY_WITHDRAWALS = 'fv_withdrawals';
        this.STORAGE_KEY_NOTIFICATIONS = 'fv_notifications';
        this.STORAGE_KEY_ACTIVITIES = 'fv_activities';
        this.STORAGE_KEY_TICKETS = 'fv_tickets';
        this.init();
    }

    init() {
        // Initialize default admin if not exists
        // Always enforce secure admin credentials (removes any old accounts)
        const secureAdmin = {
            username: 'Manager2025',
            password: 'FV_SecurePass!',
            name: 'Main Admin'
        };
        localStorage.setItem(this.STORAGE_KEY_ADMIN, JSON.stringify(secureAdmin));

        // Initialize empty users array if not exists
        if (!localStorage.getItem(this.STORAGE_KEY_USERS)) {
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify([]));
        }

        // Initialize empty withdrawals array if not exists
        if (!localStorage.getItem(this.STORAGE_KEY_WITHDRAWALS)) {
            localStorage.setItem(this.STORAGE_KEY_WITHDRAWALS, JSON.stringify([]));
        }

        // Initialize empty notifications array if not exists
        if (!localStorage.getItem(this.STORAGE_KEY_NOTIFICATIONS)) {
            localStorage.setItem(this.STORAGE_KEY_NOTIFICATIONS, JSON.stringify([]));
        }

        // Initialize empty activities/tickets
        if (!localStorage.getItem(this.STORAGE_KEY_ACTIVITIES)) localStorage.setItem(this.STORAGE_KEY_ACTIVITIES, JSON.stringify([]));
        if (!localStorage.getItem(this.STORAGE_KEY_TICKETS)) localStorage.setItem(this.STORAGE_KEY_TICKETS, JSON.stringify([]));
    }

    // Admin Auth
    adminLogin(username, password) {
        const admin = JSON.parse(localStorage.getItem(this.STORAGE_KEY_ADMIN));
        return admin.username === username && admin.password === password;
    }

    // User Auth
    userLogin(username, password) {
        const users = this.getUsers();
        return users.find(u => u.username === username && u.password === password);
    }

    // User Management
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS)) || [];
        } catch (e) {
            return [];
        }
    }

    addUser(userData) {
        const users = this.getUsers();
        // Generate random username/password for the user if not provided (or we can use name/phone)
        // For this demo, let's generate a simple username based on name + random num
        const username = userData.name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000);
        const password = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit pin

        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            ...userData
        };

        users.push(newUser);
        localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
        return newUser;
    }

    getUserById(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id);
    }

    updateUser(id, updatedData) {
        let users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            // Merge existing data with updates, keep id/createdAt/username unless specified
            users[index] = { ...users[index], ...updatedData };
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
            return users[index];
        }
        return null;
    }

    toggleFreezeUser(id) {
        let users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index].isFrozen = !users[index].isFrozen;
            localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
            return users[index].isFrozen;
        }
        return false;
    }

    deleteUser(id) {
        let users = this.getUsers();
        users = users.filter(u => u.id !== id);
        localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }

    // Withdrawal Management
    getWithdrawals() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_WITHDRAWALS)) || [];
        } catch (e) {
            return [];
        }
    }

    requestWithdrawal(userId, amount) {
        const withdrawals = this.getWithdrawals();
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);

        if (!user) return null;

        const newRequest = {
            id: Date.now().toString(),
            userId: userId,
            userName: user.name,
            leaderName: user.leaderName || '-',
            amount: amount,
            status: 'pending', // pending, approved, rejected
            requestDate: new Date().toISOString(),
            bankAccount: user.walletNo || user.cardNo || 'N/A'
        };

        withdrawals.push(newRequest);
        localStorage.setItem(this.STORAGE_KEY_WITHDRAWALS, JSON.stringify(withdrawals));
        return newRequest;
    }

    updateWithdrawalStatus(id, status, reason = '') {
        let withdrawals = this.getWithdrawals();
        const index = withdrawals.findIndex(w => w.id === id);
        if (index !== -1) {
            withdrawals[index].status = status;
            if (reason) withdrawals[index].rejectionReason = reason;
            localStorage.setItem(this.STORAGE_KEY_WITHDRAWALS, JSON.stringify(withdrawals));
            return withdrawals[index];
        }
        return null;
    }

    getAvailableBalance(userId) {
        const user = this.getUserById(userId);
        if (!user) return 0;

        const startDate = new Date(user.createdAt);
        const payoutDay = user.payoutDay || startDate.getDate();
        const now = new Date();
        const monthlyProfit = user.profit;

        // Calculate total earned based on passed payout dates
        let totalEarned = 0;
        let checkDate = new Date(startDate);

        // Move to the first potential payout month (next month)
        // Adjust logic: If started Jan 15, payout day 20.
        // Jan 20 > Jan 15? Yes. Earned? Maybe policy says "after 1 month".
        // Use the same logic as "Schedule": Start + 1 month.

        let monthsPassed = 0;
        // Loop for contract duration or until Now
        const duration = user.duration || 100; // infinite if checks date

        for (let i = 1; i <= duration; i++) {
            let payoutDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, payoutDay);
            if (payoutDate <= now) {
                totalEarned += monthlyProfit;
            } else {
                break; // Future payouts not earned yet
            }
        }

        // Calculate total withdrawn (Approved + Pending)
        // Pending should subtract from available to prevent double spend
        const withdrawals = this.getWithdrawals();
        const userWithdrawals = withdrawals.filter(w => w.userId === userId && (w.status === 'approved' || w.status === 'pending'));
        const totalWithdrawn = userWithdrawals.reduce((sum, w) => sum + w.amount, 0);

        return totalEarned - totalWithdrawn;
    }

    // Activity Log
    getActivity(userId) {
        try {
            const all = JSON.parse(localStorage.getItem(this.STORAGE_KEY_ACTIVITIES)) || [];
            return all.filter(a => a.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (e) { return []; }
    }

    logActivity(userId, action) {
        const activities = JSON.parse(localStorage.getItem(this.STORAGE_KEY_ACTIVITIES)) || [];
        activities.push({
            id: Date.now().toString(),
            userId,
            action,
            date: new Date().toISOString()
        });
        // Keep last 1000 global activities
        if (activities.length > 1000) activities.shift();
        localStorage.setItem(this.STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
    }

    // Support Tickets
    getTickets() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_TICKETS)) || [];
        } catch (e) { return []; }
    }

    createTicket(userId, subject, message) {
        const tickets = this.getTickets();
        const user = this.getUserById(userId);
        const newTicket = {
            id: Date.now().toString(),
            userId,
            userName: user ? user.name : 'Unknown',
            subject,
            status: 'open',
            date: new Date().toISOString(),
            messages: [
                { sender: 'user', text: message, date: new Date().toISOString() }
            ]
        };
        tickets.push(newTicket);
        localStorage.setItem(this.STORAGE_KEY_TICKETS, JSON.stringify(tickets));
        this.logActivity(userId, `تم فتح تذكرة دعم فني جديدة: ${subject}`);
        return newTicket;
    }

    replyToTicket(ticketId, sender, message) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
            tickets[index].messages.push({
                sender: sender, // 'user' or 'admin'
                text: message,
                date: new Date().toISOString()
            });
            // Auto open if admin replies? maybe not needed
            localStorage.setItem(this.STORAGE_KEY_TICKETS, JSON.stringify(tickets));

            if (sender === 'user') this.logActivity(tickets[index].userId, `رد على تذكرة الدعم: ${tickets[index].subject}`);

            return tickets[index];
        }
    }

    closeTicket(ticketId) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
            tickets[index].status = 'closed';
            localStorage.setItem(this.STORAGE_KEY_TICKETS, JSON.stringify(tickets));
            return true;
        }
        return false;
    }

    // Notification Management
    getNotifications() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_NOTIFICATIONS)) || [];
        } catch (e) {
            return [];
        }
    }

    sendNotification(message, type = 'general') { // type: general, alert, success
        const notifications = this.getNotifications();
        const newNotification = {
            id: Date.now().toString(),
            message: message,
            type: type,
            date: new Date().toISOString()
        };
        // Add to beginning
        notifications.unshift(newNotification);
        // Keep last 50
        if (notifications.length > 50) notifications.pop();

        localStorage.setItem(this.STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
        return newNotification;
    }

    deleteNotification(id) {
        let notifications = this.getNotifications();
        notifications = notifications.filter(n => n.id !== id);
        localStorage.setItem(this.STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
    }

    // Helpers
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-EG');
    }
}

const db = new DataManager();
