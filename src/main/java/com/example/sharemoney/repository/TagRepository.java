package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findByUser_Id(UUID userId);
    Optional<Tag> findByUser_IdAndName(UUID userId, String name);
}
