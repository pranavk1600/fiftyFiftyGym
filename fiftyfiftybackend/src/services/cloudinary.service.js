import { v2 as cloudinary } from 'cloudinary';

let customCloudinaryUploader = null;

/**
 * Configure mock uploader for automated test suite.
 */
export const setCloudinaryUploaderForTest = (fn) => {
  customCloudinaryUploader = fn;
};

/**
 * Checks if Cloudinary credentials are fully configured.
 */
export const isCloudinaryConfigured = () => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  return Boolean(cloudName && apiKey && apiSecret);
};

/**
 * Initializes and returns the configured Cloudinary v2 client.
 */
export const getCloudinaryClient = () => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true
  });

  return cloudinary;
};

/**
 * Uploads an image buffer directly to Cloudinary.
 * @param {Buffer} buffer - Image file buffer
 * @param {Object} options - Upload options (folder, originalname)
 * @returns {Promise<Object>} Upload result with secure_url and public_id
 */
export const uploadGymLogoFromBuffer = async (buffer, { folder = 'fiftyfiftygym/logos', originalname = '' } = {}) => {
  if (customCloudinaryUploader) {
    return customCloudinaryUploader(buffer, { folder, originalname });
  }

  const client = getCloudinaryClient();
  if (!client) {
    throw new Error('Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend environment variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          return reject(new Error(error.message || 'Cloudinary logo upload failed'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes an existing image by its Cloudinary public ID.
 */
export const deleteCloudinaryImage = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return null;
  try {
    const client = getCloudinaryClient();
    if (!client) return null;
    return await client.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[Cloudinary Warning] Could not remove old logo asset:', err.message);
    return null;
  }
};

export default {
  isCloudinaryConfigured,
  getCloudinaryClient,
  uploadGymLogoFromBuffer,
  deleteCloudinaryImage,
  setCloudinaryUploaderForTest
};
