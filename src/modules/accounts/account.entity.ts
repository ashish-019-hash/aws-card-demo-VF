import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base.entity';

@Entity('accounts')
@Check(`"id" ~ '^[0-9]{11}$'`)
@Check(`"status" IN ('Y', 'N')`)
export class AccountEntity extends VersionedEntity {
  @PrimaryColumn({ type: 'char', length: 11 }) id!: string;
  @Column({ type: 'char', length: 1 }) status!: 'Y' | 'N';
  @Column({ name: 'current_balance', type: 'numeric', precision: 12, scale: 2 })
  currentBalance!: string;
  @Column({ name: 'credit_limit', type: 'numeric', precision: 12, scale: 2 }) creditLimit!: string;
  @Column({ name: 'cash_credit_limit', type: 'numeric', precision: 12, scale: 2 })
  cashCreditLimit!: string;
  @Column({ name: 'open_date', type: 'date' }) openDate!: string;
  @Column({ name: 'expiration_date', type: 'date' }) expirationDate!: string;
  @Column({ name: 'reissue_date', type: 'date' }) reissueDate!: string;
  @Column({ name: 'current_cycle_credit', type: 'numeric', precision: 12, scale: 2 })
  currentCycleCredit!: string;
  @Column({ name: 'current_cycle_debit', type: 'numeric', precision: 12, scale: 2 })
  currentCycleDebit!: string;
  @Column({ name: 'address_zip', type: 'char', length: 10 }) addressZip!: string;
  @Column({ name: 'group_id', type: 'char', length: 10 }) groupId!: string;
}
