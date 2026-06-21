DO $$
DECLARE
    user_tuan UUID := '11111111-1111-1111-1111-111111111111';
    user_hai UUID := '22222222-2222-2222-2222-222222222222';
    user_linh UUID := '33333333-3333-3333-3333-333333333333';
    user_trang UUID := '44444444-4444-4444-4444-444444444444';
    
    group_id UUID := '55555555-5555-5555-5555-555555555555';
    
    exp1 UUID := '66666666-6666-6666-6666-666666666661';
    exp2 UUID := '66666666-6666-6666-6666-666666666662';
    exp3 UUID := '66666666-6666-6666-6666-666666666663';
    exp4 UUID := '66666666-6666-6666-6666-666666666664';
    exp5 UUID := '66666666-6666-6666-6666-666666666665';
    
    valid_password_hash VARCHAR;
BEGIN
    SELECT password_hash INTO valid_password_hash FROM users LIMIT 1;
    
    -- Nếu DB hoàn toàn trống (bạn chưa đăng ký user nào), gán tạm mật khẩu là "123456"
    IF valid_password_hash IS NULL THEN
        valid_password_hash := '$2a$10$JK.LkTuYSB91yV/z7EBHIOhX2Fbnmym1IohIjUFKF0dQwHPfXdfsC';
    END IF;

    TRUNCATE TABLE expense_splits, expenses, payments, notifications, group_members, groups CASCADE;
    DELETE FROM users WHERE id IN (user_tuan, user_hai, user_linh, user_trang);

    INSERT INTO users (id, name, email, password_hash, avatar_url, created_at) VALUES
    (user_tuan, 'Tuấn (Chủ nhóm)', 'tuan@demo.com', valid_password_hash, 'https://ui-avatars.com/api/?name=Tuan&background=0D8ABC&color=fff', NOW()),
    (user_hai, 'Hải Đăng', 'hai@demo.com', valid_password_hash, 'https://ui-avatars.com/api/?name=Hai&background=10B981&color=fff', NOW()),
    (user_linh, 'Thùy Linh', 'linh@demo.com', valid_password_hash, 'https://ui-avatars.com/api/?name=Linh&background=F43F5E&color=fff', NOW()),
    (user_trang, 'Thu Trang', 'trang@demo.com', valid_password_hash, 'https://ui-avatars.com/api/?name=Trang&background=8B5CF6&color=fff', NOW());

    INSERT INTO groups (id, name, description, created_by, created_at) VALUES
    (group_id, 'Phượt Đà Lạt (Đồ án)', 'Chuyến đi bảo vệ đồ án', user_tuan, NOW());

    INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES
    (gen_random_uuid(), group_id, user_tuan, 'ADMIN', NOW()),
    (gen_random_uuid(), group_id, user_hai, 'MEMBER', NOW()),
    (gen_random_uuid(), group_id, user_linh, 'MEMBER', NOW()),
    (gen_random_uuid(), group_id, user_trang, 'MEMBER', NOW());

    -- Hoa don 1
    INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
    (exp1, group_id, user_tuan, 'Vé máy bay', 4000000, 'Di chuyển', NOW() - INTERVAL '5 days');
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
    (gen_random_uuid(), exp1, user_tuan, 1000000, false), (gen_random_uuid(), exp1, user_hai, 1000000, false),
    (gen_random_uuid(), exp1, user_linh, 1000000, false), (gen_random_uuid(), exp1, user_trang, 1000000, false);

    -- Hoa don 2
    INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
    (exp2, group_id, user_hai, 'Khách sạn', 3000000, 'Lưu trú', NOW() - INTERVAL '4 days');
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
    (gen_random_uuid(), exp2, user_tuan, 750000, false), (gen_random_uuid(), exp2, user_hai, 750000, false),
    (gen_random_uuid(), exp2, user_linh, 750000, false), (gen_random_uuid(), exp2, user_trang, 750000, false);

    -- Hoa don 3
    INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
    (exp3, group_id, user_linh, 'Ăn tối Lẩu', 1200000, 'Ăn uống', NOW() - INTERVAL '3 days');
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
    (gen_random_uuid(), exp3, user_tuan, 300000, false), (gen_random_uuid(), exp3, user_hai, 300000, false),
    (gen_random_uuid(), exp3, user_linh, 300000, false), (gen_random_uuid(), exp3, user_trang, 300000, false);

    -- Hoa don 4
    INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
    (exp4, group_id, user_trang, 'Thuê xe máy', 600000, 'Di chuyển', NOW() - INTERVAL '2 days');
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
    (gen_random_uuid(), exp4, user_tuan, 150000, false), (gen_random_uuid(), exp4, user_hai, 150000, false),
    (gen_random_uuid(), exp4, user_linh, 150000, false), (gen_random_uuid(), exp4, user_trang, 150000, false);

    -- Hoa don 5
    INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
    (exp5, group_id, user_tuan, 'Mua quà', 400000, 'Khác', NOW() - INTERVAL '1 days');
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
    (gen_random_uuid(), exp5, user_tuan, 100000, false), (gen_random_uuid(), exp5, user_hai, 100000, false),
    (gen_random_uuid(), exp5, user_linh, 100000, false), (gen_random_uuid(), exp5, user_trang, 100000, false);

END $$;
