export type ReportTimestampMode = 'processed-or-original' | 'processed';
export type ReportKind = 'monthly' | 'yearly' | 'custom';
export type ReportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportWarning {
  scope: 'detail' | 'page' | 'account' | 'grand';
  page: number;
  cents: string;
  transactionId?: string;
  accountId?: string;
}

export interface ReportArtifactMetadata {
  formatVersion: '1';
  lineWidth: 133;
  newline: 'LF';
  detailCount: number;
  pageCount: number;
  accountTotalCount: number;
  grandTotalCents: string;
  timestampMode: ReportTimestampMode;
  rangeStart: string;
  rangeEnd: string;
  firstTransactionId: string | null;
  lastTransactionId: string | null;
  sourceOrdering: 'card_number ASC, transaction_id ASC';
}

export interface ReportRow {
  id: string;
  accountId: string;
  cardNumber: string;
  typeCode: string;
  typeDescription: string;
  categoryCode: string;
  categoryDescription: string;
  source: string;
  amount: string;
  effectiveTs: string;
}

export interface ReportJobRecord {
  id: string;
  status: ReportJobStatus;
  reportKind: ReportKind;
  timestampMode: ReportTimestampMode;
  rangeStart: string;
  rangeEnd: string;
  attempts: number;
  nextAttemptAt: string;
  leaseToken: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  completedAt: string | null;
  artifactSha256: string | null;
  artifactLength: number | null;
  artifactContentType: string | null;
  artifactFilename: string | null;
  artifactMetadata: ReportArtifactMetadata | null;
  warnings: ReportWarning[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
