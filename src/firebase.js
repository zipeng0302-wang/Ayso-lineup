// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAu05JiB22ETq_8V3b8o3_sCPo66_MD8w",
  authDomain: "ayso-lineup.firebaseapp.com",
  projectId: "ayso-lineup",
  storageBucket: "ayso-lineup.firebasestorage.app",
  messagingSenderId: "76421963814",
  appId: "1:76421963814:web:706e27f433abe4669306e7",
  measurementId: "G-F48NWS9LJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);