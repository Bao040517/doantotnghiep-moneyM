package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Payee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayeeRepository extends JpaRepository<Payee, UUID> {
    List<Payee> findByUser_Id(UUID userId);
    Optional<Payee> findByUser_IdAndName(UUID userId, String name);
}
