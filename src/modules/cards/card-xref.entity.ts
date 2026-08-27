import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccountEntity } from '../accounts/account.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { CardEntity } from './card.entity';

@Entity('card_xrefs')
export class CardXrefEntity {
  @PrimaryColumn({ name: 'card_number', type: 'char', length: 16 }) cardNumber!: string;
  @Column({ name: 'customer_id', type: 'char', length: 9 }) customerId!: string;
  @Column({ name: 'account_id', type: 'char', length: 11 }) accountId!: string;
  @ManyToOne(() => CardEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'card_number' })
  card!: CardEntity;
  @ManyToOne(() => CustomerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;
  @ManyToOne(() => AccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account!: AccountEntity;
}
