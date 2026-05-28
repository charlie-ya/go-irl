import { useState, useEffect, useRef, useMemo } from 'react';
import { MapBoard } from './components/MapBoard';
import { Controls } from './components/Controls';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { ProfileEditor } from './components/ProfileEditor';
import { ScrollingChyron } from './components/ScrollingChyron';
import { SafetyWarning } from './components/SafetyWarning';
import { OffersInbox } from './components/OffersInbox';
import { CaptureCelebration } from './components/CaptureCelebration';
import { AutoClaimTutorial } from './components/AutoClaimTutorial';
import { GetCoinsModal } from './components/GetCoinsModal';
import { CoinShop } from './components/CoinShop';
import { NotificationOptInPrompt } from './components/NotificationOptInPrompt';
import { ReferralPanel } from './components/ReferralPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ProfileStatsPanel } from './components/ProfileStatsPanel';
import { RulesModal } from './components/RulesModal';
import { AppStoreBadge, PlayStoreBadge } from './components/Badges';
import { useGeolocation, isAndroidDevModeEnabled } from './lib/useGeolocation';
import { useGameState } from './lib/gameState';
import { getGridKey, parseGridKey, getGridFloats } from './lib/gridSystem';
import { captureOfferScreenshot } from './lib/offerMapCapture';
import { usePushNotifications } from './lib/usePushNotifications';
import { useOffers, useMyOutgoingOffers } from './lib/useOffers';
import { useBlockLeaderboard } from './lib/useBlockLeaderboard';
import { useExclusionZones } from './lib/useExclusionZones';
import { auth, logout } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { TextZoom } from '@capacitor/text-zoom';
import { Capacitor } from '@capacitor/core';
import { Bell } from 'lucide-react';
import { initializeIAP } from './lib/iapService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showOffersInbox, setShowOffersInbox] = useState(false);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [captureBonusAmount, setCaptureBonusAmount] = useState(0);
  const [capturedSquareCount, setCapturedSquareCount] = useState(0);
  const [showGetCoinsModal, setShowGetCoinsModal] = useState(false);
  const [showAscendDialog, setShowAscendDialog] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [showReferralPanel, setShowReferralPanel] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectionOffset, setSelectionOffset] = useState({ latOffset: 0, lngOffset: 0 });
  const [hasSeenOffersAlert, setHasSeenOffersAlert] = useState(false);
  const [hasSeenPushPrompt, setHasSeenPushPrompt] = useState(() => localStorage.getItem('hasSeenPushPrompt') === 'true');
  // Web-only download nudge — shown once after onboarding, dismissed forever via localStorage
  const [showDownloadNudge, setShowDownloadNudge] = useState(() =>
    !Capacitor.isNativePlatform() && localStorage.getItem('download_nudge_dismissed') !== 'true'
  );
  const [dismissLocationError, setDismissLocationError] = useState(false);
  const [showAutoClaimTutorial, setShowAutoClaimTutorial] = useState(false);
  const [isAutoClaimEnabled, setIsAutoClaimEnabled] = useState(false);
  const { isSupported, requestPermissionAndRegister } = usePushNotifications();
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Global Auth & Native Init Listener
  useEffect(() => {
    // Lock text zoom on native devices
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('native');
      TextZoom.set({ value: 1.0 }).catch((err: any) =>
        console.warn('Failed to set TextZoom', err)
      );
      // Boot the native IAP store so products are registered before the Coin Shop opens
      initializeIAP();
    }

    let timeoutId: any;

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeoutId);
      setUser(u);
      setAuthLoading(false);
    });

    // Fallback timeout: If Firebase auth fails to respond within 5 seconds 
    // (e.g. strict firewalls blocking auth servers, or IndexedDB lockups on iOS), 
    // force the loading screen to drop so the user isn't stuck indefinitely.
    timeoutId = setTimeout(() => {
      console.warn('[Auth] Auth state check timed out. Forcing UI to load.');
      setAuthLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };

  }, []);


  // Game Hooks (Only really active if we render consumers, but safe to call)
  // Load Exclusion Zones (Global/Regional)
  // (Moved below userLocation)

  const [hasAcknowledgedSafety, setHasAcknowledgedSafety] = useState(() => {
    return !!localStorage.getItem('safety_warning_seen');
  });

  const userLocation = useGeolocation(hasAcknowledgedSafety);
  
  // Load Exclusion Zones (Global/Regional)
  const { zones } = useExclusionZones(userLocation.lat ?? undefined, userLocation.lng ?? undefined);
  const {
    claims, player,
    claimSquare, makeOffer, acceptOffer, rejectOffer,
    createPlayer, updatePlayerProfile,
    affirmPromotion, completePromotion, activeCeremony, startPromotionCeremony
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

  // Determine current and selected grid keys
  const currentGridKey = userLocation.lat !== null && userLocation.lng !== null
    ? getGridKey(userLocation.lat, userLocation.lng)
    : null;

  const selectedGridKey = useMemo(() => {
    if (!currentGridKey) return null;
    if (selectionOffset.latOffset === 0 && selectionOffset.lngOffset === 0) return currentGridKey;

    const { latInt, lngInt } = parseGridKey(currentGridKey);
    const newLatInt = latInt + selectionOffset.latOffset;
    const newLngInt = lngInt + selectionOffset.lngOffset;
    return `${newLatInt}_${newLngInt}`;
  }, [currentGridKey, selectionOffset]);

  // Reset offset if user moves to a new grid square (optional, but good for UX)
  useEffect(() => {
    setSelectionOffset({ latOffset: 0, lngOffset: 0 });
  }, [currentGridKey]);

  // The Auto-Claim Engine
  const isClaimingRef = useRef(false);

  useEffect(() => {
    if (!isAutoClaimEnabled || !selectedGridKey || !player || userLocation.isMovingTooFast) return;

    // Only claim unowned squares (moribund squares count as unowned for claiming mechanics)
    const tile = claims[selectedGridKey];
    if (tile && tile.status !== 'moribund') return;

    // Must have balance
    if (player.balance < 1) {
      setIsAutoClaimEnabled(false);
      return;
    }

    const executeAutoClaim = async () => {
      if (isClaimingRef.current) return;
      isClaimingRef.current = true;
      try {
        const result = await claimSquare(selectedGridKey);
        if (result.bonus > 0) {
          setCaptureBonusAmount(result.bonus);
          setCapturedSquareCount(result.capturedCount);
          setIsAutoClaimEnabled(false); // Turn off auto-claim on capture
        }
      } finally {
        isClaimingRef.current = false;
      }
    };

    executeAutoClaim();
  }, [selectedGridKey, isAutoClaimEnabled, claims, player, userLocation.isMovingTooFast, claimSquare]);

  // Check if the current grid square is owned by the player
  const isOwnedByMe = useMemo(() => {
    if (!currentGridKey || !player?.id || !claims) return false;
    const activeTile = claims[currentGridKey];
    return activeTile?.ownerId === player.id;
  }, [currentGridKey, player?.id, claims]);

  if (authLoading) return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
        Roamin' Empire
      </div>
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Signing in...</p>
    </div>
  );
  if (!user) return <Login />;
  if (!player || !player.hasCompletedOnboarding) {
    return <Onboarding onComplete={(name, color, refCode) => createPlayer(name, color, refCode)} />;
  }

  return (
    <div className="relative h-screen h-[100dvh] w-screen overflow-hidden bg-slate-900">
      {/* Notifications & Referrals */}
      {showAutoClaimTutorial && (
        <AutoClaimTutorial onClose={() => {
          setShowAutoClaimTutorial(false);
          localStorage.setItem('hasSeenAutoClaimTutorial', 'true');
        }} />
      )}
      {/* Location Error Overlay — shown when device/browser can't get a fix */}
      {(userLocation.persistentError || userLocation.permissionDenied) && !dismissLocationError && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-3xl">📍</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {userLocation.permissionDenied ? 'Location Access Denied' : 'Can\'t Find Your Location'}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {userLocation.permissionDenied
                  ? 'Roamin\' Empire needs your location to play. Your device blocked access — please fix this in Settings to continue.'
                  : 'Your device couldn\'t get a GPS fix after several attempts. Please ensure your location services are turned on and you have a clear view of the sky.'
                }
              </p>
            </div>

            {/* Download CTA - Only show on web */}
            {!Capacitor.isNativePlatform() && (
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
                <p className="text-white font-semibold text-sm">Get the free app for the best experience</p>
                <div className="flex gap-2">
                  <a
                    href="https://apps.apple.com/us/app/roamin-empire/id6763377026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 block"
                  >
                    <AppStoreBadge />
                  </a>
                  {Capacitor.getPlatform() !== 'ios' && (
                    <a
                      href="https://play.google.com/store/apps/details?id=com.goirl.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 block"
                    >
                      <PlayStoreBadge />
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {/* Dismiss Button for Reviewers / Users */}
            <button
              onClick={() => setDismissLocationError(true)}
              className="w-full py-3 bg-slate-800 text-slate-300 hover:text-white font-bold rounded-xl transition-colors border border-slate-700"
            >
              Browse Map Only
            </button>
          </div>
        </div>
      )}

      {/* Top Controls: Offers & Profile/Stats Panel */}
      <div className="absolute top-3 right-3 z-[2000] flex items-start gap-2 pointer-events-none">

        {/* Offers notification badge */}
        <button
          onClick={() => setShowOffersInbox(true)}
          className="relative bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors border-2 border-slate-700 pointer-events-auto active:scale-95"
          title="Incoming Offers"
        >
          <Bell className="w-5 h-5" />
          {pendingOffers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md border border-slate-800">
              {pendingOffers.length}
            </span>
          )}
        </button>

        <ProfileStatsPanel
          explorerName={player?.explorerName}
          rank={player?.rank}
          color={player?.color}
          claimedCount={tilesCount || 0}
          capturedCount={territoriesCount || 0}
          coins={player?.balance || 0}
          canAscend={player?.rank !== 'Centurion'}
          onGetCoins={() => setShowGetCoinsModal(true)}
          onEditProfile={() => setShowProfileEditor(true)}
          onLeaderboard={() => setShowLeaderboard(true)}
          onAscend={() => setShowAscendDialog(true)}
          onShowRules={() => setShowRules(true)}
          onLogout={() => logout()}
          lat={userLocation.lat ?? undefined}
          lng={userLocation.lng ?? undefined}
        />
      </div>

      {/* Pending Offers Reminder (once per session) */}
      {pendingOffers.length > 0 && !hasSeenOffersAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2500] flex items-center justify-center p-6"
          onClick={() => setHasSeenOffersAlert(true)}>
          <button
            onClick={(e) => { e.stopPropagation(); setHasSeenOffersAlert(true); setShowOffersInbox(true); }}
            className="bg-amber-500/90 hover:bg-amber-500 text-white text-base font-bold px-6 py-5 rounded-2xl shadow-2xl border border-amber-400/50 backdrop-blur-md transition-all flex items-center gap-3 max-w-md text-center leading-snug animate-in slide-in-from-bottom-4"
          >
            <Bell className="w-6 h-6 flex-shrink-0 animate-[wiggle_1s_ease-in-out_infinite]" />
            <span>
              You have {pendingOffers.length} unanswered offer{pendingOffers.length === 1 ? '' : 's'}. Accept or reject within 5 days, or you will forfeit the square for half price!
            </span>
          </button>
        </div>
      )}

      {/* Offers Inbox Modal */}
      <OffersInbox
        isOpen={showOffersInbox}
        onClose={() => setShowOffersInbox(false)}
        offers={pendingOffers}
        onAccept={async (id) => { await acceptOffer(id); }}
        onReject={async (id) => { await rejectOffer(id); }}
        buyerNames={buyerNames}
      />

      {/* Push Notification Opt-In Prompt */}
      <NotificationOptInPrompt
        isOpen={pendingOffers.length > 0 && !hasSeenPushPrompt && isSupported}
        onAccept={async () => {
          setHasSeenPushPrompt(true);
          localStorage.setItem('hasSeenPushPrompt', 'true');
          await requestPermissionAndRegister();
        }}
        onDismiss={() => {
          setHasSeenPushPrompt(true);
          localStorage.setItem('hasSeenPushPrompt', 'true');
        }}
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
          currentColor={player.color}
          playerId={player.id}
          onSave={(name, color) => {
            const isDevMode = isAndroidDevModeEnabled();
            updatePlayerProfile(name, color, isDevMode);
            setShowProfileEditor(false);
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      <MapBoard
        lat={userLocation.lat}
        lng={userLocation.lng}
        selectedGridKey={selectedGridKey}
        claims={claims}
        exclusionZones={zones}
        viewRadiusMeters={player?.rank === 'Minion' || player?.rank === 'Centurion' ? 300 : 200}
        onMapReady={(m) => { mapInstanceRef.current = m; }}
      />



      {/* Scrolling Chyron */}
      <ScrollingChyron
        claims={claims}
        userLat={userLocation.lat}
        userLng={userLocation.lng}
        myId={player?.id}
        blockLeader={blockBoard.entries[0]?.explorerName}
        isBlockLeaderMe={blockBoard.entries[0]?.isMe}
        tilesCount={tilesCount}
        territoriesCount={territoriesCount}
      />

      {/* Web download nudge — sticky banner above controls, dismissed forever on tap */}
      {showDownloadNudge && (
        <div className="absolute bottom-[10rem] left-0 right-0 px-3 z-[2100] pointer-events-auto">
          <div className="bg-gradient-to-r from-indigo-900/95 to-purple-900/95 border border-indigo-500/40 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-sm">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold">Get the full experience</p>
              <div className="flex gap-2 mt-1.5">
                <a href="https://apps.apple.com/us/app/roamin-empire/id6763377026" target="_blank" rel="noopener noreferrer"
                  className="block shrink-0">
                  <AppStoreBadge />
                </a>
                {Capacitor.getPlatform() !== 'ios' && (
                  <a href="https://play.google.com/store/apps/details?id=com.goirl.app" target="_blank" rel="noopener noreferrer"
                    className="block shrink-0">
                    <PlayStoreBadge />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setShowDownloadNudge(false);
                localStorage.setItem('download_nudge_dismissed', 'true');
              }}
              className="text-slate-400 hover:text-white p-1 flex-shrink-0 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Controls: Only render when we have a real GPS position (not null).
           When location is denied or unavailable, the map is browse-only. */}
      {userLocation.lat !== null && userLocation.lng !== null && (
      <Controls
        lat={userLocation.lat}
        lng={userLocation.lng}
        locationLoading={userLocation.loading}
        selectedGridKey={selectedGridKey}
        onOffsetChange={setSelectionOffset}
        onClaim={async (key) => {
          const result = await claimSquare(key);
          if (result.bonus > 0) {
            setCaptureBonusAmount(result.bonus);
            setCapturedSquareCount(result.capturedCount);
            setIsAutoClaimEnabled(false); // Turn off auto-claim on capture
          }
          return result;
        }}
        onMakeOffer={async (key, amount) => {
          let screenshot: string | undefined;
          try {
            if (mapInstanceRef.current) {
              const { lat: tileLat, lng: tileLng } = getGridFloats(key);
              screenshot = await captureOfferScreenshot(mapInstanceRef.current, tileLat, tileLng);
            }
          } catch (e) {
            console.warn('[OfferCapture] Screenshot failed, proceeding without:', e);
          }
          makeOffer(key, amount, screenshot);
        }}
        userBalance={player.balance}
        onGetCoins={() => setShowGetCoinsModal(true)}

        onAffirm={affirmPromotion}
        onCompleteCeremony={completePromotion}
        activeCeremony={activeCeremony}
        playerRank={player?.rank || 'Lowly Vassal'}
        myId={player?.id || ''}
        myColor={player?.color || '#3b82f6'}
        myOutgoingOffers={myOutgoingOffers}
        claims={claims}
        tilesCount={tilesCount}
        territoriesCount={territoriesCount}
        isAutoClaimEnabled={isAutoClaimEnabled}
        onToggleAutoClaim={() => setIsAutoClaimEnabled(prev => !prev)}
      />
      )}


      {/* Speed Warning Overlay */}
      {userLocation.isMovingTooFast && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-center p-3 z-[2000] shadow-lg">
          <div className="font-semibold">⚠️ Moving Too Fast ({Math.round(userLocation.speed || 0)} km/h)</div>
          <div className="text-sm mt-1">Tile loading paused. Slow down to walking speed to play.</div>
        </div>
      )}

      {/* Initial Safety Warning & Location Disclosures */}
      {!hasAcknowledgedSafety && (
        <SafetyWarning onAcknowledge={() => setHasAcknowledgedSafety(true)} />
      )}

      {/* Capture Celebration Overlay */}
      {captureBonusAmount > 0 && (
        <CaptureCelebration
          bonus={captureBonusAmount}
          onDismiss={() => {
            setCaptureBonusAmount(0);
            setCapturedSquareCount(0);
            if (!localStorage.getItem('hasSeenAutoClaimTutorial')) {
              setShowAutoClaimTutorial(true);
            }
          }}
          onShare={async () => {
            if (!mapInstanceRef.current || !player) {
              setCaptureBonusAmount(0);
              setCapturedSquareCount(0);
              if (!localStorage.getItem('hasSeenAutoClaimTutorial')) {
                setShowAutoClaimTutorial(true);
              }
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

      {/* Ascend Dialog Overlay (Global) */}
      {showAscendDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-6 pointer-events-auto">
          <div className="bg-slate-800/95 rounded-2xl p-6 max-w-sm w-full border border-amber-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="text-4xl mb-3">👑</div>
              <h2 className="text-xl font-bold text-white mb-2">Ascend to New Rank</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                To ascend to the rank of <strong className="text-amber-400">Minion</strong>, gather <strong className="text-amber-400">9 other players</strong> on this square.
                Each player must affirm your promotion by tapping the AFFIRM button.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Minions can see more surrounding territory, and can claim squares adjacent to their location.
              </p>

              {/* Condition to start ceremony */}
              {!isOwnedByMe ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm font-semibold">📍 Stand on your territory</p>
                  <p className="text-slate-300 text-xs mt-1">You must physically stand on one of your owned squares to begin the ceremony.</p>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-6">
                  <p className="text-emerald-400 text-sm font-semibold">📍 You're in position!</p>
                  <p className="text-slate-300 text-xs mt-1">You are standing on your own square and ready to ascend.</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowAscendDialog(false);
                    startPromotionCeremony();
                  }}
                  disabled={!isOwnedByMe}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-amber-500/30 transition-all active:scale-95 border border-yellow-300/40 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  Ascend ✨
                </button>
                <button
                  onClick={() => setShowAscendDialog(false)}
                  className="w-full text-slate-400 hover:text-slate-300 py-2 text-sm font-medium transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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


      {/* Ceremony Success Celebration */}
      {activeCeremony?.status === 'completed' && (
        activeCeremony.ownerId === player.id || activeCeremony.affirmations.includes(player.id)
      ) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[5000] p-6 animate-in fade-in duration-500">
            <div className="text-center max-w-sm max-h-[90vh] overflow-y-auto">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-3">
                {activeCeremony.ownerId === player.id ? 'You Ascended!' : `${activeCeremony.ownerName} Ascended!`}
              </h1>
              <p className="text-slate-300 text-lg mb-2">
                {activeCeremony.ownerId === player.id
                  ? 'Your loyalty has been recognized by your subjects.'
                  : 'You witnessed a historic promotion ceremony!'}
              </p>
              <p className="text-amber-400 font-semibold text-sm mb-6">
                {activeCeremony.affirmations.length + 1} explorers gathered
              </p>
              <div className="text-4xl mb-4">👑</div>
              <p className="text-xs text-slate-500">
                This celebration will dismiss automatically.
              </p>
            </div>
          </div>
        )}

      {/* Rules Modal */}
      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

    </div>
  );
}

export default App;
