import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const fallbackConfig = {
  apiKey: "AIzaSyBjx92fZFNCi8c9nSgG6nU_eJfwq3356Uk",
  authDomain: "magazine-13f81.firebaseapp.com",
  projectId: "magazine-13f81",
  storageBucket: "magazine-13f81.firebasestorage.app",
  messagingSenderId: "897855603773",
  appId: "1:897855603773:web:82e68dd3075df768e95654",
};

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.REACT_APP_FIREBASE_APP_ID || fallbackConfig.appId,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
