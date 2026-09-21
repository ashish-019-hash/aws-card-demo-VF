import { Type } from 'class-transformer';
import { Equals, IsInt, Matches, Min } from 'class-validator';
export class CreatePaymentDto {
  @Matches(/^\d{11}$/) accountId!: string;
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @Equals(true) confirmed!: true;
}
