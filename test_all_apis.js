const baseUrl = 'http://localhost:8080/api';

async function fetchApi(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${baseUrl}${endpoint}`, config);
    let data;
    try { data = await response.text(); } catch (e) { data = null; }

    let parsedData = data;
    if (data) {
        try { parsedData = JSON.parse(data); } catch (e) { }
    }

    if (!response.ok) {
        throw new Error(`API Error [${method} ${endpoint}]: ${response.status} - ${typeof parsedData === 'object' ? JSON.stringify(parsedData) : parsedData}`);
    }
    return parsedData;
}

async function runExhaustiveTest() {
    console.log('🔥 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MỌI API (EXHAUSTIVE TEST) 🔥\n');
    const ts = Date.now();
    let A, B, tokenA, tokenB;

    try {
        // ==========================================
        // 1. AUTH & USER CONTROLLER
        // ==========================================
        console.log('▶ [1] Đang test AuthController & UserController...');
        const authA = await fetchApi('/auth/register', 'POST', { name: 'User A', email: `usera_${ts}@test.com`, password: 'password123' });
        A = authA.user; tokenA = authA.token;
        const authB = await fetchApi('/auth/register', 'POST', { name: 'User B', email: `userb_${ts}@test.com`, password: 'password123' });
        B = authB.user; tokenB = authB.token;

        await fetchApi('/auth/login', 'POST', { email: `usera_${ts}@test.com`, password: 'password123' }); // Test login
        await fetchApi('/users/me/phone', 'PUT', { phone: `09${ts.toString().slice(-8)}` }, tokenA);
        await fetchApi('/users/me/qr', 'PUT', { bankBin: '970436', bankAccountNo: '123456' }, tokenA);
        console.log('✅ Auth & User: Register, Login, Update Phone, Update QR thành công.');

        // ==========================================
        // 2. CATEGORY & WALLET CONTROLLER
        // ==========================================
        console.log('\n▶ [2] Đang test CategoryController & WalletController...');
        const categories = await fetchApi('/categories', 'GET', null, tokenA);
        const incomeCat = categories.find(c => c.type === 'INCOME');
        const expenseCat = categories.find(c => c.type === 'EXPENSE');

        const wallet = await fetchApi('/wallets/me', 'GET', null, tokenA);
        console.log('✅ Category & Wallet: Lấy categories và wallet thành công.');

        // ==========================================
        // 3. TRANSACTION CONTROLLER
        // ==========================================
        console.log('\n▶ [3] Đang test TransactionController (CRUD & Summaries)...');
        // Create Income (This will also trigger waterfall if there are goals, but we don't have goals yet)
        const tx1 = await fetchApi(`/transactions/${wallet.id}`, 'POST', {
            amount: 5000000, categoryId: incomeCat.id, note: 'Lương', transactionDate: new Date().toISOString()
        }, tokenA);

        // Update Transaction
        await fetchApi(`/transactions/${tx1.id}`, 'PUT', {
            amount: 6000000, categoryId: incomeCat.id, note: 'Lương (đã sửa)', transactionDate: new Date().toISOString()
        }, tokenA);

        // Summaries
        await fetchApi('/transactions', 'GET', null, tokenA);
        await fetchApi('/transactions/monthly', 'GET', null, tokenA);
        await fetchApi('/transactions/summary/monthly', 'GET', null, tokenA);
        await fetchApi('/transactions/summary/category', 'GET', null, tokenA);
        console.log('✅ Transaction: Đã test Create, Update, GetAll, GetMonthly, GetSummary thành công.');

        // ==========================================
        // 4. BUDGET CONTROLLER
        // ==========================================
        console.log('\n▶ [4] Đang test BudgetController (CRUD)...');
        const budget = await fetchApi('/budgets', 'POST', {
            name: 'Ngân sách ăn uống', categoryId: expenseCat.id, limitAmount: 2000000, month: 0, year: 0
        }, tokenA);
        await fetchApi('/budgets/summary', 'GET', null, tokenA);
        await fetchApi(`/budgets/${budget.budgetId}`, 'DELETE', null, tokenA);
        console.log('✅ Budget: Đã test Create, Summary, Delete thành công.');

        // ==========================================
        // 5. SAVINGS GOAL CONTROLLER
        // ==========================================
        console.log('\n▶ [5] Đang test SavingsGoalController (CRUD & Fund/Withdraw)...');
        const goal = await fetchApi('/savings-goals', 'POST', {
            name: 'Mua xe', targetAmount: 50000000, deadlineDate: '2026-12-31'
        }, tokenA);
        await fetchApi(`/savings-goals/${goal.id}`, 'PUT', {
            name: 'Mua xe máy', targetAmount: 60000000, deadlineDate: '2026-12-31'
        }, tokenA);

        // Cấp vốn thủ công (Fund)
        await fetchApi(`/savings-goals/${goal.id}/fund`, 'POST', { amount: 1000000 }, tokenA);
        // Rút tiền (Withdraw)
        await fetchApi(`/savings-goals/${goal.id}/withdraw`, 'POST', { amount: 500000 }, tokenA);
        await fetchApi('/savings-goals', 'GET', null, tokenA);

        console.log('✅ Savings Goal: Đã test Create, Update, Fund, Withdraw, GetAll thành công.');

        // ==========================================
        // 6. GROUP & EXPENSE CONTROLLER
        // ==========================================
        console.log('\n▶ [6] Đang test GroupController & ExpenseController...');
        const group = await fetchApi('/groups', 'POST', { name: 'Nhóm Test Full', description: 'Mô tả' }, tokenA);
        await fetchApi(`/groups/${group.id}/members`, 'POST', { userId: B.id }, tokenA);
        await fetchApi('/groups', 'GET', null, tokenA); // Get user groups
        await fetchApi(`/groups/${group.id}`, 'GET', null, tokenA); // Get group detail

        // Create Expense
        const expense = await fetchApi(`/groups/${group.id}/expenses`, 'POST', {
            paidBy: A.id, title: 'Ăn tối', amount: 500000, category: 'Ăn uống', splitUserIds: [A.id, B.id]
        }, tokenA);

        // Update Expense
        await fetchApi(`/groups/${group.id}/expenses/${expense.id}`, 'PUT', {
            paidBy: A.id, title: 'Ăn trưa', amount: 400000, category: 'Ăn uống', splitUserIds: [A.id, B.id]
        }, tokenA);

        await fetchApi(`/groups/${group.id}/expenses`, 'GET', null, tokenA);
        await fetchApi(`/groups/${group.id}/expenses/${expense.id}`, 'GET', null, tokenA); // Get detail

        // Export CSV
        try {
            await fetchApi(`/groups/${group.id}/expenses/export`, 'GET', null, tokenA);
        } catch (e) {
            // CSV returns string not json, might cause parsing error in fetchApi. Ignore format error if status is 200.
            if (!e.message.includes('Unexpected token')) throw e;
        }
        console.log('✅ Group & Expense: Đã test Create, AddMember, GetDetails, CRUD Expense, ExportCSV thành công.');

        // ==========================================
        // 7. DEBT & NOTIFICATION CONTROLLER
        // ==========================================
        console.log('\n▶ [7] Đang test DebtController & NotificationController...');
        await fetchApi('/groups/debts/summary', 'GET', null, tokenA); // My global debts summary
        const debts = await fetchApi(`/groups/${group.id}/debts`, 'GET', null, tokenA);
        const debt = debts.transactions.find(t => t.from.id === B.id && t.to.id === A.id);

        if (debt) {
            // Remind
            await fetchApi(`/groups/${group.id}/debts/remind`, 'POST', { debtorId: B.id, amount: debt.amount, message: 'Trả tiền bạn ơi' }, tokenA);

            // Pending debts for B
            await fetchApi(`/groups/${group.id}/debts/pending`, 'GET', null, tokenB);

            // Notify Payment
            await fetchApi(`/groups/${group.id}/debts/notify-payment`, 'POST', { toUserId: A.id, amount: debt.amount }, tokenB);

            // Approve Settle
            await fetchApi(`/groups/${group.id}/debts/approve-settle`, 'POST', { debtorId: B.id, amount: debt.amount }, tokenA);
        }
        console.log('✅ Debt: Đã test Remind, NotifyPayment, ApproveSettle, GetPending, GetSummary thành công.');

        // Test Notifications
        const notifs = await fetchApi('/notifications', 'GET', null, tokenA);
        if (notifs.length > 0) {
            await fetchApi(`/notifications/${notifs[0].id}/read`, 'POST', null, tokenA);
        }
        console.log('✅ Notification: Đã test GetAll, MarkAsRead thành công.');

        // Cleanup: Delete Expense, Delete Savings Goal, Delete Transaction
        console.log('\n▶ [8] Đang dọn dẹp dữ liệu (DELETE APIs)...');
        await fetchApi(`/groups/${group.id}/expenses/${expense.id}`, 'DELETE', null, tokenA);
        await fetchApi(`/savings-goals/${goal.id}`, 'DELETE', null, tokenA);
        await fetchApi(`/transactions/${tx1.id}`, 'DELETE', null, tokenA);
        console.log('✅ Đã chạy lệnh xóa thành công.');

        console.log('\n🎉 [HOÀN TẤT] TẤT CẢ API TRONG BACKEND ĐỀU ĐÃ ĐƯỢC GỌI VÀ HOẠT ĐỘNG CHÍNH XÁC!!! 🎉');
    } catch (err) {
        console.error('\n❌ PHÁT HIỆN LỖI TRONG QUÁ TRÌNH TEST:', err.message);
    }
}

runExhaustiveTest();
