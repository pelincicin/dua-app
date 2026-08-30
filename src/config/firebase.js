import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAMvB8unHGQlKzNvlXuwksDRUgsVy5w05A",
    authDomain: "huzur-zikirmatik-ve-dualar.firebaseapp.com",
    projectId: "huzur-zikirmatik-ve-dualar",
    storageBucket: "huzur-zikirmatik-ve-dualar.firebasestorage.app",
    messagingSenderId: "276550028653",
    appId: "1:276550028653:web:dcdff025f964a15c8e5e64",
    measurementId: "G-9948X8LYHT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);