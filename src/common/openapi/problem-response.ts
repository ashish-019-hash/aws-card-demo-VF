import { ApiProperty, ApiResponse } from '@nestjs/swagger';

export class ProblemDetailsResponse {
  @ApiProperty({ example: 'https://carddemo.example/problems/401' }) type!: string;
  @ApiProperty({ example: 'Unauthorized' }) title!: string;
  @ApiProperty({ example: 401 }) status!: number;
  @ApiProperty({ example: 'Authentication failed.' }) detail!: string;
  @ApiProperty({ example: 'AUTHENTICATION_FAILED' }) code!: string;
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
  correlationId!: string | null;
}

const problemResponse = (
  status: 401 | 403,
  description: string,
): MethodDecorator & ClassDecorator =>
  ApiResponse({
    status,
    description,
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/ProblemDetailsResponse' },
      },
    },
  });

export const ApiJwtUnauthorizedResponse = (): MethodDecorator & ClassDecorator =>
  problemResponse(401, 'JWT authentication failed or is required.');

export const ApiAdminForbiddenResponse = (): MethodDecorator & ClassDecorator =>
  problemResponse(403, 'Administrator role is required.');
