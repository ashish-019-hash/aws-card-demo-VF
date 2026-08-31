import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  IsLegacyMoney,
  IsLegacyWriteDate,
} from '../../../common/validation/legacy-write.validators';

export class AccountChangesDto {
  @IsOptional()
  @IsIn(['Y', 'N'])
  status?: 'Y' | 'N';

  @IsOptional()
  @IsString()
  @IsLegacyMoney()
  currentBalance?: string;

  @IsOptional()
  @IsString()
  @IsLegacyMoney()
  creditLimit?: string;

  @IsOptional()
  @IsString()
  @IsLegacyMoney()
  cashCreditLimit?: string;

  @IsOptional()
  @IsString()
  @IsLegacyWriteDate()
  openDate?: string;

  @IsOptional()
  @IsString()
  @IsLegacyWriteDate()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  @IsLegacyWriteDate()
  reissueDate?: string;

  @IsOptional()
  @IsString()
  @IsLegacyMoney()
  currentCycleCredit?: string;

  @IsOptional()
  @IsString()
  @IsLegacyMoney()
  currentCycleDebit?: string;

  @IsOptional()
  @IsString()
  @Matches(/^.{0,10}$/)
  addressZip?: string;

  @IsOptional()
  @IsString()
  @Matches(/^.{1,10}$/)
  groupId?: string;
}

export class CustomerChangesDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z ]{1,25}$/)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z ]{0,25}$/)
  middleName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z ]{1,25}$/)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^.{1,50}$/)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @Matches(/^.{0,50}$/)
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z ]{1,50}$/)
  addressLine3?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  addressStateCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/)
  addressCountryCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  addressZip?: string;

  @IsOptional()
  @IsString()
  phoneNumber1?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber2?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/)
  ssn?: string;

  @IsOptional()
  @IsString()
  @Matches(/^.{1,20}$/)
  governmentIssuedId?: string;

  @IsOptional()
  @IsString()
  @IsLegacyWriteDate()
  dob?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/)
  eftAccountId?: string | null;

  @IsOptional()
  @IsIn(['Y', 'N'])
  primaryCardHolder?: 'Y' | 'N';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(300)
  @Max(850)
  ficoScore?: number;
}

export class CustomerUpdateDto {
  @IsString()
  @Matches(/^\d{9}$/)
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @Type(() => CustomerChangesDto)
  @ValidateNested()
  changes!: CustomerChangesDto;
}

export class UpdateAccountDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @Type(() => AccountChangesDto)
  @ValidateNested()
  account?: AccountChangesDto;

  @IsOptional()
  @Type(() => CustomerUpdateDto)
  @ValidateNested()
  customer?: CustomerUpdateDto;
}
