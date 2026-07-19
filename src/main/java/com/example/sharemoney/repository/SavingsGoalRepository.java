package com.example.sharemoney.repository;

import com.example.sharemoney.entity.SavingsGoal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, UUID> {
    List<SavingsGoal> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT SUM(s.currentAmount) FROM SavingsGoal s WHERE s.user.id = :userId")
    java.math.BigDecimal sumCurrentAmountByUserId(@Param("userId") UUID userId);
}
