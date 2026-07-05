import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { CreateUserMessageDto } from './dto/create-user-message.dto';
import { UpdateUserMessageDto } from './dto/update-user-message.dto';
import { UserMessageModel } from './models/user-message.model';
import { UserMessagesRepository } from './user-messages.repository';

@Injectable()
export class UserMessagesService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly userMessagesRepository: UserMessagesRepository,
  ) {}

  async listUserMessages(
    req: Request,
    requestedUserId?: string,
  ): Promise<UserMessageModel[]> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const userId = requestedUserId || requester.id;

    if (!userId) {
      throw new BadRequestException('User ID missing');
    }

    this.legacyAuthService.assertSameUserIdOrAdmin(
      requester,
      userId,
      'Not authorized.',
    );

    return this.userMessagesRepository.listByUser(userId);
  }

  async createUserMessage(
    req: Request,
    payload: CreateUserMessageDto,
  ): Promise<UserMessageModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const userId = payload.userId || requester.id;

    if (!userId) {
      throw new BadRequestException('User ID missing');
    }

    this.legacyAuthService.assertSameUserIdOrAdmin(
      requester,
      userId,
      'Not authorized.',
    );

    if (!payload.text) {
      throw new BadRequestException('text field is required');
    }

    const message = this.userMessagesRepository.create({
      ...payload,
      userId,
    });

    return this.userMessagesRepository.save(message);
  }

  async updateUserMessage(
    req: Request,
    id: string,
    payload: UpdateUserMessageDto,
  ): Promise<UserMessageModel> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const message = await this.userMessagesRepository.findById(id);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    this.legacyAuthService.assertSameUserIdOrAdmin(
      requester,
      String(message.user),
      'Not authorized.',
    );

    this.userMessagesRepository.applyUpdates(message, payload);
    return this.userMessagesRepository.save(message);
  }

  async deleteUserMessage(req: Request, id: string): Promise<void> {
    const requester = await this.legacyAuthService.getAuthorizedUser(req);
    const message = await this.userMessagesRepository.findById(id);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    this.legacyAuthService.assertSameUserIdOrAdmin(
      requester,
      String(message.user),
      'Not authorized.',
    );

    await this.userMessagesRepository.deleteById(id);
  }
}
