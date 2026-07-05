import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';

import { LegacyAuthService } from '../../common/legacy-auth.service';
import { MediaResponseModel } from './models/media.model';
import { MediaRepository } from './media.repository';

@Injectable()
export class MediaService {
  constructor(
    private readonly legacyAuthService: LegacyAuthService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  async uploadMedia(req: Request, file: any): Promise<MediaResponseModel> {
    await this.legacyAuthService.getAuthorizedUser(req);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const fileUrl = await this.mediaRepository.uploadMedia(file);
      return { url: fileUrl };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'ERROR: Unable to upload media file . ' + error.message,
      );
    }
  }
}
