import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthUserRepository } from './auth-user.repository';
import { verifyToken } from './jwt.util';

export interface AuthorizedUser {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  role?: string;
  gender?: string;
}

@Injectable()
export class LegacyAuthService {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async getAuthorizedUser(req: Request): Promise<AuthorizedUser> {
    const cachedUser = (req as any).__nestAuthorizedUser as
      | AuthorizedUser
      | undefined;
    if (cachedUser) {
      return cachedUser;
    }

    const authorizationHeader = this.getAuthorizationHeader(req);
    const userId =
      this.resolveUserIdFromToken(req, authorizationHeader) ||
      this.resolveUserIdFromSession(req);

    if (!userId) {
      throw new UnauthorizedException('Not valid token');
    }

    const userDocument = await this.authUserRepository.findById(userId);
    if (!userDocument) {
      throw new UnauthorizedException(`Could not found user #${userId}`);
    }

    await this.authUserRepository.ensureRole(userDocument);

    const normalizedUser =
      typeof userDocument.toJSON === 'function'
        ? userDocument.toJSON()
        : userDocument;

    if (!normalizedUser.id && normalizedUser._id) {
      normalizedUser.id = String(normalizedUser._id);
    }

    if (typeof normalizedUser.isAdmin !== 'boolean') {
      normalizedUser.isAdmin = normalizedUser.role === 'admin';
    }

    (req as any).auth = {
      ...(req as any).auth,
      id: normalizedUser.id || String(userId),
      email: normalizedUser.email,
    };

    (req as any).__nestAuthorizedUser = normalizedUser;

    return normalizedUser as AuthorizedUser;
  }

  private resolveUserIdFromToken(
    req: Request,
    authorizationHeader: string,
  ): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const isValidToken = verifyToken(req, authorizationHeader);
    if (!isValidToken) {
      return null;
    }

    const userId = (req as any).auth?.id;
    return userId ? String(userId) : null;
  }

  private resolveUserIdFromSession(req: Request): string | null {
    const sessionUserId = (req as any).session?.userId;
    return sessionUserId ? String(sessionUserId) : null;
  }

  private getAuthorizationHeader(req: Request): string {
    const fromGetter = req.get?.('Authorization');
    const fromHeaders = req.headers?.authorization;
    const fromLegacyHeader = req.headers?.['x-access-token'];

    if (typeof fromGetter === 'string' && fromGetter.length) {
      return fromGetter;
    }

    if (typeof fromHeaders === 'string' && fromHeaders.length) {
      return fromHeaders;
    }

    if (typeof fromLegacyHeader === 'string' && fromLegacyHeader.length) {
      return fromLegacyHeader;
    }

    return '';
  }

  assertSameUserOrAdmin(
    user: AuthorizedUser,
    email: string,
    message: string,
  ): void {
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin');

    if (!isAdmin && user.email !== email) {
      throw new ForbiddenException(message);
    }
  }

  assertSameUserOrAdminOrSupervisor(
    user: AuthorizedUser,
    email: string,
    message: string,
  ): void {
    const role = user.role;
    const isPrivileged = Boolean(
      user.isAdmin || role === 'admin' || role === 'therapist' || role === 'capacitador',
    );

    if (!isPrivileged && user.email !== email) {
      throw new ForbiddenException(message);
    }
  }

  assertAdmin(user: AuthorizedUser, message: string): void {
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin');

    if (!isAdmin) {
      throw new ForbiddenException(message);
    }
  }

  assertAdminOrSupervisor(user: AuthorizedUser, message: string): void {
    const role = user.role;
    const isAdmin = Boolean(user.isAdmin || role === 'admin');

    if (!isAdmin && role !== 'therapist' && role !== 'capacitador') {
      throw new ForbiddenException(message);
    }
  }

  assertSameUserIdOrAdmin(
    user: AuthorizedUser,
    userId: string,
    message: string,
  ): void {
    const isAdmin = Boolean(user.isAdmin || user.role === 'admin');
    const requesterId = String(user.id || user._id || '');

    if (!isAdmin && requesterId !== String(userId)) {
      throw new ForbiddenException(message);
    }
  }
}
