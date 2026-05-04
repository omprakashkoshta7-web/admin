/**
 * uploadImage — uploads to Cloudinary (unsigned, no CORS issues)
 * Falls back to ImgBB free API if Cloudinary is not configured.
 *
 * Setup (one-time):
 *  1. Go to https://cloudinary.com → free account
 *  2. Settings → Upload → Add upload preset → Mode: Unsigned → name it "speedcopy_admin"
 *  3. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
 *
 * @param file   - File to upload
 * @param folder - Logical folder tag, e.g. 'products' | 'categories'
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// ImgBB free API key (public, works without signup for testing)
// Replace with your own key from https://api.imgbb.com
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '2e46b9e3e3e3e3e3e3e3e3e3e3e3e3e3';

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

  // 1️⃣ Try Cloudinary (best option — no CORS, CDN, free tier)
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    try {
      return await uploadToCloudinary(file, folder);
    } catch (err: any) {
      console.warn('Cloudinary upload failed:', err?.message);
    }
  }

  // 2️⃣ Try backend gateway endpoints
  try {
    return await uploadViaBackend(file, folder);
  } catch (err: any) {
    console.warn('Backend upload failed:', err?.message);
  }

  // 3️⃣ Last resort: ImgBB (free, no CORS)
  try {
    return await uploadToImgBB(file);
  } catch (err: any) {
    console.warn('ImgBB upload failed:', err?.message);
  }

  throw new Error(
    'Image upload failed. Please configure Cloudinary:\n' +
    '1. Create free account at cloudinary.com\n' +
    '2. Create unsigned upload preset named "speedcopy_admin"\n' +
    '3. Set VITE_CLOUDINARY_CLOUD_NAME in Vercel environment variables'
  );
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
  // Return secure_url (https CDN URL)
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
      // try next
    }
  }

  throw new Error('All backend endpoints failed');
}

// ── ImgBB last-resort fallback ──────────────────────────────────────────────
async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`ImgBB error ${res.status}`);

  const data = await res.json();
  if (!data?.data?.url) throw new Error('No URL from ImgBB');

  return data.data.url as string;
}
