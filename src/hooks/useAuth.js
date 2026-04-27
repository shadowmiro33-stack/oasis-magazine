import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('관리자');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "admin_users", currentUser.email.toLowerCase()));
          if (userDoc.exists()) setUserName(userDoc.data().name);
          else setUserName(currentUser.email.split('@')[0] + " 님");
        } catch (e) {
          setUserName(currentUser.email.split('@')[0] + " 님");
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  return { user, userName, loading, login, logout };
}
