import { useState, useEffect, useRef } from 'react';
import { APP_VERSION } from './lib/constants';
import { MapBoard } from './components/MapBoard';
import { Controls } from './components/Controls';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { ProfileEditor } from './components/ProfileEditor';
import { StatsPanel } from './components/StatsPanel';
import { ScrollingChyron } from './components/ScrollingChyron';
import { SafetyWarning } from './components/SafetyWarning';
import { OffersInbox } from './components/OffersInbox';
import { CaptureCelebration } from './components/CaptureCelebration';
import { GetCoinsModal } from './components/GetCoinsModal';
import { CoinShop } from './components/CoinShop';
import { ReferralPanel } from './components/ReferralPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { useGeolocation, isAndroidDevModeEnabled } from './lib/useGeolocation';
import { useGameState } from './lib/gameState';
import { useOffers, useMyOutgoingOffers } from './lib/useOffers';
import { useBlockLeaderboard } from './lib/useBlockLeaderboard';
import { useExclusionZones } from './lib/useExclusionZones';
import { seedZones } from './lib/seedZones';
import { auth, logout } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { TextZoom } from '@capacitor/text-zoom';
import { Capacitor } from '@capacitor/core';
import { LogOut, Settings, Bell, Trophy } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showOffersInbox, setShowOffersInbox] = useState(false);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [captureBonusAmount, setCaptureBonusAmount] = useState(0);
  const [capturedSquareCount, setCapturedSquareCount] = useState(0);
  const [showGetCoinsModal, setShowGetCoinsModal] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [showReferralPanel, setShowReferralPanel] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Global Auth & Native Init Listener
  useEffect(() => {
    // Lock text zoom on native devices
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('native');
      TextZoom.set({ value: 1.0 }).catch((err: any) =>
        console.warn('Failed to set TextZoom', err)
      );
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();

  }, []);

  // Expose seed function
  useEffect(() => {
    (window as any).seedZones = seedZones;
  }, []);

  // Game Hooks (Only really active if we render consumers, but safe to call)
  // Load Exclusion Zones (Global/Regional)
  const { zones } = useExclusionZones();

  const userLocation = useGeolocation();
  const {
    claims, player, territories,
    claimSquare, makeOffer, acceptOffer, rejectOffer,
    createPlayer, updatePlayerProfile,
    affirmPromotion, completePromotion, activeCeremony
  } = useGameState(
    userLocation.lat ?? undefined,
    userLocation.lng ?? undefined,
    userLocation.isMovingTooFast,
    zones
  );

  const pendingOffers = useOffers();
  const myOutgoingOffers = useMyOutgoingOffers();

  // Resolve buyer names for incoming offers
  useEffect(() => {
    const unknownIds = pendingOffers
      .map(o => o.buyerId)
      .filter(id => !buyerNames[id]);
    if (!unknownIds.length) return;

    unknownIds.forEach(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'players', id));
        if (snap.exists()) {
          setBuyerNames(prev => ({ ...prev, [id]: snap.data().explorerName ?? 'Unknown' }));
        }
      } catch { /* silent */ }
    });
  }, [pendingOffers]);

  // Calculate stats
  // Use persistent stats from player profile (guaranteed by self-healing)
  // Fallback to 0 if loading
  const tilesCount = player?.totalClaims ?? 0;
  const territoriesCount = player?.totalCaptured ?? 0;

  // Block leaderboard (for chyron integration)
  const blockBoard = useBlockLeaderboard(claims, player?.id);

  if (authLoading) return <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Login />;
  if (!player || !player.hasCompletedOnboarding) {
    return <Onboarding onComplete={(name, color, refCode) => createPlayer(name, color, refCode)} />;
  }

  return (
    <div className="relative h-screen h-[100dvh] w-screen overflow-hidden bg-slate-900">

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
        {/* Offers notification badge */}
        <button
          onClick={() => setShowOffersInbox(true)}
          className="relative bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
          title="Incoming Offers"
        >
          <Bell className="w-5 h-5" />
          {pendingOffers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {pendingOffers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
          title="Leaderboard"
        >
          <Trophy className="w-5 h-5" />
        </button>
      </div>

      {/* Offers Inbox Modal */}
      <OffersInbox
        isOpen={showOffersInbox}
        onClose={() => setShowOffersInbox(false)}
        offers={pendingOffers}
        onAccept={async (id) => { await acceptOffer(id); }}
        onReject={async (id) => { await rejectOffer(id); }}
        buyerNames={buyerNames}
      />

      {/* Leaderboard Panel */}
      <LeaderboardPanel
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        claims={claims}
        myId={player?.id}
        userLat={userLocation.lat ?? undefined}
        userLng={userLocation.lng ?? undefined}
      />

      {/* Profile Editor Modal */}
      {showProfileEditor && player && (
        <ProfileEditor
          currentName={player.explorerName}
          currentFlower={player.officialFlower}
          currentBird={player.officialBird}
          playerId={player.id}
          onSave={(name, flower, bird) => {
            const isDevMode = isAndroidDevModeEnabled();
            updatePlayerProfile(name, flower, bird, isDevMode);
            setShowProfileEditor(false);
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      <MapBoard
        lat={userLocation.lat}
        lng={userLocation.lng}
        claims={claims}
        territories={territories}
        exclusionZones={zones}
        onMapReady={(m) => { mapInstanceRef.current = m; }}
      />

      {/* Stats Panel */}
      <StatsPanel
        tilesCount={tilesCount}
        territoriesCount={territoriesCount}
        coins={player?.balance || 0}
        rank={player?.rank || 'Lowly Vassal'}
        explorerName={player?.explorerName}
        onGetCoins={() => setShowGetCoinsModal(true)}
      />

      {/* Scrolling Chyron */}
      <ScrollingChyron
        claims={claims}
        userLat={userLocation.lat}
        userLng={userLocation.lng}
        myId={player?.id}
        blockLeader={blockBoard.entries[0]?.explorerName}
        isBlockLeaderMe={blockBoard.entries[0]?.isMe}
      />

      <Controls
        lat={userLocation.lat || 0}
        lng={userLocation.lng || 0}
        locationLoading={userLocation.loading}
        onClaim={async (key) => {
          const result = await claimSquare(key);
          if (result.bonus > 0) {
            setCaptureBonusAmount(result.bonus);
            setCapturedSquareCount(result.capturedCount);
          }
          return result;
        }}
        onMakeOffer={makeOffer}
        userBalance={player.balance}
        onGetCoins={() => setShowGetCoinsModal(true)}

        onAffirm={affirmPromotion}
        onCompleteCeremony={completePromotion}
        activeCeremony={activeCeremony}

        myId={player.id}
        myColor={player.color}
        myOutgoingOffers={myOutgoingOffers}
        claims={claims}
      />

      {/* Speed Warning Overlay */}
      {userLocation.isMovingTooFast && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-center p-3 z-[2000] shadow-lg">
          <div className="font-semibold">⚠️ Moving Too Fast ({Math.round(userLocation.speed || 0)} km/h)</div>
          <div className="text-sm mt-1">Tile loading paused. Slow down to walking speed to play.</div>
        </div>
      )}

      {/* Initial Safety Warning Modal */}
      <SafetyWarning />

      {/* Capture Celebration Overlay */}
      {captureBonusAmount > 0 && (
        <CaptureCelebration
          bonus={captureBonusAmount}
          onDismiss={() => {
            setCaptureBonusAmount(0);
            setCapturedSquareCount(0);
          }}
          onShare={async () => {
            if (!mapInstanceRef.current || !player) {
              setCaptureBonusAmount(0);
              setCapturedSquareCount(0);
              return;
            }
            try {
              const { captureShareCard, shareCard } = await import('./lib/shareCardService');
              const blob = await captureShareCard(mapInstanceRef.current, {
                explorerName: player.explorerName,
                rank: player.rank,
                colour: player.color,
                playerId: player.id,
                capturedSquareCount,
              });
              await shareCard(blob, player.id, capturedSquareCount);
            } catch (e) {
              console.error('[ShareCard] Failed:', e);
            }
            setCaptureBonusAmount(0);
            setCapturedSquareCount(0);
          }}
        />
      )}

      {/* Get Coins Modal */}
      <GetCoinsModal
        isOpen={showGetCoinsModal}
        onClose={() => setShowGetCoinsModal(false)}
        onOpenReferral={() => setShowReferralPanel(true)}
        onOpenCoinShop={() => setShowCoinShop(true)}
      />

      {/* Coin Shop Modal */}
      <CoinShop
        isOpen={showCoinShop}
        onClose={() => setShowCoinShop(false)}
      />

      {/* Referral Panel Modal */}
      {player && (
        <ReferralPanel
          isOpen={showReferralPanel}
          onClose={() => setShowReferralPanel(false)}
          playerId={player.id}
        />
      )}

      {/* Error Toasts could go here */}
      {userLocation.error && (
        <div className="absolute top-16 left-0 right-0 mx-auto w-max max-w-[80%] bg-red-500 text-white text-center p-2 z-[2000] rounded shadow-lg pointer-events-none">
          {userLocation.error}
        </div>
      )}

      <div className="absolute bottom-1 right-1 text-slate-500 text-xs pointer-events-none z-[1000]">
        {APP_VERSION}
      </div>


    </div>
  );
}

export default App;
