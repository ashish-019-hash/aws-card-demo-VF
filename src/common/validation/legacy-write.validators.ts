import {
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';
import {
  LEGACY_PHONE_AREA_CODE_SET,
  LEGACY_US_STATE_CODE_SET,
  LEGACY_US_STATE_ZIP_PREFIX_SET,
} from './legacy-validation-lookups';
import { isExactDate, isExactDecimal } from './exact.validators';

export const isPositiveVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const trimFixed = (value: string): string => value.trimEnd();
export const isLegacyDate = (value: string, minYear = 1900, maxYear = 2099): boolean => {
  if (!isExactDate(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= minYear && year <= maxYear;
};
export const isLegacyMoney = (value: string): boolean =>
  isExactDecimal(value, 12, 2) && /^-?(?:\d{1,10})\.\d{2}$/.test(value);

@ValidatorConstraint({ name: 'legacyWriteDate', async: false })
export class LegacyWriteDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [minYear = 1900, maxYear = 2099] = args.constraints as [number?, number?];
    return typeof value === 'string' && isLegacyDate(value, minYear, maxYear);
  }

  defaultMessage(args: ValidationArguments): string {
    const [minYear = 1900, maxYear = 2099] = args.constraints as [number?, number?];
    return `must be a real YYYY-MM-DD date between ${minYear} and ${maxYear}`;
  }
}

export function IsLegacyWriteDate(
  minYear = 1900,
  maxYear = 2099,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [minYear, maxYear],
      options: validationOptions,
      validator: LegacyWriteDateConstraint,
    });
}
export const isManualTransactionAmount = (value: string): boolean => {
  if (!isExactDecimal(value, 11, 2)) return false;
  const scaled = BigInt(value.replace('.', ''));
  return scaled >= -99999999999n && scaled <= 99999999999n;
};
export const isLegacyPhone = (value: string): boolean => {
  const match = /^\((\d{3})\)(\d{3})-(\d{4})$/.exec(value);
  return (
    match !== null &&
    LEGACY_PHONE_AREA_CODE_SET.has(match[1]!) &&
    match[2] !== '000' &&
    match[3] !== '0000'
  );
};
export const isLegacySsn = (value: string): boolean => {
  if (!/^\d{9}$/.test(value)) return false;
  const first = Number(value.slice(0, 3));
  return (
    first !== 0 &&
    first !== 666 &&
    first < 900 &&
    value.slice(3, 5) !== '00' &&
    value.slice(5) !== '0000'
  );
};
export const isStateZipPrefix = (state: string, zip: string): boolean =>
  LEGACY_US_STATE_CODE_SET.has(state) &&
  /^\d{5}$/.test(zip) &&
  LEGACY_US_STATE_ZIP_PREFIX_SET.has(`${state}${zip.slice(0, 2)}`);

@ValidatorConstraint({ name: 'legacyMoney', async: false })
export class LegacyMoneyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isLegacyMoney(value);
  }
  defaultMessage(): string {
    return 'must be an exact two-decimal value within the legacy account range';
  }
}
export function IsLegacyMoney(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: LegacyMoneyConstraint,
    });
}

@ValidatorConstraint({ name: 'stateZip', async: false })
export class StateZipConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const state = (args.object as Record<string, unknown>).addressStateCode;
    return typeof value === 'string' && typeof state === 'string' && isStateZipPrefix(state, value);
  }
  defaultMessage(): string {
    return 'must be a valid ZIP prefix for addressStateCode';
  }
}
export function IsStateZip(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: StateZipConstraint,
    });
}
