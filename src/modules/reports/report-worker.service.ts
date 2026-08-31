import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config/configuration';
import { formatReport } from './report-formatter';
import { ReportJobRepository } from './report-job.repository';
import { ReportQueryRepository } from './report-query.repository';
import type { ReportJobRecord } from './report-types';

@Injectable()
export class ReportWorkerService {
  private readonly logger = new Logger(ReportWorkerService.name);
  private readonly workerId = `report-worker-${randomUUID()}`;
  private aborting = false;
  private loop: Promise<void> | null = null;

  constructor(
    private readonly jobs: ReportJobRepository,
    private readonly queries: ReportQueryRepository,
    private readonly config: ConfigService<AppConfig>,
  ) {}

  start(): void {
    if (!this.loop) this.loop = this.run();
  }

  async stop(): Promise<void> {
    this.aborting = true;
    await this.loop;
  }

  private async run(): Promise<void> {
    while (!this.aborting) {
      try {
        const claimed = await this.jobs.claim(
          this.workerId,
          this.value('reportLeaseSeconds'),
          this.value('reportMaxAttempts'),
        );
        if (!claimed) {
          await delay(this.value('reportWorkerPollMs'));
          continue;
        }
        this.logger.log(`Claimed report job ${claimed.id}`);
        await this.process(claimed);
      } catch (error) {
        this.logger.error(errorMessage(error), undefined, ReportWorkerService.name);
        await delay(this.value('reportWorkerPollMs'));
      }
    }
  }

  private async process(job: ReportJobRecord): Promise<void> {
    const token = job.leaseToken;
    if (!token) {
      this.logger.error(`Claimed report job ${job.id} has no lease token`);
      return;
    }
    let ownershipLost = false;
    const heartbeat = async (): Promise<void> => {
      try {
        const owned = await this.jobs.heartbeat(job.id, token, this.value('reportLeaseSeconds'));
        if (!owned) {
          ownershipLost = true;
          this.logger.warn(`Lost report lease during heartbeat for job ${job.id}`);
        }
      } catch (error) {
        ownershipLost = true;
        this.logger.error(
          `Report lease heartbeat failed for job ${job.id}: ${errorMessage(error)}`,
        );
      }
    };
    const heartbeatTimer = setInterval(() => void heartbeat(), this.heartbeatMilliseconds());
    try {
      const rows = await this.queries.snapshot(job.timestampMode, job.rangeStart, job.rangeEnd);
      if (ownershipLost || this.aborting) return;
      const report = formatReport(job, rows);
      const completed = await this.jobs.complete(job.id, token, report);
      if (completed)
        this.logger.log(`Completed report job ${job.id} (${report.bytes.length} bytes)`);
      else this.logger.warn(`Lost report lease before completion for job ${job.id}`);
    } catch (error) {
      if (ownershipLost) return;
      const failed = await this.jobs.fail(
        job.id,
        token,
        error,
        isRetryable(error),
        this.value('reportMaxAttempts'),
        this.value('reportRetryDelaySeconds'),
      );
      if (failed) this.logger.error(`Report job ${job.id} failed: ${errorMessage(error)}`);
      else this.logger.warn(`Lost report lease before failure update for job ${job.id}`);
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  private heartbeatMilliseconds(): number {
    return Math.max(1000, Math.floor(this.value('reportLeaseSeconds') * 500));
  }

  private value<
    Key extends
      | 'reportLeaseSeconds'
      | 'reportMaxAttempts'
      | 'reportWorkerPollMs'
      | 'reportRetryDelaySeconds',
  >(key: Key): number {
    return this.config.getOrThrow<number>(key);
  }
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Report worker operation failed';
}
function isRetryable(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  return ['40001', '40P01', '55P03', '57P01'].includes(code);
}
