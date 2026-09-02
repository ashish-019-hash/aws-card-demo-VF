package com.carddemo.backend.service;

import com.carddemo.backend.domain.PaymentSettlement;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Implements RULE-DECISION-001 and RULE-CALC-002 from the business rules catalog.
 */
@Service
public class PaymentRulesService {

    public boolean isPaymentEligible(BigDecimal currentBalance) {
        return currentBalance.compareTo(BigDecimal.ZERO) > 0;
    }

    public PaymentSettlement settleFullBalance(BigDecimal currentBalance) {
        return new PaymentSettlement(currentBalance, currentBalance.subtract(currentBalance));
    }
}
