package com.example.sharemoney.repository;

import com.example.sharemoney.entity.PaymentOrder;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, UUID> {
    Optional<PaymentOrder> findByTxnRef(String txnRef);

    boolean existsByTxnRef(String txnRef);
}
