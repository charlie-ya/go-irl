import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';

// Firebase configuration loaded from environment variables
// See .env.example for required variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export const signInWithGoogleNative = async () => {
    try {
        const authOptions: any = {
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        };
        
        // Pass the web client ID explicitly on web, 
        // but let the native plugin read from the plist / capacitor config directly
        if (!Capacitor.isNativePlatform()) {
            authOptions.clientId = '675006608980-ia7sek9fmsnrv2um9q2jfs7hg8umh2c9.apps.googleusercontent.com';
        }

        await GoogleAuth.initialize(authOptions);

        const user = await GoogleAuth.signIn();
        const idToken = user.authentication.idToken;
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    } catch (error: any) {
        console.error("Error signing in with Google Native", error);
        alert(`Failed to sign in:\n${error.message}\n\nCheck console for more details.`);
    }
};

export const signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        console.error("Error signing in with Google", error);
        alert(`Failed to sign in:\n${error.message}\n\nCheck console for more details.`);
    }
};

export const signInWithAppleNative = async () => {
    try {
        const result = await SignInWithApple.authorize({
            clientId: 'com.goirl.app',
            redirectURI: '',
            scopes: 'email name',
        });
        
        const idToken = result.response.identityToken;
        if (!idToken) {
            throw new Error('No identity token returned from Apple.');
        }

        const credential = appleProvider.credential({
            idToken: idToken,
        });

        // Race signInWithCredential against an 8-second timeout.
        // On restricted networks (e.g. Apple review environment), Firebase auth can
        // hang indefinitely without this guard, causing the app to appear frozen.
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out. Please check your internet connection and try again.')), 8000)
        );
        await Promise.race([signInWithCredential(auth, credential), timeout]);
    } catch (error: any) {
        console.error("Error signing in with Apple Native", error);
        if (error?.message?.includes('canceled')) return;
        alert(`Failed to sign in with Apple:\n${error.message}`);
    }
};

export const signInWithApple = async () => {
    try {
        await signInWithPopup(auth, appleProvider);
    } catch (error: any) {
        console.error("Error signing in with Apple", error);
        if (error?.code === 'auth/popup-closed-by-user') return;
        alert(`Failed to sign in with Apple:\n${error.message}\n\nCheck console for more details.`);
    }
};

export const signInWithEmail = async (email: string, password: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        console.error("Error signing in with email", error);
        throw error;
    }
};

export const logout = () => signOut(auth);
