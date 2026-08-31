import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
export class ListTransactionsQueryDto {
  @IsOptional() @Matches(/^\d{16}$/) cardNumber?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) reportDateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) reportDateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
export class CreateTransactionDto {
  @IsOptional() @Matches(/^\d{11}$/) accountId?: string;
  @IsOptional() @Matches(/^\d{16}$/) cardNumber?: string;
  @Matches(/^\d{2}$/) typeCode!: string;
  @Matches(/^\d{4}$/) categoryCode!: string;
  @IsString() source!: string;
  @IsString() description!: string;
  @Matches(/^-?\d+\.\d{2}$/) amount!: string;
  @Matches(/^\d{9}$/) merchantId!: string;
  @IsString() merchantName!: string;
  @IsString() merchantCity!: string;
  @IsString() merchantZip!: string;
  @IsString() originalTs!: string;
  @IsOptional() processedTs?: string | null;
}
