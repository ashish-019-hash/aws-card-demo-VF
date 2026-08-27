import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { decodeCursor, encodeCursor, normalizeLimit } from '../../common/cursor/keyset-cursor';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { toUserResponse } from './user.mapper';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async list(limitValue?: number, cursorValue?: string): Promise<Record<string, unknown>> {
    const limit = normalizeLimit(limitValue);
    const cursor = cursorValue ? decodeCursor(cursorValue, this.cursorSecret) : undefined;
    const direction = cursor?.direction ?? 'forward';
    const qb = this.users
      .createQueryBuilder('user')
      .orderBy('user.id', direction === 'forward' ? 'ASC' : 'DESC')
      .take(limit + 1);
    if (cursor)
      qb.where(`user.id ${direction === 'forward' ? '>' : '<'} :key`, { key: cursor.key });
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    if (direction === 'backward') items.reverse();
    return {
      items: items.map(toUserResponse),
      page: {
        ...(items.length > 0
          ? {
              nextCursor: hasMore
                ? encodeCursor(
                    { direction: 'forward', key: items[items.length - 1]!.id },
                    this.cursorSecret,
                  )
                : null,
              previousCursor: encodeCursor(
                { direction: 'backward', key: items[0]!.id },
                this.cursorSecret,
              ),
            }
          : { nextCursor: null, previousCursor: null }),
      },
    };
  }

  async detail(id: string): Promise<Record<string, unknown>> {
    return toUserResponse(await this.requireUser(id));
  }

  async create(dto: CreateUserDto): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      if (await manager.exists(UserEntity, { where: { id: dto.id } })) {
        throw new ConflictException({
          code: 'USER_ALREADY_EXISTS',
          message: 'User already exists.',
        });
      }
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended('carddemo:last-admin', 0))`,
      );
      const entity = manager.create(UserEntity, {
        id: dto.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: dto.role,
      });
      return toUserResponse(await manager.save(entity));
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(UserEntity, { id });
      if (!user) throw userNotFound();
      const fields = ['firstName', 'lastName', 'role', 'password'].filter(
        (field) => dto[field as keyof UpdateUserDto] !== undefined,
      );
      if (fields.length === 0) throw noChanges();
      const changing =
        (dto.firstName !== undefined && dto.firstName !== user.firstName) ||
        (dto.lastName !== undefined && dto.lastName !== user.lastName) ||
        (dto.role !== undefined && dto.role !== user.role) ||
        dto.password !== undefined;
      if (!changing) throw noChanges();
      if (user.role === 'A' && dto.role === 'U') await this.ensureAnotherAdmin(manager, user.id);
      if (dto.role === 'A' || (user.role === 'A' && dto.role === 'U'))
        await manager.query(
          `SELECT pg_advisory_xact_lock(hashtextextended('carddemo:last-admin', 0))`,
        );
      const passwordHash =
        dto.password === undefined ? undefined : await bcrypt.hash(dto.password, 12);
      const result = await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({
          firstName: dto.firstName ?? user.firstName,
          lastName: dto.lastName ?? user.lastName,
          role: dto.role ?? user.role,
          ...(passwordHash ? { passwordHash } : {}),
          version: () => 'version + 1',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND version = :version', { id, version: dto.expectedVersion })
        .execute();
      if (result.affected !== 1) throw await this.versionOrNotFound(manager, id);
      const updated = await manager.findOneBy(UserEntity, { id });
      if (!updated) throw userNotFound();
      return toUserResponse(updated);
    });
  }

  async delete(id: string, expectedVersion: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(UserEntity, { id });
      if (!user) throw userNotFound();
      if (user.role === 'A') await this.ensureAnotherAdmin(manager, id);
      const result = await manager.delete(UserEntity, { id, version: expectedVersion });
      if (result.affected !== 1) throw await this.versionOrNotFound(manager, id);
    });
  }

  private get cursorSecret(): string {
    return this.config.getOrThrow<string>('cursorSecret');
  }
  private async ensureAnotherAdmin(
    manager: import('typeorm').EntityManager,
    id: string,
  ): Promise<void> {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtextextended('carddemo:last-admin', 0))`);
    const admins = await manager.query<{ id: string }[]>(
      `SELECT id FROM users WHERE role = 'A' ORDER BY id FOR UPDATE`,
    );
    if (admins.length <= 1 && admins[0]?.id === id)
      throw new ConflictException({
        code: 'LAST_ADMIN_REQUIRED',
        message: 'At least one admin is required.',
      });
  }
  private async requireUser(id: string): Promise<UserEntity> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw userNotFound();
    return user;
  }
  private async versionOrNotFound(
    manager: import('typeorm').EntityManager,
    id: string,
  ): Promise<Error> {
    return (await manager.exists(UserEntity, { where: { id } }))
      ? new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version does not match.' })
      : userNotFound();
  }
}
const userNotFound = (): NotFoundException =>
  new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
const noChanges = (): BadRequestException =>
  new BadRequestException({
    code: 'NO_CHANGES',
    message: 'At least one effective change is required.',
  });
