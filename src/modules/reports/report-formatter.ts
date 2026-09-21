import { createHash } from 'node:crypto';
import { centsToString, formatDetailMoney, formatTotalMoney, parseCents } from './report-money';
import type {
  ReportArtifactMetadata,
  ReportJobRecord,
  ReportRow,
  ReportWarning,
} from './report-types';

const WIDTH = 133;
const LF = Buffer.from('\n', 'ascii');
const REPORT_HEADER_WIDTH = 115;
const HEADER_ONE_WIDTH = 114;
const TOTAL_WIDTH = 112;

export interface FormattedReport {
  bytes: Buffer;
  sha256: string;
  warnings: ReportWarning[];
  metadata: ReportArtifactMetadata;
}

export function formatReport(
  job: Pick<ReportJobRecord, 'reportKind' | 'timestampMode' | 'rangeStart' | 'rangeEnd'>,
  rows: readonly ReportRow[],
): FormattedReport {
  validateRows(rows);
  const lines: Buffer[] = [];
  const warnings: ReportWarning[] = [];
  let page = 1;
  let pageCents = 0n;
  let accountCents = 0n;
  let grandCents = 0n;
  let pageDetails = 0;
  let accountTotals = 0;

  const openPage = (): void => {
    lines.push(
      reportHeader(job.reportKind, job.rangeStart, job.rangeEnd),
      headerOne(),
      Buffer.alloc(WIDTH, '-'.charCodeAt(0)),
    );
  };
  const warn = (
    scope: ReportWarning['scope'],
    cents: bigint,
    extras: Omit<ReportWarning, 'scope' | 'page' | 'cents'>,
  ): void => {
    warnings.push({ scope, page, cents: centsToString(cents), ...extras });
  };
  const total = (kind: 'page' | 'account' | 'grand', cents: bigint, accountId?: string): Buffer => {
    const display = formatTotalMoney(cents);
    if (display.overflow) warn(kind, cents, accountId ? { accountId } : {});
    return totalLine(kind, display.text);
  };

  openPage();
  if (rows.length === 0) lines.push(total('page', 0n));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row === undefined) throw new Error('Missing report row');
    const cents = parseCents(row.amount);
    const display = formatDetailMoney(cents);
    if (display.overflow)
      warn('detail', cents, { transactionId: row.id, accountId: row.accountId });
    lines.push(detailLine(row, display.text));
    pageCents += cents;
    accountCents += cents;
    grandCents += cents;
    pageDetails += 1;

    const next = rows[index + 1];
    const accountBreak = next === undefined || next.accountId !== row.accountId;
    if (accountBreak) {
      lines.push(total('account', accountCents, row.accountId));
      accountTotals += 1;
      accountCents = 0n;
    }
    const pageBreak = pageDetails === 55 || next === undefined;
    if (pageBreak) {
      lines.push(total('page', pageCents));
      pageCents = 0n;
      pageDetails = 0;
      if (next !== undefined) {
        page += 1;
        openPage();
      }
    }
  }
  lines.push(total('grand', grandCents));
  const bytes = Buffer.concat(
    lines.flatMap((line, index) => (index === lines.length - 1 ? [line] : [line, LF])),
  );
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const first = rows[0]?.id ?? null;
  const last = rows.at(-1)?.id ?? null;
  return {
    bytes,
    sha256,
    warnings,
    metadata: {
      formatVersion: '1',
      lineWidth: 133,
      newline: 'LF',
      detailCount: rows.length,
      pageCount: page,
      accountTotalCount: accountTotals,
      grandTotalCents: centsToString(grandCents),
      timestampMode: job.timestampMode,
      rangeStart: job.rangeStart,
      rangeEnd: job.rangeEnd,
      firstTransactionId: first,
      lastTransactionId: last,
      sourceOrdering: 'card_number ASC, transaction_id ASC',
    },
  };
}

function validateRows(rows: readonly ReportRow[]): void {
  let previousCard = '';
  let previousId = '';
  const closedAccounts = new Set<string>();
  let activeAccount: string | null = null;
  for (const row of rows) {
    if (
      !/^\d{16}$/.test(row.id) ||
      !/^\d{11}$/.test(row.accountId) ||
      !/^\d{16}$/.test(row.cardNumber) ||
      !/^.{2}$/.test(row.typeCode) ||
      !/^\d{4}$/.test(row.categoryCode)
    )
      throw new Error('Invalid report query row');
    parseCents(row.amount);
    if (previousCard > row.cardNumber || (previousCard === row.cardNumber && previousId > row.id))
      throw new Error('Report rows are not ordered');
    if (activeAccount !== null && activeAccount !== row.accountId)
      closedAccounts.add(activeAccount);
    if (closedAccounts.has(row.accountId))
      throw new Error(`Report account reappeared: ${row.accountId}`);
    activeAccount = row.accountId;
    previousCard = row.cardNumber;
    previousId = row.id;
  }
}

function ascii(value: string, width: number): string {
  const truncated = value.slice(0, width);
  if (!/^[\x20-\x7e]*$/.test(truncated))
    throw new Error('Report text contains non-ASCII characters');
  return truncated.padEnd(width, ' ');
}

function line(source: string, expectedLength: number): Buffer {
  if (source.length !== expectedLength)
    throw new Error(`Report source length ${source.length} does not equal ${expectedLength}`);
  if (!/^[\x20-\x7e]*$/.test(source)) throw new Error('Report text contains non-ASCII characters');
  return Buffer.from(source.padEnd(WIDTH, ' '), 'ascii');
}

function reportHeader(kind: string, start: string, end: string): Buffer {
  const title = `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)} Transaction Report`;
  return line(
    ascii(kind.toUpperCase(), 38) +
      ascii(title, 41) +
      ascii('Date Range: ', 12) +
      ascii(start, 10) +
      ' to ' +
      ascii(end, 10),
    REPORT_HEADER_WIDTH,
  );
}

function headerOne(): Buffer {
  return line(
    ascii('Transaction ID', 17) +
      ascii('Account ID', 12) +
      ascii('Transaction Type', 19) +
      ascii('Tran Category', 35) +
      ascii('Tran Source', 14) +
      ' ' +
      ascii('        Amount', 16),
    HEADER_ONE_WIDTH,
  );
}

function detailLine(row: ReportRow, amount: string): Buffer {
  const source =
    ascii(row.id, 16) +
    ' ' +
    ascii(row.accountId, 11) +
    ' ' +
    ascii(row.typeCode, 2) +
    '-' +
    ascii(row.typeDescription, 15) +
    ' ' +
    ascii(row.categoryCode, 4) +
    '-' +
    ascii(row.categoryDescription, 29) +
    ' ' +
    ascii(row.source, 10) +
    '    ' +
    ascii(amount, 15) +
    '  ';
  return line(source, 114);
}

function totalLine(kind: 'page' | 'account' | 'grand', amount: string): Buffer {
  const labels = {
    page: ['Page Total', 11, 86],
    account: ['Account Total', 13, 84],
    grand: ['Grand Total', 11, 86],
  } as const;
  const [label, labelWidth, dots] = labels[kind];
  return line(ascii(label, labelWidth) + '.'.repeat(dots) + ascii(amount, 15), TOTAL_WIDTH);
}
