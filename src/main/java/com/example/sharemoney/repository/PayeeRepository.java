package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Payee;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PayeeRepository extends JpaRepository<Payee, UUID> {

    /** Lấy toàn bộ danh bạ đã lưu, sắp xếp mới nhất trước */
    List<Payee> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    /** Kiểm tra tồn tại theo STK (để upsert — tránh duplicate) */
    Optional<Payee> findByUser_IdAndBankAccount(UUID userId, String bankAccount);

    /** Tìm theo tên gợi nhớ (backward compat) */
    Optional<Payee> findByUser_IdAndName(UUID userId, String name);
}
