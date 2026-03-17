import { X, CheckCircle, XCircle, Handshake, MapPin } from 'lucide-react';
import type { Offer } from '../lib/gameState';
import { getGridFloats, getGridSquareBounds } from '../lib/gridSystem';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { NOLLI_MAP_STYLE } from '../lib/mapStyle';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface OffersInboxProps {
    isOpen: boolean;
    onClose: () => void;
    offers: Offer[];
    onAccept: (offerId: string) => void;
    onReject: (offerId: string) => void;
    /** Map of buyerId -> explorerName, pre-fetched by parent */
    buyerNames: Record<string, string>;
}

function formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Subcomponent for the mini-map to keep the main list clean
function OfferMiniMap({ tileKey }: { tileKey: string }) {
    const { lat, lng } = getGridFloats(tileKey);
    const bounds = getGridSquareBounds(tileKey);
    const coords = bounds.map(coord => [coord[1], coord[0]]);
    coords.push(coords[0]);

    const highlightGeoJSON = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            },
            properties: {}
        }]
    };

    return (
        <div className="w-full h-32 rounded-lg overflow-hidden border border-white/10 relative my-3 pointer-events-none">
            <Map
                initialViewState={{
                    latitude: lat,
                    longitude: lng,
                    zoom: 16.5,
                    bearing: 0,
                    pitch: 0
                }}
                interactive={false}
                mapStyle={NOLLI_MAP_STYLE}
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <Source id={`tile-highlight-${tileKey}`} type="geojson" data={highlightGeoJSON as any}>
                    <Layer
                        id={`tile-fill-${tileKey}`}
                        type="fill"
                        paint={{
                            'fill-color': '#fbbf24', // Amber-400 to match warning concepts
                            'fill-opacity': 0.4
                        }}
                    />
                    <Layer
                        id={`tile-outline-${tileKey}`}
                        type="line"
                        paint={{
                            'line-color': '#fbbf24',
                            'line-width': 2,
                            'line-opacity': 0.8
                        }}
                    />
                </Source>
                <Marker longitude={lng} latitude={lat}>
                    <MapPin className="w-6 h-6 text-red-500 drop-shadow-md -mt-6" />
                </Marker>
            </Map>
        </div>
    );
}

export function OffersInbox({ isOpen, onClose, offers, onAccept, onReject, buyerNames }: OffersInboxProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-white/10 w-full max-w-md max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-white">Incoming Offers</h2>
                        {offers.length > 0 && (
                            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {offers.length}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                    {offers.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No pending offers</p>
                        </div>
                    ) : (
                        offers.map(offer => (
                            <div key={offer.id} className="bg-slate-700/60 rounded-xl p-4 border border-white/5 shadow-md">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-white font-semibold text-sm">
                                            {buyerNames[offer.buyerId] ?? 'Unknown Explorer'}
                                        </p>
                                        <p className="text-slate-500 text-xs mt-0.5">{formatTime(offer.createdAt)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                                        <span className="text-2xl font-bold text-emerald-400">{offer.amount}</span>
                                        <span className="text-xl">🪙</span>
                                    </div>
                                </div>
                                
                                <OfferMiniMap tileKey={offer.tileKey} />

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => onReject(offer.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-600 hover:bg-red-500/30 hover:border-red-500/50 border border-transparent text-slate-300 hover:text-red-300 text-sm font-medium transition-all"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => onAccept(offer.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-bold transition-all shadow-lg"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Accept
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
