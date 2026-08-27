import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9]{8}$/)
  userId!: string;

  @IsString()
  @Length(1, 8)
  password!: string;
}
