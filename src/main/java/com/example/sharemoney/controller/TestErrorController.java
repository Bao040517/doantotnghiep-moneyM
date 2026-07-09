package com.example.sharemoney.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test-error")
public class TestErrorController {

    /**
     * Endpoint này cố tình ném ra RuntimeException
     * dùng để test GlobalExceptionHandler
     */
    @GetMapping
    public String throwError() {
        throw new RuntimeException("This is a test exception from TestErrorController");
    }
}
