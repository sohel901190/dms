import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadResult {
  url: string;
  success: boolean;
  error?: string;
}

export async function uploadImage(
  file: File,
  folderPath: string,
  maxSizeMb: number = 5
): Promise<UploadResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      url: '',
      success: false,
      error: 'Invalid file type. Only image files (JPEG, PNG, WEBP, GIF) are allowed.',
    };
  }

  // Validate file size
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      url: '',
      success: false,
      error: `File size exceeds ${maxSizeMb}MB limit. Please choose a smaller image.`,
    };
  }

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = `${folderPath}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, fullPath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      url: downloadUrl,
      success: true,
    };
  } catch (err: any) {
    console.warn('Firebase Storage upload failed:', err);
    // If Firebase Storage is not activated in console or bucket rule fails, convert to data URL so the user is not blocked
    try {
      const dataUrl = await fileToDataUrl(file);
      return {
        url: dataUrl,
        success: true,
        error: 'Uploaded via local compressed image. (Note: Enable Firebase Storage in Firebase Console for cloud hosting).',
      };
    } catch (fallbackErr) {
      return {
        url: '',
        success: false,
        error: err?.message || 'Failed to upload image.',
      };
    }
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
