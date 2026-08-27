import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CustomersService } from './customers.service';
@Controller({ path: 'customers', version: '1' })
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get(':id') detail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.customers.detail(id);
  }
}
