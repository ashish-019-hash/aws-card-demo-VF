package com.aws.carddemo.service;

import java.math.BigInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

/**
 * Hands out 16-digit transaction IDs for generated financial records. The legacy
 * COBIL00C logic (STARTBR on the last TRANSACT key, +1) is kept, but the counter is
 * atomic so concurrent requests inside this single-JVM H2 demo runtime can never be
 * issued the same ID. The counter re-syncs with the persisted maximum on every call,
 * so manually keyed transactions with higher IDs are also skipped over.
 */
@Component
public class TransactionIdAllocator {
    private final AtomicReference<BigInteger> lastIssued = new AtomicReference<>(BigInteger.ZERO);

    /** Issues an ID strictly above both every previously issued ID and {@code persistedMax}. */
    public String next(BigInteger persistedMax) {
        BigInteger floor = persistedMax == null ? BigInteger.ZERO : persistedMax;
        BigInteger issued = lastIssued.updateAndGet(current -> current.max(floor).add(BigInteger.ONE));
        return String.format("%016d", issued);
    }
}
