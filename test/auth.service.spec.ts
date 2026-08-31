import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService login', () => {
  it('returns a JWT only for the exact-case password and generic failures otherwise', async () => {
    const passwordHash = await bcrypt.hash('CasePass', 12);
    const repository = {
      createQueryBuilder: () => ({
        addSelect: () => ({
          where: () => ({
            getOne: () =>
              Promise.resolve({
                id: 'DEVADMIN',
                firstName: 'Development',
                lastName: 'Administrator',
                passwordHash,
                role: 'A' as const,
              }),
          }),
        }),
      }),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt') } as unknown as JwtService;
    const config = { getOrThrow: jest.fn().mockReturnValue(900) } as unknown as ConfigService;
    const service = new AuthService(repository as never, jwt, config);

    await expect(service.login('DEVADMIN', 'CasePass')).resolves.toEqual({
      accessToken: 'signed-jwt',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'DEVADMIN', firstName: 'Development', lastName: 'Administrator', role: 'A' },
    });
    await expect(service.login('DEVADMIN', 'casepass')).rejects.toMatchObject({
      response: { code: 'AUTHENTICATION_FAILED' },
    });
  });
});
