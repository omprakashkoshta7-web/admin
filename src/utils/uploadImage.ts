/**
 * uploadImage — Priority chain:
 * 1. Cloudinary (if configured via env vars)
 * 2. Backend gateway endpoints
 * 3. Compressed base64 (resized to max 800px, quality 0.7) — always works
 *
 * Cloudinary setup (recommended for production):
 *  1. cloudinary.com → free account
 *  2. Settings → Upload → Add upload preset → Mode: Unsigned → name: "speedcopy_admin"
 *  3. Vercel env vars: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUDINARY_CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const MAX_DIMENSION = 800;  // px — resize to this max width/height
const JPEG_QUALITY  = 0.72; // 0–1

export async function uploadImage(file: File, folder: string = 'general'): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  // 1️⃣ Cloudinary
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    try {
      return await uploadToCloudinary(file, folder);
    } catch (err: any) {
      console.warn('Cloudinary upload failed:', err?.message);
    }
  }

  // 2️⃣ Backend gateway
  try {
    return await uploadViaBackend(file, folder);
  } catch (err: any) {
    console.warn('Backend upload failed:', err?.message);
  }

  // 3️⃣ Compressed base64 — resize + compress so it's small enough for backend
  console.warn('Using compressed base64 fallback');
  return await toCompressedBase64(file);
}

// ── Cloudinary ──────────────────────────────────────────────────────────────
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `speedcopy/admin/${folder}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Cloudinary error ${res.status}`);
  }
  const data = await res.json();
  return data.secure_url as string;
}

// ── Backend gateway ─────────────────────────────────────────────────────────
async function uploadViaBackend(file: File, folder: string): Promise<string> {
  const token = localStorage.getItem('admin_token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  for (const endpoint of [
    `${API_BASE}/admin/upload/image`,
    `${API_BASE}/admin/images/upload`,
    `${API_BASE}/upload/image`,
  ]) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const url: string = data?.data?.url || data?.url || data?.imageUrl;
        if (url) return url.startsWith('http') ? url : `${API_BASE}${url}`;
      }
    } catch { /* try next */ }
  }
  throw new Error('All backend endpoints failed');
}

// ── Compressed base64 fallback ──────────────────────────────────────────────
// Resizes image to MAX_DIMENSION and compresses to JPEG — keeps size small
function toCompressedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions keeping aspect ratio
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0, width, height);
      // Export as JPEG with compression
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}
