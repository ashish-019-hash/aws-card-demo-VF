import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiJwtUnauthorizedResponse } from '../../common/openapi/problem-response';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiJwtUnauthorizedResponse()
  @ApiOkResponse({
    description: 'Authenticated session token.',
    schema: {
      type: 'object',
      required: ['accessToken', 'tokenType', 'expiresIn', 'user'],
      properties: {
        accessToken: { type: 'string', description: 'Signed JWT access token.' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: { type: 'integer', example: 900 },
        user: {
          type: 'object',
          required: ['id', 'firstName', 'lastName', 'role'],
          properties: {
            id: { type: 'string', example: 'DEVADMIN' },
            firstName: { type: 'string', example: 'Development' },
            lastName: { type: 'string', example: 'Administrator' },
            role: { type: 'string', enum: ['A', 'U'] },
          },
        },
      },
    },
  })
  login(@Body() body: LoginDto): Promise<Record<string, unknown>> {
    return this.auth.login(body.userId, body.password);
  }
}
