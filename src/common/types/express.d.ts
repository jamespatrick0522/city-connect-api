import { UploadApiResponse } from 'cloudinary';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthenticatedUser;
      cloudinaryAsset?: UploadApiResponse;
    }
  }
}

export {};
