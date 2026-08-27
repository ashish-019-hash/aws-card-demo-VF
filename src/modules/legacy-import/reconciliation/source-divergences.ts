export interface SourceDivergenceRule {
  readonly id: string;
  readonly dataset: string;
  readonly key: string;
  readonly field: string;
  readonly canonical: string;
  readonly mirror: string;
  readonly rationale: string;
}
export const SOURCE_DIVERGENCES: readonly SourceDivergenceRule[] = [
  {
    id: 'CARDXREF_ASCII_FILLER_OMITTED',
    dataset: 'cardXrefs',
    key: '*',
    field: 'filler',
    canonical: '              ',
    mirror: '              ',
    rationale: 'ASCII xref bodies omit the trailing 14 space filler bytes.',
  },
  {
    id: 'ACCTDATA_00000000049_ADDRESS_ZIP',
    dataset: 'accounts',
    key: '00000000049',
    field: 'addressZip',
    canonical: 'ZEROAPR   ',
    mirror: 'A000000000',
    rationale: 'Independent source export conflict; ZIP wins from canonical EBCDIC.',
  },
  {
    id: 'DISCGRP_DEFAULT_07_0001_INTEREST_RATE',
    dataset: 'disclosureGroups',
    key: 'DEFAULT   |07|0001',
    field: 'interestRate',
    canonical: '15.00',
    mirror: '0.00',
    rationale: 'Independent source export conflict; canonical signed display wins.',
  },
] as const;
