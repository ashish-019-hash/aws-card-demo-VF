import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DevelopmentSeedModule } from './modules/development-seed/development-seed.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, DevelopmentSeedModule],
})
export class SeedAppModule {}
