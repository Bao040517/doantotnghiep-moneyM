package com.example.sharemoney.controller;

import com.example.sharemoney.dto.BankLookupRequest;
import com.example.sharemoney.dto.BankLookupResponse;
import com.example.sharemoney.service.BankLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bank")
@RequiredArgsConstructor
@Tag(name = "Bank Account Lookup", description = "API tra cứu và xác thực tên chủ tài khoản ngân hàng Napas247")
public class BankLookupController {

    private final BankLookupService bankLookupService;

    @PostMapping("/lookup")
    @Operation(summary = "Tra cứu tên chủ tài khoản ngân hàng theo mã BIN và Số tài khoản")
    public ResponseEntity<BankLookupResponse> lookupAccount(@Valid @RequestBody BankLookupRequest request) {
        BankLookupResponse response = bankLookupService.lookupAccount(request.getBin(), request.getAccountNumber());
        return ResponseEntity.ok(response);
    }
}
