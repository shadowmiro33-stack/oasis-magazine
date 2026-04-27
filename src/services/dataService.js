import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../api/firebase';

// --- Magazines ---
export async function getAllMagazines() {
  const q = await getDocs(collection(db, "magazines"));
  return q.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function saveMagazine(docId, data) {
  return setDoc(doc(db, "magazines", docId), data);
}

export async function deleteMagazine(docId) {
  return deleteDoc(doc(db, "magazines", docId));
}

// --- Subscribers ---
export async function getAllSubscribers() {
  const q = await getDocs(collection(db, "subscribers"));
  return q.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.subscribeDate || '').localeCompare(a.subscribeDate || ''));
}

export async function deleteSubscriber(email) {
  return deleteDoc(doc(db, "subscribers", email));
}

// --- Tracking Policies ---
export async function getPolicies() {
  const snap = await getDoc(doc(db, "settings", "policies"));
  return snap.exists() ? snap.data().list || [] : [];
}

export async function savePolicies(list) {
  return setDoc(doc(db, "settings", "policies"), { list });
}

// --- Campaigns (Shorts/Reels) ---
export async function getCampaigns() {
  const snap = await getDoc(doc(db, "settings", "campaigns"));
  return snap.exists() ? snap.data().list || [] : [];
}

export async function saveCampaigns(list) {
  return setDoc(doc(db, "settings", "campaigns"), { list });
}

// --- Security Banners ---
export async function getSecurityBanners() {
  const snap = await getDoc(doc(db, "settings", "security"));
  return snap.exists() ? snap.data().list || [] : [];
}

export async function saveSecurityBanners(list) {
  return setDoc(doc(db, "settings", "security"), { list });
}
