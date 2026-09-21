import { NestFactory } from '@nestjs/core';
import { DevelopmentSeedService } from '../modules/development-seed/development-seed.service';
import { SeedAppModule } from '../seed-app.module';

export function assertSafeSeedEnvironment(environment = process.env): void {
  if (environment.NODE_ENV === 'production')
    throw new Error('Development seed is disabled when NODE_ENV=production');
  if (environment.SEED_ALLOW_UNSAFE !== 'true')
    throw new Error('SEED_ALLOW_UNSAFE=true is required for the development seed');
  if (!environment.SEED_ADMIN_PASSWORD)
    throw new Error('SEED_ADMIN_PASSWORD is required for the development seed');
}

async function main(): Promise<void> {
  assertSafeSeedEnvironment();
  const app = await NestFactory.createApplicationContext(SeedAppModule, { logger: false });
  try {
    const result = await app.get(DevelopmentSeedService).seedAdmin(process.env.SEED_ADMIN_PASSWORD);
    process.stdout.write(
      `Development seed complete: ${result.created ? 'created' : result.updated ? 'updated' : 'unchanged'} ${result.adminId}.\n`,
    );
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Development seed failed'}\n`);
    process.exitCode = 1;
  });
}
