import multer from 'multer';
import { ApiResponse } from '../utils/apiResponse.js';

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes((file.mimetype || '').toLowerCase())) {
    const error = new Error('Invalid file format. Only PNG, JPG, JPEG, and WebP images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter
}).single('logo');

/**
 * Express middleware that wraps multer single upload and intercepts errors.
 */
export const handleLogoUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return ApiResponse.error(res, 'File size exceeds the 5 MB limit. Please upload an image under 5 MB.', 400);
      }
      if (err.code === 'INVALID_FILE_TYPE' || err.message?.includes('Invalid file format')) {
        return ApiResponse.error(res, 'Invalid file format. Only PNG, JPG, JPEG, and WebP images are allowed.', 400);
      }
      return ApiResponse.error(res, err.message || 'File upload error', 400);
    }
    next();
  });
};

export default {
  handleLogoUpload
};
