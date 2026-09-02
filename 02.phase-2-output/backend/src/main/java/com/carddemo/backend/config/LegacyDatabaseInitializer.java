package com.carddemo.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.List;

/** Loads the supplied ASCII fixed-width extracts after the schema has been created. */
@Component
@ConditionalOnProperty(name = "carddemo.database.seed", havingValue = "true", matchIfMissing = true)
public class LegacyDatabaseInitializer implements ApplicationRunner {
    private static final String DATA_DIRECTORY = "legacy-data/";

    private final JdbcTemplate jdbc;
    private final boolean reset;

    public LegacyDatabaseInitializer(JdbcTemplate jdbc,
                                     @Value("${carddemo.database.reset:false}") boolean reset) {
        this.jdbc = jdbc;
        this.reset = reset;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (reset) {
            resetAndSeed();
        } else if (jdbc.queryForObject("select count(*) from ACCTDAT", Long.class) == 0) {
            seed();
        }
    }

    /**
     * Clears only modern H2 tables in dependency order and reloads the immutable legacy extracts.
     * Enable it for a startup reset with {@code --carddemo.database.reset=true}.
     */
    @Transactional
    public void resetAndSeed() {
        jdbc.execute("delete from REPORT_REQUEST");
        jdbc.execute("alter table REPORT_REQUEST alter column REPORT_REQUEST_ID restart with 1");
        jdbc.execute("delete from TRANSACT");
        jdbc.execute("delete from TCATBALF");
        jdbc.execute("delete from DISCGRP");
        jdbc.execute("delete from CCXREF");
        jdbc.execute("delete from CARDDAT");
        jdbc.execute("delete from CUSTDAT");
        jdbc.execute("delete from ACCTDAT");
        jdbc.execute("delete from TRANCATG");
        jdbc.execute("delete from TRANTYPE");
        jdbc.execute("delete from USRSEC");
        jdbc.execute("delete from TRAN_ID_ALLOCATION");
        seed();
    }

    @Transactional
    public void seed() {
        batch("trantype.txt", "insert into TRANTYPE (TRAN_TYPE, TRAN_TYPE_DESC) values (?, ?)", row ->
                new Object[]{text(row, 0, 2), text(row, 2, 52)});
        batch("trancatg.txt", "insert into TRANCATG (TRAN_TYPE_CD, TRAN_CAT_CD, TRAN_CAT_TYPE_DESC) values (?, ?, ?)", row ->
                new Object[]{text(row, 0, 2), whole(row, 2, 6), text(row, 6, 56)});
        batch("acctdata.txt", "insert into ACCTDAT (ACCT_ID, ACCT_VERSION, ACCT_ACTIVE_STATUS, ACCT_CURR_BAL, "
                        + "ACCT_CREDIT_LIMIT, ACCT_CASH_CREDIT_LIMIT, ACCT_OPEN_DATE, ACCT_EXPIRAION_DATE, "
                        + "ACCT_REISSUE_DATE, ACCT_CURR_CYC_CREDIT, ACCT_CURR_CYC_DEBIT, ACCT_ADDR_ZIP, ACCT_GROUP_ID) "
                        + "values (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row -> new Object[]{
                whole(row, 0, 11), text(row, 11, 12), signedDecimal(row, 12, 24, 2), signedDecimal(row, 24, 36, 2),
                signedDecimal(row, 36, 48, 2), text(row, 48, 58), text(row, 58, 68), text(row, 68, 78),
                signedDecimal(row, 78, 90, 2), signedDecimal(row, 90, 102, 2), text(row, 102, 112), text(row, 112, 122)
        });
        batch("custdata.txt", "insert into CUSTDAT (CUST_ID, CUST_VERSION, CUST_FIRST_NAME, CUST_MIDDLE_NAME, CUST_LAST_NAME, "
                        + "CUST_ADDR_LINE_1, CUST_ADDR_LINE_2, CUST_ADDR_LINE_3, CUST_ADDR_STATE_CD, CUST_ADDR_COUNTRY_CD, "
                        + "CUST_ADDR_ZIP, CUST_PHONE_NUM_1, CUST_PHONE_NUM_2, CUST_SSN, CUST_GOVT_ISSUED_ID, "
                        + "CUST_DOB_YYYY_MM_DD, CUST_EFT_ACCOUNT_ID, CUST_PRI_CARD_HOLDER_IND, CUST_FICO_CREDIT_SCORE) "
                        + "values (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row -> new Object[]{
                whole(row, 0, 9), text(row, 9, 34), text(row, 34, 59), text(row, 59, 84), text(row, 84, 134),
                text(row, 134, 184), text(row, 184, 234), text(row, 234, 236), text(row, 236, 239), text(row, 239, 249),
                text(row, 249, 264), text(row, 264, 279), fixed(row, 279, 288), text(row, 288, 308), text(row, 308, 318),
                text(row, 318, 328), text(row, 328, 329), whole(row, 329, 332)
        });
        batch("carddata.txt", "insert into CARDDAT (CARD_NUM, CARD_VERSION, CARD_ACCT_ID, CARD_CVV_CD, CARD_EMBOSSED_NAME, "
                        + "CARD_EXPIRAION_DATE, CARD_ACTIVE_STATUS) values (?, 0, ?, ?, ?, ?, ?)", row -> new Object[]{
                fixed(row, 0, 16), whole(row, 16, 27), whole(row, 27, 30), text(row, 30, 80), text(row, 80, 90), text(row, 90, 91)
        });
        batch("cardxref.txt", "insert into CCXREF (XREF_CARD_NUM, XREF_CUST_ID, XREF_ACCT_ID) values (?, ?, ?)", row ->
                new Object[]{fixed(row, 0, 16), whole(row, 16, 25), whole(row, 25, 36)});
        batch("tcatbal.txt", "insert into TCATBALF (TRANCAT_ACCT_ID, TRANCAT_TYPE_CD, TRANCAT_CD, TRAN_CAT_BAL) values (?, ?, ?, ?)", row ->
                new Object[]{whole(row, 0, 11), text(row, 11, 13), whole(row, 13, 17), signedDecimal(row, 17, 28, 2)});
        batch("discgrp.txt", "insert into DISCGRP (DIS_ACCT_GROUP_ID, DIS_TRAN_TYPE_CD, DIS_TRAN_CAT_CD, DIS_INT_RATE) values (?, ?, ?, ?)", row ->
                new Object[]{text(row, 0, 10), text(row, 10, 12), whole(row, 12, 16), signedDecimal(row, 16, 22, 2)});
        batch("dailytran.txt", "insert into TRANSACT (TRAN_ID, TRAN_TYPE_CD, TRAN_CAT_CD, TRAN_SOURCE, TRAN_DESC, TRAN_AMT, "
                        + "TRAN_MERCHANT_ID, TRAN_MERCHANT_NAME, TRAN_MERCHANT_CITY, TRAN_MERCHANT_ZIP, TRAN_CARD_NUM, "
                        + "TRAN_ORIG_TS, TRAN_PROC_TS) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row -> new Object[]{
                fixed(row, 0, 16), text(row, 16, 18), whole(row, 18, 22), text(row, 22, 32), text(row, 32, 132),
                signedDecimal(row, 132, 143, 2), whole(row, 143, 152), text(row, 152, 202), text(row, 202, 252),
                text(row, 252, 262), fixed(row, 262, 278), fixed(row, 278, 304), fixed(row, 304, 330)
        });
        jdbc.batchUpdate("insert into USRSEC (SEC_USR_ID, SEC_USR_FNAME, SEC_USR_LNAME, SEC_USR_PWD, SEC_USR_TYPE) values (?, ?, ?, ?, ?)",
                List.of(new Object[]{"ADMIN001", "CardDemo", "Administrator", "ADMIN123", "A"},
                        new Object[]{"USER0001", "CardDemo", "User", "USER123", "U"}));
        long maximumTransactionId = jdbc.queryForList("select TRAN_ID from TRANSACT", String.class).stream()
                .mapToLong(Long::parseLong).max().orElse(0L);
        jdbc.update("insert into TRAN_ID_ALLOCATION (ALLOCATION_KEY, LAST_ALLOCATED_ID, ALLOCATION_VERSION) values (?, ?, 0)",
                "TRANSACTION", maximumTransactionId);
    }

    private void batch(String resource, String sql, RowMapper mapper) {
        List<Object[]> values = records(resource).stream().map(mapper::map).toList();
        jdbc.batchUpdate(sql, values);
    }

    private List<String> records(String resource) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(DATA_DIRECTORY + resource).getInputStream(), StandardCharsets.US_ASCII))) {
            return reader.lines().toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read bundled legacy data: " + resource, exception);
        }
    }

    private String fixed(String row, int start, int end) { return row.substring(start, end); }
    private String text(String row, int start, int end) { return fixed(row, start, end).stripTrailing(); }
    private long whole(String row, int start, int end) { return Long.parseLong(fixed(row, start, end)); }

    /** Decodes the final-character COBOL overpunch used by signed packed ASCII extracts. */
    private BigDecimal signedDecimal(String row, int start, int end, int scale) {
        String raw = fixed(row, start, end);
        char last = raw.charAt(raw.length() - 1);
        String positive = "{ABCDEFGHI";
        String negative = "}JKLMNOPQR";
        int sign = 1;
        int digit;
        if ((digit = positive.indexOf(last)) >= 0) {
            // digit is already its numeric value for { and A-I.
        } else if ((digit = negative.indexOf(last)) >= 0) {
            sign = -1;
        } else {
            digit = Character.digit(last, 10);
            if (digit < 0) throw new IllegalArgumentException("Unsupported COBOL overpunch: " + last);
        }
        String digits = raw.substring(0, raw.length() - 1) + digit;
        return BigDecimal.valueOf(sign * Long.parseLong(digits), scale);
    }

    @FunctionalInterface
    private interface RowMapper { Object[] map(String row); }
}
