import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtBewWaepmCq8H7btz5T_w8TlsGgTRduE",
  authDomain: "money-management-b91ac.firebaseapp.com",
  projectId: "money-management-b91ac",
  storageBucket: "money-management-b91ac.firebasestorage.app",
  messagingSenderId: "812560682907",
  appId: "1:812560682907:web:d88dc8b3c78080b3131b3e",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
