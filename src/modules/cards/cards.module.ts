import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/account.entity';
import { CardXrefEntity } from './card-xref.entity';
import { CardEntity } from './card.entity';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
@Module({
  imports: [TypeOrmModule.forFeature([CardEntity, CardXrefEntity, AccountEntity])],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
