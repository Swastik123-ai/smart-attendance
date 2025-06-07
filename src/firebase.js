// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCDJ3PES6beqovsAXc5SC3Fm79SDObznZM",
  authDomain: "esp-32-sas.firebaseapp.com",
  databaseURL: "https://esp-32-sas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "esp-32-sas",
  storageBucket: "esp-32-sas.appspot.com", // ✅ fixed
  messagingSenderId: "16549519324",
  appId: "1:16549519324:web:0fc9a24e2959dc188bb919",
  measurementId: "G-387LHCGF4Z"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app); // ✅ optional export
