package com.carddemo.backend.validation;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Reference/lookup data extracted verbatim from the compiled-in constants in
 * {@code 00.phase-1-input/cpy/CSLKPCDY.cpy} (see business-entities.md ENTITY-011):
 * valid NANP "general purpose" phone area codes, valid US state/territory codes, and
 * valid state + first-2-digits-of-zip combinations. Loaded once at startup from
 * classpath resources under {@code reference-data/} that were extracted from the
 * copybook's {@code 88}-level VALUE lists (not re-typed by hand).
 */
@Component
public class ReferenceData {

    private final Set<String> validAreaCodes = load("valid-area-codes.txt");
    private final Set<String> validStateCodes = load("valid-state-codes.txt");
    private final Set<String> validStateZipCombos = load("valid-state-zip.txt");

    public boolean isValidAreaCode(String areaCode) {
        return validAreaCodes.contains(areaCode);
    }

    public boolean isValidStateCode(String stateCode) {
        return validStateCodes.contains(stateCode);
    }

    public boolean isValidStateZipCombo(String stateCode, String zipFirst2) {
        return validStateZipCombos.contains(stateCode + zipFirst2);
    }

    private Set<String> load(String resource) {
        Set<String> values = new HashSet<>();
        try (InputStream is = new ClassPathResource("reference-data/" + resource).getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.US_ASCII))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String t = line.trim();
                if (!t.isEmpty()) {
                    values.add(t);
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("Unable to load reference data " + resource, e);
        }
        return values;
    }
}
