import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TOKENS } from '../constants/tokens';

export type CloudinaryResourceType = 'image' | 'video';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(TOKENS.CLOUDINARY_CLIENT)
    private readonly cloudinaryClient: typeof cloudinary,
    private readonly configService: ConfigService,
  ) {}

  uploadFile(
    file: Express.Multer.File,
    folder?: string,
    resourceType: CloudinaryResourceType = 'image',
  ): Promise<UploadApiResponse> {
    const targetFolder = folder ?? this.configService.getOrThrow<string>('app.cloudinary.folder');

    return new Promise((resolve, reject) => {
      const stream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder: targetFolder,
          resource_type: resourceType,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed without result.'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(file.buffer);
    });
  }

  deleteFile(publicId: string, resourceType: CloudinaryResourceType = 'image'): Promise<unknown> {
    return this.cloudinaryClient.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
