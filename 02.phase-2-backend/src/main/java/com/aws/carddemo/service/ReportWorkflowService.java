package com.aws.carddemo.service;

import com.aws.carddemo.dto.ReportRequest;
import com.aws.carddemo.dto.ReportResponse;
import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.entity.CardTransaction;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportWorkflowService {
    private final CardTransactionRepository transactions;
    private final ReportRules rules;
    private final LegacyInputValidator validator;
    public ReportWorkflowService(CardTransactionRepository transactions, ReportRules rules, LegacyInputValidator validator) {
        this.transactions = transactions; this.rules = rules; this.validator = validator;
    }

    @Transactional(readOnly = true)
    public ReportResponse generate(ReportRequest request) {
        validator.confirmation(request.confirmation());
        if (request.type() == ReportRequest.ReportType.CUSTOM) {
            if (request.startDate() == null || request.endDate() == null) throw new IllegalArgumentException("Custom report dates are required");
        }
        ReportRules.ReportPeriod period = rules.determinePeriod(
                ReportRules.ReportType.valueOf(request.type().name()), LocalDate.now(), request.startDate(), request.endDate());
        var selected = rules.selectTransactions(transactions.findAll(), period).stream().map(this::toDto).toList();
        return new ReportResponse(period.startDate(), period.endDate(), selected,
                "CBTRN03C formatter source is absent; this response contains the source-backed filtered transaction set");
    }

    private TransactionDto toDto(CardTransaction t) {
        return new TransactionDto(t.getId(), t.getTransactionTypeCode(), t.getTransactionCategoryCode(), t.getSource(),
                t.getDescription(), t.getAmount(), t.getMerchantId(), t.getMerchantName(), t.getMerchantCity(),
                t.getMerchantZip(), t.getCardNumber(), t.getOriginationTimestamp(), t.getProcessingTimestamp());
    }
}
