import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { FormattedReport } from './report-formatter';
import type { ReportJobRecord, ReportKind, ReportTimestampMode } from './report-types';

interface CreateJobInput {
  reportKind: ReportKind;
  timestampMode: ReportTimestampMode;
  rangeStart: string;
  rangeEnd: string;
}

@Injectable()
export class ReportJobRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: CreateJobInput): Promise<ReportJobRecord> {
    const rows = resultRows(
      await this.dataSource.query(
        `INSERT INTO report_jobs (status, report_kind, timestamp_mode, range_start, range_end)
       VALUES ('pending', $1, $2, $3::date, $4::date) RETURNING ${columns()}`,
        [input.reportKind, input.timestampMode, input.rangeStart, input.rangeEnd],
      ),
    );
    return mapJob(first(rows));
  }

  async get(id: string): Promise<ReportJobRecord | null> {
    const rows = resultRows(
      await this.dataSource.query(`SELECT ${columns()} FROM report_jobs WHERE id = $1`, [id]),
    );
    return rows.length === 0 ? null : mapJob(first(rows));
  }

  async claim(
    workerId: string,
    leaseSeconds: number,
    maxAttempts: number,
  ): Promise<ReportJobRecord | null> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('READ COMMITTED');
    try {
      await runner.query(
        `UPDATE report_jobs SET status = 'failed', lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL,
          error_message = 'REPORT_ATTEMPTS_EXHAUSTED', updated_at = clock_timestamp()
         WHERE status = 'processing' AND lease_expires_at < clock_timestamp() AND attempts >= $1`,
        [maxAttempts],
      );
      const rows = resultRows(
        await runner.query(
          `WITH candidate AS (
           SELECT id FROM report_jobs
           WHERE (status = 'pending' AND next_attempt_at <= clock_timestamp())
              OR (status = 'processing' AND lease_expires_at < clock_timestamp() AND attempts < $1)
           ORDER BY CASE WHEN status = 'processing' THEN lease_expires_at ELSE next_attempt_at END, created_at, id
           FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE report_jobs job SET status = 'processing', attempts = job.attempts + 1,
           lease_token = gen_random_uuid(), lease_owner = $2,
           lease_expires_at = clock_timestamp() + make_interval(secs => $3), error_message = NULL,
           updated_at = clock_timestamp()
         FROM candidate WHERE job.id = candidate.id RETURNING ${columns('job')}`,
          [maxAttempts, workerId, leaseSeconds],
        ),
      );
      await runner.commitTransaction();
      return rows.length === 0 ? null : mapJob(first(rows));
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async heartbeat(id: string, token: string, leaseSeconds: number): Promise<boolean> {
    const result = resultRows(
      await this.dataSource.query(
        `UPDATE report_jobs SET lease_expires_at = clock_timestamp() + make_interval(secs => $3), updated_at = clock_timestamp()
       WHERE id = $1 AND status = 'processing' AND lease_token = $2 RETURNING id`,
        [id, token, leaseSeconds],
      ),
    );
    return result.length === 1;
  }

  async complete(id: string, token: string, report: FormattedReport): Promise<boolean> {
    const filename = `transaction-report-${report.metadata.rangeStart}-to-${report.metadata.rangeEnd}.txt`;
    const result = resultRows(
      await this.dataSource.query(
        `UPDATE report_jobs SET status = 'completed', artifact = $3, artifact_sha256 = $4, artifact_length = $5,
       artifact_content_type = 'text/plain; charset=us-ascii', artifact_filename = $6, artifact_metadata = $7::jsonb,
       warnings = $8::jsonb, completed_at = clock_timestamp(), lease_token = NULL, lease_owner = NULL,
       lease_expires_at = NULL, error_message = NULL, updated_at = clock_timestamp()
       WHERE id = $1 AND status = 'processing' AND lease_token = $2 RETURNING id`,
        [
          id,
          token,
          report.bytes,
          report.sha256,
          report.bytes.length,
          filename,
          JSON.stringify(report.metadata),
          JSON.stringify(report.warnings),
        ],
      ),
    );
    return result.length === 1;
  }

  async fail(
    id: string,
    token: string,
    error: unknown,
    retryable: boolean,
    maxAttempts: number,
    delaySeconds: number,
  ): Promise<boolean> {
    const message = safeError(error);
    const result = resultRows(
      await this.dataSource.query(
        `UPDATE report_jobs SET status = CASE WHEN $4 AND attempts < $5 THEN 'pending' ELSE 'failed' END,
       next_attempt_at = CASE WHEN $4 AND attempts < $5 THEN clock_timestamp() + make_interval(secs => $6) ELSE next_attempt_at END,
       lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL, error_message = $3, updated_at = clock_timestamp()
       WHERE id = $1 AND status = 'processing' AND lease_token = $2 RETURNING id`,
        [id, token, message, retryable, maxAttempts, delaySeconds],
      ),
    );
    return result.length === 1;
  }
}

function columns(alias = 'report_jobs'): string {
  return `${alias}.id, ${alias}.status, ${alias}.report_kind AS "reportKind", ${alias}.timestamp_mode AS "timestampMode", ${alias}.range_start AS "rangeStart", ${alias}.range_end AS "rangeEnd", ${alias}.attempts, ${alias}.next_attempt_at AS "nextAttemptAt", ${alias}.lease_token AS "leaseToken", ${alias}.lease_owner AS "leaseOwner", ${alias}.lease_expires_at AS "leaseExpiresAt", ${alias}.completed_at AS "completedAt", ${alias}.artifact_sha256 AS "artifactSha256", ${alias}.artifact_length AS "artifactLength", ${alias}.artifact_content_type AS "artifactContentType", ${alias}.artifact_filename AS "artifactFilename", ${alias}.artifact_metadata AS "artifactMetadata", ${alias}.warnings, ${alias}.error_message AS "errorMessage", ${alias}.created_at AS "createdAt", ${alias}.updated_at AS "updatedAt"`;
}
function resultRows(result: unknown): unknown[] {
  if (!Array.isArray(result)) throw new Error('Expected PostgreSQL query rows');
  const values = result as unknown[];
  const first = values.at(0);
  const second = values.at(1);
  return Array.isArray(first) && typeof second === 'number' ? first : values;
}
function first(rows: unknown[]): Record<string, unknown> {
  const row = rows[0];
  if (!row || typeof row !== 'object') throw new Error('Expected report job row');
  return row as Record<string, unknown>;
}
function mapJob(row: Record<string, unknown>): ReportJobRecord {
  return row as unknown as ReportJobRecord;
}
function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'REPORT_GENERATION_FAILED';
  return message.replace(/[\r\n]/g, ' ').slice(0, 500);
}
