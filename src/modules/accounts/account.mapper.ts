import { trimFixed } from '../../common/validation/legacy-write.validators';
import { AccountEntity } from './account.entity';
export function toAccountDetail(account: AccountEntity): Record<string, unknown> {
  return {
    id: trimFixed(account.id),
    status: account.status,
    currentBalance: account.currentBalance,
    creditLimit: account.creditLimit,
    cashCreditLimit: account.cashCreditLimit,
    openDate: account.openDate,
    expirationDate: account.expirationDate,
    reissueDate: account.reissueDate,
    currentCycleCredit: account.currentCycleCredit,
    currentCycleDebit: account.currentCycleDebit,
    addressZip: trimFixed(account.addressZip),
    groupId: trimFixed(account.groupId),
    version: account.version,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
