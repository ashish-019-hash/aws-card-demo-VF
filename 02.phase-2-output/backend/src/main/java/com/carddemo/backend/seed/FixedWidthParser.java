package com.carddemo.backend.seed;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 * Utilities for parsing the legacy fixed-width ASCII sample data
 * (00.phase-1-input/data/ASCII/*.txt), including COBOL zoned-decimal
 * "sign overpunch" trailing-byte encoding used for {@code S9(n)V99} fields.
 *
 * <p>Overpunch table (positive: {@code {ABCDEFGHI} = 0..9}; negative:
 * {@code }JKLMNOPQR} = 0..9), the conventional ASCII rendering of an EBCDIC
 * zoned-decimal sign nibble. Every {@code S9(...)V99} field in the sample data is
 * a fixed number of digit characters where the final character has been replaced
 * by its overpunch equivalent.</p>
 */
public final class FixedWidthParser {

    private static final String POS_OVERPUNCH = "{ABCDEFGHI";
    private static final String NEG_OVERPUNCH = "}JKLMNOPQR";

    private FixedWidthParser() { }

    /** Extracts a substring field (1-based, inclusive-exclusive by length) and right-trims it. */
    public static String field(String line, int startZeroBased, int length) {
        return line.substring(startZeroBased, startZeroBased + length);
    }

    /** Extracts a field and strips trailing/leading spaces; blank becomes null. */
    public static String trimmedOrNull(String raw) {
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }

    /** Parses a plain (unsigned) numeric field, e.g. PIC 9(11), into a Long. */
    public static Long parseUnsignedLong(String raw) {
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        return Long.parseLong(t);
    }

    public static Integer parseUnsignedInt(String raw) {
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        return Integer.parseInt(t);
    }

    /**
     * Decodes a COBOL zoned-decimal signed field (PIC S9(p)V9(q), DISPLAY usage,
     * trailing sign overpunch) into a {@link BigDecimal} with scale {@code decimalPlaces}.
     */
    public static BigDecimal parseZonedDecimal(String raw, int decimalPlaces) {
        StringBuilder digits = new StringBuilder(raw.length());
        boolean negative = false;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (i < raw.length() - 1) {
                digits.append(c);
                continue;
            }
            // last character: plain digit (unsigned/positive) or overpunch
            int posIdx = POS_OVERPUNCH.indexOf(c);
            int negIdx = NEG_OVERPUNCH.indexOf(c);
            if (Character.isDigit(c)) {
                digits.append(c);
            } else if (posIdx >= 0) {
                digits.append((char) ('0' + posIdx));
            } else if (negIdx >= 0) {
                digits.append((char) ('0' + negIdx));
                negative = true;
            } else {
                throw new IllegalArgumentException("Not a valid zoned-decimal overpunch char: " + c);
            }
        }
        BigInteger unscaled = new BigInteger(digits.toString());
        if (negative) {
            unscaled = unscaled.negate();
        }
        return new BigDecimal(unscaled, decimalPlaces);
    }
}
