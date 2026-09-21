package com.carddemo.backend.validation;

import com.carddemo.backend.exception.FieldError;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Generic, reusable field editors mirroring the shared paragraphs in COACTUPC.cbl
 * (1215/1220/1225/1235/1245/1250-EDIT-*) and CSUTLDPY.cpy (date sub-checks). Each method
 * appends zero or more {@link FieldError}s to the supplied list rather than throwing, so
 * callers can accumulate every failure on a screen before responding (matching how the
 * legacy programs highlight every failing field at once). {@code field} is the JSON
 * field key (for the {@code field} property of the error); {@code label} is the
 * human-readable display name substituted into the legacy message text (mirrors
 * {@code WS-EDIT-VARIABLE-NAME}).
 */
public final class CommonValidators {

    private static final Pattern DIGITS = Pattern.compile("[0-9]+");
    private static final Pattern ALPHA_SPACE = Pattern.compile("[A-Za-z ]+");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private CommonValidators() {
    }

    /** VR-009 (1215-EDIT-MANDATORY): field must be supplied. */
    public static boolean mandatory(List<FieldError> errors, String field, String label, String rule, String value) {
        if (value == null || value.isBlank()) {
            errors.add(new FieldError(field, rule, label + " must be supplied."));
            return false;
        }
        return true;
    }

    /** VR-010 (1220-EDIT-YESNO): required and must be Y or N. */
    public static boolean yesNo(List<FieldError> errors, String field, String label, String rule, String value) {
        if (!mandatory(errors, field, label, rule, value)) {
            return false;
        }
        if (!"Y".equalsIgnoreCase(value) && !"N".equalsIgnoreCase(value)) {
            errors.add(new FieldError(field, rule, label + " must be Y or N."));
            return false;
        }
        return true;
    }

    /** VR-011 (1225-EDIT-ALPHA-REQD): required, alphabetic + spaces only. */
    public static boolean alphaRequired(List<FieldError> errors, String field, String label, String rule,
                                         String value) {
        if (!mandatory(errors, field, label, rule, value)) {
            return false;
        }
        if (!ALPHA_SPACE.matcher(value).matches()) {
            errors.add(new FieldError(field, rule, label + " can have alphabets only."));
            return false;
        }
        return true;
    }

    /** VR-012 (1235-EDIT-ALPHA-OPT): optional, but if supplied must be alphabetic + spaces only. */
    public static boolean alphaOptional(List<FieldError> errors, String field, String label, String rule,
                                         String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        if (!ALPHA_SPACE.matcher(value).matches()) {
            errors.add(new FieldError(field, rule, label + " can have alphabets only."));
            return false;
        }
        return true;
    }

    /** VR-013 (1245-EDIT-NUM-REQD): required, all-numeric digit string, and must not be zero. */
    public static boolean numericRequired(List<FieldError> errors, String field, String label, String rule,
                                           String value) {
        if (!mandatory(errors, field, label, rule, value)) {
            return false;
        }
        if (!DIGITS.matcher(value).matches()) {
            errors.add(new FieldError(field, rule, label + " must be all numeric."));
            return false;
        }
        if (Long.parseLong(value) == 0) {
            errors.add(new FieldError(field, rule, label + " must not be zero."));
            return false;
        }
        return true;
    }

    /** Optional numeric filter (e.g. VR-006/VR-054/VR-055/VR-058/VR-059): if supplied, must be N-digit and non-zero. */
    public static boolean numericFilterOptional(List<FieldError> errors, String field, String rule, String value,
                                                  int digits, String message) {
        if (value == null || value.isBlank()) {
            return true;
        }
        if (value.length() != digits || !DIGITS.matcher(value).matches() || Long.parseLong(value) == 0) {
            errors.add(new FieldError(field, rule, message));
            return false;
        }
        return true;
    }

    /** VR-014 (1250-EDIT-SIGNED-9V2): required signed numeric with at most 2 decimal places. */
    public static boolean signed9v2(List<FieldError> errors, String field, String label, String rule,
                                     BigDecimal value) {
        if (value == null) {
            errors.add(new FieldError(field, rule, label + " must be supplied."));
            return false;
        }
        if (value.scale() > 2) {
            errors.add(new FieldError(field, rule, label + " is not valid"));
            return false;
        }
        return true;
    }

    /**
     * VR-030..VR-034 (EDIT-DATE-CCYYMMDD via CSUTLDPY): required, format YYYY-MM-DD,
     * year/month/day individually in range and legal for the given month/leap-year
     * (LocalDate.parse already enforces day-in-month + leap-year legality).
     */
    public static boolean dateCcyymmdd(List<FieldError> errors, String field, String label, String rule,
                                        String value) {
        if (!mandatory(errors, field, label, rule, value)) {
            return false;
        }
        LocalDate parsed;
        try {
            parsed = LocalDate.parse(value, ISO);
        } catch (DateTimeParseException e) {
            errors.add(new FieldError(field, rule, label + " validation error"));
            return false;
        }
        int century = parsed.getYear() / 100;
        if (century != 19 && century != 20) {
            errors.add(new FieldError(field, rule, label + " : Century is not valid."));
            return false;
        }
        return true;
    }

    /** VR-035 (EDIT-DATE-OF-BIRTH): must be strictly before today. Only meaningful after dateCcyymmdd passed. */
    public static boolean dateOfBirthNotFuture(List<FieldError> errors, String field, String label, String rule,
                                                String value) {
        LocalDate dob = LocalDate.parse(value, ISO);
        if (!dob.isBefore(LocalDate.now())) {
            errors.add(new FieldError(field, rule, label + ":cannot be in the future "));
            return false;
        }
        return true;
    }

    /**
     * Legacy field-width guard: the online screens physically cannot accept more
     * characters than the BMS field allows, but this REST API has no such limit, so an
     * overlong value must be rejected here rather than surfacing as a database
     * "value too long for type" error. {@code max} is the column width from
     * business-entities.md / V1__schema.sql.
     */
    public static boolean maxLength(List<FieldError> errors, String field, String label, String rule,
                                     String value, int max) {
        if (value != null && value.length() > max) {
            errors.add(new FieldError(field, rule, label + " must not exceed " + max + " characters."));
            return false;
        }
        return true;
    }
}
