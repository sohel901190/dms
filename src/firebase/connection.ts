import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './config';

export interface ConnectionStatus {
  tested: boolean;
  online: boolean;
  errorMessage?: string;
  testedAt?: Date;
}

export async function testConnection(): Promise<ConnectionStatus> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      tested: true,
      online: true,
      testedAt: new Date(),
    };
  } catch (error) {
    let msg = 'Failed to communicate with Firestore backend.';
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        msg = 'Firestore client is currently offline. Please check network connection and project credentials.';
      } else if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
        // Permission denied on test/connection is expected if security rules default-deny /test, but it confirms backend connectivity!
        return {
          tested: true,
          online: true,
          testedAt: new Date(),
        };
      } else {
        msg = error.message;
      }
    }
    console.warn('Connection test note:', msg);
    return {
      tested: true,
      online: false,
      errorMessage: msg,
      testedAt: new Date(),
    };
  }
}
