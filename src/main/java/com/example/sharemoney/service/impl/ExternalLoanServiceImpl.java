package com.example.sharemoney.service.impl;

import com.example.sharemoney.dto.ExternalLoanDTO;
import com.example.sharemoney.dto.request.CreateExternalLoanRequest;
import com.example.sharemoney.dto.request.UpdateExternalLoanRequest;
import com.example.sharemoney.entity.ExternalLoan;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.ExternalLoanRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.service.ExternalLoanService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ExternalLoanServiceImpl implements ExternalLoanService {

    private final ExternalLoanRepository externalLoanRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ExternalLoanDTO> getUserLoans(UUID userId) {
        List<ExternalLoan> loans = externalLoanRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        return loans.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public ExternalLoanDTO createLoan(UUID userId, CreateExternalLoanRequest request) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ExternalLoan loan =
                ExternalLoan.builder()
                        .user(user)
                        .type(request.getType())
                        .counterpartyName(request.getCounterpartyName())
                        .principalAmount(request.getPrincipalAmount())
                        .interestRate(request.getInterestRate())
                        .startDate(request.getStartDate())
                        .dueDate(request.getDueDate())
                        .description(request.getDescription())
                        .isSettled(false)
                        .build();

        return mapToDTO(externalLoanRepository.save(loan));
    }

    @Override
    public ExternalLoanDTO updateLoan(UUID loanId, UUID userId, UpdateExternalLoanRequest request) {
        ExternalLoan loan =
                externalLoanRepository
                        .findById(loanId)
                        .orElseThrow(() -> new AppException(ErrorCode.LOAN_NOT_FOUND));

        if (!loan.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (request.getType() != null) loan.setType(request.getType());
        if (request.getCounterpartyName() != null)
            loan.setCounterpartyName(request.getCounterpartyName());
        if (request.getPrincipalAmount() != null)
            loan.setPrincipalAmount(request.getPrincipalAmount());
        if (request.getInterestRate() != null) loan.setInterestRate(request.getInterestRate());
        if (request.getStartDate() != null) loan.setStartDate(request.getStartDate());
        if (request.getDueDate() != null) loan.setDueDate(request.getDueDate());
        if (request.getDescription() != null) loan.setDescription(request.getDescription());
        if (request.getIsSettled() != null) loan.setSettled(request.getIsSettled());

        return mapToDTO(externalLoanRepository.save(loan));
    }

    @Override
    public void deleteLoan(UUID loanId, UUID userId) {
        ExternalLoan loan =
                externalLoanRepository
                        .findById(loanId)
                        .orElseThrow(() -> new AppException(ErrorCode.LOAN_NOT_FOUND));

        if (!loan.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        externalLoanRepository.delete(loan);
    }

    private ExternalLoanDTO mapToDTO(ExternalLoan loan) {
        return ExternalLoanDTO.builder()
                .id(loan.getId())
                .type(loan.getType())
                .counterpartyName(loan.getCounterpartyName())
                .principalAmount(loan.getPrincipalAmount())
                .interestRate(loan.getInterestRate())
                .startDate(loan.getStartDate())
                .dueDate(loan.getDueDate())
                .description(loan.getDescription())
                .isSettled(loan.isSettled())
                .build();
    }
}
