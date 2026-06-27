import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "여기에_apiKey_붙여넣기",
  authDomain: "여기에_authDomain_붙여넣기",
  projectId: "여기에_projectId_붙여넣기",
  storageBucket: "여기에_storageBucket_붙여넣기",
  messagingSenderId: "여기에_messagingSenderId_붙여넣기",
  appId: "여기에_appId_붙여넣기",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);