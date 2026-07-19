package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Payment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByGroup_Id(UUID groupId);

    List<Payment> findByPayer_IdOrReceiver_Id(UUID payerId, UUID receiverId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.receiver.id = :userId AND p.status = :status")
    java.math.BigDecimal sumAmountByReceiverIdAndStatus(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("status") String status);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.payer.id = :userId AND p.status = :status")
    java.math.BigDecimal sumAmountByPayerIdAndStatus(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("status") String status);

    List<Payment> findByPayer_IdAndStatus(UUID payerId, String status);

    // BE-2: Top1 derived queries — DB does the MIN/MAX, not Java stream
    java.util.Optional<Payment> findTop1ByPayer_IdAndStatusOrderByAmountAsc(
            UUID payerId, String status);

    java.util.Optional<Payment> findTop1ByPayer_IdAndStatusOrderByAmountDesc(
            UUID payerId, String status);

    java.util.Optional<Payment> findByGroup_IdAndPayer_IdAndReceiver_IdAndStatus(
            UUID groupId, UUID payerId, UUID receiverId, String status);

    List<Payment> findByGroup_IdAndReceiver_IdAndStatus(
            UUID groupId, UUID receiverId, String status);

    List<Payment> findByGroup_IdAndPayer_IdAndStatus(UUID groupId, UUID payerId, String status);
}
