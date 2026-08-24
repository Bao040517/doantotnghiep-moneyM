package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.CategoryResponse;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<CategoryResponse> getUserCategories(UUID userId) {
        List<Category> categories = categoryRepository.findByUser_Id(userId);

        // Auto-create default categories if user has none
        if (categories.isEmpty()) {
            User user =
                    userRepository
                            .findById(userId)
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            categories =
                    List.of(
                            Category.builder()
                                    .user(user)
                                    .name("Ăn uống")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🍽️")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Chi tiêu hàng ngày")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🧴")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Quần áo")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("👕")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Mỹ phẩm")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("💄")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Phí giao lưu")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🥂")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Y tế")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("💊")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Giáo dục")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("📚")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Tiền điện")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("💡")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Tiền nước")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🚿")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Đi lại")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🚆")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Phí liên lạc")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("📱")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Tiền nhà")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🏠")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Trả nợ nhóm")
                                    .type(TransactionType.TRANSFER)
                                    .iconName("💸")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Nhận tiền nhóm")
                                    .type(TransactionType.TRANSFER)
                                    .iconName("⬅️")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Xóa nợ nhóm")
                                    .type(TransactionType.TRANSFER)
                                    .iconName("✅")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Cho nhóm mượn")
                                    .type(TransactionType.TRANSFER)
                                    .iconName("➡️")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Tiền lương")
                                    .type(TransactionType.INCOME)
                                    .iconName("💰")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Tiền thưởng")
                                    .type(TransactionType.INCOME)
                                    .iconName("🎁")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Hoàn tiền tiết kiệm")
                                    .type(TransactionType.INCOME)
                                    .iconName("🏦")
                                    .build(),
                            Category.builder()
                                    .user(user)
                                    .name("Mục tiêu tiết kiệm")
                                    .type(TransactionType.EXPENSE)
                                    .iconName("🎯")
                                    .build());

            categories = categoryRepository.saveAll(categories);
        }

        return categories.stream()
                .map(
                        c ->
                                CategoryResponse.builder()
                                        .id(c.getId())
                                        .name(c.getName())
                                        .type(c.getType())
                                        .iconName(c.getIconName())
                                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public Category getOrCreateCategory(
            UUID userId, String name, TransactionType type, String iconName) {
        return categoryRepository.findByUser_Id(userId).stream()
                .filter(c -> c.getName().equals(name) && c.getType() == type)
                .findFirst()
                .orElseGet(
                        () -> {
                            User user =
                                    userRepository
                                            .findById(userId)
                                            .orElseThrow(
                                                    () ->
                                                            new AppException(
                                                                    ErrorCode.USER_NOT_FOUND));
                            Category newCategory =
                                    Category.builder()
                                            .user(user)
                                            .name(name)
                                            .type(type)
                                            .iconName(iconName)
                                            .build();
                            return categoryRepository.save(newCategory);
                        });
    }
}
