import { Injectable } from '@nestjs/common';

import { AccountPersistenceService } from './account-persistence.service';

@Injectable()
export class AuthUserRepository {
  constructor(
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async findById(userId: string): Promise<any | null> {
    try {
      return await this.accountPersistence.findUserDocumentById(userId);
    } catch {
      return null;
    }
  }

  async ensureRole(user: any): Promise<void> {
    if (!user || user.role) {
      return;
    }

    user.role = 'user';
    await this.accountPersistence.saveUser(user);
  }
}
