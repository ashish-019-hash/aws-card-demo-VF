import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('legacy_import_runs')
export class LegacyImportRunEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'source_mode', type: 'varchar', length: 32 }) sourceMode!:
    | 'canonical-ebcdic'
    | 'ascii-mirror';
  @Column({ type: 'varchar', length: 16 }) status!: 'running' | 'completed' | 'partial' | 'failed';
  @Column({ type: 'boolean', default: false }) canonical!: boolean;
  @Column({ name: 'source_hashes', type: 'jsonb' }) sourceHashes!: Record<string, string>;
  @Column({ name: 'record_counts', type: 'jsonb' }) recordCounts!: Record<string, unknown>;
  @Column({ name: 'allowed_divergences', type: 'jsonb', default: () => "'[]'::jsonb" })
  allowedDivergences!: string[];
  @Column({ type: 'jsonb', nullable: true }) artifacts!: Record<string, unknown> | null;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: string;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!:
    | string
    | null;
}
