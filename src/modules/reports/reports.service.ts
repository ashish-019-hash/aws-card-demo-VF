import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { ReportArtifactStore, type StoredReportArtifact } from './report-artifact.store';
import type { CreateReportDto } from './dto/create-report.dto';
import { ReportJobRepository } from './report-job.repository';
import { ReportRangeService } from './report-range.service';
import type { ReportJobRecord } from './report-types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly jobs: ReportJobRepository,
    private readonly ranges: ReportRangeService,
    private readonly artifacts: ReportArtifactStore,
    private readonly config: ConfigService<AppConfig>,
  ) {}

  async create(request: CreateReportDto): Promise<ReportJobRecord> {
    const range = this.ranges.resolve(request);
    return this.jobs.create({
      reportKind: request.kind,
      timestampMode: request.timestampMode ?? this.config.getOrThrow('reportTimestampMode'),
      ...range,
    });
  }
  async status(id: string): Promise<ReportJobRecord> {
    const job = await this.jobs.get(id);
    if (!job)
      throw new NotFoundException({
        code: 'REPORT_NOT_FOUND',
        message: 'Report job was not found.',
      });
    return job;
  }
  async artifact(id: string): Promise<{ job: ReportJobRecord; artifact: StoredReportArtifact }> {
    const job = await this.status(id);
    const artifact = await this.artifacts.get(id);
    if (!artifact)
      throw new NotFoundException({
        code: 'REPORT_ARTIFACT_NOT_FOUND',
        message: 'Report artifact was not found.',
      });
    return { job, artifact };
  }
}
