/**
 * uploadImage — Priority chain:
 * 1. Cloudinary (if configured via env vars)
 * 2. Backend gateway endpoints
 * 3. Base64 data URL (always works, no external service needed)
 *
 * Cloudinary setup (one-time, recommended for production):
 *  1. cloudinary.com → free account
 *  2. Settings → Upload → Add upload preset → Mode: Unsigned → name: "speedcopy_admin"
 *  3. Vercel env vars: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUDINARY_CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME   || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export async function uploadImage(file: File, folder: string = 'general'): Promise<string> {
  // Validate type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  // 1️⃣ Cloudinary — best option, no CORS, CDN
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

  // 3️⃣ Base64 fallback — always works, no external service needed
  // Note: stores image as data URL, works for preview but large for DB
  console.warn('Using base64 fallback for image upload');
  return await toBase64(file);
}

// ── Cloudinary unsigned upload ──────────────────────────────────────────────
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `speedcopy/admin/${folder}`);
  formData.append('tags', `admin,${folder}`);

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

// ── Backend gateway fallback ────────────────────────────────────────────────
async function uploadViaBackend(file: File, folder: string): Promise<string> {
  const token = localStorage.getItem('admin_token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const endpoints = [
    `${API_BASE}/admin/upload/image`,
    `${API_BASE}/admin/images/upload`,
    `${API_BASE}/upload/image`,
  ];

  for (const endpoint of endpoints) {
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
    } catch {
      // try next endpoint
    }
  }

  throw new Error('All backend endpoints failed');
}

// ── Base64 fallback — always works ──────────────────────────────────────────
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}
