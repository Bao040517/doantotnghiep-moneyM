package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Expense;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    List<Expense> findByGroup_IdOrderByCreatedAtDesc(UUID groupId);
}
