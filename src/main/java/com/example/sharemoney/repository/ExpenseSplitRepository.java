package com.example.sharemoney.repository;

import com.example.sharemoney.entity.ExpenseSplit;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, UUID> {

    List<ExpenseSplit> findByExpense_Id(UUID expenseId);

    /** Lấy các khoản chưa trả của 1 user — dùng cho DebtService */
    List<ExpenseSplit> findByUser_IdAndIsSettledFalse(UUID userId);

    /** Lấy TẤT CẢ splits chưa trả trong 1 nhóm — input chính cho Greedy algorithm */
    List<ExpenseSplit> findByExpense_Group_IdAndIsSettledFalse(UUID groupId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE ExpenseSplit es SET es.isSettled = true WHERE es.expense.group.id = :groupId")
    void markAllAsSettled(@org.springframework.data.repository.query.Param("groupId") UUID groupId);
}
