import { signInWithGoogle, signInWithGoogleNative, signInWithEmail, signInWithApple, signInWithAppleNative } from '../lib/firebase';
import { Gamepad2, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

export function Login() {
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            if (Capacitor.isNativePlatform()) {
                await signInWithGoogleNative();
            } else {
                await signInWithGoogle();
            }
        } catch (err: any) {
            console.error(err);
            if (err) setError(err.message || 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            if (Capacitor.isNativePlatform()) {
                await signInWithAppleNative();
            } else {
                await signInWithApple();
            }
        } catch (err: any) {
            console.error(err);
            if (err) setError(err.message || 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmail(email, password);
        } catch (err: any) {
            const code = err?.code || '';
            const message = err?.message || '';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                setError('Invalid email or password.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many attempts. Try again later.');
            } else if (code === 'auth/network-request-failed') {
                setError('Network error. Please check your connection and try again.');
            } else if (message.includes('timed out')) {
                setError('Sign-in timed out. Please check your connection and try again.');
            } else {
                // Surface the real error for diagnosis — remove or soften before final release
                setError(`Sign in failed (${code || 'unknown'}): ${message || 'No details available.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 text-white p-4">
            <div className="mb-8 flex flex-col items-center gap-4 animate-fade-in-up">
                <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl shadow-indigo-500/30">
                    <Gamepad2 className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                    Roamin' Empire
                </h1>
                <p className="text-slate-400 text-center max-w-xs">
                    Build your empire by walking.
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
                {error && (
                    <div className="p-3 mb-2 bg-red-900/50 border border-red-500 rounded-lg">
                        <p className="text-red-200 text-sm text-center">{error}</p>
                    </div>
                )}
                {Capacitor.getPlatform() !== 'android' && (
                    <button
                        onClick={handleAppleLogin}
                        disabled={loading}
                        className="bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-xl -mt-1"></span>
                        {loading ? 'Signing in...' : 'Sign in with Apple'}
                    </button>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="bg-white text-slate-900 font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>
            </div>

            <button
                onClick={() => setShowEmailLogin(!showEmailLogin)}
                className="mt-4 text-slate-400 text-sm flex items-center gap-1 hover:text-slate-300 transition-colors"
            >
                <Mail className="w-4 h-4" />
                Sign in with email
                {showEmailLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showEmailLogin && (
                <form onSubmit={handleEmailLogin} className="mt-4 w-full max-w-xs flex flex-col gap-3 animate-fade-in-up">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="email"
                        inputMode="email"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            )}
        </div>
    );
}
