import { assertSafeSeedEnvironment } from '../src/cli/seed-dev';

describe('development seed CLI safety gate', () => {
  const environment = {
    NODE_ENV: 'development',
    SEED_ALLOW_UNSAFE: 'true',
    SEED_ADMIN_PASSWORD: 'DevPass1',
  };

  it('requires an explicit opt-in before any database bootstrap', () => {
    expect(() =>
      assertSafeSeedEnvironment({ ...environment, SEED_ALLOW_UNSAFE: undefined }),
    ).toThrow('SEED_ALLOW_UNSAFE=true is required');
  });

  it('refuses production even when the unsafe opt-in is supplied', () => {
    expect(() => assertSafeSeedEnvironment({ ...environment, NODE_ENV: 'production' })).toThrow(
      'Development seed is disabled',
    );
  });
});
