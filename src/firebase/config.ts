import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';
import { registerAuthForErrorHandler } from './errorHandler';

export interface FirebaseRuntimeConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
}

// Check local storage for user-provided override config (useful for custom domain or GitHub Pages deployment)
function resolveConfig(): FirebaseRuntimeConfig {
  try {
    const saved = localStorage.getItem('dms_custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom config, falling back to applet config', e);
  }
  return rawConfig as FirebaseRuntimeConfig;
}

export const activeFirebaseConfig: FirebaseRuntimeConfig = resolveConfig();

// Initialize or reuse existing Firebase app
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(activeFirebaseConfig);
} else {
  app = getApp();
}

// CRITICAL: Initialize Firestore with database ID from configuration
export const db: Firestore = activeFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, activeFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);
// Enforce browser local persistence
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set persistence to browserLocalPersistence', err);
});

// Register auth instance with error handler
registerAuthForErrorHandler(auth);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export { app };
