package com.example.sharemoney.repository;

import com.example.sharemoney.entity.GroupMember;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    /** Lấy tất cả nhóm mà user đang là thành viên */
    List<GroupMember> findByUser_Id(UUID userId);

    /** Lấy tất cả thành viên của 1 nhóm */
    List<GroupMember> findByGroup_Id(UUID groupId);

    /** Kiểm tra tư cách thành viên */
    Optional<GroupMember> findByGroup_IdAndUser_Id(UUID groupId, UUID userId);

    boolean existsByGroup_IdAndUser_Id(UUID groupId, UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT gm.group.id, COUNT(gm) FROM GroupMember gm WHERE gm.group.id IN :groupIds GROUP BY gm.group.id")
    List<Object[]> countMembersByGroupIds(@org.springframework.data.repository.query.Param("groupIds") List<UUID> groupIds);
}
