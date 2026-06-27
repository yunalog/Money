import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { auth } from "./firebase.js";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getFirebaseAuthMessage(error) {
  const code = error?.code || "";

  if (code === "auth/email-already-in-use") return "이미 가입된 이메일이에요. 로그인해주세요.";
  if (code === "auth/invalid-credential") return "이메일 또는 비밀번호를 다시 확인해주세요.";
  if (code === "auth/wrong-password") return "비밀번호를 다시 확인해주세요.";
  if (code === "auth/user-not-found") return "가입되지 않은 이메일이에요.";
  if (code === "auth/weak-password") return "비밀번호는 8자 이상으로 입력해주세요.";
  if (code === "auth/invalid-email") return "올바른 이메일 주소를 입력해주세요.";
  if (code === "auth/network-request-failed") return "네트워크 연결을 확인해주세요.";

  return "인증 처리 중 문제가 생겼어요.";
}

export async function signUpWithEmail({ name, email, password }) {
  const cleanEmail = normalizeEmail(email);
  const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);

  await updateProfile(result.user, {
    displayName: name,
  });

  return result.user;
}

export async function loginWithEmail({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return result.user;
}

export async function logoutFirebase() {
  await signOut(auth);
}

export async function updateFirebaseProfileName(name) {
  if (!auth.currentUser) throw new Error("로그인된 사용자가 없어요.");

  await updateProfile(auth.currentUser, {
    displayName: name,
  });

  return auth.currentUser;
}

export async function sendResetPasswordEmail(email) {
  const cleanEmail = normalizeEmail(email);
  await sendPasswordResetEmail(auth, cleanEmail);
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentFirebaseUser() {
  return auth.currentUser;
}
