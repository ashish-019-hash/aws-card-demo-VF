import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiJwtUnauthorizedResponse } from '../../common/openapi/problem-response';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller({ path: 'reports', version: '1' })
@ApiBearerAuth('jwt')
@ApiJwtUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse()
  async create(@Body() request: CreateReportDto): Promise<Record<string, unknown>> {
    const job = await this.reports.create(request);
    return {
      ...status(job),
      statusUrl: `/api/v1/reports/${job.id}`,
      artifactUrl: `/api/v1/reports/${job.id}/artifact`,
    };
  }
  @Get(':id')
  @ApiOkResponse()
  async get(@Param('id') id: string): Promise<Record<string, unknown>> {
    return status(await this.reports.status(id));
  }
  @Get(':id/artifact')
  @ApiProduces('text/plain')
  async download(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const job = await this.reports.status(id);
    if (job.status === 'pending' || job.status === 'processing')
      throw new ConflictException({ code: 'REPORT_NOT_READY', message: 'Report is not ready.' });
    if (job.status === 'failed')
      throw new ConflictException({ code: 'REPORT_FAILED', message: 'Report generation failed.' });
    const { artifact } = await this.reports.artifact(id);
    response
      .set({
        'Content-Type': artifact.contentType,
        'Content-Length': String(artifact.length),
        ETag: `"${artifact.sha256}"`,
        Digest: `sha-256=${Buffer.from(artifact.sha256, 'hex').toString('base64')}`,
        'Content-Disposition': `attachment; filename="${artifact.filename.replaceAll('"', '')}"`,
      })
      .send(artifact.content);
  }
}
function status(job: Awaited<ReturnType<ReportsService['status']>>): Record<string, unknown> {
  const {
    artifactSha256,
    artifactLength,
    artifactContentType,
    artifactFilename,
    artifactMetadata,
    ...base
  } = job;
  return {
    ...base,
    ...(job.status === 'completed'
      ? {
          artifact: {
            sha256: artifactSha256,
            length: artifactLength,
            contentType: artifactContentType,
            filename: artifactFilename,
            metadata: artifactMetadata,
          },
        }
      : {}),
  };
}
