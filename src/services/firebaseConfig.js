/**
 * Firebase Configuration
 * Initializes Firebase app and exports Firestore instance.
 */

import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBHY0KVn7OplQsWQm6XwJMjOrIsKw4ySlI',
  authDomain: 'pashu-sutra.firebaseapp.com',
  projectId: 'pashu-sutra',
  storageBucket: 'pashu-sutra.firebasestorage.app',
  messagingSenderId: '730454388882',
  appId: '1:730454388882:web:592cff260fdc020759764b',
  measurementId: 'G-Y107E9TP5E',
};

const app = initializeApp(firebaseConfig);

// Use long polling to avoid CORS/WebChannel issues on localhost
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
