import dataSource from './data-source';

async function run(): Promise<void> {
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
void run();
