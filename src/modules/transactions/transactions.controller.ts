import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateTransactionDto, ListTransactionsQueryDto } from './dto/transactions.dto';
import { TransactionsService } from './transactions.service';
@Controller({ path: 'transactions', version: '1' })
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}
  @Get() list(@Query() query: ListTransactionsQueryDto): Promise<Record<string, unknown>> {
    return this.transactions.list(query);
  }
  @Get(':id') detail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.transactions.detail(id);
  }
  @Post() create(@Body() body: CreateTransactionDto): Promise<Record<string, unknown>> {
    return this.transactions.create(body);
  }
}
