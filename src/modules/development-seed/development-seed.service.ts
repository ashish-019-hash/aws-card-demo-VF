import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';

export const DEVELOPMENT_ADMIN_ID = 'DEVADMIN';
const BCRYPT_COST = 12;

export interface DevelopmentSeedResult {
  adminId: typeof DEVELOPMENT_ADMIN_ID;
  created: boolean;
  updated: boolean;
}

@Injectable()
export class DevelopmentSeedService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  async seedAdmin(
    password: string | undefined,
    nodeEnv = process.env.NODE_ENV,
  ): Promise<DevelopmentSeedResult> {
    if (nodeEnv === 'production')
      throw new Error('Development seed is disabled when NODE_ENV=production');
    if (!password) throw new Error('SEED_ADMIN_PASSWORD is required for the development seed');
    if (/^\s|\s$/.test(password))
      throw new Error('SEED_ADMIN_PASSWORD must not begin or end with whitespace');
    if (password.length > 8)
      throw new Error(
        'SEED_ADMIN_PASSWORD must be at most 8 characters to match the legacy password limit',
      );

    const existing = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: DEVELOPMENT_ADMIN_ID })
      .getOne();
    const passwordMatches = existing
      ? await bcrypt.compare(password, existing.passwordHash)
      : false;
    const hasExpectedProfile =
      existing?.firstName === 'Development' &&
      existing.lastName === 'Administrator' &&
      existing.role === 'A';

    if (existing && passwordMatches && hasExpectedProfile)
      return { adminId: DEVELOPMENT_ADMIN_ID, created: false, updated: false };

    const user = this.users.create({
      ...(existing ?? {}),
      id: DEVELOPMENT_ADMIN_ID,
      firstName: 'Development',
      lastName: 'Administrator',
      role: 'A',
      passwordHash: passwordMatches
        ? existing!.passwordHash
        : await bcrypt.hash(password, BCRYPT_COST),
    });
    await this.users.save(user);
    return {
      adminId: DEVELOPMENT_ADMIN_ID,
      created: !existing,
      updated: Boolean(existing),
    };
  }
}
