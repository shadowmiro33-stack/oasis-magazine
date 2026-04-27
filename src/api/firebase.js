/**
 * OASIS Magazine v2.0 - Firebase Configuration
 * Firebase v11 SDK 대응
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 TODO: Firebase 프로젝트 설정값으로 교체 필요 (Netlify 환경 변수 권장)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
