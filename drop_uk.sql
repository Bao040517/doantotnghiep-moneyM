DO $$ 
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'budgets' AND tc.constraint_type = 'UNIQUE'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE budgets DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;
