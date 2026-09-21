import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base.entity';

@Entity('customers')
@Check(`"id" ~ '^[0-9]{9}$'`)
@Check(`"fico_score" BETWEEN 0 AND 999`)
export class CustomerEntity extends VersionedEntity {
  @PrimaryColumn({ type: 'char', length: 9 }) id!: string;
  @Column({ name: 'first_name', type: 'varchar', length: 25 }) firstName!: string;
  @Column({ name: 'middle_name', type: 'varchar', length: 25, nullable: true }) middleName!:
    | string
    | null;
  @Column({ name: 'last_name', type: 'varchar', length: 25 }) lastName!: string;
  @Column({ name: 'address_line_1', type: 'varchar', length: 50 }) addressLine1!: string;
  @Column({ name: 'address_line_2', type: 'varchar', length: 50, nullable: true }) addressLine2!:
    | string
    | null;
  @Column({ name: 'address_line_3', type: 'varchar', length: 50, nullable: true }) addressLine3!:
    | string
    | null;
  @Column({ name: 'address_state_code', type: 'char', length: 2 }) addressStateCode!: string;
  @Column({ name: 'address_country_code', type: 'char', length: 3 }) addressCountryCode!: string;
  @Column({ name: 'address_zip', type: 'char', length: 10 }) addressZip!: string;
  @Column({ name: 'phone_number_1', type: 'varchar', length: 15, nullable: true }) phoneNumber1!:
    | string
    | null;
  @Column({ name: 'phone_number_2', type: 'varchar', length: 15, nullable: true }) phoneNumber2!:
    | string
    | null;
  @Column({ type: 'char', length: 9, select: false }) ssn!: string;
  @Column({ name: 'government_issued_id', type: 'varchar', length: 20, select: false })
  governmentIssuedId!: string;
  @Column({ type: 'date' }) dob!: string;
  @Column({ name: 'eft_account_id', type: 'char', length: 10, nullable: true }) eftAccountId!:
    | string
    | null;
  @Column({ name: 'primary_card_holder', type: 'char', length: 1 }) primaryCardHolder!: 'Y' | 'N';
  @Column({ name: 'fico_score', type: 'smallint' }) ficoScore!: number;
}
