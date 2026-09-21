package com.carddemo.backend.service;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.dto.TransactionAddResponse;
import com.carddemo.backend.dto.TransactionDetail;
import com.carddemo.backend.dto.TransactionListResponse;
import com.carddemo.backend.dto.TransactionSummary;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Transaction;
import com.carddemo.backend.entity.TranIdAllocator;
import com.carddemo.backend.entity.TransactionCategoryId;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.TranIdAllocatorRepository;
import com.carddemo.backend.repository.TransactionCategoryRepository;
import com.carddemo.backend.repository.TransactionRepository;
import com.carddemo.backend.repository.TransactionTypeRepository;
import com.carddemo.backend.validation.TransactionValidationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Transaction List (COTRN00C, BR-015 page size 10), Transaction View (COTRN01C),
 * Add Transaction (COTRN02C, BR-010), "copy last transaction" (F5 in COTRN02C).
 *
 * <p><b>BR-010 modernization:</b> the legacy MAX+1-by-reverse-browse is a documented
 * race (two concurrent adds can compute the same "next" id and one gets a user-facing
 * duplicate-key error, never auto-retried). Rather than reproduce the race, IDs here are
 * allocated atomically from {@code tran_id_allocator} under
 * {@code SELECT ... FOR UPDATE} (see {@link TranIdAllocatorRepository#lockRow()}),
 * guaranteeing every caller gets a distinct id with no duplicate-key possibility.</p>
 */
@Service
public class TransactionService {

    /** Persisted format confirmed against 00.phase-1-input/data/ASCII/dailytran.txt: 26 chars, "yyyy-MM-dd HH:mm:ss.SSSSSS". */
    private static final DateTimeFormatter TS_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS");

    private final TransactionRepository transactionRepository;
    private final CardXrefRepository cardXrefRepository;
    private final TranIdAllocatorRepository tranIdAllocatorRepository;
    private final TransactionValidationService transactionValidationService;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;

    public TransactionService(TransactionRepository transactionRepository, CardXrefRepository cardXrefRepository,
                               TranIdAllocatorRepository tranIdAllocatorRepository,
                               TransactionValidationService transactionValidationService,
                               TransactionTypeRepository transactionTypeRepository,
                               TransactionCategoryRepository transactionCategoryRepository) {
        this.transactionRepository = transactionRepository;
        this.cardXrefRepository = cardXrefRepository;
        this.tranIdAllocatorRepository = tranIdAllocatorRepository;
        this.transactionValidationService = transactionValidationService;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
    }

    @Transactional(readOnly = true)
    public TransactionListResponse list(String startId, int page) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), PageSizes.TRANSACTIONS);
        Page<Transaction> result = (startId == null || startId.isBlank())
                ? transactionRepository.findAllByOrderByTranIdAsc(pageable)
                : transactionRepository.findByTranIdGreaterThanEqualOrderByTranIdAsc(startId, pageable);
        List<TransactionSummary> items = result.getContent().stream()
                .map(t -> new TransactionSummary(t.getTranId(), t.getOrigTs(), t.getDescription(), t.getAmount()))
                .toList();
        return new TransactionListResponse(items, PageSizes.TRANSACTIONS, result.hasNext(), page > 0);
    }

    @Transactional(readOnly = true)
    public TransactionDetail getById(String tranId) {
        Transaction t = transactionRepository.findById(tranId)
                .orElseThrow(() -> new NotFoundException("Transaction ID NOT found..."));
        return toDetail(t);
    }

    /** F5 "copy last transaction" — the most recent transaction written against a card. */
    @Transactional(readOnly = true)
    public TransactionDetail getLast(String cardNum) {
        Transaction t = transactionRepository.findFirstByCardNumOrderByTranIdDesc(cardNum);
        if (t == null) {
            throw new NotFoundException("Transaction ID NOT found...");
        }
        return toDetail(t);
    }

    @Transactional
    public TransactionAddResponse addTransaction(TransactionAddRequest request) {
        if (!"Y".equalsIgnoreCase(request.confirm())) {
            throw new ValidationFailedException(List.of(new FieldError("confirm", "VR-094",
                    "Confirm to add this transaction...")));
        }
        transactionValidationService.validate(request);
        validateTypeAndCategoryExist(request.typeCd(), request.catCd());

        String cardNum = resolveCardNum(request.accountId(), request.cardNum());

        String tranId = nextTranId();
        Transaction t = new Transaction();
        t.setTranId(tranId);
        t.setTypeCd(request.typeCd());
        t.setCatCd(request.catCd());
        t.setSource(request.source());
        t.setDescription(request.description());
        t.setAmount(request.amount());
        t.setMerchantId(request.merchantId());
        t.setMerchantName(request.merchantName());
        t.setMerchantCity(request.merchantCity());
        t.setMerchantZip(request.merchantZip());
        t.setCardNum(cardNum);
        t.setOrigTs(padTimestamp(request.origDate()));
        t.setProcTs(padTimestamp(request.procDate()));

        transactionRepository.save(t);
        return new TransactionAddResponse(tranId, toDetail(t));
    }

    /**
     * COTRN02C.cbl:464-465 moves the 10-char screen date (TORIGDTI/TPROCDTI, PIC X(10))
     * directly into the 26-char timestamp field (TRAN-ORIG-TS/TRAN-PROC-TS, PIC X(26)).
     * A COBOL alphanumeric MOVE of a shorter source into a longer target left-justifies
     * the value and pads the remainder with spaces, so the legacy persisted form is the
     * entered {@code YYYY-MM-DD} date followed by 16 trailing spaces (not a synthesized
     * time-of-day) — confirmed against {@code 00.phase-1-input/cpy-bms/COTRN02.CPY:102,108}.
     */
    private static String padTimestamp(String date) {
        return String.format("%-26s", date);
    }

    /**
     * <b>Modernization rule (not in the legacy catalog):</b> COTRN02C.cbl only checks that
     * TTYPCD/TCATCD are numeric (VR-086, VR-076) — it never verifies the pair actually exists
     * in TRANTYPE/TRANCATG before writing the transaction. This backend enforces the
     * {@code transactions_type_fkey}/{@code transactions_category_fkey} DB constraints added in
     * {@code V2__transaction_reference_fks.sql}, so an unknown type/category combination must be
     * rejected cleanly here (as VR-REF-001/VR-REF-002) rather than surfacing as a 500 from an
     * FK violation at flush time.
     */
    private void validateTypeAndCategoryExist(String typeCd, Integer catCd) {
        List<FieldError> errors = new ArrayList<>();
        if (!transactionTypeRepository.existsById(typeCd)) {
            errors.add(new FieldError("tranTypeCd", "VR-REF-001", "Transaction Type Code not found..."));
        } else if (!transactionCategoryRepository.existsById(new TransactionCategoryId(typeCd, catCd))) {
            errors.add(new FieldError("tranCatCd", "VR-REF-002", "Transaction Category Code not found for this Type..."));
        }
        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    /**
     * COTRN02C.cbl VALIDATE-INPUT-KEY-FIELDS evaluates the account id first; the card
     * number is only consulted when no account id was supplied (COTRN02C.cbl:194-224).
     * Both account id and card number are existence-checked against the CXACAIX/CCXREF
     * cross-reference files (READ-CXACAIX-FILE / READ-CCXREF-FILE) before being accepted.
     */
    private String resolveCardNum(Long accountId, String cardNum) {
        if (accountId != null) {
            CardXref xref = cardXrefRepository.findFirstByAcctId(accountId)
                    .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));
            return xref.getCardNum();
        }
        if (cardNum != null && !cardNum.isBlank()) {
            if (!cardXrefRepository.existsById(cardNum)) {
                throw new NotFoundException("Card Number NOT found...");
            }
            return cardNum;
        }
        throw new ValidationFailedException(List.of(new FieldError("accountId", "VR-074",
                "Account or Card Number must be entered...")));
    }

    /** BR-010 (modernized): atomically read-and-increment the allocator row under lock. */
    String nextTranId() {
        TranIdAllocator allocator = tranIdAllocatorRepository.lockRow()
                .orElseThrow(() -> new ConflictException("UPDATE_FAILED", "Transaction ID allocator is missing."));
        long id = allocator.getNextTranId();
        allocator.setNextTranId(id + 1);
        tranIdAllocatorRepository.save(allocator);
        return String.format("%016d", id);
    }

    static String nowTimestamp() {
        return LocalDateTime.now().format(TS_FORMAT);
    }

    private TransactionDetail toDetail(Transaction t) {
        return new TransactionDetail(t.getTranId(), t.getCardNum(), t.getTypeCd(), t.getCatCd(), t.getSource(),
                t.getDescription(), t.getAmount(), t.getOrigTs(), t.getProcTs(), t.getMerchantId(),
                t.getMerchantName(), t.getMerchantCity(), t.getMerchantZip());
    }
}
