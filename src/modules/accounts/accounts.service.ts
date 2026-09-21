import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  isLegacyDate,
  isLegacyPhone,
  isLegacySsn,
  isStateZipPrefix,
} from '../../common/validation/legacy-write.validators';
import { CardEntity } from '../cards/card.entity';
import { CardXrefEntity } from '../cards/card-xref.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { toCustomerDetail } from '../customers/customer.mapper';
import { AccountEntity } from './account.entity';
import { toAccountDetail } from './account.mapper';
import {
  type AccountChangesDto,
  type CustomerChangesDto,
  type UpdateAccountDto,
} from './dto/accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly dataSource: DataSource) {}
  async detail(id: string): Promise<Record<string, unknown>> {
    const account = await this.dataSource.getRepository(AccountEntity).findOneBy({ id });
    if (!account) throw accountNotFound();
    return this.joined(account);
  }
  async update(id: string, dto: UpdateAccountDto): Promise<Record<string, unknown>> {
    if (!dto.account && !dto.customer) throw noChanges();
    return this.dataSource.transaction(async (manager) => {
      const account = await manager
        .createQueryBuilder(AccountEntity, 'account')
        .setLock('pessimistic_write')
        .where('account.id = :id', { id })
        .getOne();
      if (!account) throw accountNotFound();
      const xrefs = await manager
        .createQueryBuilder(CardXrefEntity, 'xref')
        .setLock('pessimistic_read')
        .where('xref.account_id = :id', { id })
        .orderBy('xref.card_number')
        .getMany();
      if (account.version !== dto.expectedVersion)
        throw new ConflictException({
          code: 'VERSION_CONFLICT',
          message: 'Version does not match.',
        });
      if (dto.account && !hasAccountChange(account, dto.account)) throw noChanges();
      if (dto.customer) {
        if (!xrefs.some((xref) => xref.customerId.trimEnd() === dto.customer!.id))
          throw new NotFoundException({
            code: 'ACCOUNT_CUSTOMER_LINK_NOT_FOUND',
            message: 'Customer is not linked to account.',
          });
        validateCustomerChanges(dto.customer.changes);
        const customer = await manager
          .createQueryBuilder(CustomerEntity, 'customer')
          .addSelect(['customer.ssn', 'customer.governmentIssuedId'])
          .setLock('pessimistic_write')
          .where('customer.id = :id', { id: dto.customer.id })
          .getOne();
        if (!customer)
          throw new NotFoundException({
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found.',
          });
        if (!hasCustomerChange(customer, dto.customer.changes)) throw noChanges();
        if (dto.account)
          await this.updateAccount(manager, account, dto.expectedVersion, dto.account);
        await this.updateCustomer(
          manager,
          customer,
          dto.customer.expectedVersion,
          dto.customer.changes,
        );
      } else if (dto.account)
        await this.updateAccount(manager, account, dto.expectedVersion, dto.account);
      const fresh = await manager.findOneByOrFail(AccountEntity, { id });
      return this.joined(fresh, manager);
    });
  }
  private async updateAccount(
    manager: EntityManager,
    entity: AccountEntity,
    expectedVersion: number,
    changes: AccountChangesDto,
  ): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(AccountEntity)
      .set({
        ...accountUpdateValues(changes),
        version: () => 'version + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND version = :version', { id: entity.id, version: expectedVersion })
      .execute();
    if (result.affected !== 1)
      throw await versionOrNotFound(manager, AccountEntity, entity.id, accountNotFound);
  }
  private async updateCustomer(
    manager: EntityManager,
    entity: CustomerEntity,
    expectedVersion: number,
    changes: CustomerChangesDto,
  ): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(CustomerEntity)
      .set({
        ...customerUpdateValues(changes),
        version: () => 'version + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('id = :id AND version = :version', { id: entity.id, version: expectedVersion })
      .execute();
    if (result.affected !== 1)
      throw await versionOrNotFound(
        manager,
        CustomerEntity,
        entity.id,
        () => new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' }),
      );
  }
  async joined(
    account: AccountEntity,
    manager = this.dataSource.manager,
  ): Promise<Record<string, unknown>> {
    const xrefs = await manager
      .getRepository(CardXrefEntity)
      .find({ where: { accountId: account.id }, order: { customerId: 'ASC', cardNumber: 'ASC' } });
    const customerIds = [...new Set(xrefs.map((xref) => xref.customerId))];
    const customers = customerIds.length
      ? await manager
          .getRepository(CustomerEntity)
          .createQueryBuilder('customer')
          .addSelect(['customer.ssn', 'customer.governmentIssuedId'])
          .where('customer.id IN (:...ids)', { ids: customerIds })
          .getMany()
      : [];
    const cards = xrefs.length
      ? await manager
          .getRepository(CardEntity)
          .findBy(xrefs.map((xref) => ({ number: xref.cardNumber })))
      : [];
    return {
      account: toAccountDetail(account),
      relationships: customers
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((customer) => ({
          customer: toCustomerDetail(customer),
          cards: xrefs
            .filter((xref) => xref.customerId === customer.id)
            .map((xref) => cards.find((card) => card.number === xref.cardNumber))
            .filter((card): card is CardEntity => Boolean(card))
            .sort((a, b) => a.number.localeCompare(b.number))
            .map((card) => ({
              number: card.number.trimEnd(),
              accountId: card.accountId.trimEnd(),
              embossedName: card.embossedName,
              expiryDate: card.expiryDate,
              status: card.status,
              version: card.version,
            })),
        })),
    };
  }
}
const ACCOUNT_MUTABLE_FIELDS = [
  'status',
  'currentBalance',
  'creditLimit',
  'cashCreditLimit',
  'openDate',
  'expirationDate',
  'reissueDate',
  'currentCycleCredit',
  'currentCycleDebit',
  'addressZip',
  'groupId',
] as const;
const CUSTOMER_MUTABLE_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'addressStateCode',
  'addressCountryCode',
  'addressZip',
  'phoneNumber1',
  'phoneNumber2',
  'ssn',
  'governmentIssuedId',
  'dob',
  'eftAccountId',
  'primaryCardHolder',
  'ficoScore',
] as const;

function hasAccountChange(entity: AccountEntity, changes: AccountChangesDto): boolean {
  return ACCOUNT_MUTABLE_FIELDS.some(
    (field) => changes[field] !== undefined && changes[field] !== entity[field],
  );
}

function hasCustomerChange(entity: CustomerEntity, changes: CustomerChangesDto): boolean {
  return CUSTOMER_MUTABLE_FIELDS.some(
    (field) => changes[field] !== undefined && changes[field] !== entity[field],
  );
}

function accountUpdateValues(changes: AccountChangesDto): Partial<AccountEntity> {
  return pickMutable(changes, ACCOUNT_MUTABLE_FIELDS);
}

function customerUpdateValues(changes: CustomerChangesDto): Partial<CustomerEntity> {
  return pickMutable(changes, CUSTOMER_MUTABLE_FIELDS);
}

function pickMutable<T extends object, K extends keyof T>(
  changes: Partial<T>,
  fields: readonly K[],
): Partial<T> {
  const values: Partial<T> = {};
  for (const field of fields) {
    if (changes[field] !== undefined) values[field] = changes[field];
  }
  return values;
}

function validateCustomerChanges(changes: CustomerChangesDto): void {
  if (
    changes.dob !== undefined &&
    (!isLegacyDate(changes.dob) || changes.dob >= new Date().toISOString().slice(0, 10))
  )
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'dob must be a real historical date.',
    });
  if (
    (changes.phoneNumber1 && !isLegacyPhone(changes.phoneNumber1)) ||
    (changes.phoneNumber2 && !isLegacyPhone(changes.phoneNumber2))
  )
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Phone number is invalid.',
    });
  if (changes.ssn !== undefined && !isLegacySsn(changes.ssn))
    throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'SSN is invalid.' });
  if (
    changes.addressStateCode !== undefined &&
    changes.addressZip !== undefined &&
    !isStateZipPrefix(changes.addressStateCode, changes.addressZip)
  )
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'ZIP does not match state.',
    });
}
async function versionOrNotFound<T extends object>(
  manager: EntityManager,
  entity: { new (): T },
  id: string,
  notFound: () => Error,
): Promise<Error> {
  return (await manager.exists(entity, { where: { id } as never }))
    ? new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version does not match.' })
    : notFound();
}
const accountNotFound = (): NotFoundException =>
  new NotFoundException({ code: 'ACCOUNT_NOT_FOUND', message: 'Account not found.' });
const noChanges = (): BadRequestException =>
  new BadRequestException({
    code: 'NO_CHANGES',
    message: 'At least one effective change is required.',
  });
