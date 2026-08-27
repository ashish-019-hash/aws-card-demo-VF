import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { configuration } from '../config/configuration';
import { registerPgTypeParsers } from './pg-type-parsers';
import { InitialSchema20260827000000 } from './migrations/20260827000000-InitialSchema';
import { ApiContractAlignment20260827010000 } from './migrations/20260827010000-ApiContractAlignment';

registerPgTypeParsers();
const config = configuration();

export default new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  migrationsRun: false,
  entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
  migrations: [InitialSchema20260827000000, ApiContractAlignment20260827010000],
});
