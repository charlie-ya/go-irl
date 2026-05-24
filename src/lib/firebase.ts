import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserLocalPersistence, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, signInWithCredential, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getRemoteConfig, getValue, fetchAndActivate } from "firebase/remote-config";
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
// For iOS native app build, enforce inMemoryPersistence on initialization to completely prevent
// Safari WebKit storage partition hangs (Prevent Cross-Site Tracking IndexedDB bugs).
// For Web & Android builds, continue using the persistent browserLocalPersistence for high-UX sessions.
export const auth = Capacitor.getPlatform() === 'ios'
    ? initializeAuth(app, { persistence: inMemoryPersistence })
    : initializeAuth(app, { persistence: browserLocalPersistence });
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Initialize Firebase Remote Config
export const remoteConfig = getRemoteConfig(app);
// Dev mode fetches immediately; production defaults to 12-hour cache window (43,200,000 ms)
remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 43200000;
remoteConfig.defaultConfig = {
    chyron_templates: "[]"
};

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
        
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out. Please check your internet connection and try again.')), 20000)
        );
        await Promise.race([signInWithCredential(auth, credential), timeout]);
    } catch (error: any) {
        console.error("Error signing in with Google Native", error);
        // Code 12501 = user canceled the Google sheet
        if (error?.code === 12501 || error?.message?.includes('canceled')) return;
        throw error;
    }
};

export const signInWithGoogle = async () => {
    try {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out.')), 15000)
        );
        await Promise.race([signInWithPopup(auth, googleProvider), timeout]);
    } catch (error: any) {
        console.error("Error signing in with Google", error);
        if (error?.code === 'auth/popup-closed-by-user') return;
        throw error;
    }
};

export const signInWithAppleNative = async () => {
    try {
        // Generate a secure random nonce (required by Apple for production Sign in with Apple).
        // Send SHA-256 hash to Apple, raw value to Firebase.
        const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');

        const result = await SignInWithApple.authorize({
            clientId: 'com.goirl.app',
            redirectURI: '',
            scopes: 'email name',
            nonce: hashedNonce,
        });
        
        const idToken = result.response.identityToken;
        if (!idToken) {
            throw new Error('No identity token returned from Apple.');
        }

        const credential = appleProvider.credential({
            idToken: idToken,
            rawNonce: rawNonce,
        });

        // Race signInWithCredential against a 20-second timeout.
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out. Please check your internet connection and try again.')), 20000)
        );
        await Promise.race([signInWithCredential(auth, credential), timeout]);
    } catch (error: any) {
        console.error("Error signing in with Apple Native", error);
        // Code 1001 = user cancelled the Apple sheet
        if (error?.message?.includes('canceled') || error?.code === '1001') return;
        throw error;
    }
};

export const signInWithApple = async () => {
    try {
        await signInWithPopup(auth, appleProvider);
    } catch (error: any) {
        console.error("Error signing in with Apple", error);
        if (error?.code === 'auth/popup-closed-by-user') return;
        throw error;
    }
};

export const signInWithEmail = async (email: string, password: string) => {
    try {
        // 30s timeout — BrowserStack iOS devices route through slow proxies
        // that add significant round-trip latency to Firebase endpoints.
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in timed out. Please check your internet connection and try again.')), 30000)
        );
        await Promise.race([signInWithEmailAndPassword(auth, email, password), timeout]);
    } catch (error: any) {
        console.error("Error signing in with email", error);
        throw error;
    }
};

export const logout = () => signOut(auth);

export const fetchChyronTemplates = async (): Promise<any[]> => {
    try {
        await fetchAndActivate(remoteConfig);
        const templatesStr = getValue(remoteConfig, "chyron_templates").asString();
        if (templatesStr && templatesStr !== "[]") {
            const parsed = JSON.parse(templatesStr);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (error) {
        console.warn("[RemoteConfig] Failed to fetch chyron templates:", error);
    }
    return [];
};
