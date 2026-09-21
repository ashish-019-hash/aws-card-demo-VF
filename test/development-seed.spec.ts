import * as bcrypt from 'bcrypt';
import {
  DEVELOPMENT_ADMIN_ID,
  DevelopmentSeedService,
} from '../src/modules/development-seed/development-seed.service';

interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'A' | 'U';
}

function repository(initial?: StoredUser): {
  service: DevelopmentSeedService;
  state: { user?: StoredUser; saves: number };
} {
  const state: { user?: StoredUser; saves: number } = { user: initial, saves: 0 };
  const users = {
    createQueryBuilder: () => ({
      addSelect: () => ({
        where: () => ({ getOne: () => Promise.resolve(state.user) }),
      }),
    }),
    create: (value: StoredUser) => value,
    save: (value: StoredUser) => {
      state.user = value;
      state.saves += 1;
      return Promise.resolve(value);
    },
  };
  return { service: new DevelopmentSeedService(users as never), state };
}

describe('development seed', () => {
  it('creates DEVADMIN with an exact bcrypt cost of 12 and never returns the password', async () => {
    const { service, state } = repository();

    await expect(service.seedAdmin('DevPass1', 'development')).resolves.toEqual({
      adminId: DEVELOPMENT_ADMIN_ID,
      created: true,
      updated: false,
    });

    expect(state.user).toMatchObject({
      id: 'DEVADMIN',
      firstName: 'Development',
      lastName: 'Administrator',
      role: 'A',
    });
    expect(state.user?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare('DevPass1', state.user!.passwordHash)).toBe(true);
  });

  it('is idempotent when DEVADMIN already has the requested development credentials', async () => {
    const passwordHash = await bcrypt.hash('DevPass1', 12);
    const { service, state } = repository({
      id: DEVELOPMENT_ADMIN_ID,
      firstName: 'Development',
      lastName: 'Administrator',
      passwordHash,
      role: 'A',
    });

    await expect(service.seedAdmin('DevPass1', 'development')).resolves.toEqual({
      adminId: DEVELOPMENT_ADMIN_ID,
      created: false,
      updated: false,
    });
    expect(state.saves).toBe(0);
  });

  it('refuses production and a missing seed password before accessing the database', async () => {
    const { service } = repository();
    await expect(service.seedAdmin('DevPass1', 'production')).rejects.toThrow(
      'Development seed is disabled',
    );
    await expect(service.seedAdmin(undefined, 'development')).rejects.toThrow(
      'SEED_ADMIN_PASSWORD is required',
    );
    await expect(service.seedAdmin(' DevPass', 'development')).rejects.toThrow(
      'SEED_ADMIN_PASSWORD must not begin or end with whitespace',
    );
  });
});
