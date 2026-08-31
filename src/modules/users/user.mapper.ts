import { trimFixed } from '../../common/validation/legacy-write.validators';
import { UserEntity } from './user.entity';

export function toUserResponse(user: UserEntity): Record<string, unknown> {
  return {
    id: trimFixed(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    version: user.version,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
