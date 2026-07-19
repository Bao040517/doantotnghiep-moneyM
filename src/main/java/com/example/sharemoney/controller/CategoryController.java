package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.CategoryResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.CategoryService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /** GET /api/categories - Lấy danh sách danh mục thu/chi */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getMyCategories() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(categoryService.getUserCategories(userId));
    }
}
