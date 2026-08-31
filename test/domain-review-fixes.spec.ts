import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { configuration } from '../src/config/configuration';
import { UpdateAccountDto } from '../src/modules/accounts/dto/accounts.dto';
import { ListTransactionsQueryDto } from '../src/modules/transactions/dto/transactions.dto';

async function validationErrors(value: object): Promise<number> {
  return (await validate(value)).length;
}

describe('domain review fixes', () => {
  it('validates nested account and customer documents', async () => {
    const dto = plainToInstance(UpdateAccountDto, {
      expectedVersion: '1',
      account: { openDate: '2024-02-30' },
      customer: { id: '123456789', expectedVersion: '2', changes: { ficoScore: 851 } },
    });

    expect(await validationErrors(dto)).toBeGreaterThan(0);
  });

  it('accepts bounded nested values after transformation', async () => {
    const dto = plainToInstance(UpdateAccountDto, {
      expectedVersion: '1',
      account: { openDate: '2024-02-29', currentBalance: '0.00' },
      customer: { id: '123456789', expectedVersion: '2', changes: { ficoScore: '850' } },
    });

    expect(await validationErrors(dto)).toBe(0);
    expect(dto.customer?.changes.ficoScore).toBe(850);
  });

  it('transforms and bounds transaction page limits', async () => {
    const valid = plainToInstance(ListTransactionsQueryDto, { limit: '100' });
    const invalid = plainToInstance(ListTransactionsQueryDto, { limit: '101' });
    expect(valid.limit).toBe(100);
    expect(await validationErrors(valid)).toBe(0);
    expect(await validationErrors(invalid)).toBeGreaterThan(0);
  });

  it('defaults application logging to Nest log level', () => {
    const previous = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    expect(configuration().logLevel).toBe('log');
    if (previous === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = previous;
  });
});
