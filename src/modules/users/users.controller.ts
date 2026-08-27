import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  CreateUserDto,
  DeleteUserQueryDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('A')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list(@Query() query: ListUsersQueryDto): Promise<Record<string, unknown>> {
    return this.users.list(query.limit, query.cursor);
  }
  @Get(':id') detail(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.users.detail(id.toUpperCase());
  }
  @Post() create(@Body() body: CreateUserDto): Promise<Record<string, unknown>> {
    return this.users.create(body);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<Record<string, unknown>> {
    return this.users.update(id.toUpperCase(), body);
  }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) async delete(
    @Param('id') id: string,
    @Query() query: DeleteUserQueryDto,
  ): Promise<void> {
    await this.users.delete(id.toUpperCase(), query.expectedVersion);
  }
}
