import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General -> "Your apps"
const firebaseConfig = {
    apiKey: "AIzaSyAdThGbR4oHuI64nmr3roQJGcFsTGcd-wI",
    authDomain: "go-irl-443f4.firebaseapp.com",
    projectId: "go-irl-443f4",
    storageBucket: "go-irl-443f4.firebasestorage.app",
    messagingSenderId: "675006608980",
    appId: "1:675006608980:web:f6816e2301843e31cd9fc1",
    measurementId: "G-2M21P33B2F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        console.error("Error signing in with Google", error);
        alert(`Failed to sign in:\n${error.message}\n\nCheck console for more details.`);
    }
};

export const logout = () => signOut(auth);
