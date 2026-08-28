import { IUser } from '../routes/models/User.model'; // مسیر را مطابق پروژه تنظیم کن
import { UploadedFile } from 'express-fileupload';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      files?: {
        [fieldname: string]: UploadedFile | UploadedFile[];
      };
    }
  }
}