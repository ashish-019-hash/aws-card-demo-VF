import type { ParsedSources } from '../validators/import.validator';
import type { ParsedRecord } from '../parsers/record.parser';
import { SOURCE_DIVERGENCES } from './source-divergences';

export interface MirrorCheckResult {
  readonly normalizedXrefs: number;
  readonly divergenceIds: string[];
  readonly differences: number;
  readonly users: 'missing';
}
function logicalKey(record: ParsedRecord): string {
  const values = record.values;
  if (
    record.dataset === 'accounts' ||
    record.dataset === 'customers' ||
    record.dataset === 'transactions' ||
    record.dataset === 'users'
  )
    return values.id as string;
  if (record.dataset === 'cards') return values.number as string;
  if (record.dataset === 'cardXrefs') return values.cardNumber as string;
  if (record.dataset === 'transactionTypes') return values.code as string;
  if (record.dataset === 'transactionCategories') return `${values.typeCode}|${values.code}`;
  if (record.dataset === 'disclosureGroups')
    return `${values.accountGroupId}|${values.transactionTypeCode}|${values.transactionCategoryCode}`;
  return `${values.accountId}|${values.transactionTypeCode}|${values.transactionCategoryCode}`;
}
export function checkMirror(canonical: ParsedSources, mirror: ParsedSources): MirrorCheckResult {
  const ids = new Set<string>();
  let differences = 0;
  for (const [dataset, canonicalRows] of Object.entries(canonical)) {
    if (dataset === 'users') continue;
    const mirrorRows = mirror[dataset as keyof ParsedSources] ?? [];
    const mapped = new Map(mirrorRows.map((row) => [logicalKey(row), row]));
    if (mapped.size !== mirrorRows.length || canonicalRows.length !== mirrorRows.length)
      throw new Error(`${dataset}: mirror keys are missing, extra, or duplicate`);
    for (const source of canonicalRows) {
      const sourceKey = logicalKey(source);
      const reflected = mapped.get(sourceKey);
      if (!reflected) throw new Error(`${dataset}: mirror missing key ${sourceKey}`);
      for (const [field, canonicalValue] of Object.entries(source.values)) {
        const mirrorValue = reflected.values[field];
        if (canonicalValue === mirrorValue) continue;
        const rule = SOURCE_DIVERGENCES.find(
          (candidate) =>
            candidate.dataset === dataset &&
            candidate.field === field &&
            (candidate.key === '*' || candidate.key === sourceKey) &&
            candidate.canonical === canonicalValue &&
            candidate.mirror === mirrorValue,
        );
        if (!rule)
          throw new Error(`${dataset}:${sourceKey}:${field} is an unlisted mirror divergence`);
        ids.add(rule.id);
        differences += 1;
      }
    }
  }
  const normalizedXrefs = (mirror.cardXrefs ?? []).length;
  if (normalizedXrefs > 0) ids.add('CARDXREF_ASCII_FILLER_OMITTED');
  return {
    normalizedXrefs,
    divergenceIds: [...ids].sort(),
    differences,
    users: 'missing',
  };
}
