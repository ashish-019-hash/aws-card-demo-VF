import { Column, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export abstract class VersionedEntity {
  @VersionColumn({ type: 'integer', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: string;
}

export abstract class TimestampedEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;
}
