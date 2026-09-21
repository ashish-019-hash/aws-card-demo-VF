import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LegacyImportService } from '../modules/legacy-import/legacy-import.service';
import type { SourceMode } from '../modules/legacy-import/schemas/source-catalog';

function parse(argv: string[]): {
  mode: SourceMode;
  sourcePath: string;
  dryRun: boolean;
  strictCompleteness: boolean;
  verifyOnly: boolean;
  json: boolean;
} {
  const flags = new Map(
    argv.map((argument) => {
      const [name, value] = argument.split('=', 2);
      return [name!, value];
    }),
  );
  const mode = flags.get('--mode');
  if (mode !== 'canonical-ebcdic' && mode !== 'ascii-mirror')
    throw new Error('--mode=canonical-ebcdic|ascii-mirror is required');
  const sourcePath = flags.get('--source-path');
  if (!sourcePath) throw new Error('--source-path=<data-root> is required');
  return {
    mode,
    sourcePath,
    dryRun: flags.has('--dry-run'),
    strictCompleteness: flags.has('--strict-completeness'),
    verifyOnly: flags.has('--verify-only'),
    json: flags.has('--json'),
  };
}
async function main(): Promise<void> {
  const options = parse(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const result = await app.get(LegacyImportService).run(options);
    process.stdout.write(
      `${options.json ? JSON.stringify(result) : JSON.stringify(result, null, 2)}\n`,
    );
  } finally {
    await app.close();
  }
}
main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Legacy import failed'}\n`);
  process.exitCode = 1;
});
