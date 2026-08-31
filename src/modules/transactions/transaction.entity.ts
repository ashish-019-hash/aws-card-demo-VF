import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { TimestampedEntity } from '../../database/base.entity';

@Entity('transactions')
@Check(`"id" ~ '^[0-9]{16}$'`)
@Check(`"amount" BETWEEN -9999999999.99 AND 9999999999.99`)
@Index('idx_transactions_card_effective_report', ['cardNumber', 'processedTs', 'originalTs'])
export class TransactionEntity extends TimestampedEntity {
  @PrimaryColumn({ type: 'char', length: 16 }) id!: string;
  @Column({ name: 'type_code', type: 'char', length: 2 }) typeCode!: string;
  @Column({ name: 'category_code', type: 'char', length: 4 }) categoryCode!: string;
  @Column({ type: 'varchar', length: 10 }) source!: string;
  @Column({ type: 'varchar', length: 100 }) description!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount!: string;
  @Column({ name: 'merchant_id', type: 'char', length: 9 }) merchantId!: string;
  @Column({ name: 'merchant_name', type: 'varchar', length: 50 }) merchantName!: string;
  @Column({ name: 'merchant_city', type: 'varchar', length: 50 }) merchantCity!: string;
  @Column({ name: 'merchant_zip', type: 'char', length: 10 }) merchantZip!: string;
  @Column({ name: 'card_number', type: 'char', length: 16 }) cardNumber!: string;
  @Column({ name: 'original_ts', type: 'timestamp', precision: 6 }) originalTs!: string;
  @Column({ name: 'processed_ts', type: 'timestamp', precision: 6, nullable: true }) processedTs!:
    | string
    | null;
}
