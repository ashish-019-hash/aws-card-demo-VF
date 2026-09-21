import { Module } from '@nestjs/common';
import { ReportArtifactStore } from './report-artifact.store';
import { ReportJobRepository } from './report-job.repository';
import { ReportQueryRepository } from './report-query.repository';
import { ReportRangeService } from './report-range.service';
import { ReportWorkerService } from './report-worker.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportRangeService,
    ReportJobRepository,
    ReportArtifactStore,
    ReportQueryRepository,
    ReportWorkerService,
  ],
  exports: [ReportWorkerService],
})
export class ReportsModule {}
