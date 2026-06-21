package com.example.sharemoney.repository;

import com.example.sharemoney.entity.ExternalLoan;
import com.example.sharemoney.entity.LoanType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExternalLoanRepository extends JpaRepository<ExternalLoan, UUID> {
    List<ExternalLoan> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT SUM(e.principalAmount) FROM ExternalLoan e WHERE e.user.id = :userId AND e.type = :type AND e.isSettled = false")
    BigDecimal sumUnsettledAmountByUserIdAndType(@Param("userId") UUID userId, @Param("type") LoanType type);
}
