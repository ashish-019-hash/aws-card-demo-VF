package com.carddemo.backend.seed;

import com.carddemo.backend.entity.*;
import com.carddemo.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static com.carddemo.backend.seed.FixedWidthParser.*;

/**
 * Dev-only seed loader. Parses the legacy fixed-width ASCII sample data
 * (bundled under {@code src/main/resources/seed-data/}, originally
 * {@code 00.phase-1-input/data/ASCII/*.txt}) using the copybook byte offsets
 * documented in {@code 01.phase-1-output/business-entities.md}, and inserts
 * the two documented seed users.
 *
 * <p>Guarded by profile {@code dev} AND property {@code carddemo.seed.enabled}
 * (Spring's relaxed property binding also honors the env var
 * {@code CARDDEMO_SEED_ENABLED}). Idempotent: each table is only loaded if it is
 * currently empty, so re-running on an already-seeded database is a no-op.</p>
 */
@Component
@Profile("dev")
public class SeedDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final CardXrefRepository cardXrefRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionTypeRepository transactionTypeRepository;
    private final TransactionCategoryRepository transactionCategoryRepository;
    private final TransactionCategoryBalanceRepository transactionCategoryBalanceRepository;
    private final DisclosureGroupRepository disclosureGroupRepository;
    private final ApplicationUserRepository userRepository;
    private final TranIdAllocatorRepository tranIdAllocatorRepository;
    private final SeedProperties seedProperties;

    public SeedDataLoader(CustomerRepository customerRepository,
                           AccountRepository accountRepository,
                           CardRepository cardRepository,
                           CardXrefRepository cardXrefRepository,
                           TransactionRepository transactionRepository,
                           TransactionTypeRepository transactionTypeRepository,
                           TransactionCategoryRepository transactionCategoryRepository,
                           TransactionCategoryBalanceRepository transactionCategoryBalanceRepository,
                           DisclosureGroupRepository disclosureGroupRepository,
                           ApplicationUserRepository userRepository,
                           TranIdAllocatorRepository tranIdAllocatorRepository,
                           SeedProperties seedProperties) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.cardXrefRepository = cardXrefRepository;
        this.transactionRepository = transactionRepository;
        this.transactionTypeRepository = transactionTypeRepository;
        this.transactionCategoryRepository = transactionCategoryRepository;
        this.transactionCategoryBalanceRepository = transactionCategoryBalanceRepository;
        this.disclosureGroupRepository = disclosureGroupRepository;
        this.userRepository = userRepository;
        this.tranIdAllocatorRepository = tranIdAllocatorRepository;
        this.seedProperties = seedProperties;
    }

    /**
     * Runs the whole seed in one transaction. The per-table seed methods below are invoked
     * through {@code this}, so their own {@code @Transactional} annotations are not proxied;
     * the transaction opened here is the one that actually applies (and it keeps the seed
     * atomic: a parse error leaves no partial data behind).
     */
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedProperties.isEnabled()) {
            log.info("carddemo.seed.enabled=false — skipping seed load");
            return;
        }
        log.info("Seeding CardDemo sample data (dev profile)...");
        seedTransactionTypes();
        seedTransactionCategories();
        seedCustomers();
        seedAccounts();
        seedDisclosureGroups();
        seedCards();
        seedCardXref();
        seedTransactionCategoryBalances();
        seedTransactions();
        seedUsers();
        log.info("Seed load complete.");
    }

    private List<String> readLines(String resource) {
        try (InputStream is = new ClassPathResource("seed-data/" + resource).getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.US_ASCII))) {
            List<String> lines = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) {
                    lines.add(line);
                }
            }
            return lines;
        } catch (IOException e) {
            throw new IllegalStateException("Unable to read seed resource " + resource, e);
        }
    }

    @Transactional
    public void seedTransactionTypes() {
        if (transactionTypeRepository.count() > 0) {
            return;
        }
        for (String line : readLines("trantype.txt")) {
            TransactionType t = new TransactionType();
            t.setTypeCd(field(line, 0, 2));
            t.setTypeDesc(field(line, 2, 50).trim());
            transactionTypeRepository.save(t);
        }
        log.info("Seeded {} transaction types", transactionTypeRepository.count());
    }

    @Transactional
    public void seedTransactionCategories() {
        if (transactionCategoryRepository.count() > 0) {
            return;
        }
        for (String line : readLines("trancatg.txt")) {
            TransactionCategory c = new TransactionCategory();
            String typeCd = field(line, 0, 2);
            Integer catCd = parseUnsignedInt(field(line, 2, 4));
            c.setId(new com.carddemo.backend.entity.TransactionCategoryId(typeCd, catCd));
            c.setCatTypeDesc(field(line, 6, 50).trim());
            transactionCategoryRepository.save(c);
        }
        log.info("Seeded {} transaction categories", transactionCategoryRepository.count());
    }

    @Transactional
    public void seedCustomers() {
        if (customerRepository.count() > 0) {
            return;
        }
        for (String line : readLines("custdata.txt")) {
            int p = 0;
            Customer c = new Customer();
            c.setCustId(parseUnsignedLong(field(line, p, 9))); p += 9;
            c.setFirstName(field(line, p, 25).trim()); p += 25;
            c.setMiddleName(trimmedOrNull(field(line, p, 25))); p += 25;
            c.setLastName(field(line, p, 25).trim()); p += 25;
            c.setAddrLine1(field(line, p, 50).trim()); p += 50;
            c.setAddrLine2(trimmedOrNull(field(line, p, 50))); p += 50;
            c.setAddrLine3(trimmedOrNull(field(line, p, 50))); p += 50;
            c.setAddrStateCd(field(line, p, 2)); p += 2;
            c.setAddrCountryCd(field(line, p, 3)); p += 3;
            c.setAddrZip(field(line, p, 10).trim()); p += 10;
            c.setPhoneNum1(field(line, p, 15)); p += 15;
            c.setPhoneNum2(field(line, p, 15)); p += 15;
            c.setSsn(field(line, p, 9)); p += 9;
            c.setGovtIssuedId(trimmedOrNull(field(line, p, 20))); p += 20;
            c.setDob(field(line, p, 10)); p += 10;
            c.setEftAccountId(trimmedOrNull(field(line, p, 10))); p += 10;
            c.setPriCardHolderInd(field(line, p, 1)); p += 1;
            c.setFicoCreditScore(parseUnsignedInt(field(line, p, 3))); p += 3;
            customerRepository.save(c);
        }
        log.info("Seeded {} customers", customerRepository.count());
    }

    @Transactional
    public void seedAccounts() {
        if (accountRepository.count() > 0) {
            return;
        }
        for (String line : readLines("acctdata.txt")) {
            int p = 0;
            Account a = new Account();
            a.setAcctId(parseUnsignedLong(field(line, p, 11))); p += 11;
            a.setActiveStatus(field(line, p, 1)); p += 1;
            a.setCurrBal(parseZonedDecimal(field(line, p, 12), 2)); p += 12;
            a.setCreditLimit(parseZonedDecimal(field(line, p, 12), 2)); p += 12;
            a.setCashCreditLimit(parseZonedDecimal(field(line, p, 12), 2)); p += 12;
            a.setOpenDate(field(line, p, 10)); p += 10;
            a.setExpirationDate(field(line, p, 10)); p += 10;
            a.setReissueDate(field(line, p, 10)); p += 10;
            a.setCurrCycCredit(parseZonedDecimal(field(line, p, 12), 2)); p += 12;
            a.setCurrCycDebit(parseZonedDecimal(field(line, p, 12), 2)); p += 12;
            a.setAddrZip(trimmedOrNull(field(line, p, 10))); p += 10;
            a.setGroupId(trimmedOrNull(field(line, p, 10))); p += 10;
            accountRepository.save(a);
        }
        log.info("Seeded {} accounts", accountRepository.count());
    }

    @Transactional
    public void seedDisclosureGroups() {
        if (disclosureGroupRepository.count() > 0) {
            return;
        }
        for (String line : readLines("discgrp.txt")) {
            int p = 0;
            String groupId = field(line, p, 10); p += 10;
            String typeCd = field(line, p, 2); p += 2;
            Integer catCd = parseUnsignedInt(field(line, p, 4)); p += 4;
            BigDecimal rate = parseZonedDecimal(field(line, p, 6), 2);
            DisclosureGroup g = new DisclosureGroup();
            g.setId(new DisclosureGroupId(groupId, typeCd, catCd));
            g.setIntRate(rate);
            disclosureGroupRepository.save(g);
        }
        log.info("Seeded {} disclosure group rows", disclosureGroupRepository.count());
    }

    @Transactional
    public void seedCards() {
        if (cardRepository.count() > 0) {
            return;
        }
        for (String line : readLines("carddata.txt")) {
            int p = 0;
            Card c = new Card();
            c.setCardNum(field(line, p, 16)); p += 16;
            c.setAcctId(parseUnsignedLong(field(line, p, 11))); p += 11;
            c.setCvvCd(parseUnsignedInt(field(line, p, 3))); p += 3;
            c.setEmbossedName(field(line, p, 50).trim()); p += 50;
            c.setExpirationDate(field(line, p, 10)); p += 10;
            c.setActiveStatus(field(line, p, 1)); p += 1;
            cardRepository.save(c);
        }
        log.info("Seeded {} cards", cardRepository.count());
    }

    @Transactional
    public void seedCardXref() {
        if (cardXrefRepository.count() > 0) {
            return;
        }
        for (String line : readLines("cardxref.txt")) {
            int p = 0;
            CardXref x = new CardXref();
            x.setCardNum(field(line, p, 16)); p += 16;
            x.setCustId(parseUnsignedLong(field(line, p, 9))); p += 9;
            x.setAcctId(parseUnsignedLong(field(line, p, 11)));
            cardXrefRepository.save(x);
        }
        log.info("Seeded {} card-xref rows", cardXrefRepository.count());
    }

    @Transactional
    public void seedTransactionCategoryBalances() {
        if (transactionCategoryBalanceRepository.count() > 0) {
            return;
        }
        for (String line : readLines("tcatbal.txt")) {
            int p = 0;
            Long acctId = parseUnsignedLong(field(line, p, 11)); p += 11;
            String typeCd = field(line, p, 2); p += 2;
            Integer catCd = parseUnsignedInt(field(line, p, 4)); p += 4;
            BigDecimal bal = parseZonedDecimal(field(line, p, 11), 2);
            TransactionCategoryBalance b = new TransactionCategoryBalance();
            b.setId(new TransactionCategoryBalanceId(acctId, typeCd, catCd));
            b.setCatBal(bal);
            transactionCategoryBalanceRepository.save(b);
        }
        log.info("Seeded {} transaction category balance rows", transactionCategoryBalanceRepository.count());
    }

    @Transactional
    public void seedTransactions() {
        if (transactionRepository.count() > 0) {
            return;
        }
        long maxTranId = 0L;
        for (String line : readLines("dailytran.txt")) {
            int p = 0;
            Transaction t = new Transaction();
            String tranId = field(line, p, 16); p += 16;
            t.setTranId(tranId);
            t.setTypeCd(field(line, p, 2)); p += 2;
            t.setCatCd(parseUnsignedInt(field(line, p, 4))); p += 4;
            t.setSource(field(line, p, 10).trim()); p += 10;
            t.setDescription(field(line, p, 100).trim()); p += 100;
            t.setAmount(parseZonedDecimal(field(line, p, 11), 2)); p += 11;
            t.setMerchantId(parseUnsignedLong(field(line, p, 9))); p += 9;
            t.setMerchantName(field(line, p, 50).trim()); p += 50;
            t.setMerchantCity(field(line, p, 50).trim()); p += 50;
            t.setMerchantZip(field(line, p, 10).trim()); p += 10;
            t.setCardNum(field(line, p, 16)); p += 16;
            t.setOrigTs(field(line, p, 26)); p += 26;
            t.setProcTs(trimmedOrNull(field(line, p, 26)));
            transactionRepository.save(t);
            try {
                maxTranId = Math.max(maxTranId, Long.parseLong(tranId.trim()));
            } catch (NumberFormatException ignore) {
                // non-numeric tran id in sample data; skip for allocator seeding
            }
        }
        log.info("Seeded {} transactions", transactionRepository.count());

        long nextTranId = maxTranId + 1;
        tranIdAllocatorRepository.lockRow().ifPresent(allocator -> {
            if (allocator.getNextTranId() == null || allocator.getNextTranId() < nextTranId) {
                allocator.setNextTranId(nextTranId);
                tranIdAllocatorRepository.save(allocator);
            }
        });
    }

    @Transactional
    public void seedUsers() {
        if (userRepository.count() > 0) {
            return;
        }
        ApplicationUser admin = new ApplicationUser();
        admin.setUserId("ADMIN001");
        admin.setFirstName("Admin");
        admin.setLastName("User");
        admin.setPassword("PASSWORD");
        admin.setUserType("A");
        userRepository.save(admin);

        ApplicationUser regular = new ApplicationUser();
        regular.setUserId("USER0001");
        regular.setFirstName("Regular");
        regular.setLastName("User");
        regular.setPassword("PASSWORD");
        regular.setUserType("U");
        userRepository.save(regular);

        log.info("Seeded 2 users: ADMIN001 (admin) / USER0001 (regular) - see README for credentials");
    }
}
