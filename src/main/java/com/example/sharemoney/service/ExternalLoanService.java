package com.example.sharemoney.service;

import com.example.sharemoney.dto.ExternalLoanDTO;
import com.example.sharemoney.dto.request.CreateExternalLoanRequest;
import com.example.sharemoney.dto.request.UpdateExternalLoanRequest;
import java.util.List;
import java.util.UUID;

public interface ExternalLoanService {
    List<ExternalLoanDTO> getUserLoans(UUID userId);

    ExternalLoanDTO createLoan(UUID userId, CreateExternalLoanRequest request);

    ExternalLoanDTO updateLoan(UUID loanId, UUID userId, UpdateExternalLoanRequest request);

    void deleteLoan(UUID loanId, UUID userId);
}
