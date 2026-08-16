import { Injectable, NestMiddleware, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';

import { CloudinaryService, CloudinaryResourceType } from './cloudinary.service';

interface UploadOptions {
  fieldName: string;
  maxFileSize: number;
  resourceType: CloudinaryResourceType;
  accept: (mimetype: string) => boolean;
  invalidTypeMessage: string;
}

abstract class BaseCloudinaryUploadMiddleware implements NestMiddleware {
  private readonly upload: RequestHandler;

  protected constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly options: UploadOptions,
  ) {
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: options.maxFileSize,
      },
      fileFilter: (_req, file, callback) => {
        if (!options.accept(file.mimetype)) {
          callback(new UnsupportedMediaTypeException(options.invalidTypeMessage));
          return;
        }
        callback(null, true);
      },
    }).single(options.fieldName);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.upload(req, res, async (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          next(new PayloadTooLargeException('Uploaded file exceeds the allowed size.'));
          return;
        }

        next(err);
        return;
      }

      if (!req.file) {
        next();
        return;
      }

      try {
        req.cloudinaryAsset = await this.cloudinaryService.uploadFile(
          req.file,
          undefined,
          this.options.resourceType,
        );
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  }
}

@Injectable()
export class CloudinaryUploadMiddleware extends BaseCloudinaryUploadMiddleware {
  constructor(cloudinaryService: CloudinaryService) {
    super(cloudinaryService, {
      fieldName: 'photo',
      maxFileSize: 5 * 1024 * 1024,
      resourceType: 'image',
      accept: (mimetype) => mimetype.startsWith('image/'),
      invalidTypeMessage: 'Only image files are allowed.',
    });
  }
}

@Injectable()
export class CloudinaryGalleryImageUploadMiddleware extends BaseCloudinaryUploadMiddleware {
  constructor(cloudinaryService: CloudinaryService) {
    super(cloudinaryService, {
      fieldName: 'image',
      maxFileSize: 5 * 1024 * 1024,
      resourceType: 'image',
      accept: (mimetype) => mimetype.startsWith('image/'),
      invalidTypeMessage: 'Only image files are allowed.',
    });
  }
}

@Injectable()
export class CloudinaryVideoUploadMiddleware extends BaseCloudinaryUploadMiddleware {
  constructor(cloudinaryService: CloudinaryService) {
    super(cloudinaryService, {
      fieldName: 'video',
      maxFileSize: 30 * 1024 * 1024,
      resourceType: 'video',
      accept: (mimetype) => ['video/mp4', 'video/quicktime', 'video/webm'].includes(mimetype),
      invalidTypeMessage: 'Only MP4, MOV, or WEBM video files are allowed.',
    });
  }
}

