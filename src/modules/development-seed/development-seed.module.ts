import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/user.entity';
import { DevelopmentSeedService } from './development-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [DevelopmentSeedService],
})
export class DevelopmentSeedModule {}
