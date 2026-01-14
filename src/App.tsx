import { useState, useEffect } from 'react';
import { MapBoard } from './components/MapBoard';
import { Controls } from './components/Controls';
import { Login } from './components/Login';
import { useGeolocation } from './lib/useGeolocation';
import { useGameState } from './lib/gameState';
import { auth, logout } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Game Hooks (Only really active if we render consumers, but safe to call)
  const location = useGeolocation();
  const { claims, player, claimSquare, buySquare } = useGameState();

  if (authLoading) return <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Login />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">

      {/* Logout Button */}
      <button
        onClick={() => logout()}
        className="absolute top-4 left-4 z-[2000] bg-slate-800 text-white p-2 rounded-full shadow-lg"
      >
        <LogOut className="w-5 h-5" />
      </button>

      <MapBoard
        locationIsReady={!location.loading && !location.error}
        lat={location.lat || 0}
        lng={location.lng || 0}
        claims={claims}
      />

      {/* Coin Balance Display */}
      {player && (
        <div className="absolute top-4 right-4 z-[1000] bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <span>{player.balance}</span>
        </div>
      )}

      {location.error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-[2000]">
          Error: {location.error}
        </div>
      )}

      {location.lat && location.lng && player && (
        <Controls
          lat={location.lat}
          lng={location.lng}
          locationLoading={location.loading}
          onClaim={claimSquare}
          onBuy={buySquare}
          myId={player.id}
          myColor={player.color}
          claims={claims}
        />
      )}
    </div>
  );
}

export default App;
