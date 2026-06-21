const baseUrl = 'http://localhost:8080/api';

async function fetchApi(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${baseUrl}${endpoint}`, config);
    const data = await response.text();
    let parsedData = null;
    try { parsedData = data ? JSON.parse(data) : null; } catch (e) { parsedData = data; }

    if (!response.ok) {
        throw new Error(`API Error [${method} ${endpoint}]: ${response.status} - ${JSON.stringify(parsedData)}`);
    }
    return parsedData;
}

async function runComplexTest() {
    console.log('🚀 Bắt đầu Kịch bản Test Phức tạp: Nhiều thành viên, Thuật toán tối ưu nợ & Lịch sử trả nợ...\n');
    const ts = Date.now();

    try {
        // 1. Tạo 4 User
        console.log('1. Khởi tạo 4 tài khoản (Alice, Bob, Charlie, David)...');
        const users = [];
        for (let name of ['Alice', 'Bob', 'Charlie', 'David']) {
            const res = await fetchApi('/auth/register', 'POST', { name, email: `${name}_${ts}@test.com`, password: 'password123' });
            users.push({ id: res.user.id, name, token: res.token });
        }
        const [A, B, C, D] = users;
        console.log('✅ Đã tạo xong 4 User.');

        // 2. Tạo Group và add members
        console.log('\n2. Alice tạo nhóm và mời mọi người vào...');
        const group = await fetchApi('/groups', 'POST', { name: 'Chuyến đi Vũng Tàu', description: 'Test chia nợ 4 người' }, A.token);
        for (let u of [B, C, D]) await fetchApi(`/groups/${group.id}/members`, 'POST', { userId: u.id }, A.token);
        console.log('✅ Nhóm đã có 4 thành viên.');

        // 3. Tạo các giao dịch chéo ngoe (Để test thuật toán Greedy)
        console.log('\n3. Tạo các giao dịch chi tiêu phức tạp...');
        // Alice trả tiền khách sạn 1.200k cho cả 4 người
        await fetchApi(`/groups/${group.id}/expenses`, 'POST', {
            paidBy: A.id, title: 'Tiền khách sạn', amount: 1200000, category: 'Lưu trú',
            splitUserIds: [A.id, B.id, C.id, D.id]
        }, A.token);
        
        // Bob trả tiền ăn hải sản 800k cho Bob, Charlie, David (Alice không ăn)
        await fetchApi(`/groups/${group.id}/expenses`, 'POST', {
            paidBy: B.id, title: 'Ăn hải sản', amount: 900000, category: 'Ăn uống',
            splitUserIds: [B.id, C.id, D.id]
        }, B.token);

        console.log('✅ Đã ghi nhận các khoản chi tiêu.');

        // 4. Lấy danh sách nợ để xem Greedy Algorithm làm việc
        console.log('\n4. Kiểm tra công nợ sau khi thuật toán Greedy tối ưu:');
        const debts = await fetchApi(`/groups/${group.id}/debts`, 'GET', null, A.token);
        debts.transactions.forEach(t => {
            console.log(`   - ${t.from.name} ĐANG NỢ ${t.to.name}: ${t.amount.toLocaleString()} VND`);
        });

        // 5. Charlie tiến hành trả nợ cho Alice (Ví dụ)
        // Tìm khoản nợ của Charlie
        const charlieDebtToAlice = debts.transactions.find(t => t.from.id === C.id && t.to.id === A.id);
        if (charlieDebtToAlice) {
            console.log(`\n5. Charlie thực hiện chuyển khoản trả nợ cho Alice số tiền ${charlieDebtToAlice.amount.toLocaleString()} VND...`);
            
            // Charlie Notify
            await fetchApi(`/groups/${group.id}/debts/notify-payment`, 'POST', { toUserId: A.id, amount: charlieDebtToAlice.amount }, C.token);
            console.log('   -> Charlie đã báo cáo thanh toán.');

            // Alice Approve
            await fetchApi(`/groups/${group.id}/debts/approve-settle`, 'POST', { debtorId: C.id, amount: charlieDebtToAlice.amount }, A.token);
            console.log('   -> Alice đã Duyệt nhận tiền (Approve Settle).');
        }

        // 6. Kiểm tra lại Lịch sử (Expenses) xem có ghi nhận SETTLEMENT không
        console.log('\n6. Truy xuất Lịch sử Nhóm để kiểm tra việc lưu vết trả nợ:');
        const expenses = await fetchApi(`/groups/${group.id}/expenses`, 'GET', null, A.token);
        expenses.forEach(e => {
            if (e.category === 'SETTLEMENT') {
                console.log(`   [LỊCH SỬ TRẢ NỢ] ✅ Đã lưu: "${e.title}" | Số tiền: ${e.amount.toLocaleString()} VND | Người duyệt: ${e.payer.name}`);
            } else {
                console.log(`   [CHI TIÊU] ${e.title} | ${e.amount.toLocaleString()} VND`);
            }
        });

        console.log('\n🎉 TEST LUỒNG CHIA NỢ NHIỀU NGƯỜI & LỊCH SỬ HOÀN TẤT THÀNH CÔNG!');
    } catch (err) {
        console.error('\n❌ LỖI:', err.message);
    }
}

runComplexTest();
