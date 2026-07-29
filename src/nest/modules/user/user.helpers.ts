import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { getORQuery, getQuery } from '../../common/query.util';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

export function generateVerificationUrl(): string {
  return randomBytes(24).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(8);
  return bcrypt.hash(password, salt);
}

export function buildUserSearchQuery(query: ListUsersQueryDto): Record<string, unknown> {
  const { search = '', name = '', role, isByBackOffice } = query;
  const searchFields = ['name', 'email'];
  const filters: Record<string, unknown> = {};

  if (role) filters.role = role;
  if (isByBackOffice === 'true') filters.isByBackOffice = true;
  if (isByBackOffice === 'false') filters.isByBackOffice = { $ne: true };

  if (search) {
    return {
      ...filters,
      ...(getORQuery(searchFields, search, true) as Record<string, unknown>),
    };
  }

  if (name) {
    return {
      ...filters,
      ...(getQuery('name', name, true) as Record<string, unknown>),
    };
  }

  return filters;
}
