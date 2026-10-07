package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;

class TransactionIdAllocatorTest {
    @Test
    void issuesUniqueIdsUnderConcurrencyAndSkipsPersistedMaximum() throws Exception {
        TransactionIdAllocator allocator = new TransactionIdAllocator();
        assertThat(allocator.next(new BigInteger("41"))).isEqualTo("0000000000000042");

        Set<String> issued = ConcurrentHashMap.newKeySet();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<String>> tasks = java.util.stream.IntStream.range(0, 200)
                    .<Callable<String>>mapToObj(i -> () -> allocator.next(BigInteger.ZERO)).toList();
            for (Future<String> future : pool.invokeAll(tasks)) issued.add(future.get());
        } finally {
            pool.shutdown();
        }
        assertThat(issued).hasSize(200);
        issued.forEach(id -> assertThat(id).matches("[0-9]{16}"));
        // A later, higher persisted maximum (e.g. a manually keyed transaction) is skipped over.
        assertThat(allocator.next(new BigInteger("5000"))).isEqualTo("0000000000005001");
    }
}
