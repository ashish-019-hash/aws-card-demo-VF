import { IsIn, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import type { ReportKind, ReportTimestampMode } from '../report-types';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReportDto {
  @IsIn(['monthly', 'yearly', 'custom'])
  kind!: ReportKind;

  @IsOptional()
  @IsString()
  @Matches(DATE)
  @ValidateIf((value: CreateReportDto) => value.kind === 'monthly' || value.kind === 'yearly')
  asOfDate?: string;

  @ValidateIf((value: CreateReportDto) => value.kind === 'custom')
  @IsString()
  @Matches(DATE)
  rangeStart?: string;

  @ValidateIf((value: CreateReportDto) => value.kind === 'custom')
  @IsString()
  @Matches(DATE)
  rangeEnd?: string;

  @IsOptional()
  @IsIn(['processed-or-original', 'processed'])
  timestampMode?: ReportTimestampMode;
}
