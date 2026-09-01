package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Budget;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    List<Budget> findByUser_IdAndMonthAndYear(UUID userId, int month, int year);

    List<Budget> findByUser_IdAndCategory_IdAndMonthAndYear(
            UUID userId, UUID categoryId, int month, int year);

    List<Budget> findByUser_IdAndCategory_IdAndMonthAndYearAndName(
            UUID userId, UUID categoryId, int month, int year, String name);

    boolean existsByUser_IdAndCategory_IdAndMonthAndYearAndName(
            UUID userId, UUID categoryId, int month, int year, String name);

    boolean existsByUser_IdAndCategory_IdAndMonthAndYear(
            UUID userId, UUID categoryId, int month, int year);
}
