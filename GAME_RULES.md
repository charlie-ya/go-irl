# Roamin' Empire — Game Rules & Concepts

> *Build your empire by walking. Claim real-world territory and conquer the map, one square at a time.*

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [The Map](#the-map)
4. [Coins — The Currency](#coins--the-currency)
5. [Claiming Squares](#claiming-squares)
6. [Capturing Territory](#capturing-territory)
7. [Offers & Trading](#offers--trading)
8. [Ranks & Promotion](#ranks--promotion)
9. [Exclusion Zones](#exclusion-zones)
10. [Leaderboards](#leaderboards)
11. [Referrals](#referrals)
12. [Anti-Cheat Protections](#anti-cheat-protections)
13. [Account & Data Management](#account--data-management)

---

## Overview

**Roamin' Empire** is a location-based strategy game played on a real-world map. Players physically walk through their city to claim grid squares, surround areas to capture territory, trade tiles with other players, and rise through the ranks — all powered by their actual GPS location.

The game is inspired by the classic board game *Go* (围碁), where encirclement is the primary strategy, combined with real-world exploration. The map itself is rendered in a beautiful Nolli-style cartographic aesthetic — a historic figure-ground technique dating back to 18th-century Rome.

---

## Getting Started

### Onboarding

When a new player signs in (via Google authentication), they are guided through a 3-step onboarding process:

1. **Welcome** — An introduction to the core gameplay loop.
2. **Choose Your Explorer Name** — A public-facing name (3–20 characters, alphanumeric only). This is the only identity visible to other players; real names and emails are never exposed. Players may also enter a **referral code** from a friend at this stage.
3. **Choose Your Color** — Select a tile color from a curated palette. This is how your claimed territory appears on the map.

### Starting Resources

Every new player begins with:

| Resource | Starting Value |
|----------|---------------|
| **Coins** | 100 |
| **Rank** | Lowly Vassal |
| **Claims** | 0 |
| **Captured Territory** | 0 |

---

## The Map

The game world is your actual physical surroundings, rendered on an interactive Mapbox-powered map.

### Grid System

The map is divided into a uniform grid of squares. Each square is defined by **4 decimal places of GPS precision** (0.0001°), which translates to roughly **11 meters × 11 meters** at the equator. Every square has a unique key derived from its integer latitude and longitude coordinates.

### View Radius

Players can only see and interact with tiles within a defined radius around their current GPS position. The radius varies by rank:

| Rank | View/Load Radius |
|------|-----------------|
| Lowly Vassal | ~200m (default) |
| Minion | 300m |
| Centurion | 300m |

### Map Style

The map uses a custom **Nolli-style** aesthetic with:
- **Building hatching** — Dense horizontal line patterns for structures.
- **Park patterns** — Stylized tree-top symbols for green spaces.
- **Forest patterns** — Denser, darker tree fills for woodland.
- **Agriculture patterns** — Parallel furrow lines with grass tufts for farmland.

---

## Coins — The Currency

Coins are the sole currency in Roamin' Empire. They fuel every action:

### Earning Coins

| Method | Reward |
|--------|--------|
| **Starting balance** | 100 coins |
| **Capturing territory** | ΔX + ΔY bonus (see [Capturing Territory](#capturing-territory)) |
| **Selling a tile** (accepting an offer) | The offer amount (set by buyer) |
| **Referral: Friend signs up** | +10 coins |
| **Referral: Friend claims 10 tiles** | +25 coins |
| **Referral: Friend captures territory** | +50 coins |
| **In-App Purchase** (mobile only) | Coin packs (100 – 3,000 coins) |

### Spending Coins

| Action | Cost |
|--------|------|
| **Claim a square** | 1 coin |
| **Make an offer on a tile** | 2+ coins (bid amount) |

### Capture Bonus Formula

When a player captures territory, they receive a bonus calculated as:

```
Bonus = ΔX + ΔY
```

Where ΔX and ΔY are the bounding-box dimensions (in grid units) of the enclosed area. This equals exactly **50% of the minimum perimeter cost** (2w + 2h), meaning a player can never profit from capturing alone — they must still explore to sustain their empire.

---

## Claiming Squares

Claiming is the fundamental action of the game.

### How to Claim

1. **Walk** to the physical location of an unclaimed square.
2. Tap the **"CLAIM FOR 1 COIN"** button.
3. The square is painted in your chosen color and linked to your explorer name.

### Claiming Rules

- **Cost:** 1 coin per square.
- **Unclaimed squares only:** You cannot claim a square already owned by another active player.
- **Moribund squares:** Tiles belonging to inactive/deleted accounts fade to "moribund" status and *can* be reclaimed by anyone.
- **Captured squares:** Tiles inside another player's captured territory are permanently protected and cannot be claimed.
- **Exclusion zones:** Squares inside sacred spaces, sovereign zones, or nature reserves cannot be claimed.
- **Must be physically present:** Your GPS location must be on or near the square.

---

## Capturing Territory

Territory capture is the strategic heart of the game, directly inspired by the encirclement mechanic in *Go*.

### How It Works

1. **Build a perimeter** — Claim a continuous ring of squares that fully encloses an area.
2. **Automatic detection** — The game uses a **flood-fill algorithm** to detect when an area is completely surrounded by your tiles (checking orthogonal neighbors: up, down, left, right).
3. **Instant capture** — Once enclosed, the interior squares are automatically filled with your color and marked as **"captured"** territory.

### Capture Properties

| Property | Detail |
|----------|--------|
| **Permanence** | Captured tiles are permanent — other players cannot claim over them. |
| **Walls** | Captured tiles belonging to other players act as walls for your flood-fill, helping you enclose smaller areas. |
| **Exclusion zones as walls** | Sacred spaces, sovereign zones, and nature reserves also act as walls during flood-fill, meaning you can use them as natural boundaries. |
| **Maximum size** | A flood-fill is capped at 500 squares to prevent runaway calculations. |
| **Coin bonus** | You earn ΔX + ΔY coins upon capture (see above). |

### Territory Collapse

If you **sell a perimeter tile** (accept an offer on a tile that forms part of a territory's wall), the entire territory collapses:
- The territory record is deleted.
- All enclosed tiles are released.
- Your `totalCaptured` count is decremented.

This creates high-stakes decision-making around whether to accept lucrative offers on strategically important perimeter tiles.

---

## Offers & Trading

Players can negotiate the purchase of another player's tiles through a structured offer system.

### Making an Offer

1. Navigate to a square owned by another player.
2. Tap **"MAKE OFFER"**.
3. Enter a bid amount (minimum: **2 coins**, maximum: your current balance).
4. The offer is sent to the tile owner.

### Offer Rules

- Only **one pending offer** is allowed per tile at a time.
- Captured tiles (those inside someone's territory) **cannot** receive offers.
- The buyer's coins are **not** deducted until the offer is accepted.

### Accepting an Offer

When a tile owner accepts an offer:
1. The tile ownership transfers to the buyer.
2. The bid amount is deducted from the buyer's balance and credited to the seller.
3. The buyer's `totalClaims` increments; the seller's decrements.
4. All other pending offers on that tile are automatically rejected.
5. If the sold tile was part of a territory perimeter, the territory collapses (see above).

### Rejecting an Offer

The seller can reject any offer. No coins change hands.

### Inactive Players

If a player accumulates **3 or more unanswered offers** (neither accepted nor rejected), they are marked as **inactive**. Performing any game action (claiming, offering) automatically clears this inactive status.

---

## Ranks & Promotion

Roamin' Empire has a three-tier rank system that rewards social gameplay and community gathering.

### Rank Tiers

| Rank | Requirement | Benefits |
|------|------------|----------|
| **Lowly Vassal** | Default starting rank | Basic gameplay |
| **Minion** | 10+ active players gathered at your tile | Extended view radius (300m), virtual joystick for fine-grained tile selection |
| **Centurion** | 100+ active players gathered at your tile | Extended view radius (300m), virtual joystick |

### How Promotion Works

**Method 1: Instant Check (requestPromotion)**

A server-side Cloud Function checks how many players have been active at the same grid tile within the last 5 minutes. If the threshold is met, the player is promoted immediately.

**Method 2: Promotion Ceremony (completeCeremony)**

For Minion rank, a player can initiate a **Promotion Ceremony**:

1. **Start a ceremony** — The player must be standing on one of their own tiles.
2. **Gather affirmations** — Other players who are on or adjacent to the ceremony tile can tap **"AFFIRM"** to support the promotion.
3. **Collect 9 affirmations** — Once 9 unique players have affirmed, the ceremony owner can tap **"CLAIM PROMOTION"**.
4. **Server validation** — A Cloud Function verifies the affirmation count and promotes the player.

**Rules:**
- Each player can only affirm once per ceremony.
- Affirmers must be physically adjacent to the ceremony tile (within 1 grid step).
- Only one ceremony can be active on a given tile at a time.
- Rank can only go up — demotions never occur.

### Minion+ Abilities

Players who achieve Minion rank or higher unlock:
- **Virtual Joystick** — A directional control that allows fine adjustment of the selected grid tile without physically walking. Movement is clamped to ±1 grid step from the player's actual GPS position.

---

## Exclusion Zones

Certain real-world areas are protected from gameplay to respect sacred spaces, sovereign territories, and reserved event spaces.

### Zone Categories

| Category | Color | Description |
|----------|-------|-------------|
| **Sacred** | 🟡 Gold | Churches, mosques, temples, synagogues, and other places of worship. Auto-detected using OpenStreetMap data. |
| **Sovereign** | 🟠 OrangeRed | Government buildings, embassies, or other restricted official areas. |
| **Natural** | 🟢 ForestGreen | Protected nature reserves and ecological areas. |
| **Reserved** | 🟣 Purple | Temporary event spaces (concerts, festivals, etc.). |
| **Commercial** | ⚪ Grey | Commercial exclusions. |

### How Sacred Spaces Are Detected

Sacred spaces are automatically seeded using the **OpenStreetMap Overpass API**:

1. As users move into new geographic regions (tracked by geohash-5, ~4.9km × 4.9km areas), the app triggers a Cloud Function called `seedSacredZones`.
2. The function queries OpenStreetMap for all `amenity=place_of_worship` entries within that region.
3. Results are stored in the Firestore `zones` collection with their real-world geometry (polygon footprints from building outlines, or 20m circular buffers for point-only data).
4. A `scannedRegions` collection tracks which areas have already been processed, preventing redundant API calls.

### Zone Behavior

- **Claiming blocked** — Players cannot claim any grid square that falls within an active exclusion zone.
- **Flood-fill walls** — Sacred, sovereign, and natural zones act as impenetrable walls during territory capture calculations. This means players can strategically use these zones as natural boundaries for encirclement.
- **Visual display** — Zones appear on the map with a translucent colored overlay, a solid 2px border, and a 🙏 icon (for sacred zones).

---

## Leaderboards

### Neighborhood Leaderboard

A geohash-5 scoped leaderboard (~4.9km × 4.9km area) showing the top players in your local neighborhood. This leaderboard is computed by a Cloud Function and cached for 5 minutes to reduce database load.

The leaderboard ranks players by their `totalClaims` count and displays their explorer name, claim count, and rank.

---

## Referrals

Players can invite friends using a unique **6-character alphanumeric referral code** generated deterministically from their user ID.

### Sharing

Players can share their referral link via the native share sheet or clipboard. The link format is:
```
https://[app-url]/?ref=CODE
```

### Milestones & Rewards

The referral system awards coins to the **referrer** (not the new player) as their referred friend progresses:

| Milestone | Trigger | Reward to Referrer |
|-----------|---------|-------------------|
| **Install** | Friend signs up | +10 coins |
| **10 Tiles** | Friend claims 10 tiles | +25 coins |
| **First Capture** | Friend captures their first territory | +50 coins |

**Maximum per friend: 85 coins.**

Each milestone is tracked individually and can only be awarded once per referral.

---

## Anti-Cheat Protections

Roamin' Empire enforces several measures to ensure fair play:

### Speed Limiting

- **Short distance (<1km):** Maximum speed of **20 km/h** between consecutive claims. Exceeding this blocks the claim with a warning. This prevents spoofing via rapid GPS jumps.
- **Long distance (>1km):** A softer travel limit of **200 km/h** is logged but not enforced (to allow for legitimate travel between cities).

### Vehicle Detection

The app continuously monitors GPS position history over a 25-second sliding window. If **70% or more** of speed samples exceed **10 km/h** across at least 5 position readings, the player is flagged as "moving too fast" (likely in a vehicle). While this flag is active:
- Tile loading is paused.
- Claiming is implicitly disabled.

The system filters out GPS noise by requiring a minimum 3-meter movement and 2-second interval between samples.

### Transaction Safety

All tile claims use Firestore **transactions** to ensure atomicity. If two players attempt to claim the same tile simultaneously, only one will succeed — the other receives a rollback error. This prevents double-claims and race conditions.

---

## Account & Data Management

### Edit Profile

Players can change their explorer name and tile color at any time via the Profile Editor.

### Delete Game Information

To comply with app store data safety requirements, players can wipe all gameplay data without deleting their authentication account. This resets:

| Data | Action |
|------|--------|
| **Tiles** | All claimed tiles deleted |
| **Captures** | All captured territories deleted |
| **Offers** | All pending/active offers deleted |
| **Ceremonies** | All promotion ceremonies deleted |
| **Rank** | Reset to Lowly Vassal |
| **Balance** | Reset to 100 coins |
| **Referrals** | *Preserved* — referral history is not deleted |
| **Name & Color** | *Preserved* |

### Delete Account Permanently

Players can permanently delete their Firebase authentication account. This is irreversible and all associated territories will fade to moribund status.

---

## In-App Purchases (Mobile Only)

On native iOS and Android builds, players can purchase coin packs through the platform's native billing system:

| Pack | Coins | Bonus |
|------|-------|-------|
| **Starter Pack** | 100 | — |
| **Explorer Pack** | 500 | +50 bonus |
| **Adventurer Pack** | 1,200 | +200 bonus |
| **Expedition Pack** | 3,000 | +600 bonus |

In-app purchases are not available on the web version.

---

*Roamin' Empire — Walk your city. Claim your empire. 🏰*
