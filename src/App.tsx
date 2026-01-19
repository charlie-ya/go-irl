import { useState, useEffect, useMemo } from 'react';
import { MapBoard } from './components/MapBoard';
import { Controls } from './components/Controls';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { ProfileEditor } from './components/ProfileEditor';
import { StatsPanel } from './components/StatsPanel';
import { ScrollingChyron } from './components/ScrollingChyron';
import { useGeolocation } from './lib/useGeolocation';
import { useGameState } from './lib/gameState';
import { auth, logout } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogOut, Settings } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

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
  const { claims, player, territories, claimSquare, buySquare, createPlayer, updatePlayerProfile } = useGameState(
    location.lat ?? undefined,
    location.lng ?? undefined
  );

  // Calculate stats
  const tilesCount = useMemo(() =>
    Object.values(claims).filter(tile => tile.ownerId === player?.id).length,
    [claims, player]
  );

  const territoriesCount = useMemo(() => {
    return territories
      .filter(t => t.ownerId === player?.id && t.isActive)
      .reduce((total, territory) => total + territory.enclosedSquares.length, 0);
  }, [territories, player]);

  if (authLoading) return <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Login />;
  if (!player || !player.hasCompletedOnboarding) {
    return <Onboarding onComplete={createPlayer} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">

      {/* Top Left Controls */}
      <div className="absolute top-4 left-4 z-[2000] flex gap-2">
        <button
          onClick={() => logout()}
          className="bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowProfileEditor(true)}
          className="bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
          title="Edit Profile"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Editor Modal */}
      {showProfileEditor && player && (
        <ProfileEditor
          currentName={player.explorerName}
          currentColor={player.color}
          onSave={(name, color) => {
            updatePlayerProfile(name, color);
            setShowProfileEditor(false);
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      <MapBoard
        locationIsReady={!location.loading && !location.error}
        lat={location.lat || 0}
        lng={location.lng || 0}
        claims={claims}
        territories={territories}
      />

      {/* Stats Panel */}
      {player && (
        <StatsPanel
          coins={player.balance}
          tilesCount={tilesCount}
          territoriesCount={territoriesCount}
        />
      )}

      {/* Scrolling Chyron */}
      <ScrollingChyron />

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
