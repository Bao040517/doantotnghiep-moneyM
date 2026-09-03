package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Expense;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    Page<Expense> findByGroup_IdOrderByCreatedAtDesc(UUID groupId, Pageable pageable);

    boolean existsByTitleContaining(String title);

    long countByGroup_IdAndIsPendingRevisionTrue(UUID groupId);

    @Query("SELECT e.group.id, COUNT(e) FROM Expense e WHERE e.group.id IN :groupIds AND e.isPendingRevision = true GROUP BY e.group.id")
    List<Object[]> countPendingRevisionsByGroupIds(@Param("groupIds") List<UUID> groupIds);
}
