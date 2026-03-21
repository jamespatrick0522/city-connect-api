import { Injectable, NestMiddleware, UnsupportedMediaTypeException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class CloudinaryUploadMiddleware implements NestMiddleware {
  private readonly upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new UnsupportedMediaTypeException('Only image files are allowed.'));
        return;
      }
      callback(null, true);
    },
  }).single('photo');

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    this.upload(req, _res, async (err: unknown) => {
      if (err) {
        next(err);
        return;
      }

      if (!req.file) {
        next();
        return;
      }

      try {
        req.cloudinaryAsset = await this.cloudinaryService.uploadFile(req.file);
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  }
}

