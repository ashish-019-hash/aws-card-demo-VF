import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { registerPgTypeParsers } from './pg-type-parsers';

registerPgTypeParsers();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('databaseUrl'),
        ssl: config.get<boolean>('databaseSsl') ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
      }),
    }),
  ],
})
export class DatabaseModule {}
