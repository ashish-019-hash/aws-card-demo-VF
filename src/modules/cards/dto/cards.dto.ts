import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { isLegacyDate } from '../../../common/validation/legacy-write.validators';

export class ListCardsQueryDto {
  @IsOptional() @IsString() @Matches(/^\d{11}$/) accountId?: string;
  @IsOptional() @IsString() @Matches(/^\d{16}$/) cardNumber?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
export class UpdateCardDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @Matches(/^[A-Za-z ]{1,50}$/) embossedName?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsIn(['Y', 'N']) status?: 'Y' | 'N';
  @IsOptional() @IsString() @Matches(/^\d{3}$/) cvv?: string;
}
export const validExpiry = (value: string): boolean => isLegacyDate(value, 1950, 2099);
