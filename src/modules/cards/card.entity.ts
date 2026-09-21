import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccountEntity } from '../accounts/account.entity';
import { VersionedEntity } from '../../database/base.entity';

@Entity('cards')
@Check(`"number" ~ '^[0-9]{16}$'`)
@Check(`"status" IN ('Y', 'N')`)
export class CardEntity extends VersionedEntity {
  @PrimaryColumn({ type: 'char', length: 16 }) number!: string;
  @Column({ name: 'account_id', type: 'char', length: 11 }) accountId!: string;
  @ManyToOne(() => AccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;
  @Column({ type: 'char', length: 3, select: false }) cvv!: string;
  @Column({ name: 'embossed_name', type: 'varchar', length: 50 }) embossedName!: string;
  @Column({ name: 'expiry_date', type: 'date' }) expiryDate!: string;
  @Column({ type: 'char', length: 1 }) status!: 'Y' | 'N';
}
