package com.example.sharemoney.controller;

import com.example.sharemoney.service.CategoryService;
import com.example.sharemoney.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.PrintWriter;
import java.io.StringWriter;

@RestController
@RequestMapping("/api/test-error")
@RequiredArgsConstructor
public class TestErrorController {

    private final CategoryService categoryService;
    private final UserRepository userRepository;

    @GetMapping
    public String test() {
        try {
            var user = userRepository.findAll().get(0);
            categoryService.getUserCategories(user.getId());
            return "OK";
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            return sw.toString();
        }
    }
}
