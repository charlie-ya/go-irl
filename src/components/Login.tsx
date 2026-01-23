import { signInWithGoogle } from '../lib/firebase';
import { Gamepad2 } from 'lucide-react';

export function Login() {
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

            <button
                onClick={signInWithGoogle}
                className="bg-white text-slate-900 font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                Sign in with Google
            </button>

            <div className="mt-8 text-xs text-slate-500 text-center">
                Create a Firebase Project and add config to <br />
                <code className="bg-slate-800 px-1 py-0.5 rounded">src/lib/firebase.ts</code>
            </div>
        </div>
    );
}
