import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
@Injectable()
export class TransactionIdAllocatorService {
  async allocate(manager: EntityManager): Promise<string> {
    try {
      const rows = await manager.query<{ id: string }[]>('SELECT allocate_transaction_id() AS id');
      return rows[0]!.id.trimEnd();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { message?: string }).message?.includes('exhausted')
      )
        throw new ServiceUnavailableException({
          code: 'TRANSACTION_ID_EXHAUSTED',
          message: 'Transaction ID sequence exhausted.',
        });
      throw error;
    }
  }
}
