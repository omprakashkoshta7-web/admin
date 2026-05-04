/**
 * Uploads an image file to Firebase Storage and returns the public download URL.
 * Falls back to backend /admin/images/upload if Firebase Storage is unavailable.
 *
 * @param file   - The File object to upload
 * @param folder - Storage folder, e.g. 'categories' | 'products' | 'general'
 */
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import app from '../config/firebase';

export async function uploadImage(file: File, folder: string = 'general'): Promise<string> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
  }

  // Validate file size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size must be less than 5MB');
  }

  try {
    const storage = getStorage(app);

    // Build unique path: folder/timestamp-randomId-filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `admin/${folder}/${timestamp}-${randomId}-${safeName}`;

    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: 'admin',
        folder,
        originalName: file.name,
      },
    };

    const snapshot = await uploadBytesResumable(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (firebaseError: any) {
    console.warn('Firebase Storage upload failed, trying backend fallback:', firebaseError?.message);

    // Fallback: try backend endpoint
    return uploadImageViaBackend(file, folder);
  }
}

/**
 * Fallback: upload via backend /admin/images/upload
 */
async function uploadImageViaBackend(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('admin_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  // Try multiple possible backend endpoints
  const endpoints = [
    `${API_BASE_URL}/admin/images/upload`,
    `${API_BASE_URL}/admin/upload/image`,
    `${API_BASE_URL}/products/images/upload`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl: string = data?.data?.url || data?.url || data?.imageUrl;
        if (imageUrl) {
          return imageUrl.startsWith('http')
            ? imageUrl
            : `${import.meta.env.VITE_PRODUCT_SERVICE_URL || ''}${imageUrl}`;
        }
      }
    } catch {
      // try next endpoint
    }
  }

  throw new Error('Image upload failed: No working upload endpoint found. Please check Firebase Storage configuration.');
}
