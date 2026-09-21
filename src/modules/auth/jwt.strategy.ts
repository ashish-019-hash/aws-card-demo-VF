import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.interface';
import { UserEntity } from '../users/user.entity';
import { authenticationFailure } from './auth.service';

interface JwtPayload {
  sub: string;
  role: 'A' | 'U';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!/^[A-Z0-9]{8}$/.test(payload.sub) || !['A', 'U'].includes(payload.role)) {
      throw authenticationFailure();
    }
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user || user.role !== payload.role) throw authenticationFailure();
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role };
  }
}
