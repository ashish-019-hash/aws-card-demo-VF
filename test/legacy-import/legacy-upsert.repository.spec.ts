import { LegacyUpsertRepository } from '../../src/modules/legacy-import/persistence/legacy-upsert.repository';
import type { ParsedSources } from '../../src/modules/legacy-import/validators/import.validator';

const account = (status: 'Y' | 'N') => ({
  dataset: 'accounts',
  record: 1,
  source: {},
  values: {
    id: '00000000001',
    status,
    currentBalance: '0.00',
    creditLimit: '1.00',
    cashCreditLimit: '1.00',
    openDate: '2022-01-01',
    expirationDate: '2023-01-01',
    reissueDate: '2023-01-01',
    currentCycleCredit: '0.00',
    currentCycleDebit: '0.00',
    addressZip: '          ',
    groupId: '          ',
  },
});

describe('LegacyUpsertRepository statuses', () => {
  it.each(['Y', 'N'] as const)('writes source status %s verbatim', async (status) => {
    const writes: Array<Array<string | null>> = [];
    const query = (_statement: string, parameters?: unknown[]): Promise<unknown[]> => {
      if (
        parameters?.every(
          (value): value is string | null => typeof value === 'string' || value === null,
        )
      )
        writes.push(parameters);
      return Promise.resolve([]);
    };
    const repository = new LegacyUpsertRepository({ query } as never);
    const sources: ParsedSources = { accounts: [account(status)] };

    await repository.upsertAll(sources);

    const accountWrite = writes.find((parameters) => parameters[0] === '00000000001');
    expect(accountWrite).toBeDefined();
    expect(accountWrite).toContain(status);
    expect(accountWrite).not.toContain(status === 'Y' ? 'A' : 'I');
  });
});
