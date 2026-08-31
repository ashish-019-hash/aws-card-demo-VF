import { envValidationSchema } from '../src/config/env.validation';

const cursorSecret = 'c'.repeat(32);
const jwtSecret = 'j'.repeat(32);

function validate(environment: Record<string, string | undefined>) {
  return envValidationSchema.validate({
    DATABASE_URL: 'postgresql://carddemo:password@localhost:5432/carddemo',
    CURSOR_SECRET: cursorSecret,
    JWT_SECRET: jwtSecret,
    ...environment,
  });
}

describe('environment validation', () => {
  it.each(['CURSOR_SECRET', 'JWT_SECRET'])('requires %s', (key) => {
    const { error } = validate({ [key]: undefined });
    expect(error?.message).toContain('is required');
  });

  it.each(['CURSOR_SECRET', 'JWT_SECRET'])('requires %s to have at least 32 characters', (key) => {
    const { error } = validate({ [key]: 'short' });
    expect(error?.message).toContain('length must be at least 32 characters long');
  });

  it('requires different cursor and JWT signing secrets', () => {
    const { error } = validate({ JWT_SECRET: cursorSecret });
    expect(error?.message).toContain('JWT_SECRET must differ from CURSOR_SECRET');
  });

  it('accepts distinct valid signing secrets', () => {
    const { error } = validate({});
    expect(error).toBeUndefined();
  });
});
