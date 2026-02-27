/**
 * Firebase Configuration
 * Initializes Firebase app and exports Firestore instance.
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

const app = initializeApp(firebaseConfig);

// Use long polling to avoid CORS/WebChannel issues on localhost
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
