package com.carddemo.backend.validation;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Legacy-compatible validation rules from validation-rules.md. Rule identifiers
 * are retained in failures so clients can correct the exact rejected field.
 */
@Service
public class LegacyValidationService {
    private static final Pattern ALPHA_SPACE = Pattern.compile("[A-Za-z ]+");
    private static final Pattern DIGITS = Pattern.compile("\\d+");
    private static final Pattern PHONE = Pattern.compile("\\((\\d{3})\\)(\\d{3})-(\\d{4})");
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE.withResolverStyle(ResolverStyle.STRICT);
    private static final Set<String> STATE_CODES = Set.of(
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE",
            "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
            "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
            "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
            "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
            "WI", "WY", "DC", "AS", "GU", "MP", "PR", "VI");
    private static final Set<String> STATE_ZIP_PREFIXES = Set.of(
            "AA34", "AE90", "AE91", "AE92", "AE93", "AE94",
            "AE95", "AE96", "AE97", "AE98", "AK99", "AL35",
            "AL36", "AP96", "AR71", "AR72", "AS96", "AZ85",
            "AZ86", "CA90", "CA91", "CA92", "CA93", "CA94",
            "CA95", "CA96", "CO80", "CO81", "CT60", "CT61",
            "CT62", "CT63", "CT64", "CT65", "CT66", "CT67",
            "CT68", "CT69", "DC20", "DC56", "DC88", "DE19",
            "FL32", "FL33", "FL34", "FM96", "GA30", "GA31",
            "GA39", "GU96", "HI96", "IA50", "IA51", "IA52",
            "ID83", "IL60", "IL61", "IL62", "IN46", "IN47",
            "KS66", "KS67", "KY40", "KY41", "KY42", "LA70",
            "LA71", "MA10", "MA11", "MA12", "MA13", "MA14",
            "MA15", "MA16", "MA17", "MA18", "MA19", "MA20",
            "MA21", "MA22", "MA23", "MA24", "MA25", "MA26",
            "MA27", "MA55", "MD20", "MD21", "ME39", "ME40",
            "ME41", "ME42", "ME43", "ME44", "ME45", "ME46",
            "ME47", "ME48", "ME49", "MH96", "MI48", "MI49",
            "MN55", "MN56", "MO63", "MO64", "MO65", "MO72",
            "MP96", "MS38", "MS39", "MT59", "NC27", "NC28",
            "ND58", "NE68", "NE69", "NH30", "NH31", "NH32",
            "NH33", "NH34", "NH35", "NH36", "NH37", "NH38",
            "NJ70", "NJ71", "NJ72", "NJ73", "NJ74", "NJ75",
            "NJ76", "NJ77", "NJ78", "NJ79", "NJ80", "NJ81",
            "NJ82", "NJ83", "NJ84", "NJ85", "NJ86", "NJ87",
            "NJ88", "NJ89", "NM87", "NM88", "NV88", "NV89",
            "NY50", "NY54", "NY63", "NY10", "NY11", "NY12",
            "NY13", "NY14", "OH43", "OH44", "OH45", "OK73",
            "OK74", "OR97", "PA15", "PA16", "PA17", "PA18",
            "PA19", "PR60", "PR61", "PR62", "PR63", "PR64",
            "PR65", "PR66", "PR67", "PR68", "PR69", "PR70",
            "PR71", "PR72", "PR73", "PR74", "PR75", "PR76",
            "PR77", "PR78", "PR79", "PR90", "PR91", "PR92",
            "PR93", "PR94", "PR95", "PR96", "PR97", "PR98",
            "PW96", "RI28", "RI29", "SC29", "SD57", "TN37",
            "TN38", "TX73", "TX75", "TX76", "TX77", "TX78",
            "TX79", "TX88", "UT84", "VA20", "VA22", "VA23",
            "VA24", "VI80", "VI82", "VI83", "VI84", "VI85",
            "VT50", "VT51", "VT52", "VT53", "VT54", "VT56",
            "VT57", "VT58", "VT59", "WA98", "WA99", "WI53",
            "WI54", "WV24", "WV25", "WV26", "WY82", "WY83");
    private static final Set<String> GENERAL_PURPOSE_AREA_CODES = Set.of(
            "201", "202", "203", "204", "205", "206", "207", "208",
            "209", "210", "212", "213", "214", "215", "216", "217",
            "218", "219", "220", "223", "224", "225", "226", "228",
            "229", "231", "234", "236", "239", "240", "242", "246",
            "248", "249", "250", "251", "252", "253", "254", "256",
            "260", "262", "264", "267", "268", "269", "270", "272",
            "276", "279", "281", "284", "289", "301", "302", "303",
            "304", "305", "306", "307", "308", "309", "310", "312",
            "313", "314", "315", "316", "317", "318", "319", "320",
            "321", "323", "325", "326", "330", "331", "332", "334",
            "336", "337", "339", "340", "341", "343", "345", "346",
            "347", "351", "352", "360", "361", "364", "365", "367",
            "368", "380", "385", "386", "401", "402", "403", "404",
            "405", "406", "407", "408", "409", "410", "412", "413",
            "414", "415", "416", "417", "418", "419", "423", "424",
            "425", "430", "431", "432", "434", "435", "437", "438",
            "440", "441", "442", "443", "445", "447", "448", "450",
            "458", "463", "464", "469", "470", "473", "474", "475",
            "478", "479", "480", "484", "501", "502", "503", "504",
            "505", "506", "507", "508", "509", "510", "512", "513",
            "514", "515", "516", "517", "518", "519", "520", "530",
            "531", "534", "539", "540", "541", "548", "551", "559",
            "561", "562", "563", "564", "567", "570", "571", "572",
            "573", "574", "575", "579", "580", "581", "582", "585",
            "586", "587", "601", "602", "603", "604", "605", "606",
            "607", "608", "609", "610", "612", "613", "614", "615",
            "616", "617", "618", "619", "620", "623", "626", "628",
            "629", "630", "631", "636", "639", "640", "641", "646",
            "647", "649", "650", "651", "656", "657", "658", "659",
            "660", "661", "662", "664", "667", "669", "670", "671",
            "672", "678", "680", "681", "682", "683", "684", "689",
            "701", "702", "703", "704", "705", "706", "707", "708",
            "709", "712", "713", "714", "715", "716", "717", "718",
            "719", "720", "721", "724", "725", "726", "727", "731",
            "732", "734", "737", "740", "742", "743", "747", "753",
            "754", "757", "758", "760", "762", "763", "765", "767",
            "769", "770", "771", "772", "773", "774", "775", "778",
            "779", "780", "781", "782", "784", "785", "786", "787",
            "801", "802", "803", "804", "805", "806", "807", "808",
            "809", "810", "812", "813", "814", "815", "816", "817",
            "818", "819", "820", "825", "826", "828", "829", "830",
            "831", "832", "838", "839", "840", "843", "845", "847",
            "848", "849", "850", "854", "856", "857", "858", "859",
            "860", "862", "863", "864", "865", "867", "868", "869",
            "870", "872", "873", "876", "878", "901", "902", "903",
            "904", "905", "906", "907", "908", "909", "910", "912",
            "913", "914", "915", "916", "917", "918", "919", "920",
            "925", "928", "929", "930", "931", "934", "936", "937",
            "938", "939", "940", "941", "943", "945", "947", "948",
            "949", "951", "952", "954", "956", "959", "970", "971",
            "972", "973", "978", "979", "980", "983", "984", "985",
            "986", "989");

    public void accountLookup(Long accountId) {
        if (accountId == null) fail("RULE-VAL-001", "accountId", "Account number is required.");
        validAccountId(accountId, "RULE-VAL-002", "Account number must be a non-zero 11-digit number.");
    }

    public void optionalAccountFilter(Long accountId) {
        if (accountId != null && accountId != 0) {
            validAccountId(accountId, "RULE-VAL-014", "Account filter must be an 11-digit number.");
        }
    }

    public void cardFilter(String cardNumber, boolean required) {
        if (blank(cardNumber)) {
            if (required) fail("RULE-VAL-015", "cardNumber", "Card number is required.");
            return;
        }
        if (!cardNumber.matches("\\d{16}") || cardNumber.chars().allMatch(ch -> ch == '0')) {
            fail("RULE-VAL-015", "cardNumber", "Card number must be a non-zero 16-digit number.");
        }
    }

    public void accountUpdate(ApiDtos.AccountUpdateRequest request) {
        requiredYesNo(request.activeStatus(), "activeStatus", "RULE-VAL-003");
        monetary(request.creditLimit(), "creditLimit");
        monetary(request.cashCreditLimit(), "cashCreditLimit");
        monetary(request.currentBalance(), "currentBalance");
        monetary(request.currentCycleCredit(), "currentCycleCredit");
        monetary(request.currentCycleDebit(), "currentCycleDebit");
        calendarDate(request.openDate(), "openDate", "RULE-VAL-005");
        calendarDate(request.expirationDate(), "expirationDate", "RULE-VAL-005");
        calendarDate(request.reissueDate(), "reissueDate", "RULE-VAL-005");
    }

    public void customerUpdate(ApiDtos.CustomerUpdateRequest request) {
        requiredRange(request.ficoCreditScore(), 300, 850, "ficoCreditScore", "RULE-VAL-006");
        requiredAlpha(request.firstName(), "firstName", "RULE-VAL-007");
        optionalAlpha(request.middleName(), "middleName", "RULE-VAL-007");
        requiredAlpha(request.lastName(), "lastName", "RULE-VAL-007");
        require(request.addressLine1(), "addressLine1", "RULE-VAL-008", "Address line 1 is required.");
        requiredAlpha(request.city(), "city", "RULE-VAL-008");
        requiredAlpha(request.addressStateCode(), "addressStateCode", "RULE-VAL-008");
        requiredAlpha(request.addressCountryCode(), "addressCountryCode", "RULE-VAL-008");
        zip(request.addressZip(), "addressZip", "RULE-VAL-008");
        numericNonZero(request.eftAccountId(), "eftAccountId", "RULE-VAL-008");
        if (!STATE_CODES.contains(request.addressStateCode())) {
            fail("RULE-VAL-009", "addressStateCode", "State must be a valid U.S. state code.");
        }
        if (!STATE_ZIP_PREFIXES.contains(request.addressStateCode() + request.addressZip().substring(0, 2))) {
            fail("RULE-VAL-010", "addressZip", "ZIP prefix is not valid for the supplied state.");
        }
        phone(request.primaryPhoneNumber(), "primaryPhoneNumber");
        phone(request.secondaryPhoneNumber(), "secondaryPhoneNumber");
        ssn(request.ssn());
        LocalDate dob = calendarDate(request.dateOfBirth(), "dateOfBirth", "RULE-VAL-005");
        if (!dob.isBefore(LocalDate.now())) {
            fail("RULE-VAL-005", "dateOfBirth", "Date of birth must be earlier than today.");
        }
        requiredYesNo(request.primaryCardHolderIndicator(), "primaryCardHolderIndicator", "RULE-VAL-013");
    }

    public void cardUpdate(ApiDtos.CardUpdateRequest request) {
        requiredAlpha(request.embossedName(), "embossedName", "RULE-VAL-017");
        requiredYesNo(request.activeStatus(), "activeStatus", "RULE-VAL-018");
        LocalDate expiry = expiryDate(request.expirationDate());
        if (expiry.getMonthValue() < 1 || expiry.getMonthValue() > 12) {
            fail("RULE-VAL-019", "expirationDate", "Expiry month must be from 1 through 12.");
        }
        if (expiry.getYear() < 1950 || expiry.getYear() > 2099) {
            fail("RULE-VAL-020", "expirationDate", "Expiry year must be from 1950 through 2099.");
        }
    }

    public void selection(String action, boolean selected) {
        if (selected && !"S".equalsIgnoreCase(action)) {
            fail("RULE-VAL-027", "action", "Selected transactions require action S.");
        }
    }

    public void transactionFilter(String transactionId) {
        if (!blank(transactionId) && !transactionId.matches("\\d{1,16}")) {
            fail("RULE-VAL-027", "fromTransactionId", "Transaction ID filter must contain 1 through 16 digits.");
        }
    }

    public void transactionLookup(String transactionId) {
        require(transactionId, "transactionId", "RULE-VAL-028", "Transaction ID is required.");
        if (!transactionId.matches("\\d{1,16}")) {
            fail("RULE-VAL-028", "transactionId", "Transaction ID must contain 1 through 16 digits.");
        }
    }

    public void transaction(ApiDtos.TransactionCreateRequest request) {
        confirmation(request.confirmation(), "RULE-VAL-029", "Transaction confirmation is required.");
        if (request.accountId() == null && blank(request.cardNumber())) {
            fail("RULE-VAL-030", "accountId/cardNumber", "Supply either an account ID or a card number.");
        }
        if (request.accountId() != null) {
            validAccountId(request.accountId(), "RULE-VAL-030", "Account ID must be a non-zero 11-digit number.");
        }
        if (!blank(request.cardNumber()) && !request.cardNumber().matches("\\d{16}")) {
            fail("RULE-VAL-030", "cardNumber", "Card number must be a 16-digit number.");
        }
        require(request.transactionTypeCode(), "transactionTypeCode", "RULE-VAL-031", "Transaction type code is required.");
        if (request.transactionCategoryCode() == null) fail("RULE-VAL-031", "transactionCategoryCode", "Transaction category code is required.");
        require(request.source(), "source", "RULE-VAL-031", "Transaction source is required.");
        require(request.description(), "description", "RULE-VAL-031", "Transaction description is required.");
        if (request.amount() == null) fail("RULE-VAL-031", "amount", "Transaction amount is required.");
        if (request.originDate() == null) fail("RULE-VAL-031", "originDate", "Original date is required.");
        if (request.processingDate() == null) fail("RULE-VAL-031", "processingDate", "Processing date is required.");
        if (request.merchantId() == null) fail("RULE-VAL-031", "merchantId", "Merchant ID is required.");
        require(request.merchantName(), "merchantName", "RULE-VAL-031", "Merchant name is required.");
        require(request.merchantCity(), "merchantCity", "RULE-VAL-031", "Merchant city is required.");
        require(request.merchantZip(), "merchantZip", "RULE-VAL-031", "Merchant ZIP is required.");
        if (!DIGITS.matcher(request.transactionTypeCode()).matches()) {
            fail("RULE-VAL-032", "transactionTypeCode", "Transaction type code must be numeric.");
        }
        if (request.transactionCategoryCode() < 0) fail("RULE-VAL-032", "transactionCategoryCode", "Transaction category code must be numeric.");
        if (request.amount().scale() != 2 || request.amount().precision() - request.amount().scale() > 8) {
            fail("RULE-VAL-033", "amount", "Amount must use the -99999999.99 fixed-decimal format.");
        }
        if (request.merchantId() < 0) fail("RULE-VAL-035", "merchantId", "Merchant ID must be numeric.");
    }

    public void userFields(String userId, String firstName, String lastName, String password, String userType) {
        require(userId, "userId", "RULE-VAL-023", "User ID is required.");
        require(firstName, "firstName", "RULE-VAL-023", "First name is required.");
        require(lastName, "lastName", "RULE-VAL-023", "Last name is required.");
        require(password, "password", "RULE-VAL-023", "Password is required.");
        require(userType, "userType", "RULE-VAL-023", "User type is required.");
        maxLength(userId, 8, "userId", "RULE-VAL-023");
        maxLength(firstName, 20, "firstName", "RULE-VAL-023");
        maxLength(lastName, 20, "lastName", "RULE-VAL-023");
        maxLength(password, 8, "password", "RULE-VAL-023");
        if (!userType.matches("[AaUu]")) fail("RULE-VAL-023", "userType", "User type must be A or U.");
    }

    public void userLookup(String userId) { require(userId, "userId", "RULE-VAL-023", "User ID is required."); }
    public void signOn(String userId, String password) {
        require(userId, "userId", "RULE-VAL-025", "User ID is required.");
        require(password, "password", "RULE-VAL-025", "Password is required.");
    }
    public void billPayment(Long accountId, String confirmation) {
        if (accountId == null) fail("RULE-VAL-026", "accountId", "Account ID is required.");
        confirmation(confirmation, "RULE-VAL-026", "Please confirm the bill payment.");
    }
    public void report(ApiDtos.ReportRequest request) {
        if (request.type() == null) fail("RULE-VAL-037", "type", "Select a report type.");
        if (request.type() == ApiDtos.ReportType.CUSTOM && (request.startDate() == null || request.endDate() == null)) {
            fail("RULE-VAL-037", "startDate/endDate", "Custom reports require start and end dates.");
        }
        confirmation(request.confirmation(), "RULE-VAL-038", "Please confirm the report request.");
    }

    public void menuChoice(String option, int optionCount) {
        if (blank(option) || !DIGITS.matcher(option).matches() || Integer.parseInt(option) == 0 || Integer.parseInt(option) > optionCount) {
            fail("RULE-VAL-021", "option", "Menu choice must be a configured non-zero numeric option.");
        }
    }
    public void cardListActions(Iterable<String> actions) {
        int selections = 0;
        for (String action : actions) {
            if (blank(action)) continue;
            if (!"S".equalsIgnoreCase(action) && !"U".equalsIgnoreCase(action)) fail("RULE-VAL-016", "action", "Card action must be S, U, or blank.");
            selections++;
        }
        if (selections > 1) fail("RULE-VAL-016", "action", "Only one card row may be selected.");
    }

    /**
     * JSON numeric account IDs discard legacy leading zeroes (for example, 00000000001 becomes 1).
     * Accept the normalized 1–11 digit representation while rejecting zero and oversized values.
     */
    private void validAccountId(Long accountId, String rule, String message) {
        if (accountId <= 0 || String.valueOf(accountId).length() > 11) fail(rule, "accountId", message);
    }
    private void maxLength(String value, int max, String field, String rule) {
        if (value.length() > max) fail(rule, field, "Value must not exceed " + max + " characters.");
    }
    private void monetary(BigDecimal value, String field) {
        if (value == null || value.scale() > 2) fail("RULE-VAL-004", field, "Amount is required and must have at most two decimal places.");
    }
    private void requiredRange(Integer value, int min, int max, String field, String rule) {
        if (value == null || value < min || value > max) fail(rule, field, "Value must be between " + min + " and " + max + ".");
    }
    private void requiredAlpha(String value, String field, String rule) {
        require(value, field, rule, "Value is required.");
        if (!ALPHA_SPACE.matcher(value).matches()) fail(rule, field, "Value may contain only alphabetic characters and spaces.");
    }
    private void optionalAlpha(String value, String field, String rule) { if (!blank(value) && !ALPHA_SPACE.matcher(value).matches()) fail(rule, field, "Value may contain only alphabetic characters and spaces."); }
    private void zip(String value, String field, String rule) {
        if (blank(value) || value.length() < 5 || !value.substring(0, 5).matches("\\d{5}") || "00000".equals(value.substring(0, 5))) {
            fail(rule, field, "The first five ZIP characters must be a non-zero numeric ZIP value.");
        }
    }
    private void numericNonZero(String value, String field, String rule) {
        if (blank(value) || !DIGITS.matcher(value).matches() || value.chars().allMatch(ch -> ch == '0')) fail(rule, field, "Value must be a non-zero number.");
    }
    private void phone(String value, String field) {
        if (blank(value)) return;
        var match = PHONE.matcher(value);
        if (!match.matches() || "000".equals(match.group(1)) || "000".equals(match.group(2)) || "0000".equals(match.group(3)) || !GENERAL_PURPOSE_AREA_CODES.contains(match.group(1))) {
            fail("RULE-VAL-011", field, "Phone must be a non-zero North American number with a recognized area code.");
        }
    }
    private void ssn(String value) {
        if (value == null || !value.matches("\\d{9}")) fail("RULE-VAL-012", "ssn", "SSN must be exactly nine digits.");
        String first = value.substring(0, 3);
        String middle = value.substring(3, 5);
        String last = value.substring(5);
        if ("000".equals(first) || "000".equals(middle) || "0000".equals(last) || "666".equals(first) || first.compareTo("900") >= 0) {
            fail("RULE-VAL-012", "ssn", "SSN components must be non-zero; the first three digits cannot be 000, 666, or 900-999.");
        }
    }
    private LocalDate expiryDate(String value) {
        require(value, "expirationDate", "RULE-VAL-019", "Date is required.");
        try {
            LocalDate parsed = value.matches("\\d{8}") ? LocalDate.parse(value, BASIC_DATE) : LocalDate.parse(value, ISO_DATE);
            if (parsed.getYear() < 1900 || parsed.getYear() > 2099) fail("RULE-VAL-020", "expirationDate", "Expiry year must be from 1950 through 2099.");
            return parsed;
        } catch (DateTimeParseException ignored) {
            fail("RULE-VAL-019", "expirationDate", "Date must be a valid calendar date.");
            throw new IllegalStateException("unreachable");
        }
    }
    private LocalDate calendarDate(String value, String field, String rule) {
        require(value, field, rule, "Date is required.");
        try {
            LocalDate parsed;
            if (value.matches("\\d{8}")) parsed = LocalDate.parse(value, BASIC_DATE);
            else if (value.matches("\\d{4}-\\d{2}-\\d{2}")) parsed = LocalDate.parse(value, ISO_DATE);
            else throw new DateTimeParseException("Invalid date", value, 0);
            if (parsed.getYear() < 1900 || parsed.getYear() > 2099) fail(rule, field, "Date year must be from 1900 through 2099.");
            return parsed;
        } catch (DateTimeParseException ignored) { }
        fail(rule, field, "Date must be a valid calendar date in CCYYMMDD or YYYY-MM-DD form.");
        throw new IllegalStateException("unreachable");
    }
    private void requiredYesNo(String value, String field, String rule) { if (!"Y".equals(value) && !"N".equals(value)) fail(rule, field, "Value must be Y or N."); }
    private void confirmation(String value, String rule, String prompt) {
        if (blank(value) || "N".equalsIgnoreCase(value)) fail(rule, "confirmation", prompt);
        if (!"Y".equalsIgnoreCase(value)) fail(rule, "confirmation", "Confirmation must be Y or N.");
    }
    private void require(String value, String field, String rule, String message) { if (blank(value)) fail(rule, field, message); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private void fail(String rule, String field, String message) { throw new ApiException(HttpStatus.BAD_REQUEST, rule, message, rule, field); }
}
