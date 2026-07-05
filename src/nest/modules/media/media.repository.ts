import { Injectable } from '@nestjs/common';

import { MediaStorageService } from '../../common/media-storage.service';

const BLOB_CONTAINER_NAME = process.env.BLOB_MEDIA_CONTAINER || process.env.BLOB_CONTAINER_NAME || 'cblob';

@Injectable()
export class MediaRepository {
  constructor(private readonly mediaStorageService: MediaStorageService) {}

  async uploadMedia(file: any): Promise<string> {
    const [, fileUrl] = await this.mediaStorageService.createBlockBlobFromText(
      BLOB_CONTAINER_NAME,
      file.originalname,
      file,
    );

    return fileUrl;
  }
}
