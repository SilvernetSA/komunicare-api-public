import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

import {
  AuthorizedUser,
  LegacyAuthService,
} from '../../common/legacy-auth.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsModel } from './models/settings.model';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  async getSettings(req: Request): Promise<SettingsModel> {
    const user = await this.legacyAuthService.getAuthorizedUser(req);
    return this.getOrCreateSettingsForUser(user);
  }

  async updateCurrentSettings(
    req: Request,
    payload: UpdateSettingsDto,
    queryUserId?: string,
  ): Promise<SettingsModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const targetUserId = payload.user || payload.id || queryUserId || requester.id;

    if (!targetUserId) {
      throw new BadRequestException('User id is required.');
    }

    return this.updateSettingsForTargetUser(requester, targetUserId, payload);
  }

  async getSettingsByUserId(req: Request, id: string): Promise<SettingsModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    return this.getSettingsByUserIdForRequester(requester, id);
  }

  async updateSettings(
    req: Request,
    id: string,
    payload: UpdateSettingsDto,
  ): Promise<SettingsModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    return this.updateSettingsForTargetUser(requester, id, payload);
  }

  private async getOrCreateSettingsForUser(user: any): Promise<SettingsModel> {
    const settings = await this.settingsRepository.getOrCreateSettings(user);

    if (!settings) {
      throw new InternalServerErrorException('Could not get settings');
    }

    return typeof settings.toJSON === 'function'
      ? (settings.toJSON() as SettingsModel)
      : (settings as SettingsModel);
  }

  private async getSettingsByUserIdForRequester(
    requester: AuthorizedUser,
    id: string,
  ): Promise<SettingsModel> {
    const targetUser = await this.findTargetUserOrThrow(id);
    this.legacyAuthService.assertSameUserOrAdmin(
      requester,
      targetUser.email,
      'Not authorized.',
    );

    const settings =
      (await this.settingsRepository.findByUserId(id)) ||
      (await this.settingsRepository.getOrCreateSettings({ id }));

    if (!settings) {
      throw new NotFoundException(`Settings not found. User Id: ${id}`);
    }

    return typeof settings.toJSON === 'function'
      ? (settings.toJSON() as SettingsModel)
      : (settings as SettingsModel);
  }

  private async updateSettingsForTargetUser(
    requester: AuthorizedUser,
    id: string,
    payload: UpdateSettingsDto,
  ): Promise<SettingsModel> {
    const targetUser = await this.findTargetUserOrThrow(id);
    this.legacyAuthService.assertSameUserOrAdmin(
      requester,
      targetUser.email,
      'Not authorized.',
    );

    const userSettings = await this.settingsRepository.getOrCreateSettings({ id });

    if (!userSettings) {
      throw new InternalServerErrorException(
        'Could not retrieve user settings.',
      );
    }

    const nextSettings: Record<string, unknown> = {
      ...userSettings,
      ...payload,
      user: id,
    };
    delete nextSettings.id;

    try {
      const updatedSettings = await this.settingsRepository.updateById(
        userSettings.id,
        nextSettings,
      );

      if (!updatedSettings) {
        throw new NotFoundException('Settings not found after update');
      }

      return updatedSettings.toJSON() as SettingsModel;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new ConflictException({
        message: 'Error saving settings',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async findTargetUserOrThrow(id: string): Promise<any> {
    const targetUser = await this.settingsRepository.findUserById(id);

    if (!targetUser) {
      throw new NotFoundException(`Settings not found. User Id: ${id}`);
    }

    return targetUser;
  }
}
