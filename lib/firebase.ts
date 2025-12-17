import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAOpGycvebehVCNZTB37a9fTET0SzOXpA0",
    authDomain: "pharmacy-payroll-app.firebaseapp.com",
    projectId: "pharmacy-payroll-app",
    storageBucket: "pharmacy-payroll-app.firebasestorage.app",
    messagingSenderId: "294513085802",
    appId: "1:294513085802:web:7e050c55544a528ddfe913",
    measurementId: "G-5MLPPS4S7J"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig, "pharmacy-payroll-app") : getApp("pharmacy-payroll-app");
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
