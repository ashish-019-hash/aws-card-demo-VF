package com.carddemo.backend.service;

import com.carddemo.backend.dto.AccountFields;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Objects;

/**
 * Field-for-field comparison semantics shared by BR-006 (new-vs-old change detection)
 * and BR-007 (live-vs-snapshot conflict detection), per COACTUPC.cbl:1681-1775 /
 * 4109-4195: status and group ID are compared case-insensitively; free-text name/address
 * fields are compared trimmed and case-insensitively; balances/limits are compared
 * numerically (scale-independent); everything else (dates, zip, phone, SSN, government
 * ID, DOB, EFT account, primary-holder flag, FICO score) is compared exactly.
 */
final class AccountFieldsComparator {

    private AccountFieldsComparator() {
    }

    static boolean equal(AccountFields a, AccountFields b) {
        return ci(a.activeStatus(), b.activeStatus())
                && numEq(a.creditLimit(), b.creditLimit())
                && numEq(a.cashCreditLimit(), b.cashCreditLimit())
                && numEq(a.currBal(), b.currBal())
                && numEq(a.currCycCredit(), b.currCycCredit())
                && numEq(a.currCycDebit(), b.currCycDebit())
                && Objects.equals(a.openDate(), b.openDate())
                && Objects.equals(a.expirationDate(), b.expirationDate())
                && Objects.equals(a.reissueDate(), b.reissueDate())
                && ci(a.groupId(), b.groupId())
                && trimmedCi(a.firstName(), b.firstName())
                && trimmedCi(a.middleName(), b.middleName())
                && trimmedCi(a.lastName(), b.lastName())
                && trimmedCi(a.addrLine1(), b.addrLine1())
                && trimmedCi(a.addrLine2(), b.addrLine2())
                && trimmedCi(a.addrLine3(), b.addrLine3())
                && trimmedCi(a.addrStateCd(), b.addrStateCd())
                && trimmedCi(a.addrCountryCd(), b.addrCountryCd())
                && Objects.equals(a.addrZip(), b.addrZip())
                && Objects.equals(a.phoneNum1(), b.phoneNum1())
                && Objects.equals(a.phoneNum2(), b.phoneNum2())
                && Objects.equals(a.ssn(), b.ssn())
                && trimmedCi(a.govtIssuedId(), b.govtIssuedId())
                && Objects.equals(a.dob(), b.dob())
                && Objects.equals(a.eftAccountId(), b.eftAccountId())
                && Objects.equals(a.priCardHolderInd(), b.priCardHolderInd())
                && Objects.equals(a.ficoCreditScore(), b.ficoCreditScore());
    }

    private static boolean ci(String x, String y) {
        if (x == null || y == null) {
            return x == y;
        }
        return x.toUpperCase(Locale.ROOT).equals(y.toUpperCase(Locale.ROOT));
    }

    private static boolean trimmedCi(String x, String y) {
        String tx = x == null ? "" : x.trim();
        String ty = y == null ? "" : y.trim();
        return tx.toUpperCase(Locale.ROOT).equals(ty.toUpperCase(Locale.ROOT));
    }

    private static boolean numEq(BigDecimal x, BigDecimal y) {
        if (x == null || y == null) {
            return x == y;
        }
        return x.compareTo(y) == 0;
    }
}
