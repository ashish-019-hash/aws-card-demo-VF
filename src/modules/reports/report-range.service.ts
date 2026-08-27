import { BadRequestException, Injectable } from '@nestjs/common';
import { isExactDate } from '../../common/validation/exact.validators';
import type { CreateReportDto } from './dto/create-report.dto';

export interface ReportRange {
  rangeStart: string;
  rangeEnd: string;
}

@Injectable()
export class ReportRangeService {
  resolve(
    request: Pick<CreateReportDto, 'kind' | 'asOfDate' | 'rangeStart' | 'rangeEnd'>,
    today = utcDate(),
  ): ReportRange {
    switch (request.kind) {
      case 'monthly':
        return this.monthly(this.dateOrToday(request.asOfDate, 'asOfDate', today));
      case 'yearly':
        return this.yearly(this.dateOrToday(request.asOfDate, 'asOfDate', today));
      case 'custom':
        return this.custom(request.rangeStart, request.rangeEnd);
      default:
        return this.invalidKind(request.kind);
    }
  }

  private monthly(asOfDate: string): ReportRange {
    const [year, month] = splitDate(asOfDate);
    return {
      rangeStart: `${year}-${pad(month)}-01`,
      rangeEnd: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`,
    };
  }

  private yearly(asOfDate: string): ReportRange {
    const [year] = splitDate(asOfDate);
    return { rangeStart: `${year}-01-01`, rangeEnd: `${year}-12-31` };
  }

  private custom(start?: string, end?: string): ReportRange {
    if (!start || !end)
      throw new BadRequestException({
        code: 'INVALID_REPORT_RANGE',
        message: 'Custom reports require rangeStart and rangeEnd.',
      });
    this.validDate(start, 'rangeStart');
    this.validDate(end, 'rangeEnd');
    if (start > end)
      throw new BadRequestException({
        code: 'INVALID_REPORT_RANGE',
        message: 'rangeStart must not be after rangeEnd.',
      });
    return { rangeStart: start, rangeEnd: end };
  }

  private dateOrToday(value: string | undefined, field: string, today: string): string {
    const selected = value ?? today;
    this.validDate(selected, field);
    return selected;
  }

  private validDate(value: string, field: string): void {
    if (!isExactDate(value))
      throw new BadRequestException({
        code: 'INVALID_REPORT_DATE',
        message: `${field} must be a real YYYY-MM-DD date.`,
      });
  }

  private invalidKind(kind: never): never {
    throw new BadRequestException({
      code: 'INVALID_REPORT_KIND',
      message: `Unsupported report kind: ${String(kind)}`,
    });
  }
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function splitDate(value: string): [number, number, number] {
  const parts = value.split('-').map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined)
    throw new Error('Validated report date could not be split');
  return [year, month, day];
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
