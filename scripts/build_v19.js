const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uid() {
    return crypto.randomUUID();
}

console.log("Reading seed_v18.sql...");
const v18Path = path.join(__dirname, 'seed_v18.sql');
const v18Content = fs.readFileSync(v18Path, 'utf8');

// Parse sections from seed_v18
console.log("Building seed_v19.sql...");

// Define all IDs
const USERS = {
    A: { id: '1a111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn A (Thông Thái)', email: 'nguyenvana@gmail.com', phone: '0900123456', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', bankBin: '970422', bankAcc: '6617052004888', bankName: 'DUONG DUC BAO', savBin: '970407', savAcc: '6617052004', savName: 'DUONG DUC BAO', pushToken: 'ExponentPushToken[mock_user_a_mbbank_01]', created: '2022-01-01 08:00:00' },
    B: { id: '1b111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn B (Tiêu Lố)', email: 'nguyenvanb@gmail.com', phone: '0901123456', avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', bankBin: '970407', bankAcc: '6617052004', bankName: 'NGUYEN VAN B', savBin: '970436', savAcc: '0011004123456', savName: 'NGUYEN VAN B', pushToken: 'ExponentPushToken[mock_user_b_tcb_02]', created: '2025-09-01 08:00:00' },
    C: { id: '1c111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn C (Trùm Nhóm)', email: 'nguyenvanc@gmail.com', phone: '0902123456', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Leo', bankBin: '970426', bankAcc: '4517052004', bankName: 'NGUYEN VAN C', savBin: '970436', savAcc: '0011004123456', savName: 'NGUYEN VAN C', pushToken: 'ExponentPushToken[mock_user_c_msb_03]', created: '2026-01-01 08:00:00' },
    D: { id: '1d111111-1111-4111-a111-111111111111', name: 'Phạm Văn D (Con Nợ)', email: 'phamvand@gmail.com', phone: '0903123456', avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Sam', bankBin: '970418', bankAcc: '10938888999', bankName: 'PHAM VAN D', savBin: '970436', savAcc: '0011004123456', savName: 'PHAM VAN D', pushToken: 'ExponentPushToken[mock_user_d_bidv_04]', created: '2026-01-01 08:00:00' },
    E: { id: '1e111111-1111-4111-a111-111111111111', name: 'Hoàng Thị E (Newbie GenZ)', email: 'hoangthie@gmail.com', phone: '0904123456', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Max', bankBin: '970423', bankAcc: '10948888999', bankName: 'HOANG THI E', savBin: '970436', savAcc: '0011004123456', savName: 'HOANG THI E', pushToken: 'ExponentPushToken[mock_user_e_tpb_05]', created: '2026-01-01 08:00:00' },
};

const WALLETS = {
    A: { main: '2a111111-1111-4111-a111-111111111111', sav: '2a222222-2222-4222-a222-222222222222', cred: '2a333333-3333-4333-a333-333333333333' },
    B: { main: '2b111111-1111-4111-a111-111111111111', sav: '2b222222-2222-4222-a222-222222222222', cred: '2b333333-3333-4333-a333-333333333333' },
    C: { main: '2c111111-1111-4111-a111-111111111111', sav: '2c222222-2222-4222-a222-222222222222', cred: '2c333333-3333-4333-a333-333333333333' },
    D: { main: '2d111111-1111-4111-a111-111111111111', sav: '2d222222-2222-4222-a222-222222222222', cred: '2d333333-3333-4333-a333-333333333333' },
    E: { main: '2e111111-1111-4111-a111-111111111111', sav: '2e222222-2222-4222-a222-222222222222', cred: '2e333333-3333-4333-a333-333333333333' },
};

const CATS = {
    A: {
        'Ăn uống': '87dd421d-e034-4ba5-84d6-12addb864275',
        'Chi tiêu hàng ngày': '5bd4c308-2a81-4b14-b06b-2dca98f3ff15',
        'Quần áo': 'cb807270-4dc4-45ee-aabb-4e048212b333',
        'Mỹ phẩm': '11d86045-bd80-4ec6-b2e1-be15d0d255c5',
        'Phí giao lưu': 'd008c363-2750-41da-8d23-c150e3094c1a',
        'Y tế': '0434e2ad-7f98-4c7a-856c-cb16c98cdc87',
        'Giáo dục': 'de5e35cb-7482-492b-8e3f-1f3cc24d03c8',
        'Tiền điện': 'c9579dd0-8df4-4a10-bfbc-bb6d2ae2d5d1',
        'Tiền nước': 'dbcd49a9-d29b-4251-a873-c071dd607be9',
        'Đi lại': '1d3008c5-ced4-42b4-83bc-8e48de39beef',
        'Phí liên lạc': 'cc463e76-ee63-45aa-89df-2421b9a975bc',
        'Tiền nhà': 'caf25ca0-9362-4f84-8067-04f7f048c0da',
        'Tiền lương': 'fb68376a-b6a5-4a3d-aede-5f1f95fdbbcd',
        'Thưởng': '8df56f82-8f37-4093-bea0-339172844f4e',
        'Đầu tư': '264ec812-7b1b-4b4a-a95f-2cdf9a04790d',
        'Thu nhập phụ': 'c9787fb7-6e16-494e-8796-bfb4a171c243'
    },
    B: {
        'Ăn uống': 'fb0b92dc-14ab-44ed-8778-88b2cf3ac86c',
        'Chi tiêu hàng ngày': 'bf4b3f4f-ccbd-4442-a28b-9cb75f3cf02d',
        'Quần áo': '842632e8-0945-40ff-abef-e71822934b1c',
        'Mỹ phẩm': '37218eca-aab2-455f-93c1-84276de5d7ef',
        'Phí giao lưu': 'c5de9484-4952-4ae2-98b3-adf8c63c0f6f',
        'Y tế': 'a03aec28-e9fe-41b1-b5fd-d36ec8bc9b43',
        'Giáo dục': 'dec385d1-d0f4-4817-b5b9-6116c143771a',
        'Tiền điện': '03243dce-67c1-4322-a652-71b4e255a5e8',
        'Tiền nước': '378b588f-965b-44e9-9e97-79665d40d3b3',
        'Đi lại': 'ccd04617-8436-40a4-bb6b-1cf3d84c952c',
        'Phí liên lạc': '066a5bdd-9879-4454-9dfe-da08f6d237e9',
        'Tiền nhà': '8cf4a1e2-5da7-4f1b-a4bb-143ba3060c66',
        'Tiền lương': '68bba8c0-227a-4c88-857c-700900475da4',
        'Thưởng': '06409fbe-2b61-41e1-ab65-3e28478a83ac',
        'Đầu tư': '6dcb9330-7903-493f-b1f4-0d0fd5b058a9',
        'Thu nhập phụ': 'c5be59e3-6815-46a0-bc4f-a938db2f50f7'
    },
    C: {
        'Ăn uống': '0f8913c3-c7d2-4342-ae1e-7bac5a64a751',
        'Chi tiêu hàng ngày': '258097ea-58d8-446b-9970-74463b7a22a1',
        'Quần áo': 'ae7ccf57-bac6-47ee-aeb1-c217d25c7851',
        'Mỹ phẩm': '8426223f-c68a-43e9-861b-5a38b7202765',
        'Phí giao lưu': '1c019cdf-36d0-4379-90f1-550f62813ecd',
        'Y tế': 'c1b74116-8284-47c8-b24b-4370c2846abc',
        'Giáo dục': '27a12623-0945-446c-8c63-0c9da180d67f',
        'Tiền điện': 'c0e7014e-494f-4ad9-bf56-5d782b3f6c08',
        'Tiền nước': '6997130a-9b28-4a6c-b4a8-d87a0c2f82b0',
        'Đi lại': '176e3f9b-e40f-41e9-99ea-54c9f85564c7',
        'Phí liên lạc': '82e236d8-a0dc-4fbe-8b18-97a70d85149c',
        'Tiền nhà': '1b17c347-fc68-419e-aa7c-f48ee5f22376',
        'Tiền lương': '72d49134-5338-4c93-8981-d9835bf9d0d3',
        'Thưởng': '51545387-f36a-4223-8156-bd0b3f4f0daf',
        'Đầu tư': 'dea4ff36-c926-4604-ac17-3a96a564e504',
        'Thu nhập phụ': '164e27c1-4e38-42bf-a821-3929eada454c'
    },
    D: {
        'Ăn uống': '856852da-51f2-4930-afb6-18b78f0ad355',
        'Chi tiêu hàng ngày': '99c5a679-324f-49ea-8ca9-765786dd7e58',
        'Quần áo': 'ea975841-a4b3-4efc-9a49-688615b67da5',
        'Mỹ phẩm': '875003f6-fe16-4d3e-bac6-539e560f72be',
        'Phí giao lưu': '8f947502-2bec-4641-b69c-e49ab8fa3727',
        'Y tế': '76de6c5d-9c8a-426d-bc45-1797faec8ae3',
        'Giáo dục': '446de72b-d80d-430d-afcd-861a33b3b400',
        'Tiền điện': 'ef79a37b-7563-4867-86d3-9492b4bef906',
        'Tiền nước': '98cb4ade-1215-4fe4-a15c-046679be6d5d',
        'Đi lại': 'ae1c37dd-9ddb-447e-9d82-6376b5cebf9f',
        'Phí liên lạc': '0399e491-e565-48b0-9082-f1d3fad42e24',
        'Tiền nhà': 'b5e4b7ea-a13e-488f-8acd-9a2a81af2cd9',
        'Tiền lương': '67deaa48-605c-4647-bcde-42fa33f96335',
        'Thưởng': 'dca5f994-0190-42e3-a3a0-045d241c1ca4',
        'Đầu tư': '569ae6f9-2913-4579-b47e-146e51e957f5',
        'Thu nhập phụ': '4c55d42c-55f8-4bf3-8605-2bb9a246ffe1'
    },
    E: {
        'Ăn uống': '0f788db1-5287-4446-8fff-eeaabc6e6da2',
        'Chi tiêu hàng ngày': 'dc9fdbc9-1bfd-4465-a8f9-bd8012671a59',
        'Quần áo': 'df5d092e-249b-4776-b0e2-672e217ababc',
        'Mỹ phẩm': '5a68b8a3-41d0-42db-9e33-8b4eff10fb12',
        'Phí giao lưu': '233f62b2-c733-43db-9b51-d09e8bfb263a',
        'Y tế': '29656d5d-3751-4a8c-b363-075ebe0c90f5',
        'Giáo dục': 'f0c25b53-1d98-48bf-839d-87fc802585ab',
        'Tiền điện': '7fb76725-2a97-46af-8066-8a441c427663',
        'Tiền nước': '5e6cba60-d720-4fa2-acce-6bb23f83f4ce',
        'Đi lại': 'e2b60b94-3ab0-43eb-85f9-6608ae1ac592',
        'Phí liên lạc': 'bf6b86bd-9921-45b2-b425-ba82d8df5285',
        'Tiền nhà': '69b1d6b6-fa44-4107-ae7f-7113c19ab238',
        'Tiền lương': '898df343-dc04-4e60-bd17-f71ad5957b43',
        'Thưởng': '2c5add84-cbae-45b0-a0ff-1a5e399cb340',
        'Đầu tư': '1a1132c3-8c05-4e83-8803-3a32e331068a',
        'Thu nhập phụ': '9551626f-4853-47d7-af76-a1eca6ab4fe7'
    }
};

const PAYEES = {
    A: {
        'Chủ nhà': 'c7e7c234-bacd-4b9b-b10f-beaf7a1765f7',
        'EVN': '113dffa1-2b4e-48ba-9d0e-7be08650b069',
        'Sawaco': '79fc09df-651c-4f30-b27e-8d6a4edb5c87',
        'Viettel': '75947046-1f29-41a4-bf33-c5d984ca0a3f',
        'WinMart': 'b9085825-855c-404c-9ee0-01aced40f6ea',
        'FPT': '327ea2b8-9ac3-4706-9311-830237b01795',
        'CarePlus': 'd7ae301d-1c96-45b3-bd61-a59658cb0050',
    },
    B: {
        'Chủ nhà': '9d5eadee-9798-44a2-af74-1bbdd7161724',
        'EVN': '129ca5db-e484-475b-80a5-143e427ad387',
        'Sawaco': 'cdc76806-cd67-410c-ba1e-1ed3bf25e885',
        'Viettel': 'dc17cb9d-f43b-4895-9a7e-ae721e076589',
        'WinMart': '0e883937-2484-4fa2-b141-722a6c595da3',
        'FPT': 'd74c114f-efa3-489e-8911-f8a86e98e12b',
        'CarePlus': 'e03d3b1a-faa6-4a59-92d7-05b221f5b3c6',
    },
    C: {
        'Chủ nhà': '380d779e-a8ae-4b4e-92d1-70406478d5be',
        'EVN': 'c3317ecb-3206-4692-82ba-5a46110e8c4e',
        'Sawaco': '5bb599cf-49c4-4c7c-b657-73a5c8a0b244',
        'Viettel': '0d5dc1ba-75f2-40c4-a922-707bf56e0519',
        'WinMart': 'ed8a2718-68f3-49de-8a60-2ef2391f7186',
        'FPT': '9011fdbb-ff75-4981-8177-462d32f71196',
        'CarePlus': 'e0b018cc-372e-4c3f-b828-fb4f1b501e75',
    },
    D: {
        'Chủ nhà': '82b5ae9c-a57c-40e1-8658-73c0f7ec35bc',
        'EVN': '5a028f1c-c6c7-40d6-a768-6155bedc7fdc',
        'Sawaco': '63d3b878-4115-4bab-9478-f26179f7f19b',
        'Viettel': '0e99c1e1-90f1-487f-b25e-7dd7f1aaf19f',
        'WinMart': 'dbf05452-bf9f-4f11-b8ee-e636a1b24d05',
        'FPT': '168c8a35-f064-49d5-b749-11ddd99eff95',
        'CarePlus': 'cc632f71-08f2-4a80-bbc6-694f665cc0cf',
    },
    E: {
        'Chủ nhà': '4a8b31e4-3036-432f-bd48-0549c7a268c8',
        'EVN': 'd6f332cf-8ae7-4035-bfcb-d53a065bd84e',
        'Sawaco': '92ba93be-3406-49cb-9f29-43c199703221',
        'Viettel': '87da7769-0bba-4274-baee-5f52fe3257e9',
        'WinMart': '504df996-9eb1-4250-8eaf-6a3d25946735',
        'FPT': '2823a576-e8dd-4d57-89d5-e959a347cc8a',
        'CarePlus': '985b4be5-0bd1-44ed-8e89-032a7c4b13a5',
    }
};

const BUDGET_PAYEE_INFO = {
    A: {
        'Y tế':        ['970432', '888899990000_nguyenvana', 'CAREPLUS CLINIC', 'd7ae301d-1c96-45b3-bd61-a59658cb0050'],
        'Giáo dục':    ['970423', '00008888123_nguyenvana', 'FPT EDUCATION', '327ea2b8-9ac3-4706-9311-830237b01795'],
        'Tiền điện':   ['970436', '1012345678_nguyenvana', 'EVN HCMC', '113dffa1-2b4e-48ba-9d0e-7be08650b069'],
        'Tiền nước':   ['970418', '110022334455_nguyenvana', 'SAWACO HCMC', '79fc09df-651c-4f30-b27e-8d6a4edb5c87'],
        'Phí liên lạc':['970407', '19033338888_nguyenvana', 'VIETTEL TELECOM', '75947046-1f29-41a4-bf33-c5d984ca0a3f'],
        'Tiền nhà':    ['970407', '6617052004', 'NGUYEN VAN B', 'c7e7c234-bacd-4b9b-b10f-beaf7a1765f7'],
    },
    B: {
        'Y tế':        ['970432', '888899990000_nguyenvanb', 'CAREPLUS CLINIC', 'e03d3b1a-faa6-4a59-92d7-05b221f5b3c6'],
        'Giáo dục':    ['970423', '00008888123_nguyenvanb', 'FPT EDUCATION', 'd74c114f-efa3-489e-8911-f8a86e98e12b'],
        'Tiền điện':   ['970436', '1012345678_nguyenvanb', 'EVN HCMC', '129ca5db-e484-475b-80a5-143e427ad387'],
        'Tiền nước':   ['970418', '110022334455_nguyenvanb', 'SAWACO HCMC', 'cdc76806-cd67-410c-ba1e-1ed3bf25e885'],
        'Phí liên lạc':['970407', '19033338888_nguyenvanb', 'VIETTEL TELECOM', 'dc17cb9d-f43b-4895-9a7e-ae721e076589'],
        'Tiền nhà':    ['970422', '0988776655_nguyenvanb', 'NGUYEN VAN CHU NHA', '9d5eadee-9798-44a2-af74-1bbdd7161724'],
    },
    C: {
        'Y tế':        ['970432', '888899990000_nguyenvanc', 'CAREPLUS CLINIC', 'e0b018cc-372e-4c3f-b828-fb4f1b501e75'],
        'Giáo dục':    ['970423', '00008888123_nguyenvanc', 'FPT EDUCATION', '9011fdbb-ff75-4981-8177-462d32f71196'],
        'Tiền điện':   ['970436', '1012345678_nguyenvanc', 'EVN HCMC', 'c3317ecb-3206-4692-82ba-5a46110e8c4e'],
        'Tiền nước':   ['970418', '110022334455_nguyenvanc', 'SAWACO HCMC', '5bb599cf-49c4-4c7c-b657-73a5c8a0b244'],
        'Phí liên lạc':['970407', '19033338888_nguyenvanc', 'VIETTEL TELECOM', '0d5dc1ba-75f2-40c4-a922-707bf56e0519'],
        'Tiền nhà':    ['970422', '0988776655_nguyenvanc', 'NGUYEN VAN CHU NHA', '380d779e-a8ae-4b4e-92d1-70406478d5be'],
    },
    D: {
        'Y tế':        ['970432', '888899990000_phamvand', 'CAREPLUS CLINIC', 'cc632f71-08f2-4a80-bbc6-694f665cc0cf'],
        'Giáo dục':    ['970423', '00008888123_phamvand', 'FPT EDUCATION', '168c8a35-f064-49d5-b749-11ddd99eff95'],
        'Tiền điện':   ['970436', '1012345678_phamvand', 'EVN HCMC', '5a028f1c-c6c7-40d6-a768-6155bedc7fdc'],
        'Tiền nước':   ['970418', '110022334455_phamvand', 'SAWACO HCMC', '63d3b878-4115-4bab-9478-f26179f7f19b'],
        'Phí liên lạc':['970407', '19033338888_phamvand', 'VIETTEL TELECOM', '0e99c1e1-90f1-487f-b25e-7dd7f1aaf19f'],
        'Tiền nhà':    ['970422', '0988776655_phamvand', 'NGUYEN VAN CHU NHA', '82b5ae9c-a57c-40e1-8658-73c0f7ec35bc'],
    },
    E: {
        'Y tế':        ['970432', '888899990000_hoangthie', 'CAREPLUS CLINIC', '985b4be5-0bd1-44ed-8e89-032a7c4b13a5'],
        'Giáo dục':    ['970423', '00008888123_hoangthie', 'FPT EDUCATION', '2823a576-e8dd-4d57-89d5-e959a347cc8a'],
        'Tiền điện':   ['970436', '1012345678_hoangthie', 'EVN HCMC', 'd6f332cf-8ae7-4035-bfcb-d53a065bd84e'],
        'Tiền nước':   ['970418', '110022334455_hoangthie', 'SAWACO HCMC', '92ba93be-3406-49cb-9f29-43c199703221'],
        'Phí liên lạc':['970407', '19033338888_hoangthie', 'VIETTEL TELECOM', '87da7769-0bba-4274-baee-5f52fe3257e9'],
        'Tiền nhà':    ['970422', '0988776655_hoangthie', 'NGUYEN VAN CHU NHA', '4a8b31e4-3036-432f-bd48-0549c7a268c8'],
    }
};

const BUDGET_TEMPLATES = [
    ['Ngân sách Ăn uống',           'Ăn uống',           2000000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Chi tiêu hàng ngày','Chi tiêu hàng ngày', 1500000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Quần áo',           'Quần áo',           1000000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Mỹ phẩm',           'Mỹ phẩm',            500000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Phí giao lưu',      'Phí giao lưu',      1500000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Y tế',              'Y tế',               500000, 'BILL',     true,  20, true],
    ['Ngân sách Giáo dục',          'Giáo dục',          1000000, 'BILL',     true,  15, true],
    ['Ngân sách Tiền điện',         'Tiền điện',          750000, 'BILL',     true,  10, true],
    ['Ngân sách Tiền nước',         'Tiền nước',          165000, 'BILL',     true,  14, true],
    ['Ngân sách Đi lại',            'Đi lại',             800000, 'FLEXIBLE', false, 28, false],
    ['Ngân sách Phí liên lạc',      'Phí liên lạc',       200000, 'BILL',     true,  12, true],
    ['Ngân sách Tiền nhà',          'Tiền nhà',          2500000, 'BILL',     true,   5, true],
];

function generateBudgetsForUserMonth(userKey, month, year, createdAt) {
    const user = USERS[userKey];
    const catMap = CATS[userKey];
    const payeeMap = BUDGET_PAYEE_INFO[userKey];
    const rows = [];

    for (const [name, catName, limit, type, isMandatory, dueDay, hasPayee] of BUDGET_TEMPLATES) {
        let budgetName = name;
        let limitAmt = limit;
        if (userKey === 'A' && catName === 'Tiền nhà') {
            budgetName = 'Tiền nhà phòng trọ (B Techcombank)';
            limitAmt = 1800000;
        } else if (userKey === 'E' && catName === 'Tiền nhà') {
            limitAmt = 1200000;
        }

        const catId = catMap[catName];
        let payeeBin = 'NULL', payeeAcc = 'NULL', payeeName = 'NULL', payeeId = 'NULL';
        if (hasPayee && payeeMap && payeeMap[catName]) {
            const [pBin, pAcc, pName, pId] = payeeMap[catName];
            payeeBin = `'${pBin}'`;
            payeeAcc = `'${pAcc}'`;
            payeeName = `'${pName}'`;
            payeeId = `'${pId}'`;
        }

        rows.push(`('${uid()}', '${budgetName}', '${user.id}', '${catId}', ${limitAmt}, ${month}, ${year}, '${type}', true, ${dueDay}, ${isMandatory}, ${payeeBin}, ${payeeAcc}, ${payeeName}, ${payeeId}, '${createdAt}')`);
    }
    return rows;
}

function generateTransactionsForUserMonth(userKey, month, year) {
    const user = USERS[userKey];
    const walletId = WALLETS[userKey].main;
    const catMap = CATS[userKey];
    const payeeMap = PAYEES[userKey];
    const rows = [];
    const mStr = String(month).padStart(2, '0');

    // 1. Income: Salary on day 5
    let salary = 12000000;
    if (userKey === 'A') salary = 14400000;
    else if (userKey === 'C') salary = 13500000;
    else if (userKey === 'D') salary = 11000000;
    else if (userKey === 'E') salary = 10000000;

    rows.push(`('${uid()}', '${walletId}', ${salary}, 'INCOME', '${catMap['Tiền lương']}', NULL, '${payeeMap['Chủ nhà']}', '${year}-${mStr}-05 08:30:00', 'Nhận lương tháng ${mStr}/${year}', false, false, false, '${year}-${mStr}-05 08:30:00')`);

    // Quarterly Bonus (Months 3, 6, 9, 12)
    if ([3, 6, 9, 12].includes(month)) {
        const bonus = (userKey === 'A' ? 1500000 : 1200000);
        rows.push(`('${uid()}', '${walletId}', ${bonus}, 'INCOME', '${catMap['Thưởng']}', NULL, '${payeeMap['Chủ nhà']}', '${year}-${mStr}-25 17:00:00', 'Thưởng hiệu suất Quý tháng ${mStr}/${year}', false, false, false, '${year}-${mStr}-25 17:00:00')`);
    }

    // 2. Rent on day 5
    let rent = (userKey === 'A' ? 1800000 : (userKey === 'E' ? 1200000 : 2500000));
    rows.push(`('${uid()}', '${walletId}', ${rent}, 'EXPENSE', '${catMap['Tiền nhà']}', NULL, '${payeeMap['Chủ nhà']}', '${year}-${mStr}-05 10:00:00', 'Thanh toán tiền phòng trọ tháng ${mStr}', false, false, false, '${year}-${mStr}-05 10:00:00')`);

    // 3. Electricity on day 10
    const elec = Math.floor(400000 + (Math.sin(month * 1.5) * 150000 + 100000));
    rows.push(`('${uid()}', '${walletId}', ${elec}, 'EXPENSE', '${catMap['Tiền điện']}', NULL, '${payeeMap['EVN']}', '${year}-${mStr}-10 14:00:00', 'Thanh toán tiền điện EVN T${mStr}', false, false, false, '${year}-${mStr}-10 14:00:00')`);

    // 4. Water on day 12
    const water = Math.floor(100000 + (Math.cos(month) * 30000 + 20000));
    rows.push(`('${uid()}', '${walletId}', ${water}, 'EXPENSE', '${catMap['Tiền nước']}', NULL, '${payeeMap['Sawaco']}', '${year}-${mStr}-12 11:30:00', 'Thanh toán tiền nước Sawaco T${mStr}', false, false, false, '${year}-${mStr}-12 11:30:00')`);

    // 5. Phone on day 11
    const phone = 90000;
    rows.push(`('${uid()}', '${walletId}', ${phone}, 'EXPENSE', '${catMap['Phí liên lạc']}', NULL, '${payeeMap['Viettel']}', '${year}-${mStr}-11 09:30:00', 'Cước 4G Viettel tháng ${mStr}', false, false, false, '${year}-${mStr}-11 09:30:00')`);

    // 6. Food transactions
    rows.push(`('${uid()}', '${walletId}', 145000, 'EXPENSE', '${catMap['Ăn uống']}', NULL, '${payeeMap['WinMart']}', '${year}-${mStr}-08 12:30:00', 'Bún bò Huế & Nước mía', false, false, false, '${year}-${mStr}-08 12:30:00')`);
    rows.push(`('${uid()}', '${walletId}', 180000, 'EXPENSE', '${catMap['Ăn uống']}', NULL, '${payeeMap['WinMart']}', '${year}-${mStr}-18 19:15:00', 'KFC Gà rán giòn cay & Burger', false, false, false, '${year}-${mStr}-18 19:15:00')`);
    rows.push(`('${uid()}', '${walletId}', 95000, 'EXPENSE', '${catMap['Ăn uống']}', NULL, '${payeeMap['WinMart']}', '${year}-${mStr}-23 07:45:00', 'Cà phê sáng Highlands Coffee', false, false, false, '${year}-${mStr}-23 07:45:00')`);

    // 7. Transport / Daily spending
    rows.push(`('${uid()}', '${walletId}', 65000, 'EXPENSE', '${catMap['Đi lại']}', NULL, '${payeeMap['WinMart']}', '${year}-${mStr}-14 18:00:00', 'GrabBike di chuyển công việc', false, false, false, '${year}-${mStr}-14 18:00:00')`);
    rows.push(`('${uid()}', '${walletId}', 220000, 'EXPENSE', '${catMap['Chi tiêu hàng ngày']}', NULL, '${payeeMap['WinMart']}', '${year}-${mStr}-20 20:10:00', 'Siêu thị WinMart - Nhu yếu phẩm gia đình', false, false, false, '${year}-${mStr}-20 20:10:00')`);

    // 8. Health / Personal
    if (month % 2 === 0) {
        rows.push(`('${uid()}', '${walletId}', 120000, 'EXPENSE', '${catMap['Y tế']}', NULL, '${payeeMap['CarePlus']}', '${year}-${mStr}-16 16:30:00', 'Nhà thuốc Pharmacity - Vitamin & C sủi', false, false, false, '${year}-${mStr}-16 16:30:00')`);
    }

    return rows;
}

// Generate new User B budgets for 09/2025 -> 04/2026
const newBudgets = [];
for (let m = 9; m <= 12; m++) {
    newBudgets.push(...generateBudgetsForUserMonth('B', m, 2025, '2025-09-01 08:00:00'));
}
for (let m = 1; m <= 4; m++) {
    newBudgets.push(...generateBudgetsForUserMonth('B', m, 2026, '2025-09-01 08:00:00'));
}

// Generate September 2026 budgets for ALL 5 USERS
for (const uKey of ['A', 'B', 'C', 'D', 'E']) {
    const created = (uKey === 'A' ? '2022-01-01 08:00:00' : '2026-01-01 08:00:00');
    newBudgets.push(...generateBudgetsForUserMonth(uKey, 9, 2026, created));
}

// Generate new User B transactions for 09/2025 -> 04/2026
const newTransactions = [];
for (let m = 9; m <= 12; m++) {
    newTransactions.push(...generateTransactionsForUserMonth('B', m, 2025));
}
for (let m = 1; m <= 4; m++) {
    newTransactions.push(...generateTransactionsForUserMonth('B', m, 2026));
}

// Generate September 2026 transactions for ALL 5 USERS (at 01/09/2026)
// User A: Salary + Rent + CarePlus on 01/09/2026
newTransactions.push(
    `('${uid()}', '${WALLETS.A.main}', 14400000, 'INCOME', '${CATS.A['Tiền lương']}', NULL, '${PAYEES.A['Chủ nhà']}', '2026-09-01 08:00:00', 'Nhận lương tháng 09/2026', false, false, false, '2026-09-01 08:00:00')`,
    `('${uid()}', '${WALLETS.A.main}', 1800000, 'EXPENSE', '${CATS.A['Tiền nhà']}', NULL, '${PAYEES.A['Chủ nhà']}', '2026-09-01 09:00:00', 'Thanh toán tiền phòng trọ tháng 09', false, false, false, '2026-09-01 09:00:00')`,
    `('${uid()}', '${WALLETS.A.main}', 500000, 'EXPENSE', '${CATS.A['Y tế']}', NULL, '${PAYEES.A['CarePlus']}', '2026-09-01 10:15:00', 'CarePlus Clinic - Khám sức khỏe định kỳ & Thuốc bổ', false, false, false, '2026-09-01 10:15:00')`
);

// User B: Salary + Rent + Bun bo on 01/09/2026
newTransactions.push(
    `('${uid()}', '${WALLETS.B.main}', 12000000, 'INCOME', '${CATS.B['Tiền lương']}', NULL, '${PAYEES.B['Chủ nhà']}', '2026-09-01 08:00:00', 'Nhận lương tháng 09/2026', false, false, false, '2026-09-01 08:00:00')`,
    `('${uid()}', '${WALLETS.B.main}', 2500000, 'EXPENSE', '${CATS.B['Tiền nhà']}', NULL, '${PAYEES.B['Chủ nhà']}', '2026-09-01 09:00:00', 'Thanh toán tiền phòng trọ tháng 09', false, false, false, '2026-09-01 09:00:00')`,
    `('${uid()}', '${WALLETS.B.main}', 55000, 'EXPENSE', '${CATS.B['Ăn uống']}', NULL, '${PAYEES.B['WinMart']}', '2026-09-01 09:30:00', 'Bún bò Huế đặc biệt & Trà đá', false, false, false, '2026-09-01 09:30:00')`
);

// User C: Salary + Rent on 01/09/2026
newTransactions.push(
    `('${uid()}', '${WALLETS.C.main}', 13500000, 'INCOME', '${CATS.C['Tiền lương']}', NULL, '${PAYEES.C['Chủ nhà']}', '2026-09-01 08:00:00', 'Nhận lương tháng 09/2026', false, false, false, '2026-09-01 08:00:00')`,
    `('${uid()}', '${WALLETS.C.main}', 2200000, 'EXPENSE', '${CATS.C['Tiền nhà']}', NULL, '${PAYEES.C['Chủ nhà']}', '2026-09-01 09:00:00', 'Thanh toán tiền phòng trọ tháng 09', false, false, false, '2026-09-01 09:00:00')`
);

// User D: Salary + Rent on 01/09/2026
newTransactions.push(
    `('${uid()}', '${WALLETS.D.main}', 11000000, 'INCOME', '${CATS.D['Tiền lương']}', NULL, '${PAYEES.D['Chủ nhà']}', '2026-09-01 08:00:00', 'Nhận lương tháng 09/2026', false, false, false, '2026-09-01 08:00:00')`,
    `('${uid()}', '${WALLETS.D.main}', 2000000, 'EXPENSE', '${CATS.D['Tiền nhà']}', NULL, '${PAYEES.D['Chủ nhà']}', '2026-09-01 09:00:00', 'Thanh toán tiền phòng trọ tháng 09', false, false, false, '2026-09-01 09:00:00')`
);

// User E: Salary + Rent on 01/09/2026
newTransactions.push(
    `('${uid()}', '${WALLETS.E.main}', 10000000, 'INCOME', '${CATS.E['Tiền lương']}', NULL, '${PAYEES.E['Chủ nhà']}', '2026-09-01 08:00:00', 'Nhận lương tháng 09/2026', false, false, false, '2026-09-01 08:00:00')`,
    `('${uid()}', '${WALLETS.E.main}', 1200000, 'EXPENSE', '${CATS.E['Tiền nhà']}', NULL, '${PAYEES.E['Chủ nhà']}', '2026-09-01 09:00:00', 'Thanh toán tiền phòng trọ tháng 09', false, false, false, '2026-09-01 09:00:00')`
);

// Format new budgets and transactions SQL blocks
const newBudgetsSQL = `,\n` + newBudgets.join(',\n');
const newTxnSQL = `,\n` + newTransactions.join(',\n');

// Replace in v18Content:
let v19Content = v18Content;

// 1. Header update
v19Content = v19Content.replace(
    '-- SHAREMONEY DATABASE SEED SCRIPT - GENERATION V18 (PRODUCTION LIVE SEED)',
    '-- SHAREMONEY DATABASE SEED SCRIPT - GENERATION V19 (PRODUCTION LIVE SEED)'
);
v19Content = v19Content.replace(
    '-- Generated Date: 2026-08-27',
    '-- Generated Date: 2026-09-01\n-- Features V19:\n--   ✅ 5 Full Users with Real Data\n--   ✅ User A: 56 Months History (01/2022 -> 09/2026)\n--   ✅ User B: 13 Months History (09/2025 -> 09/2026, satisfies >= 12 months)\n--   ✅ Users C, D, E: Multi-month active data\n--   ✅ Cutoff at Live Date 01/09/2026'
);

// 2. Add savings bank columns to ALTER TABLE statements if not exists
const alterColumnsToAdd = `
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS savings_bank_bin VARCHAR(20);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS savings_bank_account_no VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS savings_bank_account_name VARCHAR(100);
`;
v19Content = v19Content.replace(
    'ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;',
    'ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;' + alterColumnsToAdd
);

// 3. Update User B creation date in users & wallets table
v19Content = v19Content.replace(
    `'1b111111-1111-4111-a111-111111111111', 'nguyenvanb@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn B (Tiêu Lố)', '0901123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', '970407', '6617052004', 'ExponentPushToken[mock_user_b_tcb_02]', '2022-01-01 08:00:00'`,
    `'1b111111-1111-4111-a111-111111111111', 'nguyenvanb@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn B (Tiêu Lố)', '0901123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', '970407', '6617052004', 'ExponentPushToken[mock_user_b_tcb_02]', '2025-09-01 08:00:00'`
);

// 4. Update USERS table insert to include savings bank info
const usersInsertV18 = `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, push_token, created_at) VALUES
('1a111111-1111-4111-a111-111111111111', 'nguyenvana@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn A (Thông Thái)', '0900123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', '970422', '6617052004888', 'ExponentPushToken[mock_user_a_mbbank_01]', '2022-01-01 08:00:00'),
('1b111111-1111-4111-a111-111111111111', 'nguyenvanb@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn B (Tiêu Lố)', '0901123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', '970407', '6617052004', 'ExponentPushToken[mock_user_b_tcb_02]', '2025-09-01 08:00:00'),
('1c111111-1111-4111-a111-111111111111', 'nguyenvanc@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn C (Trùm Nhóm)', '0902123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Leo', '970426', '4517052004', 'ExponentPushToken[mock_user_c_msb_03]', '2022-01-01 08:00:00'),
('1d111111-1111-4111-a111-111111111111', 'phamvand@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Phạm Văn D (Con Nợ)', '0903123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Sam', '970418', '10938888999', 'ExponentPushToken[mock_user_d_bidv_04]', '2022-01-01 08:00:00'),
('1e111111-1111-4111-a111-111111111111', 'hoangthie@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Hoàng Thị E (Newbie GenZ)', '0904123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Max', '970423', '10948888999', 'ExponentPushToken[mock_user_e_tpb_05]', '2022-01-01 08:00:00');`;

const usersInsertV19 = `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, bank_account_name, savings_bank_bin, savings_bank_account_no, savings_bank_account_name, push_token, created_at) VALUES
('1a111111-1111-4111-a111-111111111111', 'nguyenvana@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn A (Thông Thái)', '0900123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', '970422', '6617052004888', 'DUONG DUC BAO', '970407', '6617052004', 'DUONG DUC BAO', 'ExponentPushToken[mock_user_a_mbbank_01]', '2022-01-01 08:00:00'),
('1b111111-1111-4111-a111-111111111111', 'nguyenvanb@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn B (Tiêu Lố)', '0901123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', '970407', '6617052004', 'NGUYEN VAN B', '970436', '0011004123456', 'NGUYEN VAN B', 'ExponentPushToken[mock_user_b_tcb_02]', '2025-09-01 08:00:00'),
('1c111111-1111-4111-a111-111111111111', 'nguyenvanc@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn C (Trùm Nhóm)', '0902123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Leo', '970426', '4517052004', 'NGUYEN VAN C', '970436', '0011004123456', 'NGUYEN VAN C', 'ExponentPushToken[mock_user_c_msb_03]', '2026-01-01 08:00:00'),
('1d111111-1111-4111-a111-111111111111', 'phamvand@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Phạm Văn D (Con Nợ)', '0903123456', 'https://api.dicebear.com/7.x/adventurer/png?seed=Sam', '970418', '10938888999', 'PHAM VAN D', '970436', '0011004123456', 'PHAM VAN D', 'ExponentPushToken[mock_user_d_bidv_04]', '2026-01-01 08:00:00'),
('1e111111-1111-4111-a111-111111111111', 'hoangthie@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Hoàng Thị E (Newbie GenZ)', '0904123456', 'https://api.dicebear.com/7.x/bottts/png?seed=Max', '970423', '10948888999', 'HOANG THI E', '970436', '0011004123456', 'HOANG THI E', 'ExponentPushToken[mock_user_e_tpb_05]', '2026-01-01 08:00:00');`;

v19Content = v19Content.replace(usersInsertV18, usersInsertV19);

// 5. Append new budgets before notifications insert
const lastBudgetLine = `('5ba7a88d-7a83-49d0-93ad-b2e8971ec805', 'Ngân sách Tiền nhà', '1e111111-1111-4111-a111-111111111111', '69b1d6b6-fa44-4107-ae7f-7113c19ab238', 1200000, 8, 2026, 'BILL', true, 5, true, '970422', '0988776655_hoangthie', 'NGUYEN VAN CHU NHA', '4a8b31e4-3036-432f-bd48-0549c7a268c8', '2026-01-01 08:00:00');`;

v19Content = v19Content.replace(
    lastBudgetLine,
    lastBudgetLine.replace(';', '') + newBudgetsSQL + ';'
);

// 6. Append new transactions before PAYMENT_ORDERS
const lastTxnLine = `('e21778d9-5c17-4ce6-a5a6-3657339396dd', '2e111111-1111-4111-a111-111111111111', 136000, 'EXPENSE', '233f62b2-c733-43db-9b51-d09e8bfb263a', '9a9caa03-e403-4ea2-b202-1eb7c48b46d7', '985b4be5-0bd1-44ed-8e89-032a7c4b13a5', '2026-08-10 12:43:00', 'Xem phim CGV Cinema - Vé 2D & bắp', false, false, false, '2026-08-10 12:43:00');`;

v19Content = v19Content.replace(
    lastTxnLine,
    lastTxnLine.replace(';', '') + newTxnSQL + ';'
);

// Write to seed_v19.sql
const v19Path = path.join(__dirname, 'seed_v19.sql');
fs.writeFileSync(v19Path, v19Content, 'utf8');

console.log(`✅ Successfully generated seed_v19.sql!`);
console.log(`Added ${newBudgets.length} new budgets (User B 09/2025-04/2026 + All users 09/2026)`);
console.log(`Added ${newTransactions.length} new transactions (User B 13 months + All users 01/09/2026)`);
console.log(`Total lines: ${v19Content.split('\n').length}`);
