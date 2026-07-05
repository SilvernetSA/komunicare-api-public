import { Injectable } from '@nestjs/common';

import { ContentPersistenceService } from '../../common/content-persistence.service';
import { KeyboardSettingsModel } from './models/keyboard-settings.model';

@Injectable()
export class KeyboardSettingsRepository {
  constructor(
    private readonly contentPersistence: ContentPersistenceService,
  ) {}

  async findByUserId(userId: string): Promise<KeyboardSettingsModel | null> {
    const keyboardSettings = await this.contentPersistence.findKeyboardSettingsByUserId(
      userId,
    );

    if (!keyboardSettings) {
      return null;
    }

    return keyboardSettings.toJSON() as KeyboardSettingsModel;
  }

  async upsertByUserId(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<KeyboardSettingsModel | null> {
    const updated = await this.contentPersistence.upsertKeyboardSettingsByUserId(
      userId,
      payload,
    );

    if (!updated) {
      return null;
    }

    return updated.toJSON() as KeyboardSettingsModel;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.contentPersistence.deleteKeyboardSettingsByUserId(userId);
  }
}
