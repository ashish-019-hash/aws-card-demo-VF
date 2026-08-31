import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiJwtUnauthorizedResponse } from '../../common/openapi/problem-response';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ListCardsQueryDto, UpdateCardDto } from './dto/cards.dto';
import { CardsService } from './cards.service';

@Controller({ path: 'cards', version: '1' })
@ApiBearerAuth('jwt')
@ApiJwtUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}
  @Get() list(@Query() query: ListCardsQueryDto): Promise<Record<string, unknown>> {
    return this.cards.list(query);
  }
  @Get(':number') detail(@Param('number') number: string): Promise<Record<string, unknown>> {
    return this.cards.detail(number);
  }
  @Patch(':number') update(
    @Param('number') number: string,
    @Body() body: UpdateCardDto,
  ): Promise<Record<string, unknown>> {
    return this.cards.update(number, body);
  }
}
