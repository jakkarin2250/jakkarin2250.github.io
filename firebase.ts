
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, remove, onValue, off, update, runTransaction } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCbGrQvq0zgmaCeoMLhSRcu_ovsi5oWMyM",
    authDomain: "jtoptic.firebaseapp.com",
    databaseURL: "https://jtoptic-default-rtdb.firebaseio.com",
    projectId: "jtoptic",
    storageBucket: "jtoptic.firebasestorage.app",
    messagingSenderId: "7498071053",
    appId: "1:7498071053:web:5adc0e9dbb9b42a191e944"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export { 
  ref, set, get, push, remove, onValue, off, update, runTransaction, 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile,
  setPersistence, browserSessionPersistence, browserLocalPersistence 
};
