package com.example.sharemoney.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseFixer {

    @Autowired private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixDatabaseNulls() {
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS tags ("
                            + "id UUID PRIMARY KEY, "
                            + "user_id UUID, "
                            + "name VARCHAR(255) NOT NULL"
                            + ")");
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS transaction_tags ("
                            + "transaction_id UUID NOT NULL, "
                            + "tag_id UUID NOT NULL, "
                            + "PRIMARY KEY (transaction_id, tag_id)"
                            + ")");
            jdbcTemplate.execute(
                    "UPDATE transactions SET exclude_from_budget = false WHERE exclude_from_budget IS NULL");
            jdbcTemplate.execute(
                    "UPDATE transactions SET is_auto_generated = false WHERE is_auto_generated IS NULL");
            jdbcTemplate.execute("UPDATE transactions SET is_split = false WHERE is_split IS NULL");
            jdbcTemplate.execute(
                    "UPDATE wallets SET is_liability = false WHERE is_liability IS NULL");
            jdbcTemplate.execute(
                    "UPDATE budgets SET is_recurring = false WHERE is_recurring IS NULL");
            jdbcTemplate.execute(
                    "UPDATE budgets SET is_mandatory = false WHERE is_mandatory IS NULL");
            System.out.println("========== DATABASE NULLS & SCHEMAS FIXED ==========");
        } catch (Exception e) {
            System.err.println("Failed to fix database nulls: " + e.getMessage());
        }
    }
}
