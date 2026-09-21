import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { DataSource } from 'typeorm';
import { assertCp037Adapter } from './decoders/cp037.decoder';
import { parseRecord } from './parsers/record.parser';
import { readAsciiRecords, readEbcdicRecords } from './readers/fixed-record.reader';
import { checkMirror, type MirrorCheckResult } from './reconciliation/mirror-checker';
import { reconcile, type ReconciliationSummary } from './reconciliation/reconciliation.service';
import { LegacyUpsertRepository } from './persistence/legacy-upsert.repository';
import { layoutFor } from './schemas/legacy-layouts';
import { importableDatasets, SOURCE_CATALOG, type SourceMode } from './schemas/source-catalog';
import { LegacyImportRunEntity } from './legacy-import-run.entity';
import {
  validateImportSources,
  type ImportWarning,
  type ParsedSources,
} from './validators/import.validator';

export interface LegacyImportOptions {
  mode: SourceMode;
  sourcePath: string;
  dryRun?: boolean;
  strictCompleteness?: boolean;
  verifyOnly?: boolean;
}
export interface LegacyImportResult {
  mode: SourceMode;
  status: 'dry-run' | 'completed' | 'partial';
  users: 'imported' | 'missing';
  hashes: Record<string, string>;
  warnings: ImportWarning[];
  mirror?: MirrorCheckResult;
  reconciliation?: ReconciliationSummary;
}

@Injectable()
export class LegacyImportService {
  constructor(private readonly dataSource: DataSource) {
    assertCp037Adapter();
  }

  async run(options: LegacyImportOptions): Promise<LegacyImportResult> {
    if (options.verifyOnly && options.mode !== 'ascii-mirror')
      throw new Error('--verify-only is only valid for --mode=ascii-mirror');
    const canonical =
      options.mode === 'canonical-ebcdic' || options.verifyOnly
        ? this.readSources(options.sourcePath, 'canonical-ebcdic')
        : undefined;
    const ascii =
      options.mode === 'ascii-mirror'
        ? this.readSources(options.sourcePath, 'ascii-mirror')
        : undefined;
    const selected = options.mode === 'canonical-ebcdic' ? canonical! : ascii!;
    const warnings = validateImportSources(selected.sources, options.mode);
    const mirror = options.verifyOnly ? checkMirror(canonical!.sources, ascii!.sources) : undefined;
    const users: 'imported' | 'missing' =
      options.mode === 'canonical-ebcdic' ? 'imported' : 'missing';
    if (options.strictCompleteness && users === 'missing')
      throw new Error('ASCII mirror is incomplete: users are unavailable');
    if (options.verifyOnly)
      return {
        mode: options.mode,
        status: 'partial',
        users,
        hashes: selected.hashes,
        warnings,
        mirror,
      };
    if (options.dryRun)
      return {
        mode: options.mode,
        status: 'dry-run',
        users,
        hashes: selected.hashes,
        warnings,
        mirror,
      };
    if (options.mode === 'ascii-mirror') {
      const existing = await this.dataSource
        .getRepository(LegacyImportRunEntity)
        .exist({ where: { sourceMode: 'canonical-ebcdic', status: 'completed' } });
      if (existing)
        throw new Error('ASCII mirror is verification-only after a completed canonical import');
    }
    const runs = this.dataSource.getRepository(LegacyImportRunEntity);
    const run = await runs.save(
      runs.create({
        sourceMode: options.mode,
        status: 'running',
        canonical: options.mode === 'canonical-ebcdic',
        sourceHashes: selected.hashes,
        recordCounts: Object.fromEntries(
          Object.entries(selected.sources).map(([name, rows]) => [name, rows?.length ?? 0]),
        ),
        allowedDivergences: mirror?.divergenceIds ?? [],
        artifacts: null,
        error: null,
      }),
    );
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      await new LegacyUpsertRepository(runner).upsertAll(selected.sources);
      const reconciliation = await reconcile(runner, selected.sources, warnings);
      await runner.commitTransaction();
      await runs.update(run.id, {
        status: options.mode === 'canonical-ebcdic' ? 'completed' : 'partial',
        recordCounts: { ...run.recordCounts, reconciliation: JSON.stringify(reconciliation) },
        artifacts: { mirror, reconciliation },
        completedAt: new Date().toISOString(),
      });
      return {
        mode: options.mode,
        status: options.mode === 'canonical-ebcdic' ? 'completed' : 'partial',
        users,
        hashes: selected.hashes,
        warnings,
        mirror,
        reconciliation,
      };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runs.update(run.id, {
        status: 'failed',
        error: sanitize(error),
        completedAt: new Date().toISOString(),
      });
      throw error;
    } finally {
      await runner.release();
    }
  }

  private readSources(
    sourcePath: string,
    mode: SourceMode,
  ): { sources: ParsedSources; hashes: Record<string, string> } {
    const root = resolve(sourcePath);
    const directory = mode === 'canonical-ebcdic' ? 'EBCDIC' : 'ASCII';
    const sources: ParsedSources = {};
    const hashes: Record<string, string> = {};
    const entries =
      mode === 'canonical-ebcdic'
        ? SOURCE_CATALOG
        : importableDatasets().filter((entry) => entry.asciiName);
    for (const entry of entries) {
      if (mode === 'canonical-ebcdic' && entry.dataset === 'accountsDuplicate') continue;
      if (mode === 'canonical-ebcdic' && entry.dataset === 'transactionsInit') {
        const file = this.sourceFile(root, directory, entry.canonicalName);
        const bytes = readFileSync(file);
        if (bytes.length !== entry.canonicalWidth)
          throw new Error(`${entry.canonicalName}: invalid .INIT width`);
        hashes[entry.dataset] = sha256(bytes);
        continue;
      }
      const name = mode === 'canonical-ebcdic' ? entry.canonicalName : entry.asciiName!;
      const file = this.sourceFile(root, directory, name);
      const bytes = readFileSync(file);
      hashes[entry.dataset] = sha256(bytes);
      const records =
        mode === 'canonical-ebcdic'
          ? readEbcdicRecords(bytes, entry.canonicalWidth, entry.dataset)
          : readAsciiRecords(
              bytes,
              entry.asciiWidth ?? entry.canonicalWidth,
              entry.dataset,
              entry.dataset === 'cardXrefs',
            );
      const layout = layoutFor(entry.dataset);
      const parsed = records.map((record) =>
        parseRecord(
          layout,
          { number: record.number, bytes: record.normalizedBytes ?? record.bytes },
          mode === 'canonical-ebcdic' ? 'ebcdic' : 'ascii',
        ),
      );
      sources[entry.dataset] = parsed;
    }
    if (mode === 'canonical-ebcdic') {
      const duplicate = readFileSync(
        this.sourceFile(root, directory, 'AWS.M2.CARDDEMO.ACCDATA.PS'),
      );
      const authoritative = readFileSync(
        this.sourceFile(root, directory, 'AWS.M2.CARDDEMO.ACCTDATA.PS'),
      );
      if (sha256(duplicate) !== sha256(authoritative))
        throw new Error('Account exports differ; canonical import cannot continue');
      hashes.accountsDuplicate = sha256(duplicate);
    }
    return { sources, hashes };
  }

  private sourceFile(root: string, directory: string, name: string): string {
    const withDirectory = join(root, directory, name);
    const direct = join(root, name);
    const file = existsSync(withDirectory) ? withDirectory : direct;
    if (!existsSync(file)) throw new Error(`Missing required legacy source: ${withDirectory}`);
    return file;
  }
}
function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
function sanitize(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Legacy import failed';
  return message.replace(/[\r\n]/g, ' ').slice(0, 1000);
}
