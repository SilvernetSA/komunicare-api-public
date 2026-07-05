import {
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../common/base.controller';
import {
  ApiBinaryFileBody,
  ApiErrorResponses,
  ApiSuccessResponse,
} from '../../common/swagger.decorators';
import { MediaResponseModel } from './models/media.model';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('media')
export class MediaController extends BaseController {
  constructor(private readonly mediaService: MediaService) {
    super();
  }

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBinaryFileBody('file')
  @ApiSuccessResponse(MediaResponseModel, 'Uploaded media URL')
  @ApiErrorResponses('badRequest', 'unauthorized', 'internal')
  uploadMedia(
    @Req() req: Request,
    @UploadedFile() file: any,
  ): Promise<MediaResponseModel> {
    return this.executeRequest(
      'uploadMedia',
      () => this.mediaService.uploadMedia(req, file),
      'Could not upload media',
    );
  }
}
