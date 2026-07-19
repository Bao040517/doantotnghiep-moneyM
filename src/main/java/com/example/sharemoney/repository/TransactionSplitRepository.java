package com.example.sharemoney.repository;

import com.example.sharemoney.entity.TransactionSplit;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionSplitRepository extends JpaRepository<TransactionSplit, UUID> {}
