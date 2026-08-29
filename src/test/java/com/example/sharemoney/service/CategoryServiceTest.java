package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.response.CategoryResponse;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.UserRepository;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private CategoryService categoryService;

    private UUID userId;
    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user =
                User.builder()
                        .id(userId)
                        .name("Nguyen Van A")
                        .email("vana@example.com")
                        .passwordHash("hashed")
                        .build();

        category =
                Category.builder()
                        .id(UUID.randomUUID())
                        .user(user)
                        .name("Ăn uống")
                        .type(TransactionType.EXPENSE)
                        .iconName("🍔")
                        .build();
    }

    @Test
    @DisplayName("Lấy danh mục người dùng: Đã có danh mục -> Trả về danh sách")
    void testGetUserCategories_ReturnsExisting() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(List.of(category));

        List<CategoryResponse> responses = categoryService.getUserCategories(userId);

        assertEquals(1, responses.size());
        assertEquals("Ăn uống", responses.get(0).getName());
        assertEquals(TransactionType.EXPENSE, responses.get(0).getType());
    }

    @Test
    @DisplayName("Lấy danh mục người dùng: Chưa có -> Tự sinh danh mục mặc định")
    void testGetUserCategories_AutoGeneratesDefaultsWhenEmpty() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(categoryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<CategoryResponse> responses = categoryService.getUserCategories(userId);

        assertFalse(responses.isEmpty());
        assertTrue(responses.size() >= 15);
        verify(categoryRepository).saveAll(any());
    }

    @Test
    @DisplayName("Lấy danh mục người dùng: User không tồn tại -> Ném USER_NOT_FOUND")
    void testGetUserCategories_UserNotFound_ThrowsException() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(AppException.class, () -> categoryService.getUserCategories(userId));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Tìm hoặc tạo danh mục: Danh mục đã tồn tại -> Trả về danh mục có sẵn")
    void testGetOrCreateCategory_ReturnsExisting() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(List.of(category));

        Category result =
                categoryService.getOrCreateCategory(
                        userId, "Ăn uống", TransactionType.EXPENSE, "🍔");

        assertNotNull(result);
        assertEquals(category.getId(), result.getId());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("Tìm hoặc tạo danh mục: Chưa tồn tại -> Tạo mới và lưu vào DB")
    void testGetOrCreateCategory_CreatesNewWhenNotFound() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        Category result =
                categoryService.getOrCreateCategory(
                        userId, "Du lịch", TransactionType.EXPENSE, "✈️");

        assertNotNull(result);
        assertEquals("Du lịch", result.getName());
        assertEquals(TransactionType.EXPENSE, result.getType());
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("Tìm hoặc tạo danh mục: User không tồn tại -> Ném USER_NOT_FOUND")
    void testGetOrCreateCategory_UserNotFound_ThrowsException() {
        when(categoryRepository.findByUser_Id(userId)).thenReturn(Collections.emptyList());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(
                        AppException.class,
                        () ->
                                categoryService.getOrCreateCategory(
                                        userId, "Đầu tư", TransactionType.EXPENSE, "📈"));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }
}
