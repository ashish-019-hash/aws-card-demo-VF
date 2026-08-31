import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiJwtUnauthorizedResponse } from '../../common/openapi/problem-response';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
@Controller({ path: 'payments', version: '1' })
@ApiBearerAuth('jwt')
@ApiJwtUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post() create(@Body() body: CreatePaymentDto): Promise<Record<string, unknown>> {
    return this.payments.create(body);
  }
}
