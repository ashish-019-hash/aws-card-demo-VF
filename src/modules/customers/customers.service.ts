import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountsService } from '../accounts/accounts.service';
import { CardEntity } from '../cards/card.entity';
import { CardXrefEntity } from '../cards/card-xref.entity';
import { CustomerEntity } from './customer.entity';
import { toCustomerDetail } from './customer.mapper';
@Injectable()
export class CustomersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accounts: AccountsService,
  ) {}
  async detail(id: string): Promise<Record<string, unknown>> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('customer')
      .addSelect(['customer.ssn', 'customer.governmentIssuedId'])
      .where('customer.id = :id', { id })
      .getOne();
    if (!customer)
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    const xrefs = await this.dataSource
      .getRepository(CardXrefEntity)
      .find({ where: { customerId: id }, order: { accountId: 'ASC', cardNumber: 'ASC' } });
    const accounts = [...new Set(xrefs.map((xref) => xref.accountId))];
    const cards = xrefs.length
      ? await this.dataSource
          .getRepository(CardEntity)
          .findBy(xrefs.map((xref) => ({ number: xref.cardNumber })))
      : [];
    return {
      customer: toCustomerDetail(customer),
      relationships: await Promise.all(
        accounts.sort().map(async (accountId) => {
          const joined = await this.accounts.detail(accountId);
          const account = joined.account;
          return {
            account,
            cards: xrefs
              .filter((xref) => xref.accountId === accountId)
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
          };
        }),
      ),
    };
  }
}
