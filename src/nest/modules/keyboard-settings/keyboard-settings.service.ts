import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { KeyboardSettingsModel } from './models/keyboard-settings.model';
import { KeyboardSettingsRepository } from './keyboard-settings.repository';

@Injectable()
export class KeyboardSettingsService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly keyboardSettingsRepository: KeyboardSettingsRepository,
  ) {}

  async getKeyboardSettings(
    req: Request,
    userId?: string,
  ): Promise<KeyboardSettingsModel> {
    const targetUserId = await this.resolveTargetUserId(req, userId);

    const keyboardSettings = await this.keyboardSettingsRepository.findByUserId(
      targetUserId,
    );

    if (!keyboardSettings) {
      throw new NotFoundException('Keyboard settings not found');
    }

    return keyboardSettings;
  }

  async upsertKeyboardSettings(
    req: Request,
    userId: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<KeyboardSettingsModel> {
    const payloadUserId =
      typeof payload.user === 'string' ? payload.user : undefined;
    const targetUserId = await this.resolveTargetUserId(
      req,
      payloadUserId || userId,
    );

    try {
      const updated = await this.keyboardSettingsRepository.upsertByUserId(
        targetUserId,
        payload,
      );

      if (!updated) {
        throw new ConflictException({
          message: 'Validation error',
          error: 'Unable to save keyboard settings',
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException({
        message: 'Validation error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteKeyboardSettings(req: Request, userId: string): Promise<void> {
    const targetUserId = await this.resolveTargetUserId(req, userId);
    await this.keyboardSettingsRepository.deleteByUserId(targetUserId);
  }

  private async resolveTargetUserId(
    req: Request,
    userId?: string,
  ): Promise<string> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);

    const targetUserId = userId || requester.id;
    if (!targetUserId) {
      throw new BadRequestException('User ID missing');
    }

    this.legacyAuthService.assertSameUserIdOrAdmin(
      requester,
      targetUserId,
      'Not authorized.',
    );

    return targetUserId;
  }
}
