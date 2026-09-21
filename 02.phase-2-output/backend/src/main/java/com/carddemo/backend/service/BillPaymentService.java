package com.carddemo.backend.service;

import com.carddemo.backend.dto.BillPaymentRequest;
import com.carddemo.backend.dto.BillPaymentResponse;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Transaction;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Bill Payment (COBIL00C): BR-011 (must have a positive balance) and BR-012 (always pays
 * the full balance in one transaction, zeroing the account).
 */
@Service
public class BillPaymentService {

    private final AccountRepository accountRepository;
    private final CardXrefRepository cardXrefRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;

    public BillPaymentService(AccountRepository accountRepository, CardXrefRepository cardXrefRepository,
                               TransactionRepository transactionRepository, TransactionService transactionService) {
        this.accountRepository = accountRepository;
        this.cardXrefRepository = cardXrefRepository;
        this.transactionRepository = transactionRepository;
        this.transactionService = transactionService;
    }

    @Transactional
    public BillPaymentResponse pay(BillPaymentRequest request) {
        // VR-095: Account ID must be supplied.
        if (request.accountId() == null) {
            return new BillPaymentResponse(false, null, null, null, "Acct ID can NOT be empty...");
        }

        String confirm = request.confirm();
        if (confirm == null || confirm.isBlank()) {
            // VR-097: not yet confirmed.
            return new BillPaymentResponse(false, null, null, null, "Confirm to make a bill payment...");
        }
        if ("N".equalsIgnoreCase(confirm)) {
            return new BillPaymentResponse(false, null, null, null, "");
        }
        if (!"Y".equalsIgnoreCase(confirm)) {
            // VR-096: anything other than Y/N/blank is rejected.
            return new BillPaymentResponse(false, null, null, null, "Invalid value. Valid values are (Y/N)...");
        }

        Account account = accountRepository.findByIdForUpdate(request.accountId())
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));

        // BR-011: only checked once we know CONFIRM was Y (mirrors COBIL00C:173-206).
        if (account.getCurrBal().compareTo(BigDecimal.ZERO) <= 0) {
            return new BillPaymentResponse(false, null, null, account.getCurrBal(), "You have nothing to pay...");
        }

        CardXref xref = cardXrefRepository.findFirstByAcctId(account.getAcctId())
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));

        BigDecimal amount = account.getCurrBal();
        String tranId = transactionService.nextTranId();

        Transaction t = new Transaction();
        t.setTranId(tranId);
        t.setTypeCd("02");
        t.setCatCd(2);
        t.setSource("POS TERM");
        t.setDescription("BILL PAYMENT - ONLINE");
        t.setAmount(amount);
        t.setMerchantId(999999999L);
        t.setMerchantName("BILL PAYMENT");
        t.setMerchantCity("N/A");
        t.setMerchantZip("N/A");
        t.setCardNum(xref.getCardNum());
        t.setOrigTs(TransactionService.nowTimestamp());
        t.setProcTs(TransactionService.nowTimestamp());
        transactionRepository.save(t);

        account.setCurrBal(account.getCurrBal().subtract(amount));
        accountRepository.save(account);

        return new BillPaymentResponse(true, tranId, amount, account.getCurrBal(), "Payment successful.");
    }
}
