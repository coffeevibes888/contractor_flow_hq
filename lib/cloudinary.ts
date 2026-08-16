import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function requireCloudinaryConfig() {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Cloudinary environment variables are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
  }
}

export { cloudinary };

export function getSignedCloudinaryUrl(params: {
  publicId: string;
  resourceType?: 'image' | 'raw' | 'video';
  expiresInSeconds?: number;
}) {
  requireCloudinaryConfig();
  const resourceType = params.resourceType || 'raw';
  const expiresInSeconds = params.expiresInSeconds ?? 60 * 60; // Default 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.url(params.publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
  });
}

/**
 * Generate a signed URL from a Cloudinary secure_url
 * This is useful when you have the full URL stored in the database
 */
export function getSignedUrlFromStoredUrl(
  storedUrl: string,
  expiresInSeconds: number = 60 * 60 // Default 1 hour
): string | null {
  const publicId = extractPublicIdFromUrl(storedUrl);
  if (!publicId) return null;
  
  return getSignedCloudinaryUrl({
    publicId,
    resourceType: 'raw',
    expiresInSeconds,
  });
}

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  requireCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const base64String = fileBuffer.toString('base64');
    const dataUri = `data:application/octet-stream;base64,${base64String}`;

    cloudinary.uploader.upload(
      dataUri,
      options,
      (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error || new Error('Unknown Cloudinary upload error'));
          return;
        }
        resolve(result);
      }
    );
  });
}

export async function uploadUrlToCloudinary(
  fileUrl: string,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  requireCloudinaryConfig();
  const result = await cloudinary.uploader.upload(fileUrl, options);
  return result;
}

/**
 * Generate an optimized Cloudinary URL with transformations
 * This allows Cloudinary to handle optimization instead of Vercel
 */
export function getOptimizedCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'limit';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  }
): string {
  requireCloudinaryConfig();
  
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options?.width,
        height: options?.height,
        crop: options?.crop || 'fill',
        quality: options?.quality || 'auto',
        fetch_format: options?.format || 'auto',
      },
    ],
    secure: true,
  });
}

/**
 * Extract public ID from a Cloudinary URL
 * Handles both upload and authenticated URLs:
 * - https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
 * - https://res.cloudinary.com/cloud/raw/authenticated/s--xxx--/v1/folder/file.pdf
 * Returns: folder/image or folder/file
 */
export function extractPublicIdFromUrl(cloudinaryUrl: string): string | null {
  try {
    // Handle authenticated URLs (e.g., /raw/authenticated/s--xxx--/v1/folder/file.pdf)
    const authMatch = cloudinaryUrl.match(/\/authenticated\/s--[^/]+--\/v\d+\/(.+?)(?:\.\w+)?$/);
    if (authMatch) {
      return authMatch[1];
    }
    
    // Handle standard upload URLs (e.g., /upload/v123/folder/image.jpg)
    const uploadMatch = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (uploadMatch) {
      return uploadMatch[1];
    }
    
    // Handle URLs without version (e.g., /raw/upload/folder/file.pdf)
    const simpleMatch = cloudinaryUrl.match(/\/(?:upload|authenticated)\/(.+?)(?:\.\w+)?$/);
    if (simpleMatch) {
      return simpleMatch[1];
    }
    
    return null;
  } catch {
    return null;
  }
}
