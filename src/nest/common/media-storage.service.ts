import { Injectable } from '@nestjs/common';
import { BlobService, createBlobService } from 'azure-storage';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const uuidv1 = require('uuid/v1');

let blobService: BlobService | null = null;

const getBlobService = (): BlobService => {
  if (blobService) {
    return blobService;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured.');
  }

  blobService = createBlobService(connectionString);
  return blobService;
};

const createContainerIfNotExists = async (containerName: string): Promise<void> => {
  const service = getBlobService();

  await new Promise<void>((resolve, reject) => {
    service.createContainerIfNotExists(containerName, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

@Injectable()
export class MediaStorageService {
  async createBlockBlobFromText(
    containerName: string,
    fileName: string,
    file: { buffer: Buffer; mimetype?: string },
    prefix = '',
  ): Promise<[any, string]> {
    await createContainerIfNotExists(containerName);

    const service = getBlobService();
    const { buffer, mimetype } = file;
    const options: {
      contentSettings?: { contentType: string; cacheControl: string };
    } = {};

    if (mimetype && mimetype.length) {
      const cacheMaxAgeInSeconds = 31536000;
      options.contentSettings = {
        contentType: mimetype,
        cacheControl: `max-age=${cacheMaxAgeInSeconds}`,
      };
    }

    const ts = Math.round(Date.now() / 1000);
    const uuidSuffix = String(uuidv1()).split('-').pop() || 'blob';
    const normalizedPrefix = prefix?.length ? `${prefix}_` : '';
    const finalName = `${normalizedPrefix}${ts}_${uuidSuffix}_${fileName.toLowerCase().trim()}`;

    return new Promise((resolve, reject) => {
      service.createBlockBlobFromText(
        containerName,
        finalName,
        buffer,
        options,
        (error, uploadedFile: any) => {
          if (error) {
            reject(error);
            return;
          }

          resolve([uploadedFile, service.getUrl(uploadedFile.container, uploadedFile.name)]);
        },
      );
    });
  }
}
