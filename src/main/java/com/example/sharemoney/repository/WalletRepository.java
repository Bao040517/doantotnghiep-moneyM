package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Wallet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, UUID> {
    List<Wallet> findByUser_Id(UUID userId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(SUM(w.balance), 0) FROM Wallet w WHERE w.user.id = :userId AND (w.isLiability = false OR w.isLiability IS NULL)")
    java.math.BigDecimal sumBalanceByUserId(
            @org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT w FROM Wallet w WHERE w.user.id = :userId AND (w.isLiability = :isLiability OR (:isLiability = false AND w.isLiability IS NULL))")
    List<Wallet> findByUser_IdAndIsLiability(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("isLiability") boolean isLiability);
}
