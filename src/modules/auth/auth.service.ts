import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';

const DUMMY_HASH = '$2b$12$C1rVoPKoXLMXFLqhwp0Wn.nIzFAp3/FHQTR5vFsaeC5.JGoRrXZZu';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.expiresIn = config.getOrThrow<number>('jwtExpiresInSeconds');
  }

  private readonly expiresIn: number;

  async login(userId: string, password: string): Promise<Record<string, unknown>> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw authenticationFailure();
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
  }
}

export function authenticationFailure(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication failed.',
  });
}
