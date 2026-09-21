import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base.entity';

@Entity('users')
@Check(`"id" ~ '^[A-Z0-9]{8}$'`)
@Check(`"role" IN ('A', 'U')`)
export class UserEntity extends VersionedEntity {
  @PrimaryColumn({ type: 'varchar', length: 8 }) id!: string;
  @Column({ name: 'first_name', type: 'varchar', length: 20 }) firstName!: string;
  @Column({ name: 'last_name', type: 'varchar', length: 20 }) lastName!: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash!: string;
  @Column({ type: 'char', length: 1 }) role!: 'A' | 'U';
}
