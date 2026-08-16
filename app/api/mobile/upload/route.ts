/**
 * POST /api/mobile/upload
 *
 * Mirrors /api/upload but uses mobile-token auth so the app can upload images.
 * Multipart form-data: { file, folder? }
 *
 * Response: { url, publicId, width, height }
 */
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { verifyMobileToken } from '@/lib/mobile-auth';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB — short videos can be ~50MB
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  // Videos — work-order context clips, walkthroughs
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp',
  // Documents — leases, forms, etc.
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function isImageType(type: string | null | undefined) {
  return !!type && type.startsWith('image/');
}
function isVideoType(type: string | null | undefined) {
  return !!type && type.startsWith('video/');
}
/** Cloudinary needs `resource_type: 'video'` for video uploads, `'raw'` for docs/PDFs. */
function resourceTypeFor(type: string | null | undefined): 'image' | 'video' | 'raw' {
  if (isImageType(type)) return 'image';
  if (isVideoType(type)) return 'video';
  return 'raw';
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'mobile-uploads';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const isImage = isImageType(file.type);
    const isVideo = isVideoType(file.type);
    const resourceType = resourceTypeFor(file.type);
    const uploaded = await uploadToCloudinary(buf, {
      folder,
      // PDFs / Word docs ride on Cloudinary's `raw` storage; videos take the
      // `video` pipeline (auto thumbnails); images get the image pipeline so
      // they can be transformed.
      resource_type: resourceType,
      ...(isImage
        ? { transformation: [{ quality: 'auto:good', fetch_format: 'auto' }] }
        : isVideo
        ? { eager: [{ format: 'jpg', start_offset: '1', width: 600, crop: 'scale' }] }
        : {}),
    });

    // For videos, derive a thumbnail URL from the eager transformation so
    // the client can render previews without fetching the full clip.
    const thumbnailUrl = isVideo
      ? (uploaded.eager?.[0]?.secure_url ?? null)
      : null;

    return NextResponse.json({
      success: true,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      mimeType: file.type || null,
      sizeBytes: file.size,
      fileName: file.name,
      thumbnailUrl,
      kind: isImage ? 'image' : isVideo ? 'video' : 'raw',
    });
  } catch (error) {
    console.error('[mobile/upload]', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
