import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction_types')
export class TransactionTypeEntity {
  @PrimaryColumn({ type: 'char', length: 2 }) code!: string;
  @Column({ type: 'varchar', length: 50 }) description!: string;
}

@Entity('transaction_categories')
export class TransactionCategoryEntity {
  @PrimaryColumn({ name: 'type_code', type: 'char', length: 2 }) typeCode!: string;
  @PrimaryColumn({ type: 'char', length: 4 }) code!: string;
  @Column({ type: 'varchar', length: 50 }) description!: string;
}

@Entity('disclosure_groups')
export class DisclosureGroupEntity {
  @PrimaryColumn({ name: 'account_group_id', type: 'char', length: 10 }) accountGroupId!: string;
  @PrimaryColumn({ name: 'transaction_type_code', type: 'char', length: 2 })
  transactionTypeCode!: string;
  @PrimaryColumn({ name: 'transaction_category_code', type: 'char', length: 4 })
  transactionCategoryCode!: string;
  @Column({ name: 'interest_rate', type: 'numeric', precision: 6, scale: 2 }) interestRate!: string;
}

@Entity('category_balances')
@Check(`"account_id" ~ '^[0-9]{11}$'`)
export class CategoryBalanceEntity {
  @PrimaryColumn({ name: 'account_id', type: 'char', length: 11 }) accountId!: string;
  @PrimaryColumn({ name: 'transaction_type_code', type: 'char', length: 2 })
  transactionTypeCode!: string;
  @PrimaryColumn({ name: 'transaction_category_code', type: 'char', length: 4 })
  transactionCategoryCode!: string;
  @Column({ type: 'numeric', precision: 11, scale: 2 }) balance!: string;
}
