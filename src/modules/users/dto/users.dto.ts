import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;
export class CreateUserDto {
  @Transform(upper) @IsString() @Matches(/^[A-Z0-9]{8}$/) id!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20)
  firstName!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20)
  lastName!: string;
  @IsString() @Length(1, 8) @Matches(/\S/) password!: string;
  @IsIn(['A', 'U']) role!: 'A' | 'U';
}
export class UpdateUserDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20)
  firstName?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20)
  lastName?: string;
  @IsOptional() @IsString() @Length(1, 8) @Matches(/\S/) password?: string;
  @IsOptional() @IsIn(['A', 'U']) role?: 'A' | 'U';
}
export class ListUsersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
export class DeleteUserQueryDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}
