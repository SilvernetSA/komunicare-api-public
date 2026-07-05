import { Injectable } from '@nestjs/common';

import { AccountPersistenceService } from '../../common/account-persistence.service';

@Injectable()
export class SettingsRepository {
  constructor(
    private readonly accountPersistence: AccountPersistenceService,
  ) {}

  async findUserById(id: string): Promise<any | null> {
    return this.accountPersistence.getUserById(id);
  }

  async getOrCreateSettings(user: any): Promise<any> {
    return this.accountPersistence.getOrCreateSettings(user);
  }

  async findByUserId(userId: string): Promise<any | null> {
    return this.accountPersistence.findSettingsDocumentByUserId(userId);
  }

  async updateById(
    settingsId: string,
    nextSettings: Record<string, unknown>,
  ): Promise<any | null> {
    return this.accountPersistence.updateSettingsById(settingsId, nextSettings);
  }
}
