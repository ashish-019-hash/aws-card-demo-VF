import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type {
  ReportArtifactMetadata,
  ReportJobStatus,
  ReportKind,
  ReportTimestampMode,
  ReportWarning,
} from './report-types';

@Entity('report_jobs')
export class ReportJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 16 }) status!: ReportJobStatus;
  @Column({ name: 'report_kind', type: 'varchar', length: 16 }) reportKind!: ReportKind;
  @Column({ name: 'timestamp_mode', type: 'varchar', length: 32 })
  timestampMode!: ReportTimestampMode;
  @Column({ name: 'range_start', type: 'date' }) rangeStart!: string;
  @Column({ name: 'range_end', type: 'date' }) rangeEnd!: string;
  @Column({ type: 'integer', default: 0 }) attempts!: number;
  @Column({ name: 'next_attempt_at', type: 'timestamptz' }) nextAttemptAt!: string;
  @Column({ name: 'lease_token', type: 'uuid', nullable: true }) leaseToken!: string | null;
  @Column({ name: 'lease_owner', type: 'varchar', length: 128, nullable: true }) leaseOwner!:
    | string
    | null;
  @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true }) leaseExpiresAt!:
    | string
    | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!:
    | string
    | null;
  @Column({ name: 'artifact', type: 'bytea', nullable: true, select: false })
  artifact!: Buffer | null;
  @Column({ name: 'artifact_sha256', type: 'char', length: 64, nullable: true }) artifactSha256!:
    | string
    | null;
  @Column({ name: 'artifact_length', type: 'integer', nullable: true }) artifactLength!:
    | number
    | null;
  @Column({ name: 'artifact_content_type', type: 'varchar', length: 64, nullable: true })
  artifactContentType!: string | null;
  @Column({ name: 'artifact_filename', type: 'varchar', length: 255, nullable: true })
  artifactFilename!: string | null;
  @Column({ name: 'artifact_metadata', type: 'jsonb', nullable: true })
  artifactMetadata!: ReportArtifactMetadata | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) warnings!: ReportWarning[];
  @Column({ name: 'error_message', type: 'text', nullable: true }) errorMessage!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: string;
  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: string;
}
