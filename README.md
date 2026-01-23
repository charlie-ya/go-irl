# Roamin' Empire 🏛️

**Build your empire by walking!** Roamin' Empire is a location-based strategy game where you claim real-world territory by exploring your city on foot.

## 🎮 Gameplay

- **Walk to Conquer:** Claim 10m grid squares by walking through them
- **Build Your Empire:** Enclose areas to capture entire territories
- **Strategic Expansion:** Plan your routes to maximize territorial control
- **Real-Time Competition:** See other players' empires on the map

## 🚀 Features

- **Location-Based:** Uses GPS to track your real-world position
- **Optimized Performance:** Smart tile loading and speed detection
- **Mobile-First:** PWA with offline support
- **Real-Time Sync:** Firebase-powered multiplayer

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Maps:** Leaflet + React-Leaflet
- **Backend:** Firebase (Auth + Firestore)
- **Styling:** Tailwind CSS
- **Geospatial:** Geohashing for efficient queries

## 📦 Setup

### Prerequisites
- Node.js 18+
- Firebase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Firebase config to .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## 🏗️ Project Structure

```
src/
├── components/     # React components
├── lib/           # Utilities and hooks
│   ├── firebase.ts        # Firebase config
│   ├── gameState.ts       # Game state management
│   ├── geohashUtils.ts    # Geospatial utilities
│   ├── speedDetection.ts  # Movement speed tracking
│   └── ...
└── App.tsx        # Main app component
```

## 🎯 Key Features

### Speed Detection
Automatically pauses tile loading when moving >5 km/h (in vehicles) to save database costs and battery.

### Geohashing
Uses precision-6 geohashing for efficient spatial queries, loading only tiles within 200m radius.

### Territory Detection
Client-side algorithm detects enclosed areas using flood-fill, creating territories automatically.

## 📱 PWA Support

Roamin' Empire is a Progressive Web App:
- Install to home screen
- Offline map caching
- Full-screen experience
- Native app feel

## 🔐 Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📄 License

Private - All rights reserved

---

*Build your Roamin' Empire today!* 🏛️
