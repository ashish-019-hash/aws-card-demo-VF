export type LegacyDataset =
  | 'accounts'
  | 'accountsDuplicate'
  | 'cards'
  | 'cardXrefs'
  | 'customers'
  | 'transactions'
  | 'transactionsInit'
  | 'disclosureGroups'
  | 'categoryBalances'
  | 'transactionCategories'
  | 'transactionTypes'
  | 'users';

export type SourceMode = 'canonical-ebcdic' | 'ascii-mirror';
export type SourceDisposition = 'import' | 'verify-only' | 'duplicate';

export interface SourceCatalogEntry {
  readonly dataset: LegacyDataset;
  readonly canonicalName: string;
  readonly asciiName?: string;
  readonly canonicalWidth: number;
  readonly asciiWidth?: number;
  readonly disposition: SourceDisposition;
}

export const SOURCE_CATALOG: readonly SourceCatalogEntry[] = [
  {
    dataset: 'accounts',
    canonicalName: 'AWS.M2.CARDDEMO.ACCTDATA.PS',
    asciiName: 'acctdata.txt',
    canonicalWidth: 300,
    disposition: 'import',
  },
  {
    dataset: 'accountsDuplicate',
    canonicalName: 'AWS.M2.CARDDEMO.ACCDATA.PS',
    canonicalWidth: 300,
    disposition: 'duplicate',
  },
  {
    dataset: 'cards',
    canonicalName: 'AWS.M2.CARDDEMO.CARDDATA.PS',
    asciiName: 'carddata.txt',
    canonicalWidth: 150,
    disposition: 'import',
  },
  {
    dataset: 'cardXrefs',
    canonicalName: 'AWS.M2.CARDDEMO.CARDXREF.PS',
    asciiName: 'cardxref.txt',
    canonicalWidth: 50,
    asciiWidth: 36,
    disposition: 'import',
  },
  {
    dataset: 'customers',
    canonicalName: 'AWS.M2.CARDDEMO.CUSTDATA.PS',
    asciiName: 'custdata.txt',
    canonicalWidth: 500,
    disposition: 'import',
  },
  {
    dataset: 'transactions',
    canonicalName: 'AWS.M2.CARDDEMO.DALYTRAN.PS',
    asciiName: 'dailytran.txt',
    canonicalWidth: 350,
    disposition: 'import',
  },
  {
    dataset: 'transactionsInit',
    canonicalName: 'AWS.M2.CARDDEMO.DALYTRAN.PS.INIT',
    canonicalWidth: 350,
    disposition: 'verify-only',
  },
  {
    dataset: 'disclosureGroups',
    canonicalName: 'AWS.M2.CARDDEMO.DISCGRP.PS',
    asciiName: 'discgrp.txt',
    canonicalWidth: 50,
    disposition: 'import',
  },
  {
    dataset: 'categoryBalances',
    canonicalName: 'AWS.M2.CARDDEMO.TCATBALF.PS',
    asciiName: 'tcatbal.txt',
    canonicalWidth: 50,
    disposition: 'import',
  },
  {
    dataset: 'transactionCategories',
    canonicalName: 'AWS.M2.CARDDEMO.TRANCATG.PS',
    asciiName: 'trancatg.txt',
    canonicalWidth: 60,
    disposition: 'import',
  },
  {
    dataset: 'transactionTypes',
    canonicalName: 'AWS.M2.CARDDEMO.TRANTYPE.PS',
    asciiName: 'trantype.txt',
    canonicalWidth: 60,
    disposition: 'import',
  },
  {
    dataset: 'users',
    canonicalName: 'AWS.M2.CARDDEMO.USRSEC.PS',
    canonicalWidth: 80,
    disposition: 'import',
  },
] as const;

export const importableDatasets = (): readonly SourceCatalogEntry[] =>
  SOURCE_CATALOG.filter((entry) => entry.disposition === 'import');

export const sourceEntry = (dataset: LegacyDataset): SourceCatalogEntry => {
  const entry = SOURCE_CATALOG.find((candidate) => candidate.dataset === dataset);
  if (!entry) throw new Error(`Unknown legacy dataset: ${dataset}`);
  return entry;
};
