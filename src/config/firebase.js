import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase Web config — degerler EXPO_PUBLIC_* ortam degiskenlerinden gelir.
// Yerel: .env  |  EAS build: eas env (production/preview/development).
// Bu degerler istemciye gomulur ve "gizli" degildir; guvenlik Google Cloud
// API anahtar kisitlamasi + Firestore Security Rules ile saglanir.
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn(
        '[firebase] EXPO_PUBLIC_FIREBASE_* ortam degiskenleri eksik. ' +
        'Yerelde .env dosyasini, EAS build icin "eas env" degiskenlerini kontrol et.'
    );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
