import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAz-6-OWxOK-wlk5WsVDFLhf7bGt57ebs",
  authDomain: "onyxchat-4dbe4.firebaseapp.com",
  databaseURL: "https://onyxchat-4dbe4-default-rtdb.firebaseio.com",
  projectId: "onyxchat-4dbe4",
  storageBucket: "onyxchat-4dbe4.firebasestorage.app",
  messagingSenderId: "247360337566",
  appId: "1:247360337566:web:c98e51aeef806223d32d8f",
  measurementId: "G-VLVS9Y1VNE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
