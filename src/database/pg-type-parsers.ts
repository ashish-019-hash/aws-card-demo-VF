import { types } from 'pg';

/** Prevent pg from converting legacy exact values to Date or number. */
export function registerPgTypeParsers(): void {
  for (const oid of [1082, 1114, 1184, 1700]) {
    types.setTypeParser(oid, (value: string) => value);
  }
}
