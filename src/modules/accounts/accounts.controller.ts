import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UpdateAccountDto } from './dto/accounts.dto';
import { AccountsService } from './accounts.service';
@Controller({ path: 'accounts', version: '1' })
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}
  @Get(':id') detail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.accounts.detail(id);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ): Promise<Record<string, unknown>> {
    return this.accounts.update(id, body);
  }
}
