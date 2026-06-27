import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { db } from "./firebase.js";

export function getUserStateRef(uid) {
  return doc(db, "users", uid, "book", "state");
}

export function getUserBackupRef(uid) {
  return doc(db, "users", uid, "book", "backup");
}

export async function loadUserState(uid) {
  const snap = await getDoc(getUserStateRef(uid));

  if (!snap.exists()) {
    return null;
  }

  return snap.data();
}

export async function saveUserState(uid, state) {
  await setDoc(
    getUserStateRef(uid),
    {
      ...state,
      ownerUid: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createInitialUserState(uid, state) {
  await setDoc(getUserStateRef(uid), {
    ...state,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function backupUserState(uid, state) {
  await setDoc(getUserBackupRef(uid), {
    state,
    ownerUid: uid,
    savedAt: serverTimestamp(),
  });
}

export async function loadUserBackup(uid) {
  const snap = await getDoc(getUserBackupRef(uid));

  if (!snap.exists()) {
    return null;
  }

  return snap.data()?.state || null;
}

export async function deleteUserState(uid) {
  await deleteDoc(getUserStateRef(uid));
}
