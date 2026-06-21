package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Group;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    // Danh sách nhóm user tham gia lấy qua GroupMemberRepository
}
